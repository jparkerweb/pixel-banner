# Phase 2: Per-pane effect engine and lifecycle

**Status:** Not Started

**Estimated Tasks:** 16

## Overview

Replace the file-path-keyed, worker-backed effect map in `src/core/confettiManager.js` with one `ConfettiEffect` per pane, keyed by `leaf.id` and rendered on the main thread (`useWorker: false`). Rework the confetti paths in `src/core/eventHandler.js` and `src/core/pixelBannerPlugin.js` so effects start, update, pause and stop per leaf, every start path applies the mobile and reduced-motion gates, and unload releases every listener, interval and observer.

Findings closed here: F4, F6 (gate side), F11, F18, F21, F25, F30, F31, F32, F35, F41, F43, F44, F45, F46, F47, F48, F49.

## Prerequisites

- Phase 1 complete: `src/utils/confettiConfig.js` exports `parse`, `normalize` and `serialize`, and the suite is green.
- Read Appendix A findings F4, F6, F11, F18, F21, F25, F30, F31, F32, F35, F41, F43, F44, F45, F46, F47, F48, F49.
- Read `OBSIDIAN_DOM_LIFECYCLE.md` (banner insertion and cleanup) and the lifecycle sections of `OBSIDIAN_DEVELOPMENT_STANDARDS.md` (registered events and intervals).

## Tasks

### Effect engine

- [ ] **Task 2.1:** In `src/core/confettiManager.js` create a `ConfettiEffect` class that owns one pane's canvas, its `confetti.create(canvas, { resize: false, useWorker: false })` instance, `intervalId`, `timeoutId`, observers, pending fade timer and normalized `config`. Move the body of today's `createCanvas()`, `start()`, `fireBurst()`, `stop()` and `removeCanvas()` into methods `start()`, `fireBurst()`, `pause()`, `resume()`, `stop(fadeMs)` and `dispose()`. `dispose()` must be idempotent and leave no DOM, timers or observers behind. (F4, F32 worker leak, F49)
- [ ] **Task 2.2:** Rewrite `ConfettiManager` as a registry `Map<effectId, ConfettiEffect>` where `effectId` is the leaf id (`leaf.id`) for notes and the modal's `PREVIEW_NOTE_ID` for the preview. New signature `start(effectId, containerEl, presetName, overrides, { isPreview = false, filePath = null } = {})`; keep `stop(effectId, fadeMs)`, `stopAll(immediate)`, `hasActiveEffect(effectId)`, `update(...)`; add `pause(effectId)`, `resume(effectId)`, `getEffect(effectId)` and `getNoteEffectIds()` (excludes preview effects). Store `filePath` and the raw parsed config on each effect so callers can tell which file a pane shows and whether a config really changed. (F4, F43)
- [ ] **Task 2.3:** Make `update(effectId, containerEl, presetName, overrides, opts)` a no-op when the normalized config equals the running effect's config (deep compare), and otherwise restart that one effect. Starting a note effect must never stop the preview, and starting the preview must never stop a note effect except through the modal's own `suppressNoteEffect()`. (F31, F43, F44)
- [ ] **Task 2.4:** Fix the fade order in `ConfettiEffect.stop(fadeMs)`: clear the interval, delay timeout and observers immediately, start the opacity transition, and call `confettiInstance.reset()` inside the fade timeout just before removing the canvas. Track the 10ms fade-in timer from `start()` and clear it in `stop()`. With `fadeMs === 0`, reset and remove at once. (F21)
- [ ] **Task 2.5:** Add a `ResizeObserver` on the container in `ConfettiEffect.start()` that updates `canvas.width` / `canvas.height` to the container's client size (times `devicePixelRatio` if the existing canvas code uses it) and disconnect it in `stop()` / `dispose()`. Defer the first `fireBurst()` until the canvas has non-zero width and height (wait for the first non-zero resize callback), so a hidden 0x0 pane never fires. (F48, F49)

### Pausing

