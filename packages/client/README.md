# @fox-pilot/client

TypeScript client library for Fox Pilot browser automation.

## Installation

```bash
npm install @fox-pilot/client
```

**Requirements:** Node.js 24+ (for native TypeScript support)

## Quick Start

```typescript
import { FoxPilotClient } from '@fox-pilot/client';

const client = new FoxPilotClient();
await client.connect();

// Navigate to a page
await client.navigate('https://example.com');

// Interact with elements
await client.click('#button');
await client.fill('#input', 'Hello world');

// Extract data
const { text } = await client.getText('.content');
const { title } = await client.getTitle();

// Take a screenshot
const { dataUrl } = await client.screenshot({ fullPage: true });

client.disconnect();
```

## API Reference

### Constructor

```typescript
new FoxPilotClient(options?: ClientOptions)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | `string` | `'ws://localhost:9222'` | WebSocket server URL |
| `token` | `string` | Auto-detected | Authentication token |

The token is automatically read from:
1. `FOX_PILOT_TOKEN` environment variable
2. `~/.config/fox-pilot/config.json` (generated on first use)

### Connection

```typescript
await client.connect(): Promise<void>
client.disconnect(): void
```

### Navigation

```typescript
await client.navigate(url: string): Promise<{ success: boolean }>
await client.back(): Promise<{ success: boolean }>
await client.forward(): Promise<{ success: boolean }>
await client.reload(): Promise<{ success: boolean }>
```

### Tab Management

```typescript
await client.getTabs(): Promise<Tab[]>
await client.switchTab(tabId: number): Promise<{ success: boolean }>
await client.newTab(url?: string): Promise<{ tabId: number }>
await client.closeTab(tabId?: number): Promise<{ success: boolean }>
```

### DOM Interaction

```typescript
await client.click(selector: string): Promise<{ success: boolean }>
await client.type(selector: string, text: string): Promise<{ success: boolean }>
await client.fill(selector: string, text: string): Promise<{ success: boolean }>
await client.press(key: string, selector?: string): Promise<{ success: boolean }>
await client.select(selector: string, value: string): Promise<{ success: boolean; selectedValue: string; selectedText: string }>
await client.check(selector: string): Promise<{ success: boolean; checked: boolean }>
await client.uncheck(selector: string): Promise<{ success: boolean; checked: boolean }>
await client.hover(selector: string): Promise<{ success: boolean }>
await client.scroll(options: ScrollOptions): Promise<{ success: boolean }>
await client.scrollTo(selector: string): Promise<{ success: boolean }>
```

### Accessibility Snapshot

```typescript
await client.snapshot(options?: SnapshotOptions): Promise<{ tree: unknown; text: string; refCount: number }>
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `interactive` | `boolean` | `false` | Show only interactive elements |
| `compact` | `boolean` | `false` | Remove empty structural elements |
| `depth` | `number \| null` | `null` | Limit tree depth |
| `scope` | `string \| null` | `null` | CSS selector to scope snapshot |

### Semantic Locators

```typescript
await client.findByRole(role: string, options?: FindByRoleOptions): Promise<{ ref: string; role: string; name: string; count: number }>
await client.findByText(text: string, options?: FindByTextOptions): Promise<{ ref: string; tagName: string; text: string; count: number }>
await client.findByLabel(label: string, options?: FindByLabelOptions): Promise<{ ref: string; tagName: string; type: string | null; count: number }>
await client.findByPlaceholder(placeholder: string, options?: FindByPlaceholderOptions): Promise<{ ref: string; tagName: string; type: string | null; placeholder: string; count: number }>
```

### Data Extraction

```typescript
await client.getText(selector?: string): Promise<{ text: string }>
await client.getHTML(selector?: string): Promise<{ html: string }>
await client.getValue(selector: string): Promise<{ value: string }>
await client.getAttribute(selector: string, attribute: string): Promise<{ value: string | null }>
await client.getProperty(selector: string, property: string): Promise<{ value: unknown }>
await client.getUrl(): Promise<{ url: string }>
await client.getTitle(): Promise<{ title: string }>
await client.query(selector: string): Promise<{ count: number; elements: unknown[] }>
```

### State Checks

```typescript
await client.isVisible(selector: string): Promise<{ visible: boolean }>
await client.isEnabled(selector: string): Promise<{ enabled: boolean }>
await client.isChecked(selector: string): Promise<{ checked: boolean }>
```

### Screenshots

```typescript
await client.screenshot(options?: ScreenshotOptions): Promise<{ dataUrl: string }>
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fullPage` | `boolean` | `false` | Capture full page |

### JavaScript Execution

```typescript
await client.evaluate<T>(code: string): Promise<{ result: T } | { error: { code: string; message: string } }>
```

### Waiting

```typescript
await client.waitForSelector(selector: string, timeout?: number): Promise<{ success: boolean; ref: string; element: unknown }>
await client.waitForText(text: string, timeout?: number): Promise<{ success: boolean; found: boolean }>
await client.wait(ms: number): Promise<{ success: boolean }>
```

### Events

```typescript
client.on(event: string, handler: (data: unknown) => void): void
```

## Selectors

The client supports multiple selector types:

| Type | Example | Description |
|------|---------|-------------|
| Refs | `@e1`, `@e2` | Element refs from `snapshot()` |
| CSS | `#id`, `.class`, `div` | Standard CSS selectors |
| Complex | `form input[type="email"]` | Any valid CSS selector |

**Tip:** Use `snapshot({ interactive: true, compact: true })` to get element refs, then interact using `@e1`, `@e2`, etc.

## Error Handling

All methods throw errors with a `code` property for programmatic handling:

```typescript
try {
  await client.click('#nonexistent');
} catch (error) {
  if (error.code === 'ELEMENT_NOT_FOUND') {
    console.log('Element not found');
  }
}
```

Common error codes:
- `ELEMENT_NOT_FOUND` - Selector didn't match any element
- `TIMEOUT` - Operation timed out
- `NOT_AUTHENTICATED` - Invalid or missing token
- `CONNECTION_CLOSED` - WebSocket connection lost

## License

MIT
