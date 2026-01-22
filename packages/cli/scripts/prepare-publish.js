#!/usr/bin/env node

/**
 * Prepare package.json for publishing
 *
 * Replaces file: protocol in optionalDependencies with actual version numbers
 * This allows local development with file: references while publishing with proper versions
 */

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packagePath = resolve(__dirname, '../package.json');
const backupPath = resolve(__dirname, '../package.json.backup');

// Backup original package.json
copyFileSync(packagePath, backupPath);

const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));

// Replace file: protocol with exact version numbers
if (pkg.optionalDependencies) {
  for (const [name, value] of Object.entries(pkg.optionalDependencies)) {
    if (value.startsWith('file:')) {
      // Read the version from the referenced package
      const refPath = resolve(__dirname, '..', value.replace('file:', ''), 'package.json');
      const refPkg = JSON.parse(readFileSync(refPath, 'utf-8'));
      pkg.optionalDependencies[name] = refPkg.version;
    }
  }
}

// Overwrite package.json with modified version
writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');

console.log('✓ Prepared package.json for publishing with version references');
