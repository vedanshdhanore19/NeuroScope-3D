"""
FastAPI entrypoint for the NeuroScope 3D research prototype.
Provides endpoints for health checks, study validation, MSD 4D case unpacking,
MONAI SegResNet inference, interactive 2D slice rendering, volumetrics, and report generation.
"""
import io
import os
import shutil
import uuid
from pathlib import Path
from typing import Optional

import nibabel as nib
import numpy as np
from PIL import Image
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session

from app.config import TEMP_DIR, DISCLAIMER_TEXT, MAX_FILE_SIZE_BYTES, LABEL_NCR, LABEL_ED, LABEL_ET
from app.database import (
    init_db, get_db, Study, InferenceRun, Volumetrics, EvaluationMetric, FailureLog
)
from app.dataset_profiles import unpack_msd_4d_volume
from app.validator import (
    validate_study_set, validate_expert_mask, validate_msd_4d_nifti, ValidationError
)
from app.volumetrics import compute_volumes, evaluate_against_expert_mask
from app.inference import run_inference, get_model_status
from app.pdf_generator import generate_pdf_report

app = FastAPI(
    title="NeuroScope 3D Backend API",
    description="Research and educational prototype for brain MRI validation, MONAI SegResNet segmentation, and volumetrics.",
    version="1.2.0",
)

