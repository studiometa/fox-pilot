/**
 * DOM Interaction Commands
 */

import { getClient } from '../client.ts';
import { success, error } from '../output.ts';

export async function click(args: string[]): Promise<void> {
  const selector = args[0];
  if (!selector) error('Usage: fox-pilot click <selector>');

  const client = await getClient();
  await client.click(selector);
  success(`Clicked ${selector}`);
}

export async function dblclick(args: string[]): Promise<void> {
  const selector = args[0];
  if (!selector) error('Usage: fox-pilot dblclick <selector>');

  const client = await getClient();
  await client.click(selector);
  await client.click(selector);
  success(`Double-clicked ${selector}`);
}

export async function type(args: string[]): Promise<void> {
  const selector = args[0];
  const text = args.slice(1).join(' ');
  if (!selector || !text) error('Usage: fox-pilot type <selector> <text>');

  const client = await getClient();
  await client.type(selector, text);
  success(`Typed into ${selector}`);
}

export async function fill(args: string[]): Promise<void> {
  const selector = args[0];
  const text = args.slice(1).join(' ');
  if (!selector || text === undefined) error('Usage: fox-pilot fill <selector> <text>');

  const client = await getClient();
  await client.fill(selector, text);
  success(`Filled ${selector}`);
}

export async function press(args: string[]): Promise<void> {
  const key = args[0];
  const selector = args[1] || null;
  if (!key) error('Usage: fox-pilot press <key> [selector]');

  const client = await getClient();
  await client.press(key, selector);
  success(`Pressed ${key}`);
}

export async function select(args: string[]): Promise<void> {
  const selector = args[0];
  const value = args[1];
  if (!selector || !value) error('Usage: fox-pilot select <selector> <value>');

  const client = await getClient();
  const result = await client.select(selector, value);
  success(`Selected "${result.selectedText}" in ${selector}`);
}

export async function check(args: string[]): Promise<void> {
  const selector = args[0];
  if (!selector) error('Usage: fox-pilot check <selector>');

  const client = await getClient();
  await client.check(selector);
  success(`Checked ${selector}`);
}

export async function uncheck(args: string[]): Promise<void> {
  const selector = args[0];
  if (!selector) error('Usage: fox-pilot uncheck <selector>');

  const client = await getClient();
  await client.uncheck(selector);
  success(`Unchecked ${selector}`);
}

export async function hover(args: string[]): Promise<void> {
  const selector = args[0];
  if (!selector) error('Usage: fox-pilot hover <selector>');

  const client = await getClient();
  await client.hover(selector);
  success(`Hovered ${selector}`);
}

export async function scroll(args: string[]): Promise<void> {
  const direction = args[0];
  const amount = parseInt(args[1] ?? '') || 100;

  const client = await getClient();

  if (direction && ['up', 'down', 'left', 'right'].includes(direction)) {
    await client.scroll({ direction: direction as 'up' | 'down' | 'left' | 'right', amount });
    success(`Scrolled ${direction} ${amount}px`);
  } else if (direction) {
    await client.scrollTo(direction);
    success(`Scrolled to ${direction}`);
  } else {
    error('Usage: fox-pilot scroll <direction|selector> [amount]');
  }
}
