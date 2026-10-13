# Phase 3: Modal correctness and access

**Status:** Not Started

**Estimated Tasks:** 14

## Overview

Make `ConfettiModal` (`src/modal/modals/confettiModal.js`) edit exactly what it shows and write only real changes. Separate UI-only state (seeded `[v, v]` ranges) from saved overrides and write through `diffFromPreset`, reseed controls on preset switch and Reset, keep the preview on screen while the modal scrolls, and make the colour picker, range sliders and number boxes work by touch and keyboard.

Findings closed here: F1 (modal side), F2, F3, F6 (toggle side), F7 (modal side), F12, F13, F19, F20, F22, F23, F24, F36, F38 (modal side), F50, F51.

## Prerequisites

- Phase 1 complete: `diffFromPreset`, `serialize`, `writeConfettiField` and `resolvePresetName` exist in `src/utils/confettiConfig.js`.
- Phase 2 complete: the preview runs under its own effect id and Apply goes through `handleConfettiForNote` (Task 2.14).
- Read Appendix A findings F1, F2, F3, F6, F7, F12, F13, F19, F20, F22, F23, F24, F36, F38, F50, F51.
- Can run in parallel with Phase 4 (Group A): do not edit `confettiPresets.js`, `confettiManager.js` or `parseEmojiString` here.
- Modal CSS still lives in `addStyles()` in this phase; Phase 5 moves it to `styles.css`. Put new rules in `addStyles()` using class names, not inline styles, so the move is mechanical.

## Tasks

### Draft state and writing

- [ ] **Task 3.1:** Split modal state into `this.settings` (values shown in the controls) and `this.uiOnlyKeys` (a `Set` of keys whose values were derived by the modal, not chosen by the user). In `createRangeSlider()`, when a range key is missing from the preset, seed `[scalar, scalar]` into `this.settings` and add the key to `this.uiOnlyKeys`; remove a key from the set the first time the user changes it. Wrap every numeric value in `Number()` before `toFixed` in `createRangeSlider()` and `createSliderWithInput()`. (F1 modal side, F2)
- [ ] **Task 3.2:** Rewrite `getOverridesFromDefaults()` to build a config from `this.settings` minus `this.uiOnlyKeys`, then return `diffFromPreset(this.selectedPreset, config)`. An untouched preset must produce `{}` so Apply writes `type: <preset>` only. Include `respectReducedMotion: false` when the toggle is off and include `emoji` when set, for every preset type (custom-shape presets included). Round slider values to the control step before storing them (`Number(value.toFixed(decimals))`) in the drag and input handlers. (F2, F6, F7, F38)
- [ ] **Task 3.3:** Make `applySettings()` serialize with `serialize(this.selectedPreset, overrides)` and write with `writeConfettiField` (from Phase 1), stop the preview effect before the note effect starts, then call `triggerConfettiOnNote()` once. Capture the target file in the constructor (`this.targetFile = this.app.workspace.getActiveFile()`); when it is `null` at Apply time, show `new Notice('Open a note to apply confetti')` and keep the modal open with the edits intact. (F44 modal side, F51)
- [ ] **Task 3.4:** Save the reduced-motion toggle: the handler in `buildAccessibilitySection()` updates `this.settings.respectReducedMotion`, calls `checkIfModified()` and schedules the preview; the preview respects it via the Phase 2 gate. Ensure the emoji text field in `buildAppearanceSection()` stores its value (commas and whitespace stripped, empty becomes `null`) for every preset, and that choosing Shape "Default" deletes the `shapes` override rather than storing `null`. (F6, F7, F8 modal side)

### Preset switch, Reset and indicators

- [ ] **Task 3.5:** Factor the range seeding from `createRangeSlider()` into `seedRangeDefaults()` and call it from the preset dropdown `onChange` in `buildUI()`, from `resetToDefaults()`, and from `updateAllControls()` before controls refresh. Reset `this.uiOnlyKeys` at the same points. Guard every handler that indexes `this.settings[key][0]` or `[1]` with `Array.isArray(this.settings[key])`, reseeding when false. (F3)
- [ ] **Task 3.6:** Replace the `style.display` toggling in `toggleSettingsSections()` and the Shape / 3D Wobble controls with a CSS class (`is-hidden`), and give those selects a `min-width` rule so they keep their width after switching to None and back. (F36)
- [ ] **Task 3.7:** Call `checkIfModified()` at the end of `onOpen()` (separately from `schedulePreviewUpdate()`), so the Modified indicator is correct when the modal opens on a note that already has overrides. (F23)
- [ ] **Task 3.8:** Handle unknown presets: in the constructor, when `currentConfig` is present but `resolvePresetName(currentConfig.presetName)` returns `null`, set `selectedPreset` to `'none'`, remember the raw name, and show `new Notice('Unknown confetti preset "<name>"; choose one to replace it')`. In `src/modal/modals/targetPositionModal.js`, where the confetti section builds `confettiStatus`, show `Unknown preset: <name>` (muted/warning colour via a class) instead of `Active: <name>` when the frontmatter has a value that does not resolve. (F24)

