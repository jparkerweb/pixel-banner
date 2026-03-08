import { MarkdownView, Notice } from 'obsidian';
import { ImageViewModal, TargetPositionModal } from '../modal/modals.js';
import { getFrontmatterValue, getValueWithZeroCheck } from '../utils/frontmatterUtils.js';
import { handlePinIconClick } from '../utils/handlePinIconClick.js';
import { flags } from '../resources/flags.js';
import { debounceFunction, debounceImmediate, debounceAndSwallow } from '../utils/debounce.js';

// Global debouncing map for markdown post processor
const markdownPostProcessorDebounceMap = new Map();
const MARKDOWN_PROCESSOR_DEBOUNCE_DELAY = 200; // 200ms debounce window

// Global debouncing map for updateBanner to prevent concurrent updates
const updateBannerDebounceMap = new Map();
const UPDATE_BANNER_DEBOUNCE_DELAY = 250; // 250ms debounce window

// Supported file extensions constants
const SUPPORTED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'avif'];
const SUPPORTED_MOVIE_EXTENSIONS = ['mp4', 'mov'];
const SUPPORTED_EXTENSIONS = [...SUPPORTED_IMAGE_EXTENSIONS, ...SUPPORTED_MOVIE_EXTENSIONS];


// ----------------------
// -- add pixel banner --
// ----------------------
const debouncedAddPixelBanner = debounceAndSwallow(addPixelBanner, 350);
async function addPixelBanner(plugin, el, ctx) {
    const { frontmatter, file, isContentChange, yPosition, xPosition, contentStartPosition, bannerImage, isReadingView, updateMode } = ctx;
    const viewContent = el;
    const isEmbedded = viewContent.classList.contains('internal-embed') && viewContent.classList.contains('markdown-embed');
    const isHoverPopover = viewContent.closest('.hover-popover') !== null;
    const hideEmbeddedNoteBanners = getFrontmatterValue(frontmatter, plugin.settings.customHideEmbeddedNoteBannersField) || 
        plugin.getFolderSpecificImage(file.path)?.hideEmbeddedNoteBanners || 
        plugin.settings.hideEmbeddedNoteBanners || false;

    // Add pixel-banner class to the appropriate container
    if (!isEmbedded && !isHoverPopover && viewContent.classList.contains('view-content')) {
        // set padding-top for source & preview elements as inline style for FAST rendering!
        const sourceEl = viewContent.querySelector(':scope > .markdown-source-view .cm-sizer');
        if (sourceEl) {
            sourceEl.style.paddingTop = 'var(--pixel-banner-content-start, 355px)';
            sourceEl.style.paddingBottom = '0px !important';
        }
        
        const previewEl = viewContent.querySelector(':scope > .markdown-reading-view .markdown-preview-sizer');
        if (previewEl) {
            previewEl.style.paddingTop = 'var(--pixel-banner-content-start, 355px)';
            previewEl.style.paddingBottom = '0px !important';
        }
        
        viewContent.classList.add('pixel-banner');
        plugin.setupResizeObserver(viewContent);
        plugin.applyBannerWidth(viewContent);
    } else if (isEmbedded) {
        // For embedded notes, add the pixel-banner class and apply CSS variables
        viewContent.classList.add('pixel-banner');
        
        // Apply content-start variable to the main embed container
        plugin.applyContentStartPosition(viewContent, contentStartPosition);
        
        // Find the markdown-embed-content and markdown-preview-view elements
        const embedContentDiv = viewContent.querySelector(':scope > .markdown-embed-content');
        if (embedContentDiv && !hideEmbeddedNoteBanners) {
            const previewViewEl = embedContentDiv.querySelector(':scope > .markdown-preview-view');
            if (previewViewEl) {
                
                const folderSpecific = plugin.getFolderSpecificImage(file.path);
                const maxWidth = getFrontmatterValue(frontmatter, plugin.settings.customBannerMaxWidthField) || 
                    folderSpecific?.bannerMaxWidth || plugin.settings.bannerMaxWidth || 'unset';
                const maxWidthValue = maxWidth === 'unset' ? 'unset' : `${maxWidth}px`;

                const bannerYPosition = getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customYPositionField),
                    folderSpecific?.bannerYPosition,
                    plugin.settings.bannerYPosition,
                    0
                ]);
                const bannerXPosition = getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customXPositionField),
                    folderSpecific?.bannerXPosition,
                    plugin.settings.bannerXPosition,
                    0
                ]);
                const bannerTitleColor = getFrontmatterValue(frontmatter, plugin.settings.customTitleColorField) || 
                    folderSpecific?.titleColor || plugin.settings.titleColor || 'var(--inline-title-color)';
                
                previewViewEl.style.setProperty('--pixel-banner-y-position', `${bannerYPosition}%`);
                previewViewEl.style.setProperty('--pixel-banner-x-position', `${bannerXPosition}%`);
                previewViewEl.style.setProperty('--pixel-banner-max-width', maxWidthValue);
                previewViewEl.style.setProperty('--pixel-banner-title-color', bannerTitleColor);
                
                const bannerIconSize = getFrontmatterValue(frontmatter, plugin.settings.customBannerIconSizeField) || 
                    folderSpecific?.bannerIconSize || plugin.settings.bannerIconSize || 70;
                const bannerIconXPosition = getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerIconXPositionField),
                    folderSpecific?.bannerIconXPosition,
                    plugin.settings.bannerIconXPosition,
                    25
                ]);
                const bannerIconOpacity = getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerIconOpacityField),
                    folderSpecific?.bannerIconOpacity,
                    plugin.settings.bannerIconOpacity,
                    100
                ]);
                const bannerIconColor = getFrontmatterValue(frontmatter, plugin.settings.customBannerIconColorField) || 
                    folderSpecific?.bannerIconColor || plugin.settings.bannerIconColor || 'var(--text-normal)';
                const bannerIconFontWeight = getFrontmatterValue(frontmatter, plugin.settings.customBannerIconFontWeightField) || 
                    folderSpecific?.bannerIconFontWeight || plugin.settings.bannerIconFontWeight || 'normal';
                const bannerIconBackgroundColor = getFrontmatterValue(frontmatter, plugin.settings.customBannerIconBackgroundColorField) || 
                    folderSpecific?.bannerIconBackgroundColor || plugin.settings.bannerIconBackgroundColor || 'transparent';
                const bannerIconPaddingX = getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerIconPaddingXField),
                    folderSpecific?.bannerIconPaddingX,
                    plugin.settings.bannerIconPaddingX,
                    10
                ]);
                const bannerIconPaddingY = getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerIconPaddingYField),
                    folderSpecific?.bannerIconPaddingY,
                    plugin.settings.bannerIconPaddingY,
                    10
                ]);
                const bannerIconBorderRadius = getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerIconBorderRadiusField),
                    folderSpecific?.bannerIconBorderRadius,
                    plugin.settings.bannerIconBorderRadius,
                    17
                ]);
                const bannerIconVerticalOffset = getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerIconVerticalOffsetField),
                    folderSpecific?.bannerIconVerticalOffset,
                    plugin.settings.bannerIconVerticalOffset,
                    0
                ]);
                const bannerIconRotate = getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerIconRotateField),
                    0
                ]);
                const bannerIconImageSizeMultiplier = getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerIconImageSizeMultiplierField),
                    plugin.settings.bannerIconImageSizeMultiplier,
                    1
                ]);
                const bannerIconTextVerticalOffset = getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerIconTextVerticalOffsetField),
                    plugin.settings.bannerIconTextVerticalOffset,
                    0
                ]);
                
                previewViewEl.style.setProperty('--pixel-banner-icon-size', `${bannerIconSize}px`);
                previewViewEl.style.setProperty('--pixel-banner-icon-x', `${bannerIconXPosition}%`);
                previewViewEl.style.setProperty('--pixel-banner-icon-opacity', `${bannerIconOpacity}%`);
                previewViewEl.style.setProperty('--pixel-banner-icon-color', bannerIconColor);
                previewViewEl.style.setProperty('--pixel-banner-icon-font-weight', bannerIconFontWeight);
                previewViewEl.style.setProperty('--pixel-banner-icon-background-color', bannerIconBackgroundColor);
                previewViewEl.style.setProperty('--pixel-banner-icon-padding-x', `${bannerIconPaddingX}px`);
                previewViewEl.style.setProperty('--pixel-banner-icon-padding-y', `${bannerIconPaddingY}px`);
                previewViewEl.style.setProperty('--pixel-banner-icon-border-radius', `${bannerIconBorderRadius}px`);
                previewViewEl.style.setProperty('--pixel-banner-icon-vertical-offset', `${bannerIconVerticalOffset}px`);
                previewViewEl.style.setProperty('--pixel-banner-icon-rotate', `${bannerIconRotate}deg`);
                previewViewEl.style.setProperty('--pixel-banner-icon-image-size-multiplier', `${bannerIconImageSizeMultiplier}em`);
                previewViewEl.style.setProperty('--pixel-banner-icon-text-vertical-offset', `${bannerIconTextVerticalOffset}px`);
                
                // Set height for embedded notes with banners
                const bannerHeight = getFrontmatterValue(frontmatter, plugin.settings.customBannerHeightField) || 
                    folderSpecific?.bannerHeight || plugin.settings.bannerHeight || 150;
                const embedMinHeight = `${(parseInt(bannerHeight) + (parseInt(bannerIconSize) / 2))}px`;
                previewViewEl.style.setProperty('--pixel-banner-embed-min-height', embedMinHeight);
                previewViewEl.style.setProperty('--pixel-banner-height', `${bannerHeight}px`);

                // set pixel banner fade
                const bannerFade = getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerFadeField),
                    folderSpecific?.bannerFade,
                    plugin.settings.fade,
                    -75
                ]);
                previewViewEl.style.setProperty('--pixel-banner-fade', `${bannerFade}%`);

                // set pixel banner border radius
                const bannerRadius = getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBorderRadiusField),
                    folderSpecific?.borderRadius,
                    plugin.settings.borderRadius,
                    17
                ]);
                previewViewEl.style.setProperty('--pixel-banner-radius', `${bannerRadius}px`);

                // set pixel banner alignment
                const bannerAlignment = getFrontmatterValue(frontmatter, plugin.settings.customBannerAlignmentField) || 'center';
                let alignmentValue = '0 auto'; // Default for center
                if (bannerAlignment === 'left') {
                    alignmentValue = '0 auto 0 0';
                } else if (bannerAlignment === 'right') {
                    alignmentValue = '0 0 0 auto';
                }
                previewViewEl.style.setProperty('--pixel-banner-alignment', alignmentValue);

                // Set banner icon start
                previewViewEl.style.setProperty('--pixel-banner-icon-start', `${(bannerHeight - (bannerIconSize / 2))}px`);

                // calculate content start
                const contentStart = !hideEmbeddedNoteBanners ? 
                    `${(parseInt(bannerHeight) + (parseInt(bannerIconSize) / 2) + parseInt(bannerIconVerticalOffset) + parseInt(bannerIconPaddingY))}px` : 
                    '0px';
                previewViewEl.style.setProperty('--pixel-banner-content-start', contentStart);
            }
        }
    } else if (isHoverPopover && plugin.settings.showBannerInPopoverPreviews) {
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
    } else if (isHoverPopover && plugin.settings.showBannerInPopoverPreviews) {
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
        
        // console.log('🔍 Hover popover container found:', container?.className);
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
            viewImageIcon._updateVisibility = (newUrl, originalPath) => {
                viewImageIcon.style.display = newUrl ? 'block' : 'none';
                if (newUrl) {
                    viewImageIcon.onclick = () => {
                        new ImageViewModal(plugin.app, newUrl, originalPath).open();
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
            if (bannerIconOverlay?._isPersistentBannerIcon) {
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
        const inputType = plugin.getInputType(bannerImage, file.path);
        const folderSpecific = plugin.getFolderSpecificImage(file.path);

        // Check if this is a shuffled banner
        const hasShufflePath = getFrontmatterValue(frontmatter, plugin.settings.customBannerShuffleField);
        const isShuffled = hasShufflePath || folderSpecific?.enableImageShuffle;

        // Default to FULL_UPDATE if updateMode is not provided
        const effectiveUpdateMode = updateMode || plugin.UPDATE_MODE.FULL_UPDATE;
        
        // Determine if we should fetch a new image
        let shouldFetchNewImage = false;
        
        if (effectiveUpdateMode === plugin.UPDATE_MODE.ENSURE_VISIBILITY) {
            // For ENSURE_VISIBILITY mode, only fetch if we don't have a cached image
            shouldFetchNewImage = !imageUrl;
        } else {
            // For other modes (FULL_UPDATE, SHUFFLE_UPDATE, etc.), apply normal conditions
            shouldFetchNewImage = (
                effectiveUpdateMode === plugin.UPDATE_MODE.FULL_UPDATE || 
                !imageUrl || 
                isShuffled || 
                (isContentChange && bannerImage !== lastInput)
            );
        }
        
        if (shouldFetchNewImage) {
            imageUrl = await plugin.getImageUrl(inputType, bannerImage, file.path);
            if (imageUrl) {
                // Store the full object with metadata for videos
                plugin.loadedImages.set(file.path, imageUrl);
                plugin.lastKeywords.set(file.path, bannerImage);
            }
        }

        if (imageUrl) {
            // Display banner
            const imageDisplay = getFrontmatterValue(frontmatter, plugin.settings.customImageDisplayField) ||
                folderSpecific?.imageDisplay ||
                plugin.settings.imageDisplay;
            const imageRepeat = getFrontmatterValue(frontmatter, plugin.settings.customImageRepeatField) ||
                folderSpecific?.imageRepeat ||
                plugin.settings.imageRepeat;
            
            let isVideoFile = false;
            let fileUrl = '';
            
            // Check if the result is an object with the new format including video metadata
            if (typeof imageUrl === 'object' && imageUrl !== null) {
                isVideoFile = imageUrl.isVideo === true;
                fileUrl = imageUrl.url;
                // Note: We're now preserving the full object in the cache, so no need to update it here
            } else {
                // Legacy format - direct URL string or previously cached URL
                fileUrl = imageUrl;
                
                // Check if it's a cached video path (resource URLs for videos contain '/media-attachment/')
                if (typeof fileUrl === 'string' && 
                    fileUrl.includes('/media-attachment/') && 
                    (fileUrl.toLowerCase().endsWith('.mp4') || fileUrl.toLowerCase().endsWith('.mov'))) {
                    isVideoFile = true;
                }
            }
            
            const isSvg = fileUrl.includes('image/svg+xml') ||
                (file.path && file.path.toLowerCase().endsWith('.svg'));

            // Add blob URL validation
            if (fileUrl.startsWith('blob:')) {
                try {
                    // Attempt to fetch the blob URL to validate it
                    const response = await fetch(fileUrl);
                    if (!response.ok) {
                        throw new Error('Blob URL validation failed');
                    }
                } catch (error) {
                    console.log('Blob URL invalid, refreshing file:', error);
                    // Clear the invalid blob URL from cache
                    plugin.loadedImages.delete(file.path);
                    URL.revokeObjectURL(fileUrl);
                    
                    // Get a fresh URL
                    const inputType = plugin.getInputType(bannerImage, file.path);
                    const freshResult = await plugin.getImageUrl(inputType, bannerImage, file.path);
                    if (freshResult) {
                        if (typeof freshResult === 'object' && freshResult !== null) {
                            isVideoFile = freshResult.isVideo === true;
                            fileUrl = freshResult.url;
                        } else {
                            fileUrl = freshResult;
                        }
                        plugin.loadedImages.set(file.path, fileUrl);
                    }
                }
            }
            
            // Handle video files (MP4)
            if (isVideoFile) {
                // Clear any background image
                bannerDiv.style.backgroundImage = '';
                
                // Remove any existing video element
                const existingVideo = bannerDiv.querySelector('video');
                if (existingVideo) {
                    existingVideo.remove();
                }
                
                // Create video element
                const videoEl = document.createElement('video');
                videoEl.className = 'pixel-banner-video';
                videoEl.src = fileUrl;
                videoEl.autoplay = true;
                videoEl.loop = true;
                videoEl.muted = true;
                videoEl.playsInline = true;
                videoEl.style.width = '100%';
                videoEl.style.height = '100%';
                videoEl.style.objectFit = imageDisplay || 'cover';
                videoEl.style.position = 'absolute';
                videoEl.style.top = '0';
                videoEl.style.left = '0';
                bannerDiv.appendChild(videoEl);
            } else {
                // Handle as image
                // Remove any existing video element
                const existingVideo = bannerDiv.querySelector('video');
                if (existingVideo) {
                    existingVideo.remove();
                }
                
                // Set the background image
                bannerDiv.style.backgroundImage = `url('${fileUrl}')`;

                if (isSvg) {
                    bannerDiv.style.backgroundSize = imageDisplay === 'contain' ? 'contain' : '100% 100%';
                } else {
                    bannerDiv.style.backgroundSize = imageDisplay || 'cover';
                }
                bannerDiv.style.backgroundRepeat = imageRepeat ? 'repeat' : 'no-repeat';
            }
            
            bannerDiv.style.display = 'block';
            
            // For embedded notes, also set the background-image CSS variable on the pixel-banner-image element
            if (isEmbedded) {
                bannerDiv.style.setProperty('--pixel-banner-image', `url('${imageUrl}')`);
            }
            
            // if (isHoverPopover && plugin.settings.showBannerInPopoverPreviews) {
            //     console.log('🖼️ Set banner image in hover popover:', {
            //         imageUrl: imageUrl,
            //         backgroundSize: bannerDiv.style.backgroundSize,
            //         display: bannerDiv.style.display
            //     });
            // }

            // If there's a "view image" icon, update it
            const viewImageIcon = container.querySelector(':scope > .view-image-icon');
            if (viewImageIcon && viewImageIcon._updateVisibility) {
                const bannerValue = getFrontmatterValue(frontmatter, plugin.settings.customBannerField);
                let displayUrl = bannerValue || file.path;
                
                // For 3rd party APIs (keyword-based), use actual URL instead of keyword
                if (inputType === 'keyword') {
                    if (imageUrl && typeof imageUrl === 'object' && imageUrl.url) {
                        displayUrl = imageUrl.url;
                    } else if (imageUrl && typeof imageUrl === 'string') {
                        displayUrl = imageUrl;
                    }
                }
                
                viewImageIcon._updateVisibility(imageUrl, displayUrl);
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
            const canPin = (inputType === 'keyword' || inputType === 'url') && plugin.settings.showPinIcon && !isEmbedded && !isHoverPopover;
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
                        const currentImage = plugin.loadedImages.get(file.path);
                        if (!currentImage) {
                            new Notice('Could not find the current image URL to pin.');
                            console.error('Error pinning image: currentImage is null or undefined for file.path:', file.path);
                            return;
                        }
                        const imageUrlToPin = typeof currentImage === 'object' && currentImage.url ? currentImage.url : currentImage;
                        await handlePinIconClick(imageUrlToPin, plugin);
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

                            // Get the original frontmatter value instead of the resolved bannerImage
                            // This ensures we always get the full comma-separated keywords for random selection
                            const originalBannerValue = getFrontmatterValue(frontmatter, plugin.settings.customBannerField);
                            const result = await plugin.getImageUrl(inputType, originalBannerValue || bannerImage, file.path);
                            if (result) {
                                // Check if it's a video or an image result
                                let isVideoFile = false;
                                let fileUrl = '';
                                
                                if (typeof result === 'object' && result !== null) {
                                    isVideoFile = result.isVideo === true;
                                    fileUrl = result.url;
                                } else {
                                    fileUrl = result;
                                }
                                
                                // Store the URL string in cache, not the full object
                                plugin.loadedImages.set(file.path, fileUrl);
                                plugin.lastKeywords.set(file.path, bannerImage);
                                
                                // Update the banner display based on file type
                                if (isVideoFile) {
                                    // Clear background image
                                    bannerDiv.style.backgroundImage = '';
                                    
                                    // Remove existing video
                                    const existingVideo = bannerDiv.querySelector('video');
                                    if (existingVideo) {
                                        existingVideo.remove();
                                    }
                                    
                                    // Create video element
                                    const videoEl = document.createElement('video');
                                    videoEl.className = 'pixel-banner-video';
                                    videoEl.src = fileUrl;
                                    videoEl.autoplay = true;
                                    videoEl.loop = true;
                                    videoEl.muted = true;
                                    videoEl.playsInline = true;
                                    videoEl.style.width = '100%';
                                    videoEl.style.height = '100%';
                                    videoEl.style.objectFit = 'cover';
                                    videoEl.style.position = 'absolute';
                                    videoEl.style.top = '0';
                                    videoEl.style.left = '0';
                                    bannerDiv.appendChild(videoEl);
                                } else {
                                    // It's an image, handle as before
                                    bannerDiv.style.backgroundImage = `url('${fileUrl}')`;
                                    
                                    // Remove any existing videos
                                    const existingVideo = bannerDiv.querySelector('video');
                                    if (existingVideo) {
                                        existingVideo.remove();
                                    }
                                }

                                // Update view image icon if it exists
                                const viewImageIcon = container.querySelector(':scope > .view-image-icon');
                                if (viewImageIcon && viewImageIcon._updateVisibility) {
                                    const bannerValue = getFrontmatterValue(frontmatter, plugin.settings.customBannerField);
                                    let displayUrl = bannerValue || file.path;
                                    
                            // For 3rd party APIs (keyword-based), use actual URL instead of keyword
                            const refreshInputType = plugin.getInputType(bannerValue, file.path);
                            if (refreshInputType === 'keyword') {
                                if (fileUrl && typeof fileUrl === 'object' && fileUrl.url) {
                                    displayUrl = fileUrl.url;
                                } else if (fileUrl && typeof fileUrl === 'string') {
                                    displayUrl = fileUrl;
                                }
                            }
                                    viewImageIcon._updateVisibility(fileUrl, displayUrl);
                                }
                                
                                new Notice('🔄 Refreshed banner');
                            }
                        } catch (error) {
                            console.error('Error refreshing banner:', error);
                            new Notice('Failed to refresh the banner.');
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


// ---------------------------
// -- updateBanner function --
// ---------------------------
// Using standard debounce instead of debounceImmediate to prevent double execution
const debouncedUpdateBanner = debounceFunction(updateBanner, 50);
async function updateBanner(plugin, view, isContentChange, updateMode = plugin.UPDATE_MODE.FULL_UPDATE) {
    if (!view || !view.file) {
        return;
    }
    
    const filePath = view.file.path;
    const currentTime = Date.now();
    
    // Check if we recently updated this file's banner
    const lastUpdateTime = updateBannerDebounceMap.get(filePath);
    if (lastUpdateTime && (currentTime - lastUpdateTime) < UPDATE_BANNER_DEBOUNCE_DELAY) {
        return;
    }
    
    // Update the debounce timestamp
    updateBannerDebounceMap.set(filePath, currentTime);

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

        // cleanup padding-top from preview & source sizers
        const previewSizer = contentEl.querySelector('.markdown-preview-sizer');
        if (previewSizer) {
            // Remove only the 'padding-top' inline style from previewSizer
            previewSizer.style.removeProperty('padding-top');
        }
        const sourceSizer = contentEl.querySelector('.cm-sizer');
        if (sourceSizer) {
            // Remove only the 'padding-top' inline style from sourceSizer
            sourceSizer.style.removeProperty('padding-top');
        }
        
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
        // Don't format here - let the downstream logic at line 920 handle formatting
        // consistently for both array and string inputs
        if (Array.isArray(bannerImage)) {
            bannerImage = bannerImage.flat()[0];
        }

        // Handle comma-delimited banner values in frontmatter
        if (typeof bannerImage === 'string' &&
            !bannerImage.startsWith('[[') &&
            !bannerImage.startsWith('![[') &&
            !bannerImage.startsWith('http')) {

            if (bannerImage.includes(',')) {
                const parts = bannerImage.split(',').map(p => p.trim());
                const isFile = (str) => SUPPORTED_EXTENSIONS.some(ext => str.toLowerCase().endsWith(`.${ext}`));
                const isKeyword = (str) => !str.includes('.');

                // Treat as a list if all parts are files, or all parts are keywords.
                if (parts.length > 1 && (parts.every(isFile) || parts.every(isKeyword))) {
                    const bannerValues = parts.filter(v => v.length > 0);
                    if (bannerValues.length > 0) {
                        bannerImage = bannerValues[Math.floor(Math.random() * bannerValues.length)];
                    } else {
                        bannerImage = null;
                    }
                }
                // Otherwise, assume it's a single filename with commas and leave it as is.
            }
        }

        // Format internal links
        if (bannerImage && typeof bannerImage === 'string' && !bannerImage.startsWith('[[') && !bannerImage.startsWith('![[') && !bannerImage.startsWith('http')) {
            const file = plugin.app.vault.getAbstractFileByPath(bannerImage);
            if (file && 'extension' in file) {
                if (file.extension.match(/^(jpg|jpeg|png|gif|bmp|svg)$/i)) {
                    bannerImage = `![[${bannerImage}]]`;
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
    let maxWidth = getFrontmatterValue(frontmatter, plugin.settings.customBannerMaxWidthField) || 
        folderSpecific?.bannerMaxWidth || 
        'unset';

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
            maxWidth,
            isReadingView: view.getMode && view.getMode() === 'preview',
            updateMode: updateMode
        });
        plugin.lastYPositions.set(view.file.path, yPosition);
    } else if (existingBanner) {
        existingBanner.style.display = 'none';
    }

    // Process embedded notes if this is not an embedded note itself
    if (!isEmbedded) {
        const embeddedNotes = contentEl.querySelectorAll('.internal-embed.markdown-embed');
        for (const embed of embeddedNotes) {
            const embedSrc = embed.getAttribute('src');
            if (!embedSrc) continue;
            const embedFile = plugin.app.metadataCache.getFirstLinkpathDest(embedSrc, view.file.path);
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
        if (container) {
            const oldViewIcons = container.querySelectorAll('.view-image-icon');
            const oldPinIcons = container.querySelectorAll('.pin-icon');
            const oldRefreshIcons = container.querySelectorAll('.refresh-icon');
            const oldSelectIcons = container.querySelectorAll('.select-image-icon');

            [...oldViewIcons, ...oldPinIcons, ...oldRefreshIcons, ...oldSelectIcons].forEach(el => el.remove());
        }

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
    let bannerIconImage = getFrontmatterValue(frontmatter, plugin.settings.customBannerIconImageField);
    
    // Handle array flattening for icon-image (same issue as main banner with unquoted wiki links)
    if (Array.isArray(bannerIconImage)) {
        bannerIconImage = bannerIconImage.flat()[0];
        // Only format as internal link if it's not already formatted
        if (bannerIconImage && !bannerIconImage.startsWith('[[') && !bannerIconImage.startsWith('![[')) {
            bannerIconImage = `[[${bannerIconImage}]]`;
        }
    }

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

    // Clean up existing persistent banner icon overlays if both icon and icon-image fields are removed or empty
    if ((!bannerIcon || (typeof bannerIcon === 'string' && !bannerIcon.trim())) &&
        (!bannerIconImage || (typeof bannerIconImage === 'string' && !bannerIconImage.trim()))) {
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

    // Proceed if we have a valid banner icon or banner icon image
    if ((bannerIcon && typeof bannerIcon === 'string' && bannerIcon.trim()) ||
        (bannerIconImage && typeof bannerIconImage === 'string' && bannerIconImage.trim())) {
        const cleanIcon = bannerIcon ? bannerIcon.trim() : '';

        // Check cache first
        const cacheKey = plugin.generateCacheKey(view.file.path, plugin.app.workspace.activeLeaf.id);
        const cachedState = plugin.bannerStateCache.get(cacheKey);
        const cachedIconState = cachedState?.state?.iconState;

        // Function to create or update icon overlay
        const createOrUpdateIconOverlay = async (banner, viewType) => {
            if (!banner) {
                return;
            }

            // Get current icon state
            const currentIconState = {
                icon: cleanIcon,
                size: getFrontmatterValue(frontmatter, plugin.settings.customBannerIconSizeField) || plugin.settings.bannerIconSize,
                xPosition: getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerIconXPositionField),
                    plugin.settings.bannerIconXPosition,
                ]),
                opacity: getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerIconOpacityField),
                    plugin.settings.bannerIconOpacity,
                ]),
                color: getFrontmatterValue(frontmatter, plugin.settings.customBannerIconColorField) || plugin.settings.bannerIconColor,
                fontWeight: getFrontmatterValue(frontmatter, plugin.settings.customBannerIconFontWeightField) || plugin.settings.bannerIconFontWeight,
                backgroundColor: getFrontmatterValue(frontmatter, plugin.settings.customBannerIconBackgroundColorField) || plugin.settings.bannerIconBackgroundColor,
                paddingX: getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerIconPaddingXField),
                    plugin.settings.bannerIconPaddingX,
                ]),
                paddingY: getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerIconPaddingYField),
                    plugin.settings.bannerIconPaddingY,
                ]),
                borderRadius: getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerIconBorderRadiusField),
                    plugin.settings.bannerIconBorderRadius,
                ]),
                verticalOffset: getValueWithZeroCheck([
                    getFrontmatterValue(frontmatter, plugin.settings.customBannerIconVerticalOffsetField),
                    plugin.settings.bannerIconVerticalOffset,
                ]),
                imageAlignment: getFrontmatterValue(frontmatter, plugin.settings.customBannerIconImageAlignmentField) || plugin.settings.bannerIconImageAlignment,
                viewType
            };

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
            bannerIconOverlay.textContent = '';
            bannerIconOverlay._isPersistentBannerIcon = true;

            // Clear any existing content
            bannerIconOverlay.innerHTML = '';

            // Get the image alignment setting
            const imageAlignment = currentIconState.imageAlignment === 'right' ? 'right' : 'left';

            // Create image element if we have a banner icon image
            let imgElement = null;
            if (bannerIconImage) {
                // Resolve the image path using icon-specific utility functions for better partial path resolution
                const inputType = plugin.getIconImageInputType(bannerIconImage, view.file.path);
                
                let imagePath = null;
                let resolvedVaultPath = null;

                // Skip processing if the input is invalid (e.g., corrupted object values)
                if (inputType === 'invalid') {
                    console.warn('Invalid banner icon image value detected:', bannerIconImage);
                    // Skip image creation but continue with the rest of the function
                } else {
                    // Use the same resolution logic as for banner images
                    switch (inputType) {
                        case 'obsidianLink':
                            const file = plugin.getPathFromObsidianLink(bannerIconImage);
                            if (file) {
                                imagePath = plugin.loadedImages.get(file.path);
                                if (!imagePath) {
                                    imagePath = await plugin.getVaultImageUrl(file.path);
                                    if (imagePath) plugin.loadedImages.set(file.path, imagePath);
                                }
                            }
                            break;
                        case 'markdownImage':
                            const mdPath = plugin.getPathFromMarkdownImage(bannerIconImage);
                            if (typeof mdPath === 'string') {
                                // If path is a URL, use it directly
                                try {
                                    new URL(mdPath);
                                    imagePath = mdPath;
                                } catch (_) {
                                    // Not a URL, treat as a vault path
                                    imagePath = plugin.loadedImages.get(mdPath);
                                    if (!imagePath) {
                                        imagePath = await plugin.getVaultImageUrl(mdPath);
                                        if (imagePath) plugin.loadedImages.set(mdPath, imagePath);
                                    }
                                }
                            } else if (mdPath) {
                                imagePath = plugin.loadedImages.get(mdPath.path);
                                if (!imagePath) {
                                    imagePath = await plugin.getVaultImageUrl(mdPath.path);
                                    if (imagePath) plugin.loadedImages.set(mdPath.path, imagePath);
                                }
                            }
                            break;
                        case 'vaultPath':
                            // IMPORTANT: We need to resolve the partial path to a full path first!
                            // Clean the input and try to resolve it
                            const cleanedInput = bannerIconImage.trim().replace(/^["'](.*)["']$/, '$1');
                            
                            // Try exact match first
                            let resolvedFile = plugin.app.vault.getAbstractFileByPath(cleanedInput);
                            if (!resolvedFile) {
                                // Try partial path resolution
                                resolvedFile = plugin.app.metadataCache.getFirstLinkpathDest(cleanedInput, view.file.path);
                            }
                            
                            if (resolvedFile && 'path' in resolvedFile) {
                                resolvedVaultPath = resolvedFile.path;
                                
                                // Now get the image URL using the resolved path
                                imagePath = plugin.loadedImages.get(resolvedVaultPath);
                                if (!imagePath) {
                                    imagePath = await plugin.getVaultImageUrl(resolvedVaultPath);
                                    if (imagePath) plugin.loadedImages.set(resolvedVaultPath, imagePath);
                                }
                            } else {
                                console.warn('[Icon Image] Could not resolve vault path:', cleanedInput);
                            }
                            break;
                        case 'url':
                            imagePath = bannerIconImage;
                            break;
                        case 'fileUrl':
                            // For file:/// URLs, we should not handle them for icon images as they may be a security risk
                            // and are only supported for main banners on desktop
                            console.warn('file:/// URLs are not supported for banner icon images');
                            break;
                        case 'keyword':
                            // Keywords are not supported for banner icon images - they're only for main banners
                            console.warn('Keywords are not supported for banner icon images');
                            break;
                    }

                    // If we successfully resolved an image path, create the image element
                    if (imagePath) {
                        imgElement = document.createElement('img');
                        // Extract URL from object if needed, otherwise use string directly
                        const imageUrl = typeof imagePath === 'object' && imagePath.url ? imagePath.url : imagePath;

                        imgElement.src = imageUrl;
                        imgElement.className = 'banner-icon-image';
                    }
                } // End of else block for valid inputType
            }

            // Create text element if we have icon text
            let textElement = null;
            if (cleanIcon) {
                textElement = document.createElement('div');
                textElement.className = 'banner-icon-text';
                textElement.textContent = cleanIcon;
            }

            // Add elements to overlay based on alignment setting
            if (imageAlignment === 'right') {
                // Add text first, then image
                if (textElement) bannerIconOverlay.appendChild(textElement);
                if (imgElement) bannerIconOverlay.appendChild(imgElement);
            } else {
                // Default alignment: image first, then text
                if (imgElement) bannerIconOverlay.appendChild(imgElement);
                if (textElement) bannerIconOverlay.appendChild(textElement);
            }

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
            await createOrUpdateIconOverlay(previewBanner, 'preview');
        } else {
            // For main notes, apply to both views
            const previewContainer = contentEl.querySelector('div.markdown-preview-sizer');
            const sourceContainer = contentEl.querySelector('div.cm-sizer');

            if (previewContainer) {
                const previewBanner = previewContainer.querySelector(':scope > .pixel-banner-image');
                await createOrUpdateIconOverlay(previewBanner, 'preview');
            }

            if (sourceContainer) {
                const sourceBanner = sourceContainer.querySelector(':scope > .pixel-banner-image');
                await createOrUpdateIconOverlay(sourceBanner, 'source');
            }
        }
    }
}


