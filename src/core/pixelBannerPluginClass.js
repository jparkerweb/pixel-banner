import { Plugin, MarkdownView, requestUrl, Notice } from 'obsidian';
import { releaseNotes } from 'virtual:release-notes';
import { DEFAULT_SETTINGS, PixelBannerSettingTab, debounce } from '../settings/settings.js';
import { 
    ReleaseNotesModal, ImageSelectionModal,
    TargetPositionModal, GenerateAIBannerModal
} from '../modal/modals.js';
import { getFrontmatterValue } from '../utils/frontmatterUtils.js';
import { handlePinIconClick } from '../utils/handlePinIconClick.js';
import { loadSettings, saveSettings } from './settings.js';
import { getIconOverlay, returnIconOverlay, shouldUpdateIconOverlay, handleSetBannerIcon } from './bannerIconHelpers.js'; 
import { generateCacheKey, getCacheEntriesForFile, cleanupCache, invalidateLeafCache } from './cacheHelpers.js';
import {
    makeRequest,
    fetchPexelsImage,
    fetchPixabayImage,
    fetchFlickrImage,
    fetchUnsplashImage
} from '../services/apiService.js';
import {
    verifyPixelBannerPlusCredentials
} from '../services/apiPIxelBannerPlus.js';
import {
    addPixelBanner,
    updateBanner,
    applyBannerSettings,
    applyContentStartPosition,
    applyBannerWidth,
    updateAllBanners,
    updateBannerPosition
} from './bannerManager.js';




// -----------------------
// -- main plugin class --
// -----------------------
export class PixelBannerPlugin extends Plugin {
    // Update modes for banner refresh
    UPDATE_MODE = {
        FULL_UPDATE: 'FULL_UPDATE',             // Complete update including new images
        ENSURE_VISIBILITY: 'ENSURE_VISIBILITY', // Only ensure banner is visible with current image
        SHUFFLE_UPDATE: 'SHUFFLE_UPDATE'        // Update for shuffle banners only
    };

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
    
    // Enhanced cache management properties
    bannerStateCache = new Map();
    MAX_CACHE_AGE = 30 * 60 * 1000; // 30 minutes in milliseconds
    MAX_CACHE_ENTRIES = 30; // Maximum number of entries to keep in cache
    SHUFFLE_CACHE_AGE = 5 * 1000; // 5 seconds in milliseconds for shuffled banners

    // Add element pool for icon overlays
    iconOverlayPool = [];
    MAX_POOL_SIZE = 10;


    // ----------------------------------------------------
    // -- bind imported functions to the plugin instance --
    // ----------------------------------------------------
    async loadSettings() { await loadSettings(this); }
    async saveSettings() { await saveSettings(this); }
    getIconOverlay() { return getIconOverlay(this); }
    returnIconOverlay(overlay) { returnIconOverlay(this, overlay); }
    shouldUpdateIconOverlay(existingOverlay, newIconState, viewType) { 
        return shouldUpdateIconOverlay(this, existingOverlay, newIconState, viewType); 
    }
    generateCacheKey(filePath, leafId, isShuffled = false) {
        return generateCacheKey.call(this, filePath, leafId, isShuffled);
    }
    getCacheEntriesForFile(filePath) {
        return getCacheEntriesForFile.call(this, filePath);
    }
    cleanupCache(force = false) {
        return cleanupCache.call(this, force);
    }
    invalidateLeafCache(leafId) {
        return invalidateLeafCache.call(this, leafId);
    }
    handleSetBannerIcon() { 
        return handleSetBannerIcon(this); 
    }

    // Bind imported functions to the plugin instance
    addPixelBanner(el, ctx) { return addPixelBanner(this, el, ctx); }
    updateBanner(view, isContentChange, updateMode) { return updateBanner(this, view, isContentChange, updateMode); }
    applyBannerSettings(bannerDiv, ctx, isEmbedded) { return applyBannerSettings(this, bannerDiv, ctx, isEmbedded); }
    applyContentStartPosition(el, contentStartPosition) { return applyContentStartPosition(this, el, contentStartPosition); }
    applyBannerWidth(el) { return applyBannerWidth(this, el); }
    updateAllBanners() { return updateAllBanners(this); }
    updateBannerPosition(file, position) { return updateBannerPosition(this, file, position); }

