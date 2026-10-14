# Phase 6: Test hardening and live verification

**Status:** Complete

**Estimated Tasks:** 10

## Overview

Replace the false-positive and vacuous confetti tests with ones that would have caught the 53 findings, add end-to-end round-trip tests for every preset, then run a full live pass in Obsidian through the CLI and measure two-pane frame time for main-thread rendering. Results are recorded in this spec so finalization can tick off every finding.

Findings closed here: F42. Verifies all of F1-F53 and NFR-1 to NFR-6.

## Prerequisites

- Phases 1-5 complete and the suite green. VERIFIED: Phases 1-5 are `[x]`; `npx vitest run` passed 32 files, 1086 tests.
- Obsidian 1.14.4 with the CLI enabled; the test vault `pixel-banner-example`; plugin id `pexels-banner`. Read `.agents-docs/AGENTS-live-ui-testing.md`. VERIFIED: Obsidian is running and the CLI answers for `vault=pixel-banner-example`.
- Read Appendix A finding F42 and Appendix B ("Not fully checked") in the PLAN-DRAFT. VERIFIED: read.

## Tasks

### Test hardening

- [x] **Task 6.1:** Fix the false-positive test in `tests/integration/confettiWorkflow.test.js` (the note-switch test that asserts before the fade completes): advance fake timers past the fade and assert the canvas is removed and `note2`'s effect is active. Fix the vacuous tests (assertions that pass whatever the code does) so each asserts an observable outcome. (F42)
- [x] **Task 6.2:** Add gate coverage to `confettiWorkflow.test.js`: mobile (`Platform.isMobile` true with `confettiDisableOnMobile` on, then off), reduced motion (`matchMedia` mocked to match, with and without `respectReducedMotion: false`), and the plugin metadata path (`changed` event through `pixelBannerPlugin.js` into `handleConfettiMetadataChange`). Extend `tests/mocks/obsidian.js` if `Platform` or `registerDomEvent` need mocking. (F42)
- [x] **Task 6.3:** Add end-to-end tests: for every preset, open the modal, change one override of each type, Apply, read the written frontmatter, parse it with the codec, run `buildOptions`, and assert every option canvas-confetti receives is numeric where it must be (`particleCount`, `scalar`, `gravity`, `startVelocity`, `drift`, `spread`), colours are valid hex and shapes are present. Include a dropdown-switch-then-Apply case. (F42, F1, F2, F3, F5)
- [x] **Task 6.4:** Review all five confetti test files for any test that cannot fail (no assertion, assertion on a mock it set itself, or `expect(true)`); fix or delete each, and note the count in the completion summary.

### Live verification

