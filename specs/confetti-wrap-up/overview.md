# Confetti Wrap-Up

- **Created:** 2026-10-13
- **Source:** [PLAN-DRAFT-20261013.md](./PLAN-DRAFT-20261013.md) (conversation log: [PLAN-CONVERSATION-20261013.md](./PLAN-CONVERSATION-20261013.md))
- **Branch:** `develop`

**Status:** Not Started

## Summary

The confetti feature on `develop` (v3.7.0) was verified end to end by 5 code reviewers and 4 live testers driving Obsidian, then cross-checked by a synthesizer. The suite is green, but 53 findings were confirmed: 1 critical and 3 high bugs in the frontmatter round-trip and the modal, plus medium/low bugs and improvements. This spec fixes all of them through two structural changes (a single config codec, and per-pane effects rendered on the main thread) plus targeted fixes, so the feature can ship.

Findings are numbered F1-F53 as in Appendix A of the PLAN-DRAFT; every task names the findings it closes. Read the finding text in the PLAN-DRAFT before starting a task: it carries the original location, symptom and suggested fix.

## Phase Checklist

- [/] [Phase 1: Config codec and frontmatter round-trip](./phase-1.md)
- [ ] [Phase 2: Per-pane effect engine and lifecycle](./phase-2.md)
- [ ] [Phase 3: Modal correctness and access](./phase-3.md)
- [ ] [Phase 4: Preset looks](./phase-4.md)
- [ ] [Phase 5: Obsidian standards, styles and docs](./phase-5.md)
- [ ] [Phase 6: Test hardening and live verification](./phase-6.md)

## Parallel Execution Groups

| Group | Phases | Reason |
|-------|--------|--------|
| A | 3, 4 | Both build only on Phases 1-2. Phase 3 edits `confettiModal.js`, `targetPositionModal.js` and the modal tests; Phase 4 edits `confettiPresets.js`, `confettiManager.js` (`buildOptions` / `fireBurst`), `parseEmojiString` in `confettiUtils.js` and the preset/manager tests. No shared files or state. |

Phases 1, 2, 5 and 6 run sequentially: 2 needs the codec from 1, 5 moves styles that 2-4 create or change, and 6 verifies everything.

## Tech Stack

| Category | Technology | Version | Justification |
|---|---|---|---|
| Language | JavaScript (ES2018 target) | n/a | Project standard; no TypeScript |
| Bundler | esbuild | ^0.25.12 | Existing build |
| Effects | canvas-confetti | 1.9.4 | Kept; the split bug is in how it is called |
| Rendering mode | canvas-confetti `useWorker: false` | n/a | The library's worker is a module-level singleton bound to one canvas, which causes F4 and part of F43/F44; per-canvas main-thread instances are independent |
| Emoji splitting | `Intl.Segmenter` with regex fallback | built in | Correct graphemes for flags, keycaps, ZWJ (F52) |
| Tests | Vitest + happy-dom | ^3.2.6 | Existing suite |
| Live checks | Obsidian CLI | 1.14.4 | Verified loop in `.agents-docs/AGENTS-live-ui-testing.md` |

## Architecture

### Pattern

**Config codec + per-pane effects, with targeted fixes elsewhere.** Rejected alternatives: patching each finding in place (five patches for one root cause; the bug class returns) and rewriting the feature (discards a modal that mostly works; slower to ship). Also rejected: keeping the worker with one instance per pane, because canvas-confetti shares a single worker across `create()` calls.

```
 frontmatter (banner-confetti)          Target Position modal ── 🎊 ──> ConfettiModal
        │                                                                 │ draft (UI-only ranges)
        ▼                                                                 │ diffFromPreset
  confettiConfig codec  <─────────────── parse / serialize ───────────────┘
        │ normalized { preset, overrides }
        ▼
  eventHandler (per leaf: open, switch, layout-change, metadata change)
        │ leafId, container, config, gates (mobile, reduced motion)
        ▼
  confettiManager registry  ──>  ConfettiEffect (one per pane)
                                   canvas + canvas-confetti (main thread)
                                   interval, IntersectionObserver, fade
```

### Component Overview

