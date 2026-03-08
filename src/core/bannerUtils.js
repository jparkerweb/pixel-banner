import { MarkdownView } from 'obsidian';

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

    // Check if it's a Markdown image syntax (![](path.jpg) format)
    if (input.match(/^!\[\]\(.*\)$/) || input.match(/^"?!\[\]\(.*\)"?$/)) {
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

function getPathFromMarkdownImage(link) {
    // Remove surrounding quotes if they exist
    let cleanLink = link.replace(/^["'](.*)["']$/, '$1');
    
    // Extract the URL from the Markdown image syntax ![](url)
    const match = cleanLink.match(/^!\[\]\((.*)\)$/);
    if (match && match[1]) {
        const path = match[1];
        
        // Check if it's a URL
        try {
            new URL(path);
            return path; // It's a URL, return as is
        } catch (_) {
            // It's a vault path, resolve it
            return this.app.metadataCache.getFirstLinkpathDest(path, '');
        }
    }
    
    return null;
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
            
            // Handle images as before with blob URLs
            const arrayBuffer = await this.app.vault.readBinary(file);
            
            // Add special handling for SVG files
            const mimeType = fileExt === 'svg' ? 
                'image/svg+xml' : 
                `image/${fileExt}`;
            const blob = new Blob([arrayBuffer], { type: mimeType });
            const url = URL.createObjectURL(blob);
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

    // Check if it's a Markdown image syntax (![](path.jpg) format)
    if (input.match(/^!\[\]\(.*\)$/) || input.match(/^"?!\[\]\(.*\)"?$/)) {
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


function getFolderSpecificSetting(filePath, settingName) {
    const folderPath = this.getFolderPath(filePath);
    for (const folderImage of this.settings.folderImages) {
        if (folderPath.startsWith(folderImage.folder)) {
            // Use nullish coalescing to properly handle 0 values
            return folderImage[settingName] ?? undefined;
        }
    }
    return undefined;
}


function getRandomImageFromFolder(folderPath) {
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
    getVaultImageUrl, 
    preloadImage, 
    getFolderPath, 
    getFolderSpecificImage, 
    getFolderSpecificSetting, 
    getRandomImageFromFolder, 
    getActiveApiProvider, 
    hasBannerFrontmatter, 
    createFolderImageSettings 
};