# Obsidian Plugin Development Standards

> Engineering standards for the Pixel Banner plugin, derived from official Obsidian
> developer documentation, the plugin review guidelines, the submission requirements,
> and the developer policies. Every standard below was researched against
> `docs.obsidian.md` and adversarially fact-checked; claims that could not be
> grounded in official docs were dropped.

## How to read this document

Each standard carries a severity badge:

- **[REQUIRED]** — Must be followed. These are correctness issues or hard rules the
  Obsidian review team enforces (a violation can block community-catalog inclusion).
- **[RECOMMENDED]** — Strong best practice. Follow unless there is a documented reason
  not to.
- **[OPTIONAL]** — Situational / nice-to-have.

**Note on examples:** This codebase is **JavaScript, not TypeScript** (see `CLAUDE.md`).
Where the snippets below show TypeScript-only syntax (`as MyView`, generics like
`getActiveViewOfType<T>()`), apply the JS equivalent — drop the cast / type argument and
rely on the runtime `instanceof` check, which is what actually matters.

---

## 1. Settings UI

How to build, populate, and persist a plugin's settings tab so it matches Obsidian's
native styling and conventions.

| Rule | Severity | Rationale |
|------|----------|-----------|
| Register settings UI by subclassing `PluginSettingTab` and calling `this.addSettingTab(new YourSettingTab(this.app, this))` in `onload()`; build the tab's UI in `display()` against `containerEl` (typically `containerEl.empty()` first). | **[REQUIRED]** | Supported integration point; ensures the tab appears and is rebuilt correctly on open. |
| Build all settings rows with the Settings API: `new Setting(containerEl).setName(...).setDesc(...).addText/addToggle/addDropdown/addSlider/addButton(...)` instead of constructing custom DOM for input controls. | **[RECOMMENDED]** | The Setting builder produces markup matching Obsidian's native styling and stays consistent across themes/versions. Hand-rolled controls drift visually and break on CSS updates. |
| Read/write control values through component objects (`TextComponent.setValue/getValue`, `ToggleComponent.setValue`, `DropdownComponent.setValue`, `SliderComponent.setValue`) rather than the underlying input element (`text.inputEl.value`, `toggleEl.checked`). | **[RECOMMENDED]** | Component methods keep visual state, internal state, and change handlers in sync. Mutating the raw DOM input bypasses the component, so displayed and tracked values can diverge and `onChange` may not fire. |
| Persist each setting the moment its `onChange` fires (call `saveSettings()` inside `onChange`); do not batch behind a save/submit button. | **[RECOMMENDED]** | Obsidian's convention is immediate persistence. Users expect no save button, and deferring risks losing changes if the tab closes. |
| Keep each setting row to a single mutable control, and keep `setDesc()` to a short single-sentence explanation rather than multi-paragraph warnings. | **[RECOMMENDED]** | One control per row and concise descriptions match Obsidian's layout conventions and keep the tab scannable. |
| Use `addExtraButton()` with `setIcon()`/`setTooltip()` for secondary icon actions (e.g. reset-to-default) rather than custom icon buttons. | **[OPTIONAL]** | Renders the standard subtle icon-button styling and accessible tooltip used across Obsidian settings, avoiding custom DOM and inline styles. |

**Do / Don't — settings row:**
```js
// Do
new Setting(containerEl).setName('Default value').addText((text) =>
  text.setPlaceholder('Lorem ipsum')
      .setValue(this.plugin.settings.sampleValue)
      .onChange(async (value) => {
        this.plugin.settings.sampleValue = value;
        await this.plugin.saveSettings();
      }));

// Don't
const input = containerEl.createEl('input');
input.value = settings.sampleValue;
input.addEventListener('input', ...); // bypasses component + native styling
```

**Do / Don't — reading values & extra button:**
```js
// Do: component-tracked value
let textRef;
new Setting(el).addText(t => { textRef = t; t.setValue(v); });
// later: textRef.setValue(newValue);
// Don't: textRef.inputEl.value = newValue; // no onChange, state diverges

// Do: reset button
.addExtraButton(b => b.setIcon('lucide-rotate-ccw')
  .setTooltip('Reset to default').onClick(() => reset()))
```

Sources: <https://docs.obsidian.md/Plugins/User+interface/Settings>

---

## 2. Settings Headings & UI Text

Conventions for section headings and the wording of all user-facing text.