// ----------------------------------
// -- applyBannerSettings function --
// ----------------------------------
const debouncedApplyBannerSettings = debounceAndSwallow(applyBannerSettings, 350);
function applyBannerSettings(plugin, bannerDiv, ctx, isEmbedded) {
    // console.log('🔍 Applying banner settings');
    const { frontmatter, imageDisplay, imageRepeat, bannerHeight, fade, borderRadius, maxWidth } = ctx;
    const folderSpecific = plugin.getFolderSpecificImage(ctx.file.path);
    
    // Get pixel banner y position
    let pixelBannerYPosition = getValueWithZeroCheck([
        getFrontmatterValue(frontmatter, plugin.settings.customYPositionField),
        folderSpecific?.yPosition,
        plugin.settings.yPosition,
    ]);
    
    // Get pixel banner x position
    let pixelBannerXPosition = getValueWithZeroCheck([
        getFrontmatterValue(frontmatter, plugin.settings.customXPositionField),
        folderSpecific?.xPosition,
        plugin.settings.xPosition,
    ]);

    // Get pixel banner max width
    const pixelBannerMaxWidth = getFrontmatterValue(frontmatter, plugin.settings.customBannerMaxWidthField) || 
        folderSpecific?.bannerMaxWidth || 
        plugin.settings.bannerMaxWidth || 
        'unset';

    // Get title color from frontmatter, folder settings, or default
    const titleColor = getFrontmatterValue(frontmatter, plugin.settings.customTitleColorField) || 
        folderSpecific?.titleColor || 
        plugin.settings.titleColor;

    // Get banner-icon size from frontmatter, folder settings, or default
    const bannerIconSize = 
        getFrontmatterValue(frontmatter, plugin.settings.customBannerIconSizeField) || 
        folderSpecific?.bannerIconSize || 
        plugin.settings.bannerIconSize || 
        70;

    // Get banner-icon x position
    const bannerIconXPosition = getValueWithZeroCheck([
        getFrontmatterValue(frontmatter, plugin.settings.customBannerIconXPositionField),
        folderSpecific?.bannerIconXPosition,
        plugin.settings.bannerIconXPosition,
        25
    ]);

    // Get banner-icon opacity
    const bannerIconOpacity = getValueWithZeroCheck([
        getFrontmatterValue(frontmatter, plugin.settings.customBannerIconOpacityField),
        folderSpecific?.bannerIconOpacity,
        plugin.settings.bannerIconOpacity,
        100
    ]);

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
    const bannerIconPaddingX = getValueWithZeroCheck([
        getFrontmatterValue(frontmatter, plugin.settings.customBannerIconPaddingXField),
        folderSpecific?.bannerIconPaddingX,
        plugin.settings.bannerIconPaddingX,
        10
    ]);

    // Get banner-icon padding Y
    const bannerIconPaddingY = getValueWithZeroCheck([
        getFrontmatterValue(frontmatter, plugin.settings.customBannerIconPaddingYField),
        folderSpecific?.bannerIconPaddingY,
        plugin.settings.bannerIconPaddingY,
        10
    ]);

    // Get banner-icon border radius
    const bannerIconBorderRadius = getValueWithZeroCheck([
        getFrontmatterValue(frontmatter, plugin.settings.customBannerIconBorderRadiusField),
        folderSpecific?.bannerIconBorderRadius,
        plugin.settings.bannerIconBorderRadius,
        17
    ]);

    // Get banner-icon vertical offset
    const bannerIconVerticalOffset = getValueWithZeroCheck([
        Number(getFrontmatterValue(frontmatter, plugin.settings.customBannerIconVerticalOffsetField)),
        folderSpecific?.bannerIconVerticalOffset,
        plugin.settings.bannerIconVerticalOffset,
        0
    ]);

    // Get banner-icon rotate
    const bannerIconRotate = getValueWithZeroCheck([
        getFrontmatterValue(frontmatter, plugin.settings.customBannerIconRotateField),
        0
    ]);

    // Get banner-icon image size multiplier
    const bannerIconImageSizeMultiplier = getValueWithZeroCheck([
        getFrontmatterValue(frontmatter, plugin.settings.customBannerIconImageSizeMultiplierField),
        plugin.settings.bannerIconImageSizeMultiplier,
        1
    ]);

    // Get banner-icon text vertical offset
    const bannerIconTextVerticalOffset = getValueWithZeroCheck([
        getFrontmatterValue(frontmatter, plugin.settings.customBannerIconTextVerticalOffsetField),
        plugin.settings.bannerIconTextVerticalOffset,
        0
    ]);

    // Get hide embedded note banners setting
    const hideEmbeddedNoteBanners = getFrontmatterValue(frontmatter, plugin.settings.customHideEmbeddedNoteBannersField) || 
        folderSpecific?.hideEmbeddedNoteBanners || 
        plugin.settings.hideEmbeddedNoteBanners || false;

    // Get banner alignment
    const bannerAlignment = getFrontmatterValue(frontmatter, plugin.settings.customBannerAlignmentField) || 'center';
    
    // Set alignment CSS variable based on the alignment value
    let alignmentValue = '0 auto'; // Default for center
    if (bannerAlignment === 'left') {
        alignmentValue = '0 auto 0 0';
    } else if (bannerAlignment === 'right') {
        alignmentValue = '0 0 0 auto';
    }

    // Create a CSS variables object to ensure consistent application
    const cssVars = {
        '--pixel-banner-height': hideEmbeddedNoteBanners && isEmbedded ? '0px' : `${bannerHeight}px`,
        '--pixel-banner-fade': `${fade}%`,
        '--pixel-banner-fade-in-animation-duration': `${plugin.settings.bannerFadeInAnimationDuration}ms`,
        '--pixel-banner-radius': `${borderRadius}px`,
        '--pixel-banner-max-width': pixelBannerMaxWidth === 'unset' ? 'unset' : `${pixelBannerMaxWidth}px`,
        '--pixel-banner-y-position': `${pixelBannerYPosition}%`,
        '--pixel-banner-x-position': `${pixelBannerXPosition}%`,
        '--pixel-banner-title-color': titleColor,
        '--pixel-banner-icon-size': `${bannerIconSize}px`,
        '--pixel-banner-icon-start': `${(bannerHeight - (bannerIconSize / 2))}px`,
        '--pixel-banner-icon-x': `${bannerIconXPosition}%`,
        '--pixel-banner-icon-opacity': `${bannerIconOpacity}%`,
        '--pixel-banner-icon-color': bannerIconColor,
        '--pixel-banner-icon-font-weight': bannerIconFontWeight,
        '--pixel-banner-icon-background-color': bannerIconBackgroundColor,
        '--pixel-banner-icon-padding-x': `${bannerIconPaddingX}px`,
        '--pixel-banner-icon-padding-y': `${bannerIconPaddingY}px`,
        '--pixel-banner-icon-border-radius': `${bannerIconBorderRadius}px`,
        '--pixel-banner-icon-vertical-offset': `${bannerIconVerticalOffset}px`,
        '--pixel-banner-icon-rotate': `${bannerIconRotate}deg`,
        '--pixel-banner-icon-image-size-multiplier': `${bannerIconImageSizeMultiplier}em`,
        '--pixel-banner-icon-text-vertical-offset': `${bannerIconTextVerticalOffset}px`,
        '--pixel-banner-embed-min-height': !hideEmbeddedNoteBanners ? 
            `${(parseInt(bannerHeight) + (parseInt(bannerIconSize) / 2) + parseInt(bannerIconVerticalOffset) + parseInt(bannerIconPaddingY))}px` : 
            '0px',
        '--pixel-banner-alignment': alignmentValue
    };

    // Apply style properties to the banner div
    bannerDiv.style.backgroundSize = imageDisplay || 'cover';
    bannerDiv.style.backgroundRepeat = imageRepeat ? 'repeat' : 'no-repeat';
    
    // Apply all CSS variables to the banner div
    Object.entries(cssVars).forEach(([property, value]) => {
        bannerDiv.style.setProperty(property, value);
    });

    // Find and apply to container
    const container = bannerDiv.closest('.markdown-preview-view, .markdown-source-view');
    if (container) {
        // Apply all CSS variables to the container
        Object.entries(cssVars).forEach(([property, value]) => {
            container.style.setProperty(property, value);
        });
    }
    
    // For embedded notes, ensure we apply to all relevant elements in the embed structure
    if (isEmbedded) {
        // Find the internal-embed parent
        const embedContainer = bannerDiv.closest('.internal-embed');
        if (embedContainer) {
            // Apply content-start to the embed container
            embedContainer.style.setProperty('--pixel-banner-content-start', cssVars['--pixel-banner-embed-min-height']);
            
            // Find markdown-embed-content if it exists
            const embedContentDiv = embedContainer.querySelector(':scope > .markdown-embed-content');
            if (embedContentDiv) {
                // Apply all CSS variables to the embed content div
                Object.entries(cssVars).forEach(([property, value]) => {
                    embedContentDiv.style.setProperty(property, value);
                });
                
                // Find markdown-preview-view if it exists
                const previewViewEl = embedContentDiv.querySelector(':scope > .markdown-preview-view');
                if (previewViewEl) {
                    // Apply all CSS variables to the preview view
                    Object.entries(cssVars).forEach(([property, value]) => {
                        previewViewEl.style.setProperty(property, value);
                    });
                }
            }
        }
    }
}


