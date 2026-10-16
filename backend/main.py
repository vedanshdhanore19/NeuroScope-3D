"""FastAPI entrypoint for the NeuroScope 3D research prototype."""
import json
import os
import shutil
import uuid
from typing import Optional

import nibabel as nib
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import TEMP_DIR, DISCLAIMER_TEXT, MAX_FILE_SIZE_BYTES, DATASET_PROFILE, DATASET_SOURCES, MODEL_BUNDLE_SOURCE, MODEL_BUNDLE_VERSION, MODEL_TRAINING_DATASET
from app.database import init_db, get_db, Study, InferenceRun, Volumetrics, EvaluationMetric, FailureLog
from app.validator import (
    validate_study_set, validate_expert_mask, ValidationError
)
from app.volumetrics import compute_volumes, evaluate_against_expert_mask
from app.inference import run_inference
from app.pdf_generator import generate_pdf_report

app = FastAPI(
    title="NeuroScope 3D Backend API",
    description="Research prototype for MRI validation, segmentation and volumetrics.",
    version="1.1.0",
)

# Restrict CORS through NEUROSCOPE_CORS_ORIGINS in deployed environments.
cors_origins = [
    origin.strip()
    for origin in os.getenv("NEUROSCOPE_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    init_db()


@app.get("/health/model")
def model_health():
    """Actually load the configured checkpoint before claiming the model is ready."""
    from app.inference import load_monai_model
    try:
        load_monai_model()
        return {"ready": True, "checkpoint": "loaded_and_architecture_verified"}
    except RuntimeError as exc:
        return {"ready": False, "reason": str(exc)}


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "NeuroScope 3D Engine",
        "disclaimer": DISCLAIMER_TEXT,
        "model_checkpoint_configured": bool(os.getenv("NEUROSCOPE_MODEL_WEIGHTS", "").strip()),
        "model_checkpoint_file_present": bool(
            os.getenv("NEUROSCOPE_MODEL_WEIGHTS", "").strip()
            and os.path.isfile(os.path.expanduser(os.getenv("NEUROSCOPE_MODEL_WEIGHTS", "").strip()))
        ),
        "dataset_profile": DATASET_PROFILE,
        "model_bundle_source": MODEL_BUNDLE_SOURCE,
    }


async def _save_upload_limited(upload: UploadFile, destination: str) -> int:
    """Stream an upload to disk and stop as soon as the configured limit is exceeded."""
    total = 0
    try:
        with open(destination, "wb") as output:
            while True:
                chunk = await upload.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_FILE_SIZE_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Upload exceeds the maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024**2)} MiB.",
                    )
                output.write(chunk)
        if total == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        return total
    except Exception:
        if os.path.exists(destination):
            os.remove(destination)
        raise
    finally:
        await upload.close()


