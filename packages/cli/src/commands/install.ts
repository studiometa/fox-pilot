/**
 * Installation Commands
 */

import { writeFileSync, existsSync, mkdirSync, chmodSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform, homedir, arch } from 'node:os';
import { error } from '../output.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOST_NAME = 'fox_pilot';
const EXTENSION_ID = 'fox-pilot@ikko.fr';

interface NativeHostManifest {
  name: string;
  description: string;
  path: string;
  type: 'stdio';
  allowed_extensions: string[];
}

function getPlatformPackage(): string {
  const os = platform();
  const cpu = arch();

  if (os === 'darwin' && cpu === 'arm64') {
    return '@fox-pilot/native-host-darwin-arm64';
  } else if (os === 'darwin' && cpu === 'x64') {
    return '@fox-pilot/native-host-darwin-x64';
  } else if (os === 'linux' && cpu === 'x64') {
    return '@fox-pilot/native-host-linux-x64';
  } else {
    throw new Error(`Unsupported platform: ${os}-${cpu}`);
  }
}

function findBinaryPath(): string {
  const platformPkg = getPlatformPackage();
  const platformDir = platformPkg.replace('@fox-pilot/', '');

  // Try to find the platform-specific package via import.meta.resolve
  try {
    const pkgUrl = import.meta.resolve(`${platformPkg}/package.json`);
    const binPath = join(dirname(fileURLToPath(pkgUrl)), 'bin', 'fox-pilot-host');

    if (existsSync(binPath)) {
      return binPath;
    }
  } catch {
    // Package not found, try workspace paths
  }

  // Fallback: check workspace paths (for development)
  const workspacePaths = [
    join(__dirname, '..', '..', '..', platformDir, 'bin', 'fox-pilot-host'),
    join(__dirname, '..', '..', '..', 'native-host', 'dist', 'fox-pilot-host'),
  ];

  for (const binPath of workspacePaths) {
    if (existsSync(binPath)) {
      return binPath;
    }
  }

  throw new Error(
    `Native host binary not found. Please ensure ${platformPkg} is installed.\n` +
    `Run: npm install ${platformPkg}`
  );
}

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

function createNativeHostManifest(binaryPath: string): NativeHostManifest {
  return {
    name: HOST_NAME,
    description: 'Fox Pilot native messaging host',
    path: binaryPath,
    type: 'stdio',
    allowed_extensions: [EXTENSION_ID],
  };
}

export async function install(): Promise<void> {
  console.log('Installing Fox Pilot native messaging host...\n');

  // Find the binary
  let binaryPath: string;
  try {
    binaryPath = findBinaryPath();
    console.log(`✓ Found binary: ${binaryPath}`);
  } catch (err) {
    error((err as Error).message);
  }

  const hostsDir = getNativeHostsDir();
  const manifestPath = join(hostsDir, `${HOST_NAME}.json`);
  const manifest = createNativeHostManifest(binaryPath);

  // Create directory if it doesn't exist
  try {
    mkdirSync(hostsDir, { recursive: true });
    console.log(`✓ Created directory: ${hostsDir}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw err;
    }
  }

  // Write manifest
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✓ Written manifest: ${manifestPath}`);

  // Make binary executable (Unix only)
  if (platform() !== 'win32') {
    try {
      chmodSync(binaryPath, 0o755);
      console.log(`✓ Made executable: ${binaryPath}`);
    } catch (err) {
      console.warn(`⚠ Could not make executable: ${(err as Error).message}`);
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

export async function uninstall(): Promise<void> {
  console.log('Uninstalling Fox Pilot native messaging host...\n');

  const hostsDir = getNativeHostsDir();
  const manifestPath = join(hostsDir, `${HOST_NAME}.json`);

  try {
    unlinkSync(manifestPath);
    console.log(`✓ Removed manifest: ${manifestPath}`);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`⚠ Manifest not found: ${manifestPath}`);
    } else {
      throw err;
    }
  }

  console.log('\n✅ Uninstallation complete!');
}