    // Helper to normalize color values for comparison
    normalizeColor(color) {
        if (!color || color === 'transparent' || color === 'none') return 'transparent';
        // Convert rgb/rgba to lowercase and remove spaces
        return color.toLowerCase().replace(/\s+/g, '');
    }


    // --------------------------------------
    // -- onload method / main entry point --
    // --------------------------------------
    async onload() {
        await this.loadSettings();
        
        // Initialize Pixel Banner Plus state
        this.pixelBannerPlusEnabled = false;
        this.pixelBannerPlusBannerTokens = 0;
        this.verifyPixelBannerPlusCredentials();
        
        // hide embedded note titles
        this.updateEmbeddedTitlesVisibility();
        
        // Check version and show release notes if needed
        await this.checkVersion();
        
        this.addSettingTab(new PixelBannerSettingTab(this.app, this));
        
        // Add commands
        this.addCommand({
            id: 'generate-banner-with-ai',
            name: '✨ Generate Banner with AI',
            checkCallback: (checking) => {
                if (checking) {
                    return this.pixelBannerPlusEnabled;
                }
                new GenerateAIBannerModal(this.app, this).open();
            }
        });

        // Register event handlers
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', this.handleActiveLeafChange.bind(this))
        );
        this.registerEvent(
            this.app.workspace.on('layout-change', this.handleLayoutChange.bind(this))
        );
        this.registerEvent(
            this.app.workspace.on('resize', this.debouncedEnsureBanner.bind(this))
        );

