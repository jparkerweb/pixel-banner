import { Notice } from 'obsidian';


// Banner links typed into frontmatter without quotes are not read as text by
// YAML (issue #289):
// - `banner: [[image.jpg]]` parses as a list inside a list, [["image.jpg"]].
//   The banner still shows, but the next save of the properties rewrites it
//   as `- - image.jpg` and Obsidian shows its type as "?".
// - `banner: ![[image.jpg]]` can stop Obsidian from parsing the properties at
//   all, so the note has no frontmatter and no banner.
// Pixel Banner itself always writes quoted values, and so does Obsidian's
// Properties panel; these come from hand-typed YAML. Point the user at the fix
// once per note per session instead of failing silently.

function getBannerFieldNames(fieldNames) {
    const fields = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
    return fields
        .flatMap(field => (typeof field === 'string' ? field.split(',') : []))
        .map(field => field.trim())
        .filter(field => field.length > 0);
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ------------------------------------------------------------
// -- find an unquoted banner link in parsed frontmatter --
// ------------------------------------------------------------
// Returns { field, value } with the quoted value to suggest, or null.
export function findUnquotedBannerLink(frontmatter, fieldNames) {
    if (!frontmatter) return null;
    for (const field of getBannerFieldNames(fieldNames)) {
        const value = frontmatter[field];
        if (Array.isArray(value) && value.length === 1 &&
            Array.isArray(value[0]) && value[0].length === 1 &&
            typeof value[0][0] === 'string') {
            return { field, value: `[[${value[0][0]}]]` };
        }
    }
    return null;
}

// --------------------------------------------------------------------
// -- find an unquoted banner link in raw note text --
// --------------------------------------------------------------------
// For notes whose frontmatter Obsidian could not parse at all.
// Returns { field, value } with the value as written, or null.
export function findUnquotedBannerLinkInText(text, fieldNames) {
    if (typeof text !== 'string') return null;
    const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!block) return null;
    for (const field of getBannerFieldNames(fieldNames)) {
        const line = block[1].match(new RegExp(`^${escapeRegExp(field)}:[ \\t]*(!?\\[\\[[^\\r\\n]*?)[ \\t]*$`, 'm'));
        if (line) {
            return { field, value: line[1] };
        }
    }
    return null;
}

// -------------------------------------------------------------
// -- warn once per note when a banner link is not quoted --
// -------------------------------------------------------------
// The note text is read only when Obsidian found a properties block it could
// not parse: such a note has no frontmatter but still starts with a yaml section.
export async function checkUnquotedBannerLink(plugin, file) {
    if (!file || file.extension !== 'md') return;
    if (!plugin.unquotedBannerLinkWarned) {
        plugin.unquotedBannerLinkWarned = new Set();
    }
    if (plugin.unquotedBannerLinkWarned.has(file.path)) return;

    const fieldNames = plugin.settings.customBannerField;
    const cache = plugin.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;

    let found = findUnquotedBannerLink(frontmatter, fieldNames);
    if (!found && !frontmatter && cache?.sections?.[0]?.type === 'yaml') {
        // Claim the note before reading it: a second check that starts during the read
        // (a note re-opened at startup, issue #333) must not show the notice again
        const path = file.path;
        plugin.unquotedBannerLinkWarned.add(path);
        try {
            const content = await plugin.app.vault.cachedRead(file);
            found = findUnquotedBannerLinkInText(content, fieldNames);
        } finally {
            if (!found) plugin.unquotedBannerLinkWarned.delete(path);
        }
    }
    if (!found) return;

    plugin.unquotedBannerLinkWarned.add(file.path);
    new Notice(
        `Pixel Banner: the "${found.field}" property in "${file.basename}" is not in quotes, ` +
        `so it can't be read correctly. Write it as ${found.field}: "${found.value}" (with the quotes).`,
        12000
    );
}

// ---------------------------------------------------------------
// -- check a note once it has settled after an edit --
// ---------------------------------------------------------------
// Metadata "changed" fires while a value is still being typed, so checking at
// once could report a half-typed link (and then never the real one). Wait for
// the note to stop changing, then check it against fresh metadata.
export const UNQUOTED_BANNER_LINK_SETTLE_MS = 3000;
export function scheduleUnquotedBannerLinkCheck(plugin, file) {
    // No early return for a note already in unquotedBannerLinkWarned: a check that is
    // still reading the note claims it there, and an edit made during that read must
    // still get its own check (checkUnquotedBannerLink skips a warned note itself)
    if (!file || file.extension !== 'md') return;
    if (!plugin.unquotedBannerLinkTimers) {
        plugin.unquotedBannerLinkTimers = new Map();
        // Clear pending checks when the plugin unloads
        plugin.register?.(() => {
            plugin.unquotedBannerLinkTimers.forEach(timer => clearTimeout(timer));
            plugin.unquotedBannerLinkTimers.clear();
        });
    }
    const timers = plugin.unquotedBannerLinkTimers;
    // Key by the path at schedule time: a rename changes file.path on the same TFile
    const path = file.path;
    clearTimeout(timers.get(path));
    const timer = setTimeout(() => {
        if (timers.get(path) === timer) {
            timers.delete(path);
        }
        // Only notes the person is looking at: sync or a re-index fires "changed" for
        // many notes at once, and a closed note is checked when it is opened
        const isOpen = plugin.app.workspace.getLeavesOfType('markdown')
            .some(leaf => leaf.view?.file === file);
        if (!isOpen) return;
        checkUnquotedBannerLink(plugin, file).catch(() => {});
    }, UNQUOTED_BANNER_LINK_SETTLE_MS);
    timers.set(path, timer);
}
