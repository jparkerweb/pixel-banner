# Planning Conversation: Confetti Wrap-Up

- **Date:** 2026-10-13
- **Plan:** [PLAN-DRAFT-20261013.md](./PLAN-DRAFT-20261013.md)
- **Interface:** Plan2Code web console

## Transcript (condensed)

**User (idea):** I have a new "confetti" feature in progress on the `develop` branch. Use as many agents as possible to ensure all its functionality works as expected, then suggest improvements, as we need to wrap up development soon. Control Obsidian as much as possible to understand the functionality and verify it.

**Agent:** Explained the fit: the checking happens in Phase 2 and changes nothing; the output is a plan of fixes and improvements. Corrected an earlier claim (UPDATE.md's "rain" is a family name; 14 presets exist, including `rain_light` and `rain_heavy`) and fixed the README line accordingly.

**Phase 1 questions and answers**

| Question | Answer |
|---|---|
| What counts as correct | The three `prompts/completed/00X-confetti-*.md` specs as amended by their As-Shipped Addenda, plus UPDATE.md 3.7.0 |
| How the checking runs | Several live testers taking turns on the one Obsidian window (code reviewers alongside) |
| What wrap-up means | Bugs and every worthwhile improvement |
| Tests in the plan | Unit and integration tests, run after each phase |
| Requirements sign-off | Approved (FR-1 to FR-9, NFR-1 to NFR-5) |

**Phase 2 (verification run):** 5 code reviewers (parsing, engine, presets, modal, lifecycle) ran in parallel while 4 live testers (lifecycle, modal, presets, edge cases) took turns driving Obsidian through the CLI with real CDP clicks and screenshots; a synthesizer merged, deduplicated and verified code-only claims. 10 agents, 574 tool calls, about an hour. Result: 53 findings (1 critical, 3 high, 14 medium and 21 low bugs; 14 improvements). The vault and settings were left unchanged.

**User:** "Let's do EVERYTHING unless you can give me a good reason to leave anything out." **Agent:** Kept all 53; F45 and F49 (no reproduction) become cheap defensive guards; F52 scheduled last.

**Phase 3:** Agent assessed the scope as Large (about 6 phases, 53 findings) and offered the checkpoint. **User:** declined; continue in this conversation. Spec folder name: `confetti-wrap-up`.

**Phase 4:** Tech stack approved: no new dependencies; canvas-confetti kept with `useWorker: false`; `Intl.Segmenter` for emoji.

**Phase 5:** Three approaches offered (patch in place, codec + per-pane effects, rewrite). **User:** codec + per-pane effects. Background-tab policy: visible panes run, hidden tabs pause.

**Phase 6:** Six implementation phases, risks and success criteria presented. **User:** no changes; write the plan.

## Decision Summary

### Requirements

| ID | Decision |
|---|---|
| FR-1 to FR-9 | Verify and fix: config format, presets, sanitizing, per-pane lifecycle, live edits, modal, preview, gates, performance |
| NFR-1 to NFR-6 | No console errors; desktop + mobile; light + dark; Obsidian [REQUIRED] standards; suite green; smooth two-pane rendering |
| Scope | All 53 findings; nothing excluded |

### Technology

| Decision | Rationale |
|---|---|
| Keep canvas-confetti 1.9.4 | The split-pane bug is in how it is called |
| `useWorker: false` | The library's worker is a shared singleton bound to one canvas |
| `Intl.Segmenter` with fallback | Correct emoji graphemes |
| No new dependencies | Not needed |

### Architecture

| Decision | Rationale |
|---|---|
| Single config codec (`src/utils/confettiConfig.js`) | One root cause behind F1, F5, F8, F10, F26, F34, F38, F40 |
| Effects keyed by leaf id (`ConfettiEffect` per pane) | Independent splits (F4), scoped metadata updates (F11), clean disposal (F32, F35) |
| Visible panes run, hidden tabs pause | Matches the original spec; saves CPU |
| Modal draft with UI-only ranges | Untouched presets write only `type:` (F2) |
| Spaced output `type: snow` | Properties panel no longer renders it as a link (F40) |

### Risks

| Risk | Mitigation |
|---|---|
| Main-thread rendering cost | Particle cap, pausing, measured in Task 6.4 |
| Codec changes parsing | Superset grammar, golden tests |
| Missed Obsidian events | Layout-change reconciliation |
| Subjective preset tuning | Light/dark screenshots for sign-off |
| Unrelated uncommitted work | Commit or stash before Phase 1 |

### Assumptions

- Test vault `pixel-banner-example` only; Obsidian 1.14.4 CLI available.
- Mobile verified by emulation only.
