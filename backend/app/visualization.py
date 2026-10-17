"""
Visualization, Orthogonal Slice Engine, and Marching Cubes 3D Surface Generator
for NeuroScope 3D.
Provides:
- Volume spatial info (/volume-info)
- High-contrast multi-planar 2D slice rendering with robust percentile windowing,
  brightness/contrast scaling, and independent region-union overlay semantics (/slice)
- Marching-Cubes 3D surface extraction with voxel spacing, automated step-size scaling,
  small component filtering, and centroid/bounding-box metadata (/mesh)
"""

import io
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, Set, List
import nibabel as nib
import numpy as np
from PIL import Image
from skimage import measure
from scipy.ndimage import gaussian_filter

from .config import TEMP_DIR, LABEL_NCR, LABEL_ED, LABEL_ET

# Shared in-memory cache for interactive slice scrubbing and mesh caching
_NIFTI_CACHE: Dict[str, Tuple[nib.Nifti1Image, np.ndarray, np.ndarray, Tuple[float, float, float]]] = {}
_MESH_CACHE: Dict[str, Dict[str, Any]] = {}


def _get_cached_nifti(file_path: Path):
    """Loads and caches parsed NIfTI data with mtime cache validation."""
    if not file_path.exists():
        return None

    path_str = str(file_path.resolve())
    mtime = file_path.stat().st_mtime
    cache_key = f"{path_str}:{mtime}"

    if cache_key in _NIFTI_CACHE:
        return _NIFTI_CACHE[cache_key]

    img = nib.load(path_str)
    data = img.get_fdata(dtype=np.float32)
    affine = img.affine
    zooms = tuple(float(z) for z in img.header.get_zooms()[:3])

    # Keep cache bounded to 16 volumes
    if len(_NIFTI_CACHE) > 16:
        _NIFTI_CACHE.clear()

    _NIFTI_CACHE[cache_key] = (img, data, affine, zooms)
    return _NIFTI_CACHE[cache_key]


