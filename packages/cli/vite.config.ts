import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));

export default defineConfig({
  define: {
    __CLI_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: 'node24',
    lib: {
      entry: resolve(__dirname, 'src/cli.ts'),
      formats: ['es'],
      fileName: 'cli',
    },
    rollupOptions: {
      external: [
        // Node.js built-ins
        /^node:/,
        // Dependencies (will be resolved from node_modules at runtime)
        '@fox-pilot/client',
      ],
      output: {
        banner: '#!/usr/bin/env node',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
  },
});
