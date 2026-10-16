"""
FastAPI Main Application Entrypoint for NeuroScope 3D.
Exposes routes for study validation, live segmentation, report generation, and status checks.
"""

import os
import uuid
from typing import Optional
import numpy as np
import nibabel as nib
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import TEMP_DIR, DISCLAIMER_TEXT
from app.database import init_db, get_db, Study, InferenceRun, Volumetrics, EvaluationMetric, FailureLog
from app.validator import validate_study_set, ValidationError
from app.volumetrics import compute_volumes, evaluate_against_expert_mask
from app.inference import run_inference
from app.pdf_generator import generate_pdf_report

app = FastAPI(
    title="NeuroScope 3D Backend API",
    description="3D Medical Image Segmentation & Volumetrics Engine (DI-02)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    init_db()


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "NeuroScope 3D Engine",
        "disclaimer": DISCLAIMER_TEXT
    }


@app.post("/api/v1/validate")
async def validate_study(
    t1: UploadFile = File(...),
    t1gd: UploadFile = File(...),
    t2: UploadFile = File(...),
    flair: UploadFile = File(...),
    expert_mask: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    run_id = str(uuid.uuid4())
    run_temp_dir = TEMP_DIR / run_id
    run_temp_dir.mkdir(parents=True, exist_ok=True)

    file_paths = {}
    uploads = {"t1": t1, "t1gd": t1gd, "t2": t2, "flair": flair}

    try:
        for key, file_obj in uploads.items():
            save_path = str(run_temp_dir / f"{key}.nii.gz")
            with open(save_path, "wb") as f:
                content = await file_obj.read()
                f.write(content)
            file_paths[key] = save_path

        expert_path = None
        if expert_mask:
            expert_path = str(run_temp_dir / "expert.nii.gz")
            with open(expert_path, "wb") as f:
                content = await expert_mask.read()
                f.write(content)

        val_result = validate_study_set(file_paths)

        study_rec = Study(
            study_id=run_id,
            t1_filename=t1.filename,
            t1gd_filename=t1gd.filename,
            t2_filename=t2.filename,
            flair_filename=flair.filename,
            expert_mask_filename=expert_mask.filename if expert_mask else None,
            sha256_hash=val_result["combined_hash"],
            is_skull_stripped=val_result["is_skull_stripped"],
            status="VALIDATED"
        )
        db.add(study_rec)
        db.commit()

        return {
            "run_id": run_id,
            "status": "VALIDATED",
            "is_skull_stripped": val_result["is_skull_stripped"],
            "hash": val_result["combined_hash"]
        }

    except ValidationError as ve:
        fail_log = FailureLog(error_code=ve.code, message=ve.message)
        db.add(fail_log)
        db.commit()
        raise HTTPException(status_code=400, detail={"code": ve.code, "message": ve.message})
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal Validation Error: {str(exc)}")


@app.post("/api/v1/segment/{run_id}")
def run_segmentation(run_id: str, db: Session = Depends(get_db)):
    run_temp_dir = TEMP_DIR / run_id
    if not run_temp_dir.exists():
        raise HTTPException(status_code=404, detail="Run ID directory not found.")

    file_paths = {
        "t1": str(run_temp_dir / "t1.nii.gz"),
        "t1gd": str(run_temp_dir / "t1gd.nii.gz"),
        "t2": str(run_temp_dir / "t2.nii.gz"),
        "flair": str(run_temp_dir / "flair.nii.gz"),
    }
    output_mask_path = str(run_temp_dir / "prediction.nii.gz")

    try:
        pred_label_map, elapsed_time = run_inference(file_paths, output_mask_path)
        study_rec = db.query(Study).filter(Study.study_id == run_id).first()

        t1_img = nib.load(file_paths["t1"])
        zooms = t1_img.header.get_zooms()[:3]
        volumes = compute_volumes(pred_label_map, t1_img.affine, zooms)

        inf_run = InferenceRun(
            run_id=run_id,
            study_id=run_id,
            inference_time_seconds=elapsed_time,
            output_nifti_path=output_mask_path
        )
        db.add(inf_run)

        for reg, val in volumes.items():
            v_rec = Volumetrics(
                run_id=run_id,
                region=reg,
                voxel_count=val["voxel_count"],
                spacing_x=val["spacing_x"],
                spacing_y=val["spacing_y"],
                spacing_z=val["spacing_z"],
                volume_ml=val["volume_ml"]
            )
            db.add(v_rec)

        metrics = None
        expert_path = run_temp_dir / "expert.nii.gz"
        if expert_path.exists():
            expert_img = nib.load(str(expert_path))
            expert_data = expert_img.get_fdata(dtype=np.int16)
            metrics = evaluate_against_expert_mask(pred_label_map, expert_data, spacing=zooms)

            for reg, val in metrics.items():
                m_rec = EvaluationMetric(
                    run_id=run_id,
                    region=reg,
                    dice_score=val["dice_score"],
                    sensitivity=val["sensitivity"],
                    hd95_mm=val["hd95_mm"]
                )
                db.add(m_rec)

        study_rec.status = "COMPLETED"
        db.commit()

        pdf_path = str(run_temp_dir / "report.pdf")
        generate_pdf_report(
            run_id=run_id,
            study_id=run_id,
            sha256_hash=study_rec.sha256_hash,
            volumes=volumes,
            metrics=metrics,
            output_pdf_path=pdf_path,
            inference_time=elapsed_time
        )

        return {
            "run_id": run_id,
            "status": "COMPLETED",
            "inference_time_seconds": elapsed_time,
            "volumes": volumes,
            "metrics": metrics
        }

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference Execution Error: {str(exc)}")


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
        raise HTTPException(status_code=404, detail="PDF Report not found.")
    return FileResponse(pdf_path, filename="NeuroScope_Report.pdf", media_type="application/pdf")