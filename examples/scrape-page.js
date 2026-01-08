#!/usr/bin/env node

/**
 * Firefox Command - Web Scraping Example
 *
 * Demonstrates how to extract data from a webpage.
 */

import { FirefoxClient } from '../client/firefox-client.js';

async function main() {
  const client = new FirefoxClient();

  try {
    console.log('Connecting to Firefox...');
    await client.connect();
    console.log('Connected!\n');

    // Navigate to Hacker News
    console.log('Navigating to Hacker News...');
    await client.navigate('https://news.ycombinator.com');
    await client.wait(2000);

    // Get page title
    const { title } = await client.getTitle();
    console.log(`Page: ${title}\n`);

    // Extract top stories using JavaScript evaluation
    console.log('Extracting top stories...\n');

    const { result: stories } = await client.evaluate(`
      const items = document.querySelectorAll('.athing');
      return Array.from(items).slice(0, 10).map(item => {
        const titleEl = item.querySelector('.titleline > a');
        const subtext = item.nextElementSibling;
        const scoreEl = subtext?.querySelector('.score');
        const authorEl = subtext?.querySelector('.hnuser');
        
        return {
          rank: item.querySelector('.rank')?.textContent?.trim(),
          title: titleEl?.textContent,
          url: titleEl?.href,
          score: scoreEl?.textContent,
          author: authorEl?.textContent,
        };
      });
    `);

    // Display results
    console.log('Top 10 Stories:');
    console.log('─'.repeat(60));

    for (const story of stories) {
      console.log(`${story.rank} ${story.title}`);
      console.log(`   ${story.score || 'no score'} by ${story.author || 'unknown'}`);
      console.log(`   ${story.url}`);
      console.log('');
    }

    // Get total number of stories on page
    const { count } = await client.query('.athing');
    console.log(`Total stories on page: ${count}`);

    // Extract all links
    const { result: linkCount } = await client.evaluate(`
      return document.querySelectorAll('a').length;
    `);
    console.log(`Total links on page: ${linkCount}`);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    client.disconnect();
  }
}

main();
