/**
 * JavaScript Evaluation Command
 */

import { getClient } from '../client.ts';
import { output, error } from '../output.ts';

export async function evaluate(args: string[]): Promise<void> {
  const code = args.join(' ');
  if (!code) error('Usage: fox-pilot eval <javascript>');

  const client = await getClient();
  const result = await client.evaluate(code);

  if ('error' in result) {
    error(`Eval error: ${result.error.message}`);
  } else {
    output({ result: result.result });
  }
}
