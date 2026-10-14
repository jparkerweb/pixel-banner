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
// `text` is the note content when the caller already has it (metadata
// "changed" event); otherwise it is read only for notes with an unparsed
// frontmatter block.
export async function checkUnquotedBannerLink(plugin, file, text = null) {
    if (!file || file.extension !== 'md') return;
    if (!plugin.unquotedBannerLinkWarned) {
        plugin.unquotedBannerLinkWarned = new Set();
    }
    if (plugin.unquotedBannerLinkWarned.has(file.path)) return;

    const fieldNames = plugin.settings.customBannerField;
    const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter;

    let found = findUnquotedBannerLink(frontmatter, fieldNames);
    if (!found && !frontmatter) {
        const content = typeof text === 'string' ? text : await plugin.app.vault.cachedRead(file);
        if (content.startsWith('---')) {
            found = findUnquotedBannerLinkInText(content, fieldNames);
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
