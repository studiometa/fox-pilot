# Fox Pilot - Claude Guidelines

## Project Overview

Firefox extension enabling remote browser control by coding agents (Claude, Cursor, etc.) via WebSocket API.

## Git Conventions

- **Language**: English for all commit messages
- **Style**: Imperative mood, capitalize first letter (e.g., "Add feature", "Fix bug")
- **AI commits**: Always include `Co-authored-by: Claude <claude@anthropic.com>` trailer
- **Atomic commits**: One logical change per commit

## Project Structure

This project uses **npm workspaces** with **Bun** and **TypeScript**:

```
fox-pilot/
├── packages/
│   ├── client/          # @fox-pilot/client - TypeScript client library
│   │   └── src/
│   │       ├── index.ts       # Client implementation
│   │       └── index.test.ts  # Vitest tests
│   ├── cli/             # @fox-pilot/cli - Command-line interface
│   │   └── src/
│   │       └── cli.ts
│   ├── extension/       # Firefox extension (Manifest V2)
│   │   └── src/
│   │       ├── manifest.json
│   │       ├── background.js  # Native messaging + command routing
│   │       ├── content.js     # DOM interactions
│   │       └── popup/         # Extension popup UI
│   ├── native-host/     # WebSocket server (compiles to binary)
│   │   ├── src/
│   │   │   └── host.ts
│   │   ├── dist/
│   │   │   └── fox-pilot-host  # Compiled Bun binary
│   │   └── host.sh            # Shell wrapper for macOS
│   └── scripts/         # Installation scripts
│       └── src/
│           └── install-host.ts
├── package.json         # Workspace root with scripts
└── tsconfig.json        # Shared TypeScript config
```

## Development

```bash
# Install dependencies
bun install

# Build native host binary
bun run build:host

# Install native host (registers with Firefox)
bun run install-host

# Load extension in Firefox
# 1. Go to about:debugging#/runtime/this-firefox
# 2. Load packages/extension/src/manifest.json

# Start the WebSocket server
bun run start

# Run tests
bun run test
bun run test:watch

# Lint and type check
bun run lint
bun run typecheck
```

## Architecture Notes

- **Manifest V2**: Chosen for persistent background script (V3 service workers can be killed)
- **Native Messaging**: Firefox extension ↔ Native host binary communication
- **WebSocket**: Agent ↔ Native host communication on localhost:9222
- **Authentication**: Token-based (FOX_PILOT_TOKEN env var)
- **Bun**: Used for TypeScript execution and binary compilation

## Key Files

- `packages/client/src/index.ts` - Client library with all browser commands
- `packages/native-host/src/host.ts` - WebSocket server implementation
- `packages/extension/src/background.js` - Extension message routing
- `packages/extension/src/content.js` - DOM interaction handlers

## Debugging

- Extension logs: Firefox DevTools (about:debugging → Inspect)
- Native host logs: `/tmp/fox-pilot.log`
- Check port: `lsof -i :9222`