| Rule | Severity | Rationale |
|------|----------|-----------|
| Use `new Setting(containerEl).setName('Title').setHeading()` for section headings instead of HTML heading elements (`<h1>`/`<h2>` or `createEl('h1'\|'h2')`). | **[REQUIRED]** | Raw HTML headings produce inconsistent styling between plugins; `setHeading()` matches Obsidian's native settings UI. |
| Do not add a top-level heading at the top of the settings tab such as the plugin's name, "General", or "Settings". Only use section headings (`setHeading`) when the tab has more than one distinct section; if one section holds general settings, keep it at the top with no heading. Separately, avoid repeating the word "settings" inside section heading names (prefer "Advanced" over "Advanced settings"). | **[REQUIRED]** | The tab already shows the plugin name, so a duplicate heading is redundant. |
| Use sentence case for all UI text the user reads — setting names, descriptions, headings, button labels, placeholders, command names. Capitalize only the first word and proper nouns. | **[RECOMMENDED]** | Sentence case is Obsidian's house style; Title Case looks inconsistent. (Docs frame this as a guideline, commonly flagged in review, not a hard auto-reject gate.) |

**Do / Don't:**
```js
// Headings — Do
new Setting(containerEl).setName('Banner defaults').setHeading();
// Don't
containerEl.createEl('h2', { text: 'Defaults' });            // raw HTML heading
new Setting(containerEl).setName('Pixel Banner Settings').setHeading(); // redundant top heading

// Sentence case — Do
.setName('Show banner in reading view')   // "Template folder location", "Create new note"
// Don't
.setName('Show Banner In Reading View')
```

Sources: <https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines> · <https://docs.obsidian.md/Plugins/User+interface/Settings> · <https://docs.obsidian.md/Reference/TypeScript+API/Setting/setHeading>

---

## 3. DOM Construction & Styling (Security + Theming)

How to build and style DOM safely so the plugin is injection-safe and theme-overridable.

| Rule | Severity | Rationale |
|------|----------|-----------|
| Build DOM programmatically with the DOM API or Obsidian helpers `createEl()`, `createDiv()`, `createSpan()` (set text via the `{ text }` option or `el.setText()`/`textContent`; clear with `el.empty()`). Avoid `innerHTML`, `outerHTML`, and `insertAdjacentHTML` — they pose a security/XSS risk when built from user-defined input (e.g. frontmatter or API responses containing a `<script>` tag), allowing arbitrary code execution. | **[REQUIRED]** | Injecting HTML strings is an injection risk; the DOM API / Obsidian helpers build elements safely and are the prescribed approach. |
| Do not assign styles via JavaScript (`el.style.x = ...`) or inline `style` attributes in created HTML. Define styling in `styles.css` against your own CSS classes (applied via the `cls` option or `addClass`/`toggleClass`). Don't override Obsidian core styling — scope rules to your own class. | **[REQUIRED]** | Hardcoded JS/inline styles can't be overridden by themes or snippets, removing the user's ability to restyle. CSS classes keep styling themeable. |
| Prefer Obsidian's built-in CSS variables (design tokens) for colors, spacing, and fonts in `styles.css`. | **[RECOMMENDED]** | The plugin then adapts to light/dark and third-party themes instead of clashing with hardcoded values. |
| For conditional/dynamic styling, toggle a CSS class with `toggleClass(name, condition)` instead of mutating `element.style`. | **[RECOMMENDED]** | Keeps all visual rules in CSS (themeable) and avoids scattering hardcoded values through JS. |

> **Pixel Banner caveat:** Banner images legitimately need *computed*, per-note values
> (background-image URL, height, x/y position, opacity) that cannot live as static CSS.
> For these, prefer setting **CSS custom properties** (`el.style.setProperty('--pixel-banner-image', ...)`)
> consumed by rules in `styles.css`, rather than hardcoding final visual properties in JS.
> This keeps the *styling* themeable while letting JS supply only the dynamic data.

**Do / Don't — DOM:**
```js
// Do
const div = containerEl.createDiv({ cls: 'pb-note' });
div.createSpan({ text: userValue });
// Don't
containerEl.innerHTML = `<div class="pb-note"><span>${userValue}</span></div>`;
```

**Do / Don't — styling:**
```js
// Do: class only, styles live in styles.css
const book = containerEl.createEl('div', { cls: 'book' });
element.toggleClass('danger', status === 'error');
// Don't: styles in JS
const book2 = containerEl.createDiv();
book2.style.padding = '8px'; book2.style.color = 'red';
element.style.color = status === 'error' ? 'red' : 'black';
```

```css
/* Do: themeable tokens */
.book__title { color: var(--text-normal); padding: var(--size-4-2); }
/* Don't: hardcoded */
.book__title { color: #222; padding: 8px; }
```

Sources: <https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines> · <https://docs.obsidian.md/Plugins/User+interface/HTML+elements> · <https://docs.obsidian.md/oo/plugin>

---

## 4. Plugin Lifecycle & Resource Management

What to register, how to clean up, and what *not* to tear down on unload.

