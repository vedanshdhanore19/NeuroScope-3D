"""
Dataset profile and normalization definitions for NeuroScope 3D.

Supports:
1. 'brats': Multi-file BraTS standard (separate 3D files: t1, t1gd, t2, flair; labels: 0, 1, 2, 4).
2. 'msd_task01': Medical Segmentation Decathlon Task01 BrainTumour (single 4D file [X, Y, Z, 4];
   channels: 0=FLAIR, 1=T1, 2=T1gd, 3=T2; labels: 0=bg, 1=edema, 2=non-enhancing, 3=enhancing).
"""
import json
from pathlib import Path
from typing import Dict, Optional, Tuple

import nibabel as nib
import numpy as np

from .config import LABEL_BACKGROUND, LABEL_ED, LABEL_ET, LABEL_NCR

# MSD Task01 -> BraTS label translation map:
# MSD 0 (background) -> BraTS 0 (background)
# MSD 1 (edema) -> BraTS 2 (edema)
# MSD 2 (non-enhancing/necrotic) -> BraTS 1 (NCR)
# MSD 3 (enhancing) -> BraTS 4 (ET)
MSD_TO_BRATS_LABEL_MAP: Dict[int, int] = {
    0: LABEL_BACKGROUND,
    1: LABEL_ED,
    2: LABEL_NCR,
    3: LABEL_ET,
}

BRATS_ALLOWED_LABELS = {LABEL_BACKGROUND, LABEL_NCR, LABEL_ED, LABEL_ET}


def convert_msd_labels_to_brats(msd_label_data: np.ndarray) -> np.ndarray:
    """Translate MSD Task01 labels (0, 1, 2, 3) to standard BraTS labels (0, 1, 2, 4)."""
    msd_label_data = np.asarray(msd_label_data, dtype=np.int16)
    unique_vals = set(np.unique(msd_label_data))
    invalid = unique_vals - set(MSD_TO_BRATS_LABEL_MAP.keys())
    if invalid:
        raise ValueError(f"MSD mask contains unexpected labels: {sorted(list(invalid))}")

    brats_label_data = np.zeros_like(msd_label_data, dtype=np.int16)
    for msd_code, brats_code in MSD_TO_BRATS_LABEL_MAP.items():
        if msd_code != 0:
            brats_label_data[msd_label_data == msd_code] = brats_code

    return brats_label_data


def unpack_msd_4d_volume(
    msd_4d_path: str,
    output_dir: Path,
) -> Dict[str, str]:
    """
    Split an MSD 4D NIfTI file (shape [X, Y, Z, 4]) into four separate 3D volumes.
    MSD channel order is 0: FLAIR, 1: T1, 2: T1gd, 3: T2.
    Saves and returns paths for {'flair', 't1', 't1gd', 't2'}.
    """
    img_4d = nib.load(msd_4d_path)
    data_4d = img_4d.get_fdata(dtype=np.float32)

    if data_4d.ndim != 4 or data_4d.shape[3] != 4:
        raise ValueError(
            f"Expected a 4D volume with 4 channels, got shape {data_4d.shape}."
        )

    affine = img_4d.affine
    header_3d = img_4d.header.copy()
    header_3d.set_data_shape(data_4d.shape[:3])

    msd_channel_keys = {
        0: "flair",
        1: "t1",
        2: "t1gd",
        3: "t2",
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    extracted_paths = {}

    for ch_idx, key in msd_channel_keys.items():
        vol_3d = data_4d[..., ch_idx]
        out_nii = nib.Nifti1Image(vol_3d, affine=affine, header=header_3d)
        target_path = output_dir / f"{key}.nii.gz"
        nib.save(out_nii, str(target_path))
        extracted_paths[key] = str(target_path)

    return extracted_paths


def parse_msd_dataset_json(dataset_json_path: str) -> Dict[str, object]:
    """Parse and validate Medical Segmentation Decathlon dataset.json metadata."""
    p = Path(dataset_json_path)
    if not p.is_file():
        raise FileNotFoundError(f"dataset.json not found at: {dataset_json_path}")

    with open(p, "r", encoding="utf-8") as f:
        meta = json.load(f)

    expected_keys = ["name", "description", "modality", "labels"]
    missing = [k for k in expected_keys if k not in meta]
    if missing:
        raise ValueError(f"Malformed dataset.json: missing fields {missing}")

    return {
        "name": meta.get("name"),
        "description": meta.get("description"),
        "modality": meta.get("modality"),
        "labels": meta.get("labels"),
        "numTraining": meta.get("numTraining", len(meta.get("training", []))),
        "numTest": meta.get("numTest", len(meta.get("test", []))),
        "licence": meta.get("licence", "CC-BY-SA 4.0"),
    }
