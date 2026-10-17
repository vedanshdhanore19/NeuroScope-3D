# Deploying NeuroScope 3D

## Why two hosts
Vercel can host the **React frontend** (`frontend-react/`) but **not the Python backend**:
- PyTorch + MONAI + SimpleITK far exceed the 250 MB serverless function limit.
- Vercel request bodies are capped at ~4.5 MB; the 4 NIfTI uploads are hundreds of MB.
- Inference takes longer than function time limits, and the filesystem (`backend/temp`, SQLite) is ephemeral.

So: **Frontend -> Vercel. Backend -> a Docker host** (needs >= 2 GB RAM; 4 GB+ is comfortable).

## 1. Push to GitHub
Repo root = this folder. `.gitignore` was fixed (it previously ignored every `*.ts` file and the model weights).
Check before pushing: `git status` must list `frontend-react/src/**/*.ts` and `.../models/model.pt` (18 MB, fine for plain git).

## 2. Deploy the backend first (Docker, uses `/Dockerfile`)
Quickest way, on any machine/VPS with Docker:
```bash
export NEUROSCOPE_CORS_ORIGINS=https://<your-app>.vercel.app   # PowerShell: $env:NEUROSCOPE_CORS_ORIGINS="..."
docker compose up --build -d
curl http://localhost:7860/health
```
Data (SQLite + temp scans) lives in the `neuroscope-data` volume, so it survives restarts.
Env vars: `PORT`, `NEUROSCOPE_CORS_ORIGINS`, `NEUROSCOPE_CORS_ORIGIN_REGEX`, `MAX_FILE_SIZE_BYTES`, `NEUROSCOPE_DATA_DIR`, `NEUROSCOPE_TEMP_DIR`.
Put Caddy/nginx in front for HTTPS, or use a managed host below.

Options: Render (`render.yaml` included), Railway, Fly.io, or Hugging Face Spaces (Docker, free 16 GB CPU; the .pt needs Git LFS there).
Set env var: `NEUROSCOPE_CORS_ORIGINS=https://<your-app>.vercel.app` (add after step 3 if you don't have the URL yet).
Verify: open `https://<backend>/health` -> `"status": "healthy"` and `model.ready_for_inference: true`.
Note: run state is stored on local disk; free tiers that restart/sleep will lose studies. Use a persistent disk for real use.

## 3. Deploy the frontend on Vercel
1. Vercel -> Add New Project -> import the repo.
2. **Root Directory: `frontend-react`** (Framework: Vite is auto-detected; `vercel.json` sets build/output).
3. Environment Variables: `VITE_API_BASE_URL = https://<your-backend-host>` (https, no trailing slash). Apply to Production and Preview.
4. Deploy. Any change to `VITE_API_BASE_URL` needs a **redeploy** (it is baked in at build time).
5. Go back to the backend and set `NEUROSCOPE_CORS_ORIGINS` to the final Vercel URL.

## Troubleshooting
- CORS error in browser console -> origin missing from `NEUROSCOPE_CORS_ORIGINS` (exact match, no trailing slash).
- Mixed-content / blocked request -> backend URL is `http://`; it must be `https://`.
- Requests going to localhost -> `VITE_API_BASE_URL` not set at build time; redeploy.
- Build fails on `tsc -b` -> run `npm ci && npm run build` locally in `frontend-react` first.
- Upload fails at a proxy -> some hosts cap request size; check your backend host's limit.
