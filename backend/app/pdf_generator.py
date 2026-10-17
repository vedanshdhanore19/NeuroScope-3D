"""Provenance, volumetrics and evaluation PDF report generator (v2: A4, readable layout).

Drop-in replacement for backend/app/pdf_generator.py. The original call in main.py keeps working
unchanged; pass the optional ``extra`` dict to include the additional sections.

extra = {
  "input_files":   {"t1": "BRATS_001_T1w.nii.gz", "t1gd": "...", "t2": "...", "flair": "..."},
  "input_hashes":  {"t1": "<sha256>", "t1gd": "...", "t2": "...", "flair": "..."},   # optional
  "dimensions":    [240, 240, 155],
  "voxel_spacing": [1.0, 1.0, 1.0],
  "dataset_profile": "brats2021",
  "is_skull_stripped": True,
  "expert_filename": "seg.nii.gz",                      # optional
  "expert_volumes": {"WT": {"volume_ml": 150.2, "voxel_count": 150200}, "TC": {...}, "ET": {...}},
  "slice_images":  [("Axial", "/path/axial.png"), ("Coronal", "..."), ("Sagittal", "...")],
  "code_commit":   "a1b2c3d",                           # git rev-parse --short HEAD
  "software":      {"python": "3.11.9", "torch": "2.3.0", "monai": "1.3.0", "nibabel": "5.2.0"},
  "preprocessing": ["step 1 ...", "step 2 ..."],        # overrides the default list
  "warnings":      ["Input does not look skull-stripped ..."],
  "case_label":    "BRATS_001",
  "confidence":    {"WT": {"mean_probability": 0.94, "high_confidence_fraction": 0.81,
                           "uncertain_fraction": 0.07}, "TC": {...}, "ET": {...}},   # from the sigmoid outputs
}
"""
import math
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable, Image, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

try:  # package import inside the backend
    from .config import DISCLAIMER_TEXT
except Exception:  # standalone use / tests
    DISCLAIMER_TEXT = (
        "Research and teaching prototype only. Not for diagnosis or clinical "
        "decision-making. AI predictions may be wrong."
    )

# ---- palette -------------------------------------------------------------------------------
NAVY = colors.HexColor("#0b192c")
SLATE = colors.HexColor("#334155")
MUTED = colors.HexColor("#64748b")
LINE = colors.HexColor("#cbd5e1")
ZEBRA = colors.HexColor("#f8fafc")
BLUE = colors.HexColor("#0284c7")
RED_BG = colors.HexColor("#fef2f2")
RED = colors.HexColor("#991b1b")
AMBER_BG = colors.HexColor("#fffbeb")
AMBER = colors.HexColor("#92400e")
REGION_COLOR = {
    "WT": colors.HexColor("#00a874"),
    "TC": colors.HexColor("#d97706"),
    "ET": colors.HexColor("#dc2626"),
}
REGION_TINT = {
    "WT": colors.HexColor("#e6fcf5"),
    "TC": colors.HexColor("#fff7e6"),
    "ET": colors.HexColor("#fef2f2"),
}
REGION_NAME = {"WT": "Whole tumor", "TC": "Tumor core", "ET": "Enhancing tumor"}
REGION_DEF = {
    "WT": "Edema + necrotic core + enhancing (labels 1, 2, 4)",
    "TC": "Necrotic core + enhancing (labels 1, 4)",
    "ET": "Enhancing tumor (label 4)",
}

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

DEFAULT_PREPROCESSING = [
    "Four co-registered 3D sequences are read with nibabel; shapes and affines must match the T1 image.",
    "Channel order fed to the network: T1c (0), T1 (1), T2 (2), FLAIR (3).",
    "Per-channel z-score normalisation computed over non-zero voxels only.",
    "Sliding-window inference (overlap 0.5) with the MONAI SegResNet checkpoint; sigmoid threshold 0.5.",
    "Channels are TC, WT, ET; nesting ET within TC within WT is enforced, then converted to BraTS labels "
    "1 (necrotic core), 2 (edema), 4 (enhancing tumor).",
    "The label map is written on the input grid and affine as int16 NIfTI.",
    "Inputs are expected to follow the BraTS protocol (1 mm isotropic, skull-stripped, co-registered).",
]

