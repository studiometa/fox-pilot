# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## v0.3.3 - 2026.01.22

### Added

- Add Node.js version check with clear error message ([4cd5209](https://github.com/studiometa/fox-pilot/commit/4cd5209))

### Changed

- Use `fox-pilot@version` format in CLI output ([a7f6c61](https://github.com/studiometa/fox-pilot/commit/a7f6c61))
- Improve CLI connection error message ([8ec2eb9](https://github.com/studiometa/fox-pilot/commit/8ec2eb9))
- Update install command output to link to Firefox addon store ([fa82f67](https://github.com/studiometa/fox-pilot/commit/fa82f67))
- Replace bun with npm in package.json scripts ([2290d47](https://github.com/studiometa/fox-pilot/commit/2290d47))
- Use `file:` protocol for optional dependencies in local development ([f4b908d](https://github.com/studiometa/fox-pilot/commit/f4b908d))

### Fixed

- Fix install command in skill documentation ([db8569f](https://github.com/studiometa/fox-pilot/commit/db8569f))

### Removed

- Remove postinstall script from CLI package ([d7156c7](https://github.com/studiometa/fox-pilot/commit/d7156c7))

## v0.3.2 - 2026.01.15

### Fixed

- Fix CLI failing with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` when installed from npm ([8155683](https://github.com/studiometa/fox-pilot/commit/8155683))

### Changed

- Build client and CLI to JavaScript with Vite 8 (Rolldown) for npm distribution ([8155683](https://github.com/studiometa/fox-pilot/commit/8155683))

## v0.3.1 - 2026.01.15

### Fixed

- Fix npm trusted publishing configuration

## v0.3.0 - 2026.01.15

### Added

- Add auto-generated authentication token on first use ([c3c7dcd](https://github.com/studiometa/fox-pilot/commit/c3c7dcd))
- Add native host tests for message protocol and token management ([1b1495c](https://github.com/studiometa/fox-pilot/commit/1b1495c))
- Add client package README with full API reference ([5da4766](https://github.com/studiometa/fox-pilot/commit/5da4766))
- Add stricter TypeScript compiler options (`noUncheckedIndexedAccess`, `allowImportingTsExtensions`) ([f0a7d5f](https://github.com/studiometa/fox-pilot/commit/f0a7d5f))

### Changed

- Refactor CLI into modular structure with separate command files ([485efa3](https://github.com/studiometa/fox-pilot/commit/485efa3))
- Use native `node:util` parseArgs for CLI argument parsing ([b97efac](https://github.com/studiometa/fox-pilot/commit/b97efac))
- Use `node:` prefix for Node.js built-in module imports ([f64921c](https://github.com/studiometa/fox-pilot/commit/f64921c))
- Read CLI version from package.json instead of hardcoded value ([d7e4cfb](https://github.com/studiometa/fox-pilot/commit/d7e4cfb))

### Removed

- Remove unused utils.js from extension ([4e12770](https://github.com/studiometa/fox-pilot/commit/4e12770))

### Security

- Token auto-generated with `crypto.randomBytes(32)` and stored with 0600 permissions ([c3c7dcd](https://github.com/studiometa/fox-pilot/commit/c3c7dcd))
- Remove default fallback token - explicit configuration now required ([c3c7dcd](https://github.com/studiometa/fox-pilot/commit/c3c7dcd))

## v0.2.1 - 2026.01.15

### Added

- Add `install` and `uninstall` commands to CLI ([060464b](https://github.com/studiometa/fox-pilot/commit/060464b))

### Changed

- Switch to npm trusted publishing via OIDC ([7df7e34](https://github.com/studiometa/fox-pilot/commit/7df7e34))
- Add Node 24 setup in CI for TypeScript support ([9cd0329](https://github.com/studiometa/fox-pilot/commit/9cd0329))
- Merge `@fox-pilot/scripts` into `@fox-pilot/cli` ([060464b](https://github.com/studiometa/fox-pilot/commit/060464b))

### Fixed

- Fix CLI bin script for npm compatibility ([40c3263](https://github.com/studiometa/fox-pilot/commit/40c3263))
- Fix repository URLs in all packages for provenance ([20000aa](https://github.com/studiometa/fox-pilot/commit/20000aa), [3d499e1](https://github.com/studiometa/fox-pilot/commit/3d499e1))

## v0.2.0 - 2026.01.15

### Added

- Add platform-specific native host packages for easier installation ([36c6549](https://github.com/studiometa/fox-pilot/commit/36c6549))
- Add GitHub Actions CI workflow ([8f1a1c1](https://github.com/studiometa/fox-pilot/commit/8f1a1c1))
- Add vitest tests for client and CLI ([c121e6c](https://github.com/studiometa/fox-pilot/commit/c121e6c))
- Add oxlint config for TypeScript-aware linting ([29c5195](https://github.com/studiometa/fox-pilot/commit/29c5195))

### Changed

- Make CLI Node.js-compatible, no Bun required ([15636a0](https://github.com/studiometa/fox-pilot/commit/15636a0))
- Refactor to npm workspace with Bun + TypeScript ([1763b0f](https://github.com/studiometa/fox-pilot/commit/1763b0f))
- Normalize naming to fox-pilot across the codebase ([812aff3](https://github.com/studiometa/fox-pilot/commit/812aff3))
- Update documentation for Node.js 24+ and platform packages ([ec21ae2](https://github.com/studiometa/fox-pilot/commit/ec21ae2))
- Rewrite README to focus on CLI as main package ([3371cce](https://github.com/studiometa/fox-pilot/commit/3371cce))
- Add experimental project warning disclaimer ([637b9e2](https://github.com/studiometa/fox-pilot/commit/637b9e2))
- Add acknowledgements section with inspiration links ([b2ede37](https://github.com/studiometa/fox-pilot/commit/b2ede37))
- Update macOS runner from macos-13 to macos-15-intel in CI ([583d481](https://github.com/studiometa/fox-pilot/commit/583d481))

### Fixed

- Skip native host installation in CI environments ([1ea65e3](https://github.com/studiometa/fox-pilot/commit/1ea65e3))

## v0.1.0 - 2026.01.14

### Added

- Add Firefox extension with background script and content script for DOM interactions ([8221078](https://github.com/studiometa/fox-pilot/commit/8221078))
- Add Node.js WebSocket server as native messaging host ([8221078](https://github.com/studiometa/fox-pilot/commit/8221078))
- Add client library for agent communication ([8221078](https://github.com/studiometa/fox-pilot/commit/8221078))
- Add automatic native host installation script ([06cec95](https://github.com/studiometa/fox-pilot/commit/06cec95))
- Add usage examples and utilities ([0ccfc09](https://github.com/studiometa/fox-pilot/commit/0ccfc09))
- Add CLAUDE.md with project guidelines ([8ac884f](https://github.com/studiometa/fox-pilot/commit/8ac884f))
- Add SKILL.md for Claude agent integration ([6d81b7a](https://github.com/studiometa/fox-pilot/commit/6d81b7a))
- Add npx CLI for easy installation ([3c81373](https://github.com/studiometa/fox-pilot/commit/3c81373))
- Add accessibility snapshot with refs and new DOM commands ([9da9790](https://github.com/studiometa/fox-pilot/commit/9da9790))
- Add CLI wrapper with foxpilot command ([c4e1ff3](https://github.com/studiometa/fox-pilot/commit/c4e1ff3))
- Add data_collection_permissions to manifest ([66dca82](https://github.com/studiometa/fox-pilot/commit/66dca82))
- Add npm publish workflow with provenance ([fd454cd](https://github.com/studiometa/fox-pilot/commit/fd454cd))

### Changed

- Rename project from Firefox Command to FoxPilot to fox-pilot ([2e88907](https://github.com/studiometa/fox-pilot/commit/2e88907))
- Rename extension to Fox Pilot with fox-pilot slug ([9f09dc5](https://github.com/studiometa/fox-pilot/commit/9f09dc5))
- Switch from eslint to oxlint ([d35cd41](https://github.com/studiometa/fox-pilot/commit/d35cd41))
- Set data_collection_permissions required to 'none' ([c5cc79b](https://github.com/studiometa/fox-pilot/commit/c5cc79b))

### Fixed

- Fix native messaging host connection on macOS ([e6dff4c](https://github.com/studiometa/fox-pilot/commit/e6dff4c))
- Fix install script to use shell wrapper on macOS/Linux ([3ad721f](https://github.com/studiometa/fox-pilot/commit/3ad721f))
- Fix status command to use FoxPilotClient ([6f79d55](https://github.com/studiometa/fox-pilot/commit/6f79d55))
- Fix FoxPilotClient import in CLI ([605b975](https://github.com/studiometa/fox-pilot/commit/605b975))
- Fix manifest and add proper PNG icons ([bedb6c5](https://github.com/studiometa/fox-pilot/commit/bedb6c5))
- Fix data_collection_permissions format and bump min Firefox version ([a91ba33](https://github.com/studiometa/fox-pilot/commit/a91ba33))
- Fix CLI snapshot command to use client.snapshot() method ([cdd099a](https://github.com/studiometa/fox-pilot/commit/cdd099a))
