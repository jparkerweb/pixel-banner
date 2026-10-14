# Obsidian DOM Lifecycle & Cleanup — Pixel Banner Field Guide

> Why plugin-injected DOM gets removed by Obsidian, which of Pixel Banner's
> workarounds are *inherent* vs. *replaceable*, and the official APIs to migrate
> toward. Grounded in this repo's actual code and the official Obsidian docs.
>
> **Decision recorded:** the banner **scrolls with note content** (lives in the
> markdown sizer). That means the `setChildrenInPlace` override is load-bearing and
> stays — but several surrounding workarounds can still be removed. See the triage
> table.

---

## 1. Why injected DOM disappears — two different mechanisms

These get conflated constantly. They are *not* the same, and only one of them is what kills the Pixel Banner element.

### Mechanism A — Section virtualization (scroll)

Obsidian's reading view renders a note as a list of **sections** inside
`.markdown-preview-sizer` and **unloads sections that scroll out of the viewport**,
re-rendering them when they scroll back in. This is intentional and cannot be
disabled. An Obsidian developer confirmed on the forum:

> "This is the correct behavior, and cannot be disabled. This is done for performance reasons."
> — <https://forum.obsidian.md/t/obsidian-reading-view-keeps-modifying-the-dom-in-long-notes/53709>

This affects **per-section content** (anything you inject *inside* a rendered
markdown section). It is the reason `MarkdownRenderChild` exists (see §3).

### Mechanism B — Child reconciliation via `setChildrenInPlace` ← **this is what removes our banner**

Separately from scroll, Obsidian rebuilds a container's child list by calling
`container.setChildrenInPlace(newChildren)`. When it reconciles
`.markdown-preview-sizer` / `.cm-sizer`, the new child list is **Obsidian's model of
what belongs there** — and the Pixel Banner div (a direct child of the sizer that
Obsidian didn't create) **is not in that list**, so it gets stripped on every
reconciliation pass (view toggle, edit, re-render, sometimes scroll).

This is exactly what the override (`installPersistentChildrenOverride` in
`bannerManager.js`) intercepts: it filters the incoming child list and puts the
persistent banner elements back in front before delegating to the original method.

**Order matters: all of our elements go in front of Obsidian's children, never after
them.** Reading view measures a section's height as the next sibling's `offsetTop`
minus its own. Our icons are absolutely positioned (`offsetTop` ~0), so when one
trailed the sections, a collapsed heading that was the last rendered section got a
negative height and the sections below it were never drawn (issue #315). Insert
icons with `insertPersistentElement`, not `appendChild`.

**Key consequence:** the banner doesn't vanish because it "scrolled away" — it
vanishes because it lives in a container whose children Obsidian owns and rebuilds.

---

## 2. The root architectural fact (why some hackiness is unavoidable)

There is **no official Obsidian API** for *"one persistent full-width element at the
top of the scrolling markdown flow."* `MarkdownRenderChild` is section-scoped (it
unloads with its section), and the only stable containers are *outside* the scroller
(so an element there is pinned, not scrolling).

Because we want the banner to **scroll with content**, it must live in the sizer, and
something must defend it against Mechanism B. The forum dev's verdict on persistent
injected elements:

> "A plugin could do it, but that's the only option afaik."

So the `setChildrenInPlace` override is the price of the "scrolls with content" UX.
What we *can* clean up is everything built *around* it that is redundant or that
leaks.

---

## 3. The official lifecycle APIs (and where each fits Pixel Banner)

| API | What it does | Fit for Pixel Banner |
|-----|--------------|----------------------|
| `MarkdownRenderChild` + `ctx.addChild(child)` | Auto-runs `onunload()` when the child's container element is detached from the DOM. | **Not for the banner** (it's section-scoped and would unload with the section). Use only if we ever inject *per-section* content (e.g. an inline badge). |
| `registerMarkdownPostProcessor((el, ctx) => …)` | Runs after markdown → HTML, re-runs **per section on every re-render**. | **Already used.** Correct hook to *re-apply* the banner after re-render. Should be idempotent so it needs no self-debounce. |
| `Component` + `register(cb)` / `registerDomEvent` / `registerEvent` / `registerInterval` | Ties teardown to a component's lifetime; auto-cleans on unload. | **Underused.** This is the clean replacement for hand-managed observers/timers (see §5). |
| `registerEditorExtension` + CM6 decorations / `WidgetType` | The cooperative API for the **editing/Live Preview** (CodeMirror 6) view. CM6 also recycles DOM on scroll. | A full-width banner doesn't fit the decoration model well; the in-`.cm-sizer` injection + override is the pragmatic choice, same as reading view. |
| `workspace.onLayoutReady(cb)` | Runs after the workspace layout is ready (or immediately if it already is). | **Use for first-run setup** instead of `setTimeout`/constructor work; also required for 1.7.2+ deferred-view safety. |

