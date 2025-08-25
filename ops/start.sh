#!/usr/bin/env bash
set -euo pipefail

wait_for() {
  local url="$1"
  local name="$2"
  local tries="${3:-60}" # ~60s max by default
  local i=0
  echo "Waiting for $name at $url ..."
  until curl -sf -o /dev/null "$url"; do
    i=$((i+1))
    if [ "$i" -ge "$tries" ]; then
      echo "ERROR: $name did not become ready at $url"
      exit 1
    fi
    sleep 1
  done
  echo "$name is ready."
}

# 1) Start FastAPI (Uvicorn) on 10001
uvicorn main:app --host 127.0.0.1 --port 10001 --app-dir /app/backend &

# 2) Start Streamlit on 10002, mounted under /demo/app
streamlit run /app/mvp.py \
  --server.port 10002 \
  --server.address 0.0.0.0 \
  --server.baseUrlPath /demo/app \
  --server.enableCORS=false \
  --server.enableXsrfProtection=false \
  --browser.gatherUsageStats=false &

# 3) Wait for both to be up before exposing the port with Nginx
# Prefer a cheap health endpoint for FastAPI (see snippet below), otherwise fall back to "/"
if curl -sf -o /dev/null http://127.0.0.1:10001/healthz; then
  wait_for "http://127.0.0.1:10001/healthz" "FastAPI"
else
  wait_for "http://127.0.0.1:10001/" "FastAPI"
fi
wait_for "http://127.0.0.1:10002/demo/app/" "Streamlit"

# 4) Start Nginx in foreground (PID 1)
nginx -g 'daemon off;'
