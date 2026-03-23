#!/bin/bash
# Watch src/ for changes, rebuild, and gracefully restart the server.
# Usage: scripts/watch-restart.sh [--port PORT] [--host HOST] [-- extra-cli-args...]
#
# Requires: fswatch (brew install fswatch)
#
# The frontend auto-reconnects after restart, so clients recover seamlessly.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PORT="${REMUX_PORT:-8767}"
HOST="${REMUX_HOST:-0.0.0.0}"
EXTRA_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    --) shift; EXTRA_ARGS=("$@"); break ;;
    *) EXTRA_ARGS+=("$1"); shift ;;
  esac
done

if ! command -v fswatch &>/dev/null; then
  echo "ERROR: fswatch not found. Install with: brew install fswatch"
  exit 1
fi

SERVER_PID=""
DEBOUNCE_PID=""

cleanup() {
  echo ""
  echo "[watch] shutting down..."
  [[ -n "$DEBOUNCE_PID" ]] && kill "$DEBOUNCE_PID" 2>/dev/null
  [[ -n "$SERVER_PID" ]] && kill "$SERVER_PID" 2>/dev/null
  wait 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

start_server() {
  cd "$PROJECT_DIR"
  REMUX_TOKEN="${REMUX_TOKEN:-}" node dist/backend/cli.js \
    --host "$HOST" --port "$PORT" --no-tunnel --no-require-password \
    "${EXTRA_ARGS[@]}" &
  SERVER_PID=$!
  echo "[watch] server started (pid=$SERVER_PID, port=$PORT)"
}

stop_server() {
  if [[ -n "$SERVER_PID" ]]; then
    echo "[watch] stopping server (pid=$SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null || true
    SERVER_PID=""
  fi
}

rebuild_and_restart() {
  echo "[watch] changes detected, rebuilding..."
  cd "$PROJECT_DIR"

  if npm run build 2>&1 | tail -5; then
    echo "[watch] build succeeded"
    stop_server
    start_server
  else
    echo "[watch] build FAILED — server still running with previous build"
  fi
}

# Initial build + start
echo "[watch] initial build..."
cd "$PROJECT_DIR"
npm run build 2>&1 | tail -5
start_server

echo "[watch] watching src/ for changes..."
echo "[watch] press Ctrl-C to stop"
echo ""

# Watch src/ with 2s debounce
fswatch -r -l 2 --event Created --event Updated --event Removed \
  "$PROJECT_DIR/src" | while read -r _; do
  # Drain extra events from the batch
  while read -r -t 0.1 _; do :; done
  rebuild_and_restart
done
