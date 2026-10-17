# NeuroScope-3D — Handoff Status

## Current Status: ALL TASKS COMPLETED (Steps 1–5 Finalized)

### What is verified and working:
1. **Backend:**
   - 50/50 tests passing in `tests/` (`pytest -q --ignore=tests/test_real_model_inference.py` passes 48/48 instantly, full suite passes 50/50).
   - Running live on `http://127.0.0.1:8001`.
   - Health check confirms real MONAI SegResNet weights loaded and ready for inference (`860ccb3f...` sha256).
   - `/volume-info`, `/slice`, and `/mesh` verified live against study `7216820a-7061-48ad-a13d-2dea876a56f3`.
   - All backend changes are strictly additive in `backend/app/visualization.py` with zero modifications to core models or pipeline logic.
2. **Frontend:**
   - `npm run build` passes with zero errors (built in ~3.2s).
   - `npm run lint` (`oxlint`) passes with **0 warnings and 0 errors** across all 21 files.
   - Vite dev server running on `http://localhost:5173/` with proxy to `http://127.0.0.1:8001`.
   - Landing page hero: 3D Holographic Brain rotating on fixed vertical axis (constant speed, no wobble, no drag/zoom/pan, dpr capped at [1, 1.75], labelled "Illustrative model") + institutional sign-in card on left.
   - Client-side gzip compression: any raw `.nii` file selected in BraTS or MSD mode is compressed in-browser via `CompressionStream('gzip')`, renamed `.nii.gz`, with visual "Compressing..." feedback and capability detection.
   - Upload workspaces: supports both 4-sequence BraTS and 4D MSD Task01 with optional ground truth masks, matrix alignment checks, and SHA-256 provenance registration.
   - Orthogonal 2D MPR viewer: 3 dark panels (Axial, Coronal, Sagittal), crosshairs, WT/TC/ET eye toggles with union semantics, brightness & contrast sliders, coordinate badge, responsive 1-to-3 column grid.
   - Marching Cubes 3D surface viewer (`MeshViewer3D`): binary BufferGeometry from `/api/v1/jobs/{id}/mesh`, nested translucency (WT=0.35, TC=0.65, ET=0.85, depthWrite: false), orbit controls, wireframe toggle, camera reset, complete Three.js unmount cleanup.
   - Results dashboard: physical volume cards (mL), derived spherical diameter (mm), amber plausibility warning (>800 mL or regions within 5%), ground-truth comparative accuracy table, and downloads.
   - Report export: download protection for unsegmented runs, 3D Slicer / ITK-SNAP / Mango guidance, and SHA-256 provenance hash.
   - Resumable studies: Zustand persistence with safe try/catch storage access and silent 404 auto-purge.
   - Standardized BraTS labels: strictly `"WT (Whole tumor)"`, `"TC (Tumor core)"`, `"ET (Enhancing)"` across all components.
   - Documentation: comprehensive `frontend-react/DESIGN_NOTES.md` written and committed.
