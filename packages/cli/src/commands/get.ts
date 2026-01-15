/**
 * Get Information Command
 */

import { getClient } from '../client.ts';
import { output, error } from '../output.ts';

export async function get(args: string[]): Promise<void> {
  const subcommand = args[0];
  const selector = args[1];
  const extra = args[2];

  const client = await getClient();

  switch (subcommand) {
    case 'text': {
      if (!selector) error('Usage: fox-pilot get text <selector>');
      const result = await client.getText(selector);
      output({ text: result.text });
      break;
    }
    case 'html': {
      if (!selector) error('Usage: fox-pilot get html <selector>');
      const result = await client.getHTML(selector);
      output({ html: result.html });
      break;
    }
    case 'value': {
      if (!selector) error('Usage: fox-pilot get value <selector>');
      const result = await client.getValue(selector);
      output({ value: result.value });
      break;
    }
    case 'attr': {
      if (!selector || !extra) error('Usage: fox-pilot get attr <selector> <attribute>');
      const result = await client.getAttribute(selector, extra);
      output({ attribute: extra, value: result.value });
      break;
    }
    case 'title': {
      const result = await client.getTitle();
      output({ title: result.title });
      break;
    }
    case 'url': {
      const result = await client.getUrl();
      output({ url: result.url });
      break;
    }
    case 'count': {
      if (!selector) error('Usage: fox-pilot get count <selector>');
      const result = await client.query(selector);
      output({ count: result.count });
      break;
    }
    default:
      error('Usage: fox-pilot get <text|html|value|attr|title|url|count> [selector] [extra]');
  }
}
