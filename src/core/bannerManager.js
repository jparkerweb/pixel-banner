import { MarkdownView, Notice } from 'obsidian';
import { ImageViewModal, TargetPositionModal } from '../modal/modals.js';
import { getFrontmatterValue } from '../utils/frontmatterUtils.js';
import { handlePinIconClick } from '../utils/handlePinIconClick.js';
import { flags } from '../resources/flags.js';

// ----------------------
// -- add pixel banner --
// ----------------------
async function addPixelBanner(plugin, el, ctx) {
    const { frontmatter, file, isContentChange, yPosition, xPosition, contentStartPosition, bannerImage, isReadingView } = ctx;
    const viewContent = el;
    const isEmbedded = viewContent.classList.contains('internal-embed') && viewContent.classList.contains('markdown-embed');
    const isHoverPopover = viewContent.closest('.hover-popover') !== null;
    
    
    // Add pixel-banner class to the appropriate container
    if (!isEmbedded && !isHoverPopover && viewContent.classList.contains('view-content')) {
        viewContent.classList.add('pixel-banner');
        plugin.setupResizeObserver(viewContent);
        plugin.applyBannerWidth(viewContent);
    } else if (isHoverPopover) {
        // For hover popovers, add the class to the markdown preview element
        const previewEl = viewContent.querySelector('.markdown-preview-view');
        if (previewEl) {
            previewEl.classList.add('pixel-banner');
            plugin.setupResizeObserver(previewEl);
            plugin.applyBannerWidth(previewEl);
        }
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
    } else if (isHoverPopover) {
        // For hover popovers, find the proper container
        container = viewContent.querySelector('.markdown-preview-sizer') || 
                    viewContent.querySelector('.markdown-preview-view');
                    
        // If container still not found, try to traverse up to find preview view
        if (!container) {
            if (viewContent.classList.contains('markdown-preview-view')) {
                container = viewContent;
            } else if (viewContent.parentElement && viewContent.parentElement.classList.contains('markdown-preview-view')) {
                container = viewContent.parentElement;
            }
        }
        
        console.log('🔍 Hover popover container found:', container?.className);
    } else {
        container = isReadingView 
            ? viewContent.querySelector('.markdown-preview-sizer:not(.internal-embed .markdown-preview-sizer)') || viewContent.querySelector('.markdown-preview-view')
            : viewContent.querySelector('.cm-sizer') || viewContent.querySelector('.markdown-source-view');

        if (!container && viewContent.classList.contains('markdown-preview-view')) {
            container = viewContent;
        }
    }

    if (!container) {
        //console.log('❌ No container found for banner');
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
    const oldPinIcons = container.querySelectorAll('.pin-icon');
    const oldRefreshIcons = container.querySelectorAll('.refresh-icon');
    const oldSelectIcons = container.querySelectorAll('.select-image-icon');

    [...oldViewIcons, ...oldPinIcons, ...oldRefreshIcons, ...oldSelectIcons].forEach(el => el.remove());

    // 3) If embedded, just update the embedded banners' visibility and skip icon creation
    if (isEmbedded || isHoverPopover) {
        plugin.updateEmbeddedBannersVisibility();
    }
    // Else, add icons if settings allow
    else {
        let leftOffset = plugin.settings.bannerGap + 15;
        // "Pixel Banner Icon"
        if (plugin.settings.showSelectImageIcon) {
            const opacity = plugin.settings.selectImageIconOpacity / 100;
            const selectImageIcon = createDiv({
                cls: 'select-image-icon',
                attr: {
                    style: `
                        position: absolute;
                        top: 10px;
                        left: ${leftOffset}px;
                        font-size: 1.8em;
                        cursor: pointer;
                        opacity: ${opacity};
                    `   
                }
            });
            const flagColor = getFrontmatterValue(frontmatter, plugin.settings.customFlagColorField) || plugin.settings.selectImageIconFlag;
            selectImageIcon.innerHTML = `<img src="${flags[flagColor] || flags['red']}" alt="Select Banner" style="width: 25px; height: 30px;">`;
            selectImageIcon._isPersistentSelectImage = true;

            selectImageIcon.onclick = () => plugin.handleBannerIconClick();
            container.appendChild(selectImageIcon);
            leftOffset += 35;
        }

        // "View image" icon
        if (bannerImage && plugin.settings.showViewImageIcon && !isEmbedded) {
            const viewImageIcon = createDiv({
                cls: 'view-image-icon',
                attr: {
                    style: `
                        display: none;
                        position: absolute;
                        top: 10px;
                        left: ${leftOffset}px;
                        font-size: 1.5em;
                        cursor: pointer;
                    `   
                }
            });
            viewImageIcon.innerHTML = '🖼️';
            viewImageIcon._isPersistentViewImage = true;
            viewImageIcon.innerHTML = '🖼️';

            // We'll update this once we actually load an image below
            viewImageIcon._updateVisibility = (newUrl) => {
                viewImageIcon.style.display = newUrl ? 'block' : 'none';
                if (newUrl) {
                    viewImageIcon.onclick = () => {
                        new ImageViewModal(plugin.app, newUrl).open();
                    };
                }
            };

            container.appendChild(viewImageIcon);
            leftOffset += 35;
        }

        const activeFile = plugin.app.workspace.getActiveFile();
        const hasBanner = activeFile && plugin.hasBannerFrontmatter(activeFile);
    }

    // 4) Override setChildrenInPlace to preserve persistent elements
    if (!container._hasOverriddenSetChildrenInPlace) {
        const originalSetChildrenInPlace = container.setChildrenInPlace;
        container.setChildrenInPlace = function(children) {
            // Get all persistent elements
            const bannerElement = this.querySelector(':scope > .pixel-banner-image');
            const viewImageElement = this.querySelector(':scope > .view-image-icon');
            const pinElement = this.querySelector(':scope > .pin-icon');
            const refreshElement = this.querySelector(':scope > .refresh-icon');
            const selectImageElement = this.querySelector(':scope > .select-image-icon');
            const bannerIconOverlay = this.querySelector(':scope > .banner-icon-overlay');

            // Filter out old duplicates
            children = Array.from(children).filter(child => 
                !child.classList?.contains('pixel-banner-image') &&
                !child.classList?.contains('view-image-icon') &&
                !child.classList?.contains('pin-icon') &&
                !child.classList?.contains('refresh-icon') &&
                !child.classList?.contains('select-image-icon') &&
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
            if (viewImageElement?._isPersistentViewImage) {
                children.push(viewImageElement);
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
        let imageUrl = plugin.loadedImages.get(file.path);
        const lastInput = plugin.lastKeywords.get(file.path);
        const inputType = plugin.getInputType(bannerImage);

        // Check if this is a shuffled banner
        const hasShufflePath = getFrontmatterValue(frontmatter, plugin.settings.customBannerShuffleField);
        const folderSpecific = plugin.getFolderSpecificImage(file.path);
        const isShuffled = hasShufflePath || folderSpecific?.enableImageShuffle;

        // Force URL refresh for shuffled banners or normal cache miss conditions
        if (!imageUrl || isShuffled || (isContentChange && bannerImage !== lastInput)) {
            imageUrl = await plugin.getImageUrl(inputType, bannerImage);
            if (imageUrl) {
                plugin.loadedImages.set(file.path, imageUrl);
                plugin.lastKeywords.set(file.path, bannerImage);
            }
        }

        if (imageUrl) {
            // Display banner
            const folderSpecific = plugin.getFolderSpecificImage(file.path);
            const imageDisplay = getFrontmatterValue(frontmatter, plugin.settings.customImageDisplayField) ||
                folderSpecific?.imageDisplay ||
                plugin.settings.imageDisplay;
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
                    plugin.loadedImages.delete(file.path);
                    URL.revokeObjectURL(imageUrl);
                    
                    // Get a fresh image URL
                    const inputType = plugin.getInputType(bannerImage);
                    const freshImageUrl = await plugin.getImageUrl(inputType, bannerImage);
                    if (freshImageUrl) {
                        imageUrl = freshImageUrl;
                        plugin.loadedImages.set(file.path, freshImageUrl);
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
            
            // if (isHoverPopover) {
            //     console.log('🖼️ Set banner image in hover popover:', {
            //         imageUrl: imageUrl,
            //         backgroundSize: bannerDiv.style.backgroundSize,
            //         display: bannerDiv.style.display
            //     });
            // }

            // If there's a "view image" icon, update it
            const viewImageIcon = container.querySelector(':scope > .view-image-icon');
            if (viewImageIcon && viewImageIcon._updateVisibility) {
                viewImageIcon._updateVisibility(imageUrl);
            }

            // Apply other styling (fade, borderRadius, etc.)
            plugin.applyBannerSettings(bannerDiv, ctx, isEmbedded);

            // Get hide embedded note banners setting
            const hideEmbeddedNoteBanners = getFrontmatterValue(frontmatter, plugin.settings.customHideEmbeddedNoteBannersField) || 
                folderSpecific?.hideEmbeddedNoteBanners || 
                plugin.settings.hideEmbeddedNoteBanners || false;
            
            let effectiveContentStart = 0;
            if (!hideEmbeddedNoteBanners || !isEmbedded) {
                const frontmatterContentStart = getFrontmatterValue(frontmatter, plugin.settings.customContentStartField);
                const parsedFrontmatterStart = frontmatterContentStart ? Number(frontmatterContentStart) : null;
                
                effectiveContentStart = parsedFrontmatterStart ??
                    contentStartPosition ??
                    folderSpecific?.contentStartPosition ??
                    plugin.settings.contentStartPosition;
            }

            plugin.applyContentStartPosition(viewContent, effectiveContentStart);
            plugin.applyBannerWidth(viewContent);

            // 6) If pin icon is allowed, create it now
            const canPin = (inputType === 'keyword' || inputType === 'url') && plugin.settings.showPinIcon && !isEmbedded;
            if (canPin) {
                // Insert pin icon
                let leftOffset = plugin.settings.bannerGap + 5;
                // We already created select & view icons above; find their last offset
                // Actually simpler: Just pick a container query for them & measure
                const iconEls = container.querySelectorAll('.select-image-icon, .view-image-icon');
                if (iconEls?.length) {
                    leftOffset = 10 + (35 * iconEls.length) + plugin.settings.bannerGap;
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
                        await handlePinIconClick(imageUrl, plugin);
                    } catch (error) {
                        console.error('Error pinning image:', error);
                        new Notice('Failed to pin the image.');
                    }
                };

                container.appendChild(pinIcon);
                leftOffset += 35;

                // Refresh icon if it's a "keyword" banner
                if (inputType === 'keyword' && plugin.settings.showRefreshIcon) {
                    const refreshIcon = createDiv({
                        cls: 'refresh-icon',
                        attr: {
                            style: `
                                position: absolute;
                                top: 10px;
                                left: ${leftOffset}px;
                                font-size: 1.5em;
                                cursor: pointer;
                            `   
                        }
                    });
                    refreshIcon.innerHTML = '🔄';
                    refreshIcon._isPersistentRefresh = true;

                    refreshIcon.onclick = async () => {
                        try {
                            plugin.loadedImages.delete(file.path);
                            plugin.lastKeywords.delete(file.path);

                            const newImageUrl = await plugin.getImageUrl(inputType, bannerImage);
                            if (newImageUrl) {
                                plugin.loadedImages.set(file.path, newImageUrl);
                                plugin.lastKeywords.set(file.path, bannerImage);

                                bannerDiv.style.backgroundImage = `url('${newImageUrl}')`;

                                const viewImageIcon = container.querySelector(':scope > .view-image-icon');
                                if (viewImageIcon && viewImageIcon._updateVisibility) {
                                    viewImageIcon._updateVisibility(newImageUrl);
                                }

                                // Update pin icon with new URL
                                pinIcon.onclick = async () => {
                                    try {
                                        await handlePinIconClick(newImageUrl, plugin);
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
            plugin.loadedImages.delete(file.path);
            plugin.lastKeywords.delete(file.path);

            if (!isEmbedded) {
                viewContent.classList.remove('pixel-banner');
            }
        }
    }
}


async function updateBanner(plugin, view, isContentChange, updateMode = plugin.UPDATE_MODE.FULL_UPDATE) {
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

    const frontmatter = plugin.app.metadataCache.getFileCache(view.file)?.frontmatter;
    const contentEl = view.contentEl;
    const isEmbedded = contentEl.classList.contains('internal-embed') && contentEl.classList.contains('markdown-embed');
    const isHoverPopover = contentEl.closest('.hover-popover') !== null;
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
    const folderSpecific = plugin.getFolderSpecificImage(view.file.path);
    let bannerImage = null;

    // Check for banner shuffle path in frontmatter first
    const shufflePath = getFrontmatterValue(frontmatter, plugin.settings.customBannerShuffleField) || folderSpecific?.enableImageShuffle;
    if (shufflePath && updateMode !== plugin.UPDATE_MODE.ENSURE_VISIBILITY) {
        // If shuffle path exists in frontmatter and we're not just ensuring visibility,
        // get a new random image
        const randomImagePath = await plugin.getRandomImageFromFolder(shufflePath);
        if (randomImagePath) {
            bannerImage = randomImagePath;
        }
    } else if (shufflePath && updateMode === plugin.UPDATE_MODE.ENSURE_VISIBILITY) {
        // If we're just ensuring visibility, use the existing image from cache
        const cacheKey = plugin.generateCacheKey(view.file.path, plugin.app.workspace.activeLeaf.id, true);
        const cachedState = plugin.bannerStateCache.get(cacheKey);
        if (cachedState?.state?.imageUrl) {
            bannerImage = cachedState.state.imageUrl;
        } else {
            // If no cached image, fall back to getting a new one
            const randomImagePath = await plugin.getRandomImageFromFolder(shufflePath);
            if (randomImagePath) {
                bannerImage = randomImagePath;
            }
        }
    }
    
    // If no shuffle path or no image found, fall back to regular banner or folder-specific image
    if (!bannerImage) {
        bannerImage = getFrontmatterValue(frontmatter, plugin.settings.customBannerField) || folderSpecific?.image;
    }
    
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
        plugin.loadedImages.delete(view.file.path);
        plugin.lastKeywords.delete(view.file.path);
    }

    // Initialize settings with either folder-specific or default values
    let yPosition = folderSpecific?.yPosition ?? plugin.settings.yPosition;
    let xPosition = folderSpecific?.xPosition ?? plugin.settings.xPosition;
    let contentStartPosition = folderSpecific?.contentStartPosition ?? plugin.settings.contentStartPosition;

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
            const file = plugin.app.vault.getAbstractFileByPath(bannerImage);
            if (file && 'extension' in file) {
                if (file.extension.match(/^(jpg|jpeg|png|gif|bmp|svg)$/i)) {
                    bannerImage = `[[${bannerImage}]]`;
                }
            }
        }
    }

    let imageDisplay = getFrontmatterValue(frontmatter, plugin.settings.customImageDisplayField) || 
        folderSpecific?.imageDisplay || 
        plugin.settings.imageDisplay;
    let imageRepeat = getFrontmatterValue(frontmatter, plugin.settings.customImageRepeatField) ?? 
        folderSpecific?.imageRepeat ?? 
        plugin.settings.imageRepeat;
    let bannerHeight = getFrontmatterValue(frontmatter, plugin.settings.customBannerHeightField) ?? 
        folderSpecific?.bannerHeight ?? 
        plugin.settings.bannerHeight;
    let fade = getFrontmatterValue(frontmatter, plugin.settings.customFadeField) ?? 
        folderSpecific?.fade ?? 
        plugin.settings.fade;
    let borderRadius = getFrontmatterValue(frontmatter, plugin.settings.customBorderRadiusField) ?? 
        folderSpecific?.borderRadius ?? 
        plugin.settings.borderRadius;

    // Process this note's banner if it exists
    if (bannerImage) {
        await addPixelBanner(plugin, contentEl, { 
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

        plugin.lastYPositions.set(view.file.path, yPosition);
    } else if (existingBanner) {
        existingBanner.style.display = 'none';
    }

    // Process embedded notes if this is not an embedded note itself
    if (!isEmbedded) {
        const embeddedNotes = contentEl.querySelectorAll('.internal-embed.markdown-embed');

        for (const embed of embeddedNotes) {
            const embedFile = plugin.app.metadataCache.getFirstLinkpathDest(embed.getAttribute('src'), '');

            if (embedFile) {
                const embedView = {
                    file: embedFile,
                    contentEl: embed,
                    getMode: () => 'preview'
                };
                await updateBanner(plugin, embedView, false);
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

        [...oldViewIcons, ...oldPinIcons, ...oldRefreshIcons, ...oldSelectIcons].forEach(el => el.remove());

        // Only add select image icon if not embedded
        if (!isEmbedded && container && plugin.settings.showSelectImageIcon) {
            const opacity = plugin.settings.selectImageIconOpacity / 100;
            const existingSelectIcon = container.querySelector('.select-image-icon');
            if (!existingSelectIcon) {
                const selectImageIcon = createDiv({
                    cls: 'select-image-icon',
                    attr: {
                        style: `
                            position: absolute;
                            top: 10px;
                            left: ${plugin.settings.bannerGap + 5}px;
                            font-size: 1.8em;
                            cursor: pointer;
                            opacity: ${opacity};
                        `   
                    }
                });
                const flagColor = getFrontmatterValue(frontmatter, plugin.settings.customFlagColorField) || plugin.settings.selectImageIconFlag;
                selectImageIcon.innerHTML = `<img src="${flags[flagColor] || flags['red']}" alt="Select Banner" style="width: 25px; height: 30px;">`;
                selectImageIcon._isPersistentSelectImage = true;
                selectImageIcon.onclick = () => plugin.handleBannerIconClick();
                container.insertBefore(selectImageIcon, container.firstChild);
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

    if (plugin.settings.hidePixelBannerFields && view.getMode() === 'preview') {
        plugin.updateFieldVisibility(view);
    }

    const bannerIcon = getFrontmatterValue(frontmatter, plugin.settings.customBannerIconField);

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

    // Clean up existing persistent banner icon overlays if the icon field is removed or empty
    if (!bannerIcon || (typeof bannerIcon === 'string' && !bannerIcon.trim())) {
        // For embedded notes
        if (isEmbedded) {
            const embedContainer = contentEl.querySelector('.markdown-preview-sizer') || 
                                    contentEl.querySelector('.markdown-embed-content') || 
                                    contentEl;
            const persistentOverlays = embedContainer.querySelectorAll(':scope > .banner-icon-overlay[data-persistent="true"]');
            persistentOverlays.forEach(overlay => {
                plugin.returnIconOverlay(overlay);
                overlay.remove();
            });
        } else {
            // For main notes, clean up in both views
            const previewContainer = contentEl.querySelector('div.markdown-preview-sizer');
            const sourceContainer = contentEl.querySelector('div.cm-sizer');
            
            if (previewContainer) {
                const previewOverlays = previewContainer.querySelectorAll(':scope > .banner-icon-overlay[data-persistent="true"]');
                previewOverlays.forEach(overlay => {
                    plugin.returnIconOverlay(overlay);
                    overlay.remove();
                });
            }
            
            if (sourceContainer) {
                const sourceOverlays = sourceContainer.querySelectorAll(':scope > .banner-icon-overlay[data-persistent="true"]');
                sourceOverlays.forEach(overlay => {
                    plugin.returnIconOverlay(overlay);
                    overlay.remove();
                });
            }
        }
    }

    // Only proceed if we have a valid banner icon
    if (bannerIcon && typeof bannerIcon === 'string' && bannerIcon.trim()) {
        const cleanIcon = bannerIcon.trim();
        
        // Check cache first
        const cacheKey = plugin.generateCacheKey(view.file.path, plugin.app.workspace.activeLeaf.id);
        const cachedState = plugin.bannerStateCache.get(cacheKey);
        const cachedIconState = cachedState?.state?.iconState;

        // Function to create or update icon overlay
        const createOrUpdateIconOverlay = (banner, viewType) => {
            if (!banner) {
                return;
            }
            
            // Get current icon state
            const currentIconState = {
                icon: cleanIcon,
                size: getFrontmatterValue(frontmatter, plugin.settings.customBannerIconSizeField) || plugin.settings.bannerIconSize,
                xPosition: getFrontmatterValue(frontmatter, plugin.settings.customBannerIconXPositionField) || plugin.settings.bannerIconXPosition,
                opacity: getFrontmatterValue(frontmatter, plugin.settings.customBannerIconOpacityField) || plugin.settings.bannerIconOpacity,
                color: getFrontmatterValue(frontmatter, plugin.settings.customBannerIconColorField) || plugin.settings.bannerIconColor,
                fontWeight: getFrontmatterValue(frontmatter, plugin.settings.customBannerIconFontWeightField) || plugin.settings.bannerIconFontWeight,
                backgroundColor: getFrontmatterValue(frontmatter, plugin.settings.customBannerIconBackgroundColorField) || plugin.settings.bannerIconBackgroundColor,
                paddingX: getFrontmatterValue(frontmatter, plugin.settings.customBannerIconPaddingXField) || plugin.settings.bannerIconPaddingX,
                paddingY: getFrontmatterValue(frontmatter, plugin.settings.customBannerIconPaddingYField) || plugin.settings.bannerIconPaddingY,
                borderRadius: getFrontmatterValue(frontmatter, plugin.settings.customBannerIconBorderRadiusField) || plugin.settings.bannerIconBorderRadius,
                verticalOffset: getFrontmatterValue(frontmatter, plugin.settings.customBannerIconVeritalOffsetField) || plugin.settings.bannerIconVeritalOffset,
                viewType
            };

            // If the vertical offset is 0, set it to 0 (fix for falsey value)
            if (getFrontmatterValue(frontmatter, plugin.settings.customBannerIconVeritalOffsetField) === 0) {
                currentIconState.verticalOffset = 0;
            }

            // if the border radius is 0, set it to 0 (fix for falsey value)
            if (getFrontmatterValue(frontmatter, plugin.settings.customBannerIconBorderRadiusField) === 0) {
                currentIconState.borderRadius = 0;
            }
            
            // Check if we already have a persistent icon overlay
            const existingOverlay = banner.nextElementSibling?.classList?.contains('banner-icon-overlay') ? 
                banner.nextElementSibling : null;
            
            if (existingOverlay) {
                // Only update if necessary
                if (!plugin.shouldUpdateIconOverlay(existingOverlay, currentIconState, viewType)) {
                    return existingOverlay;
                }
                // Return the old overlay to the pool if we're going to update
                plugin.returnIconOverlay(existingOverlay);
            }
            
            // Get a new or pooled overlay
            const bannerIconOverlay = plugin.getIconOverlay();
            
            bannerIconOverlay.dataset.viewType = viewType;
            bannerIconOverlay.dataset.persistent = 'true';
            bannerIconOverlay.textContent = cleanIcon;
            bannerIconOverlay._isPersistentBannerIcon = true;
            
            // Apply styles
            bannerIconOverlay.style.display = 'block'; // Ensure visibility
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


function applyBannerSettings(plugin, bannerDiv, ctx, isEmbedded) {
    const { frontmatter, imageDisplay, imageRepeat, bannerHeight, fade, borderRadius } = ctx;
    const folderSpecific = plugin.getFolderSpecificImage(ctx.file.path);
    
    // Get pixel banner y position
    const pixelBannerYPosition = getFrontmatterValue(frontmatter, plugin.settings.customYPositionField) || 
        folderSpecific?.yPosition || 
        plugin.settings.yPosition;
    
    // Get pixel banner x position
    const pixelBannerXPosition = getFrontmatterValue(frontmatter, plugin.settings.customXPositionField) || 
        folderSpecific?.xPosition || 
        plugin.settings.xPosition;

    // Get title color from frontmatter, folder settings, or default
    const titleColor = getFrontmatterValue(frontmatter, plugin.settings.customTitleColorField) || 
        folderSpecific?.titleColor || 
        plugin.settings.titleColor;

    // Get banner-icon size from frontmatter, folder settings, or default
    const bannerIconSize = getFrontmatterValue(frontmatter, plugin.settings.customBannerIconSizeField) || 
        folderSpecific?.bannerIconSize || 
        plugin.settings.bannerIconSize || 70;

    // Get banner-icon x position
    const bannerIconXPosition = getFrontmatterValue(frontmatter, plugin.settings.customBannerIconXPositionField) || 
        folderSpecific?.bannerIconXPosition || 
        plugin.settings.bannerIconXPosition || 25;

    // Get banner-icon opacity
    const bannerIconOpacity = getFrontmatterValue(frontmatter, plugin.settings.customBannerIconOpacityField) || 
        folderSpecific?.bannerIconOpacity || 
        plugin.settings.bannerIconOpacity || 100;

    // Get banner-icon color
    const bannerIconColor = getFrontmatterValue(frontmatter, plugin.settings.customBannerIconColorField) || 
        folderSpecific?.bannerIconColor || 
        plugin.settings.bannerIconColor || 'var(--text-normal)';

    // Get banner-icon font weight
    const bannerIconFontWeight = getFrontmatterValue(frontmatter, plugin.settings.customBannerIconFontWeightField) || 
        folderSpecific?.bannerIconFontWeight || 
        plugin.settings.bannerIconFontWeight || 'normal';

    // Get banner-icon background color
    const bannerIconBackgroundColor = getFrontmatterValue(frontmatter, plugin.settings.customBannerIconBackgroundColorField) || 
        folderSpecific?.bannerIconBackgroundColor || 
        plugin.settings.bannerIconBackgroundColor || 'transparent';

    // Get banner-icon padding X
    const bannerIconPaddingX = getFrontmatterValue(frontmatter, plugin.settings.customBannerIconPaddingXField) || 
        folderSpecific?.bannerIconPaddingX || 
        plugin.settings.bannerIconPaddingX || 0;

    // Get banner-icon padding Y
    const bannerIconPaddingY = getFrontmatterValue(frontmatter, plugin.settings.customBannerIconPaddingYField) || 
        folderSpecific?.bannerIconPaddingY || 
        plugin.settings.bannerIconPaddingY || 0;

    // Get banner-icon border radius
    let bannerIconBorderRadius = getFrontmatterValue(frontmatter, plugin.settings.customBannerIconBorderRadiusField) || 
        folderSpecific?.bannerIconBorderRadius || 
        plugin.settings.bannerIconBorderRadius || 17;
    if (getFrontmatterValue(frontmatter, plugin.settings.customBannerIconBorderRadiusField) === 0) {
        bannerIconBorderRadius = 0;
    } else if (folderSpecific?.bannerIconBorderRadius === 0) {
        bannerIconBorderRadius = 0;
    } else if (plugin.settings.bannerIconBorderRadius === 0) {
        bannerIconBorderRadius = 0;
    }

    // Get banner-icon vertical offset
    let bannerIconVeritalOffset = Number(getFrontmatterValue(frontmatter, plugin.settings.customBannerIconVeritalOffsetField)) ||
        folderSpecific?.bannerIconVeritalOffset || 
        plugin.settings.bannerIconVeritalOffset || 0;

    // If the vertical offset is 0, set it to 0 (fix for falsey value)
    if (Number(getFrontmatterValue(frontmatter, plugin.settings.customBannerIconVeritalOffsetField)) === 0) {
        bannerIconVeritalOffset = 0;
    }

    // Get hide embedded note banners
    const hideEmbeddedNoteBanners = getFrontmatterValue(frontmatter, plugin.settings.customHideEmbeddedNoteBannersField) || 
        folderSpecific?.hideEmbeddedNoteBanners || 
        plugin.settings.hideEmbeddedNoteBanners || false;

    bannerDiv.style.backgroundSize = imageDisplay || 'cover';
    bannerDiv.style.backgroundRepeat = imageRepeat ? 'repeat' : 'no-repeat';
    if (hideEmbeddedNoteBanners && isEmbedded) {
        bannerDiv.style.setProperty('--pixel-banner-height', `0px`);
    } else {
        bannerDiv.style.setProperty('--pixel-banner-height', `${bannerHeight}px`);
    }
    bannerDiv.style.setProperty('--pixel-banner-fade', `${fade}%`);
    bannerDiv.style.setProperty('--pixel-banner-fade-in-animation-duration', `${plugin.settings.bannerFadeInAnimationDuration}ms`);
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


function applyContentStartPosition(plugin, el, contentStartPosition) {
    if (!el) {
        return;
    }
    el.style.setProperty('--pixel-banner-content-start', `${contentStartPosition}px`);
}

function applyBannerWidth(plugin, el) {
    if (!el) return;

    setTimeout(() => {
        // Only proceed if this is the view-content element
        if (!el.classList.contains('view-content')) {
            return;
        }

        const theWidth = el.clientWidth;
        const bannerGap = plugin.settings.bannerGap;
        
        // Set the variables only once at the root level
        el.style.setProperty('--pixel-banner-width', `${theWidth - (bannerGap * 2)}px`);
        el.style.setProperty('--pixel-banner-banner-gap', `${bannerGap}px`);
    }, 50);
}


function updateAllBanners(plugin) {
    plugin.app.workspace.iterateAllLeaves(leaf => {
        if (leaf.view.getViewType() === "markdown") {
            updateBanner(plugin, leaf.view, true);
        }
    });
}

async function updateBannerPosition(plugin, file, position) {
    if (!file) return;
    
    const metadata = plugin.app.metadataCache.getFileCache(file);
    if (!metadata?.frontmatter) return;

    await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter.banner_x = position.x;
        frontmatter.banner_y = position.y;
    });
}

function registerMarkdownPostProcessor(plugin) {
  plugin.registerMarkdownPostProcessor((el, ctx) => {
    // Check if in preview view or hover preview
    const isPreview = ctx.containerEl.classList.contains('markdown-preview-view');
    const isHoverPopover = ctx.containerEl.closest('.hover-popover');

    // console.log('🔎 isPreview:', isPreview);
    // console.log('🔎 isHoverPopover:', isHoverPopover);
    
    if (!isPreview && !isHoverPopover) return;
    
    const file = ctx.sourcePath ? plugin.app.vault.getAbstractFileByPath(ctx.sourcePath) : null;
    if (!file) return;
    
    // Get banner data from frontmatter
    const frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter;
    
    // Check all custom banner fields
    let bannerImage = null;
    for (const field of plugin.settings.customBannerField) {
      if (frontmatter?.[field]) {
        bannerImage = frontmatter[field];
        break;
      }
    }
    
    // Try folder-specific image if no frontmatter banner
    if (!bannerImage) {
      const folderSpecific = plugin.getFolderSpecificImage(file.path);
      if (folderSpecific?.image) {
        bannerImage = folderSpecific.image;
      }
    }
    
    if (!bannerImage) return;
    
    // Get proper banner settings
    const folderSpecific = plugin.getFolderSpecificImage(file.path);
    const yPosition = getFrontmatterValue(frontmatter, plugin.settings.customYPositionField) || 
                      folderSpecific?.yPosition || 
                      plugin.settings.yPosition;
    const xPosition = getFrontmatterValue(frontmatter, plugin.settings.customXPositionField) || 
                      folderSpecific?.xPosition || 
                      plugin.settings.xPosition;
    const contentStartPosition = getFrontmatterValue(frontmatter, plugin.settings.customContentStartField) || 
                                folderSpecific?.contentStartPosition || 
                                plugin.settings.contentStartPosition;
    
    // Add the banner to the preview view
    addPixelBanner(plugin, ctx.containerEl, {
      frontmatter,
      file,
      isContentChange: false,
      yPosition,
      xPosition,
      contentStartPosition,
      bannerImage,
      isReadingView: true
    });
  });
}

export {
    addPixelBanner,
    updateBanner,
    applyBannerSettings,
    applyContentStartPosition,
    applyBannerWidth,
    updateAllBanners,
    updateBannerPosition,
    registerMarkdownPostProcessor
};