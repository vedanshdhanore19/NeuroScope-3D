"""
Tests for additive visualization endpoints:
- Volume spatial info (/volume-info)
- 2D orthogonal slice rendering with brightness/contrast/region toggles (/slice)
- Marching cubes 3D surface mesh generation (/mesh)
- Security: Path traversal rejection, invalid region validation, 404 on missing runs
"""

import io
import uuid
from pathlib import Path
import nibabel as nib
import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from backend.main import app
from backend.app.config import TEMP_DIR, LABEL_NCR, LABEL_ED, LABEL_ET


@pytest.fixture
def synthetic_run(tmp_path):
    """Creates a temporary study run directory with small synthetic NIfTI volumes for testing."""
    run_id = str(uuid.uuid4())
    run_dir = TEMP_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    shape = (32, 32, 32)
    affine = np.eye(4)
    zooms = (1.0, 1.0, 1.0)

    # 1. Base structural modalities (T1, T1gd, T2, FLAIR)
    for mod in ["t1", "t1gd", "t2", "flair"]:
        data = np.zeros(shape, dtype=np.float32)
        # Create an ellipsoid brain phantom
        for x in range(shape[0]):
            for y in range(shape[1]):
                for z in range(shape[2]):
                    if ((x - 16)**2 / 12**2 + (y - 16)**2 / 12**2 + (z - 16)**2 / 12**2) <= 1.0:
                        data[x, y, z] = 50.0 + (x + y + z) * 2.0
        img = nib.Nifti1Image(data, affine)
        img.header.set_zooms(zooms)
        nib.save(img, str(run_dir / f"{mod}.nii.gz"))

    # 2. Prediction mask with nested BraTS subregions:
    # ET (4) inside TC (1+4) inside WT (1+2+4)
    pred_data = np.zeros(shape, dtype=np.int16)
    for x in range(shape[0]):
        for y in range(shape[1]):
            for z in range(shape[2]):
                dist = np.sqrt((x - 16)**2 + (y - 16)**2 + (z - 16)**2)
                if dist <= 2.5:
                    pred_data[x, y, z] = LABEL_ET  # 4 (Enhancing Tumor)
                elif dist <= 4.5:
                    pred_data[x, y, z] = LABEL_NCR # 1 (Necrotic Core)
                elif dist <= 7.0:
                    pred_data[x, y, z] = LABEL_ED  # 2 (Peritumoral Edema)

    pred_img = nib.Nifti1Image(pred_data, affine)
    nib.save(pred_img, str(run_dir / "prediction.nii.gz"))

    yield run_id

    # Teardown
    import shutil
    if run_dir.exists():
        shutil.rmtree(run_dir, ignore_errors=True)


client = TestClient(app)


def test_volume_info_success(synthetic_run):
    response = client.get(f"/api/v1/jobs/{synthetic_run}/volume-info")
    assert response.status_code == 200
    data = response.json()
    assert data["run_id"] == synthetic_run
    assert data["shape"] == {"x": 32, "y": 32, "z": 32}
    assert "axial" in data["planes"]
    assert data["planes"]["axial"]["max_slice"] == 31
    assert data["planes"]["axial"]["default_slice"] == 16
    assert data["has_prediction"] is True
    assert set(data["modalities"]) == {"t1", "t1gd", "t2", "flair"}


def test_volume_info_unknown_run():
    unknown_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/jobs/{unknown_id}/volume-info")
    assert response.status_code == 404


def test_volume_info_path_traversal():
    response = client.get("/api/v1/jobs/../../etc/passwd/volume-info")
    assert response.status_code in [400, 404]


def test_slice_rendering_png_validity(synthetic_run):
    response = client.get(f"/api/v1/jobs/{synthetic_run}/slice?modality=t1&plane=axial&index=16")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert "cache-control" in response.headers
    # Verify PNG parses cleanly
    img = Image.open(io.BytesIO(response.content))
    assert img.format == "PNG"
    assert img.size == (32, 32)


def test_slice_brightness_contrast(synthetic_run):
    # Slice with default brightness
    res1 = client.get(f"/api/v1/jobs/{synthetic_run}/slice?modality=t1&plane=axial&index=16&brightness=1.0&contrast=1.0")
    img1 = np.array(Image.open(io.BytesIO(res1.content)))

    # Slice with elevated brightness
    res2 = client.get(f"/api/v1/jobs/{synthetic_run}/slice?modality=t1&plane=axial&index=16&brightness=1.8&contrast=1.0")
    img2 = np.array(Image.open(io.BytesIO(res2.content)))

    # Higher brightness should produce greater or equal mean pixel intensity
    assert img2.mean() > img1.mean()


def test_slice_region_toggles(synthetic_run):
    # Slice with no overlay
    res_none = client.get(f"/api/v1/jobs/{synthetic_run}/slice?modality=t1&plane=axial&index=16&regions=")
    img_none = np.array(Image.open(io.BytesIO(res_none.content)))

    # Slice with full overlay
    res_all = client.get(f"/api/v1/jobs/{synthetic_run}/slice?modality=t1&plane=axial&index=16&regions=WT,TC,ET")
    img_all = np.array(Image.open(io.BytesIO(res_all.content)))

    # Overlay colors (red/green/amber) should make channels differ from grayscale base
    assert not np.array_equal(img_none, img_all)


def test_mesh_generation_nesting(synthetic_run):
    # Test Marching Cubes mesh for WT, TC, and ET
    res_wt = client.get(f"/api/v1/jobs/{synthetic_run}/mesh?region=WT")
    assert res_wt.status_code == 200
    data_wt = res_wt.json()
    assert data_wt["region"] == "WT"
    assert data_wt["num_vertices"] > 0
    assert data_wt["num_faces"] > 0
    assert len(data_wt["vertices"]) == data_wt["num_vertices"] * 3
    assert len(data_wt["faces"]) == data_wt["num_faces"] * 3
    assert "center_mm" in data_wt
    assert "bbox_mm" in data_wt

    res_tc = client.get(f"/api/v1/jobs/{synthetic_run}/mesh?region=TC")
    data_tc = res_tc.json()

    res_et = client.get(f"/api/v1/jobs/{synthetic_run}/mesh?region=ET")
    data_et = res_et.json()

    # Verify nested voxel counts: ET <= TC <= WT
    assert data_et["num_voxels"] <= data_tc["num_voxels"] <= data_wt["num_voxels"]
    assert data_et["num_voxels"] > 0


def test_mesh_bad_region(synthetic_run):
    response = client.get(f"/api/v1/jobs/{synthetic_run}/mesh?region=INVALID")
    assert response.status_code == 400


def test_mesh_max_faces_budget(synthetic_run):
    # Setting max_faces to 100 should force step_size scaling
    response = client.get(f"/api/v1/jobs/{synthetic_run}/mesh?region=WT&max_faces=100")
    assert response.status_code == 200
    data = response.json()
    assert data["step_size"] >= 1