- [ ] **Task 2.6:** Make pausing work for hidden tabs and scrolled-off banners: observe the banner element when present (the plugin's banner container inside `leaf.view.contentEl`), otherwise the leaf's content element, with an `IntersectionObserver` whose `root` is the view's scroll container (the `.cm-scroller` in editing view, `.markdown-preview-view` in reading view). Treat `isIntersecting === false` or a 0x0 container as paused. `_reconcileAnimation` logic moves onto the effect: run only when the document is visible and the pane is on screen; resume fires once immediately then reschedules. (F4, F41)
- [ ] **Task 2.7:** Move the `visibilitychange` listener out of the `ConfettiManager` constructor into `init(plugin)`, registered with `plugin.registerDomEvent(document, 'visibilitychange', ...)`, and add `destroy()` that disposes every effect. Call `confettiManager.init(this)` in `onload()` and `confettiManager.destroy()` in `onunload()` of `src/core/pixelBannerPlugin.js` (replacing the `stopAll(true)` call there). Register continuous intervals with `plugin.registerInterval()` as well as clearing them on stop, so unload releases them even if a stop is missed. (F32)

### Event handling per leaf

- [ ] **Task 2.8:** Rewrite `handleConfettiForNote(leaf, frontmatter)` in `src/core/eventHandler.js` to key by `leaf.id`: remove the loop that stops every other active id; parse with `parse()` from `confettiConfig.js`; when the leaf already runs an effect for a different file, stop it first; call `confettiManager.update` or `start` with `{ filePath: leaf.view.file.path }`. Rewrite `handleConfettiCleanup(previousLeaf)` to stop only that leaf's effect, and only when the leaf now shows a different file or no markdown view. (F4, F11)
- [ ] **Task 2.9:** Rewrite `handleConfettiMetadataChange(file, cache)` to iterate `this.app.workspace.getLeavesOfType('markdown')`, act only on leaves whose `view.file.path === file.path`, call `handleConfettiForNote` for each without changing the active leaf or focus, and stop only those leaves' effects when the field is removed or invalid. Never touch leaves showing other files and never touch the preview effect. (F11, F43)
- [ ] **Task 2.10:** Extend `handleLayoutChange()` in `eventHandler.js` with confetti reconciliation: for each note effect id from `confettiManager.getNoteEffectIds()`, dispose the effect when no markdown leaf with that id exists any more or the leaf's file path differs from the effect's `filePath`. This covers closing the last markdown tab, rename and mode switches. (F35)
- [ ] **Task 2.11:** Guard the slow-banner race in `handleActiveLeafChange`: after `await updateBanner(...)` and before `handleConfettiForNote`, return early when `this.app.workspace.activeLeaf !== leaf` or the leaf's file changed during the await. Apply the same check on the non-banner path that also calls `handleConfettiForNote`. (F45)

### Startup and frontmatter tracking

- [ ] **Task 2.12:** In `onload()` of `src/core/pixelBannerPlugin.js`, inside `this.app.workspace.onLayoutReady(...)` (which runs immediately when the layout is already ready), run a confetti pass for every visible markdown leaf: read the file's frontmatter from `metadataCache.getFileCache(file)` and call `handleConfettiForNote.call(this, leaf, frontmatter)`. Seed `this.lastFrontmatter` for those files in the same pass so the first edit does not count as a change. (F18, F31)
- [ ] **Task 2.13:** In the metadata `changed` handler of `pixelBannerPlugin.js`: delete the `lastFrontmatter` entry for the file in the no-frontmatter branch, so restoring the frontmatter (undo or paste) restarts the effect; and decide "confetti changed" by comparing the newly parsed config with the running effect's stored raw config (Task 2.2) rather than with `lastFrontmatter` alone, so an unseeded note or a cleared `lastFrontmatter` (after `saveSettings` in `src/core/settings.js`) does not restart a running effect. (F30, F31)

### Gates

- [ ] **Task 2.14:** Put the gates in one place: add `shouldRunConfetti(plugin, overrides)` (in `eventHandler.js` or the manager) that returns false when `plugin.settings.confettiDisableOnMobile` and `Platform.isMobile`, or when `window.matchMedia('(prefers-reduced-motion: reduce)').matches` and `overrides.respectReducedMotion !== false`. Call it from `handleConfettiForNote`, the startup pass, the metadata path and the modal preview. In `buildOptions()` set `disableForReducedMotion: config.respectReducedMotion !== false` instead of the hard-coded `true`. Change `triggerConfettiOnNote()` in `confettiModal.js` to call `handleConfettiForNote.call(plugin, leaf, frontmatter)` so Apply passes through the same gates. (F6, F25)
- [ ] **Task 2.15:** Re-evaluate gates while running: register a `matchMedia('(prefers-reduced-motion: reduce)')` `change` listener through the plugin (`registerDomEvent` on the `MediaQueryList`, or add/remove in `init`/`destroy`) that stops gated effects when reduced motion turns on and re-runs the visible-leaf pass when it turns off; in `saveSettings()` (`src/core/settings.js`) re-run the visible-leaf pass from Task 2.12 so toggling Disable Confetti on Mobile or renaming `customBannerConfettiField` takes effect at once. (F46, F47)

### Tests

- [ ] **Task 2.16:** Add tests in `tests/unit/core/confettiManager.test.js` and `tests/integration/confettiWorkflow.test.js` (mock leaves with distinct `id` and `view.file.path`): two leaves on the same file run two independent effects; two files in a split both run, and activating one does not stop the other; a leaf switched to another file stops only that leaf; a metadata change on file A leaves file B's effect and the preview untouched; a hidden pane (IntersectionObserver reports not intersecting) pauses and resumes; layout-change after closing the last tab disposes the effect; the gates block start on mobile and reduced motion on every path, including Apply; `update` with an equal config does not restart; the `visibilitychange` listener count is stable across `init`/`destroy` cycles; `confetti.create` is called with `useWorker: false`; `stop` resets particles only after the fade.

## Phase Testing

- Run `npx vitest run`; the full suite must be green with the Task 2.16 tests.
- Live smoke check (`npm run test-build`, reload `pexels-banner`, `vault=pixel-banner-example`): open `Confetti/Snow.md` and `Confetti/Hearts.md` side by side and confirm both animate; switch tabs and confirm the hidden one stops firing; `dev:errors` shows no confetti errors. The full live pass is Phase 6.

## Acceptance Criteria

- Effects are keyed by leaf id; both sides of a split animate independently
- A tab hidden behind another tab pauses and resumes; scrolling the banner out of view pauses a continuous effect
- Metadata changes affect only leaves showing that file and never the preview
- Closing a pane or switching its file disposes its effect (no detached canvas or observer)
- Already-open notes get confetti on plugin load/enable; restoring removed frontmatter restarts it; the first edit does not restart a running effect
- Disable-on-mobile and reduced motion apply on open, metadata, startup, Apply and preview, and react to live setting and OS changes
- Fade is visible (particles stay until the canvas has faded); the canvas buffer follows pane resize; no fire on a 0x0 canvas
- Plugin unload leaves zero canvases, intervals, observers and document listeners from confetti

## Notes

- Main-thread rendering is a known risk (NFR-6); keep the 150-particle cap and pausing. The measurement is Task 6.6.
- `PREVIEW_NOTE_ID` lives in `confettiModal.js`; export it or move it to the manager so both sides share the constant.
- The legacy `noteId` naming in the manager can be renamed to `effectId` as part of this phase; update the tests that reference it.

## Phase Completion Summary

_Filled after implementation: date, implementer, what was done, files changed, issues._
