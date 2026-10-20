import { MarkdownView } from 'obsidian';
import { getFieldNames } from './fieldRegistry.js';

// Whether the value has the shape of a Markdown image or link, ![alt](target) or
// [text](target), even with an empty target: an empty link shows no banner, it
// must not fall through to a keyword image search. The alt text may hold one
// level of nested brackets, as in [My [v2] banner.jpg](...)
const MARKDOWN_LINK_PATTERN = /^!?\[(?:[^\[\]]|\[[^\[\]]*\])*\]\((.*)\)$/;

function isMarkdownLink(input) {
    if (typeof input !== 'string') return false;
    return MARKDOWN_LINK_PATTERN.test(input.trim().replace(/^["'](.*)["']$/, '$1'));
}

// Target of a Markdown image or link: ![alt](target) or [text](target), the
// form Obsidian writes when "Use [[Wikilinks]]" is off (issue #310). Handles
// <angle bracket> targets, a trailing "title", 'title' or (title) with or
// without angle brackets, and %20-style encoding of vault paths. Returns null
// when the input is not a Markdown image or link.
function getMarkdownLinkTarget(input) {
    if (typeof input !== 'string') return null;
    const cleaned = input.trim().replace(/^["'](.*)["']$/, '$1');
    const match = cleaned.match(MARKDOWN_LINK_PATTERN);
    if (!match) return null;

    let target = match[1].trim();
    const angled = target.match(/^<([^>]*)>(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?$/);
    if (angled) {
        target = angled[1];
    } else {
        target = target.replace(/\s+(?:"[^"]*"|'[^']*'|\([^)]*\))$/, '');
    }
    if (!target) return null;

    // URLs stay as written; vault paths are stored URL-encoded
    try {
        new URL(target);
        return target;
    } catch (_) {
        try {
            return decodeURIComponent(target);
        } catch (_) {
            return target;
        }
    }
}

function getInputType(input, sourcePath = '') {
    if (Array.isArray(input)) {
        input = input.flat()[0];
    }

    if (typeof input !== 'string') {
        return 'invalid';
    }

    // Trim the input and remove surrounding quotes if present
    let cleanedInput = input.trim().replace(/^["'](.*)["']$/, '$1');
    // remove markdown image and link syntax
    cleanedInput = cleanedInput.replace(/^!\[\[(.*)\]\]$/, '$1').replace(/^\[\[(.*)\]\]$/, '$1');

    // Check for file:/// protocol
    if (cleanedInput.includes('file:///')) {
        return 'fileUrl';
    }

    // Check if it's an Obsidian internal link (both quoted and unquoted)
    if (input.match(/^!?\[{2}.*\]{2}$/) || input.match(/^"?!?\[{2}.*\]{2}"?$/)) {
        return 'obsidianLink';
    }

    // Check if it's a Markdown image or link (![alt](path.jpg) or [text](path.jpg))
    if (isMarkdownLink(input)) {
        return 'markdownImage';
    }

    try {
        new URL(cleanedInput);
        return 'url';
    } catch (_) {
        // First try exact path match
        const file = this.app.vault.getAbstractFileByPath(cleanedInput);
        if (file && 'extension' in file) {
            if (file.extension.match(/^(jpg|jpeg|png|gif|bmp|svg|webp|avif|mp4|mov)$/i)) {
                return 'vaultPath';
            }
        }

        // If exact path doesn't work, try resolving as a partial path using getFirstLinkpathDest
        const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(cleanedInput, sourcePath);
        if (resolvedFile && 'extension' in resolvedFile) {
            if (resolvedFile.extension.match(/^(jpg|jpeg|png|gif|bmp|svg|webp|avif|mp4|mov)$/i)) {
                return 'vaultPath';
            }
        }

        // If the file doesn't exist in the vault or isn't an image, treat it as a keyword
        return 'keyword';
    }
}

function getPathFromObsidianLink(link) {
    // Remove surrounding quotes if they exist
    let cleanLink = link.replace(/^["'](.*)["']$/, '$1');
    
    // Remove the ! from the beginning if it exists (for render links)
    cleanLink = cleanLink.startsWith('!') ? cleanLink.slice(1) : cleanLink;
    
    // Remove the [[ from the beginning
    let innerLink = cleanLink.startsWith('[[') ? cleanLink.slice(2) : cleanLink;
    
    // Remove the ]] from the end if it exists
    innerLink = innerLink.endsWith(']]') ? innerLink.slice(0, -2) : innerLink;
    
    // Split by '|' in case there's an alias
    const path = innerLink.split('|')[0];
    
    // Resolve
    return this.app.metadataCache.getFirstLinkpathDest(path, '');
}

function getPathFromMarkdownImage(link, sourcePath = '') {
    // Extract the target from ![alt](target) or [text](target)
    const path = getMarkdownLinkTarget(link);
    if (path) {
        // Check if it's a URL
        try {
            new URL(path);
            return path; // It's a URL, return as is
        } catch (_) {
            // It's a vault path (full, shortest or relative to the note), resolve it.
            // Only a file counts as an exact match: a folder at that path must not
            // stop link resolution
            const exact = this.app.vault.getAbstractFileByPath(path);
            if (exact && 'extension' in exact) {
                return exact;
            }
            return this.app.metadataCache.getFirstLinkpathDest(path, sourcePath);
        }
    }
    
    return null;
}

// One blob URL per vault image (keyed by vault path, with the file's mtime), shared by
// every note and pane that shows it. A new blob per update was never revoked: the
// banner cache holds the { url } object, which the string-only revoke sites skip.
// Reusing the URL also spares a note that shows the same image a new decode (#327).
// An entry is replaced (and its URL revoked) when the file changes, and all of
// them are revoked when the plugin unloads (releaseAllVaultImageUrls).
const vaultImageBlobUrls = new Map();

function getCachedVaultImageUrl(file) {
    const cached = vaultImageBlobUrls.get(file.path);
    return cached && cached.mtime === file.stat?.mtime ? cached.url : null;
}

// Whether the URL is a shared vault image blob, which only this cache may revoke
function isVaultImageBlobUrl(url) {
    if (typeof url !== 'string') return false;
    for (const entry of vaultImageBlobUrls.values()) {
        if (entry.url === url) return true;
    }
    return false;
}

// Drop and revoke the cache entry holding this URL (it failed to load), so the
// next request reads the file again
function releaseVaultImageBlobUrl(url) {
    for (const [path, entry] of vaultImageBlobUrls) {
        if (entry.url === url) {
            vaultImageBlobUrls.delete(path);
            URL.revokeObjectURL(url);
        }
    }
}

function releaseAllVaultImageUrls() {
    for (const entry of vaultImageBlobUrls.values()) {
        URL.revokeObjectURL(entry.url);
    }
    vaultImageBlobUrls.clear();
}

async function getVaultImageUrl(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file && 'extension' in file) {
        try {
            const fileExt = file.extension.toLowerCase();
            
            // Handle video files differently - use direct resource URL instead of blob
            const videoExtensions = ['mp4', 'mov'];
            if (videoExtensions.includes(fileExt)) {
                // Use direct resource URL for better persistence
                const resourcePath = this.app.vault.getResourcePath(file);
                return {
                    url: resourcePath,
                    isVideo: true,
                    fileType: fileExt,
                    // Store original path to help with caching
                    originalPath: path
                };
            }
            
            // Images use a blob URL, shared while the file is unchanged
            const cachedUrl = getCachedVaultImageUrl(file);
            if (cachedUrl) {
                return { url: cachedUrl, isVideo: false, fileType: fileExt };
            }

            const arrayBuffer = await this.app.vault.readBinary(file);

            // Another update for the same image may have created it while we read
            const racedUrl = getCachedVaultImageUrl(file);
            if (racedUrl) {
                return { url: racedUrl, isVideo: false, fileType: fileExt };
            }

            // Add special handling for SVG files
            const mimeType = fileExt === 'svg' ?
                'image/svg+xml' :
                `image/${fileExt}`;
            const blob = new Blob([arrayBuffer], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const previous = vaultImageBlobUrls.get(file.path);
            if (previous) {
                URL.revokeObjectURL(previous.url);
            }
            vaultImageBlobUrls.set(file.path, { url, mtime: file.stat?.mtime });
            return {
                url: url,
                isVideo: false,
                fileType: fileExt
            };
        } catch (error) {
            console.error('Error reading vault file:', error);
            return null;
        }
    }
    return null;
}

function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = reject;
        img.src = url;
    });
}

function getIconImageInputType(input, sourcePath = '') {
    if (Array.isArray(input)) {
        input = input.flat()[0];
    }

    if (typeof input !== 'string') {
        return 'invalid';
    }

    // Trim the input and remove surrounding quotes if present
    let cleanedInput = input.trim().replace(/^["'](.*)["']$/, '$1');
    // remove markdown image and link syntax
    cleanedInput = cleanedInput.replace(/^!\[\[(.*)\]\]$/, '$1').replace(/^\[\[(.*)\]\]$/, '$1');

    // Check for file:/// protocol
    if (cleanedInput.includes('file:///')) {
        return 'fileUrl';
    }

    // Check if it's an Obsidian internal link (both quoted and unquoted)
    if (input.match(/^!?\[{2}.*\]{2}$/) || input.match(/^"?!?\[{2}.*\]{2}"?$/)) {
        return 'obsidianLink';
    }

    // Check if it's a Markdown image or link (![alt](path.jpg) or [text](path.jpg))
    if (isMarkdownLink(input)) {
        return 'markdownImage';
    }

    try {
        new URL(cleanedInput);
        return 'url';
    } catch (_) {
        // First try exact path match
        const file = this.app.vault.getAbstractFileByPath(cleanedInput);
        if (file && 'extension' in file) {
            if (file.extension.match(/^(jpg|jpeg|png|gif|bmp|svg|webp|avif|mp4|mov)$/i)) {
                return 'vaultPath';
            }
        }

        // For icon images, be more aggressive about trying partial path resolution
        // Try resolving as a partial path using getFirstLinkpathDest
        const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(cleanedInput, sourcePath);
        if (resolvedFile && 'extension' in resolvedFile) {
            if (resolvedFile.extension.match(/^(jpg|jpeg|png|gif|bmp|svg|webp|avif|mp4|mov)$/i)) {
                return 'vaultPath';
            }
        }

        // If no file found, treat as keyword (which will be ignored for icon images)
        return 'keyword';
    }
}


function getFolderPath(filePath) {
    if (!filePath) return '/';
    if (!filePath.includes('/')) {
        return '/';
    }
    const lastSlashIndex = filePath.lastIndexOf('/');
    return lastSlashIndex !== -1 ? filePath.substring(0, lastSlashIndex) : '';
}


function getFolderSpecificImage(filePath) {
    if (!filePath) return null;
    const folderPath = this.getFolderPath(filePath);

    // Sort folder images by path length (descending) to match most specific paths first
    const sortedFolderImages = [...this.settings.folderImages].sort((a, b) => 
        (b.folder?.length || 0) - (a.folder?.length || 0)
    );

    for (const folderImage of sortedFolderImages) {
        if (!folderImage.folder) continue;

        // Handle root folder case
        if (folderImage.folder === '/') {
            if (folderImage.directChildrenOnly) {
                // For root with directChildrenOnly, only match files directly in root
                if (!filePath.includes('/')) {
                    return this.createFolderImageSettings(folderImage);
                }
            } else {
                // For root without directChildrenOnly, match all files
                return this.createFolderImageSettings(folderImage);
            }
            continue;
        }

        // Normal folder path handling
        const normalizedFolderPath = folderImage.folder.startsWith('/') ? 
            folderImage.folder : 
            '/' + folderImage.folder;
        
        const normalizedFileFolderPath = '/' + folderPath;

        if (folderImage.directChildrenOnly) {
            // Exact match for direct children
            if (normalizedFileFolderPath === normalizedFolderPath) {
                return this.createFolderImageSettings(folderImage);
            }
        } else {
            // Match any file in this folder or its subfolders
            if (normalizedFileFolderPath.startsWith(normalizedFolderPath)) {
                return this.createFolderImageSettings(folderImage);
            }
        }
    }
    return null;
}


function getRandomImageFromFolder(folderPath) {
    if (typeof folderPath !== 'string' || !folderPath) return null;
    try {
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!folder || !folder.children) return null;

        const imageFiles = folder.children.filter(file => 
            file.extension && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(file.extension.toLowerCase())
        );

        if (imageFiles.length === 0) return null;
        const randomImage = imageFiles[Math.floor(Math.random() * imageFiles.length)];
        return randomImage.path;
    } catch (error) {
        console.error('Error getting random image:', error);
        return null;
    }
}


function getActiveApiProvider() {
    if (this.settings.apiProvider !== 'all') {
        return this.settings.apiProvider;
    }

    // Check if apiProviders array is configured and use its order
    if (this.settings.apiProviders && Array.isArray(this.settings.apiProviders)) {
        for (const provider of this.settings.apiProviders) {
            // Check if this provider has an API key configured
            const hasKey = (
                (provider === 'pexels' && this.settings.pexelsApiKey) ||
                (provider === 'pixabay' && this.settings.pixabayApiKey) ||
                (provider === 'flickr' && this.settings.flickrApiKey) ||
                (provider === 'unsplash' && this.settings.unsplashApiKey)
            );
            if (hasKey) {
                return provider;
            }
        }
    }

    // Fallback to the original random selection logic if no apiProviders configured
    const availableProviders = [];
    if (this.settings.pexelsApiKey) availableProviders.push('pexels');
    if (this.settings.pixabayApiKey) availableProviders.push('pixabay');
    if (this.settings.flickrApiKey) availableProviders.push('flickr');
    if (this.settings.unsplashApiKey) availableProviders.push('unsplash');

    if (availableProviders.length === 0) {
        return null; // Return null if no API keys are configured
    }

    return availableProviders[Math.floor(Math.random() * availableProviders.length)];
}


function hasBannerFrontmatter(file) {
    const metadata = this.app.metadataCache.getFileCache(file);
    if (!metadata?.frontmatter) return false;
    
    // Check all possible banner field names from settings
    return this.settings.customBannerField.some(fieldName => 
        metadata.frontmatter[fieldName] !== undefined
    );
}

// Whether the note gets a banner from any source: a banner field, a shuffle field, or its folder's
// settings (an image or an enabled shuffle folder). hasBannerFrontmatter() alone means only "this
// note names a banner"
function hasBannerSource(file) {
    if (this.hasBannerFrontmatter(file)) return true;

    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (frontmatter && getFieldNames(this, 'shuffle').some(field => frontmatter[field])) return true;

    const folderImage = this.getFolderSpecificImage(file.path);
    return !!(folderImage && (folderImage.image || (folderImage.enableImageShuffle && folderImage.shuffleFolder)));
}

// Whether the note has a banner source or an icon, the condition for the Position, Size & Style
// button and command now that a note can show an icon without a banner
function hasBannerOrIcon(file) {
    if (this.hasBannerSource(file)) return true;

    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (!frontmatter) return false;

    return ['icon', 'iconImage'].some(id => getFieldNames(this, id).some(field => {
        const value = frontmatter[field];
        return typeof value === 'string' ? value.trim().length > 0 : (value !== undefined && value !== null && value !== false);
    }));
}

// Helper method to create folder image settings object
function createFolderImageSettings(folderImage) {
    const settings = { ...folderImage };

    // If image shuffle is enabled and shuffle folder is specified, get a random image
    if (folderImage.enableImageShuffle && folderImage.shuffleFolder) {
        const randomImagePath = this.getRandomImageFromFolder(folderImage.shuffleFolder);
        if (randomImagePath) {
            // Format as internal link for Obsidian
            settings.image = randomImagePath;
        }
    }

    return settings;
}

export {
    getInputType, 
    getIconImageInputType,
    getPathFromObsidianLink, 
    getPathFromMarkdownImage, 
    getMarkdownLinkTarget,
    isMarkdownLink,
    getVaultImageUrl,
    isVaultImageBlobUrl,
    releaseVaultImageBlobUrl,
    releaseAllVaultImageUrls,
    preloadImage,
    getFolderPath, 
    getFolderSpecificImage, 
    getRandomImageFromFolder, 
    getActiveApiProvider, 
    hasBannerFrontmatter,
    hasBannerSource,
    hasBannerOrIcon,
    createFolderImageSettings
};