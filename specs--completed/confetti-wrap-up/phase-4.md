# Phase 4: Preset looks

**Status:** Complete

**Estimated Tasks:** 11

## Overview

Make every preset visible and recognisable in light and dark themes. Fix how `buildOptions()` and `fireBurst()` in `src/core/confettiManager.js` choose shapes, colours and per-burst randomisation, validate colours before they reach canvas-confetti, retune the preset data in `src/core/confettiPresets.js`, and split emoji with `Intl.Segmenter`.

Findings closed here: F7 (render side), F9, F14, F15, F16, F17, F29, F52.

## Prerequisites

- Phase 2 complete: effects render on the main thread through `ConfettiEffect`, so preset changes can be judged live. VERIFIED (overview marks Phase 2 `[x]`, 16 of 16 tasks).
- Read Appendix A findings F7, F9, F14, F15, F16, F17, F29, F52. VERIFIED (read in PLAN-DRAFT-20261013.md).
- Can run in parallel with Phase 3 (Group A): do not edit `confettiModal.js` or `targetPositionModal.js` here. VERIFIED (Phase 3 is already complete; neither file is in this phase's change set).

## Tasks

### Shapes and colours in buildOptions

- [x] **Task 4.1:** Reorder shape selection in `buildOptions()`: when the user's config has a non-empty `emoji`, build emoji shapes with `createEmojiShapes()` and skip `customShapes`; otherwise use `customShapes`, then `shapes`. Track whether emoji shapes were actually applied (`usedEmojiShapes`) and gate colours on that flag instead of on `!config.emoji`, so custom-shape presets (rain, aliens, crystals, snowflakes, leaves) keep their colours. (F7)
- [x] **Task 4.2:** Add `emoji: null` to every preset in `CONFETTI_PRESETS` that lacks the key (`snowflakes`, `leaves`) and make `getPresetCopy()` copy `emoji`, so `diffFromPreset` always sees the key and a user emoji on those presets is written and rendered. (F7)
- [x] **Task 4.3:** Add `sanitizeHexColors(colors)` (in `confettiConfig.js` beside the schema, exported) that accepts `#rgb`, `#rrggbb` and `#rrggbbaa`, expands `#rgb` to `#rrggbb`, strips alpha, lowercases, and drops anything else. Call it in `buildOptions()` before passing `colors` to canvas-confetti, falling back to the preset's colours (then to canvas-confetti's defaults) when nothing valid remains. Also use it in `normalize()` for the `colors` key. (F9)

### Burst randomisation

- [x] **Task 4.4:** Extract the per-burst range randomisation (`sizeRange` to `scalar`, `speedRange` to `startVelocity`, `gravityRange` to `gravity`, `driftRange` to `drift`) duplicated in the `edge` and `random` branches of `fireBurst()` into a helper `applyRanges(options, config)`, and call it in all three branches including the `fixed` branch, so the `confetti` preset (`originSpread: 'fixed'`) honours the four ranges. (F14)
- [x] **Task 4.5:** In every `fireBurst()` branch, pick a single random emoji shape per burst only when the burst's `particleCount <= 3`; otherwise pass the full emoji shape list so multi-emoji presets (hearts, pop rocks) show their mix. (F29)

### Preset data

