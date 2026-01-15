/**
 * CLI Argument Parsing
 *
 * Uses Node.js native util.parseArgs for argument parsing.
 */

import { parseArgs as nodeParseArgs } from 'node:util';

// =============================================================================
// Types
// =============================================================================

export type Flags = Record<string, string | boolean | undefined>;

export interface ParsedArgs {
  args: string[];
  flags: Flags;
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * CLI options configuration for node:util parseArgs
 */
const cliOptions = {
  // Boolean flags
  interactive: { type: 'boolean' as const, short: 'i' },
  compact: { type: 'boolean' as const, short: 'c' },
  full: { type: 'boolean' as const, short: 'f' },
  json: { type: 'boolean' as const },
  help: { type: 'boolean' as const, short: 'h' },
  version: { type: 'boolean' as const, short: 'v' },
  exact: { type: 'boolean' as const },

  // String flags
  depth: { type: 'string' as const, short: 'd' },
  scope: { type: 'string' as const, short: 's' },
  name: { type: 'string' as const },
  index: { type: 'string' as const },
  text: { type: 'string' as const },
  url: { type: 'string' as const },
};

// =============================================================================
// Parser
// =============================================================================

/**
 * Parse command-line arguments using Node.js native parseArgs
 *
 * @param argv - Array of command-line arguments (without node and script path)
 * @returns Parsed arguments with positional args and flags
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const { values, positionals } = nodeParseArgs({
    args: argv,
    options: cliOptions,
    allowPositionals: true,
    strict: false, // Allow unknown options to pass through
  });

  // Convert values to Flags format
  const flags: Flags = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      flags[key] = value;
    }
  }

  return { args: positionals, flags };
}
