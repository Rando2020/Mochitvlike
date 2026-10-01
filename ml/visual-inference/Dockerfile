FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MODEL_CACHE_DIR=/models/hf \
    HF_HOME=/models/hf

WORKDIR /app

COPY requirements.lock requirements.gpu.lock ./
RUN python -m pip install --no-cache-dir -r requirements.lock -r requirements.gpu.lock

COPY pyproject.toml ./
COPY visual_inference ./visual_inference
RUN python -m pip install --no-cache-dir --no-deps .

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=3)"
CMD ["uvicorn","visual_inference.main:app","--host","0.0.0.0","--port","8000","--workers","1"]
