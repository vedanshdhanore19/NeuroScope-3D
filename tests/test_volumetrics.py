"""Unit tests for physical volumetrics, Dice, Sensitivity, and HD95."""
import numpy as np
import pytest

from backend.app.volumetrics import (
    calculate_voxel_volume_mm3,
    extract_subregion_masks,
    extract_nested_region_masks,
    compute_volumes,
    calculate_dice_and_sensitivity,
    calculate_hd95_mm,
    evaluate_against_expert_mask,
)
from backend.app.config import LABEL_BACKGROUND, LABEL_NCR, LABEL_ED, LABEL_ET


def test_calculate_voxel_volume_isotropic():
    affine = np.diag([1.0, 1.0, 1.0, 1.0])
    vol = calculate_voxel_volume_mm3(affine)
    assert pytest.approx(vol, rel=1e-5) == 1.0


def test_calculate_voxel_volume_anisotropic():
    affine = np.diag([0.5, 0.5, 2.0, 1.0])
    vol = calculate_voxel_volume_mm3(affine)
    assert pytest.approx(vol, rel=1e-5) == 0.5


def test_nested_regions_consistency():
    label_map = np.zeros((10, 10, 10), dtype=np.int16)
    label_map[1:3, 1:3, 1:3] = LABEL_NCR  # 2x2x2 = 8 voxels
    label_map[3:5, 3:5, 3:5] = LABEL_ED   # 2x2x2 = 8 voxels
    label_map[5:7, 5:7, 5:7] = LABEL_ET   # 2x2x2 = 8 voxels

    sub = extract_subregion_masks(label_map)
    assert np.count_nonzero(sub["NCR"]) == 8
    assert np.count_nonzero(sub["ED"]) == 8
    assert np.count_nonzero(sub["ET"]) == 8

    nested = extract_nested_region_masks(label_map)
    # WT = NCR + ED + ET = 8 + 8 + 8 = 24 voxels
    assert np.count_nonzero(nested["WT"]) == 24
    # TC = NCR + ET = 8 + 8 = 16 voxels
    assert np.count_nonzero(nested["TC"]) == 16
    # ET = 8 voxels
    assert np.count_nonzero(nested["ET"]) == 8


def test_compute_volumes_physical_formula():
    label_map = np.zeros((10, 10, 10), dtype=np.int16)
    # Put 1000 voxels of ET
    label_map[:10, :10, :10] = LABEL_ET  # 1000 voxels

    # Voxel spacing: 1.0 x 1.0 x 1.0 mm -> 1 mm^3 per voxel
    # 1000 voxels * 1 mm^3 / 1000 = 1.0 mL
    affine = np.eye(4)
    vols = compute_volumes(label_map, affine, (1.0, 1.0, 1.0))

    assert vols["ET"]["voxel_count"] == 1000
    assert pytest.approx(vols["ET"]["volume_ml"], rel=1e-3) == 1.0
    assert pytest.approx(vols["WT"]["volume_ml"], rel=1e-3) == 1.0
    assert pytest.approx(vols["TC"]["volume_ml"], rel=1e-3) == 1.0


def test_compute_volumes_anisotropic_spacing():
    label_map = np.zeros((10, 10, 10), dtype=np.int16)
    label_map[:10, :10, :5] = LABEL_ET  # 500 voxels

    # Voxel spacing: 2.0 x 2.0 x 2.0 mm -> 8 mm^3 per voxel
    # 500 voxels * 8 mm^3 = 4000 mm^3 = 4.0 mL
    affine = np.diag([2.0, 2.0, 2.0, 1.0])
    vols = compute_volumes(label_map, affine, (2.0, 2.0, 2.0))

    assert vols["ET"]["voxel_count"] == 500
    assert pytest.approx(vols["ET"]["volume_ml"], rel=1e-3) == 4.0


def test_empty_mask_volumes():
    label_map = np.zeros((10, 10, 10), dtype=np.int16)
    vols = compute_volumes(label_map, np.eye(4), (1.0, 1.0, 1.0))
    for region in ("WT", "TC", "ET"):
        assert vols[region]["voxel_count"] == 0
        assert vols[region]["volume_ml"] == 0.0


def test_dice_and_sensitivity_identical():
    mask = np.zeros((10, 10, 10), dtype=bool)
    mask[2:6, 2:6, 2:6] = True

    dice, sens = calculate_dice_and_sensitivity(mask, mask)
    assert dice == 1.0
    assert sens == 1.0


def test_dice_and_sensitivity_disjoint():
    pred = np.zeros((10, 10, 10), dtype=bool)
    pred[:5, :, :] = True
    gt = np.zeros((10, 10, 10), dtype=bool)
    gt[5:, :, :] = True

    dice, sens = calculate_dice_and_sensitivity(pred, gt)
    assert dice == 0.0
    assert sens == 0.0


def test_dice_both_empty():
    empty = np.zeros((10, 10, 10), dtype=bool)
    dice, sens = calculate_dice_and_sensitivity(empty, empty)
    assert dice == 1.0
    assert sens == 1.0


def test_hd95_identical_is_zero():
    mask = np.zeros((15, 15, 15), dtype=bool)
    mask[4:10, 4:10, 4:10] = True
    hd95 = calculate_hd95_mm(mask, mask, spacing=(1.0, 1.0, 1.0))
    assert hd95 == 0.0


def test_hd95_both_empty_is_zero():
    empty = np.zeros((10, 10, 10), dtype=bool)
    hd95 = calculate_hd95_mm(empty, empty)
    assert hd95 == 0.0


def test_hd95_one_empty_penalty():
    empty = np.zeros((10, 10, 10), dtype=bool)
    non_empty = np.zeros((10, 10, 10), dtype=bool)
    non_empty[2:4, 2:4, 2:4] = True
    hd95 = calculate_hd95_mm(empty, non_empty)
    assert hd95 == 100.0


def test_evaluate_against_expert_mask():
    pred = np.zeros((10, 10, 10), dtype=np.int16)
    pred[2:5, 2:5, 2:5] = LABEL_ET
    gt = np.zeros((10, 10, 10), dtype=np.int16)
    gt[2:5, 2:5, 2:5] = LABEL_ET

    eval_results = evaluate_against_expert_mask(pred, gt, spacing=(1.0, 1.0, 1.0))
    assert eval_results["ET"]["dice_score"] == 1.0
    assert eval_results["ET"]["sensitivity"] == 1.0
    assert eval_results["ET"]["hd95_mm"] == 0.0
