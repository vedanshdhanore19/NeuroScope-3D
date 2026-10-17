# NeuroScope-3D — Handoff Status

## Current Status: Step 3 (Close Spec Gaps) Completed

### What is verified and working:
1. **Backend:**
   - 50/50 tests passing in `tests/`.
   - Running live on `http://127.0.0.1:8001`.
   - Health check confirms real MONAI SegResNet weights loaded and ready for inference (`860ccb3f...` sha256).
   - `/volume-info`, `/slice`, and `/mesh` verified live against study `7216820a-7061-48ad-a13d-2dea876a56f3`.
2. **Frontend:**
   - `npm run build` passes with zero errors (built in 2.59s).
   - Vite dev server running on `http://localhost:5173/`.
   - Vite `/api` proxy verified live against `http://127.0.0.1:8001`.
   - Landing page hero: 3D Holographic Brain on fixed vertical axis, honest institutional sign-in card on left.
   - BraTS 4-sequence and MSD Task01 4D upload workspaces with drag & drop and client-side gzip compression via `CompressionStream('gzip')`.
   - Orthogonal 2D MPR viewer with 3 dark panels (Axial, Coronal, Sagittal), crosshairs, WT/TC/ET eye toggles with union semantics, brightness & contrast sliders, coordinate badge.
   - Marching Cubes 3D surface viewer (`MeshViewer3D`) loading binary BufferGeometry from `/api/v1/jobs/{id}/mesh`, nested translucency (WT=0.35, TC=0.65, ET=0.85, depthWrite: false), orbit controls, wireframe toggle, camera reset.
   - Results dashboard with physical volume cards (mL), derived spherical diameter (mm), amber plausibility warning (>800 mL), ground-truth comparative accuracy table, and downloads.
   - Report export with download protection for unsegmented runs, 3D Slicer / ITK-SNAP / Mango guidance, and SHA-256 provenance hash.
   - Auto-navigation to MRI viewer on segmentation completion.
   - Resumable studies with silent 404 auto-purge.
   - Interactive latency badge in Navbar for on-demand health pinging.

### Next Steps:
- **Step 4:** Polish responsive breakpoints and accessibility.
- **Step 5:** Final verification & write `frontend-react/DESIGN_NOTES.md`.
