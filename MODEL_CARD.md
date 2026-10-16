# NeuroScope 3D — Model Card

## Intended use

Research and education prototype for multimodal MRI tumor-subregion segmentation, volumetric measurements, and optional comparison with an expert-provided reference mask. **Not for clinical diagnosis, treatment planning, or independent clinical decision-making.**

## Model source

- Upstream bundle: [MONAI Model Zoo — brats_mri_segmentation](https://github.com/Project-MONAI/model-zoo/tree/dev/models/brats_mri_segmentation)
- Bundle version tracked in repository metadata: 0.5.4
- Architecture: MONAI SegResNet, 4 input channels and 3 output channels
- Upstream training data: BraTS 2018 (as stated by the bundle documentation)
- Expected input order: T1c/T1Gd, T1, T2, FLAIR
- Expected input spacing: 1 × 1 × 1 mm
- Output channels: tumor core (TC), whole tumor (WT), enhancing tumor (ET); postprocessing maps these regions to canonical BraTS labels 1, 2, and 4.

## Relationship to the official project dataset

The project team identified BraTS 2021 and its organizer-provided 40-case development subset as the primary data resource. The MONAI checkpoint's documented training source is BraTS 2018. The existence of this checkpoint does **not** establish that it is trained on BraTS 2021 or that it performs to a particular standard on the team's 40-case subset.

Any reported metrics must be measured by running the verified checkpoint against official cases with matching expert labels. Upstream bundle metrics are not NeuroScope evaluation results and must not be copied into project results as if they were measured locally.

## Checkpoint integrity and readiness

Configure `NEUROSCOPE_MODEL_WEIGHTS` to a verified checkpoint downloaded from an authorized source. The backend refuses to run inference if the path is missing or the checkpoint cannot be loaded into the expected architecture. Use `GET /health/model` to attempt loading and verify compatibility.

A path existing on disk is not by itself proof of model integrity. Before a demonstration, record the checkpoint SHA-256, upstream bundle version, and source. Do not replace the checkpoint with random or untrained weights.

## Data validation

- BraTS 2021 profile: canonical labels 0=background, 1=NCR/NET, 2=edema, 4=ET; expects the provided preprocessed 240 × 240 × 155 geometry and 1 mm isotropic spacing.
- MSD Task01_BrainTumour profile: source labels 0=background, 1=edema, 2=NCR/NET, 3=ET are mapped to canonical labels. Use this profile only for MSD cases.
- The four modalities must have matching shape, affine, and spacing.
- Expert labels must match the reference MRI geometry and the selected dataset profile.
- No automatic resampling is performed; inputs that do not match the configured requirements are rejected.

The API's `case_id` and `source_reference` fields are caller-supplied provenance metadata, not cryptographic proof of data origin. MRI file SHA-256 hashes are retained for traceability.

## Known limitations

- Cross-dataset performance on BraTS 2021 has not been established by this repository.
- Correctness depends on checkpoint provenance, preprocessing, channel order, label semantics, and input geometry.
- Skull-stripping status is currently a heuristic indicator, not a definitive quality assessment.
- Outputs are research estimates and can be wrong.
- A successful software test suite does not establish clinical safety or segmentation quality.

## Licensing

The MONAI bundle documentation states Apache-2.0 for the bundle. The dataset has separate terms: consult the official BraTS 2021 or Medical Segmentation Decathlon terms before use, publication, or redistribution.
