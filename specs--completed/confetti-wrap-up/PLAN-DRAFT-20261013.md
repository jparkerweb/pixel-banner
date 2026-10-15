# Confetti Wrap-Up: Implementation Plan

- **Created:** 2026-10-13
- **Status:** Complete
- **Confidence:** 91% (Requirements 24/25 · Feasibility 23/25 · Integration 22/25 · Risk 22/25)
- **Conversation log:** [PLAN-CONVERSATION-20261013.md](./PLAN-CONVERSATION-20261013.md)
- **Branch:** `develop`

## 1. Executive Summary

The confetti feature on `develop` (v3.7.0) was verified end to end by 5 code reviewers and 4 live testers driving Obsidian, then cross-checked by a synthesizer. The suite is green, but 53 findings were confirmed: 1 critical and 3 high bugs in the frontmatter round-trip and the modal, plus medium/low bugs and improvements. This plan fixes all of them through two structural changes (a single config codec, and per-pane effects rendered on the main thread) plus targeted fixes, so the feature can ship.

## 2. Requirements

### 2.1 Functional

- [ ] **FR-1** Frontmatter `banner-confetti: type: <preset>, key: val, ...` starts the effect; the legacy array form and the unspaced `type:snow,count:5` form still parse; the field name follows `customBannerConfettiField`.
- [ ] **FR-2** All 14 presets render and look like their names in light and dark themes; custom SVG shapes and emoji draw.
- [ ] **FR-3** Hand-edited values clamp (count 1-150, interval 50-10000ms, etc.); junk values never throw and never leave a stray canvas.
- [ ] **FR-4** Effects belong to a pane: start on open, fade out on switch/close, restart on return; visible panes (both sides of a split) run independently; a tab hidden behind another tab pauses and resumes; plugin unload stops all.
- [ ] **FR-5** Adding, changing or removing the field updates the effect live, only in panes showing that file.
- [ ] **FR-6** Modal: opened by the 🎊 button with the note's current config; all controls work after preset switch and Reset; Modified reflects real edits from open; Apply writes only real overrides in string form and starts at once.
- [ ] **FR-7** Live preview updates about 100ms after a change, stays fixed over the modal while it scrolls, and is cleaned up on close.
- [ ] **FR-8** Disable-on-mobile and reduced motion are honoured on every start path (including Apply and live changes); the modal's reduced-motion toggle is saved and respected; the canvas never blocks clicks and sits below modals.
- [ ] **FR-9** Continuous effects pause when the document is hidden, the tab is hidden or the canvas is off-screen; no canvases, observers, timers, listeners or workers leak.

### 2.2 Non-Functional

- [ ] **NFR-1** No console errors during normal use (`dev:errors` empty through a full live pass).
- [ ] **NFR-2** Desktop and mobile Obsidian; range controls usable by touch and keyboard.
- [ ] **NFR-3** Readable and visible in light and dark themes.
- [ ] **NFR-4** The [REQUIRED] items in `OBSIDIAN_DEVELOPMENT_STANDARDS.md` hold for the confetti files (no inline/injected CSS, no `console.log` diagnostics, registered listeners and intervals).
- [ ] **NFR-5** The existing suite (904 tests) stays green.
- [ ] **NFR-6** Two animating panes stay smooth with main-thread rendering at the 150-particle cap. <!-- VERIFICATION: added from the main-thread rendering risk in Phase 4; not in the Phase 1 sign-off -->

### 2.3 Out of Scope

- New presets or new user-facing features beyond the 53 findings.
- Changes to banner rendering outside what confetti needs (the unrelated uncommitted `bannerManager.js` / `domManager.js` / settings-tab work on `develop` is committed or stashed separately before Phase 1).
- Real-device mobile testing (emulation only; noted as a gap).

### 2.4 Testing Strategy

| Aspect | Choice |
|---|---|
| Types | Unit and integration (Vitest + happy-dom), plus a live pass in Obsidian via the CLI |
| Phase testing | Run the full suite after each phase; each phase adds tests for what it fixes |
| Coverage | Moderate on changed code; a round-trip test for every preset; no vacuous tests |

## 3. Tech Stack

| Category | Technology | Version | Justification |
|---|---|---|---|
| Language | JavaScript (ES2018 target) | n/a | Project standard; no TypeScript |
| Bundler | esbuild | ^0.25.12 | Existing build |
| Effects | canvas-confetti | 1.9.4 | Kept; the split bug is in how it is called |
| Rendering mode | canvas-confetti `useWorker: false` | n/a | The library's worker is a module-level singleton bound to one canvas, which causes F4 and part of F43/F44; per-canvas main-thread instances are independent |
| Emoji splitting | `Intl.Segmenter` with regex fallback | built in | Correct graphemes for flags, keycaps, ZWJ (F52) |
| Tests | Vitest + happy-dom | ^3.2.6 | Existing suite |
| Live checks | Obsidian CLI | 1.14.4 | Verified loop in `.agents-docs/AGENTS-live-ui-testing.md` |

## 4. Architecture

### 4.1 Pattern

**Config codec + per-pane effects, with targeted fixes elsewhere.** Rejected alternatives: patching each finding in place (five patches for one root cause; the bug class returns) and rewriting the feature (discards a modal that mostly works; slower to ship). Also rejected: keeping the worker with one instance per pane, because canvas-confetti shares a single worker across `create()` calls.

### 4.2 System Context

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

### 4.3 Components

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

### 4.4 Data Model

Frontmatter value (string form, written by the plugin):

```
banner-confetti: "type: snow, count: 20, sizeRange: 1|3, colors: #ffffff|#c0e0ff, emoji: ❄️"
```

- Keys and values separated by `: ` on write; `:` with or without spaces on read.
- Pairs separated by `, ` on write; `,` with optional whitespace on read, split only before a known `key:` so emoji or text containing commas survive.
- Range pairs `a|b` parse to two finite numbers or are dropped; single colour `#fff` parses to a one-item array; `null`/empty clears the key.
- Legacy array form `['preset', {overrides}]` still parses; never written.