- [x] **Task 4.6:** Define all four ranges (`sizeRange`, `speedRange`, `gravityRange`, `driftRange`) on every preset in `CONFETTI_PRESETS`, choosing values that reproduce today's look where it already works, and update `getPresetCopy()` to copy them (no keys set to `undefined`). Add a test-visible invariant: every preset has every schema-required key. (F2 support, F29)
- [x] **Task 4.7:** Retune presets that read wrong: `bubbles` gets `shapes: ['circle']`, `flat: true` and slightly stronger colours or opacity; `snow`, `space` and `aliens` palettes gain mid-tone colours visible on light themes (for example `#b8cde0`, `#9fb3c8`) alongside white; `rain_light` gets a higher count per burst, larger `sizeRange`, a more saturated colour and `flat: true`; `rain_heavy` gets a higher count and a taller, thinner raindrop look (adjust its `sizeRange` and, if needed, the `raindrop` path in `src/core/confettiShapes.js`). (F15, F16, F17)
- [x] **Task 4.8:** Retune the rest per F29: `hearts` `gravityRange` about `[-0.6, -0.3]` with a symmetric `driftRange` so they rise; `sparkles` and `pop_rocks` `sizeRange` about `[1.2, 2.2]` and `spread: 360` (replace the invalid `1000`); `snow` `flat: true`, `sizeRange` about `[0.3, 0.8]` and a longer `duration`. Keep every value inside the schema bounds from Phase 1. (F29)

### Emoji splitting

- [x] **Task 4.9:** Rewrite `parseEmojiString()` in `src/utils/confettiUtils.js` to use `new Intl.Segmenter(undefined, { granularity: 'grapheme' })` when `typeof Intl !== 'undefined' && Intl.Segmenter` exists, keeping only segments that contain an emoji (`/\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u`) or the ©/®/™ symbols; keep the current loop as the fallback branch. (F52)

### Tests and sign-off

- [x] **Task 4.10:** Add tests: in `tests/unit/core/confettiPresets.test.js`, every preset defines all four ranges and `emoji`, every numeric value is within the schema bounds, `bubbles` is circle and flat, `hearts` gravity is negative, no `spread` exceeds 360; in `tests/unit/core/confettiManager.test.js`, emoji outranks `customShapes` and colours survive on custom-shape presets, invalid hex colours are dropped with a preset fallback, the `fixed` branch applies the ranges (stub `Math.random`), multi-emoji bursts keep the full list; in `tests/unit/utils/confettiUtils.test.js`, `parseEmojiString` keeps adjacent flags separate (`🇺🇸🇬🇧` gives two), keeps keycaps (`1️⃣`), `©️`, ZWJ families and tag-sequence flags as single graphemes.
- [x] **Task 4.11:** Take light-theme and dark-theme screenshots of every preset in the test vault (one fixture note per preset under `.vault/pixel-banner-example/Confetti/`) using the Obsidian CLI loop in `.agents-docs/AGENTS-live-ui-testing.md`; store them in the scratch area (not the repo) and list in this phase's completion summary any preset still hard to see, for sign-off.

## Phase Testing

- Run `npx vitest run`; the full suite must be green with the Task 4.10 tests.
- Task 4.11 screenshots are the live check for this phase.

## Acceptance Criteria

- A user emoji renders on every preset, and custom-shape presets keep their colours
- No invalid colour reaches canvas-confetti; no worker or canvas errors from colours
- Size, speed, gravity and drift ranges change the `confetti` preset
- Every preset defines all four ranges and `emoji`, with values in bounds
- Bubbles are round, rain is visible, hearts rise, sparkles and pop rocks are a sensible size, snow looks like snow; snow, space and aliens are visible on light themes
- Flags, keycaps, ©/®/™ and ZWJ sequences split into correct single emoji

## Notes

- Preset tuning is subjective (risk table); the screenshots are the sign-off evidence. Prefer small, explainable changes over wholesale palette swaps.
- If `confettiShapes.js` changes, keep `clearShapeCache()` behaviour intact.

## Phase Completion Summary

- **Date:** 2026-10-13
- **Implementer:** Claude (Implement + Review), Task 4.9 by a helper agent
- **Status:** In Progress until sign-off (implementation and self-review done)

**What was done**

