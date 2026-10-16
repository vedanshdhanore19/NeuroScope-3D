"""
Volumetric Calculation & Advanced Metric Evaluation Engine for NeuroScope 3D.
Handles physical spacing conversions, volume calculation in mL, Dice, Sensitivity,
and 95th Percentile Hausdorff Distance (HD95) in physical millimeters.
"""

from typing import Dict, Optional, Tuple
import numpy as np
from scipy.ndimage import distance_transform_edt, binary_erosion
from .config import LABEL_ED, LABEL_ET, LABEL_NCR


def calculate_voxel_volume_mm3(
    affine: np.ndarray, zooms: Optional[Tuple[float, ...]] = None
) -> float:
    """Calculates physical volume of a single voxel in mm^3 using the affine determinant or zooms."""
    if affine is not None and affine.shape >= (3, 3):
        det = float(np.abs(np.linalg.det(affine[:3, :3])))
        if det > 1e-6 and np.isfinite(det):
            return det
    if zooms is not None and len(zooms) >= 3 and all(float(z) > 0 for z in zooms[:3]):
        return float(zooms[0] * zooms[1] * zooms[2])
    return 1.0  # 1 mm^3 fallback if geometric metadata is missing


def extract_subregion_masks(label_data: np.ndarray) -> Dict[str, np.ndarray]:
    """
    Extracts mutually exclusive individual subregion masks:
    - NCR: Necrotic and non-enhancing tumor core (label 1)
    - ED: Peritumoral edema (label 2)
    - ET: Enhancing tumor (label 4)
    """
    return {
        "NCR": (label_data == LABEL_NCR),
        "ED": (label_data == LABEL_ED),
        "ET": (label_data == LABEL_ET),
    }


def extract_nested_region_masks(label_data: np.ndarray) -> Dict[str, np.ndarray]:
    """
    Extracts standard BraTS composite evaluation regions (nested):
    - WT: Whole Tumor (NCR | ED | ET)
    - TC: Tumor Core (NCR | ET)
    - ET: Enhancing Tumor (ET)
    Note: ET is a subset of TC, which is a subset of WT.
    """
    sub = extract_subregion_masks(label_data)
    wt_mask = sub["NCR"] | sub["ED"] | sub["ET"]
    tc_mask = sub["NCR"] | sub["ET"]
    et_mask = sub["ET"]

    return {
        "WT": wt_mask,
        "TC": tc_mask,
        "ET": et_mask,
    }


def compute_volumes(
    label_data: np.ndarray,
    affine: np.ndarray,
    zooms: Tuple[float, ...]
) -> Dict[str, Dict[str, float]]:
    """
    Computes region physical volumes in mL using:
    Volume (mL) = Voxel Count * Voxel Volume (mm^3) / 1000.0.
    Reports composite regions (WT, TC, ET) and mutually exclusive subregions (ED, NCR, ET).
    """
    voxel_vol_mm3 = calculate_voxel_volume_mm3(affine, zooms)
    masks = extract_nested_region_masks(label_data)
    results = {}

    for region_name, mask in masks.items():
        voxel_count = int(np.count_nonzero(mask))
        volume_ml = (voxel_count * voxel_vol_mm3) / 1000.0

        results[region_name] = {
            "voxel_count": voxel_count,
            "voxel_volume_mm3": round(voxel_vol_mm3, 4),
            "spacing_x": float(zooms[0]),
            "spacing_y": float(zooms[1]),
            "spacing_z": float(zooms[2]),
            "volume_ml": round(volume_ml, 4),
        }

    return results


def calculate_dice_and_sensitivity(pred_mask: np.ndarray, gt_mask: np.ndarray) -> Tuple[float, float]:
    """Calculates Dice Similarity Coefficient and Sensitivity."""
    intersection = np.logical_and(pred_mask, gt_mask).sum()
    pred_total = pred_mask.sum()
    gt_total = gt_mask.sum()

    if pred_total + gt_total == 0:
        dice = 1.0
    else:
        dice = (2.0 * intersection) / (pred_total + gt_total)

    if gt_total == 0:
        sensitivity = 1.0 if pred_total == 0 else 0.0
    else:
        sensitivity = intersection / float(gt_total)

    return float(dice), float(sensitivity)


def calculate_hd95_mm(pred_mask: np.ndarray, gt_mask: np.ndarray, spacing: Tuple[float, float, float] = (1.0, 1.0, 1.0)) -> float:
    """
    Calculates 95th percentile Hausdorff Distance (HD95) in physical millimeters,
    accounting for physical voxel spacing (dx, dy, dz).
    """
    if not np.any(pred_mask) and not np.any(gt_mask):
        return 0.0  # Both empty -> perfect agreement
    if not np.any(pred_mask) or not np.any(gt_mask):
        return 100.0  # One empty, one non-empty -> maximum penalty (100 mm)

    # Extract surface boundaries
    pred_border = pred_mask ^ binary_erosion(pred_mask)
    gt_border = gt_mask ^ binary_erosion(gt_mask)

    # Distance transforms in physical mm coordinates
    dt_gt = distance_transform_edt(~gt_border, sampling=spacing)
    dt_pred = distance_transform_edt(~pred_border, sampling=spacing)

    dist_pred_to_gt = dt_gt[pred_border]
    dist_gt_to_pred = dt_pred[gt_border]

    if len(dist_pred_to_gt) == 0 or len(dist_gt_to_pred) == 0:
        return 0.0

    hd95_1 = np.percentile(dist_pred_to_gt, 95)
    hd95_2 = np.percentile(dist_gt_to_pred, 95)

    return float(max(hd95_1, hd95_2))


def evaluate_against_expert_mask(
    pred_label_data: np.ndarray,
    expert_label_data: np.ndarray,
    spacing: Tuple[float, float, float] = (1.0, 1.0, 1.0)
) -> Dict[str, Dict[str, float]]:
    """
    Evaluates predictions against an optional expert mask across WT, TC, and ET regions
    computing Dice, Sensitivity, and HD95 (mm).
    """
    pred_masks = extract_nested_region_masks(pred_label_data)
    expert_masks = extract_nested_region_masks(expert_label_data)
    evaluation = {}

    for region in ["WT", "TC", "ET"]:
        dice, sensitivity = calculate_dice_and_sensitivity(
            pred_masks[region], expert_masks[region]
        )
        hd95_mm = calculate_hd95_mm(
            pred_masks[region], expert_masks[region], spacing=spacing
        )
        evaluation[region] = {
            "dice_score": round(dice, 4),
            "sensitivity": round(sensitivity, 4),
            "hd95_mm": round(hd95_mm, 2)
        }

    return evaluation