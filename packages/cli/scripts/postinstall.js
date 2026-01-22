#!/usr/bin/env node

/**
 * Postinstall script for @fox-pilot/cli
 *
 * Automatically installs the correct platform-specific native host package
 * when the CLI is installed globally.
 */

import { platform, arch } from 'node:os';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function getPlatformPackage() {
  const os = platform();
  const cpu = arch();

  if (os === 'darwin' && cpu === 'arm64') {
    return '@fox-pilot/native-host-darwin-arm64';
  } else if (os === 'darwin' && cpu === 'x64') {
    return '@fox-pilot/native-host-darwin-x64';
  } else if (os === 'linux' && cpu === 'x64') {
    return '@fox-pilot/native-host-linux-x64';
  } else {
    return null;
  }
}

function isPackageInstalled(pkg) {
  try {
    require.resolve(`${pkg}/package.json`);
    return true;
  } catch {
    return false;
  }
}

function main() {
  const pkg = getPlatformPackage();

  if (!pkg) {
    console.log(`⚠ Fox Pilot: Unsupported platform (${platform()}-${arch()})`);
    return;
  }

  if (isPackageInstalled(pkg)) {
    return; // Already installed, nothing to do
  }

  console.log(`Installing ${pkg}...`);

  try {
    // Detect package manager
    const isGlobal = process.env.npm_config_global === 'true';
    const globalFlag = isGlobal ? '-g' : '';

    execSync(`npm install ${globalFlag} ${pkg}`, {
      stdio: 'inherit',
    });

    console.log(`✓ Installed ${pkg}`);
  } catch {
    console.error(`⚠ Failed to install ${pkg}. Run manually:`);
    console.error(`  npm install -g ${pkg}`);
  }
}

main();
