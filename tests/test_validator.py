"""Unit tests for NIfTI validation routines."""
import tempfile
from pathlib import Path
import nibabel as nib
import numpy as np
import pytest

from backend.app.validator import (
    validate_single_nifti,
    validate_expert_mask,
    validate_study_set,
    check_skull_stripped,
    ValidationError,
)


@pytest.fixture
def temp_nifti_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


def make_dummy_nifti(path: Path, shape=(32, 32, 16), zooms=(1.0, 1.0, 1.0), fill=1.0):
    affine = np.diag([zooms[0], zooms[1], zooms[2], 1.0])
    data = np.full(shape, fill, dtype=np.float32)
    img = nib.Nifti1Image(data, affine)
    img.header.set_zooms(zooms)
    nib.save(img, str(path))
    return path


def test_validate_single_nifti_valid(temp_nifti_dir):
    p = temp_nifti_dir / "valid.nii.gz"
    # Create non-constant data
    affine = np.diag([1.0, 1.0, 1.5, 1.0])
    data = np.random.RandomState(42).randn(16, 16, 16).astype(np.float32) + 10.0
    img = nib.Nifti1Image(data, affine)
    img.header.set_zooms((1.0, 1.0, 1.5))
    nib.save(img, str(p))

    nii, d, aff, zooms = validate_single_nifti(str(p))
    assert nii is not None
    assert d.shape == (16, 16, 16)
    assert np.allclose(aff, affine)
    assert zooms == (1.0, 1.0, 1.5)


def test_validate_single_nifti_constant_rejected(temp_nifti_dir):
    p = temp_nifti_dir / "constant.nii.gz"
    make_dummy_nifti(p, fill=0.0)

    with pytest.raises(ValidationError) as exc:
        validate_single_nifti(str(p))
    assert exc.value.code == "CONSTANT_VOLUME"


def test_validate_single_nifti_nonfinite_rejected(temp_nifti_dir):
    p = temp_nifti_dir / "nan.nii.gz"
    affine = np.eye(4)
    data = np.ones((16, 16, 16), dtype=np.float32)
    data[2, 2, 2] = np.nan
    nib.save(nib.Nifti1Image(data, affine), str(p))

    with pytest.raises(ValidationError) as exc:
        validate_single_nifti(str(p))
    assert exc.value.code == "NONFINITE_VALUES"


def test_validate_single_nifti_corrupt_rejected(temp_nifti_dir):
    p = temp_nifti_dir / "corrupt.nii.gz"
    p.write_bytes(b"not a valid nifti header content")

    with pytest.raises(ValidationError) as exc:
        validate_single_nifti(str(p))
    assert exc.value.code == "CORRUPT_NIFTI"


def test_validate_study_set_valid(temp_nifti_dir):
    paths = {}
    for mod in ("t1", "t1gd", "t2", "flair"):
        p = temp_nifti_dir / f"{mod}.nii.gz"
        affine = np.diag([1.0, 1.0, 1.0, 1.0])
        data = np.random.RandomState(hash(mod) % 1000).randn(16, 16, 16).astype(np.float32) + 5.0
        nib.save(nib.Nifti1Image(data, affine), str(p))
        paths[mod] = str(p)

    res = validate_study_set(paths)
    assert res["valid"] is True
    assert res["ref_shape"] == (16, 16, 16)
    assert "combined_hash" in res


def test_validate_study_set_missing_modality():
    paths = {"t1": "a.nii", "t2": "b.nii"}
    with pytest.raises(ValidationError) as exc:
        validate_study_set(paths)
    assert exc.value.code == "MISSING_SEQUENCE"


def test_validate_study_set_shape_mismatch(temp_nifti_dir):
    paths = {}
    for mod in ("t1", "t1gd", "t2", "flair"):
        p = temp_nifti_dir / f"{mod}.nii.gz"
        shape = (16, 16, 16) if mod != "flair" else (16, 16, 20)
        data = np.random.RandomState(42).randn(*shape).astype(np.float32) + 5.0
        nib.save(nib.Nifti1Image(data, np.eye(4)), str(p))
        paths[mod] = str(p)

    with pytest.raises(ValidationError) as exc:
        validate_study_set(paths)
    assert exc.value.code == "SHAPE_MISMATCH"


def test_validate_expert_mask_valid_brats(temp_nifti_dir):
    ref_img = nib.Nifti1Image(np.ones((16, 16, 16), dtype=np.float32), np.eye(4))
    mask_path = temp_nifti_dir / "mask.nii.gz"
    mask_data = np.zeros((16, 16, 16), dtype=np.int16)
    mask_data[4:8, 4:8, 4:8] = 1
    mask_data[5:7, 5:7, 5:7] = 2
    mask_data[6:7, 6:7, 6:7] = 4
    nib.save(nib.Nifti1Image(mask_data, np.eye(4)), str(mask_path))

    validated = validate_expert_mask(str(mask_path), ref_img, dataset_profile="brats")
    assert validated.shape == (16, 16, 16)
    assert set(np.unique(validated)).issubset({0, 1, 2, 4})


def test_validate_expert_mask_invalid_label(temp_nifti_dir):
    ref_img = nib.Nifti1Image(np.ones((16, 16, 16), dtype=np.float32), np.eye(4))
    mask_path = temp_nifti_dir / "mask_bad.nii.gz"
    mask_data = np.zeros((16, 16, 16), dtype=np.int16)
    mask_data[2, 2, 2] = 99  # Invalid label
    nib.save(nib.Nifti1Image(mask_data, np.eye(4)), str(mask_path))

    with pytest.raises(ValidationError) as exc:
        validate_expert_mask(str(mask_path), ref_img, dataset_profile="brats")
    assert exc.value.code == "EXPERT_MASK_INVALID_LABELS"


def test_check_skull_stripped():
    # Volume with zeros on border
    data = np.zeros((20, 20, 20), dtype=np.float32)
    data[5:15, 5:15, 5:15] = 100.0
    assert check_skull_stripped(data) is True

    # Volume with high intensity on all borders
    data_full = np.full((20, 20, 20), 50.0, dtype=np.float32)
    assert check_skull_stripped(data_full) is False
