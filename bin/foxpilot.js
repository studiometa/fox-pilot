#!/usr/bin/env node

/**
 * Fox Pilot CLI
 *
 * Commands:
 *   install  - Register native messaging host and open extension page
 *   start    - Start the WebSocket server (for debugging)
 *   status   - Check connection status
 *   uninstall - Remove native messaging host
 */

import { writeFileSync, mkdirSync, unlinkSync, existsSync, chmodSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { platform, homedir } from 'os';
import { spawn, exec } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');

const HOST_NAME = 'fox_pilot';
const EXTENSION_ID = 'fox-pilot@ikko.fr';
const ADDON_URL = 'https://addons.mozilla.org/firefox/addon/foxpilot/';
const PORT = 9222;

import { resolve } from 'path';

// =============================================================================
// Helpers
// =============================================================================

function getNativeHostsDir() {
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

function getManifestPath() {
  return join(getNativeHostsDir(), `${HOST_NAME}.json`);
}

function getHostPath() {
  const hostFile = platform() === 'win32' ? 'host.js' : 'host.sh';
  return join(packageRoot, 'native-host', hostFile);
}

function openUrl(url) {
  const os = platform();
  const cmd = os === 'darwin' ? 'open' : os === 'win32' ? 'start' : 'xdg-open';
  exec(`${cmd} "${url}"`);
}

// =============================================================================
// Commands
// =============================================================================

function install() {
  console.log('🦊 Installing Fox Pilot...\n');

  const hostsDir = getNativeHostsDir();
  const manifestPath = getManifestPath();
  const hostPath = getHostPath();

  // Create directory
  try {
    mkdirSync(hostsDir, { recursive: true });
    console.log(`✓ Created directory: ${hostsDir}`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }

  // Create manifest
  const manifest = {
    name: HOST_NAME,
    description: 'Fox Pilot native messaging host',
    path: hostPath,
    type: 'stdio',
    allowed_extensions: [EXTENSION_ID],
  };

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✓ Registered native host: ${manifestPath}`);

  // Make host executable (Unix)
  if (platform() !== 'win32') {
    try {
      chmodSync(hostPath, 0o755);
      chmodSync(join(packageRoot, 'native-host', 'host.js'), 0o755);
      console.log(`✓ Made executable: ${hostPath}`);
    } catch (error) {
      console.warn(`⚠ Could not set permissions: ${error.message}`);
    }
  }

  // Windows registry info
  if (platform() === 'win32') {
    console.log('\n⚠ Windows requires a registry entry. Run in elevated PowerShell:');
    console.log(`  New-Item -Path "HKCU:\\Software\\Mozilla\\NativeMessagingHosts\\${HOST_NAME}" -Force`);
    console.log(`  Set-ItemProperty -Path "HKCU:\\Software\\Mozilla\\NativeMessagingHosts\\${HOST_NAME}" -Name "(Default)" -Value "${manifestPath}"`);
  }

  console.log('\n✓ Native host installed!\n');

  // Open extension page
  console.log('Opening Firefox Add-ons page...');
  console.log(`If it doesn't open, visit: ${ADDON_URL}\n`);
  openUrl(ADDON_URL);

  console.log('📋 Next steps:');
  console.log('   1. Click "Add to Firefox" on the add-ons page');
  console.log('   2. Click the Fox Pilot icon in toolbar to verify connection');
  console.log('');
}

function uninstall() {
  console.log('🦊 Uninstalling Fox Pilot...\n');

  const manifestPath = getManifestPath();

  try {
    unlinkSync(manifestPath);
    console.log(`✓ Removed: ${manifestPath}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`⚠ Not found: ${manifestPath}`);
    } else {
      throw error;
    }
  }

  console.log('\n✓ Native host uninstalled!');
  console.log('  To remove the extension, go to about:addons in Firefox.\n');
}

function start() {
  console.log('🦊 Starting Fox Pilot server...\n');

  const hostPath = join(packageRoot, 'native-host', 'host.js');

  console.log(`WebSocket server: ws://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop.\n');

  const child = spawn('node', [hostPath], {
    stdio: 'inherit',
    env: { ...process.env, FOXPILOT_STANDALONE: '1' },
  });

  child.on('error', (error) => {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

async function status() {
  console.log('🦊 Fox Pilot Status\n');

  // Check native host
  const manifestPath = getManifestPath();
  const hostInstalled = existsSync(manifestPath);
  console.log(`Native host: ${hostInstalled ? '✓ Installed' : '✗ Not installed'}`);

  if (hostInstalled) {
    console.log(`  Manifest: ${manifestPath}`);
  }

  // Check WebSocket server using the client
  console.log(`\nWebSocket server (port ${PORT}):`);

  try {
    const { Fox PilotClient } = await import('../client/foxpilot-client.js');
    const client = new Fox PilotClient();
    
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);
    
    console.log('  ✓ Connected and authenticated');
    
    // Try to get current page info
    try {
      const { title } = await client.getTitle();
      const { url } = await client.getUrl();
      console.log(`  Current tab: ${title}`);
      console.log(`  URL: ${url}`);
    } catch (e) {
      // Ignore errors getting page info
    }
    
    client.disconnect();
  } catch (error) {
    console.log('  ✗ Cannot connect (extension may not be active in Firefox)');
  }

  console.log('');
}

function help() {
  console.log(`
🦊 Fox Pilot - Remote Firefox control for coding agents

Usage: npx foxpilot <command>

Commands:
  install    Register native host and open extension page
  uninstall  Remove native messaging host
  start      Start WebSocket server (for debugging)
  status     Check installation and connection status
  help       Show this help message

Examples:
  npx foxpilot install   # First-time setup
  npx foxpilot status    # Check if everything is working
`);
}

// =============================================================================
// Main
// =============================================================================

const command = process.argv[2];

switch (command) {
  case 'install':
    install();
    break;
  case 'uninstall':
    uninstall();
    break;
  case 'start':
    start();
    break;
  case 'status':
    status();
    break;
  case 'help':
  case '--help':
  case '-h':
    help();
    break;
  default:
    if (command) {
      console.error(`Unknown command: ${command}\n`);
    }
    help();
    process.exit(command ? 1 : 0);
}
