#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./zellij-web-lib.sh
source "$SCRIPT_DIR/zellij-web-lib.sh"

ensure_zellij_web_binary
"$(zellij_web_bin)" web --create-token
