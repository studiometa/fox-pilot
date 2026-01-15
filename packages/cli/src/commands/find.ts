/**
 * Semantic Locators Command
 */

import type { Flags } from '../args.ts';
import { getClient } from '../client.ts';
import { output, success, error } from '../output.ts';

export async function find(args: string[], flags: Flags): Promise<void> {
  const locatorType = args[0];
  const locatorValue = args[1];
  const action = args[2];

  if (!locatorType || !locatorValue) {
    error('Usage: fox-pilot find <role|text|label|placeholder> <value> [action] [--name "..."]');
  }

  const client = await getClient();
  let result: { ref: string; [key: string]: unknown };

  switch (locatorType) {
    case 'role':
      result = await client.findByRole(locatorValue, {
        name: flags.name as string,
        index: flags.index ? Number(flags.index) : 0,
      });
      break;
    case 'text':
      result = await client.findByText(locatorValue, {
        exact: Boolean(flags.exact),
        index: flags.index ? Number(flags.index) : 0,
      });
      break;
    case 'label':
      result = await client.findByLabel(locatorValue, {
        index: flags.index ? Number(flags.index) : 0,
      });
      break;
    case 'placeholder':
      result = await client.findByPlaceholder(locatorValue, {
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
        await client.click(result.ref);
        success(`Clicked element ${result.ref}`);
        break;
      case 'fill':
        if (!actionArgs[0]) error('fill requires text argument');
        await client.fill(result.ref, actionArgs.join(' '));
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
}
