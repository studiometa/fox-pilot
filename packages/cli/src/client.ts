/**
 * CLI Client Connection
 */

import { FoxPilotClient } from '@fox-pilot/client';
import { error } from './output.ts';

let client: FoxPilotClient | null = null;

export async function getClient(): Promise<FoxPilotClient> {
  if (client) return client;

  client = new FoxPilotClient();

  try {
    await client.connect();
    return client;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    error(`Failed to connect to Fox Pilot: ${message}. Is the extension running?`);
  }
}

export function disconnect(): void {
  if (client) {
    client.disconnect();
    client = null;
  }
}