        // Add metadata cache event listener for frontmatter changes
        this.registerEvent(
            this.app.metadataCache.on('changed', async (file) => {
                // console.log('🔍 Metadata changed detected for file:', file.path);
                
                // Get the frontmatter
                const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
                if (!frontmatter) {
                    // console.log('❌ No frontmatter found, skipping update');
                    return;
                }

                // Get the previous frontmatter
                const previousFrontmatter = this.lastFrontmatter.get(file.path);
                // console.log('📊 Frontmatter comparison:', {
                //     current: frontmatter,
                //     previous: previousFrontmatter
                // });

                // Check if frontmatter actually changed
                if (JSON.stringify(frontmatter) === JSON.stringify(previousFrontmatter)) {
                    // console.log('🟡 Frontmatter unchanged, skipping update');
                    return;
                }

                // Check if any relevant fields exist and changed in the frontmatter
                const relevantFields = [
                    ...this.settings.customBannerField,
                    ...this.settings.customYPositionField,
                    ...this.settings.customXPositionField,
                    ...this.settings.customContentStartField,
                    ...this.settings.customImageDisplayField,
                    ...this.settings.customImageRepeatField,
                    ...this.settings.customBannerHeightField,
                    ...this.settings.customFadeField,
                    ...this.settings.customBorderRadiusField,
                    ...this.settings.customTitleColorField,
                    ...this.settings.customBannerShuffleField,
                    ...this.settings.customBannerIconField,
                    ...this.settings.customBannerIconSizeField,
                    ...this.settings.customBannerIconXPositionField,
                    ...this.settings.customBannerIconOpacityField,
                    ...this.settings.customBannerIconColorField,
                    ...this.settings.customBannerIconFontWeightField,
                    ...this.settings.customBannerIconBackgroundColorField,
                    ...this.settings.customBannerIconPaddingXField,
                    ...this.settings.customBannerIconPaddingYField,
                    ...this.settings.customBannerIconBorderRadiusField,
                    ...this.settings.customBannerIconVeritalOffsetField
                ];

                // console.log('🔎 Checking relevant fields:', relevantFields);

                const changedFields = relevantFields.filter(field => 
                    frontmatter[field] !== previousFrontmatter?.[field]
                );

                const hasRelevantFieldChange = changedFields.length > 0;
                // console.log('🔄 Changed fields:', changedFields);

                if (!hasRelevantFieldChange) {
                    // console.log('🟡 No relevant fields changed, skipping update');
                    return;
                }

                // console.log('✅ Relevant changes detected, updating banner');
                // Update the stored frontmatter
                this.lastFrontmatter.set(file.path, frontmatter);

                // Find all visible markdown leaves for this file
                const leaves = this.app.workspace.getLeavesOfType("markdown");
                for (const leaf of leaves) {
                    if (leaf.view instanceof MarkdownView && leaf.view.file === file) {
                        // console.log('🔄 Updating banner for leaf:', leaf.id);
                        // Force a refresh of the banner
                        this.loadedImages.delete(file.path);
                        this.lastKeywords.delete(file.path);
                        await this.updateBanner(leaf.view, true);
                    }
                }
            })
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
                const canPin = imageUrl && (inputType === 'keyword' || inputType === 'url') && this.settings.showPinIcon;
                
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

        // Add command for selecting banner image
        this.addCommand({
            id: 'set-banner-image',
            name: '🏷️ Select Image',
            callback: () => this.handleSelectImage()
        });

        // Add command for setting banner icon
        this.addCommand({
            id: 'set-banner-icon',
            name: '⭐ Set Banner Icon',
            checkCallback: (checking) => {
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (!activeView || !activeView.file) return false;

                // Get the current banner settings and check all possible banner fields
                const frontmatter = this.app.metadataCache.getFileCache(activeView.file)?.frontmatter;
                let hasBanner = false;

                // Check all custom banner fields
                for (const field of this.settings.customBannerField) {
                    if (frontmatter?.[field]) {
                        hasBanner = true;
                        break;
                    }
                }
                
                if (checking) return hasBanner;

                if (hasBanner) {
                    // Bind this context explicitly
                    handleSetBannerIcon(this);
                }
                return true;
            }
        });

        // Add command to open targeting modal
        this.addCommand({
            id: 'set-banner-position',
            name: '🎯 Set Banner Position',
            checkCallback: (checking) => {
                const activeFile = this.app.workspace.getActiveFile();
                const hasBanner = activeFile && this.hasBannerFrontmatter(activeFile);
                
                if (checking) {
                    return hasBanner;
                }

                if (hasBanner) {
                    new TargetPositionModal(
                        this.app,
                        this,
                        (position) => this.updateBannerPosition(activeFile, position)
                    ).open();
                    return true;
                }
                return false;
            }
        });

        // Ensure bannerGap has a default value if it doesn't exist
        if (this.settings.bannerGap === undefined) {
            this.settings.bannerGap = DEFAULT_SETTINGS.bannerGap;
        }

        // Force banner updates after frontmatter changes resolve
        this.registerEvent(
            this.app.metadataCache.on('resolved', () => {
                const leaf = this.app.workspace.activeLeaf;
                if (leaf && leaf.view instanceof MarkdownView) {
                    // Only update if we have a banner and it's not just a content change
                    const contentEl = leaf.view.contentEl;
                    const hasBanner = contentEl.querySelector('.pixel-banner-image');
                    if (hasBanner) {
                        // Check if this is a frontmatter change by looking at the metadata cache
                        const file = leaf.view.file;
                        const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
                        const previousFrontmatter = this.lastFrontmatter.get(file.path);
                        
                        // Only update if frontmatter changed
                        if (JSON.stringify(frontmatter) !== JSON.stringify(previousFrontmatter)) {
                            this.updateBanner(leaf.view, false);
                        }
                    }
                }
            })
        );
    }



