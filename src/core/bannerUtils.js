import { MarkdownView } from 'obsidian';

function getInputType(input) {
    if (Array.isArray(input)) {
        input = input.flat()[0];
    }

    if (typeof input !== 'string') {
        return 'invalid';
    }

    // Trim the input and remove surrounding quotes if present
    input = input.trim().replace(/^["'](.*)["']$/, '$1');

    // Check if it's an Obsidian internal link
    if (input.match(/^\[{2}.*\]{2}$/) || input.match(/^"?!?\[{2}.*\]{2}"?$/)) {
        return 'obsidianLink';
    }

    try {
        new URL(input);
        return 'url';
    } catch (_) {
        // Check if the input is a valid file path within the vault
        const file = this.app.vault.getAbstractFileByPath(input);
        if (file && 'extension' in file) {
            if (file.extension.match(/^(jpg|jpeg|png|gif|bmp|svg)$/i)) {
                return 'vaultPath';
            }
        }
        // If the file doesn't exist in the vault or isn't an image, treat it as a keyword
        return 'keyword';
    }
}

function getPathFromObsidianLink(link) {
    // Remove the ! from the beginning if it exists (for render links)
    let cleanLink = link.startsWith('!') ? link.slice(1) : link;
    // Remove the [[ from the beginning
    let innerLink = cleanLink.startsWith('[[') ? cleanLink.slice(2) : cleanLink;
    // Remove the ]] from the end if it exists
    innerLink = innerLink.endsWith(']]') ? innerLink.slice(0, -2) : innerLink;
    // Split by '|' in case there's an alias
    const path = innerLink.split('|')[0];
    // Resolve
    return this.app.metadataCache.getFirstLinkpathDest(path, '');
}

async function getVaultImageUrl(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file && 'extension' in file) {
        try {
            const arrayBuffer = await this.app.vault.readBinary(file);
            // Add special handling for SVG files
            const mimeType = file.extension.toLowerCase() === 'svg' ? 
                'image/svg+xml' : 
                `image/${file.extension}`;
            const blob = new Blob([arrayBuffer], { type: mimeType });
            const url = URL.createObjectURL(blob);
            return url;
        } catch (error) {
            console.error('Error reading vault image:', error);
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
            file.extension && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(file.extension.toLowerCase())
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

    const availableProviders = [];
    if (this.settings.pexelsApiKey) availableProviders.push('pexels');
    if (this.settings.pixabayApiKey) availableProviders.push('pixabay');
    if (this.settings.flickrApiKey) availableProviders.push('flickr');
    if (this.settings.unsplashApiKey) availableProviders.push('unsplash');

    if (availableProviders.length === 0) {
        return 'pexels'; // Default fallback if no API keys are configured
    }

    return availableProviders[Math.floor(Math.random() * availableProviders.length)];
}


function hasBannerFrontmatter(file) {
    const metadata = this.app.metadataCache.getFileCache(file);
    return metadata?.frontmatter?.banner !== undefined;
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
    getPathFromObsidianLink, 
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