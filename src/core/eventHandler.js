import { MarkdownView, Notice } from 'obsidian';
import { ImageSelectionModal, SelectPixelBannerModal, PixelBannerStoreModal } from '../modal/modals.js';
import { getFrontmatterValue } from '../utils/frontmatterUtils.js';

// Global debouncing map to prevent multiple rapid banner updates for the same file
const bannerUpdateDebounceMap = new Map();
const BANNER_UPDATE_DEBOUNCE_DELAY = 300; // 300ms debounce window

async function handleActiveLeafChange(leaf) {
    // 'this' will be the plugin instance
    
    // If no leaf or not a markdown view, just return
    if (!leaf || !(leaf.view instanceof MarkdownView) || !leaf.view.file) {
        return;
    }
    
    const filePath = leaf.view.file.path;
    const debounceCheckTime = Date.now();
    
    // Check if we recently updated this file's banner
    const lastUpdateTime = bannerUpdateDebounceMap.get(filePath);
    if (lastUpdateTime && (debounceCheckTime - lastUpdateTime) < BANNER_UPDATE_DEBOUNCE_DELAY) {
        return;
    }
    
    // Update the debounce timestamp
    bannerUpdateDebounceMap.set(filePath, debounceCheckTime);
    
    this.cleanupCache();

    // Clean up previous leaf and its icon overlay
    const previousLeaf = this.app.workspace.activeLeaf;
    if (previousLeaf && previousLeaf.view instanceof MarkdownView && previousLeaf !== leaf) {
        this.cleanupPreviousLeaf(previousLeaf);
        // Use the plugin's bound method
        this.cleanupIconOverlay(previousLeaf.view);
    }

    const currentPath = leaf.view.file.path;
    const leafId = leaf.id;
    const frontmatter = this.app.metadataCache.getFileCache(leaf.view.file)?.frontmatter;
    const currentTime = Date.now();

    // Check if the new leaf should have a banner icon
    const hasBannerIcon = this.settings.customBannerIconField.some(field => frontmatter?.[field]);
    
    // If no banner icon in frontmatter, ensure any existing overlay is removed
    if (!hasBannerIcon) {
        this.cleanupIconOverlay(leaf.view);
    }

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


function handleLayoutChange() {
    // Get current leaves to compare with cached ones
    const currentLeafIds = new Set(
        this.app.workspace.getLeavesOfType('markdown')
            .map(leaf => leaf.id)
    );

    // Find and invalidate cache entries for closed leaves
    for (const [key, entry] of this.bannerStateCache) {
        if (entry.leafId && !currentLeafIds.has(entry.leafId)) {
            // This leaf no longer exists, clean up its cache
            if (entry.state?.imageUrl && typeof entry.state.imageUrl === 'string' && entry.state.imageUrl.startsWith('blob:')) {
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


async function handleModeChange(leaf) {
    if (leaf && leaf.view instanceof MarkdownView && leaf.view.file) {
        await this.updateBanner(leaf.view, true);
        // Handle field visibility when mode changes
        if (this.settings.hidePixelBannerFields) {
            this.updateFieldVisibility(leaf.view);
        }
    }
}


async function handleSelectImage() {
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

                    const format = this.settings.imagePropertyFormat;
                    const bannerValue = format === '[[image]]' ? `[[${imageReference}]]` : `![[${imageReference}]]`;
                    const newFrontmatter = `${bannerField}: "${bannerValue}"${cleanedFrontmatter ? '\n' + cleanedFrontmatter : ''}`;
                    return `---\n${newFrontmatter}\n---`;
                });
            } else {
                const cleanContent = fileContent.replace(/^\s+/, '');
                const format = this.settings.imagePropertyFormat;
                const bannerValue = format === '[[image]]' ? `[[${imageReference}]]` : `![[${imageReference}]]`;
                updatedContent = `---\n${bannerField}: "${bannerValue}"\n---\n\n${cleanContent}`;
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

function handleBannerIconClick() {
    new SelectPixelBannerModal(this.app, this).open();
}

function handleOpenStore() {
    new PixelBannerStoreModal(this.app, this).open();
}

export {
    handleActiveLeafChange,
    handleLayoutChange,
    handleModeChange,
    handleSelectImage,
    handleBannerIconClick,
    handleOpenStore
};