import { Plugin, MarkdownView, requestUrl, Notice, Modal } from 'obsidian';
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
    pendingImageUpdates = new Map(); // Track files waiting for potential renames

    async onload() {
        await this.loadSettings();
        
        // Check version and show release notes if needed
        await this.checkVersion();
        
        this.addSettingTab(new PixelBannerSettingTab(this.app, this));
        
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', this.handleActiveLeafChange.bind(this))
        );

        this.registerEvent(
            this.app.metadataCache.on('changed', this.handleMetadataChange.bind(this))
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
        // Clear the image cache when settings are saved
        this.loadedImages.clear();
        this.lastKeywords.clear();
        this.imageCache.clear();
        // Trigger an update for the active leaf
        const activeLeaf = this.app.workspace.activeLeaf;
        if (activeLeaf && activeLeaf.view.getViewType() === "markdown") {
            await this.updateBanner(activeLeaf.view, true);
        }
    }

    async handleActiveLeafChange(leaf) {
        if (leaf && leaf.view instanceof MarkdownView && leaf.view.file) {
            await this.updateBanner(leaf.view, false);
        }
    }

    async handleMetadataChange(file) {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (activeLeaf && activeLeaf.view instanceof MarkdownView && activeLeaf.view.file && activeLeaf.view.file === file) {
            const currentFrontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
            const cachedFrontmatter = this.lastFrontmatter.get(file.path);

            if (this.isFrontmatterChange(cachedFrontmatter, currentFrontmatter)) {
                this.lastFrontmatter.set(file.path, currentFrontmatter);
                await this.updateBanner(activeLeaf.view, true);
            }
        }
    }

    isFrontmatterChange(cachedFrontmatter, currentFrontmatter) {
        if (!cachedFrontmatter && !currentFrontmatter) return false;
        if (!cachedFrontmatter || !currentFrontmatter) return true;
        return JSON.stringify(cachedFrontmatter) !== JSON.stringify(currentFrontmatter);
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
        }
    }

    async updateBanner(view, isContentChange) {
        if (!view || !view.file) {
            return;
        }

        const frontmatter = this.app.metadataCache.getFileCache(view.file)?.frontmatter;
        const contentEl = view.contentEl;
        
        let yPosition = this.settings.yPosition;
        let contentStartPosition = this.settings.contentStartPosition;
        let bannerImage = getFrontmatterValue(frontmatter, this.settings.customBannerField);

        // Handle comma-delimited banner values in frontmatter
        if (bannerImage && typeof bannerImage === 'string' && !bannerImage.startsWith('[[')) {
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
                bannerImage = null; // Reset to null if no valid values
            }
        }

        // Flatten the bannerImage if it's an array within an array
        if (Array.isArray(bannerImage)) {
            bannerImage = bannerImage.flat()[0];
            bannerImage = `[[${bannerImage}]]`;
        }

        // Check for folder-specific settings
        const folderSpecific = this.getFolderSpecificImage(view.file.path);
        if (folderSpecific) {
            bannerImage = bannerImage || folderSpecific.image;
            yPosition = folderSpecific.yPosition;
            contentStartPosition = folderSpecific.contentStartPosition;
        }

        // Override with note-specific settings if available
        if (frontmatter) {
            const customYPosition = getFrontmatterValue(frontmatter, this.settings.customYPositionField);
            if (customYPosition !== undefined) {
                yPosition = customYPosition;
            }
            const customContentStart = getFrontmatterValue(frontmatter, this.settings.customContentStartField);
            if (customContentStart !== undefined) {
                contentStartPosition = customContentStart;
            }
        }
        
        if (isContentChange) {
            this.loadedImages.delete(view.file.path);
            this.lastKeywords.delete(view.file.path);
        }
        
        await this.addPixelBanner(contentEl, { 
            frontmatter, 
            file: view.file, 
            isContentChange,
            yPosition,
            contentStartPosition,
            customBannerField: this.settings.customBannerField,
            customYPositionField: this.settings.customYPositionField,
            customContentStartField: this.settings.customContentStartField,
            bannerImage,
            isReadingView: view.getMode && view.getMode() === 'preview'
        });

        this.lastYPositions.set(view.file.path, yPosition);

        // Process embedded notes
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

    async addPixelBanner(el, ctx) {
        const { frontmatter, file, isContentChange, yPosition, contentStartPosition, bannerImage, isReadingView } = ctx;
        const viewContent = el;

        // Check if this is an embedded note
        const isEmbedded = viewContent.classList.contains('internal-embed');

        if (!isEmbedded && !viewContent.classList.contains('view-content')) {
            return;
        }

        viewContent.classList.toggle('pixel-banner', !!bannerImage);

        let container;
        if (isEmbedded) {
            container = viewContent.querySelector('.markdown-embed-content');
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
            
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // !!!! PERSISTENT BANNER FIX !!!!
            // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
            // Mark banner as persistent
            bannerDiv._isPersistentBanner = true;
            
            // Create pin icon if needed
            if (this.settings.showPinIcon) {
                pinIcon = createDiv({ cls: 'pin-icon' });
                pinIcon.style.position = 'absolute';
                pinIcon.style.top = '10px';
                pinIcon.style.left = '5px';
                pinIcon.style.fontSize = '1.5em';
                pinIcon.style.cursor = 'pointer';
                pinIcon.innerHTML = '📌';
                pinIcon._isPersistentPin = true;
                container.insertBefore(pinIcon, bannerDiv.nextSibling);
            }
            
            // Override the setChildrenInPlace method for this container
            if (!container._hasOverriddenSetChildrenInPlace) {
                const originalSetChildrenInPlace = container.setChildrenInPlace;
                container.setChildrenInPlace = function(children) {
                    // Add our persistent elements to the new children set
                    const bannerElement = this.querySelector(':scope > .pixel-banner-image');
                    const pinElement = this.querySelector(':scope > .pin-icon');
                    
                    children = Array.from(children);
                    if (bannerElement?._isPersistentBanner) {
                        children = [bannerElement, ...children];
                    }
                    if (pinElement?._isPersistentPin) {
                        children.splice(1, 0, pinElement); // Insert after banner
                    }
                    
                    originalSetChildrenInPlace.call(this, children);
                };
                container._hasOverriddenSetChildrenInPlace = true;
            }
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
                bannerDiv.style.backgroundImage = `url('${imageUrl}')`;
                bannerDiv.style.backgroundPosition = `center ${yPosition}%`;
                bannerDiv.style.backgroundSize = getFrontmatterValue(frontmatter, this.settings.customImageDisplayField) || 
                    this.getFolderSpecificSetting(file.path, 'imageDisplay') || 
                    this.settings.imageDisplay || 
                    'cover';
                
                const shouldRepeat = getFrontmatterValue(frontmatter, this.settings.customImageRepeatField);
                if (shouldRepeat !== undefined) {
                    // Convert the value to a boolean
                    const repeatValue = String(shouldRepeat).toLowerCase() === 'true';
                    bannerDiv.style.backgroundRepeat = repeatValue ? 'repeat' : 'no-repeat';
                } else {
                    bannerDiv.style.backgroundRepeat = (bannerDiv.style.backgroundSize === 'contain' && 
                        (this.getFolderSpecificSetting(file.path, 'imageRepeat') || this.settings.imageRepeat)) ? 'repeat' : 'no-repeat';
                }
                
                // Set the banner height
                const bannerHeight = getFrontmatterValue(frontmatter, this.settings.customBannerHeightField) ||
                    this.getFolderSpecificSetting(file.path, 'bannerHeight') ||
                    this.settings.bannerHeight ||
                    350;
                bannerDiv.style.setProperty('--pixel-banner-height', `${bannerHeight}px`);

                // Set the fade effect
                const fadeValue = getFrontmatterValue(frontmatter, this.settings.customFadeField) ??
                    this.getFolderSpecificSetting(file.path, 'fade') ??
                    this.settings.fade ??
                    -75;
                
                // Apply the fade value directly as a percentage
                bannerDiv.style.setProperty('--pixel-banner-fade', `${fadeValue}%`);

                // Set the border radius
                const borderRadius = getFrontmatterValue(frontmatter, this.settings.customBorderRadiusField) ??
                    this.getFolderSpecificSetting(file.path, 'borderRadius') ??
                    this.settings.borderRadius ??
                    17;
                bannerDiv.style.setProperty('--pixel-banner-radius', `${borderRadius}px`);
                
                bannerDiv.style.display = 'block';

                // Only add pin icon if the image is from an API (keyword type) and showPinIcon is enabled
                if (inputType === 'keyword' && this.settings.showPinIcon && pinIcon) {
                    pinIcon.style.display = 'block';
                    pinIcon.onclick = async () => {
                        try {
                            await handlePinIconClick(imageUrl, this);
                        } catch (error) {
                            console.error('Error pinning image:', error);
                            new Notice('😭 Failed to pin the image.');
                        }
                    };
                } else if (pinIcon) {
                    pinIcon.style.display = 'none';
                }
            }
        } else {
            bannerDiv.style.display = 'none';
            if (pinIcon) {
                pinIcon.style.display = 'none';
            }
            this.loadedImages.delete(file.path);
            this.lastKeywords.delete(file.path);
            // Reset the content start position when there's no banner
            this.applyContentStartPosition(viewContent, 0);
        }

        // Apply the content start position
        this.applyContentStartPosition(viewContent, contentStartPosition);
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
        for (const folderImage of this.settings.folderImages) {
            // Handle comma-delimited image values in folder settings
            let folderBannerImage = folderImage.image;
            if (folderBannerImage && typeof folderBannerImage === 'string' && !folderBannerImage.startsWith('[[')) {
                const bannerValues = folderBannerImage.includes(',') 
                    ? folderBannerImage.split(',')
                        .map(v => v.trim())
                        .filter(v => v.length > 0)
                        .filter(Boolean)
                    : [folderBannerImage];
                
                // Only select random if we have valid values
                if (bannerValues.length > 0) {
                    folderBannerImage = bannerValues[Math.floor(Math.random() * bannerValues.length)];
                } else {
                    folderBannerImage = null;
                }
            }

            // Special handling for root folder
            if (folderImage.folder === '/') {
                if (folderImage.directChildrenOnly) {
                    // For root with directChildrenOnly, only match files directly in root
                    if (!filePath.includes('/')) {
                        return {
                            image: folderBannerImage,
                            yPosition: folderImage.yPosition,
                            contentStartPosition: folderImage.contentStartPosition
                        };
                    }
                } else {
                    // For root without directChildrenOnly, match all files
                    return {
                        image: folderBannerImage,
                        yPosition: folderImage.yPosition,
                        contentStartPosition: folderImage.contentStartPosition
                    };
                }
                continue;
            }

            // Normal folder path handling
            if (folderImage.directChildrenOnly) {
                if (folderPath === folderImage.folder) {
                    return {
                        image: folderBannerImage,
                        yPosition: folderImage.yPosition,
                        contentStartPosition: folderImage.contentStartPosition
                    };
                }
            } else if (folderPath.startsWith(folderImage.folder)) {
                return {
                    image: folderBannerImage,
                    yPosition: folderImage.yPosition,
                    contentStartPosition: folderImage.contentStartPosition
                };
            }
        }
        return null;
    }

    getFolderPath(filePath) {
        // Special case: if filePath has no slashes, it's in root
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
                    .filter(k => k.length > 0)  // Filter out empty strings
                    .filter(Boolean)  // Filter out null/undefined/empty values
                : [input];
            
            // Only proceed if we have valid keywords
            if (keywords.length > 0) {
                const selectedKeyword = keywords[Math.floor(Math.random() * keywords.length)];
                if (this.settings.apiProvider === 'pexels') {
                    return this.fetchPexelsImage(selectedKeyword);
                } else if (this.settings.apiProvider === 'pixabay') {
                    return this.fetchPixabayImage(selectedKeyword);
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

        // console.log('Entering fetchPixabayImage with keyword:', keyword);
        const defaultKeywords = this.settings.defaultKeywords.split(',').map(k => k.trim());
        const keywordsToTry = [keyword, ...defaultKeywords];
        const maxAttempts = 4;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const currentKeyword = attempt === 0 ? keyword : keywordsToTry[Math.floor(Math.random() * keywordsToTry.length)];
            // console.log(`Attempt ${attempt + 1} with keyword: ${currentKeyword}`);

            const apiUrl = 'https://pixabay.com/api/';
            const params = new URLSearchParams({
                key: apiKey,
                q: encodeURIComponent(currentKeyword),
                image_type: 'photo',
                per_page: this.settings.numberOfImages,
                safesearch: true,
            });

            // console.log('Pixabay API URL:', `${apiUrl}?${params}`);

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

    async makeRequest(url) {
        const now = Date.now();
        if (now - this.rateLimiter.lastRequestTime < this.rateLimiter.minInterval) {
            // console.log('Rate limiting in effect, waiting...');
            await new Promise(resolve => setTimeout(resolve, this.rateLimiter.minInterval));
        }
        this.rateLimiter.lastRequestTime = Date.now();

        try {
            const response = await requestUrl({ url });
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

        // Check if it's an Obsidian internal link
        if (input.startsWith('[[') && input.endsWith(']]')) {
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
                return URL.createObjectURL(blob);
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
                // console.log('updateAllBanners', leaf.view);
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
        }
    }

    onunload() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    applyContentStartPosition(el, contentStartPosition) {
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

async function handlePinIconClick(imageUrl, plugin) {
    // console.log('🎯 Starting pin process...');
    const imageBlob = await fetchImage(imageUrl);
    // console.log('📥 Image fetched successfully');
    
    const { initialPath, file } = await saveImageLocally(imageBlob, plugin);
    // console.log('💾 Initial save complete:', { initialPath, file });
    
    // Set up file monitoring for potential rename/move
    // console.log('👀 Waiting for potential file rename...');
    const finalPath = await waitForFileRename(file, plugin);
    
    if (!finalPath) {
        console.error('❌ Failed to resolve valid file path');
        new Notice('Failed to save image - file not found');
        return;
    }
    
    // console.log('✅ File path resolved:', finalPath);
    await updateNoteFrontmatter(finalPath, plugin);
    // console.log('📝 Frontmatter updated');
    hidePinIcon();
}

async function fetchImage(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Image download failed');
    // Get the array buffer directly instead of blob
    return await response.arrayBuffer();
}

async function saveImageLocally(arrayBuffer, plugin) {
    const vault = plugin.app.vault;
    const folderPath = plugin.settings.pinnedImageFolder;

    // Ensure the folder exists
    if (!await vault.adapter.exists(folderPath)) {
        await vault.createFolder(folderPath);
    }

    // Prompt user for filename
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
    
    // Return both the initial path and the TFile object
    return {
        initialPath: filePath,
        file: savedFile
    };
}

async function updateNoteFrontmatter(imagePath, plugin) {
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) return;

    const fileContent = await app.vault.read(activeFile);
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const hasFrontmatter = frontmatterRegex.test(fileContent);
    
    // Get the first available banner field name from settings
    const bannerField = Array.isArray(plugin.settings.customBannerField) && plugin.settings.customBannerField.length > 0
        ? plugin.settings.customBannerField[0]  // Use first defined custom field name
        : 'banner';  // Fallback to 'banner' if no custom fields defined

    let updatedContent;
    if (hasFrontmatter) {
        // Update existing frontmatter
        updatedContent = fileContent.replace(frontmatterRegex, (match, frontmatter) => {
            // Check if banner field already exists
            const bannerRegex = new RegExp(`${bannerField}:\\s*.+`);
            if (bannerRegex.test(frontmatter)) {
                // Update existing banner field
                return match.replace(bannerRegex, `${bannerField}: ${imagePath}`);
            } else {
                // Add new banner field to existing frontmatter
                return `---\n${frontmatter.trim()}\n${bannerField}: ${imagePath}\n---`;
            }
        });
    } else {
        // Create new frontmatter
        updatedContent = `---\n${bannerField}: ${imagePath}\n---\n\n${fileContent}`;
    }

    await app.vault.modify(activeFile, updatedContent);
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

        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '1em';
        buttonContainer.style.marginTop = '1em';

        const submitButton = buttonContainer.createEl('button', {
            text: 'Save'
        });
        submitButton.addEventListener('click', () => {
            this.onSubmit(input.value);
            this.close();
        });

        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        cancelButton.addEventListener('click', () => {
            this.onSubmit(null);
            this.close();
        });

        // Handle Enter key
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                this.onSubmit(input.value);
                this.close();
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
        // console.log('🔍 Starting file watch for:', initialPath);
        let timeoutId;
        let renamedPath = null;

        // Helper function to validate file existence
        const validatePath = async (path) => {
            if (!path) return false;
            return await plugin.app.vault.adapter.exists(path);
        };

        // Track rename events
        const handleRename = async (theFile) => {
            // console.log('📂 Rename detected:', {
            //     theFile: theFile?.path
            // });
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
            // console.log('⏰ Timeout reached, checking paths in order...');
            cleanup();

            // Check paths in preferred order
            // console.log('Checking paths:', {
            //     renamedPath: renamedPath,
            //     initialPath: initialPath
            // });

            // 1. Check renamedPath
            if (renamedPath) {
                const exists = await validatePath(renamedPath);
                // console.log('renamedPath exists:', exists);
                if (exists) {
                    // console.log('✅ Using renamedPath:', renamedPath);
                    return resolve(renamedPath);
                }
            }

            // 2. Check initialPath
            const initialExists = await validatePath(initialPath);
            // console.log('initialPath exists:', initialExists);
            if (initialExists) {
                // console.log('✅ Using initialPath:', initialPath);
                return resolve(initialPath);
            }

            // No valid paths found
            // console.log('❌ No valid path found');
            resolve(null);
        }, 1500);
    });
}

