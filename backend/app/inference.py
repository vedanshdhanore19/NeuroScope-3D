"""MONAI inference engine for NeuroScope 3D.

Inference is disabled unless a trained checkpoint is explicitly configured.
A randomly initialized network must never be presented as a tumor segmentation.
"""
import os
import time
from pathlib import Path
from typing import Dict, Tuple

import nibabel as nib
import numpy as np
import torch

from .config import LABEL_ED, LABEL_ET, LABEL_NCR

_MODEL_CACHE = None
_DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
MODEL_WEIGHTS_PATH = os.getenv("NEUROSCOPE_MODEL_WEIGHTS", "").strip()


def load_monai_model():
    """Load SegResNet weights from NEUROSCOPE_MODEL_WEIGHTS or fail safely."""
    global _MODEL_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE

    if not MODEL_WEIGHTS_PATH:
        raise RuntimeError(
            "Trained model weights are not configured. Set NEUROSCOPE_MODEL_WEIGHTS "
            "to a verified compatible checkpoint before running segmentation. "
            "No prediction was generated."
        )

    checkpoint_path = Path(MODEL_WEIGHTS_PATH).expanduser()
    if not checkpoint_path.is_file():
        raise RuntimeError(
            f"Configured model checkpoint does not exist: {checkpoint_path}. "
            "No prediction was generated."
        )

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

        checkpoint = torch.load(str(checkpoint_path), map_location=_DEVICE)
        if isinstance(checkpoint, dict):
            # MONAI bundle checkpoints commonly wrap weights under "model".
            state_dict = next(
                (checkpoint[key] for key in ("state_dict", "model_state_dict", "model", "network")
                 if key in checkpoint and isinstance(checkpoint[key], dict)),
                checkpoint,
            )
        else:
            state_dict = checkpoint

        if not isinstance(state_dict, dict):
            raise ValueError("Checkpoint does not contain a state dictionary.")

        # Support checkpoints saved from a wrapped model (e.g. DataParallel).
        state_dict = {
            key.removeprefix("module."): value
            for key, value in state_dict.items()
        }
        model.load_state_dict(state_dict, strict=True)
        model.eval()
        _MODEL_CACHE = model
        return model
    except Exception as exc:
        raise RuntimeError(
            "Could not load the configured checkpoint into the expected SegResNet "
            f"architecture. Confirm its architecture and label conventions. Details: {exc}"
        ) from exc


def convert_nested_masks_to_brats_codes(
    tc_mask: np.ndarray, wt_mask: np.ndarray, et_mask: np.ndarray
) -> np.ndarray:
    """Convert TC, WT, ET masks into BraTS-style labels 1, 2, and 4."""
    # Enforce the expected nesting so overlapping threshold outputs are resolved
    # consistently: ET is a subset of TC, which is a subset of WT.
    wt_mask = np.asarray(wt_mask, dtype=bool)
    tc_mask = np.asarray(tc_mask, dtype=bool) & wt_mask
    et_mask = np.asarray(et_mask, dtype=bool) & tc_mask

    brats_map = np.zeros(wt_mask.shape, dtype=np.int16)
    brats_map[wt_mask & ~tc_mask] = LABEL_ED
    brats_map[tc_mask & ~et_mask] = LABEL_NCR
    brats_map[et_mask] = LABEL_ET
    return brats_map


def run_inference(file_paths: Dict[str, str], output_save_path: str) -> Tuple[np.ndarray, float]:
    """Run inference only with a successfully loaded trained checkpoint."""
    start_time = time.time()
    # Fail before loading large MRI volumes if model weights are not configured.
    model = load_monai_model()

    images = {key: nib.load(file_paths[key]) for key in ("t1gd", "t1", "t2", "flair")}
    ref_img = images["t1"]
    ref_zooms = tuple(float(value) for value in ref_img.header.get_zooms()[:3])
    if not np.allclose(ref_zooms, (1.0, 1.0, 1.0), atol=1e-2):
        raise ValueError(
            "MONAI bundle expects 1 mm isotropic inputs; received "
            f"{ref_zooms}. Resampling is not performed automatically."
        )
    ref_shape = ref_img.shape
    for key, img in images.items():
        if img.shape != ref_shape or not np.allclose(img.affine, ref_img.affine, atol=1e-3):
            raise ValueError(f"{key.upper()} image does not match T1 dimensions/affine.")

    data_arrays = {
        key: img.get_fdata(dtype=np.float32)
        for key, img in images.items()
    }
    for data in data_arrays.values():
        mask = data > 0
        if np.any(mask):
            mean = np.mean(data[mask])
            std = np.std(data[mask])
            data[mask] = (data[mask] - mean) / (std + 1e-8)

    input_tensor = np.stack(
        [data_arrays[key] for key in ("t1gd", "t1", "t2", "flair")], axis=0
    )
    input_tensor = torch.from_numpy(input_tensor).unsqueeze(0).to(_DEVICE)

    from monai.inferers import sliding_window_inference

    with torch.no_grad():
        output_logits = sliding_window_inference(
            inputs=input_tensor,
            roi_size=(240, 240, 160),
            sw_batch_size=1,
            predictor=model,
            overlap=0.5,
        )
        probs = torch.sigmoid(output_logits).squeeze(0).cpu().numpy()

    if probs.ndim != 4 or probs.shape[0] != 3:
        raise RuntimeError(
            "Expected MONAI bundle output with 3 segmentation channels; received "
            + str(probs.shape)
        )
    if tuple(probs.shape[1:]) != tuple(ref_img.shape):
        raise RuntimeError(
            "Prediction shape " + str(probs.shape[1:])
            + " does not match input shape " + str(ref_img.shape)
        )

    tc_mask = probs[0] > 0.5
    wt_mask = probs[1] > 0.5
    et_mask = probs[2] > 0.5
    pred_label_map = convert_nested_masks_to_brats_codes(tc_mask, wt_mask, et_mask)

    output_nifti = nib.Nifti1Image(pred_label_map, affine=ref_img.affine, header=ref_img.header)
    nib.save(output_nifti, output_save_path)

    return pred_label_map, round(time.time() - start_time, 2)
