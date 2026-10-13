# Phase 5: Obsidian standards, styles and docs

**Status:** Not Started

**Estimated Tasks:** 10

## Overview

Bring the confetti files up to the [REQUIRED] items in `OBSIDIAN_DEVELOPMENT_STANDARDS.md`: move inline and injected styles into `styles.css`, stop permanently mutating Obsidian's `.view-content`, and remove `console.log` diagnostics. Fix the remaining small bugs in the custom field reset and the styles comment, then correct the docs and fixtures and record the work in CHANGELOG.md, UPDATE.md, README and `inventory.md`.

Findings closed here: F27, F28, F33, F37, F53.

## Prerequisites

- Phases 2, 3 and 4 complete (they create or change the styles and logs this phase moves).
- Read Appendix A findings F27, F28, F33, F37, F53, and the styling, DOM and logging [REQUIRED] items in `OBSIDIAN_DEVELOPMENT_STANDARDS.md`.

## Tasks

### Styles

- [ ] **Task 5.1:** In `src/core/confettiManager.js` (`ConfettiEffect` canvas creation), drop the inline `canvas.style.position/top/left/width/height/pointerEvents/zIndex` assignments that duplicate `.pixel-banner-confetti-canvas` in `styles.css`. Replace the permanent `position: relative` set on the container (`.view-content`) with a host class `pixel-banner-confetti-host` added on start and removed in `removeCanvas` / `dispose()` (only when no other effect still uses that container); add `.pixel-banner-confetti-host { position: relative; }` to `styles.css`. Keep only dynamic values (opacity, transition durations) as inline styles, or express them through CSS variables set with `setCssProps`. (F33)
- [ ] **Task 5.2:** Move every rule from `addStyles()` in `src/modal/modals/confettiModal.js` into a "Confetti modal" section of `styles.css`, scoped under the modal's root class, and delete `addStyles()` plus the `<style>` cleanup in `onClose()`. Replace remaining `el.style.*` writes in the modal (display toggles, widths) with `toggleClass` / CSS classes and CSS variables. (F33)
- [ ] **Task 5.3:** Replace the inline `style` attributes in the confetti section of `src/modal/modals/targetPositionModal.js` (the `confetti-effect-section` block, its status span and button) with classes defined in `styles.css`, including the status colour classes for active, none and unknown states from Task 3.8. (F33)
- [ ] **Task 5.4:** Correct the comment on `.pixel-banner-confetti-canvas` `z-index` in `styles.css`: explain that the canvas sits inside the leaf's stacking context, so z-index 100 stays below modals and the command palette (which are at z-index 50 outside that context), rather than claiming modals are at 1000+. (F53)

### Logging and settings

- [ ] **Task 5.5:** Remove `console.log` diagnostics from `src/core/confettiManager.js`, `src/modal/modals/confettiModal.js` and `src/core/confettiShapes.js`; keep `console.error` only where a real error is caught and the user would otherwise lose information. Confirm with `grep -n "console.log" src/core/confetti* src/modal/modals/confettiModal.js src/utils/confetti*` returning nothing. Confirm no raw `setInterval` remains outside `plugin.registerInterval` (Task 2.7). (F33)
- [ ] **Task 5.6:** Fix the reset button in `src/settings/tabs/settingsTabCustomFieldNames.js`: in the `addExtraButton` reset `onClick`, assign a copy (`[...DEFAULT_SETTINGS[field.setting]]`), call `inputEl.removeClass('is-invalid')` and set `inputEl.title = ''` on the text component, then save. Mind the mixed line endings rule in AGENTS.md for settings tab files. (F37)

### Docs and fixtures

- [ ] **Task 5.7:** In `UPDATE.md` (3.7.0 notes), replace "rain" in the preset list with the real names `rain_light` and `rain_heavy`, and check the rest of the list against `getPresetNames()`. Update the quick-start examples in `UPDATE.md` and `README.md` to the spaced form `type: snow`. (F27, F40 docs)
- [ ] **Task 5.8:** Change `.vault/pixel-banner-example/Confetti/Bubbles.md` frontmatter to `banner-confetti: type: bubbles`. Check every other fixture under `Confetti/` names the preset in its title, and regenerate `example-vault.zip` if the repo ships one built from the vault (see `inventory.md` / AGENTS docs for how it is produced). (F28)
- [ ] **Task 5.9:** Add a CHANGELOG.md entry under the current unreleased version describing the codec, per-pane effects with `useWorker: false`, modal fixes, preset retuning, standards cleanup and the test additions; add a short user-facing UPDATE.md note (split panes animate independently, background tabs pause, modal fixes, presets more visible). Use the `ai-assist-changelog-bump` rules for the version if a bump is due.
- [ ] **Task 5.10:** Update `inventory.md` for every file added or changed across Phases 1-5 (at least `src/utils/confettiConfig.js` new, `tests/unit/utils/confettiConfig.test.js` new, and changed `confettiUtils.js`, `confettiManager.js`, `confettiPresets.js`, `confettiShapes.js`, `eventHandler.js`, `pixelBannerPlugin.js`, `settings.js`, `confettiModal.js`, `targetPositionModal.js`, `settingsTabCustomFieldNames.js`, `styles.css`). Update the confetti subsystem notes in `.agents-docs/AGENTS-architecture.md` to describe the codec and per-pane registry.

## Phase Testing

- Run `npx vitest run`; the full suite must be green (style moves may require updating tests that assert inline styles or `addStyles`).
- `npm run test-build`, reload the plugin, open the modal in light and dark themes and confirm it looks the same as before the move; confirm `.view-content` loses `pixel-banner-confetti-host` after the effect stops.

## Acceptance Criteria

- No inline layout styles or injected `<style>` elements remain in the confetti files; Obsidian's `.view-content` is no longer permanently mutated
- No `console.log` in confetti files; all intervals and listeners are plugin-registered
- Custom field reset clears the invalid state and tooltip
- The styles comment matches the real stacking behaviour
- UPDATE.md, README, the Bubbles fixture, CHANGELOG.md, inventory.md and the architecture notes are accurate

## Notes

- The [REQUIRED] audit covers the confetti files only (NFR-4); the unrelated `bannerManager.js` / `domManager.js` work is out of scope.

## Phase Completion Summary

_Filled after implementation: date, implementer, what was done, files changed, issues._
