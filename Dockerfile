# ----------------------------
# Stage 1: Build the frontend
# ----------------------------
FROM node:20-bullseye-slim AS webbuilder

WORKDIR /app/frontend

# Install deps first for better layer caching
COPY frontend/package*.json ./
# If you use pnpm/yarn, copy the respective lockfile instead and adjust the install cmd
RUN npm ci --no-audit --no-fund

# Now copy the rest of the frontend and build it
COPY frontend/ ./
RUN npm run build

# ----------------------------
# Stage 2: Python backend
# ----------------------------
FROM python:3.11-slim

# System deps (keep light; psycopg2-binary does not need libpq)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
RUN pip install --no-cache-dir psycopg2-binary==2.9.9

# Copy backend source
COPY backend ./backend

# Copy the built frontend into the backend static dir
COPY --from=webbuilder /app/frontend/dist ./backend/static

# Uvicorn runs from inside backend/
WORKDIR /app/backend

# Render sets PORT; default to 10000 if missing
ENV PORT=10000
EXPOSE 10000

# Allow overriding the app module via env if needed; defaults to main:app
ENV UVICORN_APP=main:app

# Start server
CMD ["sh", "-c", "uvicorn ${UVICORN_APP} --host 0.0.0.0 --port ${PORT}"]
