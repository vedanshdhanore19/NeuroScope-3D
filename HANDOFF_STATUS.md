# NeuroScope-3D — Handoff Status

## Current Status: Step 2 (Smoke Test Against Live Backend) Completed

### What is verified and working:
1. **Backend:**
   - 50/50 tests passing in `tests/`.
   - Running live on `http://127.0.0.1:8001`.
   - Health check confirms real MONAI SegResNet weights loaded and ready for inference (`860ccb3f...` sha256).
   - `/volume-info`, `/slice`, and `/mesh` verified live against study `7216820a-7061-48ad-a13d-2dea876a56f3`.
2. **Frontend:**
   - `npm run build` passes with zero errors.
   - `npm run lint` passes with zero errors.
   - Vite dev server running on `http://localhost:5173/`.
   - Vite `/api` proxy verified live against `http://127.0.0.1:8001`.

### Next Steps:
- **Step 3:** Close remaining spec gaps (review each of the 11 spec checklist items in detail).
- **Step 4:** Polish responsive breakpoints and accessibility.
- **Step 5:** Final verification & write `frontend-react/DESIGN_NOTES.md`.
