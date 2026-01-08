#!/bin/bash
cd "$(dirname "$0")"
echo "[host.sh] Starting at $(date)" >> /tmp/fox-pilot.log
exec /opt/homebrew/bin/node host.js 2>> /tmp/fox-pilot.log