### 4.5 API Design

```
parse(value) -> { presetName, overrides } | null
serialize(presetName, overrides) -> string | null
normalize(config) -> config            // coerce, clamp, drop invalid
diffFromPreset(presetName, config) -> overrides
manager.start(leafId, containerEl, presetName, overrides, { isPreview })
manager.pause(leafId) / resume(leafId) / stop(leafId, fadeMs) / dispose()
```

## 5. Implementation Phases

Findings are numbered as in Appendix A (F1-F53). Each phase ends with the full suite green.

### Phase 1: Config codec and frontmatter round-trip

- **Goal:** One schema-driven codec owns parse, sanitize, compare and write.
- **Dependencies:** Unrelated `develop` work committed or stashed.
- [ ] **Task 1.1:** Create `src/utils/confettiConfig.js` with the field schema (types, bounds, range pairs, hex colours, shape and wobble enums) and `parse` / `serialize` / `normalize` / `diffFromPreset`. (F1, F5, F8, F10)
- [ ] **Task 1.2:** Tolerant parsing: `,` with optional space, `:` with optional spaces, case-insensitive own-property preset lookup, emoji text containing commas. (F26, F34)
- [ ] **Task 1.3:** Write spaced output (`type: snow, count: 20`), round floats to the control step, never write `null`. (F38, F40, F8)
- [ ] **Task 1.4:** Apply writes the configured field and removes existing alias fields so one value remains. (F39)
- [ ] **Task 1.5:** Make `confettiUtils.js` exports thin wrappers over the codec; keep the existing API and tests passing.
- [ ] **Task 1.6:** Tests: golden parse tests over every fixture note and format; serialize/parse round-trip per preset with every override type; junk and Infinity inputs.

### Phase 2: Per-pane effect engine and lifecycle

- **Goal:** Effects keyed by leaf, independent across panes, tied to their lifetime.
- **Dependencies:** Phase 1.
- [ ] **Task 2.1:** Introduce `ConfettiEffect` (canvas, instance with `useWorker: false`, interval, IntersectionObserver, fade) and key the registry by leaf id; preview gets its own id. (F4, F43, F44)
- [ ] **Task 2.2:** Visible panes run; a tab hidden behind another tab pauses and resumes; observe the scroll container so off-screen pausing works. (F4, F41)
- [ ] **Task 2.3:** Event handling per leaf: switching a leaf to another file stops only that leaf; metadata changes touch only leaves showing the file and never steal focus; layout-change reconciliation disposes effects whose leaf closed or changed file. (F11, F35, F45)
- [ ] **Task 2.4:** Startup pass on plugin load/enable for already-open notes; restart when frontmatter is removed and restored; seed state so the first edit does not restart. (F18, F30, F31)
- [ ] **Task 2.5:** Gates on every start path (open, metadata, Apply, preview): disable-on-mobile and reduced motion, re-evaluated when the OS preference or the settings change; honour the saved reduced-motion override. (F6, F25, F46, F47)
- [ ] **Task 2.6:** Fade order: fade the canvas before clearing particles. Resize the pixel buffer on pane resize. Guard against 0x0 canvases. (F21, F48, F49)
- [ ] **Task 2.7:** Register the visibilitychange listener and intervals through the plugin's lifecycle so unload releases them. (F32)
- [ ] **Task 2.8:** Tests: two leaves on one file and two files in a split stay independent; hidden-tab pause/resume; closing the last tab disposes; gates on all paths; listener count stable across reloads.

### Phase 3: Modal correctness and access

- **Goal:** The modal edits exactly what it shows and writes only real changes.
- **Dependencies:** Phase 1 (codec), Phase 2 (preview id).
- [ ] **Task 3.1:** Draft state: keep seeded `[v, v]` ranges UI-only; write `diffFromPreset` so an untouched preset writes `type: <preset>`. (F2)
- [ ] **Task 3.2:** Reseed range controls on preset switch and Reset; guard handlers with `Array.isArray`; restore Shape and 3D Wobble widths after None. (F3, F36)
- [ ] **Task 3.3:** Modified indicator correct on open; unknown preset shows a clear state and the entry button does not claim Active. (F23, F24)
- [ ] **Task 3.4:** Save the reduced-motion toggle and the emoji for every preset type. (F6, F7)
- [ ] **Task 3.5:** Mount the preview on a fixed layer over the modal so it does not scroll away. (F12)
- [ ] **Task 3.6:** Colour picker: position the hidden inputs on their swatch; keyboard and touch access to add/remove; Burst Interval truly disabled when not continuous. (F13, F50)
- [ ] **Task 3.7:** Range sliders: wider tracks, non-overlapping thumbs, pointer events for touch, keyboard and ARIA. (F19, F20)
- [ ] **Task 3.8:** Number boxes snap back to the stored value on out-of-range input; Apply with no active file keeps the modal open with a notice. (F22, F51)
- [ ] **Task 3.9:** Tests: open → Apply untouched writes only the type; preset switch then drag does not throw; reopen after Apply shows the same values.

### Phase 4: Preset looks

- **Goal:** Every preset is visible and looks like its name.
- **Dependencies:** Phase 2.
- [ ] **Task 4.1:** Emoji outranks custom shapes when the user sets emoji; keep preset colours on custom-shape presets. (F7)
- [ ] **Task 4.2:** Validate hex colours before they reach canvas-confetti. (F9)
- [ ] **Task 4.3:** Make the `confetti` preset honour size/speed/gravity/drift ranges in its fixed-origin branch. (F14)
- [ ] **Task 4.4:** Round bubbles; light-theme-visible colours for snow, space and aliens; stronger Rain Light and Rain Heavy; hearts rise; sensible snow, sparkles and pop rocks sizes and spreads. Define all four ranges on every preset. (F15, F16, F17, F29)
- [ ] **Task 4.5:** Emoji splitting via `Intl.Segmenter` with the regex as fallback. (F52)
- [ ] **Task 4.6:** Tests per preset (fields complete, values in range); light and dark screenshots for sign-off.