| Rule | Severity | Rationale |
|------|----------|-----------|
| Release every resource your plugin creates (event listeners, intervals, DOM handlers) when the plugin unloads. Prefer the auto-cleanup helpers (`registerEvent`, `registerDomEvent`, `registerInterval`, `addCommand`) so resources are released automatically. | **[REQUIRED]** | "Any resources created by the plugin, such as event listeners, must be destroyed or released when the plugin unloads." Leaked handlers keep firing against a dead instance, causing leaks and degraded performance. |
| Register Obsidian event subscriptions through `this.registerEvent(this.app.workspace.on(...))` / `metadataCache.on` / `vault.on`, not bare `.on()` with manual detaching. | **[REQUIRED]** | "The safest way to make sure [handlers are detached] is to use the registerEvent() method." Removes error-prone manual unsubscribing. |
| Attach DOM event listeners with `this.registerDomEvent()` (inherited from Component) instead of `element.addEventListener()`. | **[REQUIRED]** | "Registers a DOM event to be detached when unloading." Raw `addEventListener` listeners survive unload and leak. |
| Wrap `setInterval` timers in `this.registerInterval(window.setInterval(...))`. | **[REQUIRED]** | The interval is "registered to be cancelled when unloading." A raw `setInterval` keeps firing after the plugin is disabled. |
| Add commands and ribbon icons via `this.addCommand()` / `this.addRibbonIcon()`. | **[RECOMMENDED]** | These register the UI affordance against the plugin lifecycle for automatic cleanup; manual wiring risks orphaned affordances. |
| Do **not** detach leaves of your own custom view types in `onunload()` (no `detachLeavesOfType`). | **[REQUIRED]** | "When the user updates your plugin, any open leaves will be reinitialized at their original position, regardless of where the user had moved them." Detaching wipes the user's layout on every update. |
| Do not hold direct references to custom view instances; resolve on demand via `getActiveViewOfType` / `getLeavesOfType`. | **[RECOMMENDED]** | "Managing references to custom view can cause memory leaks or unintended consequences." A stored reference can outlive a recreated/detached leaf. |
| Use `onload()` to configure capabilities and `onunload()` only for teardown not already covered by `register*` helpers. Keep `onunload` free of layout-mutating side effects. | **[RECOMMENDED]** | `onunload` must release resources but must not tear down user-facing layout Obsidian re-initializes itself. |
| Access the app through `this.app`. Never use the global `app` or `window.app`. | **[REQUIRED]** | "Avoid using the global app object... Instead, use the reference provided by your plugin instance, this.app." The global is a debugging aid and might be removed in the future. |

**Do / Don't:**
```js
// Do
this.registerEvent(this.app.workspace.on('file-open', (f) => this.handle(f)));
this.registerDomEvent(window, 'resize', () => this.reflowBanner());
this.registerInterval(window.setInterval(() => this.tick(), 1000));
const view = this.app.workspace.getActiveViewOfType(MyView); if (view) view.refresh();
this.app.vault.getAbstractFileByPath(path);

// Don't
const ref = this.app.workspace.on('file-open', cb);   // never detached
window.addEventListener('resize', this.reflowBanner);  // not cleaned up
setInterval(() => this.tick(), 1000);                  // never cleared
onunload() { this.app.workspace.detachLeavesOfType(MY_VIEW_TYPE); } // wipes layout
app.vault.getAbstractFileByPath(path);                 // global app, may be removed
```

Sources: <https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines> · <https://docs.obsidian.md/Plugins/Getting+started/Anatomy+of+a+plugin> · <https://docs.obsidian.md/Plugins/Events> · <https://docs.obsidian.md/Reference/TypeScript+API/Component/registerDomEvent> · <https://docs.obsidian.md/Reference/TypeScript+API/Component/registerInterval>

---

## 5. Deferred Views & Startup Timing (Obsidian 1.7.2+)

Since v1.7.2 all views start as `DeferredView` placeholders until their tab becomes
visible. Code must not assume `leaf.view` is the real view, and startup work must be
deferred until the layout exists.

