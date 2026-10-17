"""Regression tests for the inference geometry preprocessing helpers."""
import numpy as np
import nibabel as nib

from backend.app.inference import _canonical_one_mm_images, _restore_prediction_to_original_grid


def test_canonical_preprocessing_returns_ras_one_mm_grid():
    data = np.zeros((6, 7, 8), dtype=np.float32)
    data[2:4, 3:5, 2:6] = 1
    affine = np.diag([-2.0, 1.5, 2.0, 1.0])
    images = {name: nib.Nifti1Image(data, affine) for name in ("t1", "t1gd", "t2", "flair")}

    result = _canonical_one_mm_images(images)
    out = result["t1"]

    assert nib.aff2axcodes(out.affine) == ("R", "A", "S")
    assert np.allclose(np.sqrt((out.affine[:3, :3] ** 2).sum(axis=0)), [1, 1, 1])


def test_restore_prediction_uses_original_shape_and_affine():
    reference = nib.Nifti1Image(np.zeros((5, 6, 7), dtype=np.float32), np.diag([-2.0, 1.5, 2.0, 1.0]))
    canonical = np.zeros((10, 9, 14), dtype=np.int16)
    canonical[4:6, 3:6, 6:10] = 4
    restored = _restore_prediction_to_original_grid(canonical, np.diag([1, 1, 1, 1]), reference)

    assert restored.shape == reference.shape
    assert restored.dtype == np.int16
    assert set(np.unique(restored)).issubset({0, 4})
