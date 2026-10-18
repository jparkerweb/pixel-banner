import { Notice } from 'obsidian';
import { getFieldNames, writeField } from '../core/fieldRegistry.js';


// ---------------------------
// -- get frontmatter value --
// ---------------------------
export function getFrontmatterValue(frontmatter, fieldNames) {
    if (!frontmatter || !fieldNames) return null;
    
    // Ensure fieldNames is an array
    const fields = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
    
    // Process all field names, splitting by commas if necessary
    const processedFields = fields.flatMap(field => {
        if (typeof field === 'string' && field.includes(',')) {
            return field.split(',').map(f => f.trim()).filter(f => f.length > 0);
        }
        return field;
    });
    
    // Check each field name
    for (const field of processedFields) {
        if (frontmatter.hasOwnProperty(field)) {
            const value = frontmatter[field];
            
            // Explicitly handle 0 value to prevent it being treated as falsey
            if (value === 0) {
                return 0;
            }
            
            // Convert 'true' and 'false' strings to actual boolean values
            if (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
                return value.toLowerCase() === 'true';
            }
            return value;
        }
    }
    return null;
}


// -----------------------------
// -- update note frontmatter --
// -----------------------------
// Writes the banner inside a processFrontMatter callback. An explicit usedField
// is a name the caller already read from the note, so it wins; otherwise the
// registry picks the name in use (else the primary name). Either way only that
// one banner name remains.
function writeBannerField(frontmatter, plugin, value, usedField) {
    if (!usedField) {
        writeField(frontmatter, plugin, 'banner', value);
        return;
    }

    for (const name of getFieldNames(plugin, 'banner')) {
        if (name !== usedField) delete frontmatter[name];
    }
    frontmatter[usedField] = value;
}

export async function updateNoteFrontmatter(imagePath, plugin, usedField = null) {
    const activeFile = plugin.app.workspace.getActiveFile();
    if (!activeFile) return;

    let imageReference = imagePath;
    if (plugin.settings.useShortPath) {
        const imageFile = plugin.app.vault.getAbstractFileByPath(imagePath);
        if (imageFile) {
            const allFiles = plugin.app.vault.getFiles();
            const matchingFiles = allFiles.filter(f => f.name === imageFile.name);
            imageReference = matchingFiles.length === 1 
                ? imageFile.name 
                : imageFile.path;
        }
    }

    const format = plugin.settings.imagePropertyFormat;
    // Apply the format based on the user's setting
    let bannerValue;
    if (format === 'image') {
        bannerValue = imageReference;  // Plain path
    } else if (format === '[[image]]') {
        bannerValue = `[[${imageReference}]]`;  // Wiki link
    } else {  // format === '![[image]]'
        bannerValue = `![[${imageReference}]]`;  // Embedded image
    }

    // Use Obsidian's processFrontMatter API to properly update frontmatter
    await plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
        writeBannerField(frontmatter, plugin, bannerValue, usedField);
    });

    if (plugin.settings.useShortPath && imageReference === imagePath) {
        new Notice('Banner image pinned (full path used due to duplicate filenames)');
    } else {
        new Notice('Banner image pinned');
    }
}

export async function updateNoteFrontmatterWithUrl(imageUrl, plugin, usedField = null) {
    const activeFile = plugin.app.workspace.getActiveFile();
    if (!activeFile) return;

    // Use Obsidian's processFrontMatter API to properly update frontmatter
    await plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
        writeBannerField(frontmatter, plugin, imageUrl, usedField);
    });

    new Notice('Banner image URL pinned');
}