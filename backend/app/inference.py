"""
MONAI Model Inference Engine for NeuroScope 3D.
Runs SegResNet inference on T1Gd, T1, T2, FLAIR modalities and remaps outputs to BraTS codes.
"""

import time
from typing import Dict, Tuple
import nibabel as nib
import numpy as np
import torch

from .config import LABEL_ED, LABEL_ET, LABEL_NCR

_MODEL_CACHE = None
_DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


def load_monai_model():
    """Loads MONAI SegResNet pretrained model bundle."""
    global _MODEL_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE

    try:
        from monai.networks.nets import SegResNet
        model = SegResNet(
            spatial_dims=3,
            in_channels=4,
            out_channels=3,
            init_filters=16,
            blocks_down=[1, 2, 2, 4],
            blocks_up=[1, 1, 1],
        ).to(_DEVICE)

        model.eval()
        _MODEL_CACHE = model
        return model
    except Exception as exc:
        raise RuntimeError(f"Failed to initialize MONAI SegResNet model: {str(exc)}")


def convert_nested_masks_to_brats_codes(tc_mask: np.ndarray, wt_mask: np.ndarray, et_mask: np.ndarray) -> np.ndarray:
    """Converts MONAI nested outputs (TC, WT, ET) into BraTS 2021 codes (1, 2, 4)."""
    brats_map = np.zeros(wt_mask.shape, dtype=np.int16)

    ncr_mask = np.logical_and(tc_mask, np.logical_not(et_mask))
    ed_mask = np.logical_and(wt_mask, np.logical_not(tc_mask))

    brats_map[ed_mask] = LABEL_ED    # 2
    brats_map[ncr_mask] = LABEL_NCR  # 1
    brats_map[et_mask] = LABEL_ET    # 4

    return brats_map


def run_inference(file_paths: Dict[str, str], output_save_path: str) -> Tuple[np.ndarray, float]:
    """Executes end-to-end model inference."""
    start_time = time.time()

    t1gd_img = nib.load(file_paths["t1gd"])
    t1_img = nib.load(file_paths["t1"])
    t2_img = nib.load(file_paths["t2"])
    flair_img = nib.load(file_paths["flair"])

    ref_affine = t1_img.affine
    ref_header = t1_img.header

    t1gd_data = t1gd_img.get_fdata(dtype=np.float32)
    t1_data = t1_img.get_fdata(dtype=np.float32)
    t2_data = t2_img.get_fdata(dtype=np.float32)
    flair_data = flair_img.get_fdata(dtype=np.float32)

    for data_arr in [t1gd_data, t1_data, t2_data, flair_data]:
        mask = data_arr > 0
        if np.any(mask):
            mean = np.mean(data_arr[mask])
            std = np.std(data_arr[mask])
            data_arr[mask] = (data_arr[mask] - mean) / (std + 1e-8)

    input_tensor = np.stack([t1gd_data, t1_data, t2_data, flair_data], axis=0)
    input_tensor = torch.from_numpy(input_tensor).unsqueeze(0).to(_DEVICE)

    model = load_monai_model()
    from monai.inferers import sliding_window_inference

    with torch.no_grad():
        output_logits = sliding_window_inference(
            inputs=input_tensor,
            roi_size=(128, 128, 128),
            sw_batch_size=2,
            predictor=model,
            overlap=0.5
        )
        probs = torch.sigmoid(output_logits).squeeze(0).cpu().numpy()

    tc_mask = probs[0] > 0.5
    wt_mask = probs[1] > 0.5
    et_mask = probs[2] > 0.5

    pred_label_map = convert_nested_masks_to_brats_codes(tc_mask, wt_mask, et_mask)

    output_nifti = nib.Nifti1Image(pred_label_map, affine=ref_affine, header=ref_header)
    nib.save(output_nifti, output_save_path)

    elapsed_time = round(time.time() - start_time, 2)
    return pred_label_map, elapsed_time