LIMITATIONS = [
    "Research prototype. Not validated clinically and not a medical device. Results must be reviewed by a qualified radiologist.",
    "The bundled model was trained on BraTS 2018 adult glioma (pre-operative, four sequences). Performance on other "
    "populations, scanners, protocols or missing sequences is unknown.",
    "Metrics against one expert mask describe agreement on this single case; they are not a benchmark of the model.",
    "Small structures (especially enhancing tumor) are the least reliable and can vary by a large fraction of their volume.",
    "Model confidence is derived from the network output and is not calibrated. A high-confidence mask can still be wrong or anatomically implausible.",
    "Volumes depend on the voxel spacing stored in the NIfTI header; incorrect headers give incorrect volumes.",
]


# ---- helpers -------------------------------------------------------------------------------
def _styles() -> Dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("t", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=20,
                                leading=24, textColor=colors.white, spaceAfter=2),
        "subtitle": ParagraphStyle("st", parent=base["Normal"], fontSize=9.5, leading=13,
                                   textColor=colors.HexColor("#cfe8f7")),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=13,
                             leading=16, textColor=NAVY, spaceBefore=14, spaceAfter=6),
        "body": ParagraphStyle("b", parent=base["Normal"], fontSize=9.5, leading=13.5, textColor=SLATE,
                               spaceAfter=4),
        "small": ParagraphStyle("s", parent=base["Normal"], fontSize=8.5, leading=11.5, textColor=MUTED),
        "cell": ParagraphStyle("c", parent=base["Normal"], fontSize=9, leading=12, textColor=SLATE),
        "cellb": ParagraphStyle("cb", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=9,
                                leading=12, textColor=NAVY),
        "mono": ParagraphStyle("m", parent=base["Normal"], fontName="Courier", fontSize=8, leading=10.5,
                               textColor=SLATE),
        "head": ParagraphStyle("hd", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=9,
                               leading=12, textColor=colors.white),
        "cardlabel": ParagraphStyle("cl", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=9,
                                    leading=12, textColor=SLATE, alignment=TA_CENTER),
        "cardvalue": ParagraphStyle("cv", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=24,
                                    leading=28, textColor=NAVY, alignment=TA_CENTER),
        "cardsmall": ParagraphStyle("cs", parent=base["Normal"], fontSize=8.5, leading=11.5,
                                    textColor=MUTED, alignment=TA_CENTER),
        "bullet": ParagraphStyle("bl", parent=base["Normal"], fontSize=9.5, leading=13.5, textColor=SLATE,
                                 leftIndent=12, bulletIndent=0, spaceAfter=3),
        "warn": ParagraphStyle("w", parent=base["Normal"], fontSize=9.5, leading=13.5, textColor=AMBER),
        "notice": ParagraphStyle("n", parent=base["Normal"], fontSize=9, leading=12.5, textColor=RED),
    }


def _short(h: Optional[str], head: int = 16, tail: int = 8) -> str:
    if not h:
        return "N/A"
    return h if len(h) <= head + tail + 3 else f"{h[:head]}...{h[-tail:]}"


def _equiv_diameter_mm(volume_ml: float) -> float:
    v_mm3 = max(volume_ml, 0.0) * 1000.0
    return (6.0 * v_mm3 / math.pi) ** (1.0 / 3.0) if v_mm3 > 0 else 0.0


def _table(data, col_widths, header=True, header_color=BLUE, zebra=True, extra_style=None):
    t = Table(data, colWidths=col_widths, repeatRows=1 if header else 0)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
        ("BOX", (0, 0), (-1, -1), 0.75, LINE),
    ]
    if header:
        style += [("BACKGROUND", (0, 0), (-1, 0), header_color)]
    if zebra:
        start = 1 if header else 0
        for r in range(start, len(data)):
            if (r - start) % 2 == 1:
                style.append(("BACKGROUND", (0, r), (-1, r), ZEBRA))
    if extra_style:
        style += extra_style
    t.setStyle(TableStyle(style))
    return t


def _kv_table(rows, st, w1=48 * mm):
    data = [[Paragraph(k, st["cellb"]), Paragraph(v, st["cell"])] for k, v in rows]
    return _table(data, [w1, CONTENT_W - w1], header=False)