| Rule | Severity | Rationale |
|------|----------|-----------|
| Never assume a leaf's view is the fully-loaded `View`. Perform an `instanceof` check on `leaf.view` before using it. | **[REQUIRED]** | As of v1.7.2 "all views are created as instances of DeferredView" and only swap to the real `View` once visible. The docs make `instanceof` the canonical guard; skipping it causes runtime errors. |
| When iterating leaves (`iterateAllLeaves` / `getLeavesOfType`), use an `instanceof MyView` check rather than relying on `getViewType()` and casting. The `instanceof` check inherently skips deferred/foreign leaves. | **[REQUIRED]** | Leaves may still hold a `DeferredView`, so `getViewType()`-based casts break. `instanceof` is the reliable, deferred-safe discriminator. |
| To programmatically reveal and use a custom view, `await workspace.revealLeaf(leaf)` (which fully loads it), then access `leaf.view` behind an `instanceof` check. | **[RECOMMENDED]** | "If your plugin is attempting to communicate with a view, that view should be visible." `revealLeaf` forces the deferred view to render into its real instance. This is the documented `activateView` pattern. |
| Only call `WorkspaceLeaf.loadIfDeferred()` when you must force-load a view that is not being revealed; use it sparingly. Prefer `revealLeaf` for user-visible activation. Guard with `requireApiVersion('1.7.2')` if needed. | **[RECOMMENDED]** | `loadIfDeferred()` loads a deferred view without showing it, "removing this performance optimization." Overusing it eagerly loads background views and negates the deferral. |
| Do not call workspace APIs (reading active leaves, iterating views, restoring state) directly inside `onload`. Defer with `this.app.workspace.onLayoutReady(() => { ... })`. | **[RECOMMENDED]** | At `onload` time the layout is not guaranteed restored, so direct workspace calls can see incomplete state and force views to load during startup, impacting load time. |
| Access the active view via `getActiveViewOfType()` rather than reading `workspace.activeLeaf` directly (use `workspace.activeEditor` where appropriate). | **[RECOMMENDED]** | `getActiveViewOfType(type)` returns the active view of the requested type or null — type-safe, and already returns null for non-matching/deferred views. `activeLeaf` is fragile/unreliable for this purpose. |

**Do / Don't:**
```js
// Do
if (leaf.view instanceof MyCustomView) leaf.view.doThing();
for (const leaf of this.app.workspace.getLeavesOfType('my-view')) {
  if (leaf.view instanceof MyCustomView) leaf.view.refresh();
}
await this.app.workspace.revealLeaf(leaf);
if (leaf.view instanceof MyCustomView) leaf.view.update();
onload() { this.app.workspace.onLayoutReady(() => this.scanOpenNotes()); }

// Don't
leaf.view.doThing();                         // throws if still a DeferredView
const v = leaf.view;                         // may be a DeferredView — guard first
onload() { this.app.workspace.getLeavesOfType(MY_VIEW_TYPE); } // layout may not be ready
const view = this.app.workspace.activeLeaf.view; // fragile
```

Sources: <https://docs.obsidian.md/plugins/guides/defer-views> · <https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceLeaf/isDeferred> · <https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceLeaf/loadIfDeferred> · <https://docs.obsidian.md/Plugins/User+interface/Views> · <https://docs.obsidian.md/Reference/TypeScript+API/Workspace/onLayoutReady> · <https://docs.obsidian.md/plugins/guides/load-time> · <https://docs.obsidian.md/Reference/TypeScript+API/Workspace/getActiveViewOfType>

---

## 6. Vault & File API

Prefer the Vault API for safe, atomic, indexed file operations; use the right read/write
call for each situation.

| Rule | Severity | Rationale |
|------|----------|-----------|
| Prefer the Vault API over the Adapter API for visible vault files. Use the Adapter only for files inside hidden folders (e.g. inside the config dir) the Vault API cannot reach. | **[RECOMMENDED]** | The Vault API adds performance (caching layer) and safety (operations performed serially to avoid race conditions). The Vault API only exposes app-visible files; the Adapter is the documented escape hatch. |
| When editing the currently active note, use the `Editor` interface, not `Vault.modify()`/`Vault.process()`. | **[RECOMMENDED]** | "Editor maintains information about the active note, such as cursor position, selection, and folded content." Writing the file out from under the editor discards this state. |
| To modify a note that is NOT the active editor, use `Vault.process()` instead of read+modify+write. | **[RECOMMENDED]** | `process()` "guarantees that the file doesn't change between reading the current content and writing the updated content." A manual read-then-write can overwrite concurrent edits. |
| To read or change frontmatter/YAML, use `FileManager.processFrontMatter()` and mutate the passed-in object synchronously. Never hand-parse/re-serialize YAML. Handle thrown errors (e.g. `YAMLParseError`). | **[RECOMMENDED]** | "processFrontMatter runs atomically, so modifying the file will not conflict with other plugins." Manual YAML rewriting risks corrupting formatting, comments, and concurrent edits. |
| Resolve a file by path with `Vault.getFileByPath()` / `getFolderByPath()` / `getAbstractFileByPath()`; never iterate all files (`getFiles().find(...)`) to find one by path. | **[RECOMMENDED]** | These lookups are index-backed; iteration is O(n) per lookup and slow on large vaults. |
| Use `Vault.cachedRead()` when only displaying/inspecting content; reserve `Vault.read()` for read-modify-write (and prefer `process()` for that). | **[RECOMMENDED]** | `cachedRead()` avoids reading the file from disk multiple times; `read()` avoids overwriting with a stale copy in the modify case. |
| For async modifications, read with `cachedRead()`, do async work, then commit with `Vault.process()` (which re-validates), rather than holding a stale read across `await` and writing with `modify()`. | **[RECOMMENDED]** | `process()` guarantees the file didn't change between read and write, preventing data loss across the `await` boundary. |
| Call `normalizePath()` on every user-defined path AND on paths you construct before passing to Vault/Adapter APIs. | **[RECOMMENDED]** | "Use normalizePath() whenever you accept user-defined paths... or when you construct your own paths." It standardizes slashes/separators (important on Windows). |
| Resolve wiki/markdown link references with `MetadataCache.getFirstLinkpathDest(linkpath, sourcePath)`; do not implement custom link-to-path matching. Handle the `null` case. | **[RECOMMENDED]** | Applies Obsidian's own resolution rules (shortest-path, relative-to-source). Reimplementing misses these semantics. |
| Never hardcode `.obsidian` as the config directory. Read `Vault.configDir` at runtime. | **[REQUIRED]** | configDir "is typically `.obsidian` but it could be different." Users can relocate it, so a hardcoded value breaks those vaults. |
| Before operating on a `TAbstractFile` result, check its concrete type with `instanceof TFile` / `instanceof TFolder`. Likewise test `instanceof` before casting `FileSystemAdapter`. | **[RECOMMENDED]** | "Always check the concrete type of a TAbstractFile before you use it." A lookup may return a folder where you expect a file; blind casts throw or operate on the wrong object. |
| Use the `Editor` abstraction rather than reaching into the underlying CodeMirror instance (`editor.cm`). | **[RECOMMENDED]** | "By using Editor instead of directly accessing the CodeMirror instance, you ensure that your plugin works on both platforms." Direct CodeMirror access is version/platform fragile. |

