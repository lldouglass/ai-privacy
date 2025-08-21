# ---- Base image
FROM python:3.11-slim

# ---- OS build deps (small + enough)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    nodejs \
    npm \
  && rm -rf /var/lib/apt/lists/*

# ---- Workdir
WORKDIR /app

# ---- Python deps from your backend list
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# ---- Ensure Postgres driver is available (needed for postgresql:// URLs)
# psycopg2-binary avoids compiling libpq and "just works" in slim images
RUN pip install --no-cache-dir psycopg2-binary==2.9.9

# ---- App source
COPY backend ./backend
COPY frontend ./frontend

# ---- Build frontend and collect static files
RUN rm -rf backend/static && mkdir -p backend/static && \
    npm --prefix frontend ci && \
    npm --prefix frontend run build && \
    cp -r frontend/dist/* backend/static/

# ---- Run from backend dir (Render start command calls uvicorn)
WORKDIR /app/backend
