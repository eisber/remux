#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=./zellij-web-lib.sh
source "$SCRIPT_DIR/zellij-web-lib.sh"

ensure_zellij_web_binary
ensure_zellij_web_config

mkdir -p "$HOME/Library/LaunchAgents"

plist="$(zellij_web_plist_path)"
bin="$(zellij_web_bin)"
config="$(zellij_web_config)"
log_path="$(zellij_web_log_path)"
runtime_path="$(zellij_web_path)"

cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>$(zellij_web_service)</string>
    <key>ProgramArguments</key>
    <array>
      <string>$bin</string>
      <string>--config</string>
      <string>$config</string>
      <string>web</string>
      <string>--daemonize</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$HOME</string>
    <key>EnvironmentVariables</key>
    <dict>
      <key>HOME</key>
      <string>$HOME</string>
      <key>LANG</key>
      <string>en_US.UTF-8</string>
      <key>PATH</key>
      <string>$runtime_path</string>
      <key>TERM</key>
      <string>xterm-256color</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$log_path</string>
    <key>StandardErrorPath</key>
    <string>$log_path</string>
  </dict>
</plist>
EOF

echo "installed:"
echo "  $plist"
echo
echo "next:"
echo "  npm run zellij:web:load-launchd"
echo "  npm run zellij:web:start"
