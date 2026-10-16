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
    model_name: str = "Model provenance not configured",
    inference_time: float = 0.0,
    dataset_profile: Optional[str] = None,
    case_id: Optional[str] = None,
    source_reference: Optional[str] = None,
):
    """Generate a report; caller must pass verified model provenance."""
    doc = SimpleDocTemplate(
        output_pdf_path, pagesize=letter,
        rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleStyle", parent=styles["Heading1"], fontName="Helvetica-Bold",
        fontSize=20, textColor=colors.HexColor("#1e293b"), spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        "SubTitleStyle", parent=styles["Normal"], fontSize=10,
        textColor=colors.HexColor("#64748b"), spaceAfter=12
    )
    h2_style = ParagraphStyle(
        "H2Style", parent=styles["Heading2"], fontSize=12,
        textColor=colors.HexColor("#0f172a"), spaceBefore=10, spaceAfter=6
    )
    body_style = ParagraphStyle(
        "BodyStyle", parent=styles["Normal"], fontSize=9,
        textColor=colors.HexColor("#334155"), spaceAfter=4
    )
    disclaimer_style = ParagraphStyle(
        "DisclaimerStyle", parent=styles["Normal"], fontName="Helvetica-Bold",
        fontSize=8, textColor=colors.HexColor("#b91c1c"),
        backColor=colors.HexColor("#fef2f2"), borderColor=colors.HexColor("#fca5a5"),
        borderWidth=1, borderPadding=6, spaceBefore=12, spaceAfter=12
    )

    story = [
        Paragraph("NeuroScope 3D — Provenance & Volumetrics Report", title_style),
        Paragraph(
            f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')} | Run ID: {run_id}",
            subtitle_style,
        ),
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e2e8f0"), spaceAfter=10),
        Paragraph(f"<b>MANDATORY DISCLAIMER:</b> {DISCLAIMER_TEXT}", disclaimer_style),
        Paragraph("1. Study & Provenance Metadata", h2_style),
    ]
    provenance_data = [
        ["Study ID", study_id],
        ["Dataset Profile", dataset_profile or "Not recorded"],
        ["Official Case ID", case_id or "Not provided"],
        ["Declared Data Source", source_reference or "Not recorded"],
        ["Combined Data SHA-256", sha256_hash],
        ["Model Architecture / Checkpoint", model_name],
        ["Inference Time", f"{inference_time:.2f} seconds"],
        ["Performance Target", "Not independently benchmarked by this report generator"],
    ]
    provenance_table = Table(provenance_data, colWidths=[150, 380])
    provenance_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#334155")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    story.extend([provenance_table, Spacer(1, 10)])
    story.append(Paragraph("2. Measured Region Volumetrics", h2_style))
    story.append(Paragraph(
        "Formula: <i>Volume (mL) = Voxel Count × Voxel Volume (mm³) / 1000</i>",
        body_style,
    ))

    volume_data = [["Region", "Voxel Count", "Spacing (mm)", "Volume (mL)"]]
    for region, values in volumes.items():
        spacing = f"{values['spacing_x']:.2f} × {values['spacing_y']:.2f} × {values['spacing_z']:.2f}"
        volume_data.append([
            region, f"{values['voxel_count']:,}", spacing, f"{values['volume_ml']:.2f} mL"
        ])
    volume_table = Table(volume_data, colWidths=[120, 130, 150, 130])
    volume_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0284c7")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    story.extend([volume_table, Spacer(1, 10)])

    if metrics:
        story.append(Paragraph("3. Expert Reference Evaluation", h2_style))
        metric_data = [["Region", "Dice Similarity Coefficient", "Sensitivity", "HD95 (mm)"]]
        for region, values in metrics.items():
            metric_data.append([
                region, f"{values['dice_score']:.4f}",
                f"{values['sensitivity']:.4f}", f"{values['hd95_mm']:.2f}",
            ])
        metric_table = Table(metric_data, colWidths=[105, 155, 115, 105])
        metric_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        story.append(metric_table)

    doc.build(story)
    return output_pdf_path
