# NeuroScope 3D

NeuroScope 3D is a research/education prototype for validating multimodal brain MRI, running tumor-subregion segmentation with a configured MONAI checkpoint, calculating physical volumes, optionally evaluating against an expert reference mask, and generating a provenance-oriented PDF report.

> **Safety:** Not a medical device. Not for diagnosis, treatment planning, or clinical decision-making. Outputs require independent expert review.

## Official data sources and roles

| Resource | Role in this project | Important limitation |
|---|---|---|
| [BraTS 2021](https://www.med.upenn.edu/cbica/brats2021/) | Primary challenge dataset and organizer-provided 40-case development subset, if this is the subset issued to your team | Access terms and case identifiers must be retained; do not redistribute restricted data |
| [Medical Segmentation Decathlon — Task01 BrainTumour](http://medicaldecathlon.com/) | Optional, separate dataset profile for cases explicitly sourced from MSD | Label encoding differs and must be mapped using the selected profile |
| [MONAI Model Zoo — brats_mri_segmentation](https://github.com/Project-MONAI/model-zoo/tree/dev/models/brats_mri_segmentation) | Pretrained segmentation bundle/checkpoint source | The documented bundle was trained on **BraTS 2018**, not BraTS 2021; this is not proof of performance on the official development subset |

The application does **not** generate random MRI scans or fake predictions. Synthetic arrays may be used only in unit tests and must never be shown as clinical images or model output. If the configured checkpoint is missing or incompatible, segmentation must fail rather than return a fabricated result.

## Dataset profile configuration

Set `NEUROSCOPE_DATASET_PROFILE` to one of:

- `brats2021` (default): canonical BraTS labels 0=background, 1=NCR/NET, 2=edema, 4=ET; expects the preprocessed 240 × 240 × 155 geometry and 1 mm isotropic spacing used by the supplied data description.
- `msd_task01`: explicitly sourced MSD Task01 labels are converted from 0=background, 1=edema, 2=NCR/NET, 3=ET into the canonical internal labels 0, 2, 1, 4. This profile does not make MSD cases equivalent to BraTS 2021.

Do not silently resize or resample data to pass validation. If official cases differ from the expected geometry, confirm the organizer's preprocessing instructions and implement a documented, tested transform first.

## Model input and limits

The MONAI bundle documents four aligned MRI channels in this order: **T1Gd/T1c, T1, T2, FLAIR**, at 1 mm isotropic spacing. The upload API accepts each modality separately and the inference module explicitly stacks channels in the bundle's expected order.

The bundle documentation reports training/validation results on its own BraTS 2018 split. Those numbers are **not** NeuroScope's measured results and must not be presented as evaluation on BraTS 2021. Run evaluation only where an official expert mask is available and geometrically aligned.

The model checkpoint path is configured with `NEUROSCOPE_MODEL_WEIGHTS`. The file must be downloaded from an authorized source and verified to match the expected MONAI architecture. Check `GET /health/model` to attempt loading the checkpoint and verify compatibility; a configured path alone is not proof of readiness.

## Backend setup

Run these commands from the `backend` directory:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:NEUROSCOPE_DATASET_PROFILE = "brats2021"
$env:NEUROSCOPE_MODEL_WEIGHTS = "C:\path\to\verified\model.pt"
uvicorn main:app --reload
```

API documentation: `http://127.0.0.1:8000/docs`

Useful endpoints:

- `GET /`: API status and configured data/model metadata
- `GET /health/model`: attempts to load the configured checkpoint
- `POST /api/v1/validate`: validate four modality files and optional expert mask
- `POST /api/v1/segment/{run_id}`: run segmentation for a validated study
- `GET /api/v1/jobs/{run_id}/prediction`: download the predicted NIfTI mask
- `GET /api/v1/jobs/{run_id}/report`: download the generated PDF

The validation form accepts `dataset_profile`, optional `case_id`, and optional `source_reference`. These are provenance fields supplied by the caller; they are not independent proof that a file came from an official source. SHA-256 hashes are recorded for uploaded MRI modalities.

## Tests and CI

Run tests from the repository root:

```powershell
python -m unittest discover -s tests -v
```

GitHub Actions runs the test suite on pushes to the development branch and on pull requests targeting it. CI checks are not a substitute for a real end-to-end run on an authorized official case and the actual model checkpoint.

## Privacy and licensing

Use only data your team is authorized to process. Do not commit patient scans, local databases, secrets, generated reports, or restricted dataset files. Confirm the terms for both the official dataset and the model checkpoint before redistribution or deployment.