    async handleActiveLeafChange(leaf) {
        // Run periodic cache cleanup
        this.cleanupCache();

        // If no leaf or not a markdown view, just clean up previous
        if (!leaf || !(leaf.view instanceof MarkdownView) || !leaf.view.file) {
            return;
        }

        const currentPath = leaf.view.file.path;
        const leafId = leaf.id;
        const frontmatter = this.app.metadataCache.getFileCache(leaf.view.file)?.frontmatter;
        const currentTime = Date.now();

        try {
            // Check if this note uses shuffle functionality
            const hasShufflePath = !!getFrontmatterValue(frontmatter, this.settings.customBannerShuffleField);
            const folderSpecific = this.getFolderSpecificImage(currentPath);
            const isShuffled = hasShufflePath || folderSpecific?.enableImageShuffle || false;

            // Generate cache key using the new method
            const cacheKey = this.generateCacheKey(currentPath, leafId, isShuffled);

            // Check cache first
            const cachedState = this.bannerStateCache.get(cacheKey);
            const loadedImage = this.loadedImages.get(currentPath);
            
            let shouldUpdateBanner = false;

            if (cachedState) {
                // Update timestamp to keep entry fresh
                cachedState.timestamp = currentTime;

                // For shuffled banners, check if cache has expired
                if (isShuffled && (currentTime - cachedState.timestamp > this.SHUFFLE_CACHE_AGE)) {
                    shouldUpdateBanner = true;
                    // Cache expired for shuffled banner, force update
                    this.loadedImages.delete(currentPath);
                    this.lastKeywords.delete(currentPath);
                    this.imageCache.delete(currentPath);
                    this.bannerStateCache.delete(cacheKey);
                } else {
                    // Compare frontmatter for relevant changes
                    const relevantFields = [
                        ...this.settings.customBannerField,
                        ...this.settings.customYPositionField,
                        ...this.settings.customXPositionField,
                        ...this.settings.customContentStartField,
                        ...this.settings.customImageDisplayField,
                        ...this.settings.customImageRepeatField,
                        ...this.settings.customBannerHeightField,
                        ...this.settings.customFadeField,
                        ...this.settings.customBorderRadiusField,
                        ...this.settings.customTitleColorField,
                        ...this.settings.customBannerShuffleField,
                        ...this.settings.customBannerIconField,
                        ...this.settings.customBannerIconSizeField,
                        ...this.settings.customBannerIconXPositionField,
                        ...this.settings.customBannerIconOpacityField,
                        ...this.settings.customBannerIconColorField,
                        ...this.settings.customBannerIconFontWeightField,
                        ...this.settings.customBannerIconBackgroundColorField,
                        ...this.settings.customBannerIconPaddingXField,
                        ...this.settings.customBannerIconPaddingYField,
                        ...this.settings.customBannerIconBorderRadiusField,
                        ...this.settings.customBannerIconVeritalOffsetField
                    ];

                    const hasRelevantChanges = relevantFields.some(field => 
                        frontmatter?.[field] !== cachedState.frontmatter?.[field]
                    );

                    if (hasRelevantChanges) {
                        shouldUpdateBanner = true;
                    }
                }
            } else {
                shouldUpdateBanner = true;
            }

            // Always update banner if we don't have a loaded image for this path
            if (!loadedImage) {
                shouldUpdateBanner = true;
            }

            // At this point we know we need to update the banner
            // Clean up previous leaf first
            const previousLeaf = this.app.workspace.activeLeaf;
            if (previousLeaf && previousLeaf.view instanceof MarkdownView && previousLeaf !== leaf) {  // Only cleanup if it's actually a different leaf
                this.cleanupPreviousLeaf(previousLeaf);
            }

            // Update banner if needed
            if (shouldUpdateBanner) {
                await this.updateBanner(leaf.view, false, this.UPDATE_MODE.FULL_UPDATE);
                
                // Get icon state
                const bannerIcon = getFrontmatterValue(frontmatter, this.settings.customBannerIconField);
                const iconState = bannerIcon ? {
                    icon: bannerIcon,
                    size: getFrontmatterValue(frontmatter, this.settings.customBannerIconSizeField) || this.settings.bannerIconSize,
                    xPosition: getFrontmatterValue(frontmatter, this.settings.customBannerIconXPositionField) || this.settings.bannerIconXPosition,
                    opacity: getFrontmatterValue(frontmatter, this.settings.customBannerIconOpacityField) || this.settings.bannerIconOpacity,
                    color: getFrontmatterValue(frontmatter, this.settings.customBannerIconColorField) || this.settings.bannerIconColor,
                    fontWeight: getFrontmatterValue(frontmatter, this.settings.customBannerIconFontWeightField) || this.settings.bannerIconFontWeight,
                    backgroundColor: getFrontmatterValue(frontmatter, this.settings.customBannerIconBackgroundColorField) || this.settings.bannerIconBackgroundColor,
                    paddingX: getFrontmatterValue(frontmatter, this.settings.customBannerIconPaddingXField) || this.settings.bannerIconPaddingX,
                    paddingY: getFrontmatterValue(frontmatter, this.settings.customBannerIconPaddingYField) || this.settings.bannerIconPaddingY,
                    borderRadius: getFrontmatterValue(frontmatter, this.settings.customBannerIconBorderRadiusField) || this.settings.bannerIconBorderRadius,
                    verticalOffset: getFrontmatterValue(frontmatter, this.settings.customBannerIconVeritalOffsetField) || this.settings.bannerIconVeritalOffset
                } : null;

                // Cache the new state
                this.bannerStateCache.set(cacheKey, {
                    timestamp: currentTime,
                    frontmatter: frontmatter ? {...frontmatter} : null,
                    leafId,
                    isShuffled,
                    state: {
                        imageUrl: this.loadedImages.get(currentPath),
                        iconState
                    }
                });
            } else {
                // Even if we don't need to update the banner, we should still ensure it's visible
                await this.updateBanner(leaf.view, false, this.UPDATE_MODE.ENSURE_VISIBILITY);
            }

        } catch (error) {
            console.error('Error in handleActiveLeafChange:', error);
            // Cleanup on error
            this.invalidateLeafCache(leafId);
            // Attempt recovery
            try {
                await this.updateBanner(leaf.view, false);
            } catch (recoveryError) {
                console.error('Failed to recover from error:', recoveryError);
            }
        }
    }

