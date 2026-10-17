"""MONAI inference engine for NeuroScope 3D."""
import hashlib
import logging
import os
import random
import threading
import time
from pathlib import Path
from typing import Dict, Optional, Tuple

import nibabel as nib
import numpy as np
import torch
import torch.nn.functional as F
from nibabel.processing import resample_from_to, resample_to_output

from .config import BASE_DIR, LABEL_ED, LABEL_ET, LABEL_NCR

logger = logging.getLogger(__name__)

# Bump whenever inference behaviour changes; exposed via /health so you can confirm which code is running.
ENGINE_VERSION = "3.0-shape-safe"
# SegResNet(blocks_down=[1,2,2,4]) halves the volume 3 times, so every spatial size must be divisible by 8.
# We use 16 for headroom. The "tensor a (38) must match tensor b (37)" crash happens when it is not.
SHAPE_MULTIPLE = 16
# Order of the 4 input channels. The bundled MONAI brats_mri_segmentation v0.5.4 declares (configs/metadata.json
# channel_def): 0=T1c, 1=T1, 2=T2, 3=FLAIR. Override with NEUROSCOPE_CHANNEL_ORDER (comma separated, any order of
# t1,t1gd,t2,flair) only if you use a differently trained checkpoint.
_MODALITY_KEYS = ("t1", "t1gd", "t2", "flair")


def _channel_order() -> Tuple[str, ...]:
    raw = os.getenv("NEUROSCOPE_CHANNEL_ORDER", "t1gd,t1,t2,flair")
    order = tuple(x.strip().lower() for x in raw.split(",") if x.strip())
    if sorted(order) != sorted(_MODALITY_KEYS):
        logger.warning("Invalid NEUROSCOPE_CHANNEL_ORDER=%r; using t1gd,t1,t2,flair", raw)
        order = ("t1gd", "t1", "t2", "flair")
    return order