@app.post("/api/v1/validate")
async def validate_study(
    t1: UploadFile = File(...),
    t1gd: UploadFile = File(...),
    t2: UploadFile = File(...),
    flair: UploadFile = File(...),
    expert_mask: Optional[UploadFile] = File(None),
    dataset_profile: str = Form(DATASET_PROFILE),
    case_id: Optional[str] = Form(None),
    source_reference: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    run_id = str(uuid.uuid4())
    run_temp_dir = TEMP_DIR / run_id
    run_temp_dir.mkdir(parents=True, exist_ok=False)
    uploads = {"t1": t1, "t1gd": t1gd, "t2": t2, "flair": flair}
    file_paths = {key: str(run_temp_dir / f"{key}.nii.gz") for key in uploads}
    expert_path = run_temp_dir / "expert.nii.gz"

    try:
        for key, upload in uploads.items():
            await _save_upload_limited(upload, file_paths[key])

        if expert_mask is not None:
            await _save_upload_limited(expert_mask, str(expert_path))

        val_result = validate_study_set(file_paths, dataset_profile=dataset_profile)
        if expert_mask is not None:
            reference_img = nib.load(file_paths["t1"])
            validate_expert_mask(str(expert_path), reference_img, dataset_profile=dataset_profile)

        study_rec = Study(
            study_id=run_id,
            t1_filename=t1.filename,
            t1gd_filename=t1gd.filename,
            t2_filename=t2.filename,
            flair_filename=flair.filename,
            expert_mask_filename=expert_mask.filename if expert_mask else None,
            dataset_profile=dataset_profile,
            case_id=(case_id.strip()[:255] if case_id and case_id.strip() else None),
            source_reference=(source_reference.strip()[:1000] if source_reference and source_reference.strip() else DATASET_SOURCES.get(dataset_profile)),
            sha256_hash=val_result["combined_hash"],
            is_skull_stripped=val_result["is_skull_stripped"],
            status="VALIDATED",
        )
        db.add(study_rec)
        db.commit()
        return {
            "run_id": run_id,
            "status": "VALIDATED",
            "is_skull_stripped": val_result["is_skull_stripped"],
            "dataset": {"profile": dataset_profile, "case_id": (case_id.strip() if case_id and case_id.strip() else None), "declared_source": (source_reference.strip() if source_reference and source_reference.strip() else DATASET_SOURCES.get(dataset_profile))},
            "hash": val_result["combined_hash"],
        }
    except ValidationError as exc:
        db.rollback()
        try:
            db.add(FailureLog(error_code=exc.code, message=exc.message))
            db.commit()
        except Exception:
            db.rollback()
        shutil.rmtree(run_temp_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail={"code": exc.code, "message": exc.message}) from exc
    except HTTPException:
        db.rollback()
        shutil.rmtree(run_temp_dir, ignore_errors=True)
        raise
    except Exception as exc:
        db.rollback()
        shutil.rmtree(run_temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail="Internal validation error.") from exc



def _canonical_msd_modality(name: str) -> str:
    """Map dataset.json modality names to the API's canonical modality keys."""
    normalized = "".join(ch for ch in name.lower() if ch.isalnum())
    aliases = {
        "t1": "t1",
        "t1w": "t1",
        "t1gd": "t1gd",
        "t1ce": "t1gd",
        "t1gadolinium": "t1gd",
        "t1c": "t1gd",
        "t2": "t2",
        "t2w": "t2",
        "flair": "flair",
        "t2flair": "flair",
    }
    return aliases.get(normalized, "")


@app.post("/api/v1/validate/msd-task01")
async def validate_msd_task01(
    image: UploadFile = File(..., description="One official MSD 4D NIfTI image"),
    dataset_json: UploadFile = File(..., description="The dataset.json from the extracted Task01_BrainTumour archive"),
    expert_mask: Optional[UploadFile] = File(None),
    case_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """Validate an MSD Task01 4D case using the modality order in its dataset.json."""
    run_id = str(uuid.uuid4())
    run_temp_dir = TEMP_DIR / run_id
    run_temp_dir.mkdir(parents=True, exist_ok=False)
    image_path = run_temp_dir / "msd_image.nii.gz"
    metadata_path = run_temp_dir / "dataset.json"
    expert_path = run_temp_dir / "expert.nii.gz"

    try:
        await _save_upload_limited(image, str(image_path))
        await _save_upload_limited(dataset_json, str(metadata_path))
        if expert_mask is not None:
            await _save_upload_limited(expert_mask, str(expert_path))

        try:
            with open(metadata_path, "r", encoding="utf-8") as stream:
                metadata = json.load(stream)
        except Exception as exc:
            raise ValidationError("INVALID_DATASET_JSON", "Could not parse the supplied dataset.json.") from exc

        modalities = metadata.get("modality") or metadata.get("modalities")
        if not isinstance(modalities, dict) or len(modalities) != 4:
            raise ValidationError(
                "INVALID_MODALITY_METADATA",
                "dataset.json must declare exactly four modalities in its modality/modalities mapping.",
            )

        ordered = sorted(modalities.items(), key=lambda item: int(item[0]))
        channel_map = {}
        for channel_key, modality_name in ordered:
            try:
                channel_index = int(channel_key)
            except (TypeError, ValueError) as exc:
                raise ValidationError("INVALID_MODALITY_METADATA", "Modality keys must be numeric channel indices.") from exc
            canonical = _canonical_msd_modality(str(modality_name))
            if not canonical or canonical in channel_map:
                raise ValidationError(
                    "INVALID_MODALITY_METADATA",
                    f"Unsupported or duplicate modality name in dataset.json: {modality_name!r}.",
                )
            channel_map[canonical] = channel_index

        if set(channel_map) != {"t1", "t1gd", "t2", "flair"} or set(channel_map.values()) != {0, 1, 2, 3}:
            raise ValidationError(
                "INVALID_MODALITY_METADATA",
                "dataset.json must map four unique channels to T1, T1Gd/T1ce, T2, and FLAIR.",
            )

        try:
            combined_img = nib.load(str(image_path))
            combined_data = combined_img.get_fdata(dtype=np.float32)
        except Exception as exc:
            raise ValidationError("CORRUPT_NIFTI", f"Could not parse combined MSD image: {exc}") from exc
        if combined_data.ndim != 4 or combined_data.shape[3] != 4:
            raise ValidationError(
                "UNSUPPORTED_DIMENSIONS",
                f"Expected an MSD 4D NIfTI with four channels; received shape {combined_data.shape}.",
            )
        if not np.all(np.isfinite(combined_data)):
            raise ValidationError("NONFINITE_VALUES", "Combined MRI contains NaN or infinite values.")

        file_paths = {}
        for modality, channel_index in channel_map.items():
            modality_path = run_temp_dir / f"{modality}.nii.gz"
            header = combined_img.header.copy()
            header.set_data_shape(combined_data[..., channel_index].shape)
            header.set_zooms(combined_img.header.get_zooms()[:3])
            volume_img = nib.Nifti1Image(
                combined_data[..., channel_index],
                affine=combined_img.affine,
                header=header,
            )
            nib.save(volume_img, str(modality_path))
            file_paths[modality] = str(modality_path)

        val_result = validate_study_set(file_paths, dataset_profile="msd_task01")
        if expert_mask is not None:
            reference_img = nib.load(file_paths["t1"])
            validate_expert_mask(str(expert_path), reference_img, dataset_profile="msd_task01")

        study_rec = Study(
            study_id=run_id,
            t1_filename=f"{image.filename or 'msd_case'} [T1 channel]",
            t1gd_filename=f"{image.filename or 'msd_case'} [T1Gd/T1ce channel]",
            t2_filename=f"{image.filename or 'msd_case'} [T2 channel]",
            flair_filename=f"{image.filename or 'msd_case'} [FLAIR channel]",
            expert_mask_filename=expert_mask.filename if expert_mask else None,
            dataset_profile="msd_task01",
            case_id=(case_id.strip()[:255] if case_id and case_id.strip() else None),
            source_reference=DATASET_SOURCES["msd_task01"],
            sha256_hash=val_result["combined_hash"],
            is_skull_stripped=val_result["is_skull_stripped"],
            status="VALIDATED",
        )
        db.add(study_rec)
        db.commit()
        return {
            "run_id": run_id,
            "status": "VALIDATED",
            "dataset": {
                "profile": "msd_task01",
                "case_id": (case_id.strip() if case_id and case_id.strip() else None),
                "declared_source": DATASET_SOURCES["msd_task01"],
                "channel_order_from_dataset_json": {str(index): name for index, name in ordered},
            },
            "is_skull_stripped": val_result["is_skull_stripped"],
            "hash": val_result["combined_hash"],
        }
    except ValidationError as exc:
        db.rollback()
        try:
            db.add(FailureLog(error_code=exc.code, message=exc.message))
            db.commit()
        except Exception:
            db.rollback()
        shutil.rmtree(run_temp_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail={"code": exc.code, "message": exc.message}) from exc
    except HTTPException:
        db.rollback()
        shutil.rmtree(run_temp_dir, ignore_errors=True)
        raise
    except Exception as exc:
        db.rollback()
        shutil.rmtree(run_temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail="MSD case validation failed. Check server logs.") from exc


@app.post("/api/v1/segment/{run_id}")
def run_segmentation(run_id: str, db: Session = Depends(get_db)):
    run_temp_dir = TEMP_DIR / run_id
    if not run_temp_dir.exists():
        raise HTTPException(status_code=404, detail="Run ID directory not found.")

    study_rec = db.query(Study).filter(Study.study_id == run_id).first()
    if study_rec is None:
        raise HTTPException(status_code=404, detail="Validated study record not found.")
    if study_rec.status != "VALIDATED":
        raise HTTPException(status_code=409, detail=f"Study is not ready for inference (status: {study_rec.status}).")

    file_paths = {
        key: str(run_temp_dir / f"{key}.nii.gz")
        for key in ("t1", "t1gd", "t2", "flair")
    }
    output_mask_path = str(run_temp_dir / "prediction.nii.gz")

    try:
        pred_label_map, elapsed_time = run_inference(file_paths, output_mask_path)
        t1_img = nib.load(file_paths["t1"])
        zooms = t1_img.header.get_zooms()[:3]
        volumes = compute_volumes(pred_label_map, t1_img.affine, zooms)

        inf_run = InferenceRun(
            run_id=run_id,
            study_id=run_id,
            inference_time_seconds=elapsed_time,
            output_nifti_path=output_mask_path,
        )
        db.add(inf_run)
        for region, values in volumes.items():
            db.add(Volumetrics(
                run_id=run_id,
                region=region,
                voxel_count=values["voxel_count"],
                spacing_x=values["spacing_x"],
                spacing_y=values["spacing_y"],
                spacing_z=values["spacing_z"],
                volume_ml=values["volume_ml"],
            ))

        metrics = None
        expert_path = run_temp_dir / "expert.nii.gz"
        if expert_path.exists():
            expert_data = validate_expert_mask(str(expert_path), t1_img, dataset_profile=study_rec.dataset_profile)
            metrics = evaluate_against_expert_mask(pred_label_map, expert_data, spacing=zooms)
            for region, values in metrics.items():
                db.add(EvaluationMetric(
                    run_id=run_id,
                    region=region,
                    dice_score=values["dice_score"],
                    sensitivity=values["sensitivity"],
                    hd95_mm=values["hd95_mm"],
                ))

        pdf_path = str(run_temp_dir / "report.pdf")
        generate_pdf_report(
            run_id=run_id,
            study_id=run_id,
            sha256_hash=study_rec.sha256_hash,
            volumes=volumes,
            metrics=metrics,
            output_pdf_path=pdf_path,
            model_name=f"MONAI SegResNet bundle {MODEL_BUNDLE_VERSION} (trained on {MODEL_TRAINING_DATASET}); checkpoint configured via NEUROSCOPE_MODEL_WEIGHTS",
            inference_time=elapsed_time,
            dataset_profile=study_rec.dataset_profile,
            case_id=study_rec.case_id,
            source_reference=study_rec.source_reference,
        )
        study_rec.status = "COMPLETED"
        db.commit()
        return {
            "run_id": run_id,
            "status": "COMPLETED",
            "dataset": {"profile": study_rec.dataset_profile, "case_id": study_rec.case_id, "declared_source": study_rec.source_reference},
            "model": {"bundle_source": MODEL_BUNDLE_SOURCE, "bundle_version": MODEL_BUNDLE_VERSION, "training_dataset": MODEL_TRAINING_DATASET},
            "inference_time_seconds": elapsed_time,
            "volumes": volumes,
            "metrics": metrics,
        }
    except RuntimeError as exc:
        db.rollback()
        # Model setup failures should be actionable, not reported as successful runs.
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValidationError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail={"code": exc.code, "message": exc.message}) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Inference execution failed. Check server logs.") from exc


@app.get("/api/v1/jobs/{run_id}/prediction")
def download_prediction(run_id: str):
    output_path = TEMP_DIR / run_id / "prediction.nii.gz"
    if not output_path.exists():
        raise HTTPException(status_code=404, detail="Prediction file not found.")
    return FileResponse(output_path, filename="prediction.nii.gz", media_type="application/gzip")


@app.get("/api/v1/jobs/{run_id}/report")
def download_report(run_id: str):
    pdf_path = TEMP_DIR / run_id / "report.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF report not found.")
    return FileResponse(pdf_path, filename="NeuroScope_Report.pdf", media_type="application/pdf")
