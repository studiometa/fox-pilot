/**
 * CLI Commands Index
 */

import type { Flags } from '../args.ts';

// Navigation
import { open, back, forward, reload } from './navigation.ts';

// Snapshot
import { snapshot } from './snapshot.ts';

// DOM Interaction
import {
  click,
  dblclick,
  type,
  fill,
  press,
  select,
  check,
  uncheck,
  hover,
  scroll,
} from './interaction.ts';

// Get Information
import { get } from './get.ts';

// State Checks
import { is } from './is.ts';

// Screenshot
import { screenshot } from './screenshot.ts';

// Wait
import { wait } from './wait.ts';

// Semantic Locators
import { find } from './find.ts';

// Tab Management
import { tab } from './tab.ts';

// JavaScript Evaluation
import { evaluate } from './eval.ts';

// Installation
import { install, uninstall } from './install.ts';

// Help
import { help, version } from './help.ts';

export type CommandHandler = (args: string[], flags: Flags) => Promise<void>;

export const commands: Record<string, CommandHandler> = {
  // Navigation
  open,
  back,
  forward,
  reload,

  // Snapshot
  snapshot,

  // DOM Interaction
  click,
  dblclick,
  type,
  fill,
  press,
  select,
  check,
  uncheck,
  hover,
  scroll,

  // Get Information
  get,

  // State Checks
  is,

  // Screenshot
  screenshot,

  // Wait
  wait,

  // Semantic Locators
  find,

  // Tab Management
  tab,

  // JavaScript Evaluation
  eval: evaluate,

  // Installation
  install,
  uninstall,

  // Help
  help,
  version,
};
