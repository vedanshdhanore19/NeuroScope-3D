# Model Card: MONAI BraTS MRI Segmentation (`brats_mri_segmentation`)

## 1. Model Overview

- **Model Name:** BraTS Multimodal Brain Tumor Subregion Segmentation
- **Model Bundle Name:** `brats_mri_segmentation`
- **Bundle Version:** `0.5.4`
- **Model Architecture:** SegResNet (Encoder-Decoder with Autoencoder Regularization branch)
- **Framework:** MONAI >= 1.2.0, PyTorch >= 2.0.0
- **Official Model Zoo Source:** [Project MONAI Model Zoo](https://github.com/Project-MONAI/model-zoo/tree/dev/models/brats_mri_segmentation)
- **Hosting Repository:** Hugging Face Hub (`MONAI/brats_mri_segmentation`)
- **Verified Checkpoint File:** `backend/app/models/brats_mri_segmentation/brats_mri_segmentation/models/model.pt`
- **Checkpoint SHA-256:** `860ccb3f1c21c99d0410ad8a1ac4ef6b8fab60cec0a503b0ba42675741a750ae`
- **Checkpoint Size:** 18,840,620 bytes (~18.8 MB)

---

## 2. Training Data & Provenance

> **Important Data Lineage Notice:** This model bundle was trained exclusively on the **BraTS 2018 Challenge Dataset**. It was **not** trained on Medical Segmentation Decathlon (MSD) Task01 or BraTS 2021.

- **Data Source:** Brain Tumor Segmentation (BraTS) 2018 Challenge ([CBICA / University of Pennsylvania](https://www.med.upenn.edu/sbia/brats2018/data.html))
- **Cohort:** Pre-operative multimodal MRI scans of glioblastoma (GBM/HGG) and lower-grade glioma (LGG).
- **Scanner Protocols:** Multicenter scans acquired across different clinical MRI scanners (1.5T and 3T) with varying acquisition protocols.
- **Image Preprocessing in Dataset:** Co-registered to standard anatomical space (SRI24), resampled to isotropic 1 mm³ resolution, and skull-stripped.

---

## 3. Network Architecture Specifications

The model implements `monai.networks.nets.SegResNet`:

- **Spatial Dimensions:** 3D
- **Input Channels:** 4
- **Output Channels:** 3 (Sigmoid probabilities for overlapping tumor regions)
- **Initial Filters:** 16
- **Encoder Blocks (down):** `[1, 2, 2, 4]`
- **Decoder Blocks (up):** `[1, 1, 1]`
- **Dropout Probability:** `0.2`
- **Norm:** GroupNorm (32 groups or 8 per channel)

---

## 4. Input & Output Tensor Specifications

### Input Modalities (Strict 4-Channel Order)

| Channel Index | Modality | Protocol Description |
|---|---|---|
| `0` | **T1c / T1Gd** | T1-weighted contrast-enhanced (Gadolinium) |
| `1` | **T1** | T1-weighted baseline anatomical MRI |
| `2` | **T2** | T2-weighted fluid/edema sensitive MRI |
| `3` | **FLAIR** | Fluid Attenuated Inversion Recovery |

*Spatial resolution must be co-registered, skull-stripped, and 1 mm³ isotropic or resampled.*

### Output Channels (Sigmoid Region Probability)

| Channel Index | Region | Anatomical Meaning |
|---|---|---|
| `0` | **TC (Tumor Core)** | Necrotic non-enhancing core + Enhancing tumor |
| `1` | **WT (Whole Tumor)** | Peritumoral edema + Necrotic core + Enhancing tumor |
| `2` | **ET (Enhancing Tumor)** | Active gadolinium-enhancing tumor tissue |

### Discrete Label Map (BraTS Mapping)

Predictions are discretized at threshold `0.5` and mapped into mutually exclusive discrete integer labels:

- **Label 0:** Background
- **Label 1 (NCR/NET):** Necrotic & non-enhancing tumor core (`TC & ~ET`)
- **Label 2 (ED):** Peritumoral vasogenic edema (`WT & ~TC`)
- **Label 4 (ET):** Active enhancing tumor (`ET & TC & WT`)

---

## 5. Official Validation Performance (BraTS 2018 Validation Set)

*Benchmark metrics reported by the official MONAI bundle metadata:*

| Target Region | Mean Dice Similarity Coefficient (DSC) |
|---|---|
| **Whole Tumor (WT)** | **0.9026** (90.3%) |
| **Tumor Core (TC)** | **0.8559** (85.6%) |
| **Enhancing Tumor (ET)** | **0.7905** (79.1%) |
| **Mean Validation Dice** | **0.8518** (85.2%) |

---

## 6. Preprocessing & Inference Configuration

- **Intensity Normalization:** Non-zero channel-wise Z-score normalization (`NormalizeIntensityd(nonzero=True, channel_wise=True)`):
  $$\tilde{x}_{c} = \frac{x_{c} - \mu_{c,\text{nonzero}}}{\sigma_{c,\text{nonzero}} + 10^{-8}}$$
- **Sliding-Window Inference:**
  - Standard ROI size: `[240, 240, 160]` (adapted adaptively if input dimensions are smaller)
  - Overlap: `0.5`
  - Sliding-window batch size: `1` (CPU-safe)
  - Blending mode: Gaussian / Constant

---

## 7. Limitations & Generalization Risks

1. **Skull-stripping prerequisite:** The model was trained on skull-stripped images. Supplying non-skull-stripped volumes containing bone, scalp, or fat signals will produce spurious false positives.
2. **Scanner artifacts & motion:** Scans with severe motion, susceptibility artifacts, or field inhomogeneity (bias field) may cause significant segmentation error.
3. **Tumor type boundaries:** Trained on adult gliomas (GBM/LGG). Does not generalize reliably to pediatric brain tumors, brain metastases, meningiomas, or postoperative resection cavities.
4. **Contrast modality essentiality:** Channel 0 (T1Gd) is essential for identifying enhancing tumor boundaries. Supplying an unenhanced T1 scan in channel 0 invalidates ET delineations.

---

## 8. Regulatory & Clinical Disclaimer

> **ACADEMIC PROTOTYPE NOTICE:**  
> This machine learning model and inference pipeline are strictly for academic, educational, and computational research purposes.  
> This software is **NOT** a medical device, is **NOT** CE-MDR or FDA 510(k) certified, and must **NOT** be used for clinical diagnosis, patient management, or surgical guidance.  
> Model outputs are probabilistic estimates that must be reviewed, verified, or discarded by a board-certified neuroradiologist.
