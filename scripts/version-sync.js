import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
const packagesDir = join(rootDir, 'packages');

// Sync version to all packages
for (const dir of readdirSync(packagesDir)) {
  const pkgPath = join(packagesDir, dir, 'package.json');
  if (existsSync(pkgPath)) {
    const p = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    p.version = pkg.version;
    writeFileSync(pkgPath, JSON.stringify(p, null, 2) + '\n');
  }
}

// Sync version to extension manifest
const manifestPath = join(packagesDir, 'extension/src/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
manifest.version = pkg.version;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`Synced version ${pkg.version} to all packages`);
