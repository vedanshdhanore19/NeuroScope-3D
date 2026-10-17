"""Viewer rendering and world-space surface extraction for NeuroScope 3D."""
import io
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, Set

import nibabel as nib
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
from skimage import measure
from skimage.segmentation import find_boundaries
from skimage.transform import resize

from .config import TEMP_DIR, LABEL_NCR, LABEL_ED, LABEL_ET

PALETTE = {"ED": "#2DD4BF", "NCR": "#FBBF24", "ET": "#F43F5E"}
PALETTE_RGB = {
    LABEL_ED: np.array([45, 212, 191], dtype=np.float32),
    LABEL_NCR: np.array([251, 191, 36], dtype=np.float32),
    LABEL_ET: np.array([244, 63, 94], dtype=np.float32),
}
REGION_LABELS = {"WT": {LABEL_NCR, LABEL_ED, LABEL_ET}, "TC": {LABEL_NCR, LABEL_ET}, "ET": {LABEL_ET}}
_NIFTI_CACHE: Dict[str, Tuple[nib.Nifti1Image, np.ndarray, np.ndarray, Tuple[float, float, float]]] = {}
_MESH_CACHE: Dict[str, Dict[str, Any]] = {}


def _get_cached_nifti(file_path: Path):
    if not file_path.exists():
        return None
    stat = file_path.stat()
    cache_key = f"{file_path.resolve()}:{stat.st_mtime_ns}"
    if cache_key in _NIFTI_CACHE:
        return _NIFTI_CACHE[cache_key]
    img = nib.load(str(file_path))
    data = img.get_fdata(dtype=np.float32)
    affine = np.asarray(img.affine, dtype=np.float64)
    zooms = tuple(float(z) for z in img.header.get_zooms()[:3])
    if len(_NIFTI_CACHE) >= 16:
        _NIFTI_CACHE.pop(next(iter(_NIFTI_CACHE)))
    _NIFTI_CACHE[cache_key] = (img, data, affine, zooms)
    return _NIFTI_CACHE[cache_key]


def _canonical_cached(file_path: Path):
    cached = _get_cached_nifti(file_path)
    if not cached:
        return None
    img, _data, _affine, _zooms = cached
    canonical = nib.as_closest_canonical(img)
    return canonical, canonical.get_fdata(dtype=np.float32), np.asarray(canonical.affine), tuple(float(z) for z in canonical.header.get_zooms()[:3])


