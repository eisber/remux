#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./zellij-web-lib.sh
source "$SCRIPT_DIR/zellij-web-lib.sh"

plist="$(zellij_web_plist_path)"
service="$(zellij_web_service)"
domain="$(zellij_web_gui_domain)"

if [[ ! -f "$plist" ]]; then
  echo "missing plist: $plist" >&2
  echo "run: npm run zellij:web:install-launchd" >&2
  exit 1
fi

launchctl bootout "$domain" "$plist" >/dev/null 2>&1 || true
launchctl bootstrap "$domain" "$plist"

echo "loaded:"
echo "  ${domain}/${service}"
