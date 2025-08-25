# ---------- Stage 1: build frontend ----------
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ---------- Stage 2: backend + proxy ----------
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=10000

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential nginx curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt \
    && pip install --no-cache-dir psycopg2-binary==2.9.9 streamlit python-dotenv openai

# App code
COPY backend ./backend
COPY mvp.py ./mvp.py

# Frontend build into backend/static
RUN mkdir -p backend/static
COPY --from=web /web/dist/ ./backend/static/

# Nginx + startup
COPY ops/nginx.conf /etc/nginx/nginx.conf
COPY ops/start.sh /start.sh
RUN chmod +x /start.sh

# Expose Render port
EXPOSE 10000

CMD ["/start.sh"]