def _plane_slice(data: np.ndarray, plane: str, index: Optional[int]):
    axis = {"sagittal": 0, "coronal": 1, "axial": 2}.get(plane.lower())
    if axis is None:
        raise ValueError("Plane must be axial, coronal, or sagittal.")
    idx = int(np.clip(index if index is not None else data.shape[axis] // 2, 0, data.shape[axis] - 1))
    raw = data[idx, :, :] if axis == 0 else data[:, idx, :] if axis == 1 else data[:, :, idx]
    return np.rot90(raw, 1), idx


def _window(slice_2d: np.ndarray, brightness: float, contrast: float) -> np.ndarray:
    values = slice_2d[np.isfinite(slice_2d) & (slice_2d > 0)]
    if values.size:
        lo, hi = np.percentile(values, [0.5, 99.5])
        norm = (slice_2d - lo) / max(hi - lo, 1e-8)
    else:
        norm = np.zeros_like(slice_2d)
    norm = np.clip(norm, 0, 1)
    # Mild gamma lift preserves anatomy while recovering low-contrast tissue.
    norm = np.power(norm, 0.88)
    return np.clip((norm - 0.5) * contrast + 0.5 + (brightness - 1.0) * 0.5, 0, 1)


def render_slice_png(
    run_id: str,
    modality: str = "t1",
    plane: str = "axial",
    slice_idx: Optional[int] = None,
    regions: Optional[str] = "WT,TC,ET",
    brightness: float = 1.0,
    contrast: float = 1.0,
    alpha: float = 0.35,
    scale: int = 3,
    clahe: bool = False,
) -> bytes:
    run_dir = TEMP_DIR / run_id
    modality_path = run_dir / f"{modality.lower()}.nii.gz"
    if not modality_path.exists():
        raise FileNotFoundError(f"Modality sequence '{modality}' not found for run '{run_id}'.")
    canonical = _canonical_cached(modality_path)
    if canonical is None:
        raise FileNotFoundError(f"Unable to read modality '{modality}'.")
    _img, data, _affine, _zooms = canonical
    slice_2d, idx = _plane_slice(data, plane, slice_idx)
    if modality.lower() in ("prediction", "expert"):
        rgb = np.zeros((*slice_2d.shape, 3), dtype=np.uint8)
        for lbl, col in PALETTE_RGB.items():
            rgb[slice_2d.astype(np.int16) == lbl] = col.astype(np.uint8)
    else:
        norm = _window(slice_2d, brightness, contrast)
        if clahe:
            from skimage.exposure import equalize_adapthist
            norm = equalize_adapthist(norm, clip_limit=0.02, nbins=256)
        gray = (norm * 255).astype(np.uint8)
        rgb = np.repeat(gray[..., None], 3, axis=-1)
        pred_path = run_dir / "prediction.nii.gz"
        if pred_path.exists() and regions and regions.strip():
            pred = _canonical_cached(pred_path)
            if pred is not None:
                _pimg, pdata, _paff, _pz = pred
                mask_2d, _ = _plane_slice(pdata, plane, idx)
                selected = {r.strip().upper() for r in regions.split(",") if r.strip()}
                active: Set[int] = set()
                for region in selected:
                    active.update(REGION_LABELS.get(region, set()))
                overlay = rgb.astype(np.float32)
                fill_alpha = float(np.clip(alpha, 0.0, 1.0))
                for lbl in active:
                    mask = mask_2d.astype(np.int16) == lbl
                    if np.any(mask):
                        col = PALETTE_RGB[lbl]
                        overlay[mask] = overlay[mask] * (1 - fill_alpha) + col * fill_alpha
                        overlay[find_boundaries(mask, mode="outer")] = col
                rgb = np.clip(overlay, 0, 255).astype(np.uint8)

    scale = int(np.clip(scale, 1, 3))
    if scale > 1:
        target = (rgb.shape[0] * scale, rgb.shape[1] * scale)
        rgb = resize(rgb, target, order=3, preserve_range=True, anti_aliasing=True).astype(np.uint8)
    buf = io.BytesIO()
    Image.fromarray(rgb, mode="RGB").save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def _region_mask(label_data: np.ndarray, region: str, t1_data: Optional[np.ndarray] = None) -> Tuple[np.ndarray, str]:
    region = region.upper().strip()
    if region == "BRAIN":
        if t1_data is None:
            raise ValueError("T1 is required for the BRAIN surface.")
        nonzero = np.abs(t1_data[t1_data != 0])
        threshold = max(1e-6, float(np.percentile(nonzero, 5)) if nonzero.size else 1e-6)
        return np.abs(t1_data) > threshold, "#B8C7D9"
    if region not in REGION_LABELS:
        raise ValueError("Unknown region. Use BRAIN, WT, TC, or ET.")
    return np.isin(label_data, list(REGION_LABELS[region])), {"WT": "#2DD4BF", "TC": "#FBBF24", "ET": "#F43F5E"}[region]


def generate_tumor_mesh(run_id: str, region: str = "WT", max_faces: int = 90000) -> Dict[str, Any]:
    """Generate a cached world-space surface with a speed/quality-balanced resolution."""
    run_dir = TEMP_DIR / run_id
    pred_path = run_dir / "prediction.nii.gz"
    region = region.upper().strip()
    if not pred_path.exists() and region != "BRAIN":
        raise FileNotFoundError(f"Prediction mask not found for run '{run_id}'.")
    source_path = pred_path if pred_path.exists() else run_dir / "t1.nii.gz"
    pred_cached = _canonical_cached(source_path)
    if pred_cached is None:
        raise FileNotFoundError("Could not load mesh source volume.")
    _img, source_data, affine, zooms = pred_cached
    cache_key = f"{run_id}:{region}:{max_faces}:{source_path.stat().st_mtime_ns}:v2"
    if cache_key in _MESH_CACHE:
        return _MESH_CACHE[cache_key]

    t1_data = None
    if region == "BRAIN":
        t1_cached = _canonical_cached(run_dir / "t1.nii.gz")
        t1_data = t1_cached[1] if t1_cached else None
    mask, color = _region_mask(source_data, region, t1_data)
    count = int(np.count_nonzero(mask))
    empty = {"region": region, "color": color, "num_voxels": count, "num_vertices": 0, "num_faces": 0, "step_size": 1, "center_mm": [0, 0, 0], "bbox_mm": {"min": [0, 0, 0], "max": [0, 0, 0]}, "vertices": [], "faces": []}
    if count < 20:
        return empty

    coords = np.argwhere(mask)
    margin = 2 if region != "BRAIN" else 1
    lo = np.maximum(coords.min(axis=0) - margin, 0)
    hi = np.minimum(coords.max(axis=0) + margin + 1, np.array(mask.shape))
    crop = mask[tuple(slice(int(lo[i]), int(hi[i])) for i in range(3))]

    # Brain surface is intentionally coarser because it is large; tumor surfaces
    # retain higher detail. This avoids the long Marching Cubes stall while keeping
    # clinically useful lesion contours crisp.
    if region == "BRAIN":
        step = 2 if count < 1800000 else 3
        sigma = 0.7
    else:
        step = 1 if count < 150000 else 2
        sigma = 0.8
    smooth = gaussian_filter(crop.astype(np.float32), sigma=sigma)
    try:
        verts, faces, _normals, _values = measure.marching_cubes(smooth, level=0.5, spacing=zooms, step_size=step)
    except (ValueError, RuntimeError):
        return empty

    verts += lo * np.asarray(zooms)
    world = nib.affines.apply_affine(affine, verts)
    center = world.mean(axis=0)
    centered = (world - center).astype(np.float32)
    bbox = {"min": world.min(axis=0).round(2).tolist(), "max": world.max(axis=0).round(2).tolist()}
    if len(faces) > max_faces:
        stride = int(np.ceil(len(faces) / max_faces))
        faces = faces[::stride]
    result = {
        "region": region,
        "color": color,
        "num_voxels": count,
        "num_vertices": int(len(centered)),
        "num_faces": int(len(faces)),
        "step_size": step,
        "center_mm": center.round(2).tolist(),
        "bbox_mm": bbox,
        "vertices": centered.flatten().tolist(),
        "faces": faces.flatten().astype(np.uint32).tolist(),
    }
    if len(_MESH_CACHE) >= 24:
        _MESH_CACHE.pop(next(iter(_MESH_CACHE)))
    _MESH_CACHE[cache_key] = result
    return result
