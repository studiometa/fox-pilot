#!/usr/bin/env node

/**
 * FoxPilot CLI
 *
 * Command-line interface for browser automation via Firefox.
 * Inspired by agent-browser for a simple, AI-friendly CLI experience.
 *
 * @example
 * foxpilot open https://example.com
 * foxpilot snapshot -i
 * foxpilot click @e2
 * foxpilot fill @e3 "hello@test.com"
 * foxpilot screenshot /tmp/page.png
 */

import { FoxPilotClient } from '../client/foxpilot-client.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

// =============================================================================
// Configuration
// =============================================================================

const VERSION = '1.0.0';
let client = null;
let outputJson = false;

// =============================================================================
// Output Helpers
// =============================================================================

function output(data) {
  if (outputJson) {
    console.log(JSON.stringify(data, null, 2));
  } else if (typeof data === 'string') {
    console.log(data);
  } else if (data.text) {
    console.log(data.text);
  } else if (data.tree) {
    console.log(data.text || JSON.stringify(data.tree, null, 2));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

function success(message) {
  if (!outputJson) {
    console.log(`✓ ${message}`);
  }
}

function error(message, code = 1) {
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

async function getClient() {
  if (client) return client;

  client = new FoxPilotClient();

  try {
    await client.connect();
    return client;
  } catch (err) {
    error(`Failed to connect to FoxPilot: ${err.message}. Is the extension running?`);
  }
}

async function disconnect() {
  if (client) {
    client.disconnect();
  }
}

// =============================================================================
// Commands
// =============================================================================

const commands = {
  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  async open(args) {
    const url = args[0];
    if (!url) error('Usage: foxpilot open <url>');

    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    const client = await getClient();
    await client.navigate(fullUrl);
    success(`Navigated to ${fullUrl}`);
  },

  async back() {
    const client = await getClient();
    await client.back();
    success('Navigated back');
  },

  async forward() {
    const client = await getClient();
    await client.forward();
    success('Navigated forward');
  },

  async reload() {
    const client = await getClient();
    await client.reload();
    success('Page reloaded');
  },

  // ---------------------------------------------------------------------------
  // Snapshot
  // ---------------------------------------------------------------------------

  async snapshot(args, flags) {
    const client = await getClient();
    const result = await client.send('snapshot', {
      interactive: flags.i || flags.interactive || false,
      compact: flags.c || flags.compact || false,
      depth: flags.d || flags.depth || null,
      scope: flags.s || flags.scope || null,
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
    if (!selector) error('Usage: foxpilot click <selector>');

    const client = await getClient();
    await client.click(selector);
    success(`Clicked ${selector}`);
  },

  async dblclick(args) {
    const selector = args[0];
    if (!selector) error('Usage: foxpilot dblclick <selector>');

    const client = await getClient();
    await client.click(selector);
    await client.click(selector);
    success(`Double-clicked ${selector}`);
  },

  async type(args) {
    const selector = args[0];
    const text = args.slice(1).join(' ');
    if (!selector || !text) error('Usage: foxpilot type <selector> <text>');

    const client = await getClient();
    await client.type(selector, text);
    success(`Typed into ${selector}`);
  },

  async fill(args) {
    const selector = args[0];
    const text = args.slice(1).join(' ');
    if (!selector || text === undefined) error('Usage: foxpilot fill <selector> <text>');

    const client = await getClient();
    await client.send('fill', { selector, text });
    success(`Filled ${selector}`);
  },

  async press(args) {
    const key = args[0];
    const selector = args[1];
    if (!key) error('Usage: foxpilot press <key> [selector]');

    const client = await getClient();
    await client.send('press', { key, selector });
    success(`Pressed ${key}`);
  },

  async select(args) {
    const selector = args[0];
    const value = args[1];
    if (!selector || !value) error('Usage: foxpilot select <selector> <value>');

    const client = await getClient();
    const result = await client.send('select', { selector, value });
    success(`Selected "${result.selectedText}" in ${selector}`);
  },

  async check(args) {
    const selector = args[0];
    if (!selector) error('Usage: foxpilot check <selector>');

    const client = await getClient();
    await client.send('check', { selector });
    success(`Checked ${selector}`);
  },

  async uncheck(args) {
    const selector = args[0];
    if (!selector) error('Usage: foxpilot uncheck <selector>');

    const client = await getClient();
    await client.send('uncheck', { selector });
    success(`Unchecked ${selector}`);
  },

  async hover(args) {
    const selector = args[0];
    if (!selector) error('Usage: foxpilot hover <selector>');

    const client = await getClient();
    await client.hover(selector);
    success(`Hovered ${selector}`);
  },

  async scroll(args, flags) {
    const direction = args[0];
    const amount = parseInt(args[1]) || 100;

    const client = await getClient();

    if (['up', 'down', 'left', 'right'].includes(direction)) {
      await client.send('scroll', { direction, amount });
      success(`Scrolled ${direction} ${amount}px`);
    } else if (direction) {
      // Scroll to element
      await client.scrollTo(direction);
      success(`Scrolled to ${direction}`);
    } else {
      error('Usage: foxpilot scroll <direction|selector> [amount]');
    }
  },

  // ---------------------------------------------------------------------------
  // Get Information
  // ---------------------------------------------------------------------------

  async get(args) {
    const subcommand = args[0];
    const selector = args[1];
    const extra = args[2];

    const client = await getClient();

    switch (subcommand) {
      case 'text': {
        if (!selector) error('Usage: foxpilot get text <selector>');
        const result = await client.getText(selector);
        output({ text: result.text });
        break;
      }
      case 'html': {
        if (!selector) error('Usage: foxpilot get html <selector>');
        const result = await client.getHTML(selector);
        output({ html: result.html });
        break;
      }
      case 'value': {
        if (!selector) error('Usage: foxpilot get value <selector>');
        const result = await client.send('getValue', { selector });
        output({ value: result.value });
        break;
      }
      case 'attr': {
        if (!selector || !extra) error('Usage: foxpilot get attr <selector> <attribute>');
        const result = await client.getAttribute(selector, extra);
        output({ attribute: extra, value: result.value });
        break;
      }
      case 'title': {
        const result = await client.getTitle();
        output({ title: result.title });
        break;
      }
      case 'url': {
        const result = await client.getUrl();
        output({ url: result.url });
        break;
      }
      case 'count': {
        if (!selector) error('Usage: foxpilot get count <selector>');
        const result = await client.query(selector);
        output({ count: result.count });
        break;
      }
      default:
        error('Usage: foxpilot get <text|html|value|attr|title|url|count> [selector] [extra]');
    }
  },

  // ---------------------------------------------------------------------------
  // State Checks
  // ---------------------------------------------------------------------------

  async is(args) {
    const subcommand = args[0];
    const selector = args[1];

    if (!selector) error('Usage: foxpilot is <visible|enabled|checked> <selector>');

    const client = await getClient();

    switch (subcommand) {
      case 'visible': {
        const result = await client.send('isVisible', { selector });
        output({ visible: result.visible });
        break;
      }
      case 'enabled': {
        const result = await client.send('isEnabled', { selector });
        output({ enabled: result.enabled });
        break;
      }
      case 'checked': {
        const result = await client.send('isChecked', { selector });
        output({ checked: result.checked });
        break;
      }
      default:
        error('Usage: foxpilot is <visible|enabled|checked> <selector>');
    }
  },

  // ---------------------------------------------------------------------------
  // Screenshots
  // ---------------------------------------------------------------------------

  async screenshot(args, flags) {
    const path = args[0] || '/tmp/foxpilot-screenshot.png';
    const fullPage = flags.f || flags.full || false;

    const client = await getClient();
    const result = await client.screenshot({ fullPage });

    if (result.dataUrl) {
      // Extract base64 data and save to file
      const base64Data = result.dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Ensure directory exists
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
    const client = await getClient();

    if (flags.text) {
      // Wait for text
      await client.send('waitForText', { text: flags.text, timeout: 30000 });
      success(`Found text: "${flags.text}"`);
    } else if (flags.url) {
      // Wait for URL - poll until match
      const pattern = flags.url;
      const timeout = 30000;
      const start = Date.now();

      while (Date.now() - start < timeout) {
        const result = await client.getUrl();
        if (result.url.includes(pattern.replace('**/', ''))) {
          success(`URL matched: ${result.url}`);
          return;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      error(`Timeout waiting for URL: ${pattern}`);
    } else if (arg && !isNaN(arg)) {
      // Wait for duration
      await client.wait(parseInt(arg));
      success(`Waited ${arg}ms`);
    } else if (arg) {
      // Wait for selector
      await client.waitForSelector(arg);
      success(`Element appeared: ${arg}`);
    } else {
      error('Usage: foxpilot wait <selector|ms> [--text "..."] [--url "..."]');
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
      error('Usage: foxpilot find <role|text|label|placeholder> <value> [action] [--name "..."]');
    }

    const client = await getClient();
    let result;

    switch (locatorType) {
      case 'role':
        result = await client.send('findByRole', {
          role: locatorValue,
          name: flags.name,
          index: flags.index || 0,
        });
        break;
      case 'text':
        result = await client.send('findByText', {
          text: locatorValue,
          exact: flags.exact || false,
          index: flags.index || 0,
        });
        break;
      case 'label':
        result = await client.send('findByLabel', {
          label: locatorValue,
          index: flags.index || 0,
        });
        break;
      case 'placeholder':
        result = await client.send('findByPlaceholder', {
          placeholder: locatorValue,
          index: flags.index || 0,
        });
        break;
      default:
        error('Locator type must be: role, text, label, or placeholder');
    }

    // Perform action if specified
    if (action && result.ref) {
      const actionArgs = args.slice(3);

      switch (action) {
        case 'click':
          await client.click(result.ref);
          success(`Clicked element ${result.ref}`);
          break;
        case 'fill':
          if (!actionArgs[0]) error('fill requires text argument');
          await client.send('fill', { selector: result.ref, text: actionArgs.join(' ') });
          success(`Filled element ${result.ref}`);
          break;
        case 'type':
          if (!actionArgs[0]) error('type requires text argument');
          await client.type(result.ref, actionArgs.join(' '));
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
    const client = await getClient();

    if (!subcommand) {
      // List tabs
      const tabs = await client.getTabs();
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
        const result = await client.newTab(url);
        success(`Opened new tab${url ? `: ${url}` : ''}`);
        output({ tabId: result.tabId });
        break;
      }
      case 'close': {
        const tabId = args[1] ? parseInt(args[1]) : undefined;
        await client.closeTab(tabId);
        success('Closed tab');
        break;
      }
      default: {
        // Switch to tab by index
        const index = parseInt(subcommand);
        if (isNaN(index)) {
          error('Usage: foxpilot tab [new|close|<index>]');
        }
        const tabs = await client.getTabs();
        if (index < 0 || index >= tabs.length) {
          error(`Tab index out of range: ${index}`);
        }
        await client.switchTab(tabs[index].id);
        success(`Switched to tab ${index}`);
      }
    }
  },

  // ---------------------------------------------------------------------------
  // JavaScript Execution
  // ---------------------------------------------------------------------------

  async eval(args) {
    const code = args.join(' ');
    if (!code) error('Usage: foxpilot eval <javascript>');

    const client = await getClient();
    const result = await client.evaluate(code);

    if (result.error) {
      error(`Eval error: ${result.error.message}`);
    } else {
      output({ result: result.result });
    }
  },

  // ---------------------------------------------------------------------------
  // Help
  // ---------------------------------------------------------------------------

  async help() {
    console.log(`
FoxPilot CLI v${VERSION}
Browser automation for AI agents via Firefox

USAGE:
  foxpilot <command> [args] [options]

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
  foxpilot open example.com
  foxpilot snapshot -i -c
  foxpilot click @e2
  foxpilot fill @e3 "user@example.com"
  foxpilot find role button click --name "Submit"
  foxpilot wait --text "Success"
  foxpilot screenshot /tmp/result.png
`);
  },

  async version() {
    console.log(`FoxPilot CLI v${VERSION}`);
  },
};

// =============================================================================
// Argument Parsing
// =============================================================================

function parseArgs(argv) {
  const args = [];
  const flags = {};

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

async function main() {
  const argv = process.argv.slice(2);
  const { args, flags } = parseArgs(argv);

  // Global flags
  outputJson = flags.json || false;

  const command = args[0];
  const commandArgs = args.slice(1);

  if (!command || command === 'help' || flags.help || flags.h) {
    await commands.help();
    process.exit(0);
  }

  if (command === 'version' || flags.version || flags.v) {
    await commands.version();
    process.exit(0);
  }

  const handler = commands[command];
  if (!handler) {
    error(`Unknown command: ${command}. Run 'foxpilot help' for usage.`);
  }

  try {
    await handler(commandArgs, flags);
  } catch (err) {
    error(err.message);
  } finally {
    await disconnect();
  }
}

main();