Docs:
- <https://docs.obsidian.md/Reference/TypeScript+API/MarkdownRenderChild>
- <https://docs.obsidian.md/Reference/TypeScript+API/MarkdownPostProcessorContext>
- <https://docs.obsidian.md/Plugins/Editor/Markdown+post+processing>
- <https://docs.obsidian.md/Reference/TypeScript+API/Component>
- <https://docs.obsidian.md/Reference/TypeScript+API/Workspace/onLayoutReady>
- <https://docs.obsidian.md/plugins/guides/defer-views>

---

## 4. Workaround triage — KEEP / REPLACE / RECONSIDER

| # | Workaround (file:line) | Verdict | Why |
|---|------------------------|---------|-----|
| 1 | `setChildrenInPlace` override — `bannerManager.js:352–396` | **KEEP (harden)** | Load-bearing given "scrolls with content." No official replacement. Fragile because it monkey-patches a core method per container — guard it and fail safe (see §6). |
| 2 | MutationObserver "resurrection" — `domManager.js:4–57` | **RECONSIDER (likely redundant)** | If #1 reliably re-injects, this duplicates that defense and fires storms during scroll. Test disabling it; most triggers are already covered by #1 + the post-processor re-run. |
| 3 | ResizeObserver on `.view-content` — `domManager.js:61–78` | **KEEP (re-scope cleanup)** | Legitimate — Obsidian has no viewport-resize event. But register its disconnect via the component lifecycle instead of storing `el._resizeObserver` and disconnecting by hand (see §5). |
| 4 | `setTimeout(…, 100)` in `handleLayoutChange` — `eventHandler.js:211–231` | **REPLACE** | Arbitrary delay to "let layout settle." Idempotent insertion (§6) removes the need; use `onLayoutReady` for first run. |
| 5 | `setTimeout(…, 50)` in `applyBannerWidth` — `bannerManager.js:1598–1610` | **REPLACE (prefer rAF)** | Reading `clientWidth` after layout: prefer `requestAnimationFrame` over a magic 50ms, or let the ResizeObserver (#3) drive width updates so this becomes unnecessary. |
| 6 | Debounce layers (350 / 50 / 200 ms) — `bannerManager.js:25, 764, 1656` | **KEEP (use `debounce()` util)** | Collapsing event storms is the correct pattern. Standardize on Obsidian's `debounce()` for consistency. The 200ms post-processor self-debounce can go once insertion is idempotent. |
| 7 | `_isPersistent*` flags — `bannerManager.js:271, 307, …` | **KEEP** | Necessary companion to #1 so the override can tell our elements from Obsidian's. |
| 8 | Manual observer/timer cleanup in `onunload` — `pixelBannerPlugin.js:880–917` | **REPLACE** | Move to `register*` / `Component` lifecycle so teardown happens when the *leaf* closes, not only on plugin unload — fewer leaks, no bookkeeping. |

---

## 5. Migration recipe — cleanup that ties to lifecycle

The biggest correctness win (independent of the banner-persistence problem) is to stop
hand-managing observers/timers and let Obsidian's `Component` machinery tear them down.

**ResizeObserver (today: stored on the DOM node, disconnected in `onunload`):**

```js
// Before — domManager.js:61–78 + manual disconnect in onunload
viewContent._resizeObserver = new ResizeObserver(debouncedResize);
viewContent._resizeObserver.observe(viewContent);
// ...later, in onunload, iterate leaves and disconnect each by hand

// After — auto-cleanup, no bookkeeping, no per-node property
const ro = new ResizeObserver(debounce(() => this.applyBannerWidth(viewContent), 100));
ro.observe(viewContent);
this.register(() => ro.disconnect());   // Component.register: fires on unload
```

**Apply the same pattern across the board:**

| Today | Replace with |
|-------|--------------|
| `el.addEventListener(type, fn)` | `this.registerDomEvent(el, type, fn)` |
| `setInterval(fn, ms)` | `this.registerInterval(window.setInterval(fn, ms))` |
| `workspace.on(evt, fn)` (bare) | `this.registerEvent(this.app.workspace.on(evt, fn))` *(event subs already do this ✅)* |
| `new MutationObserver(...)` / `new ResizeObserver(...)` | create it, then `this.register(() => observer.disconnect())` |
| first-run work in constructor / `setTimeout` | `this.app.workspace.onLayoutReady(() => …)` |

Note: Pixel Banner's **workspace event subscriptions already use `registerEvent`**.
The gap is specifically the **observers and raw timeouts**, which are hand-managed.

Docs: <https://docs.obsidian.md/Reference/TypeScript+API/Component> ·
<https://docs.obsidian.md/Reference/TypeScript+API/Component/register> ·
<https://docs.obsidian.md/Reference/TypeScript+API/Component/registerDomEvent> ·
<https://docs.obsidian.md/Reference/TypeScript+API/Component/registerInterval>

---

## 6. Make insertion idempotent (removes the timing hacks)

Most of the `setTimeout` delays exist to avoid double-insertion or to wait for the DOM
to "settle." If every insertion path is a **no-op when a correct banner already
exists**, the delays and several resurrection triggers become unnecessary.

Principles:

1. **Query before insert.** Pixel Banner already does this:
   `let bannerDiv = container.querySelector(':scope > .pixel-banner-image')`
   (`bannerManager.js:267`). Make *every* event handler reuse that element rather than
   recreating it.
2. **Separate "ensure visible" from "fetch new image."** The `ENSURE_VISIBILITY` mode
   (`bannerManager.js:415–426`) is the right idea — keep it; it re-injects the cached
   banner without an API call.
3. **Harden the override fail-safe.** The `setChildrenInPlace` patch (#1) is the one
   irreplaceable hack — guard it so it can never throw inside Obsidian's render path:
   - keep the `_hasOverriddenSetChildrenInPlace` guard so it's installed once per container;
   - wrap the re-injection body in a try/catch that, on failure, calls the original
     method unmodified (never break Obsidian's render);
   - re-select persistent elements by class at call time (already done) so stale
     references can't leak.
4. **Let re-render re-apply.** `registerMarkdownPostProcessor` already re-runs per
   section; with idempotent insertion it can replace the MutationObserver's
   "resurrect" role for reading view, which is why #2 is a *RECONSIDER*.

---

## 6.5. Optimizing the persistence override (deep dive)

The `setChildrenInPlace` override (`bannerManager.js:352`) is the **right primitive** for
"scrolls with content, both views." It's *proactive* — it re-injects the banner *during*
Obsidian's reconciliation, so the element never actually leaves the DOM (no flicker). The
alternatives are all worse for this requirement:

| Approach | Why it's worse here |
|----------|---------------------|
| `registerMarkdownPostProcessor` re-inject | Reactive → flicker; **reading-view only** (does nothing for `.cm-sizer`) |
| MutationObserver "resurrect" | Reactive → flicker; fires on a mutation storm |
| **`setChildrenInPlace` override** | Proactive → **no flicker**, works in **both** reading and editing views |

It's also correctly scoped as an **own-property on the element instance** (not a
`Element.prototype` patch), so it's garbage-collected with the container — no global
pollution, no manual teardown. Keep that.

The override has three weaknesses, in priority order:

**P1 — No fail-safe (can break note rendering).** The body runs *inside Obsidian's render
pipeline*; any throw propagates into Obsidian and can break the note's render. Wrap it and
always fall back to the original:

```js
container.setChildrenInPlace = function (children) {
    try {
        // ... filter + re-inject ...
        return originalSetChildrenInPlace.call(this, children);
    } catch (e) {
        console.error('Pixel Banner: setChildrenInPlace override failed; using original', e);
        return originalSetChildrenInPlace.call(this, children); // never break Obsidian's render
    }
};
```

**P1 — Feature-detect the undocumented internal.** `setChildrenInPlace` is not public API.
If a future Obsidian renames/removes it, `container.setChildrenInPlace = …` silently breaks.
Guard installation with `typeof container.setChildrenInPlace === 'function'` so a missing
method degrades to the post-processor path instead of throwing.

**P3 — Hot-path cost + flag sprawl.** The override runs on every reconciliation (frequent
during scroll). Two cheap wins:
- **Early-out:** if none of our elements are present, call the original immediately.
- **Drive re-injection off class presence, not `_isPersistent*` flags.** Every element we
  create already carries its class, so the per-element `_isPersistentBanner` /
  `_isPersistentSelectImage` / … bookkeeping (`:271, 307, 330, …`) is redundant *inside the
  override*. Keying off the class is equivalent and more robust (survives missed flag
  assignment). (The flags can stay assigned for other code paths; this just stops the
  override from depending on them.)

### The MutationObserver is the real perf drain (workaround #2)

`domManager.js:setupMutationObserver` observes `document.body` with `subtree: true`, and its
`structuralChange` branch fires `debouncedEnsureBanner()` whenever a
`.markdown-preview-section` is added — **which happens on every scroll**. With the proactive
override in place, the banner is never removed, so this per-scroll re-ensure is pure
redundant churn.

Surgical fix: keep the genuine **banner-removal safety net** (resurrect if the banner ever
*does* disappear) and the **mode-switch** re-ensure (a `.cm-sizer` being added, which is rare),
but **drop the `.markdown-preview-section` trigger** (the frequent scroll churn). Full removal
of the observer is possible once the override is proven to hold in a live vault, but the
surgical reduction captures the perf win without giving up the safety net.

## 7. Suggested cleanup order (low risk → higher risk)

1. **Re-scope observer/timer cleanup** to `register*`/`Component` (§5). Pure
   correctness win, no behavior change. *(Workaround #3, #8)*
2. **Replace the two `setTimeout` delays** with `onLayoutReady` / `requestAnimationFrame`
   + idempotent insertion (§6). *(Workaround #4, #5)*
3. **Harden the `setChildrenInPlace` override** with a try/catch fail-safe (§6.3).
   *(Workaround #1)*
4. **Trial-remove the MutationObserver** and verify the banner survives scroll, view
   toggle, split, and search-result rendering using only the override + post-processor.
   Keep it only if a real gap appears. *(Workaround #2)*

Run `npm test` after each step (671+ tests), and smoke-test in `.vault/pixel-banner-example`
across: long-note scroll, reading↔editing toggle, split panes, hover-preview embeds,
and sidebar resize — the scenarios that historically removed the banner.

---

## Sources

- Forum (dev confirmation of section unload-on-scroll): <https://forum.obsidian.md/t/obsidian-reading-view-keeps-modifying-the-dom-in-long-notes/53709>
- Markdown post processing: <https://docs.obsidian.md/Plugins/Editor/Markdown+post+processing>
- `MarkdownRenderChild`: <https://docs.obsidian.md/Reference/TypeScript+API/MarkdownRenderChild> · constructor: <https://docs.obsidian.md/Reference/TypeScript+API/MarkdownRenderChild/(constructor)>
- `MarkdownPostProcessorContext`: <https://docs.obsidian.md/Reference/TypeScript+API/MarkdownPostProcessorContext>
- `Component` (+ register helpers): <https://docs.obsidian.md/Reference/TypeScript+API/Component>
- Editing view — Decorations: <https://docs.obsidian.md/Plugins/Editor/Decorations> · View plugins: <https://docs.obsidian.md/Plugins/Editor/View+plugins>
- `onLayoutReady`: <https://docs.obsidian.md/Reference/TypeScript+API/Workspace/onLayoutReady>
- Deferred views (1.7.2+): <https://docs.obsidian.md/plugins/guides/defer-views>
- `debounce()`: <https://docs.obsidian.md/Reference/TypeScript+API/debounce>

Local code referenced: `src/core/bannerManager.js`, `src/core/eventHandler.js`,
`src/core/pixelBannerPlugin.js`, `src/core/domManager.js`.