**Do / Don't:**
```js
// Active note edit — Do
const view = this.app.workspace.getActiveViewOfType(MarkdownView);
if (view) view.editor.replaceSelection(newText);
// Don't: await this.app.vault.modify(activeFile, newContent); // clobbers cursor/selection/folds

// Non-active note — Do
await this.app.vault.process(file, (data) => data.replace(':)', '🙂'));
// Don't: const d = await vault.read(file); await vault.modify(file, transform(d)); // non-atomic

// Frontmatter — Do
await this.app.fileManager.processFrontMatter(file, (fm) => { fm.banner = path; });
// Don't: text = text.replace(/banner:.*/, 'banner: ' + path); // hand-edited YAML

// Lookup / path / link / config — Do
const f = this.app.vault.getFileByPath(normalizePath(p));
const dest = this.app.metadataCache.getFirstLinkpathDest(linkText, sourceFile.path);
const cfg = normalizePath(`${this.app.vault.configDir}/plugins/pixel-banner`);
if (af instanceof TFile) { /* read */ }
// Don't:
const f2 = this.app.vault.getFiles().find(f => f.path === p); // O(n) scan
const cfg2 = '.obsidian/plugins/pixel-banner';                // breaks if config dir moved
```

Sources: <https://docs.obsidian.md/Plugins/Vault> · <https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines> · <https://docs.obsidian.md/Plugins/Editor/Editor> · <https://docs.obsidian.md/Reference/TypeScript+API/FileManager/processFrontMatter> · <https://docs.obsidian.md/Reference/TypeScript+API/normalizePath> · <https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/getFirstLinkpathDest> · <https://docs.obsidian.md/Reference/TypeScript+API/Vault/configDir>

---

## 7. Performance & Async

Keep startup fast and high-frequency event handling cheap; use idiomatic async.

| Rule | Severity | Rationale |
|------|----------|-----------|
| Keep `onload()` fast; defer heavy initialization (view restoration, scans, large DOM/data work) to a `Workspace.onLayoutReady()` callback registered in `onload`. | **[RECOMMENDED]** | `onload` runs during startup and on every enable; blocking it delays the UI. `onLayoutReady` runs immediately if layout is ready, else queues until the workspace exists. |
| Debounce expensive handlers triggered by high-frequency events (`editor-change`, metadata `changed`, vault `modify`, `resize`) using the obsidian `debounce()` utility. Set `resetTimer: true` to wait for the user to pause. | **[RECOMMENDED]** | These events fire rapidly; running expensive work per fire blocks the main thread and degrades typing responsiveness. `debounce()` collapses bursts into one call. |
| Minimize work inside frequently-fired callbacks: early-return when the change is irrelevant (wrong file, no banner frontmatter) before doing expensive work. | **[RECOMMENDED]** | These callbacks fire for every file/editor change across the vault. Cheap up-front filtering avoids processing changes the plugin doesn't care about. |
| Prefer `async`/`await` over raw `.then()`/`.catch()` chains, wrapping awaited calls in `try`/`catch`. | **[RECOMMENDED]** | "Prefer async/await over Promise... which allow for more readable code." Readable async control flow reduces bugs. |
| Do not use `var`; declare with `const`/`let` (prefer `const` where not reassigned). | **[REQUIRED]** | "Prefer `const` and `let` over `var`." Block-scoping avoids hoisting/scoping bugs. |

