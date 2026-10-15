# Phase 1: Config codec and frontmatter round-trip

**Status:** Complete

**Estimated Tasks:** 12

## Overview

Create one schema-driven codec, `src/utils/confettiConfig.js`, that owns parsing, sanitizing, comparing and writing the `banner-confetti` value. Today the pipe split in `parseConfettiValue()` returns strings, `sanitizeConfig()` lets strings and Infinity through, and `buildConfettiFrontmatter()` writes `null` and unspaced pairs; together these cause the critical F1 and most medium parsing bugs. After this phase every read returns real numbers and arrays, and every write round-trips.

Findings closed here: F1 (parse side), F5, F8 (write and parse side), F10, F26, F34, F38 (codec side), F39, F40.

## Prerequisites

- The unrelated uncommitted work on `develop` (`src/core/bannerManager.js`, `src/core/domManager.js`, the settings tabs, docs) is committed or stashed, so confetti edits land in clean diffs. Confirm with `git status`. VERIFIED: committed as `a4a8c70`, `git status` clean.
- `npx vitest run` is green before starting (904 tests). VERIFIED: 31 files, 904 passed.
- Read Appendix A findings F1, F5, F8, F10, F26, F34, F38, F39, F40 in `PLAN-DRAFT-20261013.md`. VERIFIED.
- Read the AGENTS.md failure-log rule on mixed line endings; check `git diff --stat --ignore-all-space` after editing any file. VERIFIED.

## Tasks

### Schema

- [x] **Task 1.1:** Create `src/utils/confettiConfig.js` and define an exported `CONFETTI_SCHEMA` object keyed by every override key the plugin understands today (collect them from `CONFETTI_RANGES` and `CONFETTI_RANGE_ARRAYS` in `confettiUtils.js`, the preset objects in `confettiPresets.js`, and the keys the modal writes in `getOverridesFromDefaults()`). Each entry declares `type` (`number`, `integer`, `boolean`, `range`, `colors`, `enum`, `string`, `emoji`, `shapeList`), and where relevant `min`, `max`, `step` (the modal control step, used for rounding) and `values` (for enums such as shape and wobble). Range entries (`sizeRange`, `speedRange`, `gravityRange`, `driftRange`) declare per-element `min`/`max`. Export a `RANGE_KEYS` list and an `ARRAY_KEYS` list (`colors`, `shapes`, `customShapes` plus the range keys). (F1, F5, F10)
- [x] **Task 1.2:** Add a `resolvePresetName(name)` helper in `confettiConfig.js`: trim, lowercase, then look the name up with `Object.prototype.hasOwnProperty.call(CONFETTI_PRESETS, key)`; return the canonical key or `null`. Update `getPreset()` and `getPresetCopy()` in `src/core/confettiPresets.js` to use an own-property check so `toString`, `constructor` and `__proto__` return `null`, and update `isValidPreset()` in `confettiUtils.js` to go through `resolvePresetName`. (F26, F34)

### Parse

- [x] **Task 1.3:** Implement `parseValue(key, raw)` in `confettiConfig.js`, driven by `CONFETTI_SCHEMA[key]`: `'null'`, `''` and `undefined` return `undefined` (key cleared); numbers coerce with `Number()` and must be finite; booleans accept `true`/`false` strings; `range` splits on `|` and keeps the pair only when both halves are finite numbers; `colors`, `shapes` and `customShapes` always return an array, even for a single value with no `|` (so `colors: #fff` becomes `['#fff']`); enums keep only listed values; unknown keys are kept as trimmed strings so nothing the user wrote is lost silently. (F1, F5, F8)
- [x] **Task 1.4:** Implement `parse(value)` in `confettiConfig.js` returning `{ presetName, overrides } | null`. Accept: the string form with `,` plus optional whitespace between pairs and `:` with or without spaces inside a pair (`type:snow,count:5` and `type: snow, count: 5` both parse); a leading bare preset (`snow, count: 5`); unquoted YAML objects as Obsidian delivers them; the legacy array form `['preset', {overrides}]`. Split pairs only before a known schema key followed by `:` so emoji text containing commas survives. Resolve the preset through `resolvePresetName`; return `null` for an unknown preset or junk (`42`, `''`, `'type:'`). Run every value through `parseValue`. (F1, F26, F34)

### Normalize and compare