# CORS origins: allow local Vite/React/dev ports and custom origins
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]
env_origins = [
    o.strip()
    for o in os.getenv("NEUROSCOPE_CORS_ORIGINS", "").split(",")
    if o.strip()
]
cors_origins = list(set(default_origins + env_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1024)

from fastapi.staticfiles import StaticFiles
frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
if frontend_dir.is_dir():
    app.mount("/app", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")


@app.on_event("startup")
def startup_event():
    init_db()


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "NeuroScope 3D Engine",
        "version": "1.2.0",
        "disclaimer": DISCLAIMER_TEXT,
        "frontend_url": "/app/",
        "docs_url": "/docs",
        "model_status": get_model_status(),
    }


@app.get("/health")
@app.get("/api/v1/health")
def health_check():
    """
    Comprehensive health check distinguishing:
    1. Application running
    2. Model configured
    3. Checkpoint file available on disk
    4. Model checkpoint SHA-256 integrity
    5. Ready for inference
    """
    model_stat = get_model_status()
    return {
        "status": "healthy",
        "service": "NeuroScope 3D Backend",
        "disclaimer": DISCLAIMER_TEXT,
        "model": model_stat,
    }


@app.get("/api/v1/model/status")
def model_status_endpoint():
    """Returns official MONAI model bundle specification and checkpoint status."""
    return get_model_status()


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
                        detail=f"Upload exceeds maximum allowed size of {MAX_FILE_SIZE_BYTES // (1024**2)} MiB.",
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
    dataset_profile: str = Form("brats"),
    db: Session = Depends(get_db),
):
    """
    Validate 4 separate 3D MRI files (T1, T1Gd, T2, FLAIR) and optional reference mask.
    Supports dataset_profile: 'brats' or 'msd_task01'.
    """
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

        val_result = validate_study_set(file_paths)
        if expert_mask is not None:
            reference_img = nib.load(file_paths["t1"])
            validate_expert_mask(
                str(expert_path), reference_img, dataset_profile=dataset_profile
            )

        study_rec = Study(
            study_id=run_id,
            t1_filename=t1.filename,
            t1gd_filename=t1gd.filename,
            t2_filename=t2.filename,
            flair_filename=flair.filename,
            expert_mask_filename=expert_mask.filename if expert_mask else None,
            sha256_hash=val_result["combined_hash"],
            is_skull_stripped=val_result["is_skull_stripped"],
            dataset_profile=dataset_profile,
            status="VALIDATED",
        )
        db.add(study_rec)
        db.commit()
        return {
            "run_id": run_id,
            "status": "VALIDATED",
            "dataset_profile": dataset_profile,
            "is_skull_stripped": val_result["is_skull_stripped"],
            "hash": val_result["combined_hash"],
            "dimensions": list(val_result["ref_shape"]),
            "voxel_spacing": [round(float(z), 3) for z in val_result["zooms"]],
            "has_expert_mask": expert_mask is not None,
        }
    except ValidationError as exc:
        db.rollback()
        try:
            db.add(FailureLog(error_code=exc.code, message=exc.message))
            db.commit()
        except Exception:
            db.rollback()
        shutil.rmtree(run_temp_dir, ignore_errors=True)
        raise HTTPException(
            status_code=400,
            detail={"code": exc.code, "message": exc.message, "details": exc.details}
        ) from exc
    except HTTPException:
        db.rollback()
        shutil.rmtree(run_temp_dir, ignore_errors=True)
        raise
    except Exception as exc:
        db.rollback()
        shutil.rmtree(run_temp_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Internal validation error: {exc}") from exc


@app.post("/api/v1/validate_msd")
async def validate_msd_dataset_case(
    msd_volume: UploadFile = File(..., description="MSD Task01 4D brain volume (.nii.gz)"),
    expert_mask: Optional[UploadFile] = File(None, description="MSD Task01 reference label map (.nii.gz)"),
    db: Session = Depends(get_db),
):
    """
    Upload and unpack an official Medical Segmentation Decathlon (MSD) Task01 case.
    Extracts 4D volume (0:FLAIR, 1:T1, 2:T1gd, 3:T2) into separate 3D sequences and validates them.
    """
    run_id = str(uuid.uuid4())
    run_temp_dir = TEMP_DIR / run_id
    run_temp_dir.mkdir(parents=True, exist_ok=False)
    msd_raw_path = str(run_temp_dir / "msd_raw_4d.nii.gz")
    expert_path = run_temp_dir / "expert.nii.gz"

    try:
        await _save_upload_limited(msd_volume, msd_raw_path)
        validate_msd_4d_nifti(msd_raw_path)

        # Unpack 4D volume into 4 separate 3D sequences
        extracted_paths = unpack_msd_4d_volume(msd_raw_path, run_temp_dir)
        val_result = validate_study_set(extracted_paths)

        if expert_mask is not None:
            await _save_upload_limited(expert_mask, str(expert_path))
            ref_img = nib.load(extracted_paths["t1"])
            validate_expert_mask(str(expert_path), ref_img, dataset_profile="msd_task01")

        study_rec = Study(
            study_id=run_id,
            t1_filename=f"{msd_volume.filename} [T1 channel]",
            t1gd_filename=f"{msd_volume.filename} [T1gd channel]",
            t2_filename=f"{msd_volume.filename} [T2 channel]",
            flair_filename=f"{msd_volume.filename} [FLAIR channel]",
            expert_mask_filename=expert_mask.filename if expert_mask else None,
            sha256_hash=val_result["combined_hash"],
            is_skull_stripped=val_result["is_skull_stripped"],
            dataset_profile="msd_task01",
            status="VALIDATED",
        )
        db.add(study_rec)
        db.commit()

        return {
            "run_id": run_id,
            "status": "VALIDATED",
            "dataset_profile": "msd_task01",
            "is_skull_stripped": val_result["is_skull_stripped"],
            "hash": val_result["combined_hash"],
            "dimensions": list(val_result["ref_shape"]),
            "voxel_spacing": [round(float(z), 3) for z in val_result["zooms"]],
            "has_expert_mask": expert_mask is not None,
            "note": "4D MSD Task01 case unpacked into 4 sequences: FLAIR, T1, T1gd, T2.",
        }
    except ValidationError as exc:
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
        raise HTTPException(status_code=500, detail=f"Failed to process MSD volume: {exc}") from exc


@app.post("/api/v1/segment/{run_id}")
def run_segmentation(run_id: str, db: Session = Depends(get_db)):
    """Execute MONAI inference pipeline on a validated study."""
    run_temp_dir = TEMP_DIR / run_id
    if not run_temp_dir.exists():
        raise HTTPException(status_code=404, detail="Run ID directory not found.")

    study_rec = db.query(Study).filter(Study.study_id == run_id).first()
    if study_rec is None:
        raise HTTPException(status_code=404, detail="Validated study record not found.")
    if study_rec.status not in ("VALIDATED", "COMPLETED"):
        raise HTTPException(
            status_code=409,
            detail=f"Study is not ready for inference (status: {study_rec.status})."
        )

    file_paths = {
        key: str(run_temp_dir / f"{key}.nii.gz")
        for key in ("t1", "t1gd", "t2", "flair")
    }
    output_mask_path = str(run_temp_dir / "prediction.nii.gz")

    try:
        study_rec.status = "PROCESSING"
        db.commit()

        pred_label_map, elapsed_time = run_inference(file_paths, output_mask_path)
        t1_img = nib.load(file_paths["t1"])
        zooms = t1_img.header.get_zooms()[:3]
        volumes = compute_volumes(pred_label_map, t1_img.affine, zooms)

        # Clear any existing previous run for this study
        existing_run = db.query(InferenceRun).filter(InferenceRun.run_id == run_id).first()
        if existing_run:
            db.delete(existing_run)
            db.commit()

        inf_run = InferenceRun(
            run_id=run_id,
            study_id=run_id,
            model_name="MONAI SegResNet (Bundle: brats_mri_segmentation v0.5.4)",
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
            expert_data = validate_expert_mask(
                str(expert_path), t1_img, dataset_profile=study_rec.dataset_profile or "brats"
            )
            metrics = evaluate_against_expert_mask(pred_label_map, expert_data, spacing=zooms)
            for region, values in metrics.items():
                db.add(EvaluationMetric(
                    run_id=run_id,
                    region=region,
                    dice_score=values["dice_score"],
                    sensitivity=values["sensitivity"],
                    hd95_mm=values["hd95_mm"],
                ))

        model_stat = get_model_status()
        pdf_path = str(run_temp_dir / "report.pdf")
        generate_pdf_report(
            run_id=run_id,
            study_id=run_id,
            sha256_hash=study_rec.sha256_hash,
            volumes=volumes,
            metrics=metrics,
            output_pdf_path=pdf_path,
            model_name=f"MONAI SegResNet v0.5.4 (Device: {model_stat['device'].upper()})",
            inference_time=elapsed_time,
            provenance_details=model_stat,
        )
        study_rec.status = "COMPLETED"
        db.commit()

        return {
            "run_id": run_id,
            "status": "COMPLETED",
            "inference_time_seconds": elapsed_time,
            "volumes": volumes,
            "metrics": metrics,
            "dataset_profile": study_rec.dataset_profile,
        }
    except RuntimeError as exc:
        db.rollback()
        study_rec.status = "FAILED"
        db.commit()
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        db.rollback()
        study_rec.status = "FAILED"
        db.commit()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValidationError as exc:
        db.rollback()
        study_rec.status = "FAILED"
        db.commit()
        raise HTTPException(status_code=400, detail={"code": exc.code, "message": exc.message}) from exc
    except Exception as exc:
        db.rollback()
        study_rec.status = "FAILED"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Inference execution failed: {exc}") from exc


@app.get("/api/v1/study/{run_id}")
def get_study_details(run_id: str, db: Session = Depends(get_db)):
    """Fetch status and computed results for a run."""
    study_rec = db.query(Study).filter(Study.study_id == run_id).first()
    if not study_rec:
        raise HTTPException(status_code=404, detail="Study not found.")

    inf_run = db.query(InferenceRun).filter(InferenceRun.run_id == run_id).first()
    vol_recs = db.query(Volumetrics).filter(Volumetrics.run_id == run_id).all()
    metric_recs = db.query(EvaluationMetric).filter(EvaluationMetric.run_id == run_id).all()

    volumes = {
        v.region: {
            "voxel_count": v.voxel_count,
            "volume_ml": v.volume_ml,
            "spacing_x": v.spacing_x,
            "spacing_y": v.spacing_y,
            "spacing_z": v.spacing_z,
        }
        for v in vol_recs
    }
    metrics = {
        m.region: {
            "dice_score": m.dice_score,
            "sensitivity": m.sensitivity,
            "hd95_mm": m.hd95_mm,
        }
        for m in metric_recs
    } if metric_recs else None

    # Get dimensions and total slices from t1
    run_temp_dir = TEMP_DIR / run_id
    t1_path = run_temp_dir / "t1.nii.gz"
    dimensions = [240, 240, 155]
    if t1_path.is_file():
        try:
            img = nib.load(str(t1_path))
            dimensions = list(img.shape)
        except Exception:
            pass

    return {
        "run_id": study_rec.study_id,
        "status": study_rec.status,
        "dataset_profile": study_rec.dataset_profile,
        "sha256_hash": study_rec.sha256_hash,
        "is_skull_stripped": study_rec.is_skull_stripped,
        "dimensions": dimensions,
        "inference_time_seconds": inf_run.inference_time_seconds if inf_run else None,
        "volumes": volumes if volumes else None,
        "metrics": metrics,
        "has_prediction": (run_temp_dir / "prediction.nii.gz").is_file(),
        "has_report": (run_temp_dir / "report.pdf").is_file(),
    }


@app.get("/api/v1/study/{run_id}/slice/{modality}/{axis}/{slice_idx}")
def get_slice_image(
    run_id: str,
    modality: str,
    axis: int,
    slice_idx: int,
    overlay: bool = Query(False, description="Overlay predicted segmentation mask"),
    alpha: float = Query(0.5, ge=0.0, le=1.0, description="Overlay mask transparency"),
):
    """
    Render a 2D slice from the specified modality ('t1', 't1gd', 't2', 'flair', 'prediction', 'expert')
    along axis 0 (sagittal), 1 (coronal), or 2 (axial) as a PNG image.
    If overlay=true, blends the prediction mask with distinct colors for NCR, ED, and ET.
    """
    run_temp_dir = TEMP_DIR / run_id
    if not run_temp_dir.exists():
        raise HTTPException(status_code=404, detail="Run not found.")

    modality = modality.lower()
    mod_file_map = {
        "t1": "t1.nii.gz",
        "t1gd": "t1gd.nii.gz",
        "t2": "t2.nii.gz",
        "flair": "flair.nii.gz",
        "prediction": "prediction.nii.gz",
        "expert": "expert.nii.gz",
    }
    if modality not in mod_file_map:
        raise HTTPException(status_code=400, detail=f"Unsupported modality '{modality}'.")

    target_file = run_temp_dir / mod_file_map[modality]
    if not target_file.is_file():
        raise HTTPException(status_code=404, detail=f"Volume '{modality}' not found for run.")

    if axis not in (0, 1, 2):
        raise HTTPException(status_code=400, detail="Axis must be 0 (sagittal), 1 (coronal), or 2 (axial).")

    try:
        nii = nib.load(str(target_file))
        data = nii.get_fdata(dtype=np.float32)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read volume: {exc}") from exc

    if slice_idx < 0 or slice_idx >= data.shape[axis]:
        raise HTTPException(
            status_code=400,
            detail=f"Slice index {slice_idx} out of range (0 to {data.shape[axis] - 1})."
        )

    # Extract 2D slice
    if axis == 0:
        slice_2d = data[slice_idx, :, :]
    elif axis == 1:
        slice_2d = data[:, slice_idx, :]
    else:
        slice_2d = data[:, :, slice_idx]

    # Rotate 90 degrees counter-clockwise so anatomical top is upright in standard viewing
    slice_2d = np.rot90(slice_2d)

    # Convert MRI intensity to grayscale 0-255
    if modality in ("prediction", "expert"):
        # Direct segmentation map rendering
        rgb = np.zeros((*slice_2d.shape, 3), dtype=np.uint8)
        rgb[slice_2d == LABEL_NCR] = [245, 158, 11]  # Amber (NCR)
        rgb[slice_2d == LABEL_ED] = [16, 185, 129]   # Emerald (ED)
        rgb[slice_2d == LABEL_ET] = [239, 68, 68]    # Coral/Red (ET)
    else:
        p2, p98 = np.percentile(slice_2d, 2), np.percentile(slice_2d, 98)
        if p98 > p2:
            norm_2d = np.clip((slice_2d - p2) / (p98 - p2), 0.0, 1.0)
        else:
            norm_2d = np.zeros_like(slice_2d)
        gray = (norm_2d * 255.0).astype(np.uint8)
        rgb = np.stack([gray, gray, gray], axis=-1)

        # Apply overlay if requested
        pred_path = run_temp_dir / "prediction.nii.gz"
        if overlay and pred_path.is_file():
            try:
                pred_nii = nib.load(str(pred_path))
                pred_data = pred_nii.get_fdata(dtype=np.int16)
                if axis == 0:
                    pred_slice = np.rot90(pred_data[slice_idx, :, :])
                elif axis == 1:
                    pred_slice = np.rot90(pred_data[:, slice_idx, :])
                else:
                    pred_slice = np.rot90(pred_data[:, :, slice_idx])

                # Color definitions
                # Label 1 (NCR): Amber [245, 158, 11]
                # Label 2 (ED): Emerald [16, 185, 129]
                # Label 4 (ET): Red [239, 68, 68]
                for label_val, col in [(LABEL_NCR, [245, 158, 11]), (LABEL_ED, [16, 185, 129]), (LABEL_ET, [239, 68, 68])]:
                    mask = (pred_slice == label_val)
                    if np.any(mask):
                        rgb[mask] = (
                            (1.0 - alpha) * rgb[mask].astype(float) +
                            alpha * np.array(col, dtype=float)
                        ).astype(np.uint8)
            except Exception:
                pass

    img_out = Image.fromarray(rgb)
    buf = io.BytesIO()
    img_out.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.getvalue(), media_type="image/png")


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


# =========================================================================
# Additive Visualization Routes (Viewer & 3D Marching Cubes Engine)
# =========================================================================

from app.visualization import get_study_volume_info, render_slice_png, generate_tumor_mesh


def _validate_run_id_format(run_id: str) -> None:
    """Guards against directory traversal by strictly enforcing UUID format."""
    try:
        uuid.UUID(run_id)
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid run_id format. Must be a valid UUID.")


@app.get("/api/v1/jobs/{run_id}/volume-info")
def get_volume_info(run_id: str):
    """Retrieves volume spatial dimensions, voxel spacing, and available orthogonal planes."""
    _validate_run_id_format(run_id)
    try:
        return get_study_volume_info(run_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve volume info: {str(exc)}")


@app.get("/api/v1/jobs/{run_id}/slice")
def get_viewer_slice(
    run_id: str,
    modality: str = Query("t1", description="MRI modality: t1, t1gd, t2, flair"),
    plane: str = Query("axial", description="Anatomical plane: axial, coronal, sagittal"),
    index: Optional[int] = Query(None, description="Slice coordinate index along selected plane"),
    regions: Optional[str] = Query("WT,TC,ET", description="Comma-separated tumor regions to display: WT,TC,ET"),
    brightness: float = Query(1.0, ge=0.1, le=3.0, description="Brightness adjustment multiplier"),
    contrast: float = Query(1.0, ge=0.1, le=3.0, description="Contrast adjustment multiplier"),
    alpha: float = Query(0.55, ge=0.0, le=1.0, description="Overlay opacity blending ratio")
):
    """Renders a viewer-grade 2D orthogonal slice with robust percentile scaling and union region overlays."""
    _validate_run_id_format(run_id)
    try:
        png_bytes = render_slice_png(
            run_id=run_id,
            modality=modality,
            plane=plane,
            slice_idx=index,
            regions=regions,
            brightness=brightness,
            contrast=contrast,
            alpha=alpha
        )
        return Response(
            content=png_bytes,
            media_type="image/png",
            headers={"Cache-Control": "private, max-age=60"}
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to render slice: {str(exc)}")


@app.get("/api/v1/jobs/{run_id}/mesh")
def get_mesh(
    run_id: str,
    region: str = Query("WT", description="Tumor target region: WT, TC, or ET"),
    max_faces: int = Query(150000, ge=50, le=500000, description="Maximum triangle face count budget")
):
    """Extracts a 3D polygonal surface mesh (Marching Cubes) formatted for Three.js BufferGeometry."""
    _validate_run_id_format(run_id)
    try:
        return generate_tumor_mesh(run_id=run_id, region=region, max_faces=max_faces)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate tumor mesh: {str(exc)}")

