"""MONAI inference engine for NeuroScope 3D."""
import hashlib
import os
import random
import time
from pathlib import Path
from typing import Dict, Optional, Tuple

import nibabel as nib
import numpy as np
import torch
from nibabel.processing import resample_from_to, resample_to_output

from .config import BASE_DIR, LABEL_ED, LABEL_ET, LABEL_NCR

_MODEL_CACHE = None
_DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
DEFAULT_BUNDLE_WEIGHTS = BASE_DIR / "app" / "models" / "brats_mri_segmentation" / "brats_mri_segmentation" / "models" / "model.pt"


def _set_deterministic() -> None:
    """Configure reproducibility when explicitly requested; fast inference is the default."""
    seed = int(os.getenv("NEUROSCOPE_SEED", "0"))
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    if os.getenv("NEUROSCOPE_DETERMINISTIC", "0") == "1":
        torch.use_deterministic_algorithms(True, warn_only=True)
        if hasattr(torch.backends, "cudnn"):
            torch.backends.cudnn.deterministic = True
            torch.backends.cudnn.benchmark = False
    elif hasattr(torch.backends, "cudnn"):
        torch.backends.cudnn.benchmark = True


def resolve_model_checkpoint_path() -> Optional[Path]:
    env_path = os.getenv("NEUROSCOPE_MODEL_WEIGHTS", "").strip()
    if env_path:
        p = Path(env_path).expanduser()
        if p.is_file():
            return p
    if DEFAULT_BUNDLE_WEIGHTS.is_file():
        return DEFAULT_BUNDLE_WEIGHTS
    return None


def get_model_status() -> Dict[str, object]:
    resolved = resolve_model_checkpoint_path()
    file_exists = resolved is not None and resolved.is_file()
    sha256 = None
    if file_exists:
        try:
            h = hashlib.sha256()
            with open(resolved, "rb") as f:
                for chunk in iter(lambda: f.read(1024 * 1024), b""):
                    h.update(chunk)
            sha256 = h.hexdigest()
        except Exception:
            sha256 = "unreadable"
    configured_path = os.getenv("NEUROSCOPE_MODEL_WEIGHTS", "").strip()
    return {
        "service_online": True,
        "model_configured": bool(configured_path or (resolved and resolved.is_file())),
        "checkpoint_path": str(resolved) if resolved else (configured_path or None),
        "checkpoint_exists": file_exists,
        "checkpoint_sha256": sha256,
        "model_loaded": _MODEL_CACHE is not None,
        "ready_for_inference": file_exists,
        "bundle_name": "brats_mri_segmentation",
        "bundle_version": "0.5.4",
        "architecture": "SegResNet",
        "device": str(_DEVICE),
        "input_channels": 4,
        "channel_order": ["t1gd (T1c)", "t1", "t2", "flair"],
        "output_channels": 3,
        "output_classes": ["TC (Tumor Core)", "WT (Whole Tumor)", "ET (Enhancing Tumor)"],
    }


def load_monai_model(force_reload: bool = False):
    global _MODEL_CACHE
    if _MODEL_CACHE is not None and not force_reload:
        return _MODEL_CACHE
    checkpoint_path = resolve_model_checkpoint_path()
    if checkpoint_path is None or not checkpoint_path.is_file():
        raise RuntimeError("Trained model weights are not available. Set NEUROSCOPE_MODEL_WEIGHTS to a verified compatible checkpoint or ensure the official MONAI bundle model.pt is present. No prediction was generated.")
    try:
        from monai.networks.nets import SegResNet
        model = SegResNet(spatial_dims=3, in_channels=4, out_channels=3, init_filters=16, blocks_down=[1, 2, 2, 4], blocks_up=[1, 1, 1], dropout_prob=0.2).to(_DEVICE)
        checkpoint = torch.load(str(checkpoint_path), map_location=_DEVICE)
        if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
            state_dict = checkpoint["state_dict"]
        elif isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            state_dict = checkpoint["model_state_dict"]
        else:
            state_dict = checkpoint
        if not isinstance(state_dict, dict):
            raise ValueError("Checkpoint does not contain a state dictionary.")
        state_dict = {key.removeprefix("module."): value for key, value in state_dict.items()}
        model.load_state_dict(state_dict, strict=True)
        model.eval()
        _MODEL_CACHE = model
        return model
    except Exception as exc:
        raise RuntimeError(f"Could not load the configured checkpoint into the SegResNet architecture. Confirm its architecture and label conventions. Details: {exc}") from exc