### Phase 5: Obsidian standards, styles and docs

- **Goal:** Confetti files meet the [REQUIRED] standards; docs and fixtures are accurate.
- **Dependencies:** Phases 2-4.
- [ ] **Task 5.1:** Move inline and injected styles into `styles.css` with CSS classes (including the permanent `position: relative` on `.view-content`); remove `console.log` diagnostics. (F33)
- [ ] **Task 5.2:** Custom field reset clears the `is-invalid` state and tooltip. (F37)
- [ ] **Task 5.3:** Correct the z-index comment in `styles.css`. (F53)
- [ ] **Task 5.4:** Word UPDATE.md's preset list with the real names (`rain_light`, `rain_heavy`). (F27)
- [ ] **Task 5.5:** Fix the `Confetti/Bubbles.md` fixture to use `type: bubbles`. (F28)
- [ ] **Task 5.6:** Update CHANGELOG.md, UPDATE.md, README and `inventory.md`.

### Phase 6: Test hardening and live verification

- **Goal:** Tests that would have caught these bugs, and a clean live pass.
- **Dependencies:** Phases 1-5.
- [ ] **Task 6.1:** Fix the false-positive and vacuous tests in `confettiWorkflow.test.js`; cover the mobile, reduced-motion and plugin metadata gates. (F42)
- [ ] **Task 6.2:** End-to-end tests: modal Apply → frontmatter → reload → effect options numeric, for every preset.
- [ ] **Task 6.3:** Live pass via the Obsidian CLI: splits, tabs, background pause, light and dark, mobile emulation, reduced motion, rapid switching, `dev:errors` empty; record results in this spec.
- [ ] **Task 6.4:** Two-pane frame-time check for main-thread rendering (NFR-6).

## 6. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Main-thread rendering costs frame time with two panes animating | Medium | Medium | 150-particle cap, pause when hidden/off-screen, measure in Task 6.4; worker fallback for a single pane if needed |
| Codec changes how existing notes parse | Low | High | Parse is a superset of today's grammar; golden tests over all fixtures (Task 1.6) |
| Per-leaf keying misses an Obsidian event (close, rename, mode switch) | Medium | Medium | Layout-change reconciliation as a safety net (Task 2.3) |
| Preset retuning is subjective | Medium | Low | Light/dark screenshots for sign-off (Task 4.6) |
| Unrelated uncommitted work on `develop` collides with these edits | Medium | Medium | Commit or stash before Phase 1 |
| Mixed line endings produce whole-file diffs | Medium | Low | AGENTS.md failure-log rule: byte-preserving edits, check `--ignore-all-space` |

## 7. Success Criteria

- [ ] All 53 findings fixed (F45 and F49 as guards with tests) and ticked off in the phase files
- [ ] Apply, switch away, return and reopen the modal shows the same look and the same controls for every preset
- [ ] Both sides of a split animate independently; a background tab pauses and resumes
- [ ] An untouched preset writes `type: <preset>` only
- [ ] `dev:errors` empty through a full live pass
- [ ] All presets visible in light and dark themes
- [ ] Full suite green with new tests per phase; no vacuous confetti tests
- [ ] [REQUIRED] standards items hold for the confetti files
- [ ] UPDATE.md, CHANGELOG.md, README and inventory.md updated

## 9. Assumptions

- The test vault `pixel-banner-example` is the only vault used for live checks.
- Obsidian 1.14.4 with the CLI enabled is available during implementation.
- `useWorker: false` performance is acceptable at the 150-particle cap (verified in Task 6.4; fallback noted).
- Mobile behaviour is verified by emulation only.

## Appendix A: Findings (from the verification run, 2026-10-13)

Raw results: 10 agents (5 code reviewers, 4 live testers, 1 synthesizer), 574 tool calls. Code-only claims were verified against the code or dropped.

### Critical (1)

**F1. Range values written by the modal reload as strings: effects break after reload and the modal crashes on reopen** *(bug, confirmed, FR-1, FR-3, FR-6, NFR-1)*

- Where: src/utils/confettiUtils.js:14-16 (parseConfettiValue pipe split, no Number()), :352-355 (clampNumber passes strings through); src/core/confettiManager.js:325-342, 373-391 (min + Math.random()*(max-min)); src/modal/modals/confettiModal.js:512/531 (toFixed on string)
- What happens: Right after Apply the effect looks fine, because triggerConfettiOnNote passes in-memory numbers. After any note switch or restart, particles go invisible (NaN) or oversized, or move about 10x too fast, and the Edit modal crashes on that note.
- Fix: In parseConfettiValue, map each '|' piece through the same boolean/number coercion. In sanitizeConfig, coerce numeric strings, and drop any *Range that is not two finite numbers. Wrap values in Number() before toFixed in the modal. Add a round-trip test: build, parse, buildOptions, fireBurst, then assert a numeric scalar, gravity and startVelocity.

### High (3)

**F2. Opening Edit and pressing Apply with no changes writes seeded range keys (speedRange:0|0, etc.), which feed the string-range bug** *(bug, confirmed, FR-6)*

- Where: src/modal/modals/confettiModal.js:488-500 (createRangeSlider seeds [v,v] into this.settings), 859-899 (getOverridesFromDefaults); src/core/confettiPresets.js:333-342 (getPresetCopy sets missing ranges to own key = undefined)
- What happens: Frontmatter clutter, a wrong Modified state, a changed look, and (with the parse bug) broken effects after a plain Open then Apply.
- Fix: Keep the derived [scalar,scalar] ranges in a UI-only map, or record them as baseline defaults and compare against them in getOverridesFromDefaults. Alternatively, define all four ranges on every preset so the seeded values equal the defaults.

