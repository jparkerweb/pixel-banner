# Architecture
> Part of [AGENTS.md](../AGENTS.md): project guidance for AI coding agents.

## Core Plugin Flow

1. **Entry**: `src/core/pixelBannerPlugin.js` extends Obsidian's `Plugin` class
2. **Events**: `eventHandler.js` handles workspace events (leaf changes, layout changes, mode changes, confetti metadata changes)
3. **Resolution**: `bannerManager.js` determines and displays banners based on frontmatter/folder settings
4. **Input Detection**: `bannerUtils.js:getInputType()` identifies input type (keyword, URL, vault path, wiki link)
5. **DOM**: `bannerManager.js:addPixelBanner()` creates the banner, `updateBanner()` refreshes it, `applyBannerSettings()` styles it
6. **Observers**: `domManager.js` owns the mutation/resize observers, field and embed visibility, and `cleanupPreviousLeaf()`
7. **Caching**: `cacheHelpers.js` manages image caching

## Plugin Class Is a Thin Delegator

Methods on the class in `pixelBannerPlugin.js` are one-line bindings that forward to module functions, either as `fn(this, ...)` (e.g. `addPixelBanner(this, el, ctx)`) or `fn.call(this, ...)` (e.g. `getInputType.call(this, input, sourcePath)`). Put new logic in the relevant module and add a binding on the class; match the calling style the module function already uses.

## Input Type Detection (`bannerUtils.js:getInputType()`)

The plugin reads multiple input formats:
- Plain paths: `image.jpg`, `folder/image.jpg`
- Wiki links: `[[image.jpg]]`, `![[image.jpg]]`
- Markdown images: `![](image.jpg)`
- URLs: `https://example.com/image.jpg`
- file:// protocol: `file:///C:/path/image.jpg`
- Keywords: `sunset beach` (triggers API search)

Resolution order:
1. Check for wiki/markdown syntax
2. Clean quotes and syntax
3. Check for file:/// protocol
4. Try URL parsing
5. Check vault for exact path match
6. Try partial path matching
7. Default to keyword

## Banner Persistence in the DOM

Obsidian's child reconciliation (`setChildrenInPlace`) removes injected DOM, so `bannerManager.js` overrides it to keep the banner in place, and `domManager.js` observes only mode switches, not scroll. Read `OBSIDIAN_DOM_LIFECYCLE.md` (repo root) before changing banner insertion, observers or cleanup.

## Confetti Subsystem

- `src/core/confettiManager.js`: exported `confettiManager` singleton that runs effects (built on `canvas-confetti`, the only runtime dependency)
- `src/core/confettiPresets.js` / `confettiShapes.js`: preset definitions and custom shapes
- `src/utils/confettiUtils.js`: parse, sanitize and build the `banner-confetti` frontmatter config
- `src/modal/modals/confettiModal.js`: settings modal with live preview, opened from the Target Position modal
- `eventHandler.js`: `handleConfettiForNote`, `handleConfettiCleanup`, `handleConfettiMetadataChange` start, stop and live-update effects
- Settings: `customBannerConfettiField` (default `banner-confetti`), `confettiDisableOnMobile`

## Release Notes Pipeline

`scripts/esbuild.config.mjs` reads `UPDATE.md`, converts it with `marked`, and serves it as the `virtual:release-notes` module that `pixelBannerPlugin.js` imports for the release notes modal. Tests alias that module to `tests/mocks/virtual-release-notes.js`.

## Modal Pattern

All modals extend Obsidian's `Modal` class:
```javascript
class ExampleModal extends Modal {
  constructor(app, plugin) { /* setup */ }
  onOpen() { /* build UI */ }
  onClose() { /* cleanup */ }
}
```

## Service Layer

- `apiService.js`: Pexels, Pixabay, Flickr, Unsplash integrations (`fetchPexelsImage()` and siblings)
- `apiPIxelBannerPlus.js`: Premium AI generation features
- API keys stored in plugin settings, never in code

## Key Files

| File | Purpose |
|------|---------|
| `src/core/pixelBannerPlugin.js` | Main entry point; binds module functions onto the plugin |
| `src/core/bannerManager.js` | Banner creation/updates |
| `src/core/bannerUtils.js` | Input type detection, path resolution, `getActiveApiProvider()` |
| `src/core/domManager.js` | DOM observers, field/embed visibility, leaf cleanup |
| `src/core/eventHandler.js` | Workspace event handlers |
| `src/core/settings.js` | `loadSettings()` / `saveSettings()` only |
| `src/settings/settings.js` | `DEFAULT_SETTINGS` and the settings tab |
| `src/services/apiPIxelBannerPlus.js` | Pixel Banner Plus API. Note the capital `I` in the filename; import it with that exact casing |
| `src/utils/frontmatterUtils.js` | Frontmatter parsing/updates |
| `src/modal/modals.js` | Modal exports |
