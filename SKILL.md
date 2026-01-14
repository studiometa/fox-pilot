---
name: foxpilot
description: Firefox browser automation CLI for AI agents. Use when users ask to automate Firefox, navigate websites, fill forms, take screenshots, extract web data, or test web apps in Firefox. Trigger phrases include "in Firefox", "foxpilot", "go to [url]", "click on", "fill out the form", "take a screenshot", "scrape", "automate", or any browser interaction request mentioning Firefox.
---

# FoxPilot Skill

CLI-based Firefox browser automation optimized for AI agents. Simple commands, persistent sessions, accessibility snapshots with refs.

**Difference from agent-browser:** FoxPilot controls a real Firefox browser (not Chromium), preserving your existing session, cookies, and extensions.

## Setup

```bash
# Install the package
npm install -g foxpilot

# Install native messaging host (run once)
foxpilot install-host

# Load extension in Firefox
# 1. Go to about:debugging#/runtime/this-firefox
# 2. Click "Load Temporary Add-on"
# 3. Select extension/manifest.json
```

## Quick Start

```bash
foxpilot open example.com
foxpilot snapshot                    # Get accessibility tree with refs
foxpilot click @e2                   # Click by ref from snapshot
foxpilot fill @e3 "test@example.com" # Fill by ref
foxpilot screenshot /tmp/page.png
```

## Workflow Pattern

1. **Navigate** to URL
2. **Snapshot** to discover elements (use `-i` for interactive only)
3. **Interact** using refs (`@e1`, `@e2`, etc.)
4. **Verify** state with `get url`, `get title`, or screenshot
5. **Repeat** as needed

## Core Commands

### Navigation

```bash
foxpilot open <url>               # Navigate to URL
foxpilot back                     # Go back
foxpilot forward                  # Go forward
foxpilot reload                   # Reload page
```

### Snapshot (Element Discovery)

The snapshot command returns an accessibility tree with refs for each element:

```bash
foxpilot snapshot
# Output:
# - heading "Example Domain" [ref=@e1] [level=1]
# - button "Submit" [ref=@e2]
# - textbox "Email" [ref=@e3]
# - link "Learn more" [ref=@e4]
```

#### Snapshot Options

```bash
foxpilot snapshot -i              # Interactive elements only (buttons, inputs, links)
foxpilot snapshot -c              # Compact (remove empty structural elements)
foxpilot snapshot -d 3            # Limit depth to 3 levels
foxpilot snapshot -s "#main"      # Scope to CSS selector
foxpilot snapshot -i -c -d 5      # Combine options
```

**Recommended:** Use `snapshot -i -c` for most cases - shows only actionable elements.

### Interactions

```bash
foxpilot click <sel>              # Click element
foxpilot dblclick <sel>           # Double-click
foxpilot fill <sel> <text>        # Clear and fill input
foxpilot type <sel> <text>        # Type into element (append)
foxpilot press <key> [sel]        # Press key (Enter, Tab, Control+a)
foxpilot select <sel> <val>       # Select dropdown option
foxpilot check <sel>              # Check checkbox
foxpilot uncheck <sel>            # Uncheck checkbox
foxpilot scroll <dir> [px]        # Scroll (up/down/left/right)
foxpilot hover <sel>              # Hover element
```

### Get Information

```bash
foxpilot get text <sel>           # Get text content
foxpilot get html <sel>           # Get innerHTML
foxpilot get value <sel>          # Get input value
foxpilot get attr <sel> <attr>    # Get attribute
foxpilot get title                # Get page title
foxpilot get url                  # Get current URL
foxpilot get count <sel>          # Count matching elements
```

### Check State

```bash
foxpilot is visible <sel>         # Check if visible
foxpilot is enabled <sel>         # Check if enabled
foxpilot is checked <sel>         # Check if checked
```

### Screenshots

```bash
foxpilot screenshot [path]        # Take screenshot
foxpilot screenshot -f [path]     # Full page screenshot
```

### Waiting

```bash
foxpilot wait <selector>          # Wait for element visible
foxpilot wait 2000                # Wait 2 seconds
foxpilot wait --text "Welcome"    # Wait for text
foxpilot wait --url "**/success"  # Wait for URL pattern
```

### Semantic Locators (find command)

```bash
foxpilot find role button click --name "Submit"
foxpilot find text "Sign In" click
foxpilot find label "Email" fill "test@test.com"
foxpilot find placeholder "Search" fill "query"
```

### Tabs

```bash
foxpilot tab                      # List tabs
foxpilot tab new [url]            # New tab
foxpilot tab 2                    # Switch to tab 2
foxpilot tab close                # Close current tab
```

### JavaScript Execution

```bash
foxpilot eval "return document.title"
foxpilot eval "localStorage.getItem('token')"
```

## Selectors

### Refs (Recommended)

Use refs from snapshot for reliable element selection:

```bash
foxpilot click @e2
foxpilot fill @e3 "value"
foxpilot get text @e1
```

### CSS Selectors

```bash
foxpilot click "#id"
foxpilot click ".class"
foxpilot click "button[type=submit]"
```

## Common Patterns

### Login Flow

```bash
foxpilot open https://example.com/login
foxpilot snapshot -i
# Shows: textbox "Email" [ref=@e1], textbox "Password" [ref=@e2], button "Sign in" [ref=@e3]
foxpilot fill @e1 "user@example.com"
foxpilot fill @e2 "password123"
foxpilot click @e3
foxpilot wait --url "**/dashboard"
foxpilot get url
```

### Form Submission

```bash
foxpilot open https://example.com/contact
foxpilot snapshot -i -c
foxpilot fill @e1 "John Doe"
foxpilot fill @e2 "john@example.com"
foxpilot fill @e3 "Hello, this is my message"
foxpilot click @e4  # Submit button
foxpilot wait --text "Thank you"
foxpilot screenshot /tmp/confirmation.png
```

### Scraping Data

```bash
foxpilot open https://example.com/products
foxpilot snapshot -s ".product-list"
foxpilot get text ".product-title"
foxpilot get attr ".product-link" "href"
```

### Debug Failed Interaction

```bash
foxpilot screenshot /tmp/debug.png
foxpilot get url
foxpilot get title
foxpilot snapshot -i
```

## Options

| Option             | Description               |
| ------------------ | ------------------------- |
| `--json`           | JSON output (for parsing) |
| `-f, --full`       | Full page screenshot      |
| `-i, --interactive`| Interactive elements only |
| `-c, --compact`    | Compact snapshot          |
| `-d, --depth <n>`  | Limit snapshot depth      |
| `-s, --scope <sel>`| Scope snapshot to selector|

## Tips

- **Always snapshot first** before interacting with unknown pages
- **Use `-i -c` flags** on snapshot to reduce noise
- **Prefer refs over CSS** for reliability
- **Check `--json` output** when you need to parse results programmatically
- **Firefox session is preserved** - your cookies, logins, and extensions work

## Troubleshooting

```bash
# Check if native host is running
lsof -i :9222

# View native host logs
tail -f /tmp/fox-pilot.log

# Reinstall native host
foxpilot install-host

# Reload extension
# Go to about:debugging#/runtime/this-firefox and click "Reload"
```
