# AGENTS.md

This file provides guidance to AI coding agents like Claude Code (claude.ai/code), Cursor AI, Codex, Gemini CLI, GitHub Copilot, and other AI coding assistants when working with code in this repository.

## Project Overview

Pixel Banner is an Obsidian plugin that adds customizable banner images to notes. It supports AI-generated banners via Pixel Banner Plus, local images/videos, and integrations with Pexels, Pixabay, Flickr, and Unsplash APIs.

- **Language**: JavaScript (no TypeScript)
- **Target**: Obsidian 1.6.0+
- **Bundler**: esbuild (ES2018)
- **No linting/formatting tools** - maintain consistent style manually

## How to Use This File

This file is an index. Each section below has a short summary; open the linked `.agents-docs/` file only when your task touches that area. Sections short enough to read every time stay inline here.

## Essential Commands

`npm run test-build` is the primary dev command (builds and copies to the test vault); `npx vitest run` runs the suite once (`npm test` stays in watch mode); `npx vitest run <file>` or `-t "<name>"` narrows it. Commits run the full suite via a Husky pre-commit hook.

Details: [Essential Commands](./.agents-docs/AGENTS-essential-commands.md)

## Architecture

Entry is `src/core/pixelBannerPlugin.js`, a thin class that binds module functions; `eventHandler.js` reacts to workspace events, `bannerManager.js` resolves banners (`addPixelBanner()`, `updateBanner()`), `domManager.js` runs the DOM observers, `bannerUtils.js:getInputType()` classifies frontmatter input (path, wiki link, markdown image, URL, file://, keyword), and `cacheHelpers.js` caches images. Covers the delegator pattern, input resolution order, DOM persistence, the confetti subsystem, the release notes pipeline, modals, services and a key-files table. Before changing banner insertion or cleanup, read `OBSIDIAN_DOM_LIFECYCLE.md`.

Details: [Architecture](./.agents-docs/AGENTS-architecture.md)

## Testing

Vitest with happy-dom; tests in `tests/unit/` and `tests/integration/`; `obsidian` and `virtual:release-notes` are aliased to mocks in `tests/mocks/`.

Details: [Testing](./.agents-docs/AGENTS-testing.md)

## Live UI Testing

Drive a running Obsidian through the official Obsidian CLI to verify changes for real: build, reload the plugin, check errors, inspect DOM, take screenshots, send real mouse clicks over CDP. The plugin id is `pexels-banner`, and always pass `vault=pixel-banner-example`.

Details: [Live UI Testing](./.agents-docs/AGENTS-live-ui-testing.md)

## Adding New Features

Step lists for adding a new image provider and a new Image Property Format, naming every file to touch.

Details: [Adding New Features](./.agents-docs/AGENTS-adding-new-features.md)

## Required Updates When Modifying Code

1. **Always update `inventory.md`** when modifying files
2. **Update `UPDATE.md`** for user-facing changes (shown in plugin UI)
3. **Update `CHANGELOG.md`** for technical changes
4. Test in `.vault/pixel-banner-example/` before committing

## Code Style

- camelCase for variables/functions
- PascalCase for classes/components
- Ensure desktop and mobile Obsidian compatibility
- Console logs acceptable during development
- Before settings UI, DOM construction, lifecycle, vault or networking work, check `OBSIDIAN_DEVELOPMENT_STANDARDS.md` (repo root); its [REQUIRED] items are what the Obsidian review team enforces

## Debugging

- Obsidian Developer Tools: Ctrl+Shift+I
- Banner issues: Check `bannerManager.js`
- Banner disappears or flickers: Check `domManager.js` observers and the `setChildrenInPlace` override in `bannerManager.js` (see `OBSIDIAN_DOM_LIFECYCLE.md`)
- Path resolution issues: Check `bannerUtils.js:getInputType()`

## Release Process

1. Update version in `manifest.json` and `package.json`
2. Update `CHANGELOG.md` (technical) and `UPDATE.md` (user-facing)
3. Update `inventory.md` if files changed
4. Run `npm run build`
5. Test in `.vault` environment

## Keeping this file current

The `Failure log` section below is a recording of mistakes made by previous AI Agents while working with this code base.

When you make a mistake, get corrected, or discover something about this codebase that wasn't written down:

1. Add one line to the `Failure log` below, in the imperative, describing the correct behaviour.
2. Keep it specific to this repo. General advice belongs nowhere.
3. If this fix is a workflow rather than a rule, put it in `.claude/skills/` and link it from here.
4. Include the change in the same commit and mention it in your summary.

## Failure log

- Preserve line endings in files whose git blob mixes CRLF and LF (e.g. `src/settings/tabs/settingsTabAPISettings.js`): if `git diff --stat` is far larger than your change, compare with `git diff --stat --ignore-all-space`, restore the file and re-apply the edit byte-preserving.
