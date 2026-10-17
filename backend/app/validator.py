"""Input sanity and validation for NeuroScope 3D."""
import hashlib
import gzip
import os
from typing import Dict, Tuple

import nibabel as nib
import numpy as np

from .config import MAX_FILE_SIZE_BYTES, REQUIRED_MODALITIES


class ValidationError(Exception):
    def __init__(self, code: str, message: str, details: dict = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


def compute_sha256(file_path: str) -> str:
    digest = hashlib.sha256()
    with open(file_path, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            digest.update(block)
    return digest.hexdigest()


def check_file_size(file_path: str):
    file_size = os.path.getsize(file_path)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise ValidationError("FILE_TOO_LARGE", f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES / (1024**3):.2f} GB.")


def _check_gzip_integrity(file_path: str) -> None:
    if not file_path.lower().endswith(".gz"):
        return
    try:
        with gzip.open(file_path, "rb") as stream:
            stream.read(2)
    except (OSError, EOFError, gzip.BadGzipFile) as exc:
        raise ValidationError("CORRUPT_GZIP", f"The uploaded gzip container is corrupt: {exc}") from exc


def _check_brain_plausibility(data: np.ndarray, zooms: Tuple[float, ...]) -> None:
    nonzero = np.isfinite(data) & (np.abs(data) > 1e-6)
    voxel_volume = float(np.prod(zooms[:3]))
    nonzero_ml = float(np.count_nonzero(nonzero) * voxel_volume / 1000.0)
    if nonzero_ml < 300.0 or nonzero_ml > 2500.0:
        raise ValidationError("NOT_A_BRAIN", f"Non-zero physical extent is {nonzero_ml:.1f} mL, outside the plausible brain range of 300–2500 mL.", {"nonzero_volume_ml": round(nonzero_ml, 2)})
    values = data[nonzero]
    if values.size > 1000:
        q05, q95 = np.percentile(values, [5, 95])
        if float(q95 - q05) <= max(1e-6, abs(float(q05)) * 1e-4):
            raise ValidationError("NOT_A_BRAIN", "Volume intensity distribution is near-uniform noise/constant data.")


def validate_single_nifti(file_path: str, enforce_brain_plausibility: bool = True) -> Tuple[nib.Nifti1Image, np.ndarray, np.ndarray, Tuple[float, ...]]:
    check_file_size(file_path)
    _check_gzip_integrity(file_path)
    try:
        img = nib.load(file_path)
        data = img.get_fdata(dtype=np.float32)
    except ValidationError:
        raise
    except Exception as exc:
        raise ValidationError("CORRUPT_NIFTI", f"Could not parse NIfTI file: {exc}") from exc

    if data.ndim != 3:
        raise ValidationError("UNSUPPORTED_DIMENSIONS", f"Expected a 3D volume; received {data.ndim} dimensions.")
    if not np.all(np.isfinite(data)):
        raise ValidationError("NONFINITE_VALUES", "Volume contains NaN or infinite values.")
    if np.all(data == 0) or float(np.std(data)) == 0:
        raise ValidationError("CONSTANT_VOLUME", "Volume is constant or contains only zero voxels.")

    affine = np.asarray(img.affine)
    zooms = img.header.get_zooms()[:3]
    if not np.all(np.isfinite(affine)) or abs(float(np.linalg.det(affine[:3, :3]))) < 1e-8:
        raise ValidationError("INVALID_AFFINE", "NIfTI spatial affine is invalid or singular.")
    if len(zooms) != 3 or not np.all(np.isfinite(zooms)) or any(float(z) <= 0 for z in zooms):
        raise ValidationError("INVALID_SPACING", "Voxel spacing must contain three positive finite values.")
    if enforce_brain_plausibility:
        _check_brain_plausibility(data, zooms)
    return img, data, affine, zooms


def check_skull_stripped(data: np.ndarray) -> bool:
    border_voxels = np.concatenate([data[0, :, :].ravel(), data[-1, :, :].ravel(), data[:, 0, :].ravel(), data[:, -1, :].ravel(), data[:, :, 0].ravel(), data[:, :, -1].ravel()])
    if border_voxels.size == 0:
        return False
    return bool(np.count_nonzero(border_voxels) / float(border_voxels.size) < 0.05)


from .dataset_profiles import convert_msd_labels_to_brats, MSD_TO_BRATS_LABEL_MAP, BRATS_ALLOWED_LABELS


def validate_expert_mask(mask_path: str, reference_img: nib.Nifti1Image, dataset_profile: str = "brats") -> np.ndarray:
    """Validate an optional expert label map; masks are exempt from brain-volume plausibility checks."""
    _mask_img, mask_data, mask_affine, _ = validate_single_nifti(mask_path, enforce_brain_plausibility=False)
    if mask_data.shape != reference_img.shape:
        raise ValidationError("EXPERT_MASK_SHAPE_MISMATCH", f"Expert mask shape {mask_data.shape} does not match MRI shape {reference_img.shape}.")
    if not np.allclose(mask_affine, reference_img.affine, atol=1e-3):
        raise ValidationError("EXPERT_MASK_AFFINE_MISMATCH", "Expert mask spatial affine does not match the reference MRI.")
    labels = set(np.unique(mask_data.astype(int)))
    if dataset_profile == "msd_task01":
        allowed_msd = set(MSD_TO_BRATS_LABEL_MAP.keys())
        if not labels.issubset(allowed_msd):
            unsupported = sorted(list(labels - allowed_msd))
            raise ValidationError("EXPERT_MASK_INVALID_LABELS", f"MSD Task01 mask contains unsupported labels: {unsupported} (allowed: 0, 1, 2, 3).")
        return convert_msd_labels_to_brats(mask_data)
    if not labels.issubset(BRATS_ALLOWED_LABELS):
        unsupported = sorted(list(labels - BRATS_ALLOWED_LABELS))
        raise ValidationError("EXPERT_MASK_INVALID_LABELS", f"BraTS expert mask contains unsupported labels: {unsupported} (allowed: 0, 1, 2, 4).")
    return mask_data.astype(np.int16)


def validate_msd_4d_nifti(file_path: str) -> Tuple[nib.Nifti1Image, np.ndarray, np.ndarray, Tuple[float, ...]]:
    check_file_size(file_path)
    _check_gzip_integrity(file_path)
    try:
        img = nib.load(file_path)
        data = img.get_fdata(dtype=np.float32)
    except ValidationError:
        raise
    except Exception as exc:
        raise ValidationError("CORRUPT_NIFTI", f"Could not parse MSD 4D NIfTI file: {exc}") from exc
    if data.ndim != 4 or data.shape[3] != 4:
        raise ValidationError("UNSUPPORTED_DIMENSIONS", f"Expected a 4D volume with 4 modalities (shape [X, Y, Z, 4]); received shape {data.shape}.")
    if not np.all(np.isfinite(data)):
        raise ValidationError("NONFINITE_VALUES", "Volume contains NaN or infinite values.")
    if np.all(data == 0) or float(np.std(data)) == 0:
        raise ValidationError("CONSTANT_VOLUME", "Volume is constant or contains only zero voxels.")
    affine = np.asarray(img.affine)
    zooms = img.header.get_zooms()[:3]
    if not np.all(np.isfinite(affine)) or abs(float(np.linalg.det(affine[:3, :3]))) < 1e-8:
        raise ValidationError("INVALID_AFFINE", "NIfTI spatial affine is invalid or singular.")
    if len(zooms) != 3 or not np.all(np.isfinite(zooms)) or any(float(z) <= 0 for z in zooms):
        raise ValidationError("INVALID_SPACING", "Voxel spacing must contain three positive finite values.")
    return img, data, affine, zooms


def validate_study_set(file_paths: Dict[str, str]) -> Dict[str, object]:
    for modality in REQUIRED_MODALITIES:
        if not file_paths.get(modality):
            raise ValidationError("MISSING_SEQUENCE", f"Missing required modality sequence: '{modality.upper()}'.")
    images, affines, shapes, hashes = {}, {}, {}, []
    for modality in REQUIRED_MODALITIES:
        path = file_paths[modality]
        img, _data, affine, _zooms = validate_single_nifti(path)
        images[modality] = img
        affines[modality] = affine
        shapes[modality] = img.shape
        hashes.append(compute_sha256(path))
    ref_shape = shapes["t1"]
    ref_affine = affines["t1"]
    for modality in REQUIRED_MODALITIES[1:]:
        if shapes[modality] != ref_shape:
            raise ValidationError("SHAPE_MISMATCH", f"{modality.upper()} shape {shapes[modality]} does not match T1 shape {ref_shape}.")
        if not np.allclose(affines[modality], ref_affine, atol=1e-3):
            raise ValidationError("AFFINE_MISMATCH", f"{modality.upper()} spatial affine does not match T1.")
    t1_data = images["t1"].get_fdata(dtype=np.float32)
    combined_hash = hashlib.sha256("".join(hashes).encode("utf-8")).hexdigest()
    return {"valid": True, "ref_shape": ref_shape, "ref_affine": ref_affine, "zooms": images["t1"].header.get_zooms()[:3], "is_skull_stripped": check_skull_stripped(t1_data), "combined_hash": combined_hash}
