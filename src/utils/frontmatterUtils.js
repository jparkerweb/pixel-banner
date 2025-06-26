import { Notice } from 'obsidian';


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
// ----------------------------
// -- get value with zero check --
// ----------------------------
/**
 * Gets a value from multiple sources, properly handling zero values
 * @param {Array<any>} values - Array of values to check in order of priority
 * @returns {any} The first non-falsy value found, properly handling zero values
 * 
 * @example
 * // Returns the first valid value (handling zeros properly)
 * const result = getValueWithZeroCheck([
 *   getFrontmatterValue(frontmatter, customField),
 *   folderSpecific?.someProperty,
 *   settings.someProperty,
 *   defaultValue
 * ]);
 */
export function getValueWithZeroCheck(values) {
    if (!Array.isArray(values)) {
        console.warn('getValueWithZeroCheck expects an array of values');
        return null;
    }
    
    for (const value of values) {
        // Explicitly check for zero to handle it properly
        if (value === 0) return 0;
        
        // Return the first truthy value
        if (value !== null && value !== undefined) return value;
    }
    
    // If we get here, all values were falsy (null/undefined)
    // Return the last value in the array (which would be the default)
    return values[values.length - 1];
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

    let fileContent = await plugin.app.vault.read(activeFile);
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const hasFrontmatter = frontmatterRegex.test(fileContent);
    
    const bannerField = usedField || (Array.isArray(plugin.settings.customBannerField) && 
        plugin.settings.customBannerField.length > 0 ? 
        plugin.settings.customBannerField[0] : 'banner');

    fileContent = fileContent.replace(/^\s+/, '');

    let updatedContent;
    if (hasFrontmatter) {
        updatedContent = fileContent.replace(frontmatterRegex, (match, frontmatter) => {
            let cleanedFrontmatter = frontmatter.trim();
            
            plugin.settings.customBannerField.forEach(field => {
                const fieldRegex = new RegExp(`${field}:\\s*.+\\n?`, 'g');
                cleanedFrontmatter = cleanedFrontmatter.replace(fieldRegex, '');
            });

            const format = plugin.settings.imagePropertyFormat;
            const bannerValue = format === '[[image]]' ? `[[${imageReference}]]` : `![[${imageReference}]]`;
            const newFrontmatter = `${bannerField}: "${bannerValue}"${cleanedFrontmatter ? '\n' + cleanedFrontmatter : ''}`;
            return `---\n${newFrontmatter}\n---`;
        });
    } else {
        const cleanContent = fileContent.replace(/^\s+/, '');
        const format = plugin.settings.imagePropertyFormat;
        const bannerValue = format === '[[image]]' ? `[[${imageReference}]]` : `![[${imageReference}]]`;
        updatedContent = `---\n${bannerField}: "${bannerValue}"\n---\n\n${cleanContent}`;
    }

    updatedContent = updatedContent.replace(/^\s+/, '');
    
    if (updatedContent !== fileContent) {
        await plugin.app.vault.modify(activeFile, updatedContent);
        if (plugin.settings.useShortPath && imageReference === imagePath) {
            new Notice('Banner image pinned (full path used due to duplicate filenames)');
        } else {
            new Notice('Banner image pinned');
        }
    }
}