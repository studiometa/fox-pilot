# FoxPilot - Claude Guidelines

## Project Overview

Firefox extension enabling remote browser control by coding agents (Claude, Cursor, etc.) via WebSocket API.

## Git Conventions

- **Language**: English for all commit messages
- **Style**: Imperative mood, capitalize first letter (e.g., "Add feature", "Fix bug")
- **AI commits**: Always include `Co-authored-by: Claude <claude@anthropic.com>` trailer
- **Atomic commits**: One logical change per commit

## Project Structure

```
foxpilot/
├── extension/          # Firefox extension (Manifest V2)
│   ├── manifest.json
│   ├── background.js   # Native messaging + command routing
│   ├── content.js      # DOM interactions
│   └── popup/          # Extension popup UI
├── native-host/        # Node.js WebSocket server
│   ├── host.js         # Main server script
│   └── host.sh         # Shell wrapper for macOS
├── client/             # Client library for agents
├── scripts/            # Installation scripts
└── examples/           # Usage examples
```

## Development

```bash
# Install native host (run once)
npm run install-host

# Load extension in Firefox
# 1. Go to about:debugging#/runtime/this-firefox
# 2. Load extension/manifest.json

# Test connection
node examples/basic-usage.js
```

## Architecture Notes

- **Manifest V2**: Chosen for persistent background script (V3 service workers can be killed)
- **Native Messaging**: Firefox extension ↔ Node.js host communication
- **WebSocket**: Agent ↔ Native host communication on localhost:9222
- **Authentication**: Token-based (FOXPILOT_TOKEN env var)

## Debugging

- Extension logs: Firefox DevTools (about:debugging → Inspect)
- Native host logs: `/tmp/foxpilot.log`
- Check port: `lsof -i :9222`
