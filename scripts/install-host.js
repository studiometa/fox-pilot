#!/usr/bin/env node

/**
 * Install Native Messaging Host
 *
 * This script automatically installs the native messaging host manifest
 * for the current operating system.
 */

import { writeFileSync, mkdirSync, chmodSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { platform, homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const HOST_NAME = 'foxpilot';
const EXTENSION_ID = 'foxpilot@anthropic.com';

/**
 * Get the native messaging hosts directory for the current OS
 */
function getNativeHostsDir() {
  const os = platform();

  switch (os) {
    case 'darwin':
      return join(homedir(), 'Library/Application Support/Mozilla/NativeMessagingHosts');
    case 'linux':
      return join(homedir(), '.mozilla/native-messaging-hosts');
    case 'win32':
      // Windows uses registry, but we can also use the AppData location
      return join(process.env.APPDATA || '', 'Mozilla', 'NativeMessagingHosts');
    default:
      throw new Error(`Unsupported platform: ${os}`);
  }
}

/**
 * Create the native messaging host manifest
 */
function createManifest() {
  // Use shell wrapper on macOS/Linux for proper Node.js execution
  const hostFile = platform() === 'win32' ? 'host.js' : 'host.sh';
  const hostPath = join(projectRoot, 'native-host', hostFile);

  return {
    name: HOST_NAME,
    description: 'FoxPilot native messaging host',
    path: hostPath,
    type: 'stdio',
    allowed_extensions: [EXTENSION_ID],
  };
}

/**
 * Install the native messaging host
 */
function install() {
  console.log('Installing FoxPilot native messaging host...\n');

  const hostsDir = getNativeHostsDir();
  const manifestPath = join(hostsDir, `${HOST_NAME}.json`);
  const manifest = createManifest();

  // Create directory if it doesn't exist
  try {
    mkdirSync(hostsDir, { recursive: true });
    console.log(`✓ Created directory: ${hostsDir}`);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }

  // Write manifest
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✓ Written manifest: ${manifestPath}`);

  // Make host.js executable (Unix only)
  if (platform() !== 'win32') {
    const hostPath = manifest.path;
    try {
      chmodSync(hostPath, 0o755);
      console.log(`✓ Made executable: ${hostPath}`);
    } catch (error) {
      console.warn(`⚠ Could not make executable: ${error.message}`);
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
  console.log('2. Select extension/manifest.json');
  console.log('3. The native host will start automatically');
}

/**
 * Uninstall the native messaging host
 */
async function uninstall() {
  const { unlinkSync } = await import('fs');

  console.log('Uninstalling FoxPilot native messaging host...\n');

  const hostsDir = getNativeHostsDir();
  const manifestPath = join(hostsDir, `${HOST_NAME}.json`);

  try {
    unlinkSync(manifestPath);
    console.log(`✓ Removed manifest: ${manifestPath}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
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
  await uninstall();
} else {
  install();
}
