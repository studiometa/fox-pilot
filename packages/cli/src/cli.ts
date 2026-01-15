#!/usr/bin/env -S node --experimental-transform-types

/**
 * Fox Pilot CLI
 *
 * Command-line interface for browser automation via Firefox.
 * Inspired by agent-browser for a simple, AI-friendly CLI experience.
 *
 * @example
 * fox-pilot open https://example.com
 * fox-pilot snapshot -i
 * fox-pilot click @e2
 * fox-pilot fill @e3 "hello@test.com"
 * fox-pilot screenshot /tmp/page.png
 */

import { FoxPilotClient } from '@fox-pilot/client';
import { writeFileSync, existsSync, mkdirSync, chmodSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { platform, homedir, arch } from 'os';

// =============================================================================
// Types
// =============================================================================

type Flags = Record<string, string | boolean>;

interface ParsedArgs {
  args: string[];
  flags: Flags;
}

// =============================================================================
// Configuration
// =============================================================================

const VERSION = '1.0.0';
const HOST_NAME = 'fox_pilot';
const EXTENSION_ID = 'fox-pilot@ikko.fr';

let client: FoxPilotClient | null = null;
let outputJson = false;

// =============================================================================
// Native Host Installation
// =============================================================================

interface NativeHostManifest {
  name: string;
  description: string;
  path: string;
  type: 'stdio';
  allowed_extensions: string[];
}

function getPlatformPackage(): string {
  const os = platform();
  const cpu = arch();

  if (os === 'darwin' && cpu === 'arm64') {
    return '@fox-pilot/native-host-darwin-arm64';
  } else if (os === 'darwin' && cpu === 'x64') {
    return '@fox-pilot/native-host-darwin-x64';
  } else if (os === 'linux' && cpu === 'x64') {
    return '@fox-pilot/native-host-linux-x64';
  } else {
    throw new Error(`Unsupported platform: ${os}-${cpu}`);
  }
}

function findBinaryPath(): string {
  const platformPkg = getPlatformPackage();
  const platformDir = platformPkg.replace('@fox-pilot/', '');
  const __dirname = dirname(fileURLToPath(import.meta.url));

  // Try to find the platform-specific package via import.meta.resolve
  try {
    const pkgUrl = import.meta.resolve(`${platformPkg}/package.json`);
    const binPath = join(dirname(fileURLToPath(pkgUrl)), 'bin', 'fox-pilot-host');

    if (existsSync(binPath)) {
      return binPath;
    }
  } catch {
    // Package not found, try workspace paths
  }

  // Fallback: check workspace paths (for development)
  const workspacePaths = [
    join(__dirname, '..', '..', platformDir, 'bin', 'fox-pilot-host'),
    join(__dirname, '..', '..', 'native-host', 'dist', 'fox-pilot-host'),
  ];

  for (const binPath of workspacePaths) {
    if (existsSync(binPath)) {
      return binPath;
    }
  }

  throw new Error(
    `Native host binary not found. Please ensure ${platformPkg} is installed.\n` +
    `Run: npm install ${platformPkg}`
  );
}

function getNativeHostsDir(): string {
  const os = platform();

  switch (os) {
    case 'darwin':
      return join(homedir(), 'Library/Application Support/Mozilla/NativeMessagingHosts');
    case 'linux':
      return join(homedir(), '.mozilla/native-messaging-hosts');
    case 'win32':
      return join(process.env.APPDATA || '', 'Mozilla', 'NativeMessagingHosts');
    default:
      throw new Error(`Unsupported platform: ${os}`);
  }
}

function createNativeHostManifest(binaryPath: string): NativeHostManifest {
  return {
    name: HOST_NAME,
    description: 'Fox Pilot native messaging host',
    path: binaryPath,
    type: 'stdio',
    allowed_extensions: [EXTENSION_ID],
  };
}

// =============================================================================
// Output Helpers
// =============================================================================

function output(data: unknown): void {
  if (outputJson) {
    console.log(JSON.stringify(data, null, 2));
  } else if (typeof data === 'string') {
    console.log(data);
  } else if (data && typeof data === 'object') {
    if ('text' in data && typeof data.text === 'string') {
      console.log(data.text);
    } else if ('tree' in data) {
      const d = data as { text?: string; tree: unknown };
      console.log(d.text || JSON.stringify(d.tree, null, 2));
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

function success(message: string): void {
  if (!outputJson) {
    console.log(`✓ ${message}`);
  }
}

function error(message: string, code = 1): never {
  if (outputJson) {
    console.log(JSON.stringify({ error: message }));
  } else {
    console.error(`✗ ${message}`);
  }
  process.exit(code);
}

// =============================================================================
// Client Connection
// =============================================================================

async function getClient(): Promise<FoxPilotClient> {
  if (client) return client;

  client = new FoxPilotClient();

  try {
    await client.connect();
    return client;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    error(`Failed to connect to Fox Pilot: ${message}. Is the extension running?`);
  }
}

function disconnect(): void {
  if (client) {
    client.disconnect();
  }
}

// =============================================================================
// Commands
// =============================================================================

const commands: Record<string, (args: string[], flags: Flags) => Promise<void>> = {
  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async open(args) {
    const url = args[0];
    if (!url) error('Usage: fox-pilot open <url>');

    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const c = await getClient();
    await c.navigate(fullUrl);
    success(`Navigated to ${fullUrl}`);
  },

  async back() {
    const c = await getClient();
    await c.back();
    success('Navigated back');
  },

  async forward() {
    const c = await getClient();
    await c.forward();
    success('Navigated forward');
  },

  async reload() {
    const c = await getClient();
    await c.reload();
    success('Page reloaded');
  },

  // ---------------------------------------------------------------------------
  // Snapshot
  // ---------------------------------------------------------------------------

  async snapshot(_args, flags) {
    const c = await getClient();
    const result = await c.snapshot({
      interactive: Boolean(flags.i || flags.interactive),
      compact: Boolean(flags.c || flags.compact),
      depth: flags.d ? Number(flags.d) : flags.depth ? Number(flags.depth) : null,
      scope: (flags.s as string) || (flags.scope as string) || null,
    });

    if (outputJson) {
      output(result);
    } else {
      console.log(result.text);
      console.log(`\n(${result.refCount} elements with refs)`);
    }
  },

  // ---------------------------------------------------------------------------
  // DOM Interaction
  // ---------------------------------------------------------------------------

  async click(args) {
    const selector = args[0];
    if (!selector) error('Usage: fox-pilot click <selector>');

    const c = await getClient();
    await c.click(selector);
    success(`Clicked ${selector}`);
  },

  async dblclick(args) {
    const selector = args[0];
    if (!selector) error('Usage: fox-pilot dblclick <selector>');

    const c = await getClient();
    await c.click(selector);
    await c.click(selector);
    success(`Double-clicked ${selector}`);
  },

  async type(args) {
    const selector = args[0];
    const text = args.slice(1).join(' ');
    if (!selector || !text) error('Usage: fox-pilot type <selector> <text>');

    const c = await getClient();
    await c.type(selector, text);
    success(`Typed into ${selector}`);
  },

  async fill(args) {
    const selector = args[0];
    const text = args.slice(1).join(' ');
    if (!selector || text === undefined) error('Usage: fox-pilot fill <selector> <text>');

    const c = await getClient();
    await c.fill(selector, text);
    success(`Filled ${selector}`);
  },

  async press(args) {
    const key = args[0];
    const selector = args[1] || null;
    if (!key) error('Usage: fox-pilot press <key> [selector]');

    const c = await getClient();
    await c.press(key, selector);
    success(`Pressed ${key}`);
  },

  async select(args) {
    const selector = args[0];
    const value = args[1];
    if (!selector || !value) error('Usage: fox-pilot select <selector> <value>');

    const c = await getClient();
    const result = await c.select(selector, value);
    success(`Selected "${result.selectedText}" in ${selector}`);
  },

  async check(args) {
    const selector = args[0];
    if (!selector) error('Usage: fox-pilot check <selector>');

    const c = await getClient();
    await c.check(selector);
    success(`Checked ${selector}`);
  },

  async uncheck(args) {
    const selector = args[0];
    if (!selector) error('Usage: fox-pilot uncheck <selector>');

    const c = await getClient();
    await c.uncheck(selector);
    success(`Unchecked ${selector}`);
  },

  async hover(args) {
    const selector = args[0];
    if (!selector) error('Usage: fox-pilot hover <selector>');

    const c = await getClient();
    await c.hover(selector);
    success(`Hovered ${selector}`);
  },

  async scroll(args) {
    const direction = args[0];
    const amount = parseInt(args[1]) || 100;

    const c = await getClient();

    if (['up', 'down', 'left', 'right'].includes(direction)) {
      await c.scroll({ direction: direction as 'up' | 'down' | 'left' | 'right', amount });
      success(`Scrolled ${direction} ${amount}px`);
    } else if (direction) {
      await c.scrollTo(direction);
      success(`Scrolled to ${direction}`);
    } else {
      error('Usage: fox-pilot scroll <direction|selector> [amount]');
    }
  },

  // ---------------------------------------------------------------------------
  // Get Information
  // ---------------------------------------------------------------------------

  async get(args) {
    const subcommand = args[0];
    const selector = args[1];
    const extra = args[2];

    const c = await getClient();

    switch (subcommand) {
      case 'text': {
        if (!selector) error('Usage: fox-pilot get text <selector>');
        const result = await c.getText(selector);
        output({ text: result.text });
        break;
      }
      case 'html': {
        if (!selector) error('Usage: fox-pilot get html <selector>');
        const result = await c.getHTML(selector);
        output({ html: result.html });
        break;
      }
      case 'value': {
        if (!selector) error('Usage: fox-pilot get value <selector>');
        const result = await c.getValue(selector);
        output({ value: result.value });
        break;
      }
      case 'attr': {
        if (!selector || !extra) error('Usage: fox-pilot get attr <selector> <attribute>');
        const result = await c.getAttribute(selector, extra);
        output({ attribute: extra, value: result.value });
        break;
      }
      case 'title': {
        const result = await c.getTitle();
        output({ title: result.title });
        break;
      }
      case 'url': {
        const result = await c.getUrl();
        output({ url: result.url });
        break;
      }
      case 'count': {
        if (!selector) error('Usage: fox-pilot get count <selector>');
        const result = await c.query(selector);
        output({ count: result.count });
        break;
      }
      default:
        error('Usage: fox-pilot get <text|html|value|attr|title|url|count> [selector] [extra]');
    }
  },

  // ---------------------------------------------------------------------------
  // State Checks
  // ---------------------------------------------------------------------------

  async is(args) {
    const subcommand = args[0];
    const selector = args[1];

    if (!selector) error('Usage: fox-pilot is <visible|enabled|checked> <selector>');

    const c = await getClient();

    switch (subcommand) {
      case 'visible': {
        const result = await c.isVisible(selector);
        output({ visible: result.visible });
        break;
      }
      case 'enabled': {
        const result = await c.isEnabled(selector);
        output({ enabled: result.enabled });
        break;
      }
      case 'checked': {
        const result = await c.isChecked(selector);
        output({ checked: result.checked });
        break;
      }
      default:
        error('Usage: fox-pilot is <visible|enabled|checked> <selector>');
    }
  },

  // ---------------------------------------------------------------------------
  // Screenshots
  // ---------------------------------------------------------------------------

  async screenshot(args, flags) {
    const path = args[0] || '/tmp/fox-pilot-screenshot.png';
    const fullPage = Boolean(flags.f || flags.full);

    const c = await getClient();
    const result = await c.screenshot({ fullPage });

    if (result.dataUrl) {
      const base64Data = result.dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const dir = dirname(path);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(path, buffer);
      success(`Screenshot saved to ${path}`);
      output({ path, size: buffer.length });
    } else {
      error('Failed to capture screenshot');
    }
  },

  // ---------------------------------------------------------------------------
  // Waiting
  // ---------------------------------------------------------------------------

  async wait(args, flags) {
    const arg = args[0];
    const c = await getClient();

    if (flags.text) {
      await c.waitForText(String(flags.text), 30000);
      success(`Found text: "${flags.text}"`);
    } else if (flags.url) {
      const pattern = String(flags.url);
      const timeout = 30000;
      const start = Date.now();

      while (Date.now() - start < timeout) {
        const result = await c.getUrl();
        if (result.url.includes(pattern.replace('**/', ''))) {
          success(`URL matched: ${result.url}`);
          return;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      error(`Timeout waiting for URL: ${pattern}`);
    } else if (arg && !isNaN(Number(arg))) {
      await c.wait(parseInt(arg));
      success(`Waited ${arg}ms`);
    } else if (arg) {
      await c.waitForSelector(arg);
      success(`Element appeared: ${arg}`);
    } else {
      error('Usage: fox-pilot wait <selector|ms> [--text "..."] [--url "..."]');
    }
  },

  // ---------------------------------------------------------------------------
  // Semantic Locators (find command)
  // ---------------------------------------------------------------------------

  async find(args, flags) {
    const locatorType = args[0];
    const locatorValue = args[1];
    const action = args[2];

    if (!locatorType || !locatorValue) {
      error('Usage: fox-pilot find <role|text|label|placeholder> <value> [action] [--name "..."]');
    }

    const c = await getClient();
    let result: { ref: string; [key: string]: unknown };

    switch (locatorType) {
      case 'role':
        result = await c.findByRole(locatorValue, {
          name: flags.name as string,
          index: flags.index ? Number(flags.index) : 0,
        });
        break;
      case 'text':
        result = await c.findByText(locatorValue, {
          exact: Boolean(flags.exact),
          index: flags.index ? Number(flags.index) : 0,
        });
        break;
      case 'label':
        result = await c.findByLabel(locatorValue, {
          index: flags.index ? Number(flags.index) : 0,
        });
        break;
      case 'placeholder':
        result = await c.findByPlaceholder(locatorValue, {
          index: flags.index ? Number(flags.index) : 0,
        });
        break;
      default:
        error('Locator type must be: role, text, label, or placeholder');
    }

    if (action && result.ref) {
      const actionArgs = args.slice(3);

      switch (action) {
        case 'click':
          await c.click(result.ref);
          success(`Clicked element ${result.ref}`);
          break;
        case 'fill':
          if (!actionArgs[0]) error('fill requires text argument');
          await c.fill(result.ref, actionArgs.join(' '));
          success(`Filled element ${result.ref}`);
          break;
        case 'type':
          if (!actionArgs[0]) error('type requires text argument');
          await c.type(result.ref, actionArgs.join(' '));
          success(`Typed into element ${result.ref}`);
          break;
        default:
          error(`Unknown action: ${action}`);
      }
    } else {
      output(result);
    }
  },

  // ---------------------------------------------------------------------------
  // Tab Management
  // ---------------------------------------------------------------------------

  async tab(args) {
    const subcommand = args[0];
    const c = await getClient();

    if (!subcommand) {
      const tabs = await c.getTabs();
      if (outputJson) {
        output(tabs);
      } else {
        tabs.forEach((tab, i) => {
          const marker = tab.active ? '→' : ' ';
          console.log(`${marker} [${i}] ${tab.title} (${tab.url})`);
        });
      }
      return;
    }

    switch (subcommand) {
      case 'new': {
        const url = args[1];
        const result = await c.newTab(url);
        success(`Opened new tab${url ? `: ${url}` : ''}`);
        output({ tabId: result.tabId });
        break;
      }
      case 'close': {
        const tabId = args[1] ? parseInt(args[1]) : undefined;
        await c.closeTab(tabId);
        success('Closed tab');
        break;
      }
      default: {
        const index = parseInt(subcommand);
        if (isNaN(index)) {
          error('Usage: fox-pilot tab [new|close|<index>]');
        }
        const tabs = await c.getTabs();
        if (index < 0 || index >= tabs.length) {
          error(`Tab index out of range: ${index}`);
        }
        await c.switchTab(tabs[index].id);
        success(`Switched to tab ${index}`);
      }
    }
  },

  // ---------------------------------------------------------------------------
  // JavaScript Execution
  // ---------------------------------------------------------------------------

  async eval(args) {
    const code = args.join(' ');
    if (!code) error('Usage: fox-pilot eval <javascript>');

    const c = await getClient();
    const result = await c.evaluate(code);

    if ('error' in result) {
      error(`Eval error: ${result.error.message}`);
    } else {
      output({ result: result.result });
    }
  },

  // ---------------------------------------------------------------------------
  // Installation
  // ---------------------------------------------------------------------------

  async install() {
    console.log('Installing Fox Pilot native messaging host...\n');

    // Find the binary
    let binaryPath: string;
    try {
      binaryPath = findBinaryPath();
      console.log(`✓ Found binary: ${binaryPath}`);
    } catch (err) {
      error((err as Error).message);
    }

    const hostsDir = getNativeHostsDir();
    const manifestPath = join(hostsDir, `${HOST_NAME}.json`);
    const manifest = createNativeHostManifest(binaryPath);

    // Create directory if it doesn't exist
    try {
      mkdirSync(hostsDir, { recursive: true });
      console.log(`✓ Created directory: ${hostsDir}`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw err;
      }
    }

    // Write manifest
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✓ Written manifest: ${manifestPath}`);

    // Make binary executable (Unix only)
    if (platform() !== 'win32') {
      try {
        chmodSync(binaryPath, 0o755);
        console.log(`✓ Made executable: ${binaryPath}`);
      } catch (err) {
        console.warn(`⚠ Could not make executable: ${(err as Error).message}`);
      }
    }

    // Windows-specific: Registry entry
    if (platform() === 'win32') {
      console.log('\n⚠ Windows requires a registry entry.');
      console.log('Run the following in an elevated PowerShell:\n');
      console.log(`New-Item -Path "HKCU:\\Software\\Mozilla\\NativeMessagingHosts\\${HOST_NAME}" -Force`);
      console.log(`Set-ItemProperty -Path "HKCU:\\Software\\Mozilla\\NativeMessagingHosts\\${HOST_NAME}" -Name "(Default)" -Value "${manifestPath}"`);
    }

    console.log('\n✅ Installation complete!\n');
    console.log('Next steps:');
    console.log('1. Load the extension in Firefox (about:debugging)');
    console.log('2. Select packages/extension/src/manifest.json');
    console.log('3. The native host will start automatically');
  },

  async uninstall() {
    console.log('Uninstalling Fox Pilot native messaging host...\n');

    const hostsDir = getNativeHostsDir();
    const manifestPath = join(hostsDir, `${HOST_NAME}.json`);

    try {
      unlinkSync(manifestPath);
      console.log(`✓ Removed manifest: ${manifestPath}`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`⚠ Manifest not found: ${manifestPath}`);
      } else {
        throw err;
      }
    }

    console.log('\n✅ Uninstallation complete!');
  },

  // ---------------------------------------------------------------------------
  // Help
  // ---------------------------------------------------------------------------

  async help() {
    console.log(`
Fox Pilot CLI v${VERSION}
Browser automation for AI agents via Firefox

USAGE:
  fox-pilot <command> [args] [options]

NAVIGATION:
  open <url>                    Navigate to URL
  back                          Go back
  forward                       Go forward
  reload                        Reload page

SNAPSHOT:
  snapshot                      Get accessibility tree with refs
    -i, --interactive           Show only interactive elements
    -c, --compact               Remove empty structural elements
    -d, --depth <n>             Limit tree depth
    -s, --scope <selector>      Scope to selector

INTERACTION:
  click <selector>              Click element
  dblclick <selector>           Double-click element
  fill <selector> <text>        Clear and fill input
  type <selector> <text>        Type into element (append)
  press <key> [selector]        Press key (Enter, Tab, Control+a)
  select <selector> <value>     Select dropdown option
  check <selector>              Check checkbox
  uncheck <selector>            Uncheck checkbox
  hover <selector>              Hover element
  scroll <dir|selector> [px]    Scroll (up/down/left/right or to element)

GET INFORMATION:
  get text <selector>           Get text content
  get html <selector>           Get innerHTML
  get value <selector>          Get input value
  get attr <selector> <attr>    Get attribute
  get title                     Get page title
  get url                       Get current URL
  get count <selector>          Count matching elements

STATE CHECKS:
  is visible <selector>         Check if visible
  is enabled <selector>         Check if enabled
  is checked <selector>         Check if checked

SCREENSHOTS:
  screenshot [path]             Take screenshot
    -f, --full                  Full page screenshot

WAITING:
  wait <selector>               Wait for element visible
  wait <ms>                     Wait for duration
  wait --text "..."             Wait for text to appear
  wait --url "..."              Wait for URL pattern

SEMANTIC LOCATORS:
  find role <role> [action]     Find by ARIA role
  find text <text> [action]     Find by text content
  find label <label> [action]   Find by label
  find placeholder <ph> [action] Find by placeholder
    --name "..."                Filter by accessible name
    --index <n>                 Select nth match
    --exact                     Exact text match

TABS:
  tab                           List all tabs
  tab new [url]                 Open new tab
  tab close [id]                Close tab
  tab <index>                   Switch to tab

INSTALLATION:
  install                       Install native messaging host
  uninstall                     Uninstall native messaging host

OTHER:
  eval <javascript>             Execute JavaScript
  help                          Show this help
  version                       Show version

OPTIONS:
  --json                        Output as JSON

SELECTORS:
  @e1, @e2, ...                 Refs from snapshot (recommended)
  #id                           CSS ID selector
  .class                        CSS class selector
  element                       CSS tag selector

EXAMPLES:
  fox-pilot open example.com
  fox-pilot snapshot -i -c
  fox-pilot click @e2
  fox-pilot fill @e3 "user@example.com"
  fox-pilot find role button click --name "Submit"
  fox-pilot wait --text "Success"
  fox-pilot screenshot /tmp/result.png
`);
  },

  async version() {
    console.log(`Fox Pilot CLI v${VERSION}`);
  },
};

// =============================================================================
// Argument Parsing
// =============================================================================

function parseArgs(argv: string[]): ParsedArgs {
  const args: string[] = [];
  const flags: Flags = {};

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = argv[i + 1];

      if (nextArg && !nextArg.startsWith('-')) {
        flags[key] = nextArg;
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      const nextArg = argv[i + 1];

      if (nextArg && !nextArg.startsWith('-')) {
        flags[key] = nextArg;
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else {
      args.push(arg);
      i++;
    }
  }

  return { args, flags };
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { args, flags } = parseArgs(argv);

  outputJson = Boolean(flags.json);

  const command = args[0];
  const commandArgs = args.slice(1);

  if (!command || command === 'help' || flags.help || flags.h) {
    await commands.help([], {});
    process.exit(0);
  }

  if (command === 'version' || flags.version || flags.v) {
    await commands.version([], {});
    process.exit(0);
  }

  const handler = commands[command];
  if (!handler) {
    error(`Unknown command: ${command}. Run 'fox-pilot help' for usage.`);
  }

  try {
    await handler(commandArgs, flags);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    error(message);
  } finally {
    disconnect();
    process.exit(0);
  }
}

main();
