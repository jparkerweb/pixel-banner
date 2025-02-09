import { Plugin, MarkdownView, requestUrl, Notice } from 'obsidian';
import { releaseNotes } from 'virtual:release-notes';
import { DEFAULT_SETTINGS, PixelBannerSettingTab, debounce } from '../settings/settings.js';
import { PIXEL_BANNER_PLUS } from '../resources/constants.js';
import { 
    ReleaseNotesModal, ImageViewModal, ImageSelectionModal, EmojiSelectionModal,
    TargetPositionModal, GenerateAIBannerModal
} from '../modal/modals.js';
import { getFrontmatterValue } from '../utils/frontmatterUtils.js';
import { handlePinIconClick } from '../utils/handlePinIconClick.js';
import { loadSettings, saveSettings } from './settings.js';
import { getIconOverlay, returnIconOverlay, shouldUpdateIconOverlay } from './iconOverlay.js'; 



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


    async loadSettings() { await loadSettings(this); }
    async saveSettings() { await saveSettings(this); }
    getIconOverlay() { getIconOverlay(this); }
    returnIconOverlay() { returnIconOverlay(this) }
    shouldUpdateIconOverlay() { shouldUpdateIconOverlay(this) }



    // Helper method to generate cache key
    generateCacheKey(filePath, leafId, isShuffled = false) {
        // Ensure filePath is properly encoded to handle special characters and numbers
        const encodedPath = encodeURIComponent(filePath);
        return `${encodedPath}-${leafId}${isShuffled ? '-shuffle' : ''}`;
    }



    // Helper to normalize color values for comparison
    normalizeColor(color) {
        if (!color || color === 'transparent' || color === 'none') return 'transparent';
        // Convert rgb/rgba to lowercase and remove spaces
        return color.toLowerCase().replace(/\s+/g, '');
    }

    // Helper method to get all cache entries for a file
    getCacheEntriesForFile(filePath) {
        const encodedPath = encodeURIComponent(filePath);
        return Array.from(this.bannerStateCache.entries())
            .filter(([key]) => key.startsWith(`${encodedPath}-`));
    }

    // Enhanced cache cleanup method
    cleanupCache(force = false) {
        const now = Date.now();
        
        // Clean up by age
        for (const [key, entry] of this.bannerStateCache) {
            // Use shorter timeout for shuffle images
            const maxAge = entry.isShuffled ? this.SHUFFLE_CACHE_AGE : this.MAX_CACHE_AGE;
            if (force || now - entry.timestamp > maxAge) {
                // Clean up any persistent icon overlays for this entry
                if (entry.leafId) {
                    const leaf = this.app.workspace.getLeafById(entry.leafId);
                    if (leaf?.view instanceof MarkdownView) {
                        const contentEl = leaf.view.contentEl;
                        ['cm-sizer', 'markdown-preview-sizer'].forEach(selector => {
                            const container = contentEl.querySelector(`.${selector}`);
                            if (container) {
                                const iconOverlays = container.querySelectorAll('.banner-icon-overlay[data-persistent="true"]');
                                iconOverlays.forEach(overlay => overlay.remove());
                            }
                        });
                    }
                }

                // Clean up blob URLs
                if (entry.state?.imageUrl?.startsWith('blob:')) {
                    URL.revokeObjectURL(entry.state.imageUrl);
                }
                this.bannerStateCache.delete(key);
            }
        }
        
        // Clean up by size if not doing a force cleanup
        if (!force && this.bannerStateCache.size > this.MAX_CACHE_ENTRIES) {
            // Sort entries by timestamp (oldest first)
            const entries = Array.from(this.bannerStateCache.entries())
                .sort(([, a], [, b]) => a.timestamp - b.timestamp);
            
            // Remove oldest entries until we're at max size
            while (entries.length > this.MAX_CACHE_ENTRIES) {
                const [key, entry] = entries.shift();
                // Clean up any persistent icon overlays for this entry
                if (entry.leafId) {
                    const leaf = this.app.workspace.getLeafById(entry.leafId);
                    if (leaf?.view instanceof MarkdownView) {
                        const contentEl = leaf.view.contentEl;
                        ['cm-sizer', 'markdown-preview-sizer'].forEach(selector => {
                            const container = contentEl.querySelector(`.${selector}`);
                            if (container) {
                                const iconOverlays = container.querySelectorAll('.banner-icon-overlay[data-persistent="true"]');
                                iconOverlays.forEach(overlay => overlay.remove());
                            }
                        });
                    }
                }

                // Clean up blob URLs
                if (entry.state?.imageUrl?.startsWith('blob:')) {
                    URL.revokeObjectURL(entry.state.imageUrl);
                }
                this.bannerStateCache.delete(key);
            }
        }
    }

    // Helper to invalidate cache for a specific leaf
    invalidateLeafCache(leafId) {
        for (const [key, entry] of this.bannerStateCache) {
            if (key.includes(`-${leafId}`)) {
                // Clean up any persistent icon overlays
                const leaf = this.app.workspace.getLeafById(leafId);
                if (leaf?.view instanceof MarkdownView) {
                    const contentEl = leaf.view.contentEl;
                    ['cm-sizer', 'markdown-preview-sizer'].forEach(selector => {
                        const container = contentEl.querySelector(`.${selector}`);
                        if (container) {
                            const iconOverlays = container.querySelectorAll('.banner-icon-overlay[data-persistent="true"]');
                            iconOverlays.forEach(overlay => overlay.remove());
                        }
                    });
                }

                // Clean up blob URLs
                if (entry.state?.imageUrl?.startsWith('blob:')) {
                    URL.revokeObjectURL(entry.state.imageUrl);
                }
                this.bannerStateCache.delete(key);
            }
        }
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
                    this.handleSetBannerIcon();
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

    async updateBanner(view, isContentChange, updateMode = this.UPDATE_MODE.FULL_UPDATE) {
        // console.log('🎯 updateBanner called:', {
        //     file: view?.file?.path,
        //     isContentChange,
        //     updateMode,
        //     caller: new Error().stack.split('\n')[2].trim()
        // });

        if (!view || !view.file) {
            // console.log('❌ updateBanner: Invalid view or file');
            return;
        }

        // Add a small delay if this is a frontmatter change
        if (!isContentChange) {
            // console.log('⏳ Adding delay for non-content change');
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const frontmatter = this.app.metadataCache.getFileCache(view.file)?.frontmatter;
        const contentEl = view.contentEl;
        const isEmbedded = contentEl.classList.contains('internal-embed') && contentEl.classList.contains('markdown-embed');
        const viewContent = contentEl;  // Define viewContent here

        // Only clean up non-persistent overlays
        const nonPersistentOverlays = viewContent.querySelectorAll('.banner-icon-overlay:not([data-persistent="true"])');
        nonPersistentOverlays.forEach(overlay => overlay.remove());

        // Clean up any duplicate persistent overlays (keep only the one right after banner)
        ['markdown-preview-sizer', 'cm-sizer'].forEach(container => {
            const containerEl = viewContent.querySelector(`.${container}`);
            if (containerEl) {
                const bannerImage = containerEl.querySelector(':scope > .pixel-banner-image');
                if (bannerImage) {
                    const allOverlays = containerEl.querySelectorAll(':scope > .banner-icon-overlay[data-persistent="true"]');
                    allOverlays.forEach(overlay => {
                        // Only keep the overlay if it's immediately after the banner
                        if (overlay.previousElementSibling !== bannerImage) {
                            overlay.remove();
                        }
                    });
                }
            }
        });

        // Get existing banner before trying to use it
        const existingBanner = contentEl.querySelector('.pixel-banner-image');
        
        // Get folder-specific settings first
        const folderSpecific = this.getFolderSpecificImage(view.file.path);
        let bannerImage = null;

        // Check for banner shuffle path in frontmatter first
        const shufflePath = getFrontmatterValue(frontmatter, this.settings.customBannerShuffleField) || folderSpecific?.enableImageShuffle;
        if (shufflePath && updateMode !== this.UPDATE_MODE.ENSURE_VISIBILITY) {
            // If shuffle path exists in frontmatter and we're not just ensuring visibility,
            // get a new random image
            const randomImagePath = await this.getRandomImageFromFolder(shufflePath);
            if (randomImagePath) {
                bannerImage = randomImagePath;
            }
        } else if (shufflePath && updateMode === this.UPDATE_MODE.ENSURE_VISIBILITY) {
            // If we're just ensuring visibility, use the existing image from cache
            const cacheKey = this.generateCacheKey(view.file.path, this.app.workspace.activeLeaf.id, true);
            const cachedState = this.bannerStateCache.get(cacheKey);
            if (cachedState?.state?.imageUrl) {
                bannerImage = cachedState.state.imageUrl;
            } else {
                // If no cached image, fall back to getting a new one
                const randomImagePath = await this.getRandomImageFromFolder(shufflePath);
                if (randomImagePath) {
                    bannerImage = randomImagePath;
                }
            }
        }
        
        // If no shuffle path or no image found, fall back to regular banner or folder-specific image
        if (!bannerImage) {
            bannerImage = getFrontmatterValue(frontmatter, this.settings.customBannerField) || folderSpecific?.image;
        }
        
        // console.log("Banner state:", {
        //     bannerImage,
        //     isEmbedded,
        //     hasFrontmatter: !!frontmatter,
        //     hasExistingBanner: !!existingBanner
        // });
        
        if (!isEmbedded && !bannerImage) {
            contentEl.classList.remove('pixel-banner');
            if (existingBanner) {
                existingBanner.style.backgroundImage = '';
                existingBanner.style.display = 'none';
            }
        } else if (isEmbedded && !bannerImage) {
            // Set default values for embedded notes without banners
            const embedRoot = viewContent.closest('.internal-embed.markdown-embed');
            if (embedRoot) {
                embedRoot.style.setProperty('--pixel-banner-embed-min-height', '1%');
                embedRoot.style.setProperty('--pixel-banner-content-start', '0');
            }
        }

        // Clear the loaded image for this file if it's a content change
        if (isContentChange) {
            this.loadedImages.delete(view.file.path);
            this.lastKeywords.delete(view.file.path);
        }

        // Initialize settings with either folder-specific or default values
        let yPosition = folderSpecific?.yPosition ?? this.settings.yPosition;
        let xPosition = folderSpecific?.xPosition ?? this.settings.xPosition;
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
                        .filter(v => v.length > 0)
                        .filter(Boolean)
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
                xPosition,
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
            const embeddedNotes = contentEl.querySelectorAll('.internal-embed.markdown-embed');

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

        if (!bannerImage) {
            const viewContent = view.contentEl;
            const isReadingView = view.getMode && view.getMode() === 'preview';
            let container = isReadingView 
                ? viewContent.querySelector('.markdown-preview-sizer:not(.internal-embed .markdown-preview-sizer)') || viewContent.querySelector('.markdown-preview-view')
                : viewContent.querySelector('.cm-sizer') || viewContent.querySelector('.markdown-source-view');

            if (!container && viewContent.classList.contains('markdown-preview-view')) {
                container = viewContent;
            }

            // Clean up any existing icons first
            const oldViewIcons = container.querySelectorAll('.view-image-icon');
            const oldPinIcons = container.querySelectorAll('.pin-icon');
            const oldRefreshIcons = container.querySelectorAll('.refresh-icon');
            const oldSelectIcons = container.querySelectorAll('.select-image-icon');
            const oldBannerIconButtons = container.querySelectorAll('.set-banner-icon-button');
            const oldTargetBtns = container.querySelectorAll('.target-btn');

            [...oldViewIcons, ...oldPinIcons, ...oldRefreshIcons, ...oldSelectIcons, ...oldBannerIconButtons, ...oldTargetBtns].forEach(el => el.remove());

            // Only add select image icon if not embedded
            if (!isEmbedded && this.settings.showSelectImageIcon && container) {
                const existingSelectIcon = container.querySelector('.select-image-icon');
                if (!existingSelectIcon) {
                    const selectImageIcon = createDiv({ cls: 'select-image-icon' });
                    selectImageIcon.style.position = 'absolute';
                    selectImageIcon.style.top = '10px';
                    selectImageIcon.style.left = `${this.settings.bannerGap + 5}px`;
                    selectImageIcon.style.fontSize = '1.5em';
                    selectImageIcon.style.cursor = 'pointer';
                    selectImageIcon.innerHTML = '🏷️';
                    selectImageIcon._isPersistentSelectImage = true;
                    selectImageIcon.onclick = () => this.handleSelectImage();
                    container.insertBefore(selectImageIcon, container.firstChild);
                }
            } else if (!this.settings.showSelectImageIcon && container) {
                const existingSelectIcon = container.querySelector('.select-image-icon');
                if (existingSelectIcon) {
                    existingSelectIcon.remove();
                }
            }

            // cleanup view image icon if it still exists
            if (container) {
                const existingViewImageIcon = container.querySelector('.view-image-icon');
                if (existingViewImageIcon) {
                    existingViewImageIcon.remove();
                }
            }
        }

        if (this.settings.hidePixelBannerFields && view.getMode() === 'preview') {
            this.updateFieldVisibility(view);
        }

        const bannerIcon = getFrontmatterValue(frontmatter, this.settings.customBannerIconField);

        // Only clean up overlays that belong to the current container context
        if (isEmbedded) {
            // For embedded notes, only clean up overlays within this specific embed
            const embedContainer = contentEl.querySelector('.markdown-preview-sizer') || 
                                  contentEl.querySelector('.markdown-embed-content') || 
                                  contentEl;
            const thisEmbedOverlays = embedContainer.querySelectorAll(':scope > .banner-icon-overlay:not([data-persistent="true"])');
            thisEmbedOverlays.forEach(overlay => overlay.remove());
        } else {
            // For main notes, clean up overlays in both source and preview views
            ['markdown-preview-view', 'markdown-source-view'].forEach(viewType => {
                const viewContainer = contentEl.querySelector(`.${viewType}`);
                if (viewContainer) {
                    const mainOverlays = viewContainer.querySelectorAll(':scope > .banner-icon-overlay:not([data-persistent="true"])');
                    mainOverlays.forEach(overlay => overlay.remove());
                }
            });
        }

        // Only proceed if we have a valid banner icon
        if (bannerIcon && typeof bannerIcon === 'string' && bannerIcon.trim()) {
            const cleanIcon = bannerIcon.trim();
            
            // Check cache first
            const cacheKey = this.generateCacheKey(view.file.path, this.app.workspace.activeLeaf.id);
            const cachedState = this.bannerStateCache.get(cacheKey);
            const cachedIconState = cachedState?.state?.iconState;

            // Function to create or update icon overlay
            const createOrUpdateIconOverlay = (banner, viewType) => {
                if (!banner) {
                    return;
                }
                
                // Get current icon state
                const currentIconState = {
                    icon: cleanIcon,
                    size: getFrontmatterValue(frontmatter, this.settings.customBannerIconSizeField) || this.settings.bannerIconSize,
                    xPosition: getFrontmatterValue(frontmatter, this.settings.customBannerIconXPositionField) || this.settings.bannerIconXPosition,
                    opacity: getFrontmatterValue(frontmatter, this.settings.customBannerIconOpacityField) || this.settings.bannerIconOpacity,
                    color: getFrontmatterValue(frontmatter, this.settings.customBannerIconColorField) || this.settings.bannerIconColor,
                    fontWeight: getFrontmatterValue(frontmatter, this.settings.customBannerIconFontWeightField) || this.settings.bannerIconFontWeight,
                    backgroundColor: getFrontmatterValue(frontmatter, this.settings.customBannerIconBackgroundColorField) || this.settings.bannerIconBackgroundColor,
                    paddingX: getFrontmatterValue(frontmatter, this.settings.customBannerIconPaddingXField) || this.settings.bannerIconPaddingX,
                    paddingY: getFrontmatterValue(frontmatter, this.settings.customBannerIconPaddingYField) || this.settings.bannerIconPaddingY,
                    borderRadius: getFrontmatterValue(frontmatter, this.settings.customBannerIconBorderRadiusField) || this.settings.bannerIconBorderRadius,
                    verticalOffset: getFrontmatterValue(frontmatter, this.settings.customBannerIconVeritalOffsetField) || this.settings.bannerIconVeritalOffset,
                    viewType
                };
                
                // Check if we already have a persistent icon overlay
                const existingOverlay = banner.nextElementSibling?.classList?.contains('banner-icon-overlay') ? 
                    banner.nextElementSibling : null;
                
                if (existingOverlay) {
                    // Only update if necessary
                    if (!this.shouldUpdateIconOverlay(existingOverlay, currentIconState, viewType)) {
                        return existingOverlay;
                    }
                    // Return the old overlay to the pool if we're going to update
                    this.returnIconOverlay(existingOverlay);
                }
                
                // Get a new or pooled overlay
                const bannerIconOverlay = this.getIconOverlay();
                
                bannerIconOverlay.dataset.viewType = viewType;
                bannerIconOverlay.dataset.persistent = 'true';
                bannerIconOverlay.textContent = cleanIcon;
                bannerIconOverlay._isPersistentBannerIcon = true;
                bannerIconOverlay.style.display = 'block'; // Ensure visibility

                // Apply styles
                bannerIconOverlay.style.fontSize = `${currentIconState.size}px`;
                bannerIconOverlay.style.left = `${currentIconState.xPosition}%`;
                bannerIconOverlay.style.opacity = `${currentIconState.opacity}%`;
                bannerIconOverlay.style.color = currentIconState.color;
                bannerIconOverlay.style.fontWeight = currentIconState.fontWeight;
                bannerIconOverlay.style.backgroundColor = currentIconState.backgroundColor;
                bannerIconOverlay.style.padding = `${currentIconState.paddingY}px ${currentIconState.paddingX}px`;
                bannerIconOverlay.style.borderRadius = `${currentIconState.borderRadius}px`;
                bannerIconOverlay.style.marginTop = `${currentIconState.verticalOffset}px`;

                banner.insertAdjacentElement('afterend', bannerIconOverlay);
                return bannerIconOverlay;
            };

            // For embedded notes, only apply to preview view
            if (isEmbedded) {
                const embedContainer = contentEl.querySelector('.markdown-preview-sizer') || 
                                     contentEl.querySelector('.markdown-embed-content') || 
                                     contentEl;
                const previewBanner = embedContainer.querySelector(':scope > .pixel-banner-image');
                createOrUpdateIconOverlay(previewBanner, 'preview');
            } else {
                // For main notes, apply to both views
                const previewContainer = contentEl.querySelector('div.markdown-preview-sizer');
                const sourceContainer = contentEl.querySelector('div.cm-sizer');
                
                if (previewContainer) {
                    const previewBanner = previewContainer.querySelector(':scope > .pixel-banner-image');
                    if (previewBanner) createOrUpdateIconOverlay(previewBanner, 'preview');
                }
                
                if (sourceContainer) {
                    const sourceBanner = sourceContainer.querySelector(':scope > .pixel-banner-image');
                    if (sourceBanner) createOrUpdateIconOverlay(sourceBanner, 'source');
                }
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
                
                // Check if the selected provider has an API key before attempting to fetch
                const apiKey = provider === 'pexels' ? this.settings.pexelsApiKey :
                             provider === 'pixabay' ? this.settings.pixabayApiKey :
                             provider === 'flickr' ? this.settings.flickrApiKey :
                             provider === 'unsplash' ? this.settings.unsplashApiKey : null;
                
                if (!apiKey) {
                    // Just save the keyword without showing a warning
                    return null;
                }
                
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

    applyContentStartPosition(el, contentStartPosition) {
        if (!el) {
            return;
        }
        el.style.setProperty('--pixel-banner-content-start', `${contentStartPosition}px`);
    }

    applyBannerWidth(el) {
        if (!el) return;

        setTimeout(() => {
            // Only proceed if this is the view-content element
            if (!el.classList.contains('view-content')) {
                return;
            }

            const theWidth = el.clientWidth;
            const bannerGap = this.settings.bannerGap;
            
            // Set the variables only once at the root level
            el.style.setProperty('--pixel-banner-width', `${theWidth - (bannerGap * 2)}px`);
            el.style.setProperty('--pixel-banner-banner-gap', `${bannerGap}px`);
        }, 50);
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

    // ----------------------
    // -- add pixel banner --
    // ----------------------
    async addPixelBanner(el, ctx) {
        // console.log("addPixelBanner called with:", { 
        //     isEmbedded: el?.classList?.contains('internal-embed'),
        //     hasFile: ctx?.file?.path,
        //     bannerImage: ctx?.bannerImage,
        //     isReadingView: ctx?.isReadingView
        // });

        const { frontmatter, file, isContentChange, yPosition, xPosition, contentStartPosition, bannerImage, isReadingView } = ctx;
        const viewContent = el;
        const isEmbedded = viewContent.classList.contains('internal-embed') && viewContent.classList.contains('markdown-embed');
        
        // Only add pixel-banner class to div.view-content
        if (!isEmbedded && viewContent.classList.contains('view-content')) {
            viewContent.classList.add('pixel-banner');
            // Setup resize observer and initial width
            this.setupResizeObserver(viewContent);
            this.applyBannerWidth(viewContent);
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
                ? viewContent.querySelector('.markdown-preview-sizer:not(.internal-embed .markdown-preview-sizer)') || viewContent.querySelector('.markdown-preview-view')
                : viewContent.querySelector('.cm-sizer') || viewContent.querySelector('.markdown-source-view');

            if (!container && viewContent.classList.contains('markdown-preview-view')) {
                container = viewContent;
            }
        }

        if (!container) {
            return;
        }

        // 1) Find (or create) the pixel-banner-image div
        let bannerDiv = container.querySelector(':scope > .pixel-banner-image');
        if (!bannerDiv) {
            bannerDiv = createDiv({ cls: 'pixel-banner-image' });
            container.insertBefore(bannerDiv, container.firstChild);
            bannerDiv._isPersistentBanner = true;
        }

        // 2) Remove existing icons (to avoid stacking or flicker)
        const oldViewIcons = container.querySelectorAll('.view-image-icon');
        const oldTargetIcons = container.querySelectorAll('.target-btn');
        const oldPinIcons = container.querySelectorAll('.pin-icon');
        const oldRefreshIcons = container.querySelectorAll('.refresh-icon');
        const oldSelectIcons = container.querySelectorAll('.select-image-icon');
        const oldBannerIconButtons = container.querySelectorAll('.set-banner-icon-button');

        // console.log("Cleaning up old icons:", {
        //     viewIcons: oldViewIcons.length,
        //     targetIcons: oldTargetIcons.length,
        //     pinIcons: oldPinIcons.length,
        //     refreshIcons: oldRefreshIcons.length,
        //     selectIcons: oldSelectIcons.length,
        //     bannerIconButtons: oldBannerIconButtons.length
        // });

        [...oldViewIcons, ...oldTargetIcons, ...oldPinIcons, ...oldRefreshIcons, ...oldSelectIcons, ...oldBannerIconButtons].forEach(el => el.remove());

        // 3) If embedded, just update the embedded banners' visibility and skip icon creation
        if (isEmbedded) {
            this.updateEmbeddedBannersVisibility();
        }
        // Else, add icons if settings allow
        else {
            let leftOffset = this.settings.bannerGap + 5;
            // console.log("Starting icon creation, showSelectImageIcon:", this.settings.showSelectImageIcon);

            // "Select image" + "Set banner icon"
            if (this.settings.showSelectImageIcon) {
                const selectImageIcon = createDiv({ cls: 'select-image-icon' });
                selectImageIcon.style.position = 'absolute';
                selectImageIcon.style.top = '10px';
                selectImageIcon.style.left = `${leftOffset}px`;
                selectImageIcon.style.fontSize = '1.5em';
                selectImageIcon.style.cursor = 'pointer';
                selectImageIcon.innerHTML = '🏷️';
                selectImageIcon._isPersistentSelectImage = true;

                selectImageIcon.onclick = () => this.handleSelectImage();
                container.appendChild(selectImageIcon);
                leftOffset += 35;

                // console.log("bannerImage value:", bannerImage);
                // Only show banner icon button if a banner exists
                if (bannerImage) {
                    const setBannerIconButton = createDiv({ cls: 'set-banner-icon-button' });
                    setBannerIconButton.style.position = 'absolute';
                    setBannerIconButton.style.top = '10px';
                    setBannerIconButton.style.left = `${leftOffset}px`;
                    setBannerIconButton.style.fontSize = '1.5em';
                    setBannerIconButton.style.cursor = 'pointer';
                    setBannerIconButton.innerHTML = '⭐';
                    setBannerIconButton._isPersistentSetBannerIcon = true;

                    setBannerIconButton.onclick = () => this.handleSetBannerIcon();
                    container.appendChild(setBannerIconButton);
                    leftOffset += 35;
                }
            }

            // "View image" icon
            if (bannerImage && this.settings.showViewImageIcon && !isEmbedded) {
                const viewImageIcon = createDiv({ cls: 'view-image-icon' });
                viewImageIcon.style.position = 'absolute';
                viewImageIcon.style.top = '10px';
                viewImageIcon.style.left = `${leftOffset}px`;
                viewImageIcon.style.fontSize = '1.5em';
                viewImageIcon.style.cursor = 'pointer';
                viewImageIcon.style.display = 'none'; // hidden until we have an image
                viewImageIcon._isPersistentViewImage = true;
                viewImageIcon.innerHTML = '🖼️';

                // We'll update this once we actually load an image below
                viewImageIcon._updateVisibility = (newUrl) => {
                    viewImageIcon.style.display = newUrl ? 'block' : 'none';
                    if (newUrl) {
                        viewImageIcon.onclick = () => {
                            new ImageViewModal(this.app, newUrl).open();
                        };
                    }
                };

                container.appendChild(viewImageIcon);
                leftOffset += 35;
            }

            const activeFile = this.app.workspace.getActiveFile();
            const hasBanner = activeFile && this.hasBannerFrontmatter(activeFile);

            // "Target position" icon
            if (bannerImage && this.settings.showSetTargetXYPosition && !isEmbedded && hasBanner) {
                const targetBtn = createDiv({ cls: 'target-btn' });
                targetBtn.style.position = 'absolute';
                targetBtn.style.top = '10px';
                targetBtn.style.left = `${leftOffset}px`;
                targetBtn.style.fontSize = '1.5em';
                targetBtn.style.cursor = 'pointer';
                targetBtn._isPersistentTarget = true;
                targetBtn.innerHTML = '🎯';

                // Capture bannerImage in closure
                const currentBannerImage = bannerImage;

                targetBtn.onclick = () => {
                    new TargetPositionModal(
                        this.app,
                        this,
                        (x, y) => {

                            const activeFile = this.app.workspace.getActiveFile();
                            if (activeFile) {
                                const frontmatter = this.app.metadataCache.getFileCache(activeFile)?.frontmatter;
                                if (frontmatter) {
                                    const xFields = Array.isArray(this.settings.customXPositionField) 
                                        ? this.settings.customXPositionField[0].split(',')[0].trim()
                                        : this.settings.customXPositionField;
                                    const yFields = Array.isArray(this.settings.customYPositionField)
                                        ? this.settings.customYPositionField[0].split(',')[0].trim()
                                        : this.settings.customYPositionField;

                                    this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                                        fm[xFields] = x;
                                        fm[yFields] = y;
                                    });

                                    if (currentBannerImage && currentBannerImage.style) {
                                        currentBannerImage.style.objectPosition = `${x}% ${y}%`;
                                    }
                                }
                            }
                        }).open();
                };

                container._targetBtn = targetBtn;
                container.appendChild(targetBtn);
                leftOffset += 35;
            }
        }

        // 4) Override setChildrenInPlace to preserve persistent elements
        if (!container._hasOverriddenSetChildrenInPlace) {
            const originalSetChildrenInPlace = container.setChildrenInPlace;
            container.setChildrenInPlace = function(children) {
                // Get all persistent elements
                const bannerElement = this.querySelector(':scope > .pixel-banner-image');
                const viewImageElement = this.querySelector(':scope > .view-image-icon');
                const targetElement = this.querySelector(':scope > .target-btn');
                const pinElement = this.querySelector(':scope > .pin-icon');
                const refreshElement = this.querySelector(':scope > .refresh-icon');
                const selectImageElement = this.querySelector(':scope > .select-image-icon');
                const setBannerIconEl = this.querySelector(':scope > .set-banner-icon-button');
                const bannerIconOverlay = this.querySelector(':scope > .banner-icon-overlay');

                // Filter out old duplicates
                children = Array.from(children).filter(child => 
                    !child.classList?.contains('pixel-banner-image') &&
                    !child.classList?.contains('view-image-icon') &&
                    !child.classList?.contains('target-btn') &&
                    !child.classList?.contains('pin-icon') &&
                    !child.classList?.contains('refresh-icon') &&
                    !child.classList?.contains('select-image-icon') &&
                    !child.classList?.contains('set-banner-icon-button') &&
                    !child.classList?.contains('banner-icon-overlay')
                );

                // Re-inject "persistent" elements in the correct order:
                if (bannerElement?._isPersistentBanner) {
                    children.unshift(bannerElement);
                }
                if (bannerIconOverlay) {
                    children.push(bannerIconOverlay);
                }
                if (selectImageElement?._isPersistentSelectImage) {
                    children.push(selectImageElement);
                }
                if (setBannerIconEl?._isPersistentSetBannerIcon) {
                    children.push(setBannerIconEl);
                }
                if (viewImageElement?._isPersistentViewImage) {
                    children.push(viewImageElement);
                }
                if (targetElement?._isPersistentTarget) {
                    children.push(targetElement);
                }
                if (pinElement?._isPersistentPin) {
                    children.push(pinElement);
                }
                if (refreshElement?._isPersistentRefresh) {
                    children.push(refreshElement);
                }

                return originalSetChildrenInPlace.call(this, children);
            };
            container._hasOverriddenSetChildrenInPlace = true;
        }

        // 5) If we have a bannerImage, fetch or reuse it
        if (bannerImage) {
            let imageUrl = this.loadedImages.get(file.path);
            const lastInput = this.lastKeywords.get(file.path);
            const inputType = this.getInputType(bannerImage);

            // Check if this is a shuffled banner
            const hasShufflePath = getFrontmatterValue(frontmatter, this.settings.customBannerShuffleField);
            const folderSpecific = this.getFolderSpecificImage(file.path);
            const isShuffled = hasShufflePath || folderSpecific?.enableImageShuffle;

            // Force URL refresh for shuffled banners or normal cache miss conditions
            if (!imageUrl || isShuffled || (isContentChange && bannerImage !== lastInput)) {
                imageUrl = await this.getImageUrl(inputType, bannerImage);
                if (imageUrl) {
                    this.loadedImages.set(file.path, imageUrl);
                    this.lastKeywords.set(file.path, bannerImage);
                }
            }

            if (imageUrl) {
                // Display banner
                const folderSpecific = this.getFolderSpecificImage(file.path);
                const imageDisplay = getFrontmatterValue(frontmatter, this.settings.customImageDisplayField) ||
                    folderSpecific?.imageDisplay ||
                    this.settings.imageDisplay;
                const isSvg = imageUrl.includes('image/svg+xml') ||
                    (file.path && file.path.toLowerCase().endsWith('.svg'));

                // Add blob URL validation
                if (imageUrl.startsWith('blob:')) {
                    try {
                        // Attempt to fetch the blob URL to validate it
                        const response = await fetch(imageUrl);
                        if (!response.ok) {
                            throw new Error('Blob URL validation failed');
                        }
                    } catch (error) {
                        console.log('Blob URL invalid, refreshing image:', error);
                        // Clear the invalid blob URL from cache
                        this.loadedImages.delete(file.path);
                        URL.revokeObjectURL(imageUrl);
                        
                        // Get a fresh image URL
                        const inputType = this.getInputType(bannerImage);
                        const freshImageUrl = await this.getImageUrl(inputType, bannerImage);
                        if (freshImageUrl) {
                            imageUrl = freshImageUrl;
                            this.loadedImages.set(file.path, freshImageUrl);
                        }
                    }
                }

                bannerDiv.style.backgroundImage = `url('${imageUrl}')`;

                // SVG handling
                if (isSvg) {
                    bannerDiv.style.backgroundSize = imageDisplay === 'contain' ? 'contain' : '100% 100%';
                } else {
                    bannerDiv.style.backgroundSize = imageDisplay || 'cover';
                }
                bannerDiv.style.display = 'block';

                // If there's a "view image" icon, update it
                const viewImageIcon = container.querySelector(':scope > .view-image-icon');
                if (viewImageIcon && viewImageIcon._updateVisibility) {
                    viewImageIcon._updateVisibility(imageUrl);
                }

                // Apply other styling (fade, borderRadius, etc.)
                this.applyBannerSettings(bannerDiv, ctx, isEmbedded);

                // Get hide embedded note banners setting
                const hideEmbeddedNoteBanners = getFrontmatterValue(frontmatter, this.settings.customHideEmbeddedNoteBannersField) || 
                    folderSpecific?.hideEmbeddedNoteBanners || 
                    this.settings.hideEmbeddedNoteBanners || false;
                
                let effectiveContentStart = 0;
                if (!hideEmbeddedNoteBanners || !isEmbedded) {
                    const frontmatterContentStart = getFrontmatterValue(frontmatter, this.settings.customContentStartField);
                    const parsedFrontmatterStart = frontmatterContentStart ? Number(frontmatterContentStart) : null;
                    
                    effectiveContentStart = parsedFrontmatterStart ??
                        contentStartPosition ??
                        folderSpecific?.contentStartPosition ??
                        this.settings.contentStartPosition;
                }

                this.applyContentStartPosition(viewContent, effectiveContentStart);
                this.applyBannerWidth(viewContent);

                // 6) If pin icon is allowed, create it now
                const canPin = (inputType === 'keyword' || inputType === 'url') && this.settings.showPinIcon && !isEmbedded;
                if (canPin) {
                    // Insert pin icon
                    let leftOffset = this.settings.bannerGap + 5;
                    // We already created select & view icons above; find their last offset
                    // Actually simpler: Just pick a container query for them & measure
                    const iconEls = container.querySelectorAll('.select-image-icon, .set-banner-icon-button, .view-image-icon, .target-btn');
                    if (iconEls?.length) {
                        leftOffset = 10 + (35 * iconEls.length) + this.settings.bannerGap;
                    }

                    const pinIcon = createDiv({ cls: 'pin-icon' });
                    pinIcon.style.position = 'absolute';
                    pinIcon.style.top = '10px';
                    pinIcon.style.left = `${leftOffset}px`;
                    pinIcon.style.fontSize = '1.5em';
                    pinIcon.style.cursor = 'pointer';
                    pinIcon.innerHTML = '📌';
                    pinIcon._isPersistentPin = true;

                    pinIcon.onclick = async () => {
                        try {
                            await handlePinIconClick(imageUrl, this);
                        } catch (error) {
                            console.error('Error pinning image:', error);
                            new Notice('Failed to pin the image.');
                        }
                    };

                    container.appendChild(pinIcon);
                    leftOffset += 35;

                    // Refresh icon if it's a "keyword" banner
                    if (inputType === 'keyword' && this.settings.showRefreshIcon) {
                        const refreshIcon = createDiv({ cls: 'refresh-icon' });
                        refreshIcon.style.position = 'absolute';
                        refreshIcon.style.top = '10px';
                        refreshIcon.style.left = `${leftOffset}px`;
                        refreshIcon.style.fontSize = '1.5em';
                        refreshIcon.style.cursor = 'pointer';
                        refreshIcon.innerHTML = '🔄';
                        refreshIcon._isPersistentRefresh = true;

                        refreshIcon.onclick = async () => {
                            try {
                                this.loadedImages.delete(file.path);
                                this.lastKeywords.delete(file.path);

                                const newImageUrl = await this.getImageUrl(inputType, bannerImage);
                                if (newImageUrl) {
                                    this.loadedImages.set(file.path, newImageUrl);
                                    this.lastKeywords.set(file.path, bannerImage);

                                    bannerDiv.style.backgroundImage = `url('${newImageUrl}')`;

                                    const viewImageIcon = container.querySelector(':scope > .view-image-icon');
                                    if (viewImageIcon && viewImageIcon._updateVisibility) {
                                        viewImageIcon._updateVisibility(newImageUrl);
                                    }

                                    // Update pin icon with new URL
                                    pinIcon.onclick = async () => {
                                        try {
                                            await handlePinIconClick(newImageUrl, this);
                                        } catch (error) {
                                            console.error('Error pinning image:', error);
                                            new Notice('Failed to pin the image.');
                                        }
                                    };

                                    new Notice('🔄 Refreshed banner image');
                                }
                            } catch (error) {
                                console.error('Error refreshing image:', error);
                                new Notice('Failed to refresh image');
                            }
                        };

                        container.appendChild(refreshIcon);
                    }
                }
            } else {
                // No final imageUrl => hide banner
                bannerDiv.style.display = 'none';
                this.loadedImages.delete(file.path);
                this.lastKeywords.delete(file.path);

                if (!isEmbedded) {
                    viewContent.classList.remove('pixel-banner');
                }
            }
        }
    }

    applyBannerSettings(bannerDiv, ctx, isEmbedded) {
        const { frontmatter, imageDisplay, imageRepeat, bannerHeight, fade, borderRadius } = ctx;
        const folderSpecific = this.getFolderSpecificImage(ctx.file.path);
        
        // Get pixel banner y position
        const pixelBannerYPosition = getFrontmatterValue(frontmatter, this.settings.customYPositionField) || 
            folderSpecific?.yPosition || 
            this.settings.yPosition;
        
        // Get pixel banner x position
        const pixelBannerXPosition = getFrontmatterValue(frontmatter, this.settings.customXPositionField) || 
            folderSpecific?.xPosition || 
            this.settings.xPosition;

        // Get title color from frontmatter, folder settings, or default
        const titleColor = getFrontmatterValue(frontmatter, this.settings.customTitleColorField) || 
            folderSpecific?.titleColor || 
            this.settings.titleColor;

        // Get banner-icon size from frontmatter, folder settings, or default
        const bannerIconSize = getFrontmatterValue(frontmatter, this.settings.customBannerIconSizeField) || 
            folderSpecific?.bannerIconSize || 
            this.settings.bannerIconSize || 70;

        // Get banner-icon x position
        const bannerIconXPosition = getFrontmatterValue(frontmatter, this.settings.customBannerIconXPositionField) || 
            folderSpecific?.bannerIconXPosition || 
            this.settings.bannerIconXPosition || 25;

        // Get banner-icon opacity
        const bannerIconOpacity = getFrontmatterValue(frontmatter, this.settings.customBannerIconOpacityField) || 
            folderSpecific?.bannerIconOpacity || 
            this.settings.bannerIconOpacity || 100;

        // Get banner-icon color
        const bannerIconColor = getFrontmatterValue(frontmatter, this.settings.customBannerIconColorField) || 
            folderSpecific?.bannerIconColor || 
            this.settings.bannerIconColor || 'var(--text-normal)';

        // Get banner-icon font weight
        const bannerIconFontWeight = getFrontmatterValue(frontmatter, this.settings.customBannerIconFontWeightField) || 
            folderSpecific?.bannerIconFontWeight || 
            this.settings.bannerIconFontWeight || 'normal';

        // Get banner-icon background color
        const bannerIconBackgroundColor = getFrontmatterValue(frontmatter, this.settings.customBannerIconBackgroundColorField) || 
            folderSpecific?.bannerIconBackgroundColor || 
            this.settings.bannerIconBackgroundColor || 'transparent';

        // Get banner-icon padding X
        const bannerIconPaddingX = getFrontmatterValue(frontmatter, this.settings.customBannerIconPaddingXField) || 
            folderSpecific?.bannerIconPaddingX || 
            this.settings.bannerIconPaddingX || 0;

        // Get banner-icon padding Y
        const bannerIconPaddingY = getFrontmatterValue(frontmatter, this.settings.customBannerIconPaddingYField) || 
            folderSpecific?.bannerIconPaddingY || 
            this.settings.bannerIconPaddingY || 0;

        // Get banner-icon border radius
        const bannerIconBorderRadius = getFrontmatterValue(frontmatter, this.settings.customBannerIconBorderRadiusField) || 
            folderSpecific?.bannerIconBorderRadius || 
            this.settings.bannerIconBorderRadius || 17;

        // Get banner-icon vertical offset
        const bannerIconVeritalOffset = getFrontmatterValue(frontmatter, this.settings.customBannerIconVeritalOffsetField) || 
            folderSpecific?.bannerIconVeritalOffset || 
            this.settings.bannerIconVeritalOffset || 0;

        // Get hide embedded note banners
        const hideEmbeddedNoteBanners = getFrontmatterValue(frontmatter, this.settings.customHideEmbeddedNoteBannersField) || 
            folderSpecific?.hideEmbeddedNoteBanners || 
            this.settings.hideEmbeddedNoteBanners || false;

        bannerDiv.style.backgroundSize = imageDisplay || 'cover';
        bannerDiv.style.backgroundRepeat = imageRepeat ? 'repeat' : 'no-repeat';
        if (hideEmbeddedNoteBanners && isEmbedded) {
            bannerDiv.style.setProperty('--pixel-banner-height', `0px`);
        } else {
            bannerDiv.style.setProperty('--pixel-banner-height', `${bannerHeight}px`);
        }
        bannerDiv.style.setProperty('--pixel-banner-fade', `${fade}%`);
        bannerDiv.style.setProperty('--pixel-banner-fade-in-animation-duration', `${this.settings.bannerFadeInAnimationDuration}ms`);
        bannerDiv.style.setProperty('--pixel-banner-radius', `${borderRadius}px`);

        let bannerIconStart = `${bannerIconSize}px`;
        let bannerHeightPlusIcon = `0px`;
        if (!hideEmbeddedNoteBanners) {
            bannerIconStart = `${(bannerHeight - (bannerIconSize / 2))}px`;
            bannerHeightPlusIcon = `${(parseInt(bannerHeight) + (parseInt(bannerIconSize) / 2) + parseInt(bannerIconVeritalOffset) + parseInt(bannerIconPaddingY))}px`;
        }

        const container = bannerDiv.closest('.markdown-preview-view, .markdown-source-view');
        if (container) {
            container.style.setProperty('--pixel-banner-y-position', `${pixelBannerYPosition}%`);
            container.style.setProperty('--pixel-banner-x-position', `${pixelBannerXPosition}%`);
            container.style.setProperty('--pixel-banner-title-color', titleColor);
            container.style.setProperty('--pixel-banner-icon-size', `${bannerIconSize}px`);
            container.style.setProperty('--pixel-banner-icon-start', bannerIconStart);
            container.style.setProperty('--pixel-banner-icon-x', `${bannerIconXPosition}%`);
            container.style.setProperty('--pixel-banner-icon-opacity', `${bannerIconOpacity}%`);
            container.style.setProperty('--pixel-banner-icon-color', bannerIconColor);
            container.style.setProperty('--pixel-banner-icon-font-weight', bannerIconFontWeight);
            container.style.setProperty('--pixel-banner-icon-background-color', bannerIconBackgroundColor);
            container.style.setProperty('--pixel-banner-icon-padding-x', `${bannerIconPaddingX}px`);
            container.style.setProperty('--pixel-banner-icon-padding-y', `${bannerIconPaddingY}px`);
            container.style.setProperty('--pixel-banner-icon-border-radius', `${bannerIconBorderRadius}px`);
            container.style.setProperty('--pixel-banner-icon-vertical-offset', `${bannerIconVeritalOffset}px`);
            container.style.setProperty('--pixel-banner-embed-min-height', `${bannerHeightPlusIcon}`);
        }
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
        this.pixelBannerPlusEnabled = false;
        this.pixelBannerPlusBannerTokens = 0;

        const email = this.settings.pixelBannerPlusEmail;
        const apiKey = this.settings.pixelBannerPlusApiKey;

        if (!email || !apiKey) {
            this.pixelBannerPlusEnabled = false;
            this.pixelBannerPlusBannerTokens = 0;
            return false;
        }

        try {
            const response = await requestUrl({
                url: `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.VERIFY}`,
                method: 'GET',
                headers: {
                    'X-User-Email': email,
                    'X-API-Key': apiKey,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 200) {
                const data = response.json;
                this.pixelBannerPlusEnabled = true;
                this.pixelBannerPlusBannerTokens = data.banner_tokens;
                console.log('Pixel Banner Plus credentials verified, 🪙 Banner Tokens:', data.banner_tokens);
                return data;
            } else {
                this.pixelBannerPlusEnabled = false;
                this.pixelBannerPlusBannerTokens = 0;
                console.error('Failed to verify Pixel Banner Plus credentials:', data);
            }
            return false;
        } catch (error) {
            console.error('Failed to verify Pixel Banner Plus credentials:', error);
            return false;
        }
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

    async handleSetBannerIcon() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice('No active file');
            return;
        }

        new EmojiSelectionModal(
            this.app,
            this,
            async (selectedEmoji) => {
                let fileContent = await this.app.vault.read(activeFile);
                const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
                const hasFrontmatter = frontmatterRegex.test(fileContent);
                
                const bannerIconField = Array.isArray(this.settings.customBannerIconField) && 
                    this.settings.customBannerIconField.length > 0 ? 
                    this.settings.customBannerIconField[0] : 'banner-icon';

                fileContent = fileContent.replace(/^\s+/, '');

                let updatedContent;
                if (hasFrontmatter) {
                    updatedContent = fileContent.replace(frontmatterRegex, (match, frontmatter) => {
                        let cleanedFrontmatter = frontmatter.trim();
                        
                        this.settings.customBannerIconField.forEach(field => {
                            const fieldRegex = new RegExp(`${field}:\\s*.+\\n?`, 'g');
                            cleanedFrontmatter = cleanedFrontmatter.replace(fieldRegex, '');
                        });

                        cleanedFrontmatter = cleanedFrontmatter.trim();
                        const newFrontmatter = `${bannerIconField}: "${selectedEmoji}"${cleanedFrontmatter ? '\n' + cleanedFrontmatter : ''}`;
                        return `---\n${newFrontmatter}\n---`;
                    });
                } else {
                    const cleanContent = fileContent.replace(/^\s+/, '');
                    updatedContent = `---\n${bannerIconField}: "${selectedEmoji}"\n---\n\n${cleanContent}`;
                }

                updatedContent = updatedContent.replace(/^\s+/, '');
                
                if (updatedContent !== fileContent) {
                    await this.app.vault.modify(activeFile, updatedContent);

                    // Wait for metadata update
                    const metadataUpdated = new Promise(resolve => {
                        let eventRef = null;
                        let resolved = false;

                        const cleanup = () => {
                            if (eventRef) {
                                this.app.metadataCache.off('changed', eventRef);
                                eventRef = null;
                            }
                        };

                        const timeoutId = setTimeout(() => {
                            if (!resolved) {
                                resolved = true;
                                cleanup();
                                resolve();
                            }
                        }, 2000);

                        eventRef = this.app.metadataCache.on('changed', (file) => {
                            if (file.path === activeFile.path && !resolved) {
                                resolved = true;
                                clearTimeout(timeoutId);
                                cleanup();
                                setTimeout(resolve, 50);
                            }
                        });
                    });

                    await metadataUpdated;

                    // attempt to update banner with retries
                    const maxRetries = 3;
                    const retryDelay = 150;
                    let success = false;

                    for (let i = 0; i < maxRetries && !success; i++) {
                        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                        if (view) {
                            try {
                                const cache = this.app.metadataCache.getFileCache(activeFile);
                                if (!cache || !cache.frontmatter || cache.frontmatter[bannerIconField] !== selectedEmoji) {
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                    continue;
                                }

                                await this.updateBanner(view, true);
                                success = true;
                            } catch (error) {
                                if (i < maxRetries - 1) {
                                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                                }
                            }
                        }
                    }

                    if (!success) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                        if (view) {
                            await this.updateBanner(view, true);
                        }
                    }

                    new Notice('Banner icon updated');
                }
            }
        ).open();
    }

    async updateBannerPosition(file, position) {
        if (!file) return;
        
        const metadata = this.app.metadataCache.getFileCache(file);
        if (!metadata?.frontmatter) return;

        await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
            frontmatter.banner_x = position.x;
            frontmatter.banner_y = position.y;
        });
    }

    hasBannerFrontmatter(file) {
        const metadata = this.app.metadataCache.getFileCache(file);
        return metadata?.frontmatter?.banner !== undefined;
    }
}