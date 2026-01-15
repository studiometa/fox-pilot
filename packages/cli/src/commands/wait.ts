/**
 * Wait Command
 */

import type { Flags } from '../args.ts';
import { getClient } from '../client.ts';
import { success, error } from '../output.ts';

export async function wait(args: string[], flags: Flags): Promise<void> {
  const arg = args[0];
  const client = await getClient();

  if (flags.text) {
    await client.waitForText(String(flags.text), 30000);
    success(`Found text: "${flags.text}"`);
  } else if (flags.url) {
    const pattern = String(flags.url);
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
  } else if (arg && !isNaN(Number(arg))) {
    await client.wait(parseInt(arg));
    success(`Waited ${arg}ms`);
  } else if (arg) {
    await client.waitForSelector(arg);
    success(`Element appeared: ${arg}`);
  } else {
    error('Usage: fox-pilot wait <selector|ms> [--text "..."] [--url "..."]');
  }
}
