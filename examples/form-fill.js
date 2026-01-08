#!/usr/bin/env node

/**
 * Firefox Command - Form Fill Example
 *
 * Demonstrates how to fill and submit a form.
 */

import { FirefoxClient } from '../client/firefox-client.js';

async function main() {
  const client = new FirefoxClient();

  try {
    console.log('Connecting to Firefox...');
    await client.connect();
    console.log('Connected!\n');

    // Navigate to a test form (httpbin.org provides a simple form)
    console.log('Navigating to test form...');
    await client.navigate('https://httpbin.org/forms/post');
    await client.wait(2000);

    // Fill in the form fields
    console.log('Filling form...');

    // Customer name
    await client.type('input[name="custname"]', 'John Doe');
    console.log('  ✓ Customer name');

    // Telephone
    await client.type('input[name="custtel"]', '+1234567890');
    console.log('  ✓ Telephone');

    // Email
    await client.type('input[name="custemail"]', 'john@example.com');
    console.log('  ✓ Email');

    // Size selection (click radio button)
    await client.click('input[name="size"][value="medium"]');
    console.log('  ✓ Size: medium');

    // Toppings (checkboxes)
    await client.click('input[name="topping"][value="cheese"]');
    await client.click('input[name="topping"][value="mushroom"]');
    console.log('  ✓ Toppings: cheese, mushroom');

    // Delivery time
    await client.type('input[name="delivery"]', '18:00');
    console.log('  ✓ Delivery time');

    // Instructions
    await client.type('textarea[name="comments"]', 'Please ring the doorbell twice.');
    console.log('  ✓ Comments');

    // Take a screenshot of the filled form
    console.log('\nTaking screenshot...');
    const { dataUrl } = await client.screenshot();
    console.log(`Screenshot captured (${Math.round(dataUrl.length / 1024)} KB)`);

    // Note: We don't actually submit to avoid creating requests
    console.log('\n✅ Form filled successfully!');
    console.log('(Form not submitted to avoid creating test data)');
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
