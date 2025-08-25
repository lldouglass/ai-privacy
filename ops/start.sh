#!/usr/bin/env bash
set -euo pipefail

# Start FastAPI (Uvicorn) on 10001
uvicorn main:app --host 127.0.0.1 --port 10001 --app-dir /app/backend &

# Start Streamlit on 10002, mounted under /demo/app
streamlit run /app/mvp.py \
  --server.port 10002 \
  --server.address 0.0.0.0 \
  --server.baseUrlPath /demo/app \
  --server.enableCORS=false \
  --server.enableXsrfProtection=false \
  --browser.gatherUsageStats=false &

# Start Nginx in foreground (PID 1)
nginx -g 'daemon off;'