- [x] **Task 6.5:** Run the live pass via the Obsidian CLI (`npm run test-build`, reload `pexels-banner`, `vault=pixel-banner-example`) and record each result in the table below: both sides of a split animate; a background tab pauses and resumes; switching notes fades and restarts; closing the last tab leaves 0 canvases; plugin reload leaves 0 canvases and a stable listener count; light and dark themes for all 14 presets; mobile emulation (`app.emulateMobile(true)`) with Disable on Mobile on and off; reduced motion via CDP emulation; 30 rapid note switches; modal open, Modified on open, preset switch, Reset, Apply untouched writes `type: <preset>`, reopen shows the same values; preview stays visible while scrolling; `dev:errors` empty throughout.
- [x] **Task 6.6:** Measure two-pane frame time with main-thread rendering (NFR-6): open two continuous presets at the 150-particle cap side by side, record frame times for at least 10 seconds via CDP (Performance or a `requestAnimationFrame` sampler run through the CLI), and record p50/p95 in this spec. If p95 exceeds 33ms, record the finding and apply the plan's fallback (worker for a single active pane) as a follow-up note rather than in this phase.
- [x] **Task 6.7:** Check the Appendix B "Not fully checked" items that the CLI can reach: startup (not just reload) with a confetti note focused, resume after the document becomes visible again, undo/restore of the whole frontmatter, first-edit restart on a note without a banner, the Target Position entry in light theme and mobile emulation. Record results; mark real-device mobile as not tested (out of scope).
- [x] **Task 6.8:** Fix any failure found in Tasks 6.5-6.7 that falls within the 53 findings, add a regression test for it, and re-run the affected live check. Anything outside the findings goes in Notes as follow-up.
  > Fixed (F4/F41, regression from Task 2.6): `ConfettiEffect.resolveVisibilityTarget` paired the pane container with the pane's own `.cm-scroller` as root when no banner existed yet, which never intersects, so a note opened in a new split never animated. It now watches the container against the viewport. Regression test: `confettiManager.test.js` "watches a pane without a banner against the viewport, not its own scroller". Live re-run passes.
  > Fixed (F4/FR-4, same function): while a tab was hidden, re-resolving picked the first banner in the pane (the editing view's, hidden in reading mode), so the effect never resumed. Only a banner inside the shown scroller is watched now, and once the container is back on screen the effect re-targets its banner (keeps the F41 scroll pause). Regression tests: "watches the container, not a banner outside the shown scroller" and "resumes when a hidden tab is shown again, then watches its banner". Live re-run passes.
  > Fixed (F16, user chose theme-aware colours): `getLightThemeColors` in `confettiPresets.js` gives snow, snowflakes, space and aliens a darker palette that `buildOptions` uses in the light theme unless the note sets colours. Tests: `confettiManager.test.js` "light theme palettes". Live re-run passes. A theme change applies at the effect's next start.

### Close-out

- [x] **Task 6.9:** Walk Appendix A F1-F53 and confirm each is closed by a ticked task in Phases 1-6 (F45 and F49 as guards with tests); list any gap in the completion summary.
- [x] **Task 6.10:** Run `npx vitest run` one final time and record the file and test counts (904 at the start) in the completion summary.

## Live Pass Results

| Check | Result | Notes |
|---|---|---|
| Both sides of a split animate (Task 6.5) | PASS after fix | First run FAILED: a note opened in a new split never drew. Its effect watched the pane container against the pane's own `.cm-scroller`, which can never intersect (no banner yet at start). Fixed in Task 6.8; re-run: Snow left and Fireworks right both animate. |
| Background tab pauses and resumes (6.5) | PASS after fix | Paused: 0 drawn pixels after 14s behind another tab. First resume FAILED: while hidden the effect re-targeted the editing view's banner (hidden in reading mode) and stayed paused. Fixed in Task 6.8; re-run resumes at once. |
| Switching notes fades and restarts (6.5) | PASS | At +100ms two canvases, old at opacity 0; at +800ms one canvas, old removed; Hearts animates; back to Snow restarts. |
| Closing the last tab (6.5) | PASS | 0 markdown leaves, 0 canvases, 0 `.pixel-banner-confetti-host`. |
| Plugin reload x3 (6.5) | PASS | After each disable 0 canvases and 0 host classes; after enable the open note restarts (1 canvas). CDP `DOMDebugger.getEventListeners`: document 11 (2 visibilitychange) and window 31, unchanged across 3 reloads. |
| Dark theme, all 14 presets (6.5) | PASS | Every preset draws; 51-93% of drawn pixels reach 1.5:1 against `--background-primary` (fade-in included). |
| Light theme, all 14 presets (6.5) | PASS after fix | First run FAILED (F16): over the white page, Snowflakes, Space and Aliens scored 0% at 1.5:1 and showed as faint specks; Snow was visible over the banner only. Fixed in Task 6.8 (light-theme palettes); re-run: Snow 79%, Snowflakes 50%, Space 24% and Aliens 22% (both sampled mid fade-in), all visible by eye on white; dark theme unchanged. Sparkles stays faint (5%): it draws the ✨ emoji, which a palette cannot recolour. |
| Mobile emulation, Disable on Mobile on / off (6.5) | PASS | On: 0 canvases on Snow. Off + save: 1 canvas at once (settings save re-runs the pass). |
| Reduced motion via CDP `Emulation.setEmulatedMedia` (6.5) | PASS | Turning it on stops the running effect; a newly opened note gets none; clearing it restarts. |
| 30 rapid note switches (6.5) | PASS | 60ms apart over 6 notes: 1 canvas left, in the final note's pane, animating. |
| Modal: open, Modified on open, preset switch, Reset (6.5) | PASS | Note with `count: 5` opens as snow with Modified shown; note effect suppressed while open. Switch to hearts, then range box and keyboard edits: no errors. Reset hides Modified and restores the hearts size range (1.50). |
| Modal: Apply untouched, reopen (6.5) | PASS | Writes `type: hearts`; preview layer removed; note effect starts. After switching away and back, it animates; reopening shows hearts, not Modified, count 10. Cancel writes nothing. |
| Preview stays visible while scrolling (6.5) | PASS | Modal scrolled 600px: preview layer top unchanged (76px) and animating. |
| `dev:errors` throughout (6.5) | PASS | Empty after every check. |
| Two-pane frame time, worst case (6.6, NFR-6) | OVER BUDGET | Main thread, rAF sampler, 12s, 2561x1529 window on a 240Hz display. Snow `count: 150` (150 flakes every 100ms, ~12s life) beside Fireworks `count: 150, interval: 500`: p50 58.3ms, p95 95.8ms, p99 104.2ms; 192 of 204 frames over 33ms. Idle baseline p50 4.2 / p95 4.7ms. Follow-up below. |
| Two-pane frame time, capped burst preset (6.6) | PASS | Default Snow beside Fireworks `count: 150`: p50 4.2ms, p95 4.6ms, 0 frames over 33ms. |
| Startup with a confetti note focused (6.7) | PASS | Full window reload (`app:reload`, the whole plugin startup path; the Obsidian process was not quit): the focused note comes back with 1 canvas in its pane, `dev:errors` empty. |
| Resume after the document is visible again (6.7) | PASS | Window minimized (`document.hidden` true) for 14s, then restored: the effect animates at once. |
| Undo/restore of the whole frontmatter (6.7) | PASS | Editor removes the frontmatter: 0 canvases after the save. `editor.undo()`: a new canvas starts and animates. |
| First edit on a note without a banner (6.7) | PASS | Unrelated `tags` edit, saved and in the cache: same canvas, no restart. |
| Target Position entry, light theme and mobile emulation (6.7) | PASS | Screenshots: "Active: hearts" and "Edit Confetti" readable in light theme; under `app.emulateMobile(true)` the row shows the larger touch button. |
| Real-device mobile (6.7) | NOT TESTED | Out of scope: emulation only. |

## Phase Testing

- `npx vitest run` green (Task 6.10).
- The live pass above is this phase's testing.

## Acceptance Criteria

- No confetti test can pass while the behaviour it names is broken; mobile, reduced-motion and metadata gates are covered
- Every preset passes the modal Apply to frontmatter to reload round trip with numeric options
- The live pass table is complete with `dev:errors` empty
- Two-pane frame time is measured and recorded
- Every finding F1-F53 maps to a ticked task

## Notes

- Live testers share one Obsidian window; run checks sequentially and restore the vault and settings afterwards.
- Mobile is verified by emulation only (out of scope: real devices).
- Follow-up (NFR-6, Task 6.6): p95 frame time exceeds 33ms only when a high-frequency continuous preset (Snow, 100ms interval) runs at the 150 count cap, because live particles pile up to thousands. The plan's fallback (canvas-confetti's worker for a single active pane) would move that cost off the main thread; a lower cap for short-interval presets (count x lifetime / interval) is the cheaper option. Not applied in this phase, per the task.

