"""
Input Sanity & Validation Middleware for NeuroScope 3D.
Enforces all Judges' Failure Pack criteria and medical scan integrity.
"""

import hashlib
import os
from typing import Dict, Tuple
import nibabel as nib
import numpy as np
from .config import MAX_FILE_SIZE_BYTES, REQUIRED_MODALITIES


class ValidationError(Exception):
    """Custom exception raised when an input scan fails validation."""
    def __init__(self, code: str, message: str, details: dict = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


def compute_sha256(file_path: str) -> str:
    """Computes SHA-256 hash of a file for audit provenance."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def check_file_size(file_path: str):
    """Rejects inputs exceeding the 1 GB size limit."""
    file_size = os.path.getsize(file_path)
    if file_size > MAX_FILE_SIZE_BYTES:
        raise ValidationError(
            code="FILE_TOO_LARGE",
            message=f"File exceeds maximum allowed size of 1 GB ({file_size / (1024**3):.2f} GB)."
        )


def validate_single_nifti(file_path: str) -> Tuple[nib.Nifti1Image, np.ndarray, np.ndarray, Tuple[float, ...]]:
    """Validates a single NIfTI scan."""
    check_file_size(file_path)

    try:
        img = nib.load(file_path)
        data = img.get_fdata(dtype=np.float32)
    except Exception as exc:
        raise ValidationError(
            code="CORRUPT_NIFTI",
            message=f"Failed to parse NIfTI file. Ensure valid, uncorrupted `.nii` or `.nii.gz` format. Error: {str(exc)}"
        )

    if data.ndim != 3:
        raise ValidationError(
            code="UNSUPPORTED_DIMENSIONS",
            message=f"Expected 3D spatial volume, but received {data.ndim}D array."
        )

    if not np.all(np.isfinite(data)):
        raise ValidationError(
            code="NONFINITE_VALUES",
            message="Volume contains non-finite numbers (NaN or Inf values)."
        )

    if np.all(data == 0) or np.std(data) == 0:
        raise ValidationError(
            code="CONSTANT_VOLUME",
            message="Volume is constant or contains all zero voxels."
        )

    affine = img.affine
    header = img.header
    zooms = header.get_zooms()[:3]

    return img, data, affine, zooms


def check_skull_stripped(data: np.ndarray) -> bool:
    """Heuristic check for skull-stripped brain scans."""
    border_voxels = np.concatenate([
        data[0, :, :].ravel(), data[-1, :, :].ravel(),
        data[:, 0, :].ravel(), data[:, -0, :].ravel(),
        data[:, :, 0].ravel(), data[:, :, -1].ravel(),
    ])
    non_zero_border_ratio = np.count_nonzero(border_voxels) / float(len(border_voxels))
    return non_zero_border_ratio < 0.05


def validate_study_set(file_paths: Dict[str, str]) -> Dict[str, any]:
    """Validates the full 4-sequence study set (T1, T1Gd, T2, FLAIR)."""
    for mod in REQUIRED_MODALITIES:
        if mod not in file_paths or not file_paths[mod]:
            raise ValidationError(
                code="MISSING_SEQUENCE",
                message=f"Missing required modality sequence: '{mod.upper()}'."
            )

    images, datas, affines, shapes, hashes = {}, {}, {}, {}, []

    for mod in REQUIRED_MODALITIES:
        path = file_paths[mod]
        img, data, affine, zooms = validate_single_nifti(path)
        images[mod], datas[mod], affines[mod], shapes[mod] = img, data, affine, data.shape
        hashes.append(compute_sha256(path))

    ref_shape = shapes["t1"]
    ref_affine = affines["t1"]

    for mod in REQUIRED_MODALITIES[1:]:
        if shapes[mod] != ref_shape:
            raise ValidationError(
                code="SHAPE_MISMATCH",
                message=f"Shape mismatch: '{mod.upper()}' shape {shapes[mod]} does not match T1 shape {ref_shape}."
            )
        if not np.allclose(affines[mod], ref_affine, atol=1e-3):
            raise ValidationError(
                code="AFFINE_MISMATCH",
                message=f"Affine coordinate mismatch between '{mod.upper()}' and T1 sequence."
            )

    is_skull_stripped = check_skull_stripped(datas["t1"])
    combined_hash = hashlib.sha256("".join(hashes).encode()).hexdigest()

    return {
        "valid": True,
        "ref_shape": ref_shape,
        "ref_affine": ref_affine,
        "zooms": nib.load(file_paths["t1"]).header.get_zooms()[:3],
        "is_skull_stripped": is_skull_stripped,
        "combined_hash": combined_hash,
    }