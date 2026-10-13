# Phase 6: Test hardening and live verification

**Status:** Not Started

**Estimated Tasks:** 10

## Overview

Replace the false-positive and vacuous confetti tests with ones that would have caught the 53 findings, add end-to-end round-trip tests for every preset, then run a full live pass in Obsidian through the CLI and measure two-pane frame time for main-thread rendering. Results are recorded in this spec so finalization can tick off every finding.

Findings closed here: F42. Verifies all of F1-F53 and NFR-1 to NFR-6.

## Prerequisites

- Phases 1-5 complete and the suite green.
- Obsidian 1.14.4 with the CLI enabled; the test vault `pixel-banner-example`; plugin id `pexels-banner`. Read `.agents-docs/AGENTS-live-ui-testing.md`.
- Read Appendix A finding F42 and Appendix B ("Not fully checked") in the PLAN-DRAFT.

## Tasks

### Test hardening

- [ ] **Task 6.1:** Fix the false-positive test in `tests/integration/confettiWorkflow.test.js` (the note-switch test that asserts before the fade completes): advance fake timers past the fade and assert the canvas is removed and `note2`'s effect is active. Fix the vacuous tests (assertions that pass whatever the code does) so each asserts an observable outcome. (F42)
- [ ] **Task 6.2:** Add gate coverage to `confettiWorkflow.test.js`: mobile (`Platform.isMobile` true with `confettiDisableOnMobile` on, then off), reduced motion (`matchMedia` mocked to match, with and without `respectReducedMotion: false`), and the plugin metadata path (`changed` event through `pixelBannerPlugin.js` into `handleConfettiMetadataChange`). Extend `tests/mocks/obsidian.js` if `Platform` or `registerDomEvent` need mocking. (F42)
- [ ] **Task 6.3:** Add end-to-end tests: for every preset, open the modal, change one override of each type, Apply, read the written frontmatter, parse it with the codec, run `buildOptions`, and assert every option canvas-confetti receives is numeric where it must be (`particleCount`, `scalar`, `gravity`, `startVelocity`, `drift`, `spread`), colours are valid hex and shapes are present. Include a dropdown-switch-then-Apply case. (F42, F1, F2, F3, F5)
- [ ] **Task 6.4:** Review all five confetti test files for any test that cannot fail (no assertion, assertion on a mock it set itself, or `expect(true)`); fix or delete each, and note the count in the completion summary.

### Live verification

- [ ] **Task 6.5:** Run the live pass via the Obsidian CLI (`npm run test-build`, reload `pexels-banner`, `vault=pixel-banner-example`) and record each result in the table below: both sides of a split animate; a background tab pauses and resumes; switching notes fades and restarts; closing the last tab leaves 0 canvases; plugin reload leaves 0 canvases and a stable listener count; light and dark themes for all 14 presets; mobile emulation (`app.emulateMobile(true)`) with Disable on Mobile on and off; reduced motion via CDP emulation; 30 rapid note switches; modal open, Modified on open, preset switch, Reset, Apply untouched writes `type: <preset>`, reopen shows the same values; preview stays visible while scrolling; `dev:errors` empty throughout.
- [ ] **Task 6.6:** Measure two-pane frame time with main-thread rendering (NFR-6): open two continuous presets at the 150-particle cap side by side, record frame times for at least 10 seconds via CDP (Performance or a `requestAnimationFrame` sampler run through the CLI), and record p50/p95 in this spec. If p95 exceeds 33ms, record the finding and apply the plan's fallback (worker for a single active pane) as a follow-up note rather than in this phase.
- [ ] **Task 6.7:** Check the Appendix B "Not fully checked" items that the CLI can reach: startup (not just reload) with a confetti note focused, resume after the document becomes visible again, undo/restore of the whole frontmatter, first-edit restart on a note without a banner, the Target Position entry in light theme and mobile emulation. Record results; mark real-device mobile as not tested (out of scope).
- [ ] **Task 6.8:** Fix any failure found in Tasks 6.5-6.7 that falls within the 53 findings, add a regression test for it, and re-run the affected live check. Anything outside the findings goes in Notes as follow-up.

### Close-out

- [ ] **Task 6.9:** Walk Appendix A F1-F53 and confirm each is closed by a ticked task in Phases 1-6 (F45 and F49 as guards with tests); list any gap in the completion summary.
- [ ] **Task 6.10:** Run `npx vitest run` one final time and record the file and test counts (904 at the start) in the completion summary.

## Live Pass Results

| Check | Result | Notes |
|---|---|---|
| _filled during Task 6.5-6.7_ | | |

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

## Phase Completion Summary

_Filled after implementation: date, implementer, what was done, files changed, issues._
