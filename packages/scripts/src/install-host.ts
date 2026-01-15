#!/usr/bin/env bun

/**
 * Install Native Messaging Host
 *
 * This script automatically installs the native messaging host manifest
 * for the current operating system.
 */

import { writeFileSync, mkdirSync, chmodSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { platform, homedir } from 'os';

// Resolve the native-host package location
const nativeHostPkgPath = require.resolve('@fox-pilot/native-host/package.json');
const nativeHostDir = dirname(nativeHostPkgPath);

const HOST_NAME = 'fox_pilot';
const EXTENSION_ID = 'fox-pilot@ikko.fr';

interface NativeHostManifest {
  name: string;
  description: string;
  path: string;
  type: 'stdio';
  allowed_extensions: string[];
}

/**
 * Get the native messaging hosts directory for the current OS
 */
function getNativeHostsDir(): string {
  const os = platform();

  switch (os) {
    case 'darwin':
      return join(homedir(), 'Library/Application Support/Mozilla/NativeMessagingHosts');
    case 'linux':
      return join(homedir(), '.mozilla/native-messaging-hosts');
    case 'win32':
      return join(process.env.APPDATA || '', 'Mozilla', 'NativeMessagingHosts');
    default:
      throw new Error(`Unsupported platform: ${os}`);
  }
}

/**
 * Create the native messaging host manifest
 */
function createManifest(): NativeHostManifest {
  // Use compiled binary
  const hostPath = join(nativeHostDir, 'dist', 'fox-pilot-host');

  return {
    name: HOST_NAME,
    description: 'Fox Pilot native messaging host',
    path: hostPath,
    type: 'stdio',
    allowed_extensions: [EXTENSION_ID],
  };
}

/**
 * Install the native messaging host
 */
function install(): void {
  console.log('Installing Fox Pilot native messaging host...\n');

  const hostsDir = getNativeHostsDir();
  const manifestPath = join(hostsDir, `${HOST_NAME}.json`);
  const manifest = createManifest();

  // Create directory if it doesn't exist
  try {
    mkdirSync(hostsDir, { recursive: true });
    console.log(`✓ Created directory: ${hostsDir}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }

  // Write manifest
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✓ Written manifest: ${manifestPath}`);

  // Make host.sh executable (Unix only)
  if (platform() !== 'win32') {
    const hostPath = manifest.path;
    try {
      chmodSync(hostPath, 0o755);
      console.log(`✓ Made executable: ${hostPath}`);
    } catch (error) {
      console.warn(`⚠ Could not make executable: ${(error as Error).message}`);
    }
  }

  // Windows-specific: Registry entry
  if (platform() === 'win32') {
    console.log('\n⚠ Windows requires a registry entry.');
    console.log('Run the following in an elevated PowerShell:\n');
    console.log(`New-Item -Path "HKCU:\\Software\\Mozilla\\NativeMessagingHosts\\${HOST_NAME}" -Force`);
    console.log(`Set-ItemProperty -Path "HKCU:\\Software\\Mozilla\\NativeMessagingHosts\\${HOST_NAME}" -Name "(Default)" -Value "${manifestPath}"`);
  }

  console.log('\n✅ Installation complete!\n');
  console.log('Next steps:');
  console.log('1. Load the extension in Firefox (about:debugging)');
  console.log('2. Select packages/extension/src/manifest.json');
  console.log('3. The native host will start automatically');
}

/**
 * Uninstall the native messaging host
 */
function uninstall(): void {
  console.log('Uninstalling Fox Pilot native messaging host...\n');

  const hostsDir = getNativeHostsDir();
  const manifestPath = join(hostsDir, `${HOST_NAME}.json`);

  try {
    unlinkSync(manifestPath);
    console.log(`✓ Removed manifest: ${manifestPath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`⚠ Manifest not found: ${manifestPath}`);
    } else {
      throw error;
    }
  }

  console.log('\n✅ Uninstallation complete!');
}

// Main
const args = process.argv.slice(2);

if (args.includes('--uninstall') || args.includes('-u')) {
  uninstall();
} else {
  install();
}
