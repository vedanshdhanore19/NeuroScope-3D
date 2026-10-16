"""Runtime configuration and supported official dataset profiles."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
TEMP_DIR = BASE_DIR / "temp"
DATA_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.getenv("NEUROSCOPE_DATABASE_URL", f"sqlite:///{DATA_DIR / 'neuroscope.db'}")
MAX_FILE_SIZE_BYTES = int(os.getenv("NEUROSCOPE_MAX_FILE_SIZE_BYTES", str(1024 * 1024 * 1024)))
ALLOWED_EXTENSIONS = {".nii", ".nii.gz"}
REQUIRED_MODALITIES = ["t1", "t1gd", "t2", "flair"]

# The organizer's BraTS 2021 development subset follows the official preprocessed
# geometry. Select msd_task01 only when the uploaded cases come from that source
# and its dataset.json has been used to split/order the four channels correctly.
DATASET_PROFILE = os.getenv("NEUROSCOPE_DATASET_PROFILE", "brats2021").strip().lower()
SUPPORTED_DATASET_PROFILES = {"brats2021", "msd_task01"}
BRATS2021_EXPECTED_SHAPE = (240, 240, 155)
EXPECTED_SPACING_MM = (1.0, 1.0, 1.0)
DATASET_SOURCES = {
    "brats2021": "https://www.med.upenn.edu/cbica/brats2021/",
    "msd_task01": "http://medicaldecathlon.com/",
}
MODEL_BUNDLE_SOURCE = "https://github.com/Project-MONAI/model-zoo/tree/dev/models/brats_mri_segmentation"
MODEL_BUNDLE_VERSION = "0.5.4"
MODEL_TRAINING_DATASET = "BraTS 2018"

# Canonical BraTS labels used internally: 0 background, 1 NCR/NET, 2 edema, 4 ET.
LABEL_BACKGROUND = 0
LABEL_NCR = 1
LABEL_ED = 2
LABEL_ET = 4

DISCLAIMER_TEXT = (
    "Research and teaching prototype only. Not for diagnosis or clinical "
    "decision-making. AI predictions may be wrong."
)
