#!/usr/bin/env node

/**
 * Restore original package.json after publishing
 */

import { copyFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagePath = resolve(__dirname, '../package.json');
const backupPath = resolve(__dirname, '../package.json.backup');

if (existsSync(backupPath)) {
  copyFileSync(backupPath, packagePath);
  unlinkSync(backupPath);
  console.log('✓ Restored original package.json');
} else {
  console.log('ℹ No backup found, nothing to restore');
}
