import { Plugin, MarkdownView, requestUrl, Notice, Modal, FuzzySuggestModal } from 'obsidian';
import { DEFAULT_SETTINGS, PixelBannerSettingTab, debounce } from './settings';
import { ReleaseNotesModal } from './modals';
import { releaseNotes } from 'virtual:release-notes';

module.exports = class PixelBannerPlugin extends Plugin {
    debounceTimer = null;
    loadedImages = new Map();
    lastKeywords = new Map();
    imageCache = new Map();
    rateLimiter = {
        lastRequestTime: 0,
        minInterval: 1000 // 1 second between requests
    };
    lastYPositions = new Map();
    lastFrontmatter = new Map();

    async onload() {
        await this.loadSettings();
        
        // Check version and show release notes if needed
        await this.checkVersion();
        
        this.addSettingTab(new PixelBannerSettingTab(this.app, this));
        
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', this.handleActiveLeafChange.bind(this))
        );

        this.registerEvent(
            this.app.metadataCache.on('changed', async (file) => {
                // Get the frontmatter
                const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
                if (!frontmatter) return;

                // Get the previous frontmatter
                const previousFrontmatter = this.lastFrontmatter.get(file.path);
                
                // Check if frontmatter actually changed
                if (JSON.stringify(frontmatter) === JSON.stringify(previousFrontmatter)) {
                    return;
                }

                // Check if any relevant fields exist and changed in the frontmatter
                const relevantFields = [
                    ...this.settings.customBannerField,
                    ...this.settings.customYPositionField,
                    ...this.settings.customContentStartField,
                    ...this.settings.customImageDisplayField,
                    ...this.settings.customImageRepeatField,
                    ...this.settings.customBannerHeightField,
                    ...this.settings.customFadeField,
                    ...this.settings.customBorderRadiusField
                ];

                const hasRelevantFieldChange = relevantFields.some(field => 
                    frontmatter[field] !== previousFrontmatter?.[field]
                );
                
                if (!hasRelevantFieldChange) return;

                // Update the stored frontmatter
                this.lastFrontmatter.set(file.path, frontmatter);

                // Find all visible markdown leaves for this file
                const leaves = this.app.workspace.getLeavesOfType("markdown");
                for (const leaf of leaves) {
                    // Check if the leaf is visible and matches the file
                    if (leaf.view instanceof MarkdownView && 
                        leaf.view.file === file && 
                        !leaf.containerEl.style.display && 
                        leaf.containerEl.matches('.workspace-leaf')) {
                        // Force a refresh of the banner
                        this.loadedImages.delete(file.path);
                        this.lastKeywords.delete(file.path);
                        await this.updateBanner(leaf.view, true);
                    }
                }
            })
        );

        this.registerEvent(
            this.app.workspace.on('layout-change', this.handleLayoutChange.bind(this))
        );

        // Add event listener for mode change
        this.registerEvent(
            this.app.workspace.on('mode-change', this.handleModeChange.bind(this))
        );

        this.registerMarkdownPostProcessor(this.postProcessor.bind(this));

        this.setupMutationObserver();

        // Add command for pinning current banner image
        this.addCommand({
            id: 'pin-banner-image',
            name: '📌 Pin current banner image',
            checkCallback: (checking) => {
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (!activeView || !activeView.file) return false;

                // Get the current banner image URL and check all possible banner fields
                const imageUrl = this.loadedImages.get(activeView.file.path);
                const frontmatter = this.app.metadataCache.getFileCache(activeView.file)?.frontmatter;
                let bannerImage, usedField;

                // Check all custom banner fields
                for (const field of this.settings.customBannerField) {
                    if (frontmatter?.[field]) {
                        bannerImage = frontmatter[field];
                        usedField = field;
                        break;
                    }
                }

                const inputType = this.getInputType(bannerImage);
                const canPin = imageUrl && inputType === 'keyword' && this.settings.showPinIcon;
                
                if (checking) return canPin;

                if (canPin) {
                    setTimeout(() => handlePinIconClick(imageUrl, this, usedField), 0);
                }
                return true;
            }
        });

        // Add command for refreshing current banner image
        this.addCommand({
            id: 'refresh-banner-image',
            name: '🔄 Refresh current banner image',
            checkCallback: (checking) => {
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (!activeView || !activeView.file) return false;

                // Get the current banner settings and check all possible banner fields
                const frontmatter = this.app.metadataCache.getFileCache(activeView.file)?.frontmatter;
                let bannerImage;

                // Check all custom banner fields
                for (const field of this.settings.customBannerField) {
                    if (frontmatter?.[field]) {
                        bannerImage = frontmatter[field];
                        break;
                    }
                }

                const inputType = this.getInputType(bannerImage);
                const canRefresh = inputType === 'keyword' && this.settings.showPinIcon && this.settings.showRefreshIcon;
                
                if (checking) return canRefresh;

                if (canRefresh) {
                    this.loadedImages.delete(activeView.file.path);
                    this.lastKeywords.delete(activeView.file.path);
                    this.updateBanner(activeView, true).then(() => {
                        new Notice('🔄 Refreshed banner image');
                    }).catch(error => {
                        console.error('Error refreshing image:', error);
                        new Notice('😭 Failed to refresh image');
                    });
                }
                return true;
            }
        });

        this.registerEvent(
            this.app.workspace.on('editor-change', async (editor) => {
                // Get the active view and file
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (!activeView || !activeView.file) return;

                // Get the current frontmatter
                const currentFrontmatter = this.app.metadataCache.getFileCache(activeView.file)?.frontmatter;
                
                // Only proceed if we have frontmatter with pixel banner fields
                if (!currentFrontmatter || 
                    (!currentFrontmatter.hasOwnProperty('pixel-banner') && 
                     !currentFrontmatter.hasOwnProperty('pixel-banner-query'))) {
                    return;
                }

                // Get the changed content
                const cursor = editor.getCursor();
                const line = editor.getLine(cursor.line);
                
                // Check if the edited line contains pixel banner fields
                if (!line.includes('pixel-banner') && !line.includes('pixel-banner-query')) {
                    return;
                }

                // Existing code to handle the banner update
                await this.updateBanner(activeView, true);
            })
        );
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        
        // Migrate custom fields from string to array if necessary
        this.migrateCustomFields();
        
        // Ensure folderImages is always an array
        if (!Array.isArray(this.settings.folderImages)) {
            this.settings.folderImages = [];
        }

        if (this.settings.folderImages) {
            this.settings.folderImages.forEach(folderImage => {
                folderImage.imageDisplay = folderImage.imageDisplay || 'cover';
                folderImage.imageRepeat = folderImage.imageRepeat || false;
                folderImage.directChildrenOnly = folderImage.directChildrenOnly || false; // New setting
            });
        }
    }

    migrateCustomFields() {
        const fieldsToMigrate = [
            'customBannerField',
            'customYPositionField',
            'customContentStartField',
            'customImageDisplayField',
            'customImageRepeatField'
        ];

        fieldsToMigrate.forEach(field => {
            if (typeof this.settings[field] === 'string') {
                console.log(`converting ${field} to array`);
                this.settings[field] = [this.settings[field]];
            } else if (!Array.isArray(this.settings[field])) {
                console.log(`setting default value for ${field}`);
                this.settings[field] = DEFAULT_SETTINGS[field];
            }
        });

        // Save the migrated settings
        this.saveSettings();
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.loadedImages.clear();
        this.lastKeywords.clear();
        this.imageCache.clear();
        
        // Update all banners and field visibility
        this.app.workspace.iterateAllLeaves(leaf => {
            if (leaf.view instanceof MarkdownView) {
                this.updateBanner(leaf.view, true);
                if (this.settings.hidePixelBannerFields) {
                    this.updateFieldVisibility(leaf.view);
                }
            }
        });
    }

    async handleActiveLeafChange(leaf) {
        // Clean up banner from the previous note first
        const previousLeaf = this.app.workspace.activeLeaf;
        if (previousLeaf && previousLeaf.view instanceof MarkdownView) {
            const previousContentEl = previousLeaf.view.contentEl;
            // Remove pixel-banner class
            previousContentEl.classList.remove('pixel-banner');
            // Clean up banner in both edit and preview modes
            ['cm-sizer', 'markdown-preview-sizer'].forEach(selector => {
                const container = previousContentEl.querySelector(`.${selector}`);
                if (container) {
                    const previousBanner = container.querySelector('.pixel-banner-image');
                    if (previousBanner) {
                        previousBanner.style.backgroundImage = '';
                        previousBanner.style.display = 'none';
                        // Clean up any existing blob URLs
                        if (previousLeaf.view.file) {
                            const existingUrl = this.loadedImages.get(previousLeaf.view.file.path);
                            if (existingUrl?.startsWith('blob:')) {
                                URL.revokeObjectURL(existingUrl);
                            }
                            this.loadedImages.delete(previousLeaf.view.file.path);
                        }
                    }
                }
            });
        }

        // Then handle the new leaf
        if (leaf && leaf.view instanceof MarkdownView && leaf.view.file) {
            await this.updateBanner(leaf.view, false);
        }
    }

    handleLayoutChange() {
        // Use setTimeout to give the view a chance to fully render
        setTimeout(() => {
            const activeLeaf = this.app.workspace.activeLeaf;
            if (activeLeaf && (activeLeaf.view instanceof MarkdownView || activeLeaf.view.getViewType() === "markdown")) {
                this.updateBanner(activeLeaf.view, false);
            }
        }, 100); // 100ms delay
    }

    async handleModeChange(leaf) {
        if (leaf && leaf.view instanceof MarkdownView && leaf.view.file) {
            await this.updateBanner(leaf.view, true);
            // Handle field visibility when mode changes
            if (this.settings.hidePixelBannerFields) {
                this.updateFieldVisibility(leaf.view);
            }
        }
    }

    async updateBanner(view, isContentChange) {
        if (!view || !view.file) {
            return;
        }

        const frontmatter = this.app.metadataCache.getFileCache(view.file)?.frontmatter;
        const contentEl = view.contentEl;
        const isEmbedded = contentEl.classList.contains('internal-embed');

        // Get existing banner before trying to use it
        const existingBanner = contentEl.querySelector('.pixel-banner-image');
        
        // Only clear classes and existing banner for non-embedded notes AND when there's no banner image
        const folderSpecific = this.getFolderSpecificImage(view.file.path);
        let bannerImage = getFrontmatterValue(frontmatter, this.settings.customBannerField) || folderSpecific?.image;
        
        if (!isEmbedded && !bannerImage) {
            contentEl.classList.remove('pixel-banner');
            if (existingBanner) {
                existingBanner.style.backgroundImage = '';
                existingBanner.style.display = 'none';
            }
        }

        // Clear the loaded image for this file if it's a content change
        if (isContentChange) {
            this.loadedImages.delete(view.file.path);
            this.lastKeywords.delete(view.file.path);
        }

        // Initialize settings with either folder-specific or default values
        let yPosition = folderSpecific?.yPosition ?? this.settings.yPosition;
        let contentStartPosition = folderSpecific?.contentStartPosition ?? this.settings.contentStartPosition;

        // Handle array flattening and internal link formatting
        if (bannerImage) {
            // Flatten the bannerImage if it's an array within an array
            if (Array.isArray(bannerImage)) {
                bannerImage = bannerImage.flat()[0];
                // Format as internal link
                bannerImage = `[[${bannerImage}]]`;
            }

            // Handle comma-delimited banner values in frontmatter
            if (typeof bannerImage === 'string' && !bannerImage.startsWith('[[')) {
                const bannerValues = bannerImage.includes(',') 
                    ? bannerImage.split(',')
                        .map(v => v.trim())
                        .filter(v => v.length > 0)  // Filter out empty strings
                        .filter(Boolean)  // Filter out null/undefined/empty values
                    : [bannerImage];
                
                // Only select random if we have valid values
                if (bannerValues.length > 0) {
                    bannerImage = bannerValues[Math.floor(Math.random() * bannerValues.length)];
                } else {
                    bannerImage = null;
                }
            }

            // Format internal links
            if (bannerImage && !bannerImage.startsWith('[[') && !bannerImage.startsWith('http')) {
                const file = this.app.vault.getAbstractFileByPath(bannerImage);
                if (file && 'extension' in file) {
                    if (file.extension.match(/^(jpg|jpeg|png|gif|bmp|svg)$/i)) {
                        bannerImage = `[[${bannerImage}]]`;
                    }
                }
            }
        }

        let imageDisplay = getFrontmatterValue(frontmatter, this.settings.customImageDisplayField) || 
            folderSpecific?.imageDisplay || 
            this.settings.imageDisplay;
        let imageRepeat = getFrontmatterValue(frontmatter, this.settings.customImageRepeatField) ?? 
            folderSpecific?.imageRepeat ?? 
            this.settings.imageRepeat;
        let bannerHeight = getFrontmatterValue(frontmatter, this.settings.customBannerHeightField) ?? 
            folderSpecific?.bannerHeight ?? 
            this.settings.bannerHeight;
        let fade = getFrontmatterValue(frontmatter, this.settings.customFadeField) ?? 
            folderSpecific?.fade ?? 
            this.settings.fade;
        let borderRadius = getFrontmatterValue(frontmatter, this.settings.customBorderRadiusField) ?? 
            folderSpecific?.borderRadius ?? 
            this.settings.borderRadius;

        // Process this note's banner if it exists
        if (bannerImage) {
            await this.addPixelBanner(contentEl, { 
                frontmatter, 
                file: view.file, 
                isContentChange,
                yPosition,
                contentStartPosition,
                bannerImage,
                imageDisplay,
                imageRepeat,
                bannerHeight,
                fade,
                borderRadius,
                isReadingView: view.getMode && view.getMode() === 'preview'
            });

            this.lastYPositions.set(view.file.path, yPosition);
        } else if (existingBanner) {
            existingBanner.style.display = 'none';
        }

        // Process embedded notes if this is not an embedded note itself
        if (!isEmbedded) {
            const embeddedNotes = contentEl.querySelectorAll('.internal-embed');

            for (const embed of embeddedNotes) {
                const embedFile = this.app.metadataCache.getFirstLinkpathDest(embed.getAttribute('src'), '');

                if (embedFile) {
                    const embedView = {
                        file: embedFile,
                        contentEl: embed,
                        getMode: () => 'preview'
                    };
                    await this.updateBanner(embedView, false);
                }
            }
        }

        if (this.settings.hidePixelBannerFields && view.getMode() === 'preview') {
            this.updateFieldVisibility(view);
        }
    }

    setupMutationObserver() {
        this.observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'childList') {
                    const removedNodes = Array.from(mutation.removedNodes);
                    const addedNodes = Array.from(mutation.addedNodes);

                    const bannerRemoved = removedNodes.some(node => 
                        node.classList && node.classList.contains('pixel-banner-image')
                    );

                    const contentChanged = addedNodes.some(node => 
                        node.nodeType === Node.ELEMENT_NODE && 
                        (node.classList.contains('markdown-preview-section') || 
                         node.classList.contains('cm-content'))
                    );

                    if (bannerRemoved || contentChanged) {
                        // Clean up pixel-banner class if no banner is present
                        const activeLeaf = this.app.workspace.activeLeaf;
                        if (activeLeaf && activeLeaf.view instanceof MarkdownView) {
                            const contentEl = activeLeaf.view.contentEl;
                            const hasBanner = contentEl.querySelector('.pixel-banner-image[style*="display: block"]');
                            if (!hasBanner) {
                                contentEl.classList.remove('pixel-banner');
                            }
                        }
                        this.debouncedEnsureBanner();
                    }
                }
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    debouncedEnsureBanner = debounce(() => {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (activeLeaf && activeLeaf.view instanceof MarkdownView) {
            this.updateBanner(activeLeaf.view, false);
        }
    }, 100);

    getFolderSpecificImage(filePath) {
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

    // Helper method to create folder image settings object
    createFolderImageSettings(folderImage) {
        return {
            image: folderImage.image,
            yPosition: folderImage.yPosition ?? this.settings.yPosition,
            contentStartPosition: folderImage.contentStartPosition ?? this.settings.contentStartPosition,
            imageDisplay: folderImage.imageDisplay ?? this.settings.imageDisplay,
            imageRepeat: folderImage.imageRepeat ?? this.settings.imageRepeat,
            bannerHeight: folderImage.bannerHeight ?? this.settings.bannerHeight,
            fade: folderImage.fade ?? this.settings.fade,
            borderRadius: folderImage.borderRadius ?? this.settings.borderRadius,
            titleColor: folderImage.titleColor ?? this.settings.titleColor
        };
    }

    getFolderPath(filePath) {
        if (!filePath.includes('/')) {
            return '/';
        }
        const lastSlashIndex = filePath.lastIndexOf('/');
        return lastSlashIndex !== -1 ? filePath.substring(0, lastSlashIndex) : '';
    }

    async getImageUrl(type, input) {
        if (type === 'url' || type === 'path') {
            return input;
        }

        if (type === 'obsidianLink') {
            const file = this.getPathFromObsidianLink(input);
            if (file) {
                return this.getVaultImageUrl(file.path);
            }
            return null;
        }

        if (type === 'vaultPath') {
            return this.getVaultImageUrl(input);
        }

        if (type === 'keyword') {
            // Handle comma-delimited keywords
            const keywords = input.includes(',') 
                ? input.split(',')
                    .map(k => k.trim())
                    .filter(k => k.length > 0)
                    .filter(Boolean)
                : [input];
            
            // Only proceed if we have valid keywords
            if (keywords.length > 0) {
                const selectedKeyword = keywords[Math.floor(Math.random() * keywords.length)];
                const provider = this.getActiveApiProvider();
                // console.log(`provider: ${provider}`);
                
                if (provider === 'pexels') {
                    return this.fetchPexelsImage(selectedKeyword);
                } else if (provider === 'pixabay') {
                    return this.fetchPixabayImage(selectedKeyword);
                } else if (provider === 'flickr') {
                    return this.fetchFlickrImage(selectedKeyword);
                } else if (provider === 'unsplash') {
                    return this.fetchUnsplashImage(selectedKeyword);
                }
            }
            return null;
        }

        return null;
    }

    async fetchPexelsImage(keyword) {
        const apiKey = this.settings.pexelsApiKey;
        if (!apiKey) {
            new Notice('Pexels API key is not set. Please set it in the plugin settings.');
            return null;
        }

        // Implement rate limiting
        const now = Date.now();
        if (now - this.rateLimiter.lastRequestTime < this.rateLimiter.minInterval) {
            await new Promise(resolve => setTimeout(resolve, this.rateLimiter.minInterval));
        }
        this.rateLimiter.lastRequestTime = Date.now();

        const defaultKeywords = this.settings.defaultKeywords.split(',').map(k => k.trim());
        const fallbackKeyword = defaultKeywords[Math.floor(Math.random() * defaultKeywords.length)];
        const keywords = [keyword, fallbackKeyword];
        
        for (const currentKeyword of keywords) {
            try {
                const response = await requestUrl({
                    url: `https://api.pexels.com/v1/search?query=${encodeURIComponent(currentKeyword)}&per_page=${this.settings.numberOfImages}&size=${this.settings.imageSize}&orientation=${this.settings.imageOrientation}`,
                    method: 'GET',
                    headers: {
                        'Authorization': apiKey
                    }
                });

                if (response.status !== 200) {
                    console.error('Failed to fetch images:', response.status, response.text);
                    continue;
                }

                const data = response.json;

                if (data.photos && data.photos.length > 0) {
                    const randomIndex = Math.floor(Math.random() * data.photos.length);
                    if (currentKeyword !== keyword) {
                        console.log(`No image found for "${keyword}". Using image for "${currentKeyword}" instead.`);
                    }
                    const imageUrl = data.photos[randomIndex].src[this.settings.imageSize];
                    try {
                        await this.preloadImage(imageUrl);
                    } catch (error) {
                        console.error(`Failed to preload image: ${error.message}`);
                    }
                    return imageUrl;
                } else if (currentKeyword === keyword) {
                    console.log(`No image found for the provided keyword: "${keyword}". Trying a random default keyword.`);
                }
            } catch (error) {
                console.error(`Error fetching image from API for keyword "${currentKeyword}":`, error);
                new Notice(`Failed to fetch image: ${error.message}`);
            }
        }

        console.error('No images found for any keywords, including the random default.');
        return null;
    }

    async fetchPixabayImage(keyword) {
        const apiKey = this.settings.pixabayApiKey;
        if (!apiKey) {
            new Notice('Pixabay API key is not set. Please set it in the plugin settings.');
            return null;
        }

        const defaultKeywords = this.settings.defaultKeywords.split(',').map(k => k.trim());
        const keywordsToTry = [keyword, ...defaultKeywords];
        const maxAttempts = 4;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const currentKeyword = attempt === 0 ? keyword : keywordsToTry[Math.floor(Math.random() * keywordsToTry.length)];

            const apiUrl = 'https://pixabay.com/api/';
            const params = new URLSearchParams({
                key: apiKey,
                q: encodeURIComponent(currentKeyword),
                image_type: 'photo',
                per_page: this.settings.numberOfImages,
                safesearch: true,
            });

            try {
                const response = await this.makeRequest(`${apiUrl}?${params}`);
                
                if (response.status !== 200) {
                    console.error(`Pixabay API error: ${response.status} ${response.statusText}`);
                    continue;
                }

                let data;
                if (response.arrayBuffer) {
                    const text = new TextDecoder().decode(response.arrayBuffer);
                    try {
                        data = JSON.parse(text);
                    } catch (error) {
                        console.error('Failed to parse Pixabay response:', error);
                        continue;
                    }
                } else {
                    console.error('Unexpected response format:', response);
                    continue;
                }

                if (data.hits && data.hits.length > 0) {
                    const imageUrls = data.hits.map(hit => hit.largeImageURL);
                    
                    if (imageUrls.length > 0) {
                        const randomIndex = Math.floor(Math.random() * imageUrls.length);
                        const selectedImageUrl = imageUrls[randomIndex];
                        return selectedImageUrl;
                    }
                }
                
                console.log(`No images found for keyword: ${currentKeyword}`);
            } catch (error) {
                console.error('Error fetching image from Pixabay:', error);
            }
        }

        console.error('No images found after all attempts');
        new Notice('Failed to fetch an image after multiple attempts, try a different keyword and/or update the backup keyword list in settings.');
        return null;
    }

    async fetchFlickrImage(keyword) {
        const apiKey = this.settings.flickrApiKey;
        if (!apiKey) {
            new Notice('Flickr API key is not set. Please set it in the plugin settings.');
            return null;
        }

        const defaultKeywords = this.settings.defaultKeywords.split(',').map(k => k.trim());
        const keywordsToTry = [keyword, ...defaultKeywords];
        const maxAttempts = 4;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const currentKeyword = attempt === 0 ? keyword : keywordsToTry[Math.floor(Math.random() * keywordsToTry.length)];

            try {
                // Use Flickr search API to find photos
                const searchUrl = `https://www.flickr.com/services/rest/?method=flickr.photos.search&api_key=${apiKey}&text=${encodeURIComponent(currentKeyword)}&per_page=${this.settings.numberOfImages}&format=json&nojsoncallback=1&sort=relevance&content_type=1&media=photos&safe_search=1`;
                
                const response = await this.makeRequest(searchUrl);
                
                if (response.status !== 200) {
                    console.error(`Flickr API error: ${response.status} ${response.statusText}`);
                    continue;
                }

                const data = JSON.parse(new TextDecoder().decode(response.arrayBuffer));
                
                if (data.stat !== 'ok') {
                    console.error('Flickr API error:', data);
                    continue;
                }

                if (data.photos && data.photos.photo && data.photos.photo.length > 0) {
                    const photos = data.photos.photo;
                    const randomIndex = Math.floor(Math.random() * photos.length);
                    const photo = photos[randomIndex];
                    
                    // Construct image URL based on size preference
                    let size = 'z'; // Default to medium 640
                    switch (this.settings.imageSize) {
                        case 'small': size = 'n'; break;  // Small 320
                        case 'medium': size = 'z'; break; // Medium 640
                        case 'large': size = 'b'; break;  // Large 1024
                    }
                    
                    // Construct Flickr image URL
                    const imageUrl = `https://live.staticflickr.com/${photo.server}/${photo.id}_${photo.secret}_${size}.jpg`;
                    return imageUrl;
                }
                
                console.log(`No images found for keyword: ${currentKeyword}`);
            } catch (error) {
                console.error('Error fetching image from Flickr:', error);
            }
        }

        console.error('No images found after all attempts');
        new Notice('Failed to fetch an image after multiple attempts');
        return null;
    }

    async fetchUnsplashImage(keyword) {
        const apiKey = this.settings.unsplashApiKey;
        if (!apiKey) {
            new Notice('Unsplash API key is not set. Please set it in the plugin settings.');
            return null;
        }

        const defaultKeywords = this.settings.defaultKeywords.split(',').map(k => k.trim());
        const keywordsToTry = [keyword, ...defaultKeywords];
        const maxAttempts = 4;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const currentKeyword = attempt === 0 ? keyword : keywordsToTry[Math.floor(Math.random() * keywordsToTry.length)];

            try {
                // Use the search endpoint instead of random
                let apiUrl = 'https://api.unsplash.com/search/photos';
                const params = new URLSearchParams({
                    query: currentKeyword,
                    per_page: this.settings.numberOfImages,
                    orientation: this.settings.imageOrientation
                });

                const response = await this.makeRequest(`${apiUrl}?${params}`, {
                    headers: {
                        'Authorization': `Client-ID ${apiKey}`,
                        'Accept-Version': 'v1'
                    }
                });

                if (response.status !== 200) {
                    console.error(`Unsplash API error: ${response.status}`);
                    continue;
                }

                const data = JSON.parse(new TextDecoder().decode(response.arrayBuffer));
                if (!data.results || data.results.length === 0) {
                    console.log(`No images found for keyword: ${currentKeyword}`);
                    continue;
                }

                const randomIndex = Math.floor(Math.random() * data.results.length);
                const photo = data.results[randomIndex];
                
                // Get the appropriate size URL based on settings
                let imageUrl;
                switch (this.settings.imageSize) {
                    case 'small':
                        imageUrl = photo.urls.small;
                        break;
                    case 'medium':
                        imageUrl = photo.urls.regular;
                        break;
                    case 'large':
                        imageUrl = photo.urls.full;
                        break;
                    default:
                        imageUrl = photo.urls.regular;
                }

                return imageUrl;
            } catch (error) {
                console.error('Error fetching image from Unsplash:', error);
            }
        }

        console.error('No images found after all attempts');
        new Notice('Failed to fetch an image after multiple attempts');
        return null;
    }

    async makeRequest(url, options = {}) {
        const now = Date.now();
        if (now - this.rateLimiter.lastRequestTime < this.rateLimiter.minInterval) {
            await new Promise(resolve => setTimeout(resolve, this.rateLimiter.minInterval));
        }
        this.rateLimiter.lastRequestTime = Date.now();

        try {
            const response = await requestUrl({
                url,
                headers: options.headers || {},
                ...options
            });
            return response;
        } catch (error) {
            console.error('Request failed:', error);
            throw new Error(`Request failed: ${error.message}`);
        }
    }

    preloadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(url);
            img.onerror = reject;
            img.src = url;
        });
    }

    getInputType(input) {
        if (Array.isArray(input)) {
            input = input.flat()[0];
        }

        if (typeof input !== 'string') {
            return 'invalid';
        }

        // Trim the input and remove surrounding quotes if present
        input = input.trim().replace(/^["'](.*)["']$/, '$1');

        // Check if it's an Obsidian internal link - handle both [[link]] and "[[link]]" formats
        if (input.match(/^\[{2}.*\]{2}$/) || input.match(/^"?\[{2}.*\]{2}"?$/)) {
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

    getPathFromObsidianLink(link) {
        // Remove the [[ from the beginning of the link
        let innerLink = link.startsWith('[[') ? link.slice(2) : link;
        // Remove the ]] from the end if it exists
        innerLink = innerLink.endsWith(']]') ? innerLink.slice(0, -2) : innerLink;
        // Split by '|' in case there's an alias, and take the first part
        const path = innerLink.split('|')[0];
        // Resolve the path within the vault
        return this.app.metadataCache.getFirstLinkpathDest(path, '');
    }

    async getVaultImageUrl(path) {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file && 'extension' in file) {
            try {
                const arrayBuffer = await this.app.vault.readBinary(file);
                const blob = new Blob([arrayBuffer], { type: `image/${file.extension}` });
                const url = URL.createObjectURL(blob);
                return url;
            } catch (error) {
                console.error('Error reading vault image:', error);
                return null;
            }
        }
        return null;
    }

    updateAllBanners() {
        this.app.workspace.iterateAllLeaves(leaf => {
            if (leaf.view.getViewType() === "markdown") {
                this.updateBanner(leaf.view, true);
            }
        });
    }

    async postProcessor(el, ctx) {
        const frontmatter = ctx.frontmatter;
        if (frontmatter && frontmatter[this.settings.customBannerField]) {
            await this.addPixelBanner(el, {
                frontmatter,
                file: ctx.sourcePath,
                isContentChange: false,
                yPosition: frontmatter[this.settings.customYPositionField] || this.settings.yPosition,
                contentStartPosition: frontmatter[this.settings.customContentStartField] || this.settings.contentStartPosition,
                customBannerField: this.settings.customBannerField,
                customYPositionField: this.settings.customYPositionField,
                customContentStartField: this.settings.customContentStartField,
                customImageDisplayField: this.settings.customImageDisplayField,
                customImageRepeatField: this.settings.customImageRepeatField,
                bannerImage: frontmatter[this.settings.customBannerField]
            });

            if (this.settings.hidePixelBannerFields) {
                const frontmatterEl = el.querySelector('.frontmatter');
                if (frontmatterEl) {
                    // Get all custom fields that should be hidden
                    const fieldsToHide = [
                        ...this.settings.customBannerField,
                        ...this.settings.customYPositionField,
                        ...this.settings.customContentStartField,
                        ...this.settings.customImageDisplayField,
                        ...this.settings.customImageRepeatField,
                        ...this.settings.customBannerHeightField,
                        ...this.settings.customFadeField,
                        ...this.settings.customBorderRadiusField
                    ];

                    // Add hide class to matching fields
                    const rows = frontmatterEl.querySelectorAll('.frontmatter-container .frontmatter-section-label');
                    rows.forEach(row => {
                        const label = row.textContent.replace(':', '').trim();
                        if (fieldsToHide.includes(label)) {
                            row.closest('.frontmatter-section').classList.add('pixel-banner-hidden-field');
                        }
                    });
                }
            }
        }
    }

    onunload() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    applyContentStartPosition(el, contentStartPosition) {
        if (!el) {
            return;
        }
        el.style.setProperty('--pixel-banner-content-start', `${contentStartPosition}px`);
    }

    getFolderSpecificSetting(filePath, settingName) {
        const folderPath = this.getFolderPath(filePath);
        for (const folderImage of this.settings.folderImages) {
            if (folderPath.startsWith(folderImage.folder)) {
                // Use nullish coalescing to properly handle 0 values
                return folderImage[settingName] ?? undefined;
            }
        }
        return undefined;
    }

    async cleanOrphanedPins() {
        const vault = this.app.vault;
        const folderPath = this.settings.pinnedImageFolder;
        let cleaned = 0;

        try {
            // Check if folder exists
            if (!await vault.adapter.exists(folderPath)) {
                return { cleaned };
            }

            // Get all pinned images
            const pinnedFolder = vault.getAbstractFileByPath(folderPath);
            if (!pinnedFolder || !pinnedFolder.children) {
                return { cleaned };
            }

            // Define common image extensions
            const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
            
            const pinnedImages = pinnedFolder.children
                .filter(file => imageExtensions.includes(file.extension.toLowerCase()))
                .map(file => file.path);

            if (!pinnedImages.length) {
                return { cleaned };
            }

            // Get all markdown files
            const markdownFiles = this.app.vault.getMarkdownFiles();
            
            // Get all banner field names to check
            const bannerFields = this.settings.customBannerField;

            // Create a Set of all images referenced in frontmatter
            const referencedImages = new Set();
            
            for (const file of markdownFiles) {
                const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
                if (frontmatter) {
                    for (const field of bannerFields) {
                        const bannerValue = frontmatter[field];
                        if (bannerValue && typeof bannerValue === 'string') {
                            // Handle both formats: with and without brackets
                            const cleanPath = bannerValue.replace(/[\[\]]/g, '').trim();
                            referencedImages.add(cleanPath);
                        }
                    }
                }
            }

            // Delete unreferenced images
            for (const imagePath of pinnedImages) {
                if (!referencedImages.has(imagePath)) {
                    await vault.trash(vault.getAbstractFileByPath(imagePath), true);
                    cleaned++;
                }
            }

            return { cleaned };
        } catch (error) {
            console.error('Error in cleanOrphanedPins:', error);
            throw error;
        }
    }

    async checkVersion() {
        const currentVersion = this.manifest.version;
        const lastVersion = this.settings.lastVersion;

        if (this.settings.showReleaseNotes && 
            (!lastVersion || lastVersion !== currentVersion)) {
            
            // Get release notes for current version
            const releaseNotes = await this.getReleaseNotes(currentVersion);
            
            // Show the modal
            new ReleaseNotesModal(this.app, currentVersion, releaseNotes).open();
            
            // Update the last shown version
            this.settings.lastVersion = currentVersion;
            await this.saveSettings();
        }
    }

    async getReleaseNotes(version) {
        return releaseNotes;
    }

    async addPixelBanner(el, ctx) {
        const { frontmatter, file, isContentChange, yPosition, contentStartPosition, bannerImage, isReadingView } = ctx;
        const viewContent = el;
        const isEmbedded = viewContent.classList.contains('internal-embed');
        
        // Now we can use isEmbedded
        if (!isEmbedded) {
            viewContent.classList.add('pixel-banner');
        }

        let container;
        if (isEmbedded) {
            container = viewContent.querySelector('.markdown-preview-sizer');
            
            if (!container) {
                container = viewContent.querySelector('.markdown-embed-content');
            }
            
            if (!container) {
                container = viewContent;
            }
        } else {
            container = isReadingView 
                ? viewContent.querySelector('.markdown-preview-sizer:not(.internal-embed .markdown-preview-sizer)')
                : viewContent.querySelector('.cm-sizer');
        }

        if (!container) {
            return;
        }

        let bannerDiv = container.querySelector(':scope > .pixel-banner-image');
        let pinIcon = container.querySelector(':scope > .pin-icon');
        
        if (!bannerDiv) {
            bannerDiv = createDiv({ cls: 'pixel-banner-image' });
            container.insertBefore(bannerDiv, container.firstChild);
            bannerDiv._isPersistentBanner = true;
            
            // Only add pin/refresh icons for non-embedded notes
            if (!isEmbedded && this.settings.showPinIcon) {
                pinIcon = createDiv({ cls: 'pin-icon' });
                pinIcon.style.position = 'absolute';
                pinIcon.style.top = '10px';
                pinIcon.style.left = '5px';
                pinIcon.style.fontSize = '1.5em';
                pinIcon.style.cursor = 'pointer';
                pinIcon.innerHTML = '📌';
                pinIcon._isPersistentPin = true;
                container.insertBefore(pinIcon, bannerDiv.nextSibling);

                if (this.settings.showRefreshIcon) {
                    const refreshIcon = createDiv({ cls: 'refresh-icon' });
                    refreshIcon.style.position = 'absolute';
                    refreshIcon.style.top = '10px';
                    refreshIcon.style.left = '40px';
                    refreshIcon.style.fontSize = '1.5em';
                    refreshIcon.style.cursor = 'pointer';
                    refreshIcon.innerHTML = '🔄';
                    refreshIcon._isPersistentRefresh = true;
                    container.insertBefore(refreshIcon, pinIcon.nextSibling);
                }
            }
        }

        if (!container._hasOverriddenSetChildrenInPlace) {
            const originalSetChildrenInPlace = container.setChildrenInPlace;
            container.setChildrenInPlace = function(children) {
                const bannerElement = this.querySelector(':scope > .pixel-banner-image');
                const pinElement = this.querySelector(':scope > .pin-icon');
                const refreshElement = this.querySelector(':scope > .refresh-icon');
                
                children = Array.from(children);
                if (bannerElement?._isPersistentBanner) {
                    children = [bannerElement, ...children];
                }
                if (pinElement?._isPersistentPin) {
                    children.splice(1, 0, pinElement);
                }
                if (refreshElement?._isPersistentRefresh) {
                    children.splice(2, 0, refreshElement);
                }
                
                originalSetChildrenInPlace.call(this, children);
            };
            container._hasOverriddenSetChildrenInPlace = true;
        }

        if (bannerImage) {
            let imageUrl = this.loadedImages.get(file.path);
            const lastInput = this.lastKeywords.get(file.path);
            const inputType = this.getInputType(bannerImage);

            if (!imageUrl || (isContentChange && bannerImage !== lastInput)) {
                imageUrl = await this.getImageUrl(inputType, bannerImage);
                if (imageUrl) {
                    this.loadedImages.set(file.path, imageUrl);
                    this.lastKeywords.set(file.path, bannerImage);
                }
            }

            if (imageUrl) {
                // Get the y-position respecting inheritance
                const frontmatterYPosition = getFrontmatterValue(frontmatter, this.settings.customYPositionField);
                const folderSpecific = this.getFolderSpecificImage(file.path);
                const effectiveYPosition = frontmatterYPosition ?? 
                    folderSpecific?.yPosition ?? 
                    this.settings.yPosition;

                bannerDiv.style.backgroundImage = `url('${imageUrl}')`;
                bannerDiv.style.backgroundPosition = `center ${effectiveYPosition}%`;
                bannerDiv.style.display = 'block';

                // Apply all the settings
                this.applyBannerSettings(bannerDiv, ctx);

                // Get the content start position respecting inheritance
                const frontmatterContentStart = getFrontmatterValue(frontmatter, this.settings.customContentStartField);
                
                const effectiveContentStart = frontmatterContentStart ?? 
                    folderSpecific?.contentStartPosition ?? 
                    this.settings.contentStartPosition;

                this.applyContentStartPosition(viewContent, effectiveContentStart);
                
                if (!isEmbedded && inputType === 'keyword' && this.settings.showPinIcon) {
                    const refreshIcon = container.querySelector(':scope > .refresh-icon');
                    
                    if (pinIcon) {
                        pinIcon.style.display = 'block';
                        pinIcon.onclick = async () => {
                            try {
                                // Determine which banner field is being used
                                let usedField;
                                for (const field of this.settings.customBannerField) {
                                    if (frontmatter?.[field]) {
                                        usedField = field;
                                        break;
                                    }
                                }
                                await handlePinIconClick(imageUrl, this, usedField);
                            } catch (error) {
                                console.error('Error pinning image:', error);
                                new Notice('😭 Failed to pin the image.');
                            }
                        };
                    }

                    if (refreshIcon && this.settings.showRefreshIcon) {
                        refreshIcon.style.display = 'block';
                        refreshIcon.onclick = async () => {
                            try {
                                this.loadedImages.delete(file.path);
                                this.lastKeywords.delete(file.path);
                                await this.updateBanner(this.app.workspace.activeLeaf.view, true);
                                new Notice('🔄 Refreshed banner image');
                            } catch (error) {
                                console.error('Error refreshing image:', error);
                                new Notice('😭 Failed to refresh image');
                            }
                        };
                    }
                } else {
                    if (pinIcon) pinIcon.style.display = 'none';
                    const refreshIcon = container.querySelector(':scope > .refresh-icon');
                    if (refreshIcon) refreshIcon.style.display = 'none';
                }
            } else {
                bannerDiv.style.display = 'none';
                if (pinIcon) pinIcon.style.display = 'none';
                const refreshIcon = container.querySelector(':scope > .refresh-icon');
                if (refreshIcon) refreshIcon.style.display = 'none';
                this.loadedImages.delete(file.path);
                this.lastKeywords.delete(file.path);
                // Add this line to remove the pixel-banner class when there's no banner
                if (!isEmbedded) {
                    viewContent.classList.remove('pixel-banner');
                }
            }
        }
    }

    applyBannerSettings(bannerDiv, ctx) {
        const { frontmatter, imageDisplay, imageRepeat, bannerHeight, fade, borderRadius } = ctx;
        const folderSpecific = this.getFolderSpecificImage(ctx.file.path);
        
        // Get title color from frontmatter, folder settings, or default
        const titleColor = getFrontmatterValue(frontmatter, this.settings.customTitleColorField) || 
            folderSpecific?.titleColor || 
            this.settings.titleColor;

        bannerDiv.style.backgroundSize = imageDisplay || 'cover';
        bannerDiv.style.backgroundRepeat = imageRepeat ? 'repeat' : 'no-repeat';
        bannerDiv.style.setProperty('--pixel-banner-height', `${bannerHeight}px`);
        bannerDiv.style.setProperty('--pixel-banner-fade', `${fade}%`);
        bannerDiv.style.setProperty('--pixel-banner-radius', `${borderRadius}px`);

        // Find the parent container for both reading and editing modes
        const container = bannerDiv.closest('.markdown-preview-view, .markdown-source-view');
        if (container) {
            container.style.setProperty('--pixel-banner-title-color', titleColor);
        }
    }

    // Add this helper method to randomly select an API provider
    getActiveApiProvider() {
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

        // Randomly select from available providers
        return availableProviders[Math.floor(Math.random() * availableProviders.length)];
    }

    // Add this new method to handle field visibility
    updateFieldVisibility(view) {
        if (!view || view.getMode() !== 'preview') return;

        const fieldsToHide = [
            ...this.settings.customBannerField,
            ...this.settings.customYPositionField,
            ...this.settings.customContentStartField,
            ...this.settings.customImageDisplayField,
            ...this.settings.customImageRepeatField,
            ...this.settings.customBannerHeightField,
            ...this.settings.customFadeField,
            ...this.settings.customBorderRadiusField
        ];

        // Get the properties container
        const propertiesContainer = view.contentEl.querySelector('.metadata-container');
        if (!propertiesContainer) return;

        // Get all property elements
        const propertyElements = propertiesContainer.querySelectorAll('.metadata-property');
        let visiblePropertiesCount = 0;
        let bannerPropertiesCount = 0;

        propertyElements.forEach(propertyEl => {
            const key = propertyEl.getAttribute('data-property-key');
            if (fieldsToHide.includes(key)) {
                propertyEl.classList.add('pixel-banner-hidden-field');
                bannerPropertiesCount++;
            } else {
                visiblePropertiesCount++;
            }
        });

        // If hidePropertiesSectionIfOnlyBanner is enabled and all properties are banner-related
        if (this.settings.hidePropertiesSectionIfOnlyBanner && 
            this.settings.hidePixelBannerFields && 
            visiblePropertiesCount === 0 && 
            bannerPropertiesCount > 0) {
            propertiesContainer.classList.add('pixel-banner-hidden-section');
        } else {
            propertiesContainer.classList.remove('pixel-banner-hidden-section');
        }
    }
}

// Add this helper function at the top level
function getFrontmatterValue(frontmatter, fieldNames) {
    if (!frontmatter || !Array.isArray(fieldNames)) return undefined;
    
    for (const fieldName of fieldNames) {
        if (fieldName in frontmatter) {
            const value = frontmatter[fieldName];
            // Convert 'true' and 'false' strings to actual boolean values
            if (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
                return value.toLowerCase() === 'true';
            }
            return value;
        }
    }
    return undefined;
}

function addPinIcon(noteElement, imageUrl, plugin) {
    // Remove any existing pin icons first
    const existingPins = noteElement.querySelectorAll('.pin-icon');
    existingPins.forEach(pin => pin.remove());

    // Create pin icon elements for both modes
    const createPinIcon = () => {
        const pinIcon = document.createElement('div');
        pinIcon.className = 'pin-icon';
        pinIcon.style.position = 'absolute';
        pinIcon.style.top = '10px';
        pinIcon.style.left = '5px';
        pinIcon.style.fontSize = '1.5em';
        pinIcon.style.cursor = 'pointer';
        pinIcon.innerHTML = '📌';

        pinIcon.addEventListener('click', async () => {
            try {
                await handlePinIconClick(imageUrl, plugin);
            } catch (error) {
                console.error('Error pinning image:', error);
                new Notice('😭 Failed to pin the image.');
            }
        });

        return pinIcon;
    };

    // Add pin icon for reading mode
    const previewBanner = noteElement.querySelector('.markdown-preview-sizer > .pixel-banner-image');
    if (previewBanner) {
        previewBanner.insertAdjacentElement('afterend', createPinIcon());
    }

    // Add pin icon for edit mode
    const editBanner = noteElement.querySelector('.cm-sizer > .pixel-banner-image');
    if (editBanner) {
        editBanner.insertAdjacentElement('afterend', createPinIcon());
    }
}

async function handlePinIconClick(imageUrl, plugin, usedField = null) {
    const imageBlob = await fetchImage(imageUrl);
    const { initialPath, file } = await saveImageLocally(imageBlob, plugin);
    const finalPath = await waitForFileRename(file, plugin);
    
    if (!finalPath) {
        console.error('❌ Failed to resolve valid file path');
        new Notice('Failed to save image - file not found');
        return;
    }
    
    await updateNoteFrontmatter(finalPath, plugin, usedField);
    hidePinIcon();
}

async function fetchImage(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Image download failed');
    // Get the array buffer directly instead of blob
    return await response.arrayBuffer();
}

class FolderSelectionModal extends FuzzySuggestModal {
    constructor(app, defaultFolder, onChoose) {
        super(app);
        this.defaultFolder = defaultFolder;
        this.onChoose = onChoose;
        
        // Set custom placeholder text
        this.setPlaceholder("Select or type folder path to save Pinned Banner Image");
        
        // Set modal title
        this.titleEl.setText("Choose Folder to save Pinned Banner Image");
    }

    getItems() {
        return [this.defaultFolder, ...this.app.vault.getAllLoadedFiles()
            .filter(file => file.children)
            .map(folder => folder.path)];
    }

    getItemText(item) {
        return item;
    }

    onChooseItem(item) {
        this.onChoose(item);
    }

    onOpen() {
        super.onOpen();
        // Pre-populate the search with the default folder
        const inputEl = this.inputEl;
        inputEl.value = this.defaultFolder;
        inputEl.select();
        // Trigger the search to show matching results
        this.updateSuggestions();
    }
}

async function saveImageLocally(arrayBuffer, plugin) {
    const vault = plugin.app.vault;
    const defaultFolderPath = plugin.settings.pinnedImageFolder;

    // First, prompt for folder selection
    const folderPath = await new Promise((resolve) => {
        const modal = new FolderSelectionModal(plugin.app, defaultFolderPath, (result) => {
            resolve(result);
        });
        modal.open();
    });

    if (!folderPath) {
        throw new Error('No folder selected');
    }

    // Ensure the folder exists
    if (!await vault.adapter.exists(folderPath)) {
        await vault.createFolder(folderPath);
    }

    // Then prompt for filename
    const suggestedName = 'pixel-banner-image';
    const userInput = await new Promise((resolve) => {
        const modal = new SaveImageModal(plugin.app, suggestedName, (result) => {
            resolve(result);
        });
        modal.open();
    });

    if (!userInput) {
        throw new Error('No filename provided');
    }

    // Sanitize the filename and ensure it ends with .png
    let baseName = userInput.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
    if (!baseName) baseName = 'banner';
    if (!baseName.toLowerCase().endsWith('.png')) baseName += '.png';

    // Handle duplicate filenames
    let fileName = baseName;
    let counter = 1;
    while (await vault.adapter.exists(`${folderPath}/${fileName}`)) {
        const nameWithoutExt = baseName.slice(0, -4); // remove .png
        fileName = `${nameWithoutExt}-${counter}.png`;
        counter++;
    }

    const filePath = `${folderPath}/${fileName}`;
    const savedFile = await vault.createBinary(filePath, arrayBuffer);
    
    return {
        initialPath: filePath,
        file: savedFile
    };
}

async function updateNoteFrontmatter(imagePath, plugin, usedField = null) {
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) return;

    let fileContent = await app.vault.read(activeFile);
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const hasFrontmatter = frontmatterRegex.test(fileContent);
    
    const bannerField = usedField || (Array.isArray(plugin.settings.customBannerField) && 
        plugin.settings.customBannerField.length > 0 ? 
        plugin.settings.customBannerField[0] : 'banner');

    fileContent = fileContent.replace(/^\s+/, '');

    let updatedContent;
    if (hasFrontmatter) {
        updatedContent = fileContent.replace(frontmatterRegex, (match, frontmatter) => {
            const bannerRegex = new RegExp(`${bannerField}:\\s*.+`);
            let cleanedFrontmatter = frontmatter.trim();
            
            // Remove any banner fields to prevent duplicates
            plugin.settings.customBannerField.forEach(field => {
                const fieldRegex = new RegExp(`${field}:\\s*.+\\n?`, 'g');
                cleanedFrontmatter = cleanedFrontmatter.replace(fieldRegex, '');
            });

            // Add the new banner field at the start, ensuring no extra newlines
            cleanedFrontmatter = cleanedFrontmatter.trim();
            const newFrontmatter = `${bannerField}: ${imagePath}${cleanedFrontmatter ? '\n' + cleanedFrontmatter : ''}`;
            return `---\n${newFrontmatter}\n---`;
        });
    } else {
        const cleanContent = fileContent.replace(/^\s+/, '');
        updatedContent = `---\n${bannerField}: ${imagePath}\n---\n\n${cleanContent}`;
    }

    updatedContent = updatedContent.replace(/^\s+/, '');
    
    if (updatedContent !== fileContent) {
        await app.vault.modify(activeFile, updatedContent);
    }
}

function hidePinIcon() {
    const pinIcon = document.querySelector('.pin-icon');
    if (pinIcon) pinIcon.style.display = 'none';
}

// Add this new class for the modal
class SaveImageModal extends Modal {
    constructor(app, suggestedName, onSubmit) {
        super(app);
        this.suggestedName = suggestedName;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Save Banner Image' });

        const inputContainer = contentEl.createDiv();
        inputContainer.style.margin = '1em 0';

        const input = inputContainer.createEl('input', {
            type: 'text',
            value: this.suggestedName
        });
        input.style.width = '100%';
        
        input.focus();
        input.select();

        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '1em';
        buttonContainer.style.marginTop = '1em';

        const submitButton = buttonContainer.createEl('button', {
            text: 'Save'
        });
        submitButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.onSubmit(input.value);
            this.close();
        });

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        cancelButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.onSubmit(null);
            this.close();
        });

        // Handle Enter key with event prevention
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                setTimeout(() => {
                    this.onSubmit(input.value);
                    this.close();
                }, 0);
            }
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

// Add new function to wait for potential file rename
async function waitForFileRename(file, plugin) {
    return new Promise((resolve) => {
        const initialPath = file.path;
        let timeoutId;
        let renamedPath = null;

        // Helper function to validate file existence
        const validatePath = async (path) => {
            if (!path) return false;
            return await plugin.app.vault.adapter.exists(path);
        };

        // Track rename events
        const handleRename = async (theFile) => {
            if (theFile?.path) {
                renamedPath = theFile?.path;
            }
        };

        const cleanup = () => {
            plugin.app.vault.off('rename', handleRename);
        };

        // Listen for rename events
        plugin.app.vault.on('rename', handleRename);

        // Set timeout to validate and resolve
        timeoutId = setTimeout(async () => {
            cleanup();

            // 1. Check renamedPath
            if (renamedPath) {
                const exists = await validatePath(renamedPath);
                if (exists) {
                    return resolve(renamedPath);
                }
            }

            // 2. Check initialPath
            const initialExists = await validatePath(initialPath);
            if (initialExists) {
                return resolve(initialPath);
            }

            resolve(null);
        }, 1500);
    });
}