## Phase Completion Summary

**Date:** 2026-10-13. **Implementer:** Claude (Implement + Review, web console), with two helpers for Tasks 6.4 (unit files) and 6.9 (findings walk).

**What was done**
- Task 6.1: the note-switch test now runs on fake timers and asserts the old canvas is still fading at opacity 0, then removed, with note2's effect live; the fade test asserts both sides of the fade. Eight vacuous tests in `confettiWorkflow.test.js` now assert outcomes (legacy string and array forms, missing leaf, view, file, frontmatter, file or cache).
- Task 6.2: mobile, reduced-motion and metadata gates were already covered directly; added six tests through the real `PixelBannerPlugin.onload` `changed` handler (start, restart, remove then undo-restore, unrelated edit, Disable on Mobile on then off, reduced motion with and without opt-out, OS reduced-motion turning on).
- Task 6.3: 44 round-trip tests: for each of the 14 presets, untouched Apply writes `type: <preset>`; one edit of every control type (integer slider, float box, range boxes, range keyboard, colour, dropdowns, toggles) survives Apply, codec parse, `buildOptions` and a burst with numeric options, valid hex colours and shapes; single colour plus emoji; dropdown switch then Apply, untouched and edited. A mutation that makes range values strings (the F1 bug) fails 29 of them.
- Task 6.4: tests that could not fail, across the six confetti test files (`confettiConfig.test.js` was added in Phase 1, so six, not five): 13 fixed and 2 deleted in the unit files, 8 fixed in `confettiWorkflow.test.js` (counted under 6.1); `confettiPresets.test.js` and `confettiConfig.test.js` needed none.
- Tasks 6.5 to 6.7: live pass recorded in the table above; `dev:errors` empty throughout.
- Task 6.8: three fixes with regression tests (new split never animated; hidden tab never resumed; F16 light-theme palettes, the option the user chose).
- Task 6.9: all 53 findings map to ticked tasks with evidence in code. The one gap found, F45 with no test, is closed by five tests in `eventHandler.test.js` (the slow-banner race on both await paths); removing the guards fails three of them. F49's guard test is `confettiManager.test.js` "fires nothing on a 0x0 container until it gets a size". Recorded deviation: F33/Task 5.5 keeps a raw `setInterval` in `ConfettiEffect.reconcile`, released through `plugin.register(destroy)` rather than `registerInterval` (each resume would otherwise add a registration that lives until unload).
- Task 6.10: `npx vitest run`: 32 files, 1148 tests passed (904 at the plan's baseline, 1086 at the start of this phase); 1153 after the review fixes.

**Files changed:** `src/core/confettiManager.js`, `src/core/confettiPresets.js`, `src/modal/modals/confettiModal.js` (review fix), `tests/integration/confettiWorkflow.test.js`, `tests/unit/core/confettiManager.test.js`, `tests/unit/core/eventHandler.test.js`, `tests/unit/modal/confettiModal.test.js`, `tests/unit/utils/confettiUtils.test.js`, `CHANGELOG.md`, `UPDATE.md`, `inventory.md`.

**Review (Implement + Review, focused on this change set):** 0 Critical, 1 Warning, 4 Suggestions confirmed (1 dropped: the In Progress status is by design); all 5 fixed at the user's choice. (1) A banner that renders after the effect starts was never watched, so scrolling it away did not pause the effect in a new split: the effect now re-checks for a banner at each burst while it still watches its container, and on a matching `update()`; two regression tests; live re-run pauses on scroll and resumes, splits and background tabs still pass. (2) `isLightTheme()` moved off `applyRanges`' comment and exported. (3) The modal's Colours row says when a preset draws darker in light themes (`updateColorHint`, 3 tests). (4) UPDATE.md says a theme change applies from the next start. (5) The OS reduced-motion test now fires the listener `onload` registered; it fails without that listener.

**Issues:** NFR-6 is over budget only when a high-frequency continuous preset runs at the 150 count cap (follow-up in Notes). Sparkles stays faint on white (emoji). Startup was checked with a full window reload, not by quitting the Obsidian process. Real-device mobile not tested (out of scope).
