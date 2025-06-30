import { Plugin, MarkdownView, Notice } from 'obsidian';
import { releaseNotes } from 'virtual:release-notes';
import { DEFAULT_SETTINGS, PixelBannerSettingTab, debounce } from '../settings/settings.js';
import { ReleaseNotesModal, TargetPositionModal, GenerateAIBannerModal, PixelBannerStoreModal, DailyGameModal } from '../modal/modals.js';
import { handlePinIconClick } from '../utils/handlePinIconClick.js';
import { loadSettings, saveSettings } from './settings.js';
import { getIconOverlay, returnIconOverlay, shouldUpdateIconOverlay, handleSetBannerIcon, handleSetBannerIconImage, cleanupIconOverlay } from './bannerIconHelpers.js'; 
import { generateCacheKey, getCacheEntriesForFile, cleanupCache, invalidateLeafCache } from './cacheHelpers.js';
import { fetchPexelsImage, fetchPixabayImage, fetchFlickrImage, fetchUnsplashImage } from '../services/apiService.js';
import { verifyPixelBannerPlusCredentials, getPixelBannerInfo } from '../services/apiPIxelBannerPlus.js';
import { addPixelBanner, updateBanner, applyBannerSettings, applyContentStartPosition, applyBannerWidth, updateAllBanners, updateBannerPosition, registerMarkdownPostProcessor } from './bannerManager.js';
import { getInputType, getPathFromObsidianLink, getPathFromMarkdownImage, getVaultImageUrl, preloadImage, getFolderPath, getFolderSpecificImage, getFolderSpecificSetting, getRandomImageFromFolder, getActiveApiProvider, hasBannerFrontmatter, createFolderImageSettings } from './bannerUtils.js';
import { handleActiveLeafChange, handleLayoutChange, handleModeChange, handleSelectImage, handleBannerIconClick } from './eventHandler.js';
import { setupMutationObserver, setupResizeObserver, updateFieldVisibility, updateEmbeddedTitlesVisibility, updateEmbeddedBannersVisibility, cleanupPreviousLeaf } from './domManager.js';
import { getFrontmatterValue } from '../utils/frontmatterUtils.js';


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
    shouldUpdateIconOverlay(existingOverlay, newIconState, viewType) { return shouldUpdateIconOverlay(this, existingOverlay, newIconState, viewType); }
    generateCacheKey(filePath, leafId, isShuffled = false) { return generateCacheKey.call(this, filePath, leafId, isShuffled); }
    getCacheEntriesForFile(filePath) { return getCacheEntriesForFile.call(this, filePath); }
    cleanupCache(force = false) { return cleanupCache.call(this, force); }
    invalidateLeafCache(leafId) { return invalidateLeafCache.call(this, leafId); }
    handleSetBannerIcon() { return handleSetBannerIcon(this); }
    addPixelBanner(el, ctx) { return addPixelBanner(this, el, ctx); }
    updateBanner(view, isContentChange, updateMode) { return updateBanner(this, view, isContentChange, updateMode); }
    applyBannerSettings(bannerDiv, ctx, isEmbedded) { return applyBannerSettings(this, bannerDiv, ctx, isEmbedded); }
    applyContentStartPosition(el, contentStartPosition) { return applyContentStartPosition(this, el, contentStartPosition); }
    applyBannerWidth(el) { return applyBannerWidth(this, el); }
    updateAllBanners() { return updateAllBanners(this); }
    updateBannerPosition(file, position) { return updateBannerPosition(this, file, position); }
    cleanupIconOverlay(view) { return cleanupIconOverlay(this, view); }

    // --------------------------------------------
    // -- add bindings for the utility functions --
    // --------------------------------------------
    getInputType(input) { return getInputType.call(this, input); }
    getPathFromObsidianLink(link) { return getPathFromObsidianLink.call(this, link); }
    getPathFromMarkdownImage(link) { return getPathFromMarkdownImage.call(this, link); }
    getVaultImageUrl(path) { return getVaultImageUrl.call(this, path); }
    preloadImage(url) { return preloadImage.call(this, url); }
    getFolderPath(filePath) { return getFolderPath.call(this, filePath); }
    getFolderSpecificImage(filePath) { return getFolderSpecificImage.call(this, filePath); }
    getFolderSpecificSetting(filePath, settingName) { return getFolderSpecificSetting.call(this, filePath, settingName); }
    getRandomImageFromFolder(folderPath) { return getRandomImageFromFolder.call(this, folderPath); }
    getActiveApiProvider() { return getActiveApiProvider.call(this); }
    hasBannerFrontmatter(file) { return hasBannerFrontmatter.call(this, file); }
    createFolderImageSettings(folderImage) { return createFolderImageSettings.call(this, folderImage); }

    // -------------------------------------
    // -- add bindings for event handlers --
    // -------------------------------------
    handleActiveLeafChange(leaf) { return handleActiveLeafChange.call(this, leaf); }
    handleLayoutChange() { return handleLayoutChange.call(this); }
    handleModeChange(leaf) { return handleModeChange.call(this, leaf); }
    handleSelectImage() { return handleSelectImage.call(this); }
    handleBannerIconClick() { return handleBannerIconClick.call(this); }

    // -------------------------------------
    // -- add bindings for DOM management --
    // -------------------------------------
    setupMutationObserver() { return setupMutationObserver.call(this); }
    setupResizeObserver(viewContent) { return setupResizeObserver.call(this, viewContent); }
    updateFieldVisibility(view) { return updateFieldVisibility.call(this, view); }
    updateEmbeddedTitlesVisibility() { return updateEmbeddedTitlesVisibility.call(this); }
    updateEmbeddedBannersVisibility() { return updateEmbeddedBannersVisibility.call(this); }
    cleanupPreviousLeaf(previousLeaf) { return cleanupPreviousLeaf.call(this, previousLeaf); }


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

        // Add daily game command
        this.addCommand({
            id: 'play-daily-game',
            name: '🕹️ Play Daily Game',
            callback: () => {
                new DailyGameModal(this.app, this.settings.pixelBannerPlusEmail, this.settings.pixelBannerPlusApiKey, this).open();
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
                    ...this.settings.customBannerMaxWidthField,
                    ...this.settings.customBannerHeightField,
                    ...this.settings.customFadeField,
                    ...this.settings.customBorderRadiusField,
                    ...this.settings.customTitleColorField,
                    ...this.settings.customBannerShuffleField,
                    ...this.settings.customBannerIconField,
                    ...this.settings.customBannerIconSizeField,
                    ...this.settings.customBannerIconImageSizeMultiplierField,
                    ...this.settings.customBannerIconTextVerticalOffsetField,
                    ...this.settings.customBannerIconRotateField,
                    ...this.settings.customBannerIconImageAlignmentField,
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

        // Enhanced markdown post processor to ensure banners in preview mode
        this.registerMarkdownPostProcessor((el, ctx) => {
            // Check if in preview view or hover preview
            const isPreview = ctx.containerEl.classList.contains('markdown-preview-view');
            const isHoverPopover = ctx.containerEl.closest('.hover-popover') !== null;
            
            // console.log('🔎 isPreview:', isPreview);
            // console.log('🔎 isHoverPopover:', isHoverPopover);
            
            if (!isPreview && !isHoverPopover) return;
            
            const file = ctx.sourcePath ? this.app.vault.getAbstractFileByPath(ctx.sourcePath) : null;
            if (!file) return;
            
            // Skip hover popovers if the setting is disabled
            if (isHoverPopover && !this.settings.showBannerInPopoverPreviews) return;
            
            // Get banner data from frontmatter
            const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
            
            // Check all custom banner fields
            let bannerImage = null;
            for (const field of this.settings.customBannerField) {
                if (frontmatter?.[field]) {
                    bannerImage = frontmatter[field];
                    break;
                }
            }
            
            // Try folder-specific image if no frontmatter banner
            if (!bannerImage) {
                const folderSpecific = this.getFolderSpecificImage(file.path);
                if (folderSpecific?.image) {
                    bannerImage = folderSpecific.image;
                }
            }
            
            if (!bannerImage) return;
            
            // Get proper banner settings
            const folderSpecific = this.getFolderSpecificImage(file.path);
            const yPosition = getFrontmatterValue(frontmatter, this.settings.customYPositionField) || 
                             folderSpecific?.yPosition || 
                             this.settings.yPosition;
            const xPosition = getFrontmatterValue(frontmatter, this.settings.customXPositionField) || 
                             folderSpecific?.xPosition || 
                             this.settings.xPosition;
            const contentStartPosition = getFrontmatterValue(frontmatter, this.settings.customContentStartField) || 
                                        folderSpecific?.contentStartPosition || 
                                        this.settings.contentStartPosition;
            
            // For hover popovers, directly add the banner
            if (isHoverPopover) {
                this.addPixelBanner(ctx.containerEl, {
                    frontmatter,
                    file,
                    isContentChange: false,
                    yPosition,
                    xPosition,
                    contentStartPosition,
                    bannerImage,
                    isReadingView: true
                });
            } else {
                // For regular preview, call updateBanner
                this.updateBanner({
                    file: file,
                    contentEl: ctx.containerEl,
                    getMode: () => 'preview'
                }, false, this.UPDATE_MODE.ENSURE_VISIBILITY);
            }
        });

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

        this.addCommand({
            id: 'open-pixel-banner-select',
            name: '🚩 Pixel Banner Menu',
            callback: () => {
                this.handleBannerIconClick();
            }
        });

        // Add command for selecting banner image
        this.addCommand({
            id: 'set-banner-image',
            name: '💾 Select Banner from Vault',
            callback: () => this.handleSelectImage()
        });

        // Add command for opening the banner store
        this.addCommand({
            id: 'open-banner-store',
            name: '🏪 Open Pixel Banner Plus Collection',
            callback: () => this.openBannerStore()
        });

        // Add command for setting banner icon image
        this.addCommand({
            id: 'set-banner-icon-image',
            name: '⭐ Select Banner Icon Image',
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
                    handleSetBannerIconImage(this);
                }
                return true;
            }
        });

        // Add command for setting banner icon text / emoji
        this.addCommand({
            id: 'set-banner-icon',
            name: '📰 Set Banner Icon Text / Emoji',
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
            name: '🎯 Adjust Position, Size, & Style',
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

        this.addRibbonIcon('flag', '🚩 Pixel Banner Menu', () => {
            this.handleBannerIconClick();
        });

        registerMarkdownPostProcessor(this);
    }


    // -----------------------------
    // -- debounced ensure banner --
    // -----------------------------
    debouncedEnsureBanner = debounce(() => {
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


    // -------------------
    // -- get image url --
    // -------------------
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

        if (type === 'markdownImage') {
            const path = this.getPathFromMarkdownImage(input);
            if (typeof path === 'string') {
                // If path is a URL, return it directly
                try {
                    new URL(path);
                    return path;
                } catch (_) {
                    // Not a URL, treat as a vault path
                    return this.getVaultImageUrl(path);
                }
            }
            
            if (path) {
                return this.getVaultImageUrl(path.path);
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


    // --------------------
    // -- post processor --
    // --------------------
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
                customBannerMaxWidthField: this.settings.customBannerMaxWidthField,
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
                        ...this.settings.customBannerMaxWidthField,
                        ...this.settings.customBannerHeightField,
                        ...this.settings.customBannerAlignmentField,
                        ...this.settings.customFadeField,
                        ...this.settings.customBorderRadiusField,
                        ...this.settings.customTitleColorField,
                        ...this.settings.customBannerShuffleField,
                        ...this.settings.customBannerIconField,
                        ...this.settings.customBannerIconSizeField,
                        ...this.settings.customBannerIconImageSizeMultiplierField,
                        ...this.settings.customBannerIconTextVerticalOffsetField,
                        ...this.settings.customBannerIconRotateField,
                        ...this.settings.customBannerIconImageAlignmentField,
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


    // --------------
    // -- onunload --
    // --------------
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


    // -------------------------
    // -- clean orphaned pins --
    // -------------------------
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
            const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'avif'];
            
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


    // ------------------------------------------
    // -- verify pixel banner plus credentials --
    // ------------------------------------------
    async verifyPixelBannerPlusCredentials() {
        if (this.settings.pixelBannerPlusEnabled) {
            const result = await verifyPixelBannerPlusCredentials(this);
            // console.log('🔍 verifyPixelBannerPlusCredentials result:', result);
            this.pixelBannerPlusServerOnline = result.serverOnline;
            this.pixelBannerPlusEnabled = result.verified;
            this.pixelBannerPlusBannerTokens = result.bannerTokens;
            this.pixelBannerPlusJackpot = result.jackpot;
            this.pixelBannerPlusDailyGameName = result.dailyGameName;
            this.pixelBannerPlusHighScore = result.highScore || '0';
            this.pixelBannerPlusTopUser = result.topUser;
            this.pixelBannerPlusTimeLeft = result.timeLeft;
            return result;
        }
        return {
            serverOnline: false,
            verified: false,
            bannerTokens: 0,
            jackpot: 0,
            dailyGameName: '',
            highScore: '0',
            topUser: '',
            timeLeft: 0
        };
    }

    // -------------------------------- //
    // -- get pixel banner plus info -- //
    // -------------------------------- //
    async getPixelBannerInfo() {
        const result = await getPixelBannerInfo(this);
        this.pixelBannerVersion = result.version;
        return result;
    }

    // --------------------------
    // -- open the banner store --
    // --------------------------
    openBannerStore() {
        new PixelBannerStoreModal(this.app, this).open();
    }
}
