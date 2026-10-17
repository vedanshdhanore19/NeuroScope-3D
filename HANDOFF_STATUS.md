# NeuroScope-3D — Handoff Status

## Current Status: Viewer + preprocessing implementation pass in progress

### Implemented in this pass
1. **Inference geometry (C1):**
   - Canonicalizes all four MRI sequences to RAS.
   - Resamples images to a shared 1 mm isotropic grid before SegResNet inference.
   - Restores the predicted BraTS label map to the original T1 shape and affine using nearest-neighbour resampling.
   - Adds deterministic seeds and deterministic PyTorch algorithms.
   - Added regression tests for canonical RAS/1 mm preprocessing and restoration.
2. **Fail-safe validation (C2):**
   - Adds explicit corrupt-gzip detection.
   - Adds `NOT_A_BRAIN` plausibility rejection for non-zero physical extent outside 300–2500 mL and near-uniform volumes.
   - Keeps skull stripping as a validation result/warning rather than an automatic rejection.
   - Expert masks are exempt from brain-volume plausibility checks.
3. **2D/3D visualization engine:**
   - Shared ED/NCR/ET palette: teal `#2DD4BF`, amber `#FBBF24`, rose-red `#F43F5E`.
   - Slice renderer uses 0.5–99.5 percentile windowing, gamma, optional CLAHE, high-quality upscaling, translucent overlays, and crisp label contours.
   - Volume info now reports affine and orientation codes in addition to shape/spacing/planes.
   - 3D meshes are generated in patient/world millimetre space from cropped, smoothed masks; BRAIN, WT, TC and ET are supported.
   - Frontend 3D viewer now computes normals in-browser, displays a translucent brain shell plus tumor regions, and provides independent opacity controls.
4. **MVP scaffolding:**
   - Added `scripts/predict.py` for one-shot inference and optional expert comparison.
   - Added `scripts/evaluate.py` which deliberately writes a `not yet run` evaluation result rather than inventing metrics.
   - Added `backend/app/confidence.py` for honest outline-confidence statistics (not disease probability).

### Existing project capabilities retained
- Existing FastAPI validation, segmentation, study, prediction/report download, slice and mesh routes remain in place.
- Existing React landing/upload/results/report screens were not intentionally restyled.
- Research disclaimer remains part of the backend health contract: `Research and teaching prototype only. Not for diagnosis or clinical decision-making. AI predictions may be wrong.`

### Verification note
The GitHub connector can update and inspect repository files, but this environment does not provide a shell with access to clone the GitHub repository, so `pytest`/`npm run build` could not be executed here. The branch should be run locally before merging/pushing.

### Remaining integration work from the requested specification
- Wire the new slice `scale`/CLAHE query parameters and shared crosshair/voxel-to-world coordinates through the React viewer.
- Add binary gzip mesh transport and progressive draft/full endpoint support while retaining JSON compatibility.
- Persist and expose confidence/expert volumes in study/segment responses and render them in Results/PDF.
- Complete A4 PDF provenance/confidence sections, `POST /api/v1/predict`, and the full multi-case evaluation adapter.
- Add the remaining hidden-test fixtures and run the complete requested test/build/lint matrix locally.