### Preview

- [ ] **Task 3.9:** Mount the preview canvas on a fixed layer instead of `modalEl` (the scroll container): create a `div.pixel-banner-confetti-preview-layer` as a child of `this.containerEl` (the modal container, outside the scrolling content), position it with `position: fixed` and update its `top/left/width/height` from `this.modalEl.getBoundingClientRect()` on open and on window resize (registered and removed in `onClose`). Pass that layer to `confettiManager.start(PREVIEW_NOTE_ID, layer, ...)` in `updatePreview()`; remove it in `cleanupPreview()`. (F12)

### Controls and access

- [ ] **Task 3.10:** Fix the colour picker in `renderColorSwatches()`: give `.color-input-hidden` `inset: 0` inside its own swatch (confirm the swatch is `position: relative`); render add and remove as `<button>` elements with `aria-label` ("Add colour", "Remove colour #rrggbb"); show the remove button when focused and under `@media (hover: none)`, not only on hover. (F13, F50)
- [ ] **Task 3.11:** In `toggleIntervalSlider(enabled)`, really disable Burst Interval when not continuous: set `disabled` on the slider and its number input (or call `setDisabled` on the Setting components) in addition to the visual state, and re-enable them when continuous is turned on. (F50)
- [ ] **Task 3.12:** Rebuild the dual-thumb control in `createRangeSlider()`: put the track on its own full-width row under the label (min-width about 150px), keep the two number boxes beside the label; drive thumbs with pointer events (`pointerdown` + `setPointerCapture`, `touch-action: none`) instead of mouse events; give each thumb `role="slider"`, `tabindex="0"`, `aria-valuemin/max/now` and `aria-label` (for example "Size minimum"), and handle Arrow keys (one step), PageUp/PageDown (ten steps) and Home/End; stop the min thumb passing the max thumb. Remove the old `dragAbortController` mouse listeners. (F19, F20)
- [ ] **Task 3.13:** Clamp number boxes on `change` and `blur` in `createSliderWithInput()` and `createRangeSlider()`: parse, clamp to `[min, max]`, round to the step, write the result back to both the stored setting and the input, and revert to the stored value when the input is not a number. (F22)

### Tests

- [ ] **Task 3.14:** Extend `tests/unit/modal/confettiModal.test.js`: open on every preset and Apply untouched writes exactly `type: <preset>`; switch preset in the dropdown then drag or key-step a range thumb without throwing, and the shown values equal the new preset's; Reset then edit does not throw; reopen after Apply shows the same values and the Modified state matches; the reduced-motion toggle off writes `respectReducedMotion: false`; emoji on `snowflakes` and `leaves` is written; float drags write rounded values; an out-of-range number box snaps back; Apply with no active file keeps the modal open and shows a Notice; an unknown preset opens as None with a Notice; the preview layer is a child of `containerEl`, not `modalEl`, and is removed on close.

## Phase Testing

- Run `npx vitest run`; the full suite must be green with the Task 3.14 tests.
- Live smoke check: open the modal from the Target Position 🎊 button on `Confetti/Custom Overrides.md`, confirm Modified shows on open, scroll to the bottom and confirm the preview stays visible, switch preset and drag a range thumb with no `dev:errors` entries.

## Acceptance Criteria

- Open then Apply with no changes writes `type: <preset>` only, for every preset
- Preset switch and Reset leave every control showing the new preset's values, and no control throws
- Modified is correct from the moment the modal opens
- Reduced-motion toggle and emoji are saved for every preset; Shape "Default" removes the override
- The preview stays fixed over the modal while it scrolls and is removed on close
- Colour add/remove, range thumbs and Burst Interval work and disable correctly by mouse, touch and keyboard, with ARIA labels
- Number boxes never display a value different from the stored one
- Apply with no active note keeps the modal open with a Notice; an unknown preset is shown as such in the modal and the entry button

## Notes

- Defining all four ranges on every preset (Phase 4, Task 4.6) makes the seeded values equal the defaults; Task 3.1's UI-only set is still needed so the diff is correct regardless of preset data.
- Keep new CSS in `addStyles()` as class rules for now; Phase 5 moves it verbatim.

## Phase Completion Summary

_Filled after implementation: date, implementer, what was done, files changed, issues._