def _preferred_roi() -> Tuple[int, int, int]:
    """Sliding-window ROI (the bundle's own inference ROI is 240x240x160). Always rounded to SHAPE_MULTIPLE."""
    raw = os.getenv("NEUROSCOPE_ROI", "240,240,160")
    try:
        vals = tuple(int(v) for v in raw.split(","))
        if len(vals) != 3 or min(vals) < SHAPE_MULTIPLE:
            raise ValueError
    except ValueError:
        logger.warning("Invalid NEUROSCOPE_ROI=%r; using 240,240,160", raw)
        vals = (240, 240, 160)
    return tuple(max(SHAPE_MULTIPLE, (v // SHAPE_MULTIPLE) * SHAPE_MULTIPLE) for v in vals)


class ShapeSafeModel(torch.nn.Module):
    """Wrap a U-Net style model so ANY 5D input size works.

    Pads the spatial dims at the end up to a multiple of SHAPE_MULTIPLE, runs the network, then crops the
    output back to the input size. This makes the model itself immune to odd-sized volumes / windows.
    """

    def __init__(self, model: torch.nn.Module, multiple: int = SHAPE_MULTIPLE):
        super().__init__()
        self.model = model
        self.multiple = multiple

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        spatial = tuple(int(d) for d in x.shape[2:])
        pads = [(-d) % self.multiple for d in spatial]
        if any(pads):
            # F.pad takes pads for the LAST dim first: (z_lo, z_hi, y_lo, y_hi, x_lo, x_hi)
            x = F.pad(x, (0, pads[2], 0, pads[1], 0, pads[0]), mode="constant", value=0.0)
        out = self.model(x)
        if any(pads):
            out = out[..., :spatial[0], :spatial[1], :spatial[2]]
        return out


_MODEL_CACHE = None
_MODEL_LOCK = threading.Lock()
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
        "channel_order": list(_channel_order()),
        "engine_version": ENGINE_VERSION,
        "inference_module": str(Path(__file__).resolve()),
        "output_channels": 3,
        "output_classes": ["TC (Tumor Core)", "WT (Whole Tumor)", "ET (Enhancing Tumor)"],
    }


def load_monai_model(force_reload: bool = False):
    """Load the verified BraTS SegResNet checkpoint once, failing closed on mismatch."""
    global _MODEL_CACHE
    with _MODEL_LOCK:
        if _MODEL_CACHE is not None and not force_reload:
            return _MODEL_CACHE
        checkpoint_path = resolve_model_checkpoint_path()
        if checkpoint_path is None or not checkpoint_path.is_file():
            raise RuntimeError(
                "Trained model weights are not available. Configure NEUROSCOPE_MODEL_WEIGHTS "
                "to a verified compatible checkpoint. No prediction was generated."
            )
        try:
            from monai.networks.nets import SegResNet
            model = SegResNet(
                spatial_dims=3, in_channels=4, out_channels=3,
                init_filters=16, blocks_down=[1, 2, 2, 4],
                blocks_up=[1, 1, 1], dropout_prob=0.2,
            ).to(_DEVICE)
            # The bundled MONAI checkpoint is a raw state_dict; support wrapped checkpoints too.
            try:
                checkpoint = torch.load(str(checkpoint_path), map_location=_DEVICE, weights_only=True)
            except TypeError:  # PyTorch < 1.13 has no weights_only
                checkpoint = torch.load(str(checkpoint_path), map_location=_DEVICE)
            except Exception:  # wrapped checkpoints that contain non-tensor objects
                logger.warning("weights_only load failed for %s; retrying with full unpickler (trusted local file)", checkpoint_path)
                checkpoint = torch.load(str(checkpoint_path), map_location=_DEVICE, weights_only=False)
            if isinstance(checkpoint, dict) and "state_dict" in checkpoint:
                state_dict = checkpoint["state_dict"]
            elif isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                state_dict = checkpoint["model_state_dict"]
            elif isinstance(checkpoint, dict) and "model" in checkpoint and isinstance(checkpoint["model"], dict):
                state_dict = checkpoint["model"]
            else:
                state_dict = checkpoint
            if not isinstance(state_dict, dict):
                raise ValueError("Checkpoint does not contain a state dictionary.")
            state_dict = {key.removeprefix("module."): value for key, value in state_dict.items()}
            model.load_state_dict(state_dict, strict=True)
            model.eval()
            model = ShapeSafeModel(model).to(_DEVICE).eval()
            _MODEL_CACHE = model
            logger.info("Loaded BraTS SegResNet checkpoint %s on %s", checkpoint_path, _DEVICE)
            return model
        except Exception as exc:
            logger.exception("Failed to load BraTS SegResNet checkpoint %s", checkpoint_path)
            raise RuntimeError(
                "The configured model checkpoint is incompatible or could not be loaded. "
                "Verify the MONAI SegResNet architecture and checkpoint file."
            ) from exc


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


def _foreground_crop(data: np.ndarray, margin: int = 8) -> Tuple[Tuple[slice, slice, slice], np.ndarray]:
    """Find a conservative foreground bounding box to avoid running the model on zero background."""
    positive = data > 0
    coords = np.argwhere(positive)
    if coords.size == 0:
        return (slice(0, data.shape[0]), slice(0, data.shape[1]), slice(0, data.shape[2])), np.zeros(3, dtype=int)
    lo = np.maximum(coords.min(axis=0) - margin, 0)
    hi = np.minimum(coords.max(axis=0) + margin + 1, np.asarray(data.shape))
    slices = tuple(slice(int(lo[i]), int(hi[i])) for i in range(3))
    return slices, lo.astype(int)


def _validate_input_arrays(data_arrays: Dict[str, np.ndarray]) -> None:
    required = ("t1", "t1gd", "t2", "flair")
    missing = [name for name in required if name not in data_arrays]
    if missing:
        raise ValueError("Missing required MRI modality/modality files: " + ", ".join(missing))
    ref_shape = data_arrays["t1"].shape
    if len(ref_shape) != 3 or any(int(d) <= 0 for d in ref_shape):
        raise ValueError("Each MRI modality must be a non-empty 3D volume.")
    for name in required:
        arr = np.asarray(data_arrays[name])
        if arr.shape != ref_shape:
            raise ValueError(f"{name.upper()} image shape {arr.shape} does not match T1 shape {ref_shape}.")
        if not np.issubdtype(arr.dtype, np.number):
            raise ValueError(f"{name.upper()} image must contain numeric voxel data.")
        if not np.isfinite(arr).all():
            raise ValueError(f"{name.upper()} image contains NaN or infinite voxel values.")


def _is_oom(exc: BaseException) -> bool:
    cuda_oom = getattr(torch.cuda, "OutOfMemoryError", None)
    if cuda_oom is not None and isinstance(exc, cuda_oom):
        return True
    if isinstance(exc, MemoryError):
        return True
    msg = str(exc).lower()
    return isinstance(exc, RuntimeError) and ("out of memory" in msg or "not enough memory" in msg or "defaultcpuallocator" in msg)


def _pad_and_predict(input_tensor: torch.Tensor, model, device: torch.device = None) -> torch.Tensor:
    """Predict a [1,4,X,Y,Z] tensor; works for ANY spatial size.

    1. Pad the volume (end-padding, origin preserved) to multiples of 16.
    2. Sliding-window inference with ROI dims that are multiples of 16 (and never larger than the volume).
    3. Every window is additionally padded/cropped inside ShapeSafeModel, so odd sizes cannot reach the network.
    4. Crop the logits back to the exact input size.
    Retries with a smaller ROI on out-of-memory (CUDA falls back to CPU first).
    """
    from monai.inferers import sliding_window_inference

    device = device or _DEVICE
    if input_tensor.ndim != 5 or input_tensor.shape[0] != 1 or input_tensor.shape[1] != 4:
        raise ValueError("Inference tensor must have shape [1, 4, X, Y, Z].")
    original_shape = tuple(int(d) for d in input_tensor.shape[2:])
    if any(d <= 0 for d in original_shape):
        raise ValueError("MRI volume dimensions must be positive.")

    input_tensor = torch.as_tensor(input_tensor)  # drop any MetaTensor subclass overhead
    pads = [(-d) % SHAPE_MULTIPLE for d in original_shape]
    padded = F.pad(input_tensor.float(), (0, pads[2], 0, pads[1], 0, pads[0]), mode="constant", value=0.0).contiguous()
    padded_shape = tuple(int(d) for d in padded.shape[2:])
    predictor = model if isinstance(model, ShapeSafeModel) else ShapeSafeModel(model)

    preferred = _preferred_roi()
    roi_ladder = [preferred, (160, 160, 160), (128, 128, 128), (96, 96, 96)]
    attempts = []
    for roi in roi_ladder:
        r = tuple(min(int(a), int(b)) for a, b in zip(roi, padded_shape))
        if r not in attempts:
            attempts.append(r)

    def run(roi_size, run_device):
        predictor.to(run_device)
        inputs = padded.to(run_device)
        with torch.inference_mode():
            if run_device.type == "cuda":
                with torch.autocast(device_type="cuda", dtype=torch.float16):
                    return sliding_window_inference(inputs=inputs, roi_size=roi_size, sw_batch_size=1,
                                                    predictor=predictor, overlap=0.5, mode="gaussian").float().cpu()
            return sliding_window_inference(inputs=inputs, roi_size=roi_size, sw_batch_size=1,
                                            predictor=predictor, overlap=0.5, mode="gaussian").float().cpu()

    run_device = device
    last_exc: Optional[BaseException] = None
    logits = None
    for roi_size in attempts:
        logger.info("SegResNet input_shape=%s padded_shape=%s roi=%s device=%s", original_shape, padded_shape, roi_size, run_device)
        try:
            logits = run(roi_size, run_device)
            break
        except Exception as exc:
            if not _is_oom(exc):
                raise
            last_exc = exc
            logger.warning("Out of memory with roi=%s on %s; retrying with a smaller setting", roi_size, run_device)
            if run_device.type == "cuda":
                torch.cuda.empty_cache()
                run_device = torch.device("cpu")  # first fallback: same ROI on CPU
                try:
                    logits = run(roi_size, run_device)
                    break
                except Exception as exc2:
                    if not _is_oom(exc2):
                        raise
                    last_exc = exc2
    if logits is None:
        raise RuntimeError("Segmentation ran out of memory even with the smallest window size.") from last_exc
    if run_device != device:
        predictor.to(device)  # restore for the next request

    logits = logits[..., :original_shape[0], :original_shape[1], :original_shape[2]]
    if tuple(logits.shape[2:]) != original_shape:
        raise RuntimeError(f"Internal crop error: predicted {tuple(logits.shape[2:])}, expected {original_shape}.")
    return logits


def run_inference(file_paths: Dict[str, str], output_save_path: str) -> Tuple[np.ndarray, float]:
    """Run MONAI BraTS inference with RAS/1 mm preprocessing and shape-safe padded sliding windows."""
    start_time = time.time()
    _set_deterministic()
    required = _MODALITY_KEYS
    missing = [key for key in required if key not in file_paths or not file_paths[key] or not Path(file_paths[key]).is_file()]
    if missing:
        raise ValueError("Missing required MRI modality file(s): " + ", ".join(missing))
    logger.info("NeuroScope inference engine %s (%s)", ENGINE_VERSION, Path(__file__).resolve())
    model = load_monai_model()
    try:
        images = {key: nib.load(file_paths[key]) for key in required}
        ref_img = images["t1"]
        ref_shape = ref_img.shape[:3]
        for key, img in images.items():
            if len(img.shape) != 3:
                raise ValueError(f"{key.upper()} image must be a 3D NIfTI volume.")
            if img.shape[:3] != ref_shape or not np.allclose(img.affine, ref_img.affine, atol=1e-3):
                raise ValueError(f"{key.upper()} image does not match T1 dimensions/affine.")

        preprocessed = _canonical_one_mm_images(images)
        data_arrays = {key: image.get_fdata(dtype=np.float32) for key, image in preprocessed.items()}
        _validate_input_arrays(data_arrays)
        # Match MONAI NormalizeIntensity(nonzero=True, channel_wise=True) independently per modality.
        for data in data_arrays.values():
            nonzero = data != 0
            if np.any(nonzero):
                values = data[nonzero]
                data[nonzero] = (values - float(values.mean())) / max(float(values.std()), 1e-8)

        order = _channel_order()
        input_tensor = torch.from_numpy(np.stack([data_arrays[key] for key in order], axis=0)).unsqueeze(0)
        logger.info("Starting segmentation original_shape=%s canonical_shape=%s channel_order=%s device=%s",
                    ref_shape, tuple(input_tensor.shape[2:]), order, _DEVICE)
        try:
            logits = _pad_and_predict(input_tensor, model, _DEVICE)
        except Exception:
            logger.exception("Segmentation inference failed for input shape %s", tuple(input_tensor.shape[2:]))
            raise
        probs = torch.sigmoid(logits).float().squeeze(0).cpu().numpy()
        # Bundle output channel order is [TC, WT, ET]. Enforce nested BraTS masks.
        canonical_labels = convert_nested_masks_to_brats_codes(
            tc_mask=probs[0] > 0.5, wt_mask=probs[1] > 0.5, et_mask=probs[2] > 0.5,
        )
        if canonical_labels.shape != preprocessed["t1"].shape[:3]:
            raise RuntimeError("Prediction shape does not match the preprocessed MRI grid.")
        pred_label_map = _restore_prediction_to_original_grid(canonical_labels, preprocessed["t1"].affine, ref_img)
        if pred_label_map.shape != ref_shape:
            raise RuntimeError(f"Restored prediction shape {pred_label_map.shape} does not match original shape {ref_shape}.")

        output_header = ref_img.header.copy()
        output_header.set_data_dtype(np.int16)
        nib.save(nib.Nifti1Image(pred_label_map, affine=ref_img.affine, header=output_header), output_save_path)
        elapsed = round(time.time() - start_time, 2)
        logger.info("Segmentation complete input_shape=%s output_shape=%s device=%s elapsed=%.2fs",
                    ref_shape, pred_label_map.shape, _DEVICE, elapsed)
        return pred_label_map, elapsed
    finally:
        if _DEVICE.type == "cuda":
            torch.cuda.empty_cache()