**F3. After switching preset in the dropdown or pressing Reset, range sliders show stale values and throw a TypeError on every edit or drag** *(bug, confirmed, FR-6, NFR-1)*

- Where: src/modal/modals/confettiModal.js:154-161 and 902-911 (this.settings = {...defaults}), 700-716 (updateAllControls skips undefined), 576-621 (handlers index this.settings[key][0|1])
- What happens: The controls show wrong values, every interaction throws an uncaught TypeError, and the edit is lost.
- Fix: Factor the createRangeSlider seeding into a helper and call it from the dropdown onChange, resetToDefaults and updateAllControls before the controls refresh. Guard the handlers with Array.isArray.

**F4. Splits and tabs are not independent: activating any pane stops every other pane's effect; effects are keyed by file path and canvas-confetti's single shared worker can drive only one canvas** *(bug, confirmed, FR-4)*

- Where: src/core/eventHandler.js:331-340 (noteId = file.path; stop every other active id); src/core/confettiManager.js:78-81 (useWorker:true), 465 (reset)
- What happens: Only the focused pane ever animates.
- Fix: Key effects by leaf.id, stop only on leaf close or file change, and create instances with useWorker:false (needed for concurrent canvases). If one effect at a time is intended, document that in the 003 addendum and UPDATE.md.

### Medium (17)

**F5. A single colour or a chosen Shape is written without a pipe, reloads as a string, and is ignored; the modal then replaces it with red/green/blue** *(bug, confirmed, FR-2, FR-6)*

- Where: src/utils/confettiUtils.js:113-115 (join), 14-16; src/core/confettiManager.js:195, 212, 217 (Array.isArray gates); src/modal/modals/confettiModal.js:639-641
- What happens: The user's choice is silently dropped after reload.
- Fix: Parse by key: colors, shapes, customShapes and *Range always become arrays, even with one element.

**F6. 'Disable for reduced motion' cannot be turned off: the toggle is never saved, and buildOptions hard-codes disableForReducedMotion:true** *(bug, confirmed, FR-6, FR-8)*

- Where: src/core/confettiManager.js:191; src/modal/modals/confettiModal.js:871-878, 421-431; src/core/eventHandler.js:363-366
- What happens: The toggle does nothing. The opt-out produces an invisible canvas plus a running interval, and the preview shows nothing under reduced motion.
- Fix: Use `disableForReducedMotion: config.respectReducedMotion !== false`. Emit respectReducedMotion:false from getOverridesFromDefaults the way it already handles 'flat'. Otherwise, remove the toggle.

**F7. Custom Emoji is ignored on custom-shape presets (and never saved for snowflakes and leaves), and those presets lose their colours** *(bug, confirmed, FR-2, FR-6)*

- Where: src/core/confettiManager.js:194-217 (customShapes outranks emoji; colours gated on !config.emoji); src/core/confettiPresets.js:27-71 (snowflakes and leaves have no emoji key); src/modal/modals/confettiModal.js:356-365, 871-878
- What happens: The emoji is dropped on Apply (snowflakes, leaves) or ignored at render (rain, aliens, crystals), and the preset colours are lost.
- Fix: Check emoji first in buildOptions, or clear customShapes when emoji is set. Gate colours on whether emoji shapes were actually applied. Give every preset an explicit `emoji: null` so the diff includes the key.

**F8. Clearing emoji or choosing Shape 'Default' writes literal 'null', which reloads as the truthy string "null"** *(bug, confirmed, FR-2, FR-5, FR-6)*

- Where: src/utils/confettiUtils.js:117 (writes `${key}:${value}` for null), 4-23 (no 'null' parsing); src/modal/modals/confettiModal.js:339-349, 362-364
- What happens: The saved effect differs from the preview after reload.
- Fix: Skip null and undefined in buildConfettiFrontmatter, make Default delete the override, and parse 'null' back to null.

**F9. Invalid hex colours reach canvas-confetti and throw an uncaught worker error on every burst** *(bug, confirmed, FR-3, NFR-1)*

