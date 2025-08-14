# ---------- Stage 1: Build the React frontend ----------
FROM node:20-alpine AS fe
WORKDIR /app/frontend

# If you have lock file, copy it too (package-lock.json or pnpm-lock.yaml)
COPY frontend/package*.json ./
RUN npm ci

# Copy the rest of the frontend and build
COPY frontend ./
RUN npm run build

# ---------- Stage 2: Python FastAPI backend ----------
FROM python:3.11-slim

# System deps for building wheels (optional but useful)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Backend deps
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend ./backend

# Copy built frontend into backend/static so FastAPI serves it
COPY --from=fe /app/frontend/dist/ ./backend/static/

# DigitalOcean passes PORT to your container. Default to 8080.
ENV PORT=8080

# FastAPI will run from backend dir and bind to ${PORT}
WORKDIR /app/backend
EXPOSE 8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