// ----------------------------------------
// -- applyContentStartPosition function --
// ----------------------------------------
const debouncedApplyContentStartPosition = debounceAndSwallow(applyContentStartPosition, 350);
function applyContentStartPosition(plugin, el, contentStartPosition) {
    if (!el) {
        return;
    }
    el.style.setProperty('--pixel-banner-content-start', `${contentStartPosition}px`);
}


// -------------------------------
// -- applyBannerWidth function --
// -------------------------------
const debouncedApplyBannerWidth = debounceAndSwallow(applyBannerWidth, 350);
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


// -------------------------------
// -- updateAllBanners function --
// -------------------------------
const debouncedUpdateAllBanners = debounceAndSwallow(updateAllBanners, 350);
function updateAllBanners(plugin) {
    plugin.app.workspace.iterateAllLeaves(leaf => {
        if (leaf.view.getViewType() === "markdown") {
            updateBanner(plugin, leaf.view, true);
        }
    });
}


// -----------------------------------
// -- updateBannerPosition function --
// -----------------------------------
const debouncedUpdateBannerPosition = debounceAndSwallow(updateBannerPosition, 350);
async function updateBannerPosition(plugin, file, position) {
    if (!file) return;
    
    const metadata = plugin.app.metadataCache.getFileCache(file);
    if (!metadata?.frontmatter) return;

    await plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter.banner_x = position.x;
        frontmatter.banner_y = position.y;
    });
}