- Where: src/core/confettiManager.js:216-227
- What happens: A continuous stream of console errors, and nothing is drawn.
- Fix: Validate each colour in buildOptions (#rgb, #rrggbb, #rrggbbaa; expand and strip), drop invalid ones, and fall back to the preset colours when none are left.

**F10. Infinity and non-numeric strings get past the clamp (count:Infinity reaches canvas-confetti's particle loop)** *(bug, likely, FR-3)*

- Where: src/utils/confettiUtils.js:352-355, 18-20
- What happens: Non-finite or non-numeric values bypass every bound, with a possible runaway allocation.
- Fix: In clampNumber, map ±Infinity to the bounds, and replace NaN or non-number values with undefined so the preset default applies.

**F11. A frontmatter change on a background or duplicate leaf steals the effect from the note being viewed** *(bug, confirmed, FR-4, FR-5)*

- Where: src/core/eventHandler.js:441-470 (scenarios 2 and 3 loop every leaf showing the file, then go through the stop-others loop at 335-340)
- What happens: The visible note's effect stops and an invisible one starts.
- Fix: Restrict the metadata path to the active MarkdownView's file (or, once effects are leaf-keyed, to visible leaves), and never run stop-others from it.

**F12. Live preview canvas scrolls away with the modal content** *(bug, confirmed, FR-7)*

- Where: src/modal/modals/confettiModal.js:783 (preview mounted on modalEl, which is the scroll container)
- What happens: The preview disappears while the lower sections are being edited.
- Fix: Mount the preview on modal.containerEl or a fixed overlay sized to modalEl's bounding rect, or use position: sticky.

**F13. Hidden colour inputs overlap the next swatch and '+', so clicks open the wrong colour picker** *(bug, confirmed, FR-6)*

- Where: src/modal/modals/confettiModal.js:1043-1049 (.color-input-hidden is absolute with no top/left)
- What happens: '+' usually edits the last colour, and the left half of each swatch edits its neighbour.
- Fix: Add `inset: 0` (top:0; left:0) to .color-input-hidden. The swatch already has position relative via the remove-button layout. Confirm it does.

**F14. Size/Speed/Gravity/Drift range sliders do nothing for the 'confetti' preset (originSpread 'fixed')** *(bug, confirmed, FR-6, FR-7, UPDATE.md 'Customize colors, speed, size')*

- Where: src/core/confettiManager.js:410-430 (fixed branch never reads *Range); src/core/confettiPresets.js (confetti.originSpread:'fixed')
- What happens: The sliders move, Modified lights up and frontmatter is written, but nothing changes.
- Fix: Extract the range randomisation into a helper and apply it in all three branches.

**F15. Bubbles preset renders tumbling squares and strips instead of round bubbles** *(bug, confirmed, FR-2)*

- Where: src/core/confettiPresets.js:298-315
- What happens: Blue paper confetti.
- Fix: Add shapes:['circle'] and flat:true, and slightly raise the colour strength or opacity.

**F16. White-only presets (snow, space, white aliens) are invisible on light themes** *(bug, confirmed, NFR-3, FR-2)*

- Where: src/core/confettiPresets.js:18 (snow ['#ffffff']), ~136-138 (space), ~161-163 (aliens)
- What happens: These effects look like no effect at all in light theme.
- Fix: Pick theme-aware colours at start (body.theme-light), or add mid-tone colours such as #b8cde0 to the palettes.

**F17. Rain Light is practically invisible and Rain Heavy is a few sparse dots** *(improvement, confirmed, FR-2)*

- Where: src/core/confettiPresets.js:73-117
- What happens: Light rain cannot be seen, and heavy rain reads as specks.
- Fix: Raise count per burst, enlarge sizeRange, use a lighter or saturated colour, use a taller and thinner raindrop path, and add flat:true to rain_light.

**F18. After a plugin load, enable or update, the already-open note gets no confetti until the user switches notes** *(bug, confirmed, FR-4)*

- Where: src/core/pixelBannerPlugin.js onload (no confetti pass; handleConfettiForNote is only reached from active-leaf-change and metadata 'changed')
- What happens: Confetti is missing until a leaf change. This probably also happens at app startup (not verified).
- Fix: In onLayoutReady (or immediately when the layout is already ready), run handleConfettiForNote for the active markdown leaf.

**F19. Dual-thumb range tracks are 12-56px wide and the thumbs overlap** *(improvement, confirmed, FR-6, NFR-2)*

- Where: src/modal/modals/confettiModal.js:1140-1154 (track flex:1 between two 70px inputs)
- What happens: The range sliders are nearly unusable.
- Fix: Put the range control on its own full-width row under the label, or set a min-width of about 150px on the track.

**F20. Range thumbs are mouse-only: no touch drag on mobile and no keyboard or screen-reader access** *(bug, likely, NFR-2, FR-6)*

- Where: src/modal/modals/confettiModal.js:518-598
- What happens: On mobile only the number boxes work.
- Fix: Use pointer events with setPointerCapture and touch-action:none, add role=slider with aria attributes and arrow-key handling, or use two stacked native range inputs.

**F42. Confetti tests contain a false-positive and a vacuous test, and never exercise the mobile, reduced-motion or plugin metadata gates** *(improvement, confirmed, NFR-5)*

- Where: tests/integration/confettiWorkflow.test.js:280-339, 20-28, 56-69, 149-217
- What happens: The suite is green while the behaviours are broken.
- Fix: Assert after the fade, assert note2Active, add mobile and reduced-motion variants, add a modal Apply-then-reparse round trip, and add a dropdown-switch test.

### Low (32)

**F21. Fade-out is invisible: particles are cleared before the opacity fade starts** *(bug, confirmed, FR-4, FR-5)*

- Where: src/core/confettiManager.js:463-474
- What happens: Hard cut, then an empty canvas lingers for 500ms.
- Fix: Clear the interval and observer immediately, and call reset() inside the fade timeout just before removeCanvas.

**F22. Number boxes on single-value sliders keep out-of-range typed values on display while the setting is unchanged** *(bug, confirmed, FR-6, FR-3)*

- Where: src/modal/modals/confettiModal.js:464-473
- What happens: The display and the saved value differ.
- Fix: On change or blur, clamp to [min,max] and write the result back to the input.

**F23. Modified indicator is hidden when the modal opens on a note that already has overrides** *(bug, confirmed, FR-6)*

- Where: src/modal/modals/confettiModal.js:95-103 (onOpen never calls checkIfModified), 137
- What happens: It appears only after the first change.
- Fix: Update the indicator at the end of onOpen, split from the preview scheduling.

**F24. Unknown preset in frontmatter: the modal shows a blank dropdown with editable controls that save nothing, and the entry button says 'Active'** *(bug, confirmed, FR-3, FR-6)*

- Where: src/modal/modals/confettiModal.js:23, 153, 859-864; src/modal/modals/targetPositionModal.js:2652-2656
- What happens: Edits are silently discarded.
- Fix: Check isValidPreset() in the constructor and in the entry status; treat an unknown preset as None and show a Notice.

**F25. Applying from the modal bypasses 'Disable Confetti on Mobile' (and the reduced-motion gate)** *(bug, likely, FR-8)*

- Where: src/modal/modals/confettiModal.js:969-979 (triggerConfettiOnNote calls confettiManager.start directly)
- What happens: The effect runs briefly, or indefinitely, on mobile.
- Fix: Route Apply through handleConfettiForNote.call(plugin, leaf, fm), which applies all the gates.

**F26. Hand-written configs fail silently with 'type:snow,count:5' (no space), 'type:Snow' (capitalised), or emoji text containing ', '** *(improvement, confirmed, FR-1, FR-3)*

- Where: src/utils/confettiUtils.js:41 (split(', ')); src/core/confettiPresets.js:329-331 (case-sensitive lookup)
- What happens: The note's effect silently never starts.
- Fix: Split on /\s*,\s*/, lowercase and trim the preset name, and strip commas and whitespace from emoji before saving.

**F27. UPDATE.md advertises a 'rain' preset that does not exist** *(bug, confirmed, UPDATE.md promises, FR-1)*

- Where: UPDATE.md:11
- What happens: 'type:rain' silently does nothing.
- Fix: List rain_light and rain_heavy, or add a 'rain' alias for rain_light in getPresetCopy.

**F28. The Confetti/Bubbles.md test fixture actually uses type:snow** *(bug, confirmed, FR-2)*

- Where: .vault/pixel-banner-example/Confetti/Bubbles.md:3
- What happens: Manual QA of bubbles from the vault is misleading, and the example-vault.zip ships it.
- Fix: Change it to banner-confetti: type:bubbles.

**F29. Preset look tuning: hearts don't rise, one emoji per burst, sparkles and pop rocks are tiny, snow is slivers, sparkles and pop rocks declare spread 1000** *(improvement, confirmed, FR-2)*

- Where: src/core/confettiPresets.js:5-25 (snow), 208-228 (hearts gravityRange [-0.05,0.05], driftRange [0.5,1.2]), 228-268 (sparkles/pop_rocks sizeRange [0.5,1], spread 1000); src/core/confettiManager.js:345-348, 393-396, 416-419 (single emoji per burst)
- What happens: The effects are weak or don't match their names.
- Fix: Hearts: gravityRange around [-0.6,-0.3] with a symmetric driftRange. Pick a single emoji only when count ≤ 3. Sparkles and pop rocks: sizeRange around [1.2,2.2] and spread 360. Snow: flat:true, sizeRange [0.3,0.8], longer duration.

**F30. Removing the whole frontmatter and restoring it (undo or paste) never restarts the effect** *(bug, likely, FR-5)*

- Where: src/core/pixelBannerPlugin.js:167-186
- What happens: The effect stays off until the user switches notes.
- Fix: Delete the lastFrontmatter entry in the no-frontmatter branch.

**F31. First metadata change on an unseeded note (or after any settings save) restarts a running effect** *(bug, likely, FR-5, FR-4)*

- Where: src/core/pixelBannerPlugin.js:179-202; src/core/settings.js:42 (lastFrontmatter.clear())
- What happens: One-shot effects replay, and continuous effects reset, on the first keystroke.
- Fix: Compare against the raw config the manager is running (store it in activeAnimations) and skip the restart when it is equal.

**F32. Plugin reload leaks the document visibilitychange listener and canvas-confetti's Worker** *(bug, confirmed, NFR-4 (standards lines 156/158), FR-9)*

- Where: src/core/confettiManager.js:19-30 (raw addEventListener in the singleton constructor); worker from confetti.create useWorker:true
- What happens: One orphaned listener and one worker thread accumulate per reload.
- Fix: Add init(plugin) and destroy(): use plugin.registerDomEvent(document,'visibilitychange',...), or remove the listener in onunload. useWorker:false removes the worker leak.

**F33. [REQUIRED] standards violations: inline JS styles (including a permanent position:relative on core .view-content), an injected modal stylesheet, console.log diagnostics, and raw setInterval** *(improvement, confirmed, NFR-4 (OBSIDIAN_DEVELOPMENT_STANDARDS.md lines 109, 159, 380))*

- Where: src/core/confettiManager.js:57-72, 44, 163/172/360/408/428/467; src/modal/modals/confettiModal.js:137, 459, 515, 699-700, 917, 981-1203; src/modal/modals/targetPositionModal.js:2621-2675; src/core/confettiShapes.js:35
- What happens: Non-compliant, and a core element is mutated permanently.
- Fix: Drop the duplicated inline canvas styles, use a host class for position:relative and remove it in removeCanvas, move the modal CSS into styles.css with toggleClass and CSS variables, keep console.error for real errors only, and consider plugin.registerInterval.

**F34. Preset lookup is not own-property safe: type:toString or type:__proto__ leaves a stray invisible canvas** *(bug, confirmed, FR-3)*

- Where: src/core/confettiPresets.js:329-331 (getPresetCopy uses CONFETTI_PRESETS[name])
- What happens: A stray canvas.
- Fix: Use Object.prototype.hasOwnProperty.call in getPreset and getPresetCopy.

**F35. Closing the last markdown tab leaves the effect registered with a detached canvas and observer** *(bug, confirmed, FR-9)*

- Where: src/core/eventHandler.js:13-16 (early return for non-markdown leaves; no layout-change cleanup)
- What happens: A small retained leak (no visible symptom).
- Fix: In handleLayoutChange, stop effects whose leaf or file is no longer open.

**F36. Shape and 3D Wobble dropdowns shrink to a blank ~42px after switching the effect to None and back** *(bug, confirmed, FR-6)*

- Where: src/modal/modals/confettiModal.js:691-693 (style.display toggle), 735-757
- What happens: They appear empty.
- Fix: Give the selects a min-width, or toggle a CSS class instead of display.

**F37. Custom field reset button leaves the red 'is-invalid' state and tooltip** *(bug, confirmed, FR-1)*

- Where: src/settings/tabs/settingsTabCustomFieldNames.js:296-304
- What happens: Stale error styling remains after reset.
- Fix: Call inputEl.removeClass('is-invalid') and set title='' in the reset handler, and assign [...DEFAULT_SETTINGS[field.setting]].

**F38. Drag-snapped float values are written with binary noise (0.30000000000000004)** *(bug, confirmed, FR-6)*

- Where: src/modal/modals/confettiModal.js:573
- What happens: Long float tails in the user's note.
- Fix: Round to the step's decimals, for example Number(value.toFixed(decimals)).

**F39. Apply writes alias [0] and leaves the note's existing alias field in place** *(improvement, confirmed, FR-1, FR-6)*

- Where: src/modal/modals/confettiModal.js:936-939
- What happens: A stale duplicate property is left in the note.
- Fix: Inside the same processFrontMatter callback, delete the other aliases, or write to the alias already present.

**F40. The 'type:snow' value renders as a clickable external link in the Properties panel** *(improvement, confirmed, FR-1)*

- Where: Frontmatter format (src/utils/confettiUtils.js buildConfettiFrontmatter)
- What happens: Looks like a link, and clicking it hands 'type:snow' to the OS URL handler.
- Fix: Consider writing a leading bare preset ('snow, count:5'), which the parser already accepts, or document the quirk.

**F41. 'Pause when scrolled off-screen' never triggers on scroll** *(improvement, confirmed, FR-9)*

- Where: src/core/confettiManager.js:55-79, ~300-310 (IntersectionObserver on a canvas overlaying the non-scrolling view-content)
- What happens: Effects keep running while the banner is far out of view.
- Fix: Observe the banner element, or correct the addendum and CHANGELOG to say the pause covers hidden tabs and leaves only.

**F43. Live preview is stopped by any note-confetti event while the modal is open** *(bug, likely, FR-7)*

- Where: src/core/eventHandler.js:335-340; src/core/confettiManager.js:517-519
- What happens: The preview vanishes and the note effect restarts behind the modal (for example on a sync edit).
- Fix: Exclude PREVIEW_NOTE_ID from the loop, or keep it in a separate map.

**F44. Apply restarts the effect twice, and stopping the preview through the shared worker can clear the first burst** *(improvement, likely, FR-6)*

- Where: src/modal/modals/confettiModal.js:937-942 then onClose cleanupPreview; src/core/eventHandler.js:458-468
- What happens: A visible reset shortly after Apply.
- Fix: Stop the preview before starting the note effect, and make update() a no-op when the sanitized config is unchanged.

**F45. Race on slow banners: a stale active-leaf-change continuation starts confetti on a no-longer-active leaf and stops the current note's effect** *(bug, speculative, FR-4)*

- Where: src/core/eventHandler.js:129-176 (await updateBanner, then handleConfettiForNote with no active-leaf check)
- What happens: The visible note can lose its effect after a slow keyword or URL banner load.
- Fix: After the await, return early if this.app.workspace.activeLeaf !== leaf.

**F46. A running effect keeps animating when OS reduced motion turns on mid-session** *(improvement, confirmed, FR-8)*

- Where: src/core/eventHandler.js:363 (checked only at start)
- What happens: Effects keep running until the next note switch.
- Fix: Add a matchMedia change listener (registered through the plugin) that calls stopAll.

**F47. Toggling 'Disable Confetti on Mobile' or renaming the confetti field doesn't refresh running effects** *(improvement, confirmed, FR-8, FR-1)*

- Where: src/settings/tabs/settingsTabGeneral.js:1065-1091; src/core/settings.js:39-52
- What happens: No change until the next note switch.
- Fix: In saveSettings, re-run handleConfettiForNote for the active markdown leaf.

**F48. Canvas pixel buffer isn't resized on pane resize (split drag, sidebar toggle)** *(bug, likely, FR-4, NFR-2)*

- Where: src/core/confettiManager.js:53-84
- What happens: Particles are stretched until a window resize or restart.
- Fix: Add a ResizeObserver that restarts the instance or updates the canvas size, and disconnect it in stop().

**F49. Possible worker TypeError ('canvas.getBoundingClientRect is not a function') when an effect starts on a 0x0 hidden canvas** *(bug, speculative, NFR-1)*

- Where: canvas-confetti worker update() (confetti.module.mjs:501-510) reached via the metadata path into a hidden leaf
- What happens: An intermittent uncaught worker error.
- Fix: Defer the first fire until the canvas has a non-zero size, or use useWorker:false.

**F50. Colour swatch add and remove are hover/mouse-only, and Burst Interval's 'disabled' state is visual only** *(bug, likely, NFR-2, FR-6)*

- Where: src/modal/modals/confettiModal.js:645-703, 1039-1067
- What happens: Mouse-only removal, and controls that look disabled but still accept keyboard input.
- Fix: Use <button> elements with aria-labels, show remove under @media (hover:none), and call setDisabled on the interval slider and text.

**F51. Apply with no active file silently closes the modal and loses the edits** *(bug, confirmed, FR-6, NFR-4)*

- Where: src/modal/modals/confettiModal.js:915-920
- What happens: Silent loss of the edits.
- Fix: Show a Notice and keep the modal open, or capture the target file at construction.

**F52. parseEmojiString merges adjacent flags and drops keycaps, ©/®/™ and tag-sequence flags** *(improvement, confirmed, FR-2)*

- Where: src/utils/confettiUtils.js:222-296
- What happens: Emoji are merged or dropped.
- Fix: Use Intl.Segmenter with grapheme granularity, keeping the current loop as a fallback.

**F53. styles.css comment states modals are at z-index 1000+ (they are at 50)** *(improvement, confirmed, FR-8)*

- Where: styles.css:761
- What happens: A misleading comment that could prompt a wrong 'fix'.
- Fix: Correct the comment to explain the leaf stacking context.


## Appendix B: What was verified as working

### What works

- NFR-5: the full suite is green. `npx vitest run` passed 31 files and 904 tests; the 5 confetti files account for 228 of them. The suite misses most of the bugs below (see the test-gap finding).
- FR-1: the 'type:<preset>, key:val' string parses, and so does unquoted YAML. The legacy array form ['snow'] and ['hearts',{count:7}] runs live. Junk values (42, '', 'type:', 'type:bogus') give no canvas and no throw. Changing customBannerConfettiField to ['qa-fx'] moves detection to the new field, both live and through getFrontmatterValue at every read site.
- FR-2: all 14 presets plus custom overrides create a canvas and animate (frame-diff motion checked in dark and light themes). Fireworks, confetti, crystals, snowflakes, leaves and aliens/UFO look like their names. Custom emoji (pizza) draws. All 13 SVG paths parse and render in Chromium.
- FR-3: finite numbers clamp. count 9999 becomes 150, count -5 becomes 1, interval 1 becomes 50. Range arrays of finite numbers also clamp. Unknown presets never create a canvas (buildOptions returns null before createCanvas, confettiManager.js:242-243).
- FR-4: the effect starts on open. Switching notes in the same leaf fades the old canvas (500ms transition, removed at about 502ms) and restarts it on return. Reading/editing toggles keep a single canvas. Plugin disable/unload calls stopAll(true) and clearShapeCache, leaving 0 canvases and 0 intervals.
- FR-5: on the active note, adding the field, changing the preset, changing overrides, setting a junk preset and removing the field all take effect live within about 1s.
- FR-6: the Target Position button ('Add/Edit Confetti') opens the modal with the current config. The dropdown shows None plus all 14 presets. Cancel writes nothing and restores the note effect. Apply writes the string format and starts at once. Apply with None deletes every alias. Reset restores the preset and hides Modified. Out-of-range values typed into the range number inputs revert.
- FR-7: the preview rebuilds about 100ms after a change, sits over the modal with pointer-events none, and is removed with the injected <style> on close.
- FR-8: disable-on-mobile works under app.emulateMobile(true). Reduced motion (real CDP emulation) suppresses default effects. Real CDP clicks pass through an active 150-particle canvas and toggle a checkbox. The canvas renders under the command palette, because z-index 100 is trapped inside the leaf's stacking context.
- FR-9: 30 rapid note switches left exactly 1 canvas (or 0 after leaving) and 0 stray intervals. The window resize listener count is stable. Continuous effects stop firing while document.hidden is true.
- NFR-1: apart from the error paths listed in findings (modal range TypeErrors, invalid-hex worker error, possible 0x0 worker error), dev:errors showed no plugin errors. The PB Plus ERR_CONNECTION_REFUSED errors and the '__vlog' errors come from the offline server and from other QA probes.
- NFR-3 (partial): the modal uses theme variables and is readable in dark and light themes (screenshots). Particle visibility in light theme fails for some presets (see findings).

### Not fully checked

- NFR-2: no real iOS/Android device was used. Mobile was checked only through app.emulateMobile (no touch events), so touch dragging, modal layout at phone width, and the 640px media query are unverified.
- FR-9: resume after the document becomes visible again was not confirmed live, because the window stayed occluded. CPU and battery cost were not measured.
- FR-4: the restart at Obsidian startup (not just plugin reload) with a confetti note focused was not tested.
- FR-4 and FR-7: concurrent canvases with useWorker:false were not tried, so whether switching off the worker alone fixes split independence is inferred from canvas-confetti source.
- FR-2: preset 'looks like its name' judgements depend on CLI screenshots, which were sometimes stale or missed OffscreenCanvas frames. Space, aliens and crystals were only lightly sampled. No one checked light-theme visibility for every preset over a light banner image.
- FR-8: live preview behaviour under reduced motion was inferred from code (buildOptions hard-codes disableForReducedMotion) and not observed in the modal.
- NFR-3: modal light-theme review was screenshot-only, with no community themes, and particle contrast was not checked against non-default themes.
- FR-5: undo/restore of the whole frontmatter and the first-edit restart were not reproduced live.
- NFR-4: the [REQUIRED] items in OBSIDIAN_DEVELOPMENT_STANDARDS.md were checked only for confetti files. The broader uncommitted changes (bannerManager.js setChildrenInPlace, domManager.js observer, settings tabs) were not audited against every REQUIRED rule.
- FR-6: the Target Position modal entry was not checked in light theme or on mobile, and its inline style attributes (targetPositionModal.js:2621-2675) were only noted by code review.

### Claims dropped or downgraded

- Dropped the debounce half of the 'returning to a note within 300ms doesn't restart its effect' claim (review:engine, review:lifecycle). The code path exists (eventHandler.js:22-29 returns before confetti handling), but live-lifecycle ran A-B-A switches with 50ms and 150ms gaps inside the debounce window, and the correct note's canvas was running at the end. The only part kept is the slow-banner await race, as a speculative finding.
- Downgraded 'Infinity reaches canvas-confetti's while(temp--) loop' to 'likely'. Live-edge confirmed that Infinity and 'abc' reach the worker options, but nobody observed a runaway allocation from particleCount:Infinity.
- Downgraded 'first edit restarts the effect' to low/likely. The 'resolved' handler (pixelBannerPlugin.js:515-531) seeds lastFrontmatter for the active leaf when it has a banner image, so the restart only occurs for notes without a rendered banner, or after a settings save. Not reproduced live.
- Kept the 0x0-canvas worker TypeError as speculative. It was seen once live, three retries did not reproduce it, and other agents were active at the time.
- Dropped a separate finding for the untracked 10ms fade-in timer (confettiManager.js:259-261). The timer is real, but stop() within 10ms of start() was never observed, and live switching always ended with correct opacity and removal. It is noted as a minor hardening item covered by the fade-out fix.
- Downgraded the review:presets severity on the 'leaf path negative coordinates draws it larger and off-centre' claim and did not list it separately. The bbox math was confirmed in Chromium, but the live-presets tester judged the leaves preset as recognisably leaves, so the user impact is cosmetic.
- Folded the live-presets note 'every preset drew nothing until plugin:reload' into the shared-worker finding as context only. Its trigger is unknown and no one reproduced it.

## Planning Metrics
<!-- METRICS_JSON {"confidence": 91, "clarification_rounds": 1, "functional_requirements_count": 9, "non_functional_requirements_count": 6, "risk_count": 6, "phase_count": 6, "verification_gaps_found": 0, "confidence_breakdown": {"requirements": 24, "feasibility": 23, "integration": 22, "risk": 22}} -->
confidence: 91
phase_count: 6
findings_count: 53