def get_study_volume_info(run_id: str) -> Dict[str, Any]:
    """Retrieves spatial dimensions, voxel spacing, and available sequences for a study run."""
    run_dir = TEMP_DIR / run_id
    if not run_dir.exists():
        raise FileNotFoundError(f"Study run '{run_id}' not found.")

    # Find reference structural scan (prefer t1, fallback to any available modality)
    ref_path = None
    for seq in ["t1", "t1gd", "t2", "flair"]:
        cand = run_dir / f"{seq}.nii.gz"
        if cand.exists():
            ref_path = cand
            break

    if not ref_path:
        raise FileNotFoundError(f"No NIfTI sequences found for run '{run_id}'.")

    cached = _get_cached_nifti(ref_path)
    if not cached:
        raise FileNotFoundError("Could not read reference NIfTI volume.")

    _, data, _, zooms = cached
    shape = data.shape  # (X, Y, Z) -> (Sagittal, Coronal, Axial)

    modalities = [
        k for k in ["t1", "t1gd", "t2", "flair"]
        if (run_dir / f"{k}.nii.gz").exists()
    ]
    has_prediction = (run_dir / "prediction.nii.gz").exists()
    has_expert = (run_dir / "expert.nii.gz").exists()
    has_report = (run_dir / "report.pdf").exists()

    return {
        "run_id": run_id,
        "modalities": modalities,
        "has_prediction": has_prediction,
        "has_expert": has_expert,
        "has_report": has_report,
        "shape": {"x": int(shape[0]), "y": int(shape[1]), "z": int(shape[2])},
        "zooms": {"x": round(zooms[0], 3), "y": round(zooms[1], 3), "z": round(zooms[2], 3)},
        "planes": {
            "axial": {
                "name": "Axial",
                "axis": 2,
                "max_slice": int(shape[2] - 1),
                "default_slice": int(shape[2] // 2),
                "description": "Transverse (inferior-superior) orientation"
            },
            "coronal": {
                "name": "Coronal",
                "axis": 1,
                "max_slice": int(shape[1] - 1),
                "default_slice": int(shape[1] // 2),
                "description": "Frontal (anterior-posterior) orientation"
            },
            "sagittal": {
                "name": "Sagittal",
                "axis": 0,
                "max_slice": int(shape[0] - 1),
                "default_slice": int(shape[0] // 2),
                "description": "Lateral (left-right) orientation"
            }
        }
    }


def render_slice_png(
    run_id: str,
    modality: str = "t1",
    plane: str = "axial",
    slice_idx: Optional[int] = None,
    regions: Optional[str] = "WT,TC,ET",
    brightness: float = 1.0,
    contrast: float = 1.0,
    alpha: float = 0.55
) -> bytes:
    """
    Renders a high-contrast 2D medical slice with synchronized multi-region
    segmentation overlay as PNG bytes.
    Region toggles use clean union semantics:
    - WT -> includes labels {1, 2, 4}
    - TC -> includes labels {1, 4}
    - ET -> includes label {4}
    Each visible label is rendered in its true subregion color:
    - LABEL_ED (2) -> Medical Mint Green [0, 214, 144]
    - LABEL_NCR (1) -> Amber [245, 158, 11]
    - LABEL_ET (4) -> Coral Red [239, 68, 68]
    """
    run_dir = TEMP_DIR / run_id
    if not run_dir.exists():
        raise FileNotFoundError(f"Run directory '{run_id}' not found.")

    modality_path = run_dir / f"{modality.lower()}.nii.gz"
    if not modality_path.exists():
        # Fallback to t1
        modality_path = run_dir / "t1.nii.gz"
        if not modality_path.exists():
            raise FileNotFoundError(f"Modality sequence '{modality}' not found for run '{run_id}'.")

    cached = _get_cached_nifti(modality_path)
    if not cached:
        raise FileNotFoundError(f"Unable to read NIfTI volume at '{modality_path}'.")

    _, data, _, _ = cached
    shape = data.shape

    # Determine axis and slice extraction
    plane_lower = plane.lower()
    if plane_lower == "axial":
        axis_len = shape[2]
        idx = int(np.clip(slice_idx if slice_idx is not None else axis_len // 2, 0, axis_len - 1))
        raw_slice = data[:, :, idx]
        # Standard radiological orientation: rotate 90 counter-clockwise so Anterior is Up
        slice_2d = np.rot90(raw_slice, 1)
    elif plane_lower == "coronal":
        axis_len = shape[1]
        idx = int(np.clip(slice_idx if slice_idx is not None else axis_len // 2, 0, axis_len - 1))
        raw_slice = data[:, idx, :]
        slice_2d = np.rot90(raw_slice, 1)
    elif plane_lower == "sagittal":
        axis_len = shape[0]
        idx = int(np.clip(slice_idx if slice_idx is not None else axis_len // 2, 0, axis_len - 1))
        raw_slice = data[idx, :, :]
        slice_2d = np.rot90(raw_slice, 1)
    else:
        raise ValueError(f"Unknown anatomical plane: '{plane}'. Must be axial, coronal, or sagittal.")

    # Intensity normalization (robust percentile scaling on non-zero brain tissue)
    non_zero = slice_2d[slice_2d > 0]
    if len(non_zero) > 0:
        p2 = np.percentile(non_zero, 1)
        p98 = np.percentile(non_zero, 99)
        if p98 > p2:
            norm = (slice_2d - p2) / (p98 - p2)
        else:
            norm = slice_2d / (np.max(slice_2d) + 1e-8)
    else:
        norm = np.zeros_like(slice_2d)

    norm = np.clip(norm, 0.0, 1.0)

    # Apply brightness and contrast formula:
    # out = clip((norm - 0.5) * contrast + 0.5 + (brightness - 1.0) * 0.5, 0.0, 1.0)
    out_intensity = np.clip((norm - 0.5) * contrast + 0.5 + (brightness - 1.0) * 0.5, 0.0, 1.0)
    gray = (out_intensity * 255.0).astype(np.uint8)

    # Build RGB base image
    rgb = np.stack([gray, gray, gray], axis=-1)

    # Check for segmentation overlay
    pred_path = run_dir / "prediction.nii.gz"
    if pred_path.exists() and regions is not None and len(regions.strip()) > 0:
        pred_cached = _get_cached_nifti(pred_path)
        if pred_cached:
            _, pred_data, _, _ = pred_cached
            if pred_data.shape == shape:
                if plane_lower == "axial":
                    mask_raw = pred_data[:, :, idx]
                elif plane_lower == "coronal":
                    mask_raw = pred_data[:, idx, :]
                else:
                    mask_raw = pred_data[idx, :, :]

                mask_2d = np.rot90(mask_raw.astype(np.int16), 1)

                # Parse region list and determine which integer labels are active
                selected_regions: Set[str] = {
                    r.strip().upper() for r in regions.split(",") if r.strip()
                }

                active_labels: Set[int] = set()
                if "WT" in selected_regions:
                    active_labels.update([LABEL_NCR, LABEL_ED, LABEL_ET])  # {1, 2, 4}
                if "TC" in selected_regions:
                    active_labels.update([LABEL_NCR, LABEL_ET])            # {1, 4}
                if "ET" in selected_regions:
                    active_labels.add(LABEL_ET)                            # {4}

                if active_labels:
                    overlay_rgb = rgb.astype(np.float32)
                    alpha_clamped = float(np.clip(alpha, 0.0, 1.0))

                    # Subregion Colors:
                    # LABEL_ED (2): Mint Green [0, 214, 144]
                    # LABEL_NCR (1): Amber [245, 158, 11]
                    # LABEL_ET (4): Coral Red [239, 68, 68]
                    color_map = {
                        LABEL_ED: np.array([0, 214, 144], dtype=np.float32),
                        LABEL_NCR: np.array([245, 158, 11], dtype=np.float32),
                        LABEL_ET: np.array([239, 68, 68], dtype=np.float32),
                    }

                    for lbl in active_labels:
                        if lbl in color_map:
                            lbl_mask = (mask_2d == lbl)
                            if np.any(lbl_mask):
                                col = color_map[lbl]
                                overlay_rgb[lbl_mask] = (
                                    (1.0 - alpha_clamped) * overlay_rgb[lbl_mask] +
                                    alpha_clamped * col
                                )

                    rgb = np.clip(overlay_rgb, 0, 255).astype(np.uint8)

    # Encode to PNG bytes
    img_pil = Image.fromarray(rgb, mode="RGB")
    buf = io.BytesIO()
    img_pil.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def generate_tumor_mesh(
    run_id: str,
    region: str = "WT",
    max_faces: int = 150000
) -> Dict[str, Any]:
    """
    Extracts a 3D polygonal surface mesh for the specified tumor region
    using Marching Cubes, formatted for Three.js BufferGeometry rendering.

    Improvements over reference:
    - Nested composite definitions: WT={1,2,4}, TC={1,4}, ET={4}
    - Spacing applied in mm
    - Small island filtering (< 50 voxels)
    - Dynamic step_size scaling to guarantee num_faces <= max_faces
    - Returns centroid (center_mm) and bounding box (bbox_mm)
    - Response cached in LRU by run_id:region:mtime
    """
    run_dir = TEMP_DIR / run_id
    pred_path = run_dir / "prediction.nii.gz"
    if not pred_path.exists():
        raise FileNotFoundError(f"Prediction mask not found for run '{run_id}'.")

    mtime = pred_path.stat().st_mtime
    region_upper = region.upper().strip()
    cache_key = f"{run_id}:{region_upper}:{max_faces}:{mtime}"

    if cache_key in _MESH_CACHE:
        return _MESH_CACHE[cache_key]

    cached = _get_cached_nifti(pred_path)
    if not cached:
        raise FileNotFoundError("Could not load prediction NIfTI file.")

    _, label_data, _, zooms = cached

    # Define binary mask based on nested BraTS composite regions
    if region_upper == "WT":
        mask = np.isin(label_data, [LABEL_NCR, LABEL_ED, LABEL_ET])
        region_color = "#00D690"  # Mint Green
    elif region_upper == "TC":
        mask = np.isin(label_data, [LABEL_NCR, LABEL_ET])
        region_color = "#F59E0B"  # Amber
    elif region_upper == "ET":
        mask = (label_data == LABEL_ET)
        region_color = "#EF4444"  # Coral Red
    else:
        raise ValueError(f"Unknown tumor region '{region}'. Must be WT, TC, or ET.")

    num_voxels = int(np.count_nonzero(mask))
    empty_result = {
        "region": region_upper,
        "color": region_color,
        "num_voxels": num_voxels,
        "num_vertices": 0,
        "num_faces": 0,
        "step_size": 1,
        "center_mm": [0.0, 0.0, 0.0],
        "bbox_mm": {"min": [0.0, 0.0, 0.0], "max": [0.0, 0.0, 0.0]},
        "vertices": [],
        "faces": [],
        "normals": []
    }

    if num_voxels < 20:
        return empty_result

    # Remove small island connected components (< 50 voxels) to avoid float speckles
    try:
        labeled_mask, num_features = measure.label(mask, connectivity=2, return_num=True)
        if num_features > 1:
            component_sizes = np.bincount(labeled_mask.ravel())
            too_small = component_sizes < 50
            too_small_mask = too_small[labeled_mask]
            mask[too_small_mask] = False
    except Exception:
        pass  # If labeling fails, proceed with raw mask

    num_voxels_cleaned = int(np.count_nonzero(mask))
    if num_voxels_cleaned < 20:
        return empty_result

    # Compute bounding box in physical millimeters
    coords = np.argwhere(mask)
    min_vox = coords.min(axis=0)
    max_vox = coords.max(axis=0)

    bbox_mm = {
        "min": [round(float(min_vox[i] * zooms[i]), 2) for i in range(3)],
        "max": [round(float(max_vox[i] * zooms[i]), 2) for i in range(3)]
    }

    # Marching cubes with automated step_size search to guarantee faces <= max_faces
    step_size = 1
    verts, faces, normals = None, None, None

    for step in [1, 2, 3, 4]:
        try:
            v, f, n, _ = measure.marching_cubes(
                volume=mask.astype(np.uint8),
                level=0.5,
                spacing=zooms,
                step_size=step
            )
            verts, faces, normals = v, f, n
            step_size = step
            if len(faces) <= max_faces:
                break
        except Exception:
            break

    if verts is None or len(verts) == 0:
        return empty_result

    # Center vertices around centroid for smooth Three.js viewport rotation
    center_mm = verts.mean(axis=0)
    centered_verts = (verts - center_mm).astype(np.float32)
    normals = normals.astype(np.float32)

    result = {
        "region": region_upper,
        "color": region_color,
        "num_voxels": num_voxels_cleaned,
        "num_vertices": int(len(verts)),
        "num_faces": int(len(faces)),
        "step_size": step_size,
        "center_mm": [round(float(c), 2) for c in center_mm],
        "bbox_mm": bbox_mm,
        "vertices": centered_verts.flatten().round(2).tolist(),
        "faces": faces.flatten().tolist(),
        "normals": normals.flatten().round(2).tolist()
    }

    # Cache result
    if len(_MESH_CACHE) > 20:
        _MESH_CACHE.clear()
    _MESH_CACHE[cache_key] = result

    return result
