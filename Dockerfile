# NeuroScope 3D backend (FastAPI + MONAI SegResNet, CPU). Build context = repo root.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=7860 \
    NEUROSCOPE_DATA_DIR=/data/db \
    NEUROSCOPE_TEMP_DIR=/data/temp

# libgomp: OpenMP runtime needed by torch / SimpleITK on slim images
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Non-root user (uid 1000 is also what Hugging Face Spaces expects)
RUN useradd -m -u 1000 app && mkdir -p /data/db /data/temp && chown -R app:app /data /home/app

WORKDIR /app

# CPU-only torch first (default PyPI wheel pulls ~2 GB of CUDA libs), then the rest (cached layer)
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu
COPY backend/requirements.txt backend/requirements.txt
RUN pip install -r backend/requirements.txt

COPY --chown=app:app backend backend
WORKDIR /app/backend
USER app

VOLUME ["/data"]
EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD python -c "import os,urllib.request;urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','7860')+'/health',timeout=8)" || exit 1

# One worker only: the model is cached in-process and run state lives on local disk.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1"]
