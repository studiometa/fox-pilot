/**
 * Navigation Commands
 */

import { getClient } from '../client.ts';
import { success, error } from '../output.ts';

export async function open(args: string[]): Promise<void> {
  const url = args[0];
  if (!url) error('Usage: fox-pilot open <url>');

  const fullUrl = url.startsWith('http') ? url : `https://${url}`;
  const client = await getClient();
  await client.navigate(fullUrl);
  success(`Navigated to ${fullUrl}`);
}

export async function back(): Promise<void> {
  const client = await getClient();
  await client.back();
  success('Navigated back');
}

export async function forward(): Promise<void> {
  const client = await getClient();
  await client.forward();
  success('Navigated forward');
}

export async function reload(): Promise<void> {
  const client = await getClient();
  await client.reload();
  success('Page reloaded');
}
