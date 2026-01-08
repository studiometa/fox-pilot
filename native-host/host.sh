#!/bin/bash
cd "$(dirname "$0")"
echo "[host.sh] Starting at $(date)" >> /tmp/firefox-command.log
exec /opt/homebrew/bin/node host.js 2>> /tmp/firefox-command.log
