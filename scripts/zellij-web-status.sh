#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./zellij-web-lib.sh
source "$SCRIPT_DIR/zellij-web-lib.sh"

ensure_zellij_web_binary

status="$("$(zellij_web_bin)" web --status 2>&1 || true)"
printf '%s\n' "$status"
if zellij_web_port_is_listening; then
  echo "listener: port $(zellij_web_port) is accepting connections"
fi
echo "local:  $(zellij_web_local_url)"
echo "public: $(zellij_web_remote_url)"
echo "token:  npm run zellij:web:create-token"