**Do / Don't:**
```js
// Startup — Do
async onload() {
  this.addCommand({ /* cheap registration only */ });
  this.app.workspace.onLayoutReady(() => this.runExpensiveInitialScan());
}
// Don't: async onload() { await this.runExpensiveInitialScan(); } // blocks startup

// Debounce + early-return — Do
const update = debounce(() => this.refreshBanner(), 250, true);
this.registerEvent(this.app.metadataCache.on('changed', (file) => {
  if (file !== this.activeFile) return;   // cheap guard first
  update();
}));
// Don't: on('changed', () => this.refreshBanner()) // runs every keystroke

// Async — Do
try { const res = await requestUrl({ url }); } catch (e) { console.error(e); }
// Don't: requestUrl({ url }).then(res => {...}).catch(e => {...});
```

Sources: <https://docs.obsidian.md/Reference/TypeScript+API/Workspace/onLayoutReady> · <https://docs.obsidian.md/Reference/TypeScript+API/debounce> · <https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines> · <https://docs.obsidian.md/oo/plugin>

---

## 8. Networking, Mobile & Cross-Platform

Use Obsidian's CORS-free networking and guard against APIs unavailable on mobile.

| Rule | Severity | Rationale |
|------|----------|-----------|
| Use `requestUrl()` for all HTTP/HTTPS network requests instead of `fetch()` or `XMLHttpRequest`. | **[REQUIRED]** | `requestUrl()` works like `fetch()` but without CORS restrictions, reaching APIs browser fetch would block, and works reliably on mobile where direct fetch is often CORS-blocked. |
| If your plugin or any dependency calls Node.js APIs (`fs`, `path`, `os`, `crypto`, `child_process`) or Electron APIs, you MUST set `"isDesktopOnly": true` in `manifest.json`. If not needed, keep it false/absent; prefer Web API alternatives (e.g. `SubtleCrypto`, `navigator.clipboard`) to stay mobile-compatible. | **[REQUIRED]** | These APIs are unavailable on mobile and "any calls... can cause your plugin to crash." |
| Avoid calling Node/Electron-only APIs on mobile. Gate desktop-only code (e.g. `FileSystemAdapter`) behind `Platform` checks (`Platform.isDesktopApp` / `isDesktop`) with a mobile-safe path or graceful degradation; use `Platform.isIosApp` / `isAndroidApp` for OS-specific branches. (When no mobile path exists, the primary recommendation is `isDesktopOnly: true`, not runtime checks.) | **[REQUIRED]** | `FileSystemAdapter` is the "Implementation of the vault adapter for desktop." `Platform` lets plugins run conditional logic and avoid unavailable APIs. |
| Do not use lookbehind assertions (`(?<=...)` / `(?<!...)`) in regular expressions, or provide a non-lookbehind fallback. Recommended mitigation: platform/version detection. | **[REQUIRED]** | Lookbehind is only supported on iOS/iPadOS 16.4+; on earlier versions an unsupported lookbehind pattern fails to parse and can break the plugin. |
| Do not use Node's `path` module or manual slash-joining for vault paths; normalize user-defined and self-constructed paths with `normalizePath()` and prefer the Vault API to resolve/store files. | **[RECOMMENDED]** | `normalizePath()` standardizes slashes, trims leading/trailing slashes, replaces non-breaking spaces, and runs `String.prototype.normalize`. |
| Test mobile behavior before release using `this.app.emulateMobile(true)` in the dev console, and verify on a real device via `chrome://inspect` (Android) or WebKit Web Inspector (iOS 16.4+). | **[RECOMMENDED]** | Documented supported way to confirm a plugin doesn't invoke unavailable APIs on mobile. |

**Do / Don't:**
```js
// Networking — Do
import { requestUrl } from 'obsidian';
const res = await requestUrl({ url, method: 'GET' });
const data = res.json;
// Don't: const res = await fetch(url); // CORS failures on mobile

// Platform gating — Do
import { Platform, FileSystemAdapter } from 'obsidian';
if (Platform.isDesktopApp && this.app.vault.adapter instanceof FileSystemAdapter) {
  const base = this.app.vault.adapter.getBasePath();
}
// Don't: const base = this.app.vault.adapter.getBasePath(); // not a FileSystemAdapter on mobile

// Regex — Do (capture group)
const m = str.match(/(prefix)(target)/);
// Don't: const m2 = str.match(/(?<=prefix)target/); // throws on iOS < 16.4

// Paths — Do
import { normalizePath } from 'obsidian';
const p = normalizePath(userInput);
// Don't: const p2 = folder + '\\' + file; // backslashes, no normalization
```

