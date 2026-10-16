"""Unit tests for PDF report generation."""
import tempfile
from pathlib import Path
import pytest

from backend.app.pdf_generator import generate_pdf_report


def test_generate_pdf_report_without_metrics():
    with tempfile.TemporaryDirectory() as tmpdir:
        out_pdf = Path(tmpdir) / "test_report.pdf"
        volumes = {
            "WT": {"voxel_count": 1500, "spacing_x": 1.0, "spacing_y": 1.0, "spacing_z": 1.0, "volume_ml": 1.5},
            "TC": {"voxel_count": 800, "spacing_x": 1.0, "spacing_y": 1.0, "spacing_z": 1.0, "volume_ml": 0.8},
            "ET": {"voxel_count": 300, "spacing_x": 1.0, "spacing_y": 1.0, "spacing_z": 1.0, "volume_ml": 0.3},
        }
        res_path = generate_pdf_report(
            run_id="test-run-123",
            study_id="test-study-456",
            sha256_hash="abc1234567890abcdef1234567890abcdef",
            volumes=volumes,
            metrics=None,
            output_pdf_path=str(out_pdf),
            inference_time=1.23,
            provenance_details={"device": "cpu", "checkpoint_sha256": "860ccb3f1c21c99d0410ad8a1ac4ef6b8fab60cec0a503b0ba42675741a750ae"},
        )
        assert Path(res_path).is_file()
        assert Path(res_path).stat().st_size > 1000  # Non-trivial PDF size


def test_generate_pdf_report_with_metrics():
    with tempfile.TemporaryDirectory() as tmpdir:
        out_pdf = Path(tmpdir) / "test_report_metrics.pdf"
        volumes = {
            "WT": {"voxel_count": 2000, "spacing_x": 1.0, "spacing_y": 1.0, "spacing_z": 1.0, "volume_ml": 2.0},
            "TC": {"voxel_count": 1000, "spacing_x": 1.0, "spacing_y": 1.0, "spacing_z": 1.0, "volume_ml": 1.0},
            "ET": {"voxel_count": 500, "spacing_x": 1.0, "spacing_y": 1.0, "spacing_z": 1.0, "volume_ml": 0.5},
        }
        metrics = {
            "WT": {"dice_score": 0.892, "sensitivity": 0.910, "hd95_mm": 4.5},
            "TC": {"dice_score": 0.845, "sensitivity": 0.860, "hd95_mm": 5.2},
            "ET": {"dice_score": 0.785, "sensitivity": 0.795, "hd95_mm": 6.1},
        }
        res_path = generate_pdf_report(
            run_id="test-run-metrics-789",
            study_id="test-study-789",
            sha256_hash="deadbeef12345678deadbeef12345678",
            volumes=volumes,
            metrics=metrics,
            output_pdf_path=str(out_pdf),
            inference_time=3.45,
            provenance_details={"device": "cpu", "architecture": "SegResNet", "bundle_version": "0.5.4"},
        )
        assert Path(res_path).is_file()
        assert Path(res_path).stat().st_size > 1500
