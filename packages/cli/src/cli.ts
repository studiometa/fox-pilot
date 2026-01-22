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

// =============================================================================
// Node Version Check
// =============================================================================

const MIN_NODE_VERSION = 24;
const nodeVersion = parseInt(process.versions.node.split('.')[0], 10);

if (nodeVersion < MIN_NODE_VERSION) {
  console.error(`✗ Node.js ${MIN_NODE_VERSION}+ is required (current: ${process.versions.node})\n`);
  console.error(`Fox Pilot uses modern JavaScript features that require Node.js ${MIN_NODE_VERSION}+:`);
  console.error(`  - Native WebSocket client (no external dependencies)`);
  console.error(`  - Import attributes for JSON modules`);
  console.error(`\nUpgrade Node.js: https://nodejs.org/`);
  process.exit(1);
}

// =============================================================================
// Imports
// =============================================================================

import { parseArgs } from './args.ts';
import { commands } from './commands/index.ts';
import { disconnect } from './client.ts';
import { setOutputJson, error } from './output.ts';

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { args, flags } = parseArgs(argv);

  setOutputJson(Boolean(flags.json));

  const command = args[0];
  const commandArgs = args.slice(1);

  if (!command || command === 'help' || flags.help) {
    await commands.help?.([], {});
    process.exit(0);
  }

  if (command === 'version' || flags.version) {
    await commands.version?.([], {});
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
