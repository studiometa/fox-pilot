/**
 * Screenshot Command
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Flags } from '../args.ts';
import { getClient } from '../client.ts';
import { output, success, error } from '../output.ts';

export async function screenshot(args: string[], flags: Flags): Promise<void> {
  const path = args[0] || '/tmp/fox-pilot-screenshot.png';
  const fullPage = Boolean(flags.full);

  const client = await getClient();
  const result = await client.screenshot({ fullPage });

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
}
