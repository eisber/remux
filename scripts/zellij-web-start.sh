#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./zellij-web-lib.sh
source "$SCRIPT_DIR/zellij-web-lib.sh"

ensure_zellij_web_binary
ensure_zellij_web_config

status="$("$(zellij_web_bin)" web --status 2>&1 || true)"
if ! zellij_web_port_is_listening && ! grep -qi "online" <<<"$status"; then
  "$(zellij_web_bin)" --config "$(zellij_web_config)" web --daemonize
fi

"$(zellij_web_bin)" attach --create-background "$(zellij_web_session_name)" >/dev/null 2>&1 || true

bash "$SCRIPT_DIR/zellij-web-status.sh"
