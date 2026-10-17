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

Entry is `src/core/pixelBannerPlugin.js`, a thin class that binds module functions; `eventHandler.js` reacts to workspace events, `bannerManager.js` resolves banners (`addPixelBanner()`, `updateBanner()`), `domManager.js` runs the DOM observers, `bannerUtils.js:getInputType()` classifies frontmatter input (path, wiki link, markdown image, URL, file://, keyword), `cacheHelpers.js` caches images, and `printBanner.js` adds the banner to Export to PDF renders synchronously. Covers the delegator pattern, input resolution order, DOM persistence, Export to PDF, the confetti subsystem, the release notes pipeline, modals, services and a key-files table. Before changing banner insertion or cleanup, read `OBSIDIAN_DOM_LIFECYCLE.md`.

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

1. Update version in `manifest.json` and `package.json`. Any version bump, a CHANGELOG renumber included, sets the same number in `CHANGELOG.md`, the `UPDATE.md` heading, `package.json` and `manifest.json` together
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
- Reload the plugin through the app API (`obsidian vault=pixel-banner-example eval code="(async()=>{await app.plugins.disablePlugin('pexels-banner');await app.plugins.enablePlugin('pexels-banner')})()"`): `obsidian plugin:reload`, `plugin:disable` and `plugin:enable` exit 127 without doing anything, so check a new method exists on `app.plugins.plugins['pexels-banner']` before trusting a live check.
- Keep the Obsidian window on screen during live confetti checks: a covered window reports `document.hidden`, effects pause by design and Chromium stops animation frames, so nothing draws.
- Take live screenshots with `%LOCALAPPDATA%\Programs\Obsidian\Obsidian.com vault=pixel-banner-example dev:screenshot path=<absolute Windows path>`: the `obsidian` shim on PATH exits 127 for `dev:screenshot` too, and paths inside the agent scratchpad are reported written but never land, so write to a plain `%TEMP%` folder.
- Treat an empty `getComputedStyle(el).position` as `static` in code that checks for an unpositioned container: happy-dom returns `''`, not `static`, so a `=== 'static'` check silently never fires in tests.
- Restart Obsidian (or clear the inline style) before a live check of confetti container styling: a plugin reload keeps inline styles the previous build set on open panes, such as the old `position: relative` on `.view-content`.
- Call `dev:cdp` through `%LOCALAPPDATA%\Programs\Obsidian\Obsidian.com vault=pixel-banner-example`: the `obsidian` shim exits 127 for it, as for `dev:screenshot`.
- Do not expect `obsidian eval` to await a promise: it prints nothing for async code, so store results on `window` and read them back with a second synchronous `eval`.
- Expect `app.emulateMobile(true|false)` to reload the window: anything injected with `eval` is gone afterwards.
- Insert plugin elements into a sizer with `insertPersistentElement` (in front of Obsidian's children), never `appendChild`: a trailing absolutely positioned element breaks reading view heading fold (issue #315). Reproduce fold bugs in a long note (e.g. 4 H1s x 40 paragraphs) in a fresh tab; short notes fold fine and a reused tab keeps the old override.
- Wait at least 3s after an editor edit before checking metadata-driven behaviour (confetti restarts, lastFrontmatter): edits reach the metadata cache only after Obsidian's ~2s save.
- Get the phone layout (`is-phone`, floating header, `--view-top-spacing-markdown` scroller padding) with `dev:mobile on` followed by `dev:cdp method=Emulation.setDeviceMetricsOverride params='{"width":393,"height":852,"deviceScaleFactor":1,"mobile":true}'`: `dev:mobile on` alone emulates a tablet. Undo with `Emulation.clearDeviceMetricsOverride` and `dev:mobile off`.
- Test startup behaviour with `eval code="app.commands.executeCommandById('app:reload')"` (reloads only the test vault window, unlike killing Obsidian) and record diagnostics in a `window` array read back afterwards: `dev:console` is empty after a reload. Debounces keyed by file path miss a note re-opened in a new view (Homepage plugin, issue #333), so key them by view.
- Check `document.hidden` before a live reading view or hover popover check: a covered window renders an empty reading view and opens no popovers. Bring it forward with `eval code="(()=>{const w=require('@electron/remote').getCurrentWindow();w.show();w.focus();w.moveTop()})()"`.
- Check the `Errors` line of a Vitest run, not just `Tests` passed: the pre-commit hook fails on unhandled rejections even when every test passes. Catch the promise of any async function you call from a timer or debounce wrapper (issue #207).
- Edit CRLF files with the Edit tool or a Node script that keeps `\r\n`, never `sed -i` in Git Bash: it rewrote `tests/integration/bannerWorkflow.test.js` from CRLF to LF, a whole-file diff. Compare `git diff --stat` with `--ignore-all-space` after any scripted edit.
- Read plugin errors in a live check with `dev:debug on` then `dev:console level=error`: a `console.error` hook installed through `eval` never sees the plugin's own calls, and `dev:errors` lists only uncaught exceptions. Never leave accessors defined on a banner element's `style` after a trace: `updateBanner` writes `style.backgroundImage` and fails on them.
- Count line endings with Node (`(s.match(/\r\n/g)||[]).length`), not `grep -c $'\r$'` in Git Bash: it reported every line of the LF-only `src/core/printBanner.js` as CRLF.
- Restore only the spies a nested `afterEach` created, never `vi.restoreAllMocks()`, when an outer `afterEach` asserts on another spy: `mockRestore()` clears its calls first, so the outer check passes vacuously (the NFR-2 cache-write guard in `tests/unit/core/printBanner.test.js`).
- Stub the Export to PDF save dialog before every export and keep a reference on `window` (`window.__dlg=require('@electron/remote').dialog; __dlg.showSaveDialog=async()=>({canceled:false,filePath:'<%TEMP% path>'})`): the remote module caches that proxy weakly, a stub applied once is lost when it is collected, and the person at the machine gets real Save As dialogs. Click the **Export to PDF** button of the last `.modal-container`, and set `app.vault.setConfig('pdfExportSettings', …)` back if you toggled *Include file name as title*.
- Capture the print render with a post processor registered on the plugin (`plugin.registerMarkdownPostProcessor((el,ctx)=>{const p=ctx.containerEl.closest('.print');if(p)window.__printRoot=p})`) and read `__printRoot` after the export: the print window is gone by then, so `ownerDocument.defaultView` is `null` (no `getComputedStyle`), and `require('obsidian')` is not available in `eval`. A plugin reload removes the processor.
- Expect a vault video (`app://<hash>/...`) to taint any canvas it is drawn on unless it was loaded with `crossOrigin = 'anonymous'` (`setBannerVideoSource()`): the app itself is `app://obsidian.md`, another origin.
