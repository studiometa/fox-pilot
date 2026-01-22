# Fox Pilot - Claude Guidelines

## Project Overview

Firefox extension enabling remote browser control by coding agents (Claude, Cursor, etc.) via WebSocket API.

## Git Conventions

- **Language**: English for all commit messages
- **Style**: Imperative mood, capitalize first letter (e.g., "Add feature", "Fix bug")
- **AI commits**: Always include `Co-authored-by: Claude <claude@anthropic.com>` trailer
- **Atomic commits**: One logical change per commit
- **Releases**: Always run `npm run lint && npm run typecheck && npm run test` before creating the release tag and pushing

## Project Structure

This project uses **npm workspaces** with **Bun** (for development) and **TypeScript**:

```
fox-pilot/
├── packages/
│   ├── client/                  # @fox-pilot/client - TypeScript client library
│   │   └── src/
│   │       ├── index.ts         # Client implementation
│   │       └── index.test.ts    # Vitest tests
│   ├── cli/                     # @fox-pilot/cli - Command-line interface
│   │   └── src/
│   │       ├── cli.ts           # CLI implementation
│   │       └── cli.test.ts      # Vitest tests
│   ├── extension/               # Firefox extension (Manifest V2, plain JS)
│   │   └── src/
│   │       ├── manifest.json
│   │       ├── background.js    # Native messaging + command routing
│   │       ├── content.js       # DOM interactions
│   │       └── popup/           # Extension popup UI
│   ├── native-host/             # Native host source (compiles to binary)
│   │   ├── src/
│   │   │   └── host.ts
│   │   └── dist/
│   │       └── fox-pilot-host   # Compiled binary (local dev)
│   ├── native-host-darwin-arm64/# Platform binary package (macOS ARM64)
│   ├── native-host-darwin-x64/  # Platform binary package (macOS Intel)
│   ├── native-host-linux-x64/   # Platform binary package (Linux x64)
│   └── scripts/                 # Installation scripts
│       └── src/
│           └── install-host.ts
├── package.json                 # Workspace root with scripts
├── tsconfig.json                # Shared TypeScript config
└── vitest.config.ts             # Test configuration
```

## Runtime Requirements

- **CLI/Client**: Node.js 24+ (compiled to JavaScript via Vite for npm distribution)
- **Native Host**: Compiled binary (no runtime needed)
- **Development**: Node.js 24+ (see `.nvmrc`)

## Development

```bash
# Install dependencies
npm install

# Build native host binary (for local development)
npm run build:host

# Install native host (registers with Firefox)
npm run install-host

# Load extension in Firefox
# 1. Go to about:debugging#/runtime/this-firefox
# 2. Load packages/extension/src/manifest.json

# Build client and CLI (required before publishing)
npm run build

# Run CLI in development (from source)
node packages/cli/src/cli.ts help

# Run CLI from built output
node packages/cli/dist/cli.js help

# Run tests
npm run test
npm run test:watch

# Lint and type check
npm run lint
npm run typecheck
```

## Architecture Notes

- **Manifest V2**: Chosen for persistent background script (V3 service workers can be killed)
- **Native Messaging**: Firefox extension ↔ Native host binary communication
- **WebSocket**: Agent ↔ Native host communication on localhost:9222
- **Authentication**: Token-based (FOX_PILOT_TOKEN env var)
- **Platform Packages**: Native host compiled to separate npm packages per platform (~58MB each)
- **Vite Build**: Client and CLI are built with Vite 8 (Rolldown) for npm distribution

## Key Files

- `packages/client/src/index.ts` - Client library with all browser commands
- `packages/cli/src/cli.ts` - CLI implementation
- `packages/native-host/src/host.ts` - WebSocket server implementation
- `packages/extension/src/background.js` - Extension message routing
- `packages/extension/src/content.js` - DOM interaction handlers
- `packages/scripts/src/install-host.ts` - Native host installer

## Debugging

- Extension logs: Firefox DevTools (about:debugging → Inspect)
- Native host logs: `/tmp/fox-pilot.log`
- Check port: `lsof -i :9222`
- Test CLI: `bun run packages/cli/src/cli.ts get title`