- [x] **Task 1.5:** Implement `normalize(config)` in `confettiConfig.js`: for each key apply the schema bounds; map `Infinity` to `max` and `-Infinity` to `min`; replace `NaN` or non-numeric values with `undefined` so the preset default applies; clamp each half of a range and swap if `min > max`; drop invalid hex colours here only if a colour validator exists yet (Phase 4 adds full validation in `buildOptions`). Never throw on any input. (F1, F10)
- [x] **Task 1.6:** Implement `diffFromPreset(presetName, config)` in `confettiConfig.js`: compare each key of a normalized config against `getPresetCopy(presetName)` and return only keys whose value really differs (arrays compared element-wise, numbers compared after rounding to the schema step). Keys absent from the preset compare against `undefined`. This is the function the modal will call in Phase 3 so an untouched preset writes `type: <preset>` only. (F2 groundwork, F38)

### Serialize and write

- [x] **Task 1.7:** Implement `serialize(presetName, overrides)` in `confettiConfig.js`: return `null` when there is no valid preset; write `type: <preset>` first, then each override as `key: value` joined by `, `; join arrays with `|`; round numbers to the decimals of the schema `step` (for example `Number(v.toFixed(decimals))`); skip `null`, `undefined` and empty arrays (never write the literal `null`); strip commas and surrounding whitespace from emoji values. The output must re-parse to the same `{ presetName, overrides }`. (F8, F38, F40)
- [x] **Task 1.8:** Add `writeConfettiField(frontmatter, settings, value)` in `confettiConfig.js` for use inside a `processFrontMatter` callback: resolve the field aliases from `settings.customBannerConfettiField`, write `value` to the alias already present in the note (or alias `[0]` when none is present), and delete every other alias so exactly one property remains. When `value` is `null`, delete all aliases. (F39)

### Wire up existing API

- [x] **Task 1.9:** Rewrite the exports of `src/utils/confettiUtils.js` as thin wrappers: `parseConfettiConfig` calls `parse`, `buildConfettiFrontmatter` calls `serialize`, `sanitizeConfig` calls `normalize`, `hasOverrides` uses `diffFromPreset(...)` having any key. Remove the private `parseConfettiValue()`, `CONFETTI_RANGES` and `CONFETTI_RANGE_ARRAYS` once nothing references them (move any bounds still needed into the schema). Keep `parseEmojiString`, `getPresetNames`, `getPresetDefaults`, `getFullConfig` and `isValidPreset` exported with the same signatures.
- [x] **Task 1.10:** Switch the modal's frontmatter write in `applySettings()` and `removeConfettiFromFrontmatter()` (`src/modal/modals/confettiModal.js`) to `writeConfettiField`, so Apply replaces the existing alias instead of adding alias `[0]` beside it, and None removes every alias. Leave the rest of the modal for Phase 3. (F39)

### Tests

- [x] **Task 1.11:** Create `tests/unit/utils/confettiConfig.test.js` with golden parse tests: read each `.vault/pixel-banner-example/Confetti/*.md` fixture's confetti value and assert `parse` returns the expected preset and typed overrides; cover spaced, unspaced, capitalised (`type:Snow`), bare-preset, unquoted YAML object and legacy array forms; cover `toString`, `__proto__`, `42`, `''`, `'type:'`, `'type:bogus'` returning `null` without throwing; cover `count: Infinity`, `count: abc`, `sizeRange: 1|abc`, `colors: #fff` (one-item array), `emoji: null`.
- [x] **Task 1.12:** In the same file add round-trip tests: for every preset in `CONFETTI_PRESETS`, build overrides that exercise each schema type (number, integer, boolean, range, colors, enum, emoji with a comma), then assert `parse(serialize(preset, o))` deep-equals the normalized input, the output uses `: ` and `, `, contains no `null`, and floats carry no binary noise (`0.30000000000000004` never appears). Add a `writeConfettiField` test showing a note with an existing alias keeps one property after write and none after `null`. Update any `confettiUtils.test.js` expectations that encoded the old unspaced output.

## Phase Testing

- Run `npx vitest run`; the full suite must be green, including the new `confettiConfig.test.js`.
- Run `npm run test-build`, reload the plugin (`pexels-banner`, `vault=pixel-banner-example`) and open two fixture notes to confirm effects still start; `dev:errors` shows no confetti errors.