- `buildOptions()` checks a user emoji first and records `usedEmojiShapes`; custom shapes, then built-in shapes, apply only when emoji shapes were not used, and colours are gated on that flag, so rain, aliens, crystals, snowflakes and leaves keep their colours (F7).
- `sanitizeHexColors()` in `confettiConfig.js` expands `#rgb`, strips alpha from `#rrggbbaa`, lowercases and drops anything else. `normalize()` uses it for `colors`, and `buildOptions()` falls back to the preset colours, then to canvas-confetti's defaults (F9).
- `fireBurst()` calls one `applyRanges()` helper in the edge, random and fixed branches, so the `confetti` preset honours its ranges (F14). `pickBurstEmoji()` picks a single emoji only when the burst has 3 or fewer particles (F29).
- Every preset defines `emoji` and all four ranges (exported `REQUIRED_PRESET_KEYS`); `getPresetCopy()` copies arrays only when present and always carries `emoji`, so no key is `undefined`.
- Retuned: bubbles round and flat with stronger colours and opacity 0.7 (F15); snow, space and aliens gain `#b8cde0` / `#9fb3c8` mid-tones (F16); rain_light count 4, sizeRange [0.6, 1.0], saturated mid blues `#2196f3` / `#64b5f6`, flat; space sizeRange [0.2, 0.6]; rain_heavy count 4, sizeRange [0.6, 1.0]; the `raindrop` path is now a tall, thin 12 x 28 drop (F17); hearts gravityRange [-0.6, -0.3] with driftRange [-0.8, 0.8]; sparkles and pop rocks sizeRange [1.2, 2.2] and spread 360; snow flat, sizeRange [0.3, 0.8], duration 700 (F29).
- A singular `size`, `speed`, `gravity` or `drift` override without its range becomes a `[v, v]` range in `buildOptions()`, so `type: snow, speed: 10` still changes the effect now that every preset defines ranges (review fix 1).
- `parseEmojiString()` splits with `Intl.Segmenter` (grapheme) and keeps the old loop as `parseEmojiStringFallback()` (F52).

**Files changed:** `src/core/confettiManager.js`, `src/core/confettiPresets.js`, `src/core/confettiShapes.js`, `src/utils/confettiConfig.js`, `src/utils/confettiUtils.js`, `tests/unit/core/confettiManager.test.js`, `tests/unit/core/confettiPresets.test.js`, `tests/unit/utils/confettiUtils.test.js`, `tests/unit/utils/confettiConfig.test.js`.

**Tests:** `npx vitest run`: 32 files, 1085 tests, all passing. Four existing expectations changed on purpose: three now expect `#rgb` expanded to `#rrggbb` (`#fff` to `#ffffff`, `#000` to `#000000`), and the snow `diffFromPreset` test uses the new snow palette and size range.

**Live check (Task 4.11):** 28 screenshots (14 presets x dark and light) in `%TEMP%\pbshots\` (outside the repo; Obsidian could not write into the session scratchpad). No errors in `dev:errors`. Snow, rain_heavy, bubbles, hearts, sparkles, pop rocks, confetti, fireworks, crystals, leaves and snowflakes read as intended in both themes.

Still hard to see, for sign-off:

1. **rain_light:** after the review fix (mid blues, count 4) the drops show on the dark theme, but the effect is still sparse.
2. **space:** after the review fix (sizeRange [0.2, 0.6]) the dots show on the light theme, but faintly.
3. **aliens:** faint on the light theme (one shape every 700 ms, pale palette).

**Review (Stage 2):** focused review of this change set found 3 warnings, all fixed: singular overrides ignored once presets defined every range, Rain Light nearly invisible on dark, Space too small on light. Re-verified with tests and fresh screenshots (`fix-*.png`).

**Issue found (outside this phase):** a note opened into a pane already in reading view fires its first burst and then stalls: the interval stops until a `layout-change`, mode switch or similar refresh re-resolves the visibility target. Scrolling does not revive it. Editing-view panes are not affected. This is Phase 2 lifecycle code (`ConfettiEffect.observeVisibility()` / `refreshVisibility()`), so it was not changed here; the screenshots used `app.workspace.trigger('layout-change')` after each open as a workaround. Suggest adding it to Phase 6's live pass or a revise-plan.
