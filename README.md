# Fox Pilot

[![NPM Version](https://img.shields.io/npm/v/@fox-pilot/cli.svg?style=flat&colorB=3e63dd&colorA=414853)](https://www.npmjs.com/package/@fox-pilot/cli/)
[![Downloads](https://img.shields.io/npm/dm/@fox-pilot/cli?style=flat&colorB=3e63dd&colorA=414853)](https://www.npmjs.com/package/@fox-pilot/cli/)
[![Size](https://img.shields.io/bundlephobia/minzip/@fox-pilot/cli?style=flat&colorB=3e63dd&colorA=414853&label=size)](https://bundlephobia.com/package/@fox-pilot/cli)
[![Dependency Status](https://img.shields.io/librariesio/release/npm/@fox-pilot/cli?style=flat&colorB=3e63dd&colorA=414853)](https://libraries.io/npm/@fox-pilot/cli)

> CLI tool for AI agents to control Firefox via WebSocket. Navigate, click, fill forms, take screenshots, and extract data from your browser.

> [!WARNING]
> **Experimental Project** — This project was entirely built by AI coding agents (Claude). While functional, it may contain bugs, security issues, or unexpected behavior. Use at your own risk, especially in production environments or with sensitive data.

## Installation

### 1. Install the Firefox Extension

Install [Fox Pilot](https://addons.mozilla.org/firefox/addon/fox-pilot/) from the Firefox Add-ons marketplace.

### 2. Install the CLI

```bash
# With npm
npm install -g @fox-pilot/cli

# With bun
bun install -g @fox-pilot/cli

# Or run directly with npx
npx @fox-pilot/cli --help
```

### 3. Start Using

Make sure Firefox is running with the Fox Pilot extension enabled, then:

```bash
fox-pilot open https://example.com
fox-pilot snapshot -i
fox-pilot click @e2
fox-pilot screenshot /tmp/page.png
```

## Usage

### Quick Start

```bash
# Navigate to a page
fox-pilot open example.com

# Get accessibility snapshot (for AI agents)
fox-pilot snapshot -i -c

# Interact using refs from snapshot
fox-pilot click @e2
fox-pilot fill @e3 "hello@example.com"
fox-pilot press Enter

# Take a screenshot
fox-pilot screenshot /tmp/result.png
```

### Commands

#### Navigation

```bash
fox-pilot open <url>        # Navigate to URL
fox-pilot back              # Go back
fox-pilot forward           # Go forward
fox-pilot reload            # Reload page
```

#### Accessibility Snapshot

```bash
fox-pilot snapshot          # Get full accessibility tree
fox-pilot snapshot -i       # Interactive elements only
fox-pilot snapshot -i -c    # Interactive + compact (recommended for AI)
fox-pilot snapshot -d 5     # Limit depth to 5 levels
fox-pilot snapshot -s "#main"  # Scope to selector
```

#### DOM Interaction

```bash
fox-pilot click <selector>           # Click element
fox-pilot dblclick <selector>        # Double-click
fox-pilot fill <selector> <text>     # Clear and fill input
fox-pilot type <selector> <text>     # Type text (keystroke simulation)
fox-pilot press <key> [selector]     # Press key (Enter, Tab, Control+a)
fox-pilot select <selector> <value>  # Select dropdown option
fox-pilot check <selector>           # Check checkbox
fox-pilot uncheck <selector>         # Uncheck checkbox
fox-pilot hover <selector>           # Hover element
fox-pilot scroll down 500            # Scroll direction + pixels
fox-pilot scroll @e5                 # Scroll to element
```

#### Data Extraction

```bash
fox-pilot get text <selector>        # Get text content
fox-pilot get html <selector>        # Get innerHTML
fox-pilot get value <selector>       # Get input value
fox-pilot get attr <selector> <attr> # Get attribute
fox-pilot get title                  # Get page title
fox-pilot get url                    # Get current URL
fox-pilot get count <selector>       # Count matching elements
```

#### State Checks

```bash
fox-pilot is visible <selector>      # Check if visible
fox-pilot is enabled <selector>      # Check if enabled
fox-pilot is checked <selector>      # Check if checked
```

#### Screenshots

```bash
fox-pilot screenshot                 # Save to /tmp/fox-pilot-screenshot.png
fox-pilot screenshot /path/to/file.png
fox-pilot screenshot -f              # Full page screenshot
```

#### Waiting

```bash
fox-pilot wait <selector>            # Wait for element visible
fox-pilot wait 2000                  # Wait 2 seconds
fox-pilot wait --text "Success"      # Wait for text to appear
fox-pilot wait --url "**/dashboard"  # Wait for URL pattern
```

#### Semantic Locators

```bash
fox-pilot find role button click           # Find button and click
fox-pilot find role textbox fill "hello"   # Find textbox and fill
fox-pilot find text "Submit" click         # Find by text and click
fox-pilot find label "Email" fill "a@b.com"
fox-pilot find placeholder "Search..." type "query"

# With options
fox-pilot find role button click --name "Submit"
fox-pilot find text "Item" --index 2       # Third match
fox-pilot find text "Exact" --exact        # Exact match only
```

#### Tab Management

```bash
fox-pilot tab                        # List all tabs
fox-pilot tab new                    # Open new tab
fox-pilot tab new https://google.com # Open URL in new tab
fox-pilot tab 2                      # Switch to tab index 2
fox-pilot tab close                  # Close current tab
```

#### JavaScript Execution

```bash
fox-pilot eval "document.title"
fox-pilot eval "window.scrollY"
```

### Options

| Option | Description |
|--------|-------------|
| `--json` | Output results as JSON |
| `--help` | Show help |
| `--version` | Show version |

### Selectors

The CLI supports multiple selector types:

| Type | Example | Description |
|------|---------|-------------|
| Refs | `@e1`, `@e2` | Element refs from `snapshot` (recommended) |
| CSS ID | `#submit-btn` | CSS ID selector |
| CSS Class | `.form-input` | CSS class selector |
| CSS Tag | `button` | CSS tag selector |
| CSS Complex | `form input[type="email"]` | Any CSS selector |

**Tip:** Use `fox-pilot snapshot -i -c` to get element refs, then interact using `@e1`, `@e2`, etc. This is the most reliable method for AI agents.

## Client Library

For programmatic usage in Node.js/Bun, use the client library:

```bash
npm install @fox-pilot/client
```

```typescript
import { FoxPilotClient } from '@fox-pilot/client';

const client = new FoxPilotClient();
await client.connect();

await client.navigate('https://example.com');
await client.click('#button');
const { text } = await client.getText('.content');
const { dataUrl } = await client.screenshot({ fullPage: true });

client.disconnect();
```

See the [client library documentation](./packages/client/README.md) for the full API reference.

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│  CLI / Agent    │◄──────────────────►│  Native Host     │
│  (fox-pilot)    │    localhost:9222  │  (Bun binary)    │
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

### Security

- WebSocket server listens only on `localhost`
- Token-based authentication (`FOX_PILOT_TOKEN` env var)
- Firefox extension permissions limited to necessary APIs

## Development

To contribute or run the project locally:

```bash
# Clone the repository
git clone https://github.com/studiometa/fox-pilot.git
cd fox-pilot

# Install dependencies
bun install

# Build native host binary
bun run build:host

# Install native messaging host
bun run install-host

# Load extension manually in Firefox (about:debugging)
# Select packages/extension/src/manifest.json

# Start the server
bun run start

# Run tests
bun run test
```

### Project Structure

```
fox-pilot/
├── packages/
│   ├── cli/             # @fox-pilot/cli - This CLI tool
│   ├── client/          # @fox-pilot/client - TypeScript client library
│   ├── extension/       # Firefox extension (Manifest V2)
│   ├── native-host/     # WebSocket server (compiles to binary)
│   └── scripts/         # Installation scripts
├── package.json         # Workspace root
└── tsconfig.json        # Shared TypeScript config
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`bun run test && bun run lint`)
5. Commit with imperative mood ("Add feature", "Fix bug")
6. Push and open a Pull Request

## Acknowledgements

Fox Pilot was inspired by these great projects:

- [agent-browser](https://github.com/vercel-labs/agent-browser) — Browser automation CLI for AI agents by Vercel Labs
- [playwriter](https://github.com/remorses/playwriter) — MCP server for browser automation
- [alfred-firefox](https://github.com/deanishe/alfred-firefox) — Control Firefox from Alfred using native messaging

## License

MIT
