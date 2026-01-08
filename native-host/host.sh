#!/bin/bash
cd "$(dirname "$0")"
echo "[host.sh] Starting at $(date)" >> /tmp/foxpilot.log
exec /opt/homebrew/bin/node host.js 2>> /tmp/foxpilot.log
