/**
 * Snapshot Command
 */

import type { Flags } from '../args.ts';
import { getClient } from '../client.ts';
import { output, isOutputJson } from '../output.ts';

export async function snapshot(_args: string[], flags: Flags): Promise<void> {
  const client = await getClient();
  const result = await client.snapshot({
    interactive: Boolean(flags.interactive),
    compact: Boolean(flags.compact),
    depth: flags.depth ? Number(flags.depth) : null,
    scope: (flags.scope as string) || null,
  });

  if (isOutputJson()) {
    output(result);
  } else {
    console.log(result.text);
    console.log(`\n(${result.refCount} elements with refs)`);
  }
}