| Component | Responsibility | Inputs / Outputs | Depends on |
|---|---|---|---|
| `src/utils/confettiConfig.js` (new) | Field schema (type, bounds, range pairs, hex colours, enums); `parse`, `serialize`, `normalize`, `diffFromPreset`; own-property, case-insensitive preset lookup; tolerant separators | frontmatter string or legacy array ↔ `{ presetName, overrides }` with real numbers | `confettiPresets.js` |
| `src/utils/confettiUtils.js` | Existing exports kept as thin wrappers over the codec | unchanged API | codec |
| `ConfettiEffect` (in `confettiManager.js`) | One pane's canvas, instance, interval, observers, fade; `start / pause / resume / stop / dispose` | leaf, container element, normalized config | canvas-confetti |
| `confettiManager` | Registry `leafId → ConfettiEffect`; global gates; document visibility; preview effect id; `stopAll` / `dispose` on unload | events in, effects out | ConfettiEffect |
| `src/core/eventHandler.js` | Per-leaf start/update/stop; layout-change reconciliation; metadata changes scoped to leaves showing the file; startup pass | workspace events | manager, codec |
| `src/modal/modals/confettiModal.js` | Draft separating UI-only state from saved overrides; preset switch / Reset reseed; preview on a fixed layer; accessible range controls | config in, frontmatter out | codec, manager |
| `src/core/confettiPresets.js` | Every preset defines all four ranges; retuned looks | data | none |
| `styles.css` | All confetti and modal styles (moved from inline / injected CSS) | CSS | none |

### Data Model

Frontmatter value (string form, written by the plugin):

```
banner-confetti: "type: snow, count: 20, sizeRange: 1|3, colors: #ffffff|#c0e0ff, emoji: ❄️"
```

- Keys and values separated by `: ` on write; `:` with or without spaces on read.
- Pairs separated by `, ` on write; `,` with optional whitespace on read, split only before a known `key:` so emoji or text containing commas survive.
- Range pairs `a|b` parse to two finite numbers or are dropped; single colour `#fff` parses to a one-item array; `null`/empty clears the key.
- Legacy array form `['preset', {overrides}]` still parses; never written.

### API

```
parse(value) -> { presetName, overrides } | null
serialize(presetName, overrides) -> string | null
normalize(config) -> config            // coerce, clamp, drop invalid
diffFromPreset(presetName, config) -> overrides
manager.start(leafId, containerEl, presetName, overrides, { isPreview })
manager.pause(leafId) / resume(leafId) / stop(leafId, fadeMs) / dispose()
```

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Main-thread rendering costs frame time with two panes animating | Medium | Medium | 150-particle cap, pause when hidden/off-screen, measure in Task 6.6; worker fallback for a single pane if needed |
| Codec changes how existing notes parse | Low | High | Parse is a superset of today's grammar; golden tests over all fixtures (Phase 1) |
| Per-leaf keying misses an Obsidian event (close, rename, mode switch) | Medium | Medium | Layout-change reconciliation as a safety net (Phase 2) |
| Preset retuning is subjective | Medium | Low | Light/dark screenshots for sign-off (Phase 4) |
| Unrelated uncommitted work on `develop` collides with these edits | Medium | Medium | Commit or stash before Phase 1 (Phase 1 prerequisite) |
| Mixed line endings produce whole-file diffs | Medium | Low | AGENTS.md failure-log rule: byte-preserving edits, check `--ignore-all-space` |

## Success Criteria

- All 53 findings fixed (F45 and F49 as guards with tests) and ticked off in the phase files
- Apply, switch away, return and reopen the modal shows the same look and the same controls for every preset
- Both sides of a split animate independently; a background tab pauses and resumes
- An untouched preset writes `type: <preset>` only
- `dev:errors` empty through a full live pass
- All presets visible in light and dark themes
- Full suite green with new tests per phase; no vacuous confetti tests
- [REQUIRED] standards items hold for the confetti files
- UPDATE.md, CHANGELOG.md, README and inventory.md updated

## Requirements Traceability

<!-- VERIFICATION: Added so every FR/NFR from the PLAN-DRAFT maps to the phases that deliver it -->

| ID | Requirement (short) | Delivered in |
|---|---|---|
| FR-1 | `banner-confetti` string, legacy array and unspaced forms parse; field name follows `customBannerConfettiField` | Phase 1 (1.3, 1.4, 1.8), Phase 2 (2.15), Phase 5 (5.6, 5.7) |
| FR-2 | All 14 presets render and look like their names; custom SVG and emoji draw | Phase 4 (4.1-4.9, 4.11) |
| FR-3 | Hand-edited values clamp; junk never throws or leaves a canvas | Phase 1 (1.2, 1.5), Phase 4 (4.3), Phase 3 (3.13) |
| FR-4 | Effects belong to a pane: start, fade, restart, independent splits, hidden-tab pause, unload stops all | Phase 2 (2.1-2.12) |
| FR-5 | Field add/change/remove updates live, only in panes showing that file | Phase 2 (2.9, 2.13) |
| FR-6 | Modal opens with current config, controls work after switch/Reset, Modified correct, Apply writes only real overrides | Phase 3 (3.1-3.8, 3.10-3.13), Phase 1 (1.10) |
| FR-7 | Preview updates ~100ms after change, stays fixed over the modal, cleaned up on close | Phase 3 (3.9), Phase 2 (2.3) |
| FR-8 | Mobile and reduced-motion gates on every path; modal toggle saved; canvas never blocks clicks and sits below modals | Phase 2 (2.14, 2.15), Phase 3 (3.4), Phase 5 (5.4) |
| FR-9 | Continuous effects pause when hidden or off-screen; nothing leaks | Phase 2 (2.5-2.7, 2.10) |
| NFR-1 | No console errors in normal use | Phase 4 (4.3), Phase 2 (2.5), Phase 6 (6.5) |
| NFR-2 | Desktop and mobile; range controls usable by touch and keyboard | Phase 3 (3.10-3.12), Phase 6 (6.5 emulation) |
| NFR-3 | Readable and visible in light and dark themes | Phase 4 (4.7, 4.11), Phase 5 (5.2 check) |
| NFR-4 | [REQUIRED] standards hold for confetti files | Phase 2 (2.7), Phase 5 (5.1-5.5) |
| NFR-5 | Existing suite stays green | Every phase's Phase Testing; Phase 6 (6.1-6.4, 6.10) |
| NFR-6 | Two animating panes stay smooth at the 150-particle cap | Phase 6 (6.6) |

