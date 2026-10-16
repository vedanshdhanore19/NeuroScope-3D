# NeuroScope 3D

NeuroScope 3D is a research and teaching prototype for brain MRI study validation, tumor-segmentation workflows, region volumetrics, optional comparison with an expert reference mask, and PDF reporting.

> **Important safety notice:** This project is not a medical device and must not be used for diagnosis, treatment planning, or clinical decision-making. Outputs must be independently reviewed by qualified professionals.

## Current repository status

The tracked implementation contains a FastAPI backend with four-sequence NIfTI validation (T1, T1Gd/T1ce, T2, FLAIR), a MONAI SegResNet inference implementation, tumor-region volumetric calculations, optional expert-mask metrics, SQLite-backed records, and PDF report generation.

A frontend is not currently present in the tracked `main` branch.

### Important model limitation

The inference implementation constructs a SegResNet model but does not load a trained checkpoint. Its outputs **must not be treated as valid tumor segmentations**. The report generator currently labels the model as pretrained; that claim must be corrected or backed by verified checkpoint provenance before reports are used.

## Planned milestones

1. **Audit and harden the backend:** correct input-validation issues, verify expert-mask alignment and label conventions, add clear API errors, and add automated tests.
2. **Integrate a verified trained model:** document its source, license, architecture, expected preprocessing, label mapping, and limitations; refuse inference when weights are unavailable.
3. **Build the frontend:** modality upload, validation state, slice viewer, segmentation overlays, volumetric results, and report download.
4. **Add 3D visualization:** render segmentation masks and connect the 3D view to 2D MRI slices.
5. **Validate and document:** test with known cases and reference masks, document reproducible setup, and deploy only after the workflow passes testing.

## Backend setup

From the `backend` directory, create and activate a Python virtual environment, install dependencies, then start the API:

```bash
python -m venv .venv
# Windows PowerShell:
.venv\\Scripts\\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

Run the server from the `backend` directory as shown above. Interactive API documentation is normally available at `/docs` on the local server.

## Data and privacy

MRI data can contain sensitive health information. Use only appropriately authorized, de-identified data for development. Do not commit patient scans, model checkpoints without confirming their license, secrets, database files, or generated reports to version control.