Sources: <https://docs.obsidian.md/Reference/TypeScript+API/requestUrl> · <https://docs.obsidian.md/Plugins/Getting+started/Mobile+development> · <https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins> · <https://docs.obsidian.md/Reference/TypeScript+API/Platform> · <https://docs.obsidian.md/Reference/TypeScript+API/FileSystemAdapter> · <https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines>

---

## 9. Commands & Hotkeys

| Rule | Severity | Rationale |
|------|----------|-----------|
| Do not assign default hotkeys to commands you register. | **[REQUIRED]** | Default hotkeys conflict between plugins, the core app, and the OS; let users assign their own. |
| Do not include the plugin name or plugin ID in command names, and do not prefix command IDs with the plugin ID — Obsidian adds these automatically. | **[REQUIRED]** | Obsidian auto-prefixes command IDs and shows the plugin name in the palette; duplicating produces redundant labels like "Pixel Banner: Pixel Banner: ...". |

**Do / Don't:**
```js
// Do
this.addCommand({ id: 'select-banner', name: 'Select banner', callback });
// Don't
this.addCommand({ id: '...', name: '...', hotkeys: [{ modifiers: ['Mod'], key: 'b' }], callback });
this.addCommand({ id: 'pixel-banner-select-banner', name: 'Pixel Banner: select banner', callback });
```

Sources: <https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines> · <https://docs.obsidian.md/oo/plugin> · <https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins>

---

## 10. Submission, Policy & Disclosure

Hard requirements for the community catalog, plus developer-policy prohibitions and
disclosures.

| Rule | Severity | Rationale |
|------|----------|-----------|
| Remove `console.log` and other debug logging from production; the developer console should only show error messages. Keep only genuinely necessary logging. | **[REQUIRED]** | Excessive logging pollutes the shared developer console and is explicitly flagged in review. |
| Rename all sample/placeholder class names (`MyPlugin`, `MyPluginSettings`, `SampleSettingTab`) and remove leftover sample code before submission. | **[REQUIRED]** | Placeholder names and demo code indicate an unfinished plugin and are rejected in review. |
| Plugin `description` in `manifest.json` must be max 250 characters, end with a period, avoid emoji/special characters, start with an action statement, and not begin with "This is a plugin". | **[REQUIRED]** | Concrete, checked submission requirements for the catalog entry. |
| Include a LICENSE file and clearly indicate the license; respect Obsidian's trademark policy (only include "Obsidian" in the plugin name when it absolutely makes sense). | **[REQUIRED]** | Licensing and trademark compliance are hard requirements for inclusion. |
| Do not obfuscate code to hide its purpose. | **[REQUIRED]** | Verbatim developer-policy prohibition. (Note: a general ban on `eval`/`new Function`/remote code execution is sound security practice but is **not** a stated official Obsidian policy item.) |
| Do not include client-side telemetry. If server-side telemetry is collected, clearly disclose it in the README with a link to a privacy policy. | **[REQUIRED]** | Developer policies prohibit client-side telemetry and require disclosure + privacy policy for server-side telemetry. |
| Do not insert dynamic (network-loaded) ads, or static ads outside the plugin's own interface. | **[REQUIRED]** | Developer policies prohibit network-loaded dynamic ads and out-of-UI static ads. |
| Do not include any self-update or remote auto-update mechanism; rely on Obsidian's built-in plugin updates. | **[REQUIRED]** | Developer policies prohibit a plugin self-update mechanism, which bypasses review. |
| Clearly disclose every remote service the plugin contacts (e.g. Pixel Banner Plus, Pexels, Pixabay, Flickr, Unsplash) and why, plus any account requirement and paid/premium features, in the README. | **[REQUIRED]** | Developer policies require explaining which remote services are used and why, and disclosing account/paid requirements. |
| Avoid accessing files outside the vault on mobile; where used on desktop (e.g. `file://` banner paths), clearly explain why in the README. | **[REQUIRED]** | Developer policies require explaining non-vault file access; such access is desktop-only. |

**Do / Don't:**
```js
// Logging — Do
console.error('Pixel Banner: failed to load image', err);
// Don't: console.log('settings loaded', this.settings);

// Naming — Do
class PixelBannerSettingTab extends PluginSettingTab {}
// Don't: class SampleSettingTab extends PluginSettingTab {}
```
```jsonc
// manifest description — Do
"description": "Add customizable banner images to your notes from local files, URLs, or AI generation."
// Don't: "description": "This is a plugin that adds AWESOME banners!! 🎉"
```

Sources: <https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins> · <https://docs.obsidian.md/Developer+policies> · <https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines> · <https://docs.obsidian.md/oo/plugin>

---

## Quick Reference Checklist (REQUIRED items)