Testing strategy (from the PLAN-DRAFT): unit and integration tests with Vitest + happy-dom plus a live Obsidian CLI pass; the full suite runs after each phase and each phase adds tests for what it fixes; moderate coverage on changed code, a round-trip test for every preset, no vacuous tests.

Out of scope: new presets or features beyond the 53 findings; banner rendering outside what confetti needs (the unrelated uncommitted `bannerManager.js` / `domManager.js` / settings-tab work is committed or stashed before Phase 1); real-device mobile testing (emulation only).

Assumptions: `pixel-banner-example` is the only vault for live checks; Obsidian 1.14.4 with the CLI is available; `useWorker: false` performance is acceptable at the 150-particle cap (verified in Task 6.6, fallback noted); mobile is verified by emulation only.

## Quick Reference

### Key Files

| File | Role in this work |
|---|---|
| `src/utils/confettiConfig.js` | New codec (Phase 1) |
| `src/utils/confettiUtils.js` | Wrappers over the codec; `parseEmojiString` (Phases 1, 4) |
| `src/core/confettiManager.js` | `ConfettiEffect`, registry, `buildOptions`, `fireBurst` (Phases 2, 4) |
| `src/core/confettiPresets.js` | Preset data, `getPreset`, `getPresetCopy` (Phases 1, 4) |
| `src/core/confettiShapes.js` | SVG path shapes (Phase 5 log cleanup) |
| `src/core/eventHandler.js` | `handleConfettiForNote`, `handleConfettiCleanup`, `handleConfettiMetadataChange`, `handleLayoutChange` (Phase 2) |
| `src/core/pixelBannerPlugin.js` | `lastFrontmatter`, metadata `changed` / `resolved` handlers, `onload`, `onunload` (Phase 2) |
| `src/core/settings.js` | `saveSettings` refresh of running effects (Phase 2) |
| `src/modal/modals/confettiModal.js` | Modal draft, controls, preview, Apply (Phases 2, 3, 5) |
| `src/modal/modals/targetPositionModal.js` | 🎊 entry section and its status label (Phases 3, 5) |
| `src/settings/tabs/settingsTabCustomFieldNames.js` | Custom field reset (Phase 5) |
| `styles.css` | Confetti canvas and modal styles (Phase 5) |
| `tests/unit/utils/confettiUtils.test.js`, `tests/unit/core/confettiManager.test.js`, `tests/unit/core/confettiPresets.test.js`, `tests/unit/modal/confettiModal.test.js`, `tests/integration/confettiWorkflow.test.js` | Existing confetti tests |
| `.vault/pixel-banner-example/Confetti/*.md` | Fixture notes, one per preset plus `Custom Overrides.md` and `No Confetti.md` |
| `OBSIDIAN_DEVELOPMENT_STANDARDS.md` | [REQUIRED] items (NFR-4) |
| `.agents-docs/AGENTS-live-ui-testing.md` | Obsidian CLI loop (plugin id `pexels-banner`, `vault=pixel-banner-example`) |

### Environment Variables

None.

### External Dependencies

- `canvas-confetti` 1.9.4 (already installed; no new dependencies)
- Obsidian 1.14.4 with the CLI enabled, for live checks

### Commands

- `npx vitest run`: full suite (904 tests at the start)
- `npx vitest run <file>`: one file
- `npm run test-build`: build and copy into the test vault

## Completion Summary

_Filled during finalization._

<!-- METRICS_JSON {"step": "document", "total_tasks": 73, "tasks_per_phase": [12, 16, 14, 11, 10, 10], "phase_count": 6, "parallel_groups_identified": 1, "verification_items_added": 4} -->
