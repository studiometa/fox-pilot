#!/usr/bin/env node

/**
 * Firefox Command - Basic Usage Example
 *
 * This example demonstrates how to use the Firefox Command client
 * to control Firefox from a coding agent or script.
 */

import { FoxPilotClient } from '../client/foxpilot-client.js';

async function main() {
  const client = new FoxPilotClient({
    // Optional: customize connection settings
    // url: 'ws://localhost:9222',
    // token: 'your-custom-token',
  });

  try {
    console.log('Connecting to Firefox...');
    await client.connect();
    console.log('Connected!');

    // Navigate to a website
    console.log('Navigating to example.com...');
    await client.navigate('https://example.com');

    // Wait for page to load
    await client.wait(1000);

    // Get page information
    const { url } = await client.getUrl();
    const { title } = await client.getTitle();
    console.log(`Current page: ${title} (${url})`);

    // Query elements
    const { count, elements } = await client.query('a');
    console.log(`Found ${count} links on the page`);

    if (elements.length > 0) {
      console.log('First link:', elements[0]);
    }

    // Get text content
    const { text } = await client.getText('h1');
    console.log(`Page heading: ${text}`);

    // Execute JavaScript
    const { result } = await client.evaluate('return document.title');
    console.log(`Title via JS: ${result}`);

    // Take a screenshot
    console.log('Taking screenshot...');
    const { dataUrl } = await client.screenshot();
    console.log(`Screenshot captured (${dataUrl.length} bytes)`);

    // List all tabs
    const tabs = await client.getTabs();
    console.log(`Open tabs: ${tabs.length}`);

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.disconnect();
  }
}

main();
