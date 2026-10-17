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

## Export to PDF

- Obsidian renders the export into a separate, short-lived print document (`.print > .markdown-preview-view`, its own `ownerDocument`) and prints it about 1.1 s later. Main-window timers are held back meanwhile, so anything async (the 50 ms `updateBanner()` path) lands after the print (issues #298, #323)
- The markdown post processor in `pixelBannerPlugin.js` checks `isPrintRender(ctx.containerEl)` first; with `includeBannerInPdfExport` on it calls `addPrintBanner()` and never `updateBanner()`. Keep that branch synchronous: no fetch, no timers, no writes to `loadedImages` or `lastKeywords`
- `src/core/printBanner.js` mirrors the open pane: the cached image (else a URL or vault resource path; keywords print only the pane's image), the pane's icon cloned, the pane video's current frame as a JPEG data URL, and `applyBannerSettings()` for every CSS variable. Elements are created from the print document
- Video frames need an untainted canvas: vault videos (`app://<hash>/...`, another origin than `app://obsidian.md`) are loaded in CORS mode by `setBannerVideoSource()` in `bannerManager.js`. Create any new banner `<video>` through it
- Print CSS is `.print`-scoped in `styles.css`. The title colour targets the bare `h1` that *Include file name as title* adds after the banner, the PDF's counterpart of the inline title
- Live checks: stub the save dialog and capture the print DOM as the AGENTS.md failure log describes

## Confetti Subsystem

- `src/utils/confettiConfig.js`: the one codec for the `banner-confetti` value (schema, `parse`, `normalize`, `diffFromPreset`, `serialize`, `writeConfettiField`). Read and write the value only through it, so the modal's writes read back the same and unchanged settings are not rewritten
- `src/core/confettiManager.js`: exported `confettiManager` singleton, a registry of `ConfettiEffect` objects keyed by `leaf.id` (plus `PREVIEW_EFFECT_ID` for the modal preview). Each effect owns its canvas and a main-thread canvas-confetti instance (`useWorker: false`; the library's worker is a module singleton bound to one canvas), and runs only while the document is visible, the pane has a size and the banner is on screen. `init(plugin)` registers the visibility listener and an unload cleanup; a static pane container gets the `pixel-banner-confetti-host` class while an effect runs. Built on `canvas-confetti`, the only runtime dependency
- On-screen tracking: an effect watches the banner inside the shown scroller (`.cm-scroller` or `.markdown-preview-view` with an `offsetParent`), otherwise the pane container against the viewport. Never pair the container with its own scroller as root: it contains the root, never intersects it, and the effect stays paused for good (a new split has no banner yet when its effect starts; a pane behind another tab has no shown scroller). While it watches the container, each burst and each matching `update()` re-checks for the banner
- `src/core/confettiPresets.js` / `confettiShapes.js`: preset definitions and custom shapes. Light-theme palettes (`getLightThemeColors`) live outside the presets so the modal and the codec never see them; `buildOptions` swaps them in only while the note sets no colours
- `src/utils/confettiUtils.js`: thin wrappers over the codec plus `parseEmojiString` (grapheme splitting)
- Styles for the canvas, the modal and the Target Position confetti row are in `styles.css`; dynamic values go through CSS variables (`setCssProps`), never inline styles
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
| `src/core/printBanner.js` | Synchronous banner for Export to PDF renders |
| `src/core/bannerUtils.js` | Input type detection, path resolution, `getActiveApiProvider()` |
| `src/core/domManager.js` | DOM observers, field/embed visibility, leaf cleanup |
| `src/core/eventHandler.js` | Workspace event handlers |
| `src/core/settings.js` | `loadSettings()` / `saveSettings()` only |
| `src/settings/settings.js` | `DEFAULT_SETTINGS` and the settings tab |
| `src/services/apiPIxelBannerPlus.js` | Pixel Banner Plus API. Note the capital `I` in the filename; import it with that exact casing |
| `src/utils/frontmatterUtils.js` | Frontmatter parsing/updates |
| `src/modal/modals.js` | Modal exports |
