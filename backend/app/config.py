import os
from pathlib import Path

# Base Directory Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("NEUROSCOPE_DATA_DIR", str(BASE_DIR / "data")))
TEMP_DIR = Path(os.getenv("NEUROSCOPE_TEMP_DIR", str(BASE_DIR / "temp")))

# Ensure required runtime directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Database Configuration
DATABASE_URL = f"sqlite:///{DATA_DIR / 'neuroscope.db'}"

# Challenge & Validation Limits
MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_FILE_SIZE_BYTES", str(1024 * 1024 * 1024)))  # default 1 GB
ALLOWED_EXTENSIONS = {".nii", ".nii.gz"}

# Required Modalities
REQUIRED_MODALITIES = ["t1", "t1gd", "t2", "flair"]

# BraTS 2021 Component Labels
LABEL_BACKGROUND = 0
LABEL_NCR = 1  # Necrotic & non-enhancing core
LABEL_ED = 2   # Peritumoral edema
LABEL_ET = 4   # Enhancing tumor

# Legal Disclaimer
DISCLAIMER_TEXT = (
    "Research and teaching prototype only. Not for diagnosis or clinical "
    "decision-making. AI predictions may be wrong."
)