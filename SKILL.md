---
name: foxpilot
description: Control Firefox browser remotely via WebSocket. Use when users ask to automate Firefox, navigate websites in Firefox, fill forms, take screenshots, extract web data, or test web apps in Firefox specifically. Trigger phrases include "in Firefox", "open in Firefox", "Firefox automation", or any browser task where Firefox is preferred over Chromium.
---

# FoxPilot Skill

Control Firefox browser remotely via WebSocket API. The extension must be installed and running in Firefox.

**Source:** /Users/titouanmathis/Lab/firefox-command

## Setup

### First-time installation

```bash
cd /Users/titouanmathis/Lab/firefox-command

# Install native host dependencies
cd native-host && npm install && cd ..

# Register native messaging host
npm run install-host
```

Then manually load the extension in Firefox:
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `/Users/titouanmathis/Lab/firefox-command/extension/manifest.json`

### Verify connection

Click the FoxPilot icon in Firefox toolbar - it should show "Connected".

## Writing Scripts

Execute scripts using the FoxPilotClient:

```bash
cd /Users/titouanmathis/Lab/firefox-command && node <<'EOF'
import { FoxPilotClient } from './client/foxpilot-client.js';

const client = new FoxPilotClient();
await client.connect();

await client.navigate('https://example.com');
await client.wait(1000);

const { title } = await client.getTitle();
const { url } = await client.getUrl();
console.log({ title, url });

client.disconnect();
EOF
```

## Client API

### Connection

```javascript
import { FoxPilotClient } from './client/foxpilot-client.js';

const client = new FoxPilotClient({
  url: 'ws://localhost:9222',           // Default
  token: process.env.FOXPILOT_TOKEN     // Optional auth token
});

await client.connect();
client.disconnect();
```

### Navigation

```javascript
await client.navigate('https://example.com');
await client.back();
await client.forward();
await client.reload();

const tabs = await client.getTabs();        // List all tabs
await client.switchTab(tabId);              // Switch to tab
const { tabId } = await client.newTab();    // Open new tab
await client.closeTab(tabId);               // Close tab
```

### DOM Interaction

```javascript
await client.click('#button');
await client.type('#input', 'Hello world');
await client.scroll({ x: 0, y: 500 });
await client.scrollTo('#element');
await client.hover('#menu');

const { value } = await client.getAttribute('#link', 'href');
const { value } = await client.getProperty('#input', 'value');
```

### Data Extraction

```javascript
const { url } = await client.getUrl();
const { title } = await client.getTitle();
const { html } = await client.getHTML('#content');
const { text } = await client.getText('#content');
const { dataUrl } = await client.screenshot();  // Base64 PNG
```

### Query Elements

```javascript
const { count, elements } = await client.query('.items');
// elements[]: { index, tagName, id, className, textContent, isVisible, rect }
```

### JavaScript Execution

```javascript
const { result } = await client.evaluate(`
  return document.querySelectorAll('a').length;
`);

// Async code supported
const { result } = await client.evaluate(`
  const response = await fetch('/api/data');
  return response.json();
`);
```

### Waiting

```javascript
await client.wait(2000);                              // Fixed delay
await client.waitForSelector('.loaded', 10000);       // Wait for element (timeout ms)
```

## Common Patterns

### Navigate and extract data

```bash
cd /Users/titouanmathis/Lab/firefox-command && node <<'EOF'
import { FoxPilotClient } from './client/foxpilot-client.js';

const client = new FoxPilotClient();
await client.connect();

await client.navigate('https://news.ycombinator.com');
await client.wait(2000);

const { result: stories } = await client.evaluate(`
  return Array.from(document.querySelectorAll('.athing')).slice(0, 5).map(el => ({
    title: el.querySelector('.titleline > a')?.textContent,
    url: el.querySelector('.titleline > a')?.href
  }));
`);

console.log('Top 5 stories:', stories);
client.disconnect();
EOF
```

### Fill and submit a form

```bash
cd /Users/titouanmathis/Lab/firefox-command && node <<'EOF'
import { FoxPilotClient } from './client/foxpilot-client.js';

const client = new FoxPilotClient();
await client.connect();

await client.navigate('https://example.com/login');
await client.wait(1000);

await client.type('#username', 'myuser');
await client.type('#password', 'mypassword');
await client.click('button[type="submit"]');

await client.wait(3000);
const { url } = await client.getUrl();
console.log('After login:', url);

client.disconnect();
EOF
```

### Take a screenshot

```bash
cd /Users/titouanmathis/Lab/firefox-command && node <<'EOF'
import { FoxPilotClient } from './client/foxpilot-client.js';
import { writeFileSync } from 'fs';

const client = new FoxPilotClient();
await client.connect();

await client.navigate('https://example.com');
await client.wait(1000);

const { dataUrl } = await client.screenshot();
const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
writeFileSync('/tmp/screenshot.png', Buffer.from(base64Data, 'base64'));
console.log('Screenshot saved to /tmp/screenshot.png');

client.disconnect();
EOF
```

### Multi-tab workflow

```bash
cd /Users/titouanmathis/Lab/firefox-command && node <<'EOF'
import { FoxPilotClient } from './client/foxpilot-client.js';

const client = new FoxPilotClient();
await client.connect();

// Open two tabs
const { tabId: tab1 } = await client.newTab('https://example.com');
const { tabId: tab2 } = await client.newTab('https://google.com');

await client.wait(2000);

// Switch between tabs and get titles
await client.switchTab(tab1);
const { title: title1 } = await client.getTitle();

await client.switchTab(tab2);
const { title: title2 } = await client.getTitle();

console.log({ tab1: title1, tab2: title2 });

// Cleanup
await client.closeTab(tab1);
await client.closeTab(tab2);

client.disconnect();
EOF
```

## Error Handling

```javascript
try {
  await client.click('#nonexistent');
} catch (error) {
  console.error(error.code);    // 'ELEMENT_NOT_FOUND'
  console.error(error.message); // 'Element not found: #nonexistent'
}
```

Error codes:
- `ELEMENT_NOT_FOUND` - Selector didn't match any element
- `TIMEOUT` - waitForSelector exceeded timeout
- `NO_ACTIVE_TAB` - No active tab in Firefox
- `EVAL_ERROR` - JavaScript evaluation failed
- `NOT_AUTHENTICATED` - Auth token required/invalid

## Debugging

Check native host logs:
```bash
cat /tmp/foxpilot.log
```

Check if WebSocket server is running:
```bash
lsof -i :9222
```

Restart connection:
1. Kill existing host: `pkill -f foxpilot`
2. Reload extension in Firefox (`about:debugging`)

## FoxPilot vs dev-browser

| Feature | FoxPilot | dev-browser |
|---------|----------|-------------|
| Browser | Firefox | Chromium |
| Setup | Extension + native host | Clone + npm install |
| Persistence | Browser stays open | Server keeps pages |
| Use case | Firefox-specific testing | General automation |

Use FoxPilot when:
- You need Firefox specifically
- Testing Firefox compatibility
- User prefers Firefox
- Need access to Firefox-specific features