def _box(text_or_paras, st, bg, border, style_key):
    paras = text_or_paras if isinstance(text_or_paras, list) else [Paragraph(text_or_paras, st[style_key])]
    t = Table([[paras]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg), ("BOX", (0, 0), (-1, -1), 1, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def _make_footer(run_id: str):
    def _footer(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, 16 * mm, PAGE_W - MARGIN, 16 * mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(RED)
        canvas.drawString(MARGIN, 11.5 * mm, DISCLAIMER_TEXT[:150])
        canvas.setFillColor(MUTED)
        canvas.drawString(MARGIN, 7.5 * mm, f"NeuroScope 3D  |  Run {run_id}")
        canvas.drawRightString(PAGE_W - MARGIN, 7.5 * mm, f"Page {doc.page}")
        canvas.restoreState()
    return _footer



def _conf_level(p: float) -> str:
    if p >= 0.90:
        return "High"
    if p >= 0.75:
        return "Moderate"
    return "Low"


def _conf_bg(p: float):
    if p >= 0.90:
        return colors.HexColor("#d1fae5")
    if p >= 0.75:
        return colors.HexColor("#fef3c7")
    return colors.HexColor("#fee2e2")


def _image_row(images: List[Tuple[str, str]], st):
    cells, n = [], max(1, min(3, len(images)))
    cell_w = CONTENT_W / n
    for caption, path in images[:3]:
        try:
            from PIL import Image as PILImage
            with PILImage.open(path) as im:
                w, h = im.size
            iw = cell_w - 8
            ih = iw * h / w
            max_h = 62 * mm
            if ih > max_h:
                ih, iw = max_h, max_h * w / h
            cells.append([Image(path, width=iw, height=ih), Paragraph(caption, st["cardsmall"])])
        except Exception:
            cells.append([Paragraph(f"(image unavailable: {caption})", st["small"])])
    t = Table([cells], colWidths=[cell_w] * len(cells))
    t.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0a0f1d")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def _dice_cell_bg(v: float):
    if v >= 0.85:
        return colors.HexColor("#d1fae5")
    if v >= 0.70:
        return colors.HexColor("#fef3c7")
    return colors.HexColor("#fee2e2")


# ---- main entry ----------------------------------------------------------------------------
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
    extra: Optional[dict] = None,
):
    """Generate the PDF report. Signature is backward compatible with the original generator."""
    extra = extra or {}
    prov = provenance_details or {}
    st = _styles()
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    doc = SimpleDocTemplate(
        output_pdf_path, pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=14 * mm, bottomMargin=22 * mm,
        title=f"NeuroScope 3D report {run_id}", author="NeuroScope 3D",
    )
    story: list = []

    # Title band
    case_label = extra.get("case_label")
    sub = f"Run ID: {run_id}   |   Generated: {now}"
    if case_label:
        sub = f"Case: {case_label}   |   " + sub
    band = Table([[[Paragraph("NeuroScope 3D", st["title"]),
                    Paragraph("MRI Tumor Segmentation, Volumetrics &amp; Provenance Report", st["subtitle"]),
                    Spacer(1, 3), Paragraph(sub, st["subtitle"])]]], colWidths=[CONTENT_W])
    band.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 14), ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 12), ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    story += [band, Spacer(1, 8)]

    story.append(_box(
        "<b>RESEARCH &amp; ACADEMIC PROTOTYPE.</b> " + DISCLAIMER_TEXT +
        " This software has not received regulatory clearance (FDA, CE-MDR) and must not be used for "
        "diagnosis, staging or treatment planning. All outputs must be independently reviewed by a "
        "qualified radiologist.", st, RED_BG, colors.HexColor("#fca5a5"), "notice"))

    # Automatic sanity warnings
    warnings: List[str] = list(extra.get("warnings") or [])
    wt_ml = float(volumes.get("WT", {}).get("volume_ml", 0.0) or 0.0)
    if extra.get("is_skull_stripped") is False:
        warnings.append("The input does not look skull-stripped. The model expects skull-stripped BraTS-style "
                        "volumes; results for this input may be unreliable.")
    if wt_ml > 800:
        warnings.append(f"The predicted whole-tumor volume ({wt_ml:,.1f} mL) is implausibly large. Check input "
                        "orientation, sequence assignment and preprocessing before trusting this result.")
    if wt_ml == 0:
        warnings.append("No tumor voxels were predicted for this study.")
    if warnings:
        story.append(Spacer(1, 6))
        story.append(_box([Paragraph("<b>Warnings</b>", st["warn"])] +
                          [Paragraph("&bull; " + w, st["warn"]) for w in warnings],
                          st, AMBER_BG, colors.HexColor("#fcd34d"), "warn"))

    conf = extra.get("confidence") or {}
    # 1. Key findings (cards)
    story.append(Paragraph("1. Key findings", st["h2"]))
    detected = wt_ml > 0
    wt_conf = conf.get("WT")
    det_text = ("<b>Tumor detected by the model: " + ("Yes" if detected else "No") + "</b>")
    if detected and wt_conf:
        wp = float(wt_conf["mean_probability"])
        det_text += (f" &nbsp;|&nbsp; model confidence in the whole-tumor mask: <b>{wp * 100:.1f}%</b> "
                     f"({_conf_level(wp)})")
    story.append(Paragraph(det_text, st["body"]))
    cards, styles_cards = [], [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.75, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.75, colors.white),
        ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]
    for i, region in enumerate(("WT", "TC", "ET")):
        v = volumes.get(region)
        if not v:
            cards.append([Paragraph(region, st["cardlabel"]), Paragraph("N/A", st["cardvalue"])])
            continue
        ml = float(v["volume_ml"])
        cards.append([
            Paragraph(f"{region}  -  {REGION_NAME[region]}", st["cardlabel"]),
            Spacer(1, 3),
            Paragraph(f"{ml:,.2f} mL", st["cardvalue"]),
            Spacer(1, 3),
            Paragraph(f"{int(v['voxel_count']):,} voxels", st["cardsmall"]),
            Paragraph(f"Equivalent diameter {_equiv_diameter_mm(ml):.1f} mm", st["cardsmall"]),
        ] + ([Paragraph(f"<b>Model confidence {float(conf[region]['mean_probability']) * 100:.1f}%</b> "
                        f"({_conf_level(float(conf[region]['mean_probability']))})", st["cardsmall"])]
             if conf.get(region) else []))
        styles_cards += [("BACKGROUND", (i, 0), (i, 0), REGION_TINT[region]),
                         ("LINEABOVE", (i, 0), (i, 0), 3, REGION_COLOR[region])]
    card_t = Table([cards], colWidths=[CONTENT_W / 3] * 3)
    card_t.setStyle(TableStyle(styles_cards))
    story.append(card_t)
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Equivalent diameter is the diameter of a sphere with the same volume. It is derived from the volume and "
        "is not a measured maximum diameter.", st["small"]))

    # Visual overview
    slice_images = extra.get("slice_images") or []
    if slice_images:
        story.append(Paragraph("2. Segmentation overview (central slices)", st["h2"]))
        story.append(_image_row(slice_images, st))
        story.append(Spacer(1, 4))
        story.append(Paragraph(
            "Overlay colors: green = edema, amber = necrotic / non-enhancing core, red = enhancing tumor. "
            "Slices are the central planes through the predicted tumor.", st["small"]))
    sec = 3 if slice_images else 2

    # Volumetrics (kept together on one page)
    vol_block: list = []
    vol_block.append(Paragraph(f"{sec}. Volumetric measurements", st["h2"]))
    vol_block.append(Paragraph(
        "<b>Formula:</b> Volume (mL) = voxel count x voxel volume (mm3) / 1000, where voxel volume is the product "
        "of the three voxel spacings in the NIfTI header.", st["body"]))
    rows = [[Paragraph(h, st["head"]) for h in
             ("Region", "Definition", "Voxels", "Voxel vol. (mm3)", "Volume (mL)")]]
    worked = []
    for region in ("WT", "TC", "ET"):
        v = volumes.get(region)
        if not v:
            continue
        vv = float(v.get("voxel_volume_mm3") or (v["spacing_x"] * v["spacing_y"] * v["spacing_z"]))
        rows.append([
            Paragraph(f"<b>{region}</b> {REGION_NAME[region]}", st["cell"]),
            Paragraph(REGION_DEF[region], st["cell"]),
            Paragraph(f"{int(v['voxel_count']):,}", st["cell"]),
            Paragraph(f"{vv:.3f}", st["cell"]),
            Paragraph(f"<b>{float(v['volume_ml']):.3f}</b>", st["cell"]),
        ])
        worked.append(f"{region}: {int(v['voxel_count']):,} x {vv:.3f} mm3 / 1000 = {float(v['volume_ml']):.3f} mL")
    vol_block.append(_table(rows, [38 * mm, 58 * mm, 24 * mm, 27 * mm, CONTENT_W - 147 * mm]))
    spacing = None
    for v in volumes.values():
        spacing = (v.get("spacing_x"), v.get("spacing_y"), v.get("spacing_z"))
        break
    if spacing and all(s is not None for s in spacing):
        vol_block.append(Spacer(1, 4))
        vol_block.append(Paragraph(
            f"Voxel spacing used: {spacing[0]:.3f} x {spacing[1]:.3f} x {spacing[2]:.3f} mm.", st["small"]))
    if worked:
        vol_block.append(Paragraph("<b>Worked calculation:</b><br/>" + "<br/>".join(worked), st["mono"]))
    story.append(KeepTogether(vol_block))
    sec += 1

    # Model confidence
    if conf:
        story.append(Paragraph(f"{sec}. Model confidence in the segmentation", st["h2"]))
        story.append(Paragraph(
            "The network outputs a probability for every voxel and region. The values below summarise those "
            "probabilities <b>inside each predicted region</b>. They describe how sure the model is about the "
            "<i>outline it drew</i>. They are <b>not</b> the probability that a patient has a tumor, that a tumor is "
            "malignant, or any diagnosis, and they are not calibrated against real-world accuracy.", st["body"]))
        rows = [[Paragraph(h, st["head"]) for h in
                 ("Region", "Mean probability", "High-confidence voxels (p >= 0.9)",
                  "Uncertain voxels (0.3 < p < 0.7)", "Level")]]
        cstyle = []
        for i, region in enumerate(("WT", "TC", "ET"), start=1):
            c = conf.get(region)
            if not c:
                continue
            mp = float(c["mean_probability"])
            rows.append([
                Paragraph(f"<b>{region}</b> {REGION_NAME[region]}", st["cell"]),
                Paragraph(f"{mp * 100:.1f}%", st["cell"]),
                Paragraph(f"{float(c.get('high_confidence_fraction', 0)) * 100:.1f}%", st["cell"]),
                Paragraph(f"{float(c.get('uncertain_fraction', 0)) * 100:.1f}%", st["cell"]),
                Paragraph(f"<b>{_conf_level(mp)}</b>", st["cell"]),
            ])
            cstyle.append(("BACKGROUND", (4, i), (4, i), _conf_bg(mp)))
        story.append(_table(rows, [42 * mm, 28 * mm, 44 * mm, 44 * mm, CONTENT_W - 158 * mm],
                            zebra=False, extra_style=cstyle))
        story.append(Spacer(1, 3))
        story.append(Paragraph("Level (illustrative): High >= 90%, Moderate 75 to 90%, Low < 75% mean probability. "
                               "Low-confidence results deserve extra scrutiny.", st["small"]))
        sec += 1

    # Evaluation vs expert mask
    if metrics:
        story.append(Paragraph(f"{sec}. Agreement with the expert reference mask", st["h2"]))
        story.append(Paragraph(
            "Metrics compare the predicted nested regions with the uploaded expert label map"
            + (f" (<b>{extra['expert_filename']}</b>)" if extra.get("expert_filename") else "") +
            ". Dice and sensitivity range from 0 to 1 (higher is better); HD95 is the 95th-percentile "
            "Hausdorff distance in millimetres (lower is better). These values describe this single case only.",
            st["body"]))
        exp_vol = extra.get("expert_volumes") or {}
        hdr = ["Region", "Dice", "Sensitivity", "HD95 (mm)"]
        if exp_vol:
            hdr += ["Predicted (mL)", "Expert (mL)", "Difference"]
        rows = [[Paragraph(h, st["head"]) for h in hdr]]
        extra_style = []
        for i, region in enumerate(("WT", "TC", "ET"), start=1):
            m = metrics.get(region)
            if not m:
                continue
            dice, sens = float(m["dice_score"]), float(m["sensitivity"])
            hd = m.get("hd95_mm")
            row = [Paragraph(f"<b>{region}</b>", st["cell"]), Paragraph(f"{dice:.4f}", st["cell"]),
                   Paragraph(f"{sens:.4f}", st["cell"]),
                   Paragraph(f"{float(hd):.2f}" if hd is not None else "N/A", st["cell"])]
            if exp_vol:
                pv = float(volumes.get(region, {}).get("volume_ml", 0.0))
                ev = float(exp_vol.get(region, {}).get("volume_ml", 0.0))
                diff = pv - ev
                pct = f" ({diff / ev * 100:+.1f}%)" if ev > 0 else ""
                row += [Paragraph(f"{pv:.2f}", st["cell"]), Paragraph(f"{ev:.2f}", st["cell"]),
                        Paragraph(f"{diff:+.2f}{pct}", st["cell"])]
            rows.append(row)
            extra_style.append(("BACKGROUND", (1, i), (1, i), _dice_cell_bg(dice)))
        widths = [24 * mm, 24 * mm, 28 * mm, 26 * mm]
        if exp_vol:
            rest = (CONTENT_W - sum(widths)) / 3
            widths += [rest, rest, rest]
        else:
            widths = [CONTENT_W / 4] * 4
        story.append(_table(rows, widths, header_color=colors.HexColor("#0f766e"), zebra=False,
                            extra_style=extra_style))
        story.append(Spacer(1, 3))
        story.append(Paragraph("Dice cell colors (illustrative): green &gt;= 0.85, amber 0.70 to 0.85, red &lt; 0.70.",
                               st["small"]))
        sec += 1

    # Study + provenance
    story.append(Paragraph(f"{sec}. Study details and provenance", st["h2"]))
    files = extra.get("input_files") or {}
    hashes = extra.get("input_hashes") or {}
    order = (("t1", "T1"), ("t1gd", "T1Gd"), ("t2", "T2"), ("flair", "FLAIR"))
    inputs_html = []
    for key, label in order:
        if key in files or key in hashes:
            inputs_html.append(f"<b>{label}:</b> {files.get(key, '-')}  <font name='Courier' size='7.5'>"
                               f"{_short(hashes.get(key), 12, 6) if hashes.get(key) else ''}</font>")
    rows = [("Study run ID", f"<font name='Courier'>{run_id}</font>"), ("Report generated", now)]
    if inputs_html:
        rows.append(("Input files (SHA-256)", "<br/>".join(inputs_html)))
    if extra.get("expert_filename"):
        rows.append(("Expert mask", extra["expert_filename"]))
    rows.append(("Combined input SHA-256", f"<font name='Courier' size='7.5'>{sha256_hash or 'N/A'}</font>"))
    if extra.get("dataset_profile"):
        rows.append(("Dataset profile", str(extra["dataset_profile"])))
    if extra.get("dimensions"):
        rows.append(("Volume dimensions", " x ".join(str(d) for d in extra["dimensions"]) + " voxels"))
    if extra.get("voxel_spacing"):
        rows.append(("Voxel spacing", " x ".join(f"{float(s):.3f}" for s in extra["voxel_spacing"]) + " mm"))
    if extra.get("is_skull_stripped") is not None:
        rows.append(("Skull-stripped (heuristic)", "Yes" if extra["is_skull_stripped"] else "No / uncertain"))
    story.append(_kv_table(rows, st))
    story.append(Spacer(1, 8))

    ckpt = prov.get("checkpoint_sha256") or "N/A"
    soft = extra.get("software") or {}
    model_rows = [
        ("Model", model_name),
        ("Architecture", prov.get("architecture", "SegResNet (MONAI)")),
        ("Bundle / version", f"{prov.get('bundle_name', 'brats_mri_segmentation')} "
                             f"v{prov.get('bundle_version', '0.5.4')}"),
        ("Licence", "Apache-2.0 (MONAI Model Zoo)"),
        ("Training data", "BraTS 2018 challenge (adult glioma, pre-operative)"),
        ("Checkpoint SHA-256", f"<font name='Courier' size='7.5'>{ckpt}</font>"),
        ("Execution device", str(prov.get("device", "cpu")).upper()),
        ("Inference runtime", f"{inference_time:.2f} seconds"),
        ("Channel protocol", "T1c (0), T1 (1), T2 (2), FLAIR (3)"),
        ("Code version (git commit)", f"<font name='Courier'>{extra.get('code_commit') or 'unknown'}</font>"),
    ]
    if soft:
        model_rows.append(("Software", ", ".join(f"{k} {v}" for k, v in soft.items())))
    story.append(KeepTogether([Paragraph("<b>Model and software</b>", st["body"]), _kv_table(model_rows, st)]))
    sec += 1

    # Preprocessing
    story.append(Paragraph(f"{sec}. Preprocessing and inference pipeline", st["h2"]))
    for i, step in enumerate(extra.get("preprocessing") or DEFAULT_PREPROCESSING, start=1):
        story.append(Paragraph(step, st["bullet"], bulletText=f"{i}."))
    sec += 1

    # Limitations
    story.append(Paragraph(f"{sec}. Limitations", st["h2"]))
    for item in LIMITATIONS:
        story.append(Paragraph(item, st["bullet"], bulletText="\u2022"))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=LINE, spaceAfter=6))
    story.append(Paragraph(
        "End of report. " + DISCLAIMER_TEXT, st["small"]))

    footer = _make_footer(run_id)
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return output_pdf_path