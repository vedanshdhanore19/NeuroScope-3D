# NeuroScope 3D - segmentation fix (v3)

**Error:** `Segmentation failed: The size of tensor a (38) must match the size of tensor b (37) at non-singleton dimension 4`

**Root cause:** SegResNet downsamples 3x (stride-2 convs), so every spatial size must be divisible by 8. The old
`backend/app/inference.py` cropped the brain to its bounding box (z ~ 147) and fed that odd size to the network.
For z=147/148 the decoder gets 2*19=38 against a skip connection of 37. Even the uncropped 155 slices fail (40 vs 39).

**What changed (backend only; frontend and API responses unchanged)**
- `backend/app/inference.py` (engine 3.0-shape-safe)
  - `ShapeSafeModel` pads any input to a multiple of 16 inside `forward()` and crops back - the crash cannot recur.
  - Foreground crop removed; volume padded to multiples of 16, sliding window 240x240x160 (bundle ROI), exact crop-back.
  - Automatic out-of-memory retry (GPU -> CPU, then smaller windows); AMP on CUDA; `inference_mode`.
  - Channel order kept as the bundle declares: T1c, T1, T2, FLAIR (`configs/metadata.json`). Normalisation = MONAI
    `NormalizeIntensity(nonzero=True, channel_wise=True)`.
  - Strict checkpoint load (no silent random weights), clear logging of shapes/device/time.
- `backend/main.py`: model loaded once at startup in a background thread; `/health` reports `engine_version`; CORS accepts any
  localhost port (Vite uses 5174/5175 when 5173 is busy); inference errors return a short message and log the traceback.
- `frontend-react/.env`: `VITE_API_BASE_URL=http://127.0.0.1:8001` (the frontend defaulted to port 8000).
- `tests/test_inference_shape_safety.py`: regression tests. `start_backend.bat` / `start_frontend.bat` / `verify_backend.py`.

## Run
Backend:  `start_backend.bat`  (or `cd backend`, activate venv, `python -m uvicorn main:app --host 127.0.0.1 --port 8001`)
Verify:   `python verify_backend.py http://127.0.0.1:8001`   -> must print OK
Frontend: `start_frontend.bat`  (or `cd frontend-react`, `npm install`, `npm run dev`)
Tests:    `pip install pytest` then `pytest tests -v` from this folder.
