# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

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