// --------------------------------------------
// -- registerMarkdownPostProcessor function --
// --------------------------------------------
function registerMarkdownPostProcessor(plugin) {
  plugin.registerMarkdownPostProcessor((el, ctx) => {
    // Check if in preview view or hover preview
    const isPreview = ctx.containerEl.classList.contains('markdown-preview-view');
    const isHoverPopover = ctx.containerEl.closest('.hover-popover');
    

    
    // Get file path for debouncing
    const debounceFile = ctx.sourcePath ? plugin.app.vault.getAbstractFileByPath(ctx.sourcePath) : null;
    if (debounceFile) {
        const currentTime = Date.now();
        const lastProcessTime = markdownPostProcessorDebounceMap.get(debounceFile.path);
        
        // Skip if we recently processed this file
        if (lastProcessTime && (currentTime - lastProcessTime) < MARKDOWN_PROCESSOR_DEBOUNCE_DELAY) {
            return;
        }
        
        // Update the debounce timestamp
        markdownPostProcessorDebounceMap.set(debounceFile.path, currentTime);
    }

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
      isReadingView: true,
      updateMode: plugin.UPDATE_MODE.FULL_UPDATE
    });
  });
}

export {
    debouncedAddPixelBanner as addPixelBanner,
    debouncedUpdateBanner as updateBanner,
    debouncedApplyBannerSettings as applyBannerSettings,
    debouncedApplyContentStartPosition as applyContentStartPosition,
    debouncedApplyBannerWidth as applyBannerWidth,
    debouncedUpdateAllBanners as updateAllBanners,
    debouncedUpdateBannerPosition as updateBannerPosition,
    registerMarkdownPostProcessor
};