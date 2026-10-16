"""Integration test running real MONAI SegResNet pretrained model inference."""
import tempfile
from pathlib import Path
import nibabel as nib
import numpy as np
import pytest
import torch

from backend.app.inference import run_inference, get_model_status, load_monai_model


def test_real_monai_checkpoint_loads():
    status = get_model_status()
    assert status["checkpoint_exists"] is True
    assert status["checkpoint_sha256"] == "860ccb3f1c21c99d0410ad8a1ac4ef6b8fab60cec0a503b0ba42675741a750ae"

    model = load_monai_model()
    assert model is not None
    assert isinstance(model, torch.nn.Module)


def test_real_model_inference_pipeline():
    status = get_model_status()
    if not status["checkpoint_exists"]:
        pytest.skip("Pretrained checkpoint not available on disk.")

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        # Create a small 32x32x32 volume with brain-like intensities
        # (Divisible by 8 as required by SegResNet 3-stage downsampling)
        affine = np.diag([1.0, 1.0, 1.0, 1.0])
        file_paths = {}

        # Simulating multimodal intensities (nonzero brain tissue)
        for i, mod in enumerate(("t1gd", "t1", "t2", "flair")):
            vol = np.zeros((32, 32, 32), dtype=np.float32)
            # Center sphere for brain tissue
            z, y, x = np.ogrid[:32, :32, :32]
            dist = np.sqrt((x - 16)**2 + (y - 16)**2 + (z - 16)**2)
            vol[dist <= 12] = 50.0 + (i * 20.0)
            p = tmp_path / f"{mod}.nii.gz"
            nib.save(nib.Nifti1Image(vol, affine), str(p))
            file_paths[mod] = str(p)

        out_path = tmp_path / "pred_real.nii.gz"
        pred_map, elapsed = run_inference(file_paths, str(out_path))

        assert elapsed > 0.0
        assert pred_map.shape == (32, 32, 32)
        assert pred_map.dtype == np.int16
        # Allowed labels in prediction
        assert set(np.unique(pred_map)).issubset({0, 1, 2, 4})
        assert out_path.is_file()

        # Check saved NIfTI geometry and header
        saved_nii = nib.load(str(out_path))
        assert saved_nii.shape == (32, 32, 32)
        assert np.allclose(saved_nii.affine, affine)
        assert saved_nii.header.get_data_dtype() == np.int16
