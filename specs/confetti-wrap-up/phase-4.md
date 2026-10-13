# Phase 4: Preset looks

**Status:** Not Started

**Estimated Tasks:** 11

## Overview

Make every preset visible and recognisable in light and dark themes. Fix how `buildOptions()` and `fireBurst()` in `src/core/confettiManager.js` choose shapes, colours and per-burst randomisation, validate colours before they reach canvas-confetti, retune the preset data in `src/core/confettiPresets.js`, and split emoji with `Intl.Segmenter`.

Findings closed here: F7 (render side), F9, F14, F15, F16, F17, F29, F52.

## Prerequisites

- Phase 2 complete: effects render on the main thread through `ConfettiEffect`, so preset changes can be judged live.
- Read Appendix A findings F7, F9, F14, F15, F16, F17, F29, F52.
- Can run in parallel with Phase 3 (Group A): do not edit `confettiModal.js` or `targetPositionModal.js` here.

## Tasks

### Shapes and colours in buildOptions

- [ ] **Task 4.1:** Reorder shape selection in `buildOptions()`: when the user's config has a non-empty `emoji`, build emoji shapes with `createEmojiShapes()` and skip `customShapes`; otherwise use `customShapes`, then `shapes`. Track whether emoji shapes were actually applied (`usedEmojiShapes`) and gate colours on that flag instead of on `!config.emoji`, so custom-shape presets (rain, aliens, crystals, snowflakes, leaves) keep their colours. (F7)
- [ ] **Task 4.2:** Add `emoji: null` to every preset in `CONFETTI_PRESETS` that lacks the key (`snowflakes`, `leaves`) and make `getPresetCopy()` copy `emoji`, so `diffFromPreset` always sees the key and a user emoji on those presets is written and rendered. (F7)
- [ ] **Task 4.3:** Add `sanitizeHexColors(colors)` (in `confettiConfig.js` beside the schema, exported) that accepts `#rgb`, `#rrggbb` and `#rrggbbaa`, expands `#rgb` to `#rrggbb`, strips alpha, lowercases, and drops anything else. Call it in `buildOptions()` before passing `colors` to canvas-confetti, falling back to the preset's colours (then to canvas-confetti's defaults) when nothing valid remains. Also use it in `normalize()` for the `colors` key. (F9)

### Burst randomisation

- [ ] **Task 4.4:** Extract the per-burst range randomisation (`sizeRange` to `scalar`, `speedRange` to `startVelocity`, `gravityRange` to `gravity`, `driftRange` to `drift`) duplicated in the `edge` and `random` branches of `fireBurst()` into a helper `applyRanges(options, config)`, and call it in all three branches including the `fixed` branch, so the `confetti` preset (`originSpread: 'fixed'`) honours the four ranges. (F14)
- [ ] **Task 4.5:** In every `fireBurst()` branch, pick a single random emoji shape per burst only when the burst's `particleCount <= 3`; otherwise pass the full emoji shape list so multi-emoji presets (hearts, pop rocks) show their mix. (F29)

### Preset data

- [ ] **Task 4.6:** Define all four ranges (`sizeRange`, `speedRange`, `gravityRange`, `driftRange`) on every preset in `CONFETTI_PRESETS`, choosing values that reproduce today's look where it already works, and update `getPresetCopy()` to copy them (no keys set to `undefined`). Add a test-visible invariant: every preset has every schema-required key. (F2 support, F29)
- [ ] **Task 4.7:** Retune presets that read wrong: `bubbles` gets `shapes: ['circle']`, `flat: true` and slightly stronger colours or opacity; `snow`, `space` and `aliens` palettes gain mid-tone colours visible on light themes (for example `#b8cde0`, `#9fb3c8`) alongside white; `rain_light` gets a higher count per burst, larger `sizeRange`, a more saturated colour and `flat: true`; `rain_heavy` gets a higher count and a taller, thinner raindrop look (adjust its `sizeRange` and, if needed, the `raindrop` path in `src/core/confettiShapes.js`). (F15, F16, F17)
- [ ] **Task 4.8:** Retune the rest per F29: `hearts` `gravityRange` about `[-0.6, -0.3]` with a symmetric `driftRange` so they rise; `sparkles` and `pop_rocks` `sizeRange` about `[1.2, 2.2]` and `spread: 360` (replace the invalid `1000`); `snow` `flat: true`, `sizeRange` about `[0.3, 0.8]` and a longer `duration`. Keep every value inside the schema bounds from Phase 1. (F29)

### Emoji splitting

- [ ] **Task 4.9:** Rewrite `parseEmojiString()` in `src/utils/confettiUtils.js` to use `new Intl.Segmenter(undefined, { granularity: 'grapheme' })` when `typeof Intl !== 'undefined' && Intl.Segmenter` exists, keeping only segments that contain an emoji (`/\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u`) or the ©/®/™ symbols; keep the current loop as the fallback branch. (F52)

### Tests and sign-off

- [ ] **Task 4.10:** Add tests: in `tests/unit/core/confettiPresets.test.js`, every preset defines all four ranges and `emoji`, every numeric value is within the schema bounds, `bubbles` is circle and flat, `hearts` gravity is negative, no `spread` exceeds 360; in `tests/unit/core/confettiManager.test.js`, emoji outranks `customShapes` and colours survive on custom-shape presets, invalid hex colours are dropped with a preset fallback, the `fixed` branch applies the ranges (stub `Math.random`), multi-emoji bursts keep the full list; in `tests/unit/utils/confettiUtils.test.js`, `parseEmojiString` keeps adjacent flags separate (`🇺🇸🇬🇧` gives two), keeps keycaps (`1️⃣`), `©️`, ZWJ families and tag-sequence flags as single graphemes.
- [ ] **Task 4.11:** Take light-theme and dark-theme screenshots of every preset in the test vault (one fixture note per preset under `.vault/pixel-banner-example/Confetti/`) using the Obsidian CLI loop in `.agents-docs/AGENTS-live-ui-testing.md`; store them in the scratch area (not the repo) and list in this phase's completion summary any preset still hard to see, for sign-off.

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

_Filled after implementation: date, implementer, what was done, files changed, issues._
