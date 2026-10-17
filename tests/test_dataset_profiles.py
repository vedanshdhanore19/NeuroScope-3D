"""Unit tests for dataset profiles (MSD Task01 vs BraTS)."""
import json
import tempfile
from pathlib import Path
import nibabel as nib
import numpy as np
import pytest

from backend.app.dataset_profiles import (
    convert_msd_labels_to_brats,
    unpack_msd_4d_volume,
    parse_msd_dataset_json,
    MSD_TO_BRATS_LABEL_MAP,
)
from backend.app.config import LABEL_BACKGROUND, LABEL_NCR, LABEL_ED, LABEL_ET


def test_convert_msd_labels_to_brats():
    msd_array = np.array([0, 1, 2, 3], dtype=np.int16)
    brats_array = convert_msd_labels_to_brats(msd_array)

    # MSD 0 -> BraTS 0 (bg)
    # MSD 1 -> BraTS 2 (edema)
    # MSD 2 -> BraTS 1 (NCR)
    # MSD 3 -> BraTS 4 (ET)
    expected = np.array([0, LABEL_ED, LABEL_NCR, LABEL_ET], dtype=np.int16)
    np.testing.assert_array_equal(brats_array, expected)


def test_convert_msd_labels_invalid_label_raises():
    msd_bad = np.array([0, 1, 99], dtype=np.int16)
    with pytest.raises(ValueError):
        convert_msd_labels_to_brats(msd_bad)


def test_unpack_msd_4d_volume():
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        msd_file = tmp_path / "case_001.nii.gz"
        out_dir = tmp_path / "unpacked"

        # Create 4D array shape (10, 10, 8, 4)
        data_4d = np.zeros((10, 10, 8, 4), dtype=np.float32)
        data_4d[..., 0] = 10.0  # FLAIR
        data_4d[..., 1] = 20.0  # T1
        data_4d[..., 2] = 30.0  # T1gd
        data_4d[..., 3] = 40.0  # T2

        affine = np.diag([1.0, 1.0, 1.0, 1.0])
        nib.save(nib.Nifti1Image(data_4d, affine), str(msd_file))

        extracted = unpack_msd_4d_volume(str(msd_file), out_dir)

        assert set(extracted.keys()) == {"flair", "t1", "t1gd", "t2"}
        for k in ("flair", "t1", "t1gd", "t2"):
            assert Path(extracted[k]).is_file()

        # Check unpacked data values
        img_flair = nib.load(extracted["flair"])
        assert img_flair.shape == (10, 10, 8)
        assert np.all(img_flair.get_fdata() == 10.0)

        img_t1 = nib.load(extracted["t1"])
        assert np.all(img_t1.get_fdata() == 20.0)

        img_t1gd = nib.load(extracted["t1gd"])
        assert np.all(img_t1gd.get_fdata() == 30.0)

        img_t2 = nib.load(extracted["t2"])
        assert np.all(img_t2.get_fdata() == 40.0)


def test_parse_msd_dataset_json():
    with tempfile.TemporaryDirectory() as tmpdir:
        json_file = Path(tmpdir) / "dataset.json"
        sample_meta = {
            "name": "Task01_BrainTumour",
            "description": "Brain Tumor Segmentation",
            "modality": {"0": "FLAIR", "1": "T1w", "2": "t1gd", "3": "T2w"},
            "labels": {"0": "background", "1": "edema", "2": "non-enhancing", "3": "enhancing"},
            "numTraining": 484,
            "numTest": 266,
            "licence": "CC-BY-SA 4.0",
        }
        with open(json_file, "w") as f:
            json.dump(sample_meta, f)

        parsed = parse_msd_dataset_json(str(json_file))
        assert parsed["name"] == "Task01_BrainTumour"
        assert parsed["modality"]["0"] == "FLAIR"
        assert parsed["labels"]["1"] == "edema"
        assert parsed["numTraining"] == 484
