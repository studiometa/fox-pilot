#!/bin/bash
cd "$(dirname "$0")"
echo "[host.sh] Starting at $(date)" >> /tmp/fox-pilot.log
exec bun run src/host.ts 2>> /tmp/fox-pilot.log