    cleanupPreviousLeaf(previousLeaf) {
        const previousContentEl = previousLeaf.view.contentEl;
        
        // Remove pixel-banner class
        previousContentEl.classList.remove('pixel-banner');
        
        // Clean up banner in both edit and preview modes
        ['cm-sizer', 'markdown-preview-sizer'].forEach(selector => {
            const container = previousContentEl.querySelector(`div.${selector}`);
            if (container) {
                const previousBanner = container.querySelector(':scope > .pixel-banner-image');
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

                // Clean up banner icon overlays - but only non-persistent ones
                const iconOverlays = container.querySelectorAll(':scope > .banner-icon-overlay');
                iconOverlays.forEach(overlay => {
                    if (!overlay.dataset.persistent) {
                        this.returnIconOverlay(overlay);
                    }
                });
            }
        });
    }

    handleLayoutChange() {
        // Get current leaves to compare with cached ones
        const currentLeafIds = new Set(
            this.app.workspace.getLeavesOfType('markdown')
                .map(leaf => leaf.id)
        );

        // Find and invalidate cache entries for closed leaves
        for (const [key, entry] of this.bannerStateCache) {
            if (entry.leafId && !currentLeafIds.has(entry.leafId)) {
                // This leaf no longer exists, clean up its cache
                if (entry.state?.imageUrl?.startsWith('blob:')) {
                    URL.revokeObjectURL(entry.state.imageUrl);
                }
                this.bannerStateCache.delete(key);
            }
        }

        // Handle layout changes for active leaf
        setTimeout(() => {
            const activeLeaf = this.app.workspace.activeLeaf;
            if (activeLeaf && activeLeaf.view instanceof MarkdownView) {
                // Only update if we have a banner
                const contentEl = activeLeaf.view.contentEl;
                const hasBanner = contentEl.querySelector('.pixel-banner-image');
                if (hasBanner) {
                    // Check if we have a valid cache entry before updating
                    const cacheKey = activeLeaf.id;
                    const cachedState = this.bannerStateCache.get(cacheKey);
                    
                    // Only update if we don't have a valid cache entry
                    if (!cachedState) {
                        this.updateBanner(activeLeaf.view, false);
                    }
                }
            }
        }, 100);
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



    setupMutationObserver() {
        // console.log('📝 Setting up mutation observer');
        this.observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'childList') {
                    const removedNodes = Array.from(mutation.removedNodes);
                    const addedNodes = Array.from(mutation.addedNodes);

                    // Only care about banner removal or structural changes
                    const bannerRemoved = removedNodes.some(node => 
                        node.classList && node.classList.contains('pixel-banner-image')
                    );

                    // Only care about major structural changes that could affect banner placement
                    const structuralChange = addedNodes.some(node => 
                        node.nodeType === Node.ELEMENT_NODE && 
                        (node.classList.contains('markdown-preview-section') || 
                         node.classList.contains('cm-sizer'))  // Changed from cm-content to cm-sizer
                    );

                    if (bannerRemoved || structuralChange) {
                        // console.log('🔄 Mutation observer detected change:', { bannerRemoved, structuralChange });
                        // Clean up pixel-banner class if no banner is present
                        const activeLeaf = this.app.workspace.activeLeaf;
                        if (activeLeaf && activeLeaf.view instanceof MarkdownView) {
                            const contentEl = activeLeaf.view.contentEl;
                            const hasBanner = contentEl.querySelector('.pixel-banner-image[style*="display: block"]');
                            if (!hasBanner) {
                                contentEl.classList.remove('pixel-banner');
                            }
                            // Only update banner if it was removed or if there was a structural change
                            // AND if we actually have a banner to restore
                            if ((bannerRemoved || structuralChange) && hasBanner) {
                                this.debouncedEnsureBanner();
                            }
                        }
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
        // console.log('🔄 debouncedEnsureBanner called from:', new Error().stack.split('\n')[2].trim());
        const activeLeaf = this.app.workspace.activeLeaf;
        if (activeLeaf && activeLeaf.view instanceof MarkdownView) {
            // Only update if we have a banner
            const contentEl = activeLeaf.view.contentEl;
            const hasBanner = contentEl.querySelector('.pixel-banner-image');
            if (hasBanner) {
                this.updateBanner(activeLeaf.view, false);
            }
        }
    }, 100);

    getFolderSpecificImage(filePath) {
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

    // Helper method to create folder image settings object
    createFolderImageSettings(folderImage) {
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

    getFolderPath(filePath) {
        if (!filePath) return '/';
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
            const keywords = input.includes(',') 
                ? input.split(',')
                    .map(k => k.trim())
                    .filter(k => k.length > 0)
                    .filter(Boolean)
                : [input];
            
            if (keywords.length > 0) {
                const selectedKeyword = keywords[Math.floor(Math.random() * keywords.length)];
                const provider = this.getActiveApiProvider();
                
                // Check if the selected provider has an API key before attempting to fetch
                const apiKey = provider === 'pexels' ? this.settings.pexelsApiKey :
                             provider === 'pixabay' ? this.settings.pixabayApiKey :
                             provider === 'flickr' ? this.settings.flickrApiKey :
                             provider === 'unsplash' ? this.settings.unsplashApiKey : null;
                
                if (!apiKey) {
                    // Just save the keyword without showing a warning
                    return null;
                }
                
                switch (provider) {
                    case 'pexels': return fetchPexelsImage(this, selectedKeyword);
                    case 'pixabay': return fetchPixabayImage(this, selectedKeyword);
                    case 'flickr': return fetchFlickrImage(this, selectedKeyword);
                    case 'unsplash': return fetchUnsplashImage(this, selectedKeyword);
                    default: return null;
                }
            }
        }
        return null;
    }

    async fetchPexelsImage(keyword) {
        const apiKey = this.settings.pexelsApiKey;
        if (!apiKey) {
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
                const response = await makeRequest(`${apiUrl}?${params}`);
                
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
                
                const response = await makeRequest(searchUrl);
                
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

                const response = await makeRequest(`${apiUrl}?${params}`, {
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

    getPathFromObsidianLink(link) {
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

    async getVaultImageUrl(path) {
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
                        ...this.settings.customXPositionField,
                        ...this.settings.customContentStartField,
                        ...this.settings.customImageDisplayField,
                        ...this.settings.customImageRepeatField,
                        ...this.settings.customBannerHeightField,
                        ...this.settings.customFadeField,
                        ...this.settings.customBorderRadiusField,
                        ...this.settings.customTitleColorField,
                        ...this.settings.customBannerShuffleField,
                        ...this.settings.customBannerIconField,
                        ...this.settings.customBannerIconSizeField,
                        ...this.settings.customBannerIconXPositionField,
                        ...this.settings.customBannerIconOpacityField,
                        ...this.settings.customBannerIconColorField,
                        ...this.settings.customBannerIconFontWeightField,
                        ...this.settings.customBannerIconBackgroundColorField,
                        ...this.settings.customBannerIconPaddingXField,
                        ...this.settings.customBannerIconPaddingYField,
                        ...this.settings.customBannerIconBorderRadiusField,
                        ...this.settings.customBannerIconVeritalOffsetField
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
        
        // Clean up resize observers
        this.app.workspace.iterateAllLeaves(leaf => {
            if (leaf.view instanceof MarkdownView) {
                const viewContent = leaf.view.contentEl;
                if (viewContent._resizeObserver) {
                    viewContent._resizeObserver.disconnect();
                    delete viewContent._resizeObserver;
                }
            }
        });
        
        // Clear the icon overlay pool
        this.iconOverlayPool = [];
        
        const styleElTitle = document.getElementById('pixel-banner-embedded-titles');
        if (styleElTitle) styleElTitle.remove();
        const styleElBanner = document.getElementById('pixel-banner-embedded-banners');
        if (styleElBanner) styleElBanner.remove();
    }



    // Update the resize observer setup to only observe the view-content element
    setupResizeObserver(viewContent) {
        if (!viewContent.classList.contains('view-content')) {
            return;
        }

        if (!viewContent._resizeObserver) {
            const debouncedResize = debounce(() => {
                this.applyBannerWidth(viewContent);
            }, 100);

            viewContent._resizeObserver = new ResizeObserver(debouncedResize);
            viewContent._resizeObserver.observe(viewContent);
        }
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
                            let cleanPath;
                            if (bannerValue.startsWith('[[') && bannerValue.endsWith(']]')) {
                                // Remove [[ and ]] and any quotes
                                cleanPath = bannerValue.slice(2, -2).replace(/["']/g, '');
                            } else {
                                // Just remove any quotes
                                cleanPath = bannerValue.replace(/["']/g, '');
                            }
                            
                            // If the path doesn't start with the folder path, try to resolve it
                            if (!cleanPath.startsWith(folderPath)) {
                                const resolvedFile = this.app.metadataCache.getFirstLinkpathDest(cleanPath, file.path);
                                if (resolvedFile) {
                                    cleanPath = resolvedFile.path;
                                }
                            }
                            
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

    // -----------------------------------------
    // -- show release notes for new versions --
    // -----------------------------------------
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

    // -----------------------------------------------
    // -- get release notes for the current version --
    // -----------------------------------------------
    async getReleaseNotes(version) {
        return releaseNotes;
    }



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

        return availableProviders[Math.floor(Math.random() * availableProviders.length)];
    }

    async verifyPixelBannerPlusCredentials() {
        const result = await verifyPixelBannerPlusCredentials(this);
        this.pixelBannerPlusEnabled = result.verified;
        this.pixelBannerPlusBannerTokens = result.bannerTokens;
        return result.verified;
    }

    getRandomImageFromFolder(folderPath) {
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

    updateFieldVisibility(view) {
        if (!view || view.getMode() !== 'preview') return;

        const fieldsToHide = [
            ...this.settings.customBannerField,
            ...this.settings.customYPositionField,
            ...this.settings.customXPositionField,
            ...this.settings.customContentStartField,
            ...this.settings.customImageDisplayField,
            ...this.settings.customImageRepeatField,
            ...this.settings.customBannerHeightField,
            ...this.settings.customFadeField,
            ...this.settings.customBorderRadiusField,
            ...this.settings.customTitleColorField,
            ...this.settings.customBannerShuffleField,
            ...this.settings.customBannerIconField,
            ...this.settings.customBannerIconSizeField,
            ...this.settings.customBannerIconXPositionField,
            ...this.settings.customBannerIconOpacityField,
            ...this.settings.customBannerIconColorField,
            ...this.settings.customBannerIconFontWeightField,
            ...this.settings.customBannerIconBackgroundColorField,
            ...this.settings.customBannerIconPaddingXField,
            ...this.settings.customBannerIconPaddingYField,
            ...this.settings.customBannerIconBorderRadiusField,
            ...this.settings.customBannerIconVeritalOffsetField
        ];

        const propertiesContainer = view.contentEl.querySelector('.metadata-container');
        if (!propertiesContainer) {
            return;
        }

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

    updateEmbeddedTitlesVisibility() {
        const styleId = 'pixel-banner-embedded-titles';
        let styleEl = document.getElementById(styleId);
        
        if (this.settings.hideEmbeddedNoteTitles) {
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = styleId;
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = '.embed-title.markdown-embed-title { display: none !important; }';
        } else if (styleEl) {
            styleEl.remove();
        }
    }
    updateEmbeddedBannersVisibility() {
        const styleId = 'pixel-banner-embedded-banners';
        let styleEl = document.getElementById(styleId);
        
        if (this.settings.hideEmbeddedNoteBanners) {
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = styleId;
                document.head.appendChild(styleEl);
            }
            styleEl.textContent = `
                .internal-embed .pixel-banner-image {
                    display: none !important;
                }
                .internal-embed > .markdown-embed-content .cm-sizer:first-of-type,
                .internal-embed > .markdown-embed-content .markdown-preview-sizer:first-of-type {
                    padding-top: unset !important;
                }
            `;
        } else if (styleEl) {
            styleEl.remove();
        }
    }

    async handleSelectImage() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('No active file');
            return;
        }

        new ImageSelectionModal(
            this.app,
            this,
            async (selectedFile) => {
                let imageReference = selectedFile.path;  // Default to full path

                if (this.settings.useShortPath) {
                    // Check if filename is unique in vault
                    const allFiles = this.app.vault.getFiles();
                    const matchingFiles = allFiles.filter(f => f.name === selectedFile.name);
                        
                    // Use short path only if filename is unique
                    imageReference = matchingFiles.length === 1 ? 
                    selectedFile.name : 
                    selectedFile.path;
                }

                let fileContent = await this.app.vault.read(activeFile);
                const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
                const hasFrontmatter = frontmatterRegex.test(fileContent);
                
                const bannerField = Array.isArray(this.settings.customBannerField) && 
                    this.settings.customBannerField.length > 0 ? 
                    this.settings.customBannerField[0] : 'banner';

                fileContent = fileContent.replace(/^\s+/, '');

                let updatedContent;
                if (hasFrontmatter) {
                    updatedContent = fileContent.replace(frontmatterRegex, (match, frontmatter) => {
                        let cleanedFrontmatter = frontmatter.trim();
                        
                        this.settings.customBannerField.forEach(field => {
                            const fieldRegex = new RegExp(`${field}:\\s*.+\\n?`, 'g');
                            cleanedFrontmatter = cleanedFrontmatter.replace(fieldRegex, '');
                        });

                        cleanedFrontmatter = cleanedFrontmatter.trim();
                        const newFrontmatter = `${bannerField}: "[[${imageReference}]]"${cleanedFrontmatter ? '\n' + cleanedFrontmatter : ''}`;
                        return `---\n${newFrontmatter}\n---`;
                    });
                } else {
                    const cleanContent = fileContent.replace(/^\s+/, '');
                    updatedContent = `---\n${bannerField}: "[[${imageReference}]]"\n---\n\n${cleanContent}`;
                }

                updatedContent = updatedContent.replace(/^\s+/, '');
                
                if (updatedContent !== fileContent) {
                    await this.app.vault.modify(activeFile, updatedContent);
                    if (this.settings.useShortPath && imageReference === selectedFile.path) {
                        new Notice('Banner image updated (full path used due to duplicate filenames)');
                    } else {
                        new Notice('Banner image updated');
                    }
                }
            },
            this.settings.defaultSelectImagePath
        ).open();
    }


    hasBannerFrontmatter(file) {
        const metadata = this.app.metadataCache.getFileCache(file);
        return metadata?.frontmatter?.banner !== undefined;
    }
}