**Settings & UI text**
- [ ] Register settings via `PluginSettingTab` + `this.addSettingTab(...)`; build UI in `display()`.
- [ ] Use `Setting.setHeading()` for section headings — never raw `<h1>`/`<h2>`.
- [ ] No redundant top-level heading (plugin name / "General" / "Settings"); only add section headings when there are multiple sections; don't repeat "settings" in heading names.

**DOM & styling**
- [ ] Build DOM with `createEl`/`createDiv`/`createSpan` (+ `{ text }`); never `innerHTML`/`outerHTML`/`insertAdjacentHTML` with dynamic input.
- [ ] No styles via JS or inline `style`; use CSS classes in `styles.css`, don't override core styling. (For computed per-note banner values, feed CSS custom properties consumed by `styles.css` rather than hardcoding final visual properties.)

**Lifecycle**
- [ ] Release all resources on unload; prefer `register*` helpers.
- [ ] Use `registerEvent`, `registerDomEvent`, `registerInterval` (not bare `.on()`/`addEventListener`/`setInterval`).
- [ ] Do NOT detach your leaves in `onunload()`.
- [ ] Use `this.app`, never global `app`/`window.app`.

**Deferred views (1.7.2+)**
- [ ] `instanceof` check `leaf.view` before use; iterate leaves with `instanceof`, not `getViewType()` casts.

**Vault/files**
- [ ] Read `Vault.configDir` at runtime; never hardcode `.obsidian`.

**Performance**
- [ ] Use `const`/`let`, never `var`.

**Networking / mobile**
- [ ] Use `requestUrl()` for all HTTP requests (not `fetch`/`XHR`).
- [ ] Set `isDesktopOnly: true` if any Node/Electron API is used (self or deps).
- [ ] Gate desktop-only/`FileSystemAdapter` code behind `Platform` checks.
- [ ] No regex lookbehind without a non-lookbehind fallback (iOS < 16.4).

**Commands**
- [ ] No default hotkeys.
- [ ] No plugin name/ID in command names or ID prefixes.

**Submission & policy**
- [ ] Remove debug `console.log`; console shows errors only.
- [ ] Rename sample/placeholder classes; remove sample code.
- [ ] `manifest.json` description ≤250 chars, ends with a period, no emoji, action-statement start, not "This is a plugin".
- [ ] Include LICENSE; comply with trademark policy.
- [ ] No code obfuscation.
- [ ] No client-side telemetry; disclose server-side telemetry + privacy policy.
- [ ] No network-loaded dynamic ads or out-of-UI static ads.
- [ ] No plugin self-update mechanism.
- [ ] Disclose all remote services, account requirements, and paid features in README.
- [ ] Avoid out-of-vault file access on mobile; disclose desktop `file://` usage in README.

---

## Sources

- <https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines>
- <https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins>
- <https://docs.obsidian.md/Developer+policies>
- <https://docs.obsidian.md/oo/plugin>
- <https://docs.obsidian.md/Plugins/User+interface/Settings>
- <https://docs.obsidian.md/Plugins/User+interface/HTML+elements>
- <https://docs.obsidian.md/Plugins/User+interface/Views>
- <https://docs.obsidian.md/Plugins/Getting+started/Anatomy+of+a+plugin>
- <https://docs.obsidian.md/Plugins/Getting+started/Mobile+development>
- <https://docs.obsidian.md/Plugins/Events>
- <https://docs.obsidian.md/Plugins/Vault>
- <https://docs.obsidian.md/Plugins/Editor/Editor>
- <https://docs.obsidian.md/plugins/guides/defer-views>
- <https://docs.obsidian.md/plugins/guides/load-time>
- <https://docs.obsidian.md/Reference/TypeScript+API/Setting/setHeading>
- <https://docs.obsidian.md/Reference/TypeScript+API/Component/registerDomEvent>
- <https://docs.obsidian.md/Reference/TypeScript+API/Component/registerInterval>
- <https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceLeaf/isDeferred>
- <https://docs.obsidian.md/Reference/TypeScript+API/WorkspaceLeaf/loadIfDeferred>
- <https://docs.obsidian.md/Reference/TypeScript+API/Workspace/onLayoutReady>
- <https://docs.obsidian.md/Reference/TypeScript+API/Workspace/getActiveViewOfType>
- <https://docs.obsidian.md/Reference/TypeScript+API/FileManager/processFrontMatter>
- <https://docs.obsidian.md/Reference/TypeScript+API/normalizePath>
- <https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/getFirstLinkpathDest>
- <https://docs.obsidian.md/Reference/TypeScript+API/Vault/configDir>
- <https://docs.obsidian.md/Reference/TypeScript+API/requestUrl>
- <https://docs.obsidian.md/Reference/TypeScript+API/debounce>
- <https://docs.obsidian.md/Reference/TypeScript+API/Platform>
- <https://docs.obsidian.md/Reference/TypeScript+API/FileSystemAdapter>
