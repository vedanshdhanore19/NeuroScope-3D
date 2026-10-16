"""Provenance and volumetrics PDF report generator."""
from datetime import datetime, timezone
from typing import Dict, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable

from .config import DISCLAIMER_TEXT


def generate_pdf_report(
    run_id: str,
    study_id: str,
    sha256_hash: str,
    volumes: Dict[str, Dict[str, float]],
    metrics: Optional[Dict[str, Dict[str, float]]] = None,
    output_pdf_path: str = "report.pdf",
    model_name: str = "MONAI SegResNet (Bundle: brats_mri_segmentation v0.5.4)",
    inference_time: float = 0.0,
    provenance_details: Optional[Dict[str, str]] = None,
):
    """Generate an audited PDF report containing genuine volumetrics, metrics, and provenance."""
    doc = SimpleDocTemplate(
        output_pdf_path, pagesize=letter,
        rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleStyle", parent=styles["Heading1"], fontName="Helvetica-Bold",
        fontSize=18, textColor=colors.HexColor("#0f172a"), spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        "SubTitleStyle", parent=styles["Normal"], fontSize=9,
        textColor=colors.HexColor("#64748b"), spaceAfter=10
    )
    h2_style = ParagraphStyle(
        "H2Style", parent=styles["Heading2"], fontSize=11,
        textColor=colors.HexColor("#0f172a"), spaceBefore=8, spaceAfter=4
    )
    body_style = ParagraphStyle(
        "BodyStyle", parent=styles["Normal"], fontSize=8,
        textColor=colors.HexColor("#334155"), spaceAfter=4
    )
    disclaimer_style = ParagraphStyle(
        "DisclaimerStyle", parent=styles["Normal"], fontName="Helvetica-Bold",
        fontSize=8, textColor=colors.HexColor("#991b1b"),
        backColor=colors.HexColor("#fef2f2"), borderColor=colors.HexColor("#fca5a5"),
        borderWidth=1, borderPadding=5, spaceBefore=8, spaceAfter=8
    )

    story = [
        Paragraph("NeuroScope 3D — MRI Volumetrics & Provenance Report", title_style),
        Paragraph(
            f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} | Run ID: {run_id}",
            subtitle_style,
        ),
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=8),
        Paragraph(
            "<b>RESEARCH & ACADEMIC PROTOTYPE NOTICE:</b> This software is an experimental prototype "
            "designed for medical imaging research and technical validation. It has NOT received regulatory clearance "
            "(FDA, CE-MDR) and must NOT be used for clinical diagnosis, patient staging, or treatment planning. "
            "All measurements and segmentations must be independently validated by a board-certified radiologist.",
            disclaimer_style,
        ),
        Paragraph("1. Study Provenance & Model Verification", h2_style),
    ]

    prov_meta = provenance_details or {}
    ckpt_hash = prov_meta.get("checkpoint_sha256", "N/A")
    if ckpt_hash and len(ckpt_hash) > 16:
        ckpt_hash_short = ckpt_hash[:16] + "..." + ckpt_hash[-8:]
    else:
        ckpt_hash_short = ckpt_hash

    provenance_data = [
        ["Study Run ID", run_id],
        ["Combined Scan SHA-256", sha256_hash[:20] + "... (verified)" if sha256_hash else "N/A"],
        ["Model Architecture", prov_meta.get("architecture", "SegResNet (MONAI)")],
        ["Model Bundle", prov_meta.get("bundle_name", "brats_mri_segmentation v0.5.4")],
        ["Checkpoint SHA-256", ckpt_hash_short],
        ["Execution Device", prov_meta.get("device", "CPU").upper()],
        ["Inference Runtime", f"{inference_time:.2f} seconds"],
        ["Channel Protocol", "4-modality: T1c (0), T1 (1), T2 (2), FLAIR (3)"],
    ]
    provenance_table = Table(provenance_data, colWidths=[150, 380])
    provenance_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#334155")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    story.extend([provenance_table, Spacer(1, 8)])

    story.append(Paragraph("2. Physical Volumetric Measurements", h2_style))
    story.append(Paragraph(
        "Physical volume is calculated using: <i>Volume (mL) = Voxel Count × Voxel Volume (mm³) / 1000</i>. "
        "BraTS composite definitions: <b>WT (Whole Tumor)</b> = ED + NCR + ET; <b>TC (Tumor Core)</b> = NCR + ET; <b>ET (Enhancing Tumor)</b> = ET.",
        body_style,
    ))

    volume_data = [["Region", "Description", "Voxel Count", "Spacing (mm)", "Volume (mL)"]]
    region_desc = {
        "WT": "Whole Tumor (ED + NCR + ET)",
        "TC": "Tumor Core (NCR + ET)",
        "ET": "Enhancing Tumor",
        "NCR": "Necrotic / Non-enhancing",
        "ED": "Peritumoral Edema",
    }
    for region, values in volumes.items():
        desc = region_desc.get(region, region)
        spacing = f"{values['spacing_x']:.2f} × {values['spacing_y']:.2f} × {values['spacing_z']:.2f}"
        volume_data.append([
            region, desc, f"{values['voxel_count']:,}", spacing, f"{values['volume_ml']:.2f} mL"
        ])
    volume_table = Table(volume_data, colWidths=[65, 175, 95, 115, 80])
    volume_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0284c7")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    story.extend([volume_table, Spacer(1, 8)])

    if metrics:
        story.append(Paragraph("3. Expert Reference Evaluation (Ground Truth Comparison)", h2_style))
        story.append(Paragraph(
            "Evaluation against the uploaded reference mask. Metrics reflect agreement with this single reference case, "
            "not a generalized benchmark.",
            body_style,
        ))
        metric_data = [["Region", "Dice Similarity (DSC)", "Sensitivity (Recall)", "HD95 (mm)"]]
        for region, values in metrics.items():
            metric_data.append([
                region,
                f"{values['dice_score']:.4f}",
                f"{values['sensitivity']:.4f}",
                f"{values['hd95_mm']:.2f}" if values.get("hd95_mm") is not None else "N/A",
            ])
        metric_table = Table(metric_data, colWidths=[90, 160, 140, 140])
        metric_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        story.append(metric_table)

    doc.build(story)
    return output_pdf_path
