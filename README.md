# Fox Pilot

[![NPM Version](https://img.shields.io/npm/v/@fox-pilot/client.svg?style=flat&colorB=3e63dd&colorA=414853)](https://www.npmjs.com/package/@fox-pilot/client/)
[![Downloads](https://img.shields.io/npm/dm/@fox-pilot/client?style=flat&colorB=3e63dd&colorA=414853)](https://www.npmjs.com/package/@fox-pilot/client/)
[![Size](https://img.shields.io/bundlephobia/minzip/@fox-pilot/client?style=flat&colorB=3e63dd&colorA=414853&label=size)](https://bundlephobia.com/package/@fox-pilot/client)
[![Dependency Status](https://img.shields.io/librariesio/release/npm/@fox-pilot/client?style=flat&colorB=3e63dd&colorA=414853)](https://libraries.io/npm/@fox-pilot/client)

> Firefox extension enabling remote browser control by coding agents (Claude, Cursor, etc.) via WebSocket API.

## Installation

### Prerequisites

- Firefox 109+
- [Bun](https://bun.sh/) 1.0+

### Steps

1. **Install dependencies**
   ```bash
   bun install
   ```

2. **Build the native host binary**
   ```bash
   bun run build:host
   ```
   This compiles the native host to a standalone binary at `packages/native-host/dist/fox-pilot-host`.

3. **Install the native messaging host**
   ```bash
   bun run install-host
   ```
   This registers the native host with Firefox.

4. **Load the extension in Firefox**
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on..."
   - Select `packages/extension/src/manifest.json`

5. **Start the server**
   ```bash
   bun run start
   ```

## Usage

### Client Library

```typescript
import { FoxPilotClient } from '@fox-pilot/client';

const client = new FoxPilotClient({
  url: 'ws://localhost:9222',
  token: process.env.FOX_PILOT_TOKEN,
});

await client.connect();

// Navigation
await client.navigate('https://example.com');
await client.back();
await client.forward();
await client.reload();

// DOM Interaction
await client.click('#button');
await client.type('#input', 'Hello');
await client.fill('#textarea', 'Content');
await client.hover('.menu-item');

// Data Extraction
const { text } = await client.getText('.content');
const { url } = await client.getUrl();
const { title } = await client.getTitle();
const { dataUrl } = await client.screenshot({ fullPage: true });

// Accessibility Snapshot
const { tree, text: snapshotText } = await client.snapshot({ interactive: true });

client.disconnect();
```

### API Reference

#### Navigation

| Method | Parameters | Description |
|--------|------------|-------------|
| `navigate(url)` | `url: string` | Navigate to URL |
| `back()` | - | Go back |
| `forward()` | - | Go forward |
| `reload()` | - | Reload page |
| `getTabs()` | - | List all tabs |
| `switchTab(tabId)` | `tabId: number` | Switch to tab |
| `newTab(url?)` | `url?: string` | Open new tab |
| `closeTab(tabId?)` | `tabId?: number` | Close tab |

#### DOM Interaction

| Method | Parameters | Description |
|--------|------------|-------------|
| `query(selector)` | `selector: string` | Find elements |
| `click(selector)` | `selector: string` | Click element |
| `type(selector, text)` | `selector: string, text: string` | Type text (keystroke simulation) |
| `fill(selector, text)` | `selector: string, text: string` | Fill input value |
| `hover(selector)` | `selector: string` | Hover element |
| `scroll(options)` | `{ x?, y?, selector?, direction?, amount? }` | Scroll page |
| `press(key, selector?)` | `key: string, selector?: string` | Press key |
| `select(selector, value)` | `selector: string, value: string` | Select option |
| `check(selector)` | `selector: string` | Check checkbox |
| `uncheck(selector)` | `selector: string` | Uncheck checkbox |

#### Data Extraction

| Method | Parameters | Description |
|--------|------------|-------------|
| `getHTML(selector?)` | `selector?: string` | Get HTML content |
| `getText(selector?)` | `selector?: string` | Get text content |
| `getUrl()` | - | Get current URL |
| `getTitle()` | - | Get page title |
| `screenshot(options?)` | `{ fullPage?: boolean }` | Capture screenshot |
| `snapshot(options?)` | `{ interactive?, compact?, depth?, scope? }` | Accessibility tree snapshot |

#### Semantic Locators

| Method | Parameters | Description |
|--------|------------|-------------|
| `findByRole(role, options?)` | `role: string, { name?, index? }` | Find by ARIA role |
| `findByText(text, options?)` | `text: string, { exact?, index? }` | Find by text content |
| `findByLabel(label, options?)` | `label: string, { index? }` | Find by label |
| `findByPlaceholder(placeholder, options?)` | `placeholder: string, { index? }` | Find by placeholder |

#### State Checks

| Method | Parameters | Description |
|--------|------------|-------------|
| `isVisible(selector)` | `selector: string` | Check visibility |
| `isEnabled(selector)` | `selector: string` | Check if enabled |
| `isChecked(selector)` | `selector: string` | Check if checked |

#### Waiting

| Method | Parameters | Description |
|--------|------------|-------------|
| `waitForSelector(selector, timeout?)` | `selector: string, timeout?: number` | Wait for element |
| `waitForText(text, timeout?)` | `text: string, timeout?: number` | Wait for text |
| `wait(ms)` | `ms: number` | Wait for duration |

#### JavaScript

| Method | Parameters | Description |
|--------|------------|-------------|
| `evaluate(code)` | `code: string` | Execute JavaScript |

### Message Format

**Request:**
```json
{
  "id": "unique-id",
  "method": "navigate",
  "params": { "url": "https://example.com" }
}
```

**Success Response:**
```json
{
  "id": "unique-id",
  "success": true,
  "result": { ... }
}
```

**Error Response:**
```json
{
  "id": "unique-id",
  "success": false,
  "error": {
    "code": "ELEMENT_NOT_FOUND",
    "message": "No element matches selector"
  }
}
```

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│  Coding Agent   │◄──────────────────►│  Native Host     │
│  (Claude, etc.) │    localhost:9222  │  (Bun binary)    │
└─────────────────┘                    └────────┬─────────┘
                                                │ Native Messaging
                                                ▼
                                       ┌──────────────────┐
                                       │ Firefox Extension│
                                       │  (Background.js) │
                                       └────────┬─────────┘
                                                │ Content Script
                                                ▼
                                       ┌──────────────────┐
                                       │   Web Page DOM   │
                                       └──────────────────┘
```

### Key Components

- **Native Host**: Standalone Bun binary that runs a WebSocket server on `localhost:9222`. Bridges communication between coding agents and the Firefox extension via native messaging.
- **Firefox Extension**: Manifest V2 extension with a persistent background script for native messaging and content scripts for DOM manipulation.
- **Client Library**: TypeScript library providing a typed API for agents to control the browser.

### Security

- WebSocket server listens only on `localhost`
- Token-based authentication required (`FOX_PILOT_TOKEN` env var)
- Firefox extension permissions limited to necessary APIs

## Project Structure

This project uses npm workspaces with Bun and TypeScript:

```
fox-pilot/
├── packages/
│   ├── client/          # @fox-pilot/client - Client library for agents
│   ├── cli/             # @fox-pilot/cli - Command-line interface
│   ├── extension/       # Firefox extension (Manifest V2)
│   ├── native-host/     # Native messaging host (compiles to binary)
│   └── scripts/         # Installation/setup scripts
├── package.json         # Workspace root
└── tsconfig.json        # Shared TypeScript config
```

### Packages

| Package | Description |
|---------|-------------|
| `@fox-pilot/client` | TypeScript client library for connecting to Fox Pilot |
| `@fox-pilot/cli` | CLI tool for browser automation |
| `@fox-pilot/extension` | Firefox extension with background script and content scripts |
| `@fox-pilot/native-host` | WebSocket server that bridges agents and the extension |
| `@fox-pilot/scripts` | Installation scripts for native messaging host |

## Development

```bash
# Start native host in development mode
bun run start

# Build native host binary
bun run build:host

# Lint code
bun run lint

# Type check
bun run typecheck

# Run tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage
```

### Testing

Tests are written with [Vitest](https://vitest.dev/). Run them with:

```bash
# Run all tests
bun run test

# Run tests in watch mode during development
bun run test:watch

# Generate coverage report
bun run test:coverage
```

### Debugging

- **Extension logs**: Firefox DevTools (`about:debugging` → Inspect)
- **Native host logs**: `/tmp/fox-pilot.log`
- **Check WebSocket port**: `lsof -i :9222`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`bun run test && bun run lint`)
5. Commit your changes (see commit conventions below)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Commit Conventions

- Use imperative mood, capitalize first letter (e.g., "Add feature", "Fix bug")
- Keep commits atomic (one logical change per commit)

## License

MIT