## Acceptance Criteria

- `parse` returns finite numbers for every numeric and range key and arrays for every array key, for all fixtures and all accepted formats
- Unknown, prototype-named and junk presets return `null` without throwing
- `serialize` output re-parses to the same config for every preset, uses spaced separators, and never contains `null` or float noise
- Apply writes exactly one confetti property, in the alias the note already used
- `confettiUtils.js` keeps its exported API; existing callers compile and the suite is green

## Notes

- Keep parse a superset of today's grammar (risk: codec changes how existing notes parse). If a fixture parses differently than before, the golden test should show why before the expectation is changed.
- The modal still seeds `[v, v]` ranges in this phase; that is fixed in Phase 3 (F2). The modal's own `toFixed` on strings (F1 modal side) is also Phase 3.
- `confettiConfig.js` is a new file: add it to `inventory.md` in Phase 5 (or now, if convenient).

## Phase Completion Summary

- **Date:** 2026-10-13
- **Implementer:** Claude (Implement + Review)
- **What was done:** New `src/utils/confettiConfig.js` codec: `CONFETTI_SCHEMA` (25 keys), `RANGE_KEYS`, `ARRAY_KEYS`, `resolvePresetName`, `parseValue`, `parse`, `normalize`, `roundForKey`, `diffFromPreset`, `serialize`, `writeConfettiField`. `getPreset` / `getPresetCopy` are own-property safe. `confettiUtils.js` exports are thin wrappers (old `parseConfettiValue`, `CONFETTI_RANGES`, `CONFETTI_RANGE_ARRAYS`, `clampNumber` removed). The modal's Apply and None write through `writeConfettiField`.
- **Files created:** `src/utils/confettiConfig.js`, `tests/unit/utils/confettiConfig.test.js`
- **Files modified:** `src/core/confettiPresets.js`, `src/utils/confettiUtils.js`, `src/modal/modals/confettiModal.js`, `tests/unit/utils/confettiUtils.test.js`, `tests/integration/confettiWorkflow.test.js`, `tests/unit/modal/confettiModal.test.js` (review fix), `inventory.md` (review fix)
- **Tests:** `npx vitest run`: 32 files, 998 passed (904 before + 91 codec tests + 3 modal write tests from the review). Live: `npm run test-build`, plugin reloaded, `Confetti/Custom Overrides.md` and `Confetti/Snowflakes.md` opened, one confetti canvas present, `dev:errors` empty.

**Spec notes**

- SPEC NOTE: Pairs split at a comma followed by any identifier-shaped `key:`, not only schema keys, so unknown keys are kept (Task 1.3) while emoji and colour text containing commas still survive.
- SPEC NOTE: `parse` runs its overrides through `normalize`, so hand-written values are clamped on read (`count: 200` reads as 150). Two old tests that used `count: 200` now use 120.
- SPEC NOTE: Numbers round to the step's decimals with a floor of 2, so preset values such as `size: 0.85` and `gravityRange: -0.05|0.05` survive; `normalize` uses the same rounding so `parse(serialize(x))` equals `normalize(x)` exactly.
- SPEC NOTE: Booleans a preset does not define compare against a schema `default` (`flat: false`, `respectReducedMotion: true`), so an untouched toggle is not an override.
- SPEC NOTE: Commas are stripped from emoji in `parseValue` (not only on write), so parse, normalize and serialize agree.
- SPEC NOTE: `diffFromPreset` normalizes the preset side too: sparkles and pop_rocks define `spread: 1000`, which the renderer already clamps to 360.
- SPEC NOTE: `customShapes` has no `values` list; the shape names live in `confettiShapes.js`, which imports canvas-confetti.
- SPEC NOTE: The vault fixtures are not tracked in git, so the golden values live in the test and are checked against the files whenever the vault is present. `Bubbles.md` holds `type:snow`, not `type:bubbles`: worth fixing in the fixture (Phase 6).
- `inventory.md` was updated in this phase after the review found its `confettiUtils.js` entry listing removed code.
- Live screenshots were not captured (`dev:screenshot` wrote no file); canvas presence and `dev:errors` were checked instead.

- **Review:** focused review of the 8-file change set found 0 Critical, 1 Warning (inventory.md out of date), 1 Suggestion (modal write path untested); both fixed.

**Issues:** None blocking.
