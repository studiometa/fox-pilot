# Installation Guide

## Requirements

- **Node.js 24+** (for native TypeScript support)
- **Firefox 109+**

## Quick Install (Recommended)

### 1. Install the Firefox Extension

Install [Fox Pilot](https://addons.mozilla.org/firefox/addon/fox-pilot/) from the Firefox Add-ons marketplace.

### 2. Install the CLI

```bash
npm install -g @fox-pilot/cli
```

This automatically installs the correct native host binary for your platform.

### 3. Run the Install Script

```bash
fox-pilot-install
```

This registers the native messaging host with Firefox.

### 4. Verify Installation

1. Restart Firefox
2. Click on the Fox Pilot extension icon in the toolbar
3. Verify that the status shows "Connected"
4. Test with a command:

```bash
fox-pilot get title
```

## Manual Installation (Development)

For development or troubleshooting:

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/studiometa/fox-pilot.git
cd fox-pilot

# Requires Bun for development
bun install
```

### 2. Build the Native Host Binary

```bash
bun run build:host
```

This compiles the native host to `packages/native-host/dist/fox-pilot-host`.

### 3. Install the Native Messaging Host

```bash
bun run install-host
```

This creates the manifest file at:
- **macOS**: `~/Library/Application Support/Mozilla/NativeMessagingHosts/fox_pilot.json`
- **Linux**: `~/.mozilla/native-messaging-hosts/fox_pilot.json`
- **Windows**: `%APPDATA%\Mozilla\NativeMessagingHosts\fox_pilot.json`

### 4. Load the Extension in Firefox

1. Open Firefox
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click **"Load Temporary Add-on..."**
4. Select `packages/extension/src/manifest.json`

### 5. Verify Connection

1. Click on the Fox Pilot extension icon
2. Status should show "Connected"
3. Check logs at `/tmp/fox-pilot.log` if issues occur

## Configuration

### Authentication Token

Set a custom authentication token for added security:

```bash
export FOX_PILOT_TOKEN="your-secret-token"
```

The CLI will use this token when connecting to the native host.

### WebSocket Port

The native host listens on `localhost:9222` by default. This cannot be changed currently.

## Troubleshooting

### Extension shows "Disconnected"

1. Check if the native host binary exists:
   ```bash
   ls -la ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/
   cat ~/Library/Application\ Support/Mozilla/NativeMessagingHosts/fox_pilot.json
   ```

2. Verify the binary path in the manifest is correct and the file exists

3. Check native host logs:
   ```bash
   tail -f /tmp/fox-pilot.log
   ```

4. Restart Firefox completely

### "Native host has exited" error

1. Make the binary executable:
   ```bash
   chmod +x /path/to/fox-pilot-host
   ```

2. Test the binary directly:
   ```bash
   /path/to/fox-pilot-host
   ```

3. Check for missing dependencies or architecture mismatch

### WebSocket connection refused

1. Check if port 9222 is in use:
   ```bash
   lsof -i :9222
   ```

2. Ensure the native host is running (check extension status)

3. Verify firewall isn't blocking localhost connections

### Node.js version error

Fox Pilot requires Node.js 24+ for native TypeScript support:

```bash
node --version  # Should be v24.0.0 or higher

# Install latest Node.js with fnm
fnm install --lts
fnm use --lts
```

## Uninstallation

### Remove Native Messaging Host

```bash
# If installed via npm
fox-pilot-install --uninstall

# Or manually
bun run uninstall-host
```

### Remove CLI

```bash
npm uninstall -g @fox-pilot/cli
```

### Remove Extension

1. Go to `about:addons` in Firefox
2. Find Fox Pilot and click "Remove"
