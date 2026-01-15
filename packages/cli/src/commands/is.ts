/**
 * State Check Commands
 */

import { getClient } from '../client.ts';
import { output, error } from '../output.ts';

export async function is(args: string[]): Promise<void> {
  const subcommand = args[0];
  const selector = args[1];

  if (!selector) error('Usage: fox-pilot is <visible|enabled|checked> <selector>');

  const client = await getClient();

  switch (subcommand) {
    case 'visible': {
      const result = await client.isVisible(selector);
      output({ visible: result.visible });
      break;
    }
    case 'enabled': {
      const result = await client.isEnabled(selector);
      output({ enabled: result.enabled });
      break;
    }
    case 'checked': {
      const result = await client.isChecked(selector);
      output({ checked: result.checked });
      break;
    }
    default:
      error('Usage: fox-pilot is <visible|enabled|checked> <selector>');
  }
}
