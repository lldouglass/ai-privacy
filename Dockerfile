# ===============================
# Runtime image: FastAPI + prebuilt frontend
# ===============================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# (Optional) build tools for some Python wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ---- Python deps ----
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# ---- App code ----
COPY backend ./backend

# ---- Prebuilt frontend (built locally) ----
# Make sure you've run `npm run build` in /frontend and committed /frontend/dist
RUN mkdir -p backend/static
COPY frontend/dist/ ./backend/static/

# Railway provides PORT automatically; default to 8000 for local runs
ENV PORT=8000
EXPOSE 8000

WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
