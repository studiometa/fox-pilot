/**
 * Tab Management Command
 */

import { getClient } from '../client.ts';
import { output, success, error, isOutputJson } from '../output.ts';

export async function tab(args: string[]): Promise<void> {
  const subcommand = args[0];
  const client = await getClient();

  if (!subcommand) {
    const tabs = await client.getTabs();
    if (isOutputJson()) {
      output(tabs);
    } else {
      tabs.forEach((t, i) => {
        const marker = t.active ? '→' : ' ';
        console.log(`${marker} [${i}] ${t.title} (${t.url})`);
      });
    }
    return;
  }

  switch (subcommand) {
    case 'new': {
      const url = args[1];
      const result = await client.newTab(url);
      success(`Opened new tab${url ? `: ${url}` : ''}`);
      output({ tabId: result.tabId });
      break;
    }
    case 'close': {
      const tabId = args[1] ? parseInt(args[1]) : undefined;
      await client.closeTab(tabId);
      success('Closed tab');
      break;
    }
    default: {
      const index = parseInt(subcommand);
      if (isNaN(index)) {
        error('Usage: fox-pilot tab [new|close|<index>]');
      }
      const tabs = await client.getTabs();
      if (index < 0 || index >= tabs.length) {
        error(`Tab index out of range: ${index}`);
      }
      const targetTab = tabs[index];
      if (!targetTab) {
        error(`Tab not found at index: ${index}`);
      }
      await client.switchTab(targetTab.id);
      success(`Switched to tab ${index}`);
    }
  }
}
