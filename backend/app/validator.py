"""Input validation and dataset-specific label normalization."""
import hashlib
import os
from typing import Dict, Tuple

import nibabel as nib
import numpy as np

from .config import (
    BRATS2021_EXPECTED_SHAPE,
    DATASET_PROFILE,
    EXPECTED_SPACING_MM,
    LABEL_BACKGROUND,
    LABEL_ED,
    LABEL_ET,
    LABEL_NCR,
    MAX_FILE_SIZE_BYTES,
    REQUIRED_MODALITIES,
    SUPPORTED_DATASET_PROFILES,
)


class ValidationError(Exception):
    """Raised when an input scan fails validation."""

    def __init__(self, code: str, message: str, details: dict = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


def compute_sha256(file_path: str) -> str:
    """Compute SHA-256 incrementally for provenance."""
    digest = hashlib.sha256()
    with open(file_path, "rb") as stream:
        for block in iter(lambda: stream.read(65536), b""):
            digest.update(block)
    return digest.hexdigest()


def check_file_size(file_path: str):
    """Reject files exceeding the configured maximum size."""
    file_size = os.path.getsize(file_path)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise ValidationError(
            "FILE_TOO_LARGE",
            f"File exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES / (1024**3):.2f} GB.",
        )


def validate_single_nifti(
    file_path: str, *, allow_constant: bool = False
) -> Tuple[nib.Nifti1Image, np.ndarray, np.ndarray, Tuple[float, ...]]:
    """Validate one 3D NIfTI volume. Constant masks are allowed; constant MRIs are not."""
    check_file_size(file_path)
    try:
        img = nib.load(file_path)
        data = img.get_fdata(dtype=np.float32)
    except Exception as exc:
        raise ValidationError("CORRUPT_NIFTI", f"Could not parse NIfTI file: {exc}") from exc

    if data.ndim != 3:
        raise ValidationError(
            "UNSUPPORTED_DIMENSIONS",
            f"Expected a 3D volume; received {data.ndim} dimensions.",
        )
    if not np.all(np.isfinite(data)):
        raise ValidationError("NONFINITE_VALUES", "Volume contains NaN or infinite values.")
    if not allow_constant and (np.all(data == 0) or float(np.std(data)) == 0):
        raise ValidationError("CONSTANT_VOLUME", "MRI volume is constant or contains only zero voxels.")

    affine = np.asarray(img.affine)
    zooms = tuple(float(value) for value in img.header.get_zooms()[:3])
    if not np.all(np.isfinite(affine)) or abs(float(np.linalg.det(affine[:3, :3]))) < 1e-8:
        raise ValidationError("INVALID_AFFINE", "NIfTI spatial affine is invalid or singular.")
    if len(zooms) != 3 or not np.all(np.isfinite(zooms)) or any(value <= 0 for value in zooms):
        raise ValidationError("INVALID_SPACING", "Voxel spacing must contain three positive finite values.")

    return img, data, affine, zooms


def check_skull_stripped(data: np.ndarray) -> bool:
    """Heuristic only; this is not a clinical or definitive skull-stripping check."""
    border_voxels = np.concatenate([
        data[0, :, :].ravel(), data[-1, :, :].ravel(),
        data[:, 0, :].ravel(), data[:, -1, :].ravel(),
        data[:, :, 0].ravel(), data[:, :, -1].ravel(),
    ])
    if border_voxels.size == 0:
        return False
    return np.count_nonzero(border_voxels) / float(border_voxels.size) < 0.05


def normalize_expert_labels(mask_data: np.ndarray, dataset_profile: str = DATASET_PROFILE) -> np.ndarray:
    """Map official source labels to canonical BraTS labels (0, 1, 2, 4).

    BraTS 2021 uses 0=background, 1=NCR/NET, 2=ED, 4=ET.
    MSD Task01_BrainTumour uses 0=background, 1=ED, 2=NCR/NET, 3=ET.
    """
    values = np.asarray(mask_data)
    if not np.all(np.equal(values, np.floor(values))):
        raise ValidationError("EXPERT_MASK_NON_INTEGER_LABELS", "Expert mask contains non-integer label values.")

    unique_labels = np.unique(values)
    if dataset_profile == "brats2021":
        allowed = np.array([0, 1, 2, 4])
        if not np.all(np.isin(unique_labels, allowed)):
            bad = unique_labels[~np.isin(unique_labels, allowed)][:10].tolist()
            raise ValidationError("EXPERT_MASK_INVALID_LABELS", f"BraTS 2021 mask contains unsupported labels: {bad}.")
        return values.astype(np.int16)

    if dataset_profile == "msd_task01":
        allowed = np.array([0, 1, 2, 3])
        if not np.all(np.isin(unique_labels, allowed)):
            bad = unique_labels[~np.isin(unique_labels, allowed)][:10].tolist()
            raise ValidationError("EXPERT_MASK_INVALID_LABELS", f"MSD Task01 mask contains unsupported labels: {bad}.")
        # Convert MSD labels to the canonical BraTS label convention.
        normalized = np.zeros(values.shape, dtype=np.int16)
        normalized[values == 1] = LABEL_ED
        normalized[values == 2] = LABEL_NCR
        normalized[values == 3] = LABEL_ET
        return normalized

    raise ValidationError(
        "UNSUPPORTED_DATASET_PROFILE",
        f"Unsupported dataset profile '{dataset_profile}'. Choose brats2021 or msd_task01.",
    )


def validate_expert_mask(
    mask_path: str,
    reference_img: nib.Nifti1Image,
    dataset_profile: str = DATASET_PROFILE,
) -> np.ndarray:
    """Validate a reference label map against MRI geometry and normalize its labels."""
    _mask_img, mask_data, mask_affine, _zooms = validate_single_nifti(mask_path, allow_constant=True)
    if mask_data.shape != reference_img.shape:
        raise ValidationError(
            "EXPERT_MASK_SHAPE_MISMATCH",
            f"Expert mask shape {mask_data.shape} does not match MRI shape {reference_img.shape}.",
        )
    if not np.allclose(mask_affine, reference_img.affine, atol=1e-3):
        raise ValidationError(
            "EXPERT_MASK_AFFINE_MISMATCH",
            "Expert mask spatial affine does not match the reference MRI.",
        )
    return normalize_expert_labels(mask_data, dataset_profile)


def validate_study_set(
    file_paths: Dict[str, str], dataset_profile: str = DATASET_PROFILE
) -> Dict[str, object]:
    """Validate required modalities and the selected official dataset profile."""
    if dataset_profile not in SUPPORTED_DATASET_PROFILES:
        raise ValidationError(
            "UNSUPPORTED_DATASET_PROFILE",
            f"Unsupported dataset profile '{dataset_profile}'. Choose brats2021 or msd_task01.",
        )

    for modality in REQUIRED_MODALITIES:
        if not file_paths.get(modality):
            raise ValidationError("MISSING_SEQUENCE", f"Missing required modality sequence: '{modality.upper()}'.")

    images, affines, shapes, spacings, hashes = {}, {}, {}, {}, []
    for modality in REQUIRED_MODALITIES:
        path = file_paths[modality]
        img, _data, affine, zooms = validate_single_nifti(path)
        images[modality] = img
        affines[modality] = affine
        shapes[modality] = img.shape
        spacings[modality] = zooms
        hashes.append(compute_sha256(path))

    ref_shape = tuple(shapes["t1"])
    ref_affine = affines["t1"]
    ref_spacing = spacings["t1"]
    for modality in REQUIRED_MODALITIES[1:]:
        if shapes[modality] != ref_shape:
            raise ValidationError(
                "SHAPE_MISMATCH",
                f"{modality.upper()} shape {shapes[modality]} does not match T1 shape {ref_shape}.",
            )
        if not np.allclose(affines[modality], ref_affine, atol=1e-3):
            raise ValidationError("AFFINE_MISMATCH", f"{modality.upper()} spatial affine does not match T1.")
        if not np.allclose(spacings[modality], ref_spacing, atol=1e-3):
            raise ValidationError("SPACING_MISMATCH", f"{modality.upper()} voxel spacing does not match T1.")

    if dataset_profile == "brats2021" and ref_shape != BRATS2021_EXPECTED_SHAPE:
        raise ValidationError(
            "BRATS2021_SHAPE_MISMATCH",
            f"BraTS 2021 profile expects shape {BRATS2021_EXPECTED_SHAPE}; received {ref_shape}. "
            "Do not resize silently. Verify the source case and preprocessing.",
        )
    if not np.allclose(ref_spacing, EXPECTED_SPACING_MM, atol=1e-2):
        raise ValidationError(
            "UNSUPPORTED_VOXEL_SPACING",
            f"The configured MONAI bundle expects 1 mm isotropic input; received spacing {ref_spacing} mm. "
            "Resampling is not performed automatically.",
        )

    t1_data = images["t1"].get_fdata(dtype=np.float32)
    combined_hash = hashlib.sha256("".join(hashes).encode("utf-8")).hexdigest()
    return {
        "valid": True,
        "dataset_profile": dataset_profile,
        "ref_shape": ref_shape,
        "ref_affine": ref_affine,
        "zooms": ref_spacing,
        "is_skull_stripped": check_skull_stripped(t1_data),
        "combined_hash": combined_hash,
    }
