"""API integration tests for NeuroScope 3D backend endpoints."""
import io
import tempfile
from pathlib import Path
import nibabel as nib
import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.app.database import init_db


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    init_db()


@pytest.fixture
def client():
    return TestClient(app)


def make_nifti_bytes(shape=(16, 16, 16), zooms=(1.0, 1.0, 1.0), fill=5.0):
    affine = np.diag([zooms[0], zooms[1], zooms[2], 1.0])
    data = (np.random.RandomState(int(fill * 10)).randn(*shape).astype(np.float32) + fill)
    img = nib.Nifti1Image(data, affine)
    img.header.set_zooms(zooms)
    with tempfile.NamedTemporaryFile(suffix=".nii.gz", delete=False) as f:
        tmp_name = f.name
    try:
        nib.save(img, tmp_name)
        return Path(tmp_name).read_bytes()
    finally:
        Path(tmp_name).unlink(missing_ok=True)


def make_mask_bytes(shape=(16, 16, 16)):
    affine = np.eye(4)
    data = np.zeros(shape, dtype=np.int16)
    data[4:8, 4:8, 4:8] = 1
    data[6:8, 6:8, 6:8] = 4
    img = nib.Nifti1Image(data, affine)
    with tempfile.NamedTemporaryFile(suffix=".nii.gz", delete=False) as f:
        tmp_name = f.name
    try:
        nib.save(img, tmp_name)
        return Path(tmp_name).read_bytes()
    finally:
        Path(tmp_name).unlink(missing_ok=True)


def test_root_endpoint(client):
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "disclaimer" in data
    assert "model_status" in data


def test_health_endpoints(client):
    for path in ("/health", "/api/v1/health"):
        res = client.get(path)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "model" in data
        assert data["model"]["bundle_name"] == "brats_mri_segmentation"
        assert data["model"]["bundle_version"] == "0.5.4"


def test_model_status_endpoint(client):
    res = client.get("/api/v1/model/status")
    assert res.status_code == 200
    data = res.json()
    assert data["architecture"] == "SegResNet"
    assert data["input_channels"] == 4
    assert data["output_channels"] == 3


def test_validate_missing_files(client):
    # Send empty payload
    res = client.post("/api/v1/validate")
    assert res.status_code == 422  # Validation error from FastAPI


def test_validate_corrupt_file(client):
    files = {
        "t1": ("t1.nii.gz", b"corrupt data", "application/gzip"),
        "t1gd": ("t1gd.nii.gz", b"corrupt data", "application/gzip"),
        "t2": ("t2.nii.gz", b"corrupt data", "application/gzip"),
        "flair": ("flair.nii.gz", b"corrupt data", "application/gzip"),
    }
    res = client.post("/api/v1/validate", files=files)
    assert res.status_code == 400
    assert "code" in res.json()["detail"]


def test_validate_and_segment_pipeline(client, monkeypatch):
    t1_bytes = make_nifti_bytes(fill=10.0)
    t1gd_bytes = make_nifti_bytes(fill=12.0)
    t2_bytes = make_nifti_bytes(fill=14.0)
    flair_bytes = make_nifti_bytes(fill=16.0)
    expert_bytes = make_mask_bytes()

    files = {
        "t1": ("t1.nii.gz", t1_bytes, "application/gzip"),
        "t1gd": ("t1gd.nii.gz", t1gd_bytes, "application/gzip"),
        "t2": ("t2.nii.gz", t2_bytes, "application/gzip"),
        "flair": ("flair.nii.gz", flair_bytes, "application/gzip"),
        "expert_mask": ("expert.nii.gz", expert_bytes, "application/gzip"),
    }

    # Step 1: Validate study
    val_res = client.post("/api/v1/validate", files=files, data={"dataset_profile": "brats"})
    assert val_res.status_code == 200
    val_data = val_res.json()
    assert val_data["status"] == "VALIDATED"
    run_id = val_data["run_id"]

    # Step 2: Fetch study details before inference
    study_res = client.get(f"/api/v1/study/{run_id}")
    assert study_res.status_code == 200
    assert study_res.json()["status"] == "VALIDATED"

    # Step 3: Run segment endpoint
    # To test API flow reproducibly and quickly without heavy CPU sliding window on random noise:
    def fake_run_inference(file_paths, output_save_path):
        ref_img = nib.load(file_paths["t1"])
        dummy_pred = np.zeros(ref_img.shape, dtype=np.int16)
        dummy_pred[4:8, 4:8, 4:8] = 1
        dummy_pred[6:8, 6:8, 6:8] = 4
        out_nii = nib.Nifti1Image(dummy_pred, ref_img.affine)
        out_nii.header.set_data_dtype(np.int16)
        nib.save(out_nii, output_save_path)
        return dummy_pred, 0.42

    monkeypatch.setattr("backend.main.run_inference", fake_run_inference)

    seg_res = client.post(f"/api/v1/segment/{run_id}")
    assert seg_res.status_code == 200
    seg_data = seg_res.json()
    assert seg_data["status"] == "COMPLETED"
    assert "volumes" in seg_data
    assert "WT" in seg_data["volumes"]
    assert "metrics" in seg_data
    assert "WT" in seg_data["metrics"]

    # Step 4: Download prediction NIfTI
    pred_res = client.get(f"/api/v1/jobs/{run_id}/prediction")
    assert pred_res.status_code == 200
    assert len(pred_res.content) > 0

    # Step 5: Download generated PDF report
    report_res = client.get(f"/api/v1/jobs/{run_id}/report")
    assert report_res.status_code == 200
    assert report_res.headers["content-type"] == "application/pdf"
    assert len(report_res.content) > 1000

    # Step 6: Test slice image endpoint
    slice_res = client.get(f"/api/v1/study/{run_id}/slice/t1/2/5?overlay=true")
    assert slice_res.status_code == 200
    assert slice_res.headers["content-type"] == "image/png"
    assert len(slice_res.content) > 0


def test_segment_nonexistent_run(client):
    res = client.post("/api/v1/segment/non-existent-uuid")
    assert res.status_code == 404