def convert_nested_masks_to_brats_codes(tc_mask: np.ndarray, wt_mask: np.ndarray, et_mask: np.ndarray) -> np.ndarray:
    wt_mask = np.asarray(wt_mask, dtype=bool)
    tc_mask = np.asarray(tc_mask, dtype=bool) & wt_mask
    et_mask = np.asarray(et_mask, dtype=bool) & tc_mask
    brats_map = np.zeros(wt_mask.shape, dtype=np.int16)
    brats_map[wt_mask & ~tc_mask] = LABEL_ED
    brats_map[tc_mask & ~et_mask] = LABEL_NCR
    brats_map[et_mask] = LABEL_ET
    return brats_map


def _canonical_one_mm_images(images: Dict[str, nib.Nifti1Image]) -> Dict[str, nib.Nifti1Image]:
    canonical = {key: nib.as_closest_canonical(img) for key, img in images.items()}
    reference = resample_to_output(canonical["t1"], voxel_sizes=(1.0, 1.0, 1.0), order=3)
    result = {"t1": reference}
    for key, image in canonical.items():
        if key != "t1":
            result[key] = resample_from_to(image, reference, order=3)
    return result


def _restore_prediction_to_original_grid(canonical_prediction: np.ndarray, canonical_affine: np.ndarray, reference_img: nib.Nifti1Image) -> np.ndarray:
    prediction_img = nib.Nifti1Image(canonical_prediction.astype(np.int16), canonical_affine)
    restored = resample_from_to(prediction_img, (reference_img.shape[:3], reference_img.affine), order=0)
    return np.rint(restored.get_fdata(dtype=np.float32)).astype(np.int16)


def run_inference(file_paths: Dict[str, str], output_save_path: str) -> Tuple[np.ndarray, float]:
    """Run SegResNet with low-overlap sliding windows and mixed precision on CUDA."""
    start_time = time.time()
    _set_deterministic()
    model = load_monai_model()
    images = {key: nib.load(file_paths[key]) for key in ("t1gd", "t1", "t2", "flair")}
    ref_img = images["t1"]
    ref_shape = ref_img.shape[:3]
    for key, img in images.items():
        if img.shape[:3] != ref_shape or not np.allclose(img.affine, ref_img.affine, atol=1e-3):
            raise ValueError(f"{key.upper()} image does not match T1 dimensions/affine.")

    preprocessed = _canonical_one_mm_images(images)
    data_arrays = {key: image.get_fdata(dtype=np.float32) for key, image in preprocessed.items()}
    for data in data_arrays.values():
        mask = data > 0
        if np.any(mask):
            mean = float(np.mean(data[mask]))
            std = float(np.std(data[mask]))
            data[mask] = (data[mask] - mean) / (std + 1e-8)

    input_tensor = torch.from_numpy(np.stack([data_arrays[key] for key in ("t1gd", "t1", "t2", "flair")], axis=0)).unsqueeze(0).to(_DEVICE)
    from monai.inferers import sliding_window_inference

    spatial_shape = tuple(int(x) for x in input_tensor.shape[2:])
    # A full-volume window avoids the large amount of overlap that made the previous
    # 0.5-overlap configuration slow on CPU. Fall back to a bounded window for very
    # large studies to avoid excessive memory use.
    max_voxels = 240 * 240 * 192
    if int(np.prod(spatial_shape)) <= max_voxels:
        roi_size = spatial_shape
        overlap = 0.0
    else:
        roi_size = tuple(min(192, int(d)) for d in spatial_shape)
        roi_size = tuple(max(16, (d // 8) * 8) for d in roi_size)
        overlap = 0.25

    use_amp = _DEVICE.type == "cuda"
    with torch.inference_mode():
        if use_amp:
            with torch.autocast(device_type="cuda", dtype=torch.float16):
                output_logits = sliding_window_inference(inputs=input_tensor, roi_size=roi_size, sw_batch_size=1, predictor=model, overlap=overlap)
        else:
            output_logits = sliding_window_inference(inputs=input_tensor, roi_size=roi_size, sw_batch_size=1, predictor=model, overlap=overlap)
        probs = torch.sigmoid(output_logits).float().squeeze(0).cpu().numpy()

    canonical_labels = convert_nested_masks_to_brats_codes(probs[0] > 0.5, probs[1] > 0.5, probs[2] > 0.5)
    pred_label_map = _restore_prediction_to_original_grid(canonical_labels, preprocessed["t1"].affine, ref_img)
    output_header = ref_img.header.copy()
    output_header.set_data_dtype(np.int16)
    nib.save(nib.Nifti1Image(pred_label_map, affine=ref_img.affine, header=output_header), output_save_path)
    return pred_label_map, round(time.time() - start_time, 2)
