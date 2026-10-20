import { MarkdownView, Notice } from 'obsidian';
import { ImageViewModal, TargetPositionModal } from '../modal/modals.js';
import { getFrontmatterValue } from '../utils/frontmatterUtils.js';
import { handlePinIconClick } from '../utils/handlePinIconClick.js';
import { flags } from '../resources/flags.js';
import { debounceAndSwallow } from '../utils/debounce.js';
import { releaseVaultImageBlobUrl } from './bannerUtils.js';
import { resolveField } from './fieldRegistry.js';
import { resolveMaxWidth, maxWidthCssValue, getHeaderMode, getIconLayoutVars, getIconOnlyContentStart, resolveHideEmbeddedBanners } from './headerMode.js';

// Debouncing map for updateBanner to prevent concurrent updates, keyed by the
// view's content element (holding { filePath, time, isContentChange,
// isEnsureVisibility }), not the file path alone:
// linked tabs show the same file in two panes and both need their banner (issue #207)
const updateBannerDebounceMap = new WeakMap();
const UPDATE_BANNER_DEBOUNCE_DELAY = 250; // 250ms debounce window

// Supported file extensions constants
const SUPPORTED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'avif'];
const SUPPORTED_MOVIE_EXTENSIONS = ['mp4', 'mov'];
const SUPPORTED_EXTENSIONS = [...SUPPORTED_IMAGE_EXTENSIONS, ...SUPPORTED_MOVIE_EXTENSIONS];

// Classes of the elements we inject as direct children of a sizer, in the order they are kept.
const PERSISTENT_ELEMENT_CLASSES = [
    'pixel-banner-image',
    'banner-icon-overlay',
    'select-image-icon',
    'view-image-icon',
    'pin-icon',
    'refresh-icon'
];

function isPersistentElement(child) {
    return PERSISTENT_ELEMENT_CLASSES.some(cls => child.classList?.contains(cls));
}

// Insert one of our elements after the ones already at the front of the container, so all of
// them sit before Obsidian's own children. They must never trail the note's sections: Obsidian's
// reading view measures a section's height against the next sibling's offsetTop, and our
// absolutely positioned elements report ~0 there. A collapsed heading that is the last rendered
// section then gets a negative height, and later sections are never drawn (issue #315).
function insertPersistentElement(container, el) {
    let ref = container.firstChild;
    while (ref && (ref === el || (ref.nodeType === 1 && isPersistentElement(ref)))) {
        ref = ref.nextSibling;
    }
    container.insertBefore(el, ref);
}

// Override setChildrenInPlace to preserve persistent elements.
// Obsidian rebuilds a container's child list during render reconciliation; without this override
// our banner (a child it doesn't own) gets stripped. We re-inject our elements proactively so they
// never leave the DOM (no flicker), in both reading and editing views. See OBSIDIAN_DOM_LIFECYCLE.md
// §6.5. All of our elements go in front of Obsidian's children (see insertPersistentElement).
// setChildrenInPlace is an undocumented Obsidian internal, so we feature-detect it and fail safe:
// any error inside the override falls back to the original to never break Obsidian's render.
function installPersistentChildrenOverride(container) {
    if (typeof container.setChildrenInPlace !== 'function' || container._hasOverriddenSetChildrenInPlace) {
        return;
    }
    const originalSetChildrenInPlace = container.setChildrenInPlace;
    container.setChildrenInPlace = function(children) {
        try {
            // Find our persistent elements by class, in the order they are kept.
            const ours = PERSISTENT_ELEMENT_CLASSES
                .map(cls => this.querySelector(`:scope > .${cls}`))
                .filter(Boolean);

            // Fast path: nothing of ours present, don't touch the array.
            if (ours.length === 0) {
                return originalSetChildrenInPlace.call(this, children);
            }

            // Filter out any of our elements from the incoming list (defensive against
            // duplicates), then put ours back in front.
            const filtered = Array.from(children).filter(child => !isPersistentElement(child));
            return originalSetChildrenInPlace.call(this, [...ours, ...filtered]);
        } catch (e) {
            console.error('Pixel Banner: setChildrenInPlace override failed; using original', e);
            return originalSetChildrenInPlace.call(this, children);
        }
    };
    container._hasOverriddenSetChildrenInPlace = true;
}


// ------------------------------
// -- set banner video source --
// ------------------------------
// A vault video plays from app://<hash>/..., another origin than the app
// (app://obsidian.md), so it taints any canvas it is drawn on and Export to PDF
// could not print its frame (issue #323). CORS mode keeps it readable. Remote
// videos are left alone: a server without CORS headers would refuse them.
function setBannerVideoSource(videoEl, fileUrl) {
    if (typeof fileUrl === 'string' && fileUrl.startsWith('app://')) {
        videoEl.crossOrigin = 'anonymous';
    }
    videoEl.src = fileUrl;
}

// ----------------------------
// -- set banner background --
// ----------------------------
// Swapping background-image to a URL that is not decoded yet paints the banner
// empty until the image is ready (several frames for a large PNG), which shows as
// a flicker when switching notes, even between notes that use the same image file,
// since each note gets its own blob URL (issue #327). Keep the current image until
// the new one is decoded. A banner showing nothing yet gets its image at once.
function setBannerBackground(bannerDiv, fileUrl) {
    const backgroundImage = `url('${fileUrl}')`;
    bannerDiv._pixelBannerPendingUrl = fileUrl;

    const img = typeof Image === 'function' ? new Image() : null;
    if (!bannerDiv.style.backgroundImage || !img || typeof img.decode !== 'function') {
        bannerDiv.style.backgroundImage = backgroundImage;
        return;
    }

    img.src = fileUrl;
    img.decode().catch(() => {}).then(() => {
        // Skip if a newer update replaced the URL or a cleanup cleared the banner meanwhile
        if (bannerDiv._pixelBannerPendingUrl !== fileUrl || !bannerDiv.style.backgroundImage) {
            return;
        }
        bannerDiv.style.backgroundImage = backgroundImage;
    });
}


// ----------------------
// -- add pixel banner --
// ----------------------
// Resolves to true once the banner shows its image, false when the banner value gave no
// image (updateBanner then falls back to an icon-only header), and undefined when it
// stopped early: no container, or a newer render or a cleanup took the banner over
const debouncedAddPixelBanner = debounceAndSwallow(addPixelBanner, 350);
async function addPixelBanner(plugin, el, ctx) {
    const { frontmatter, file, isContentChange, yPosition, xPosition, contentStartPosition, bannerImage, isReadingView, updateMode } = ctx;
    const viewContent = el;
    const isEmbedded = viewContent.classList.contains('internal-embed') && viewContent.classList.contains('markdown-embed');
    const isHoverPopover = viewContent.closest('.hover-popover') !== null;
    const hideEmbeddedNoteBanners = resolveHideEmbeddedBanners(plugin, frontmatter, plugin.getFolderSpecificImage(file.path));

    // Add pixel-banner class to the appropriate container
    if (!isEmbedded && !isHoverPopover && viewContent.classList.contains('view-content')) {
        // Apply content start position CSS variable immediately so padding-top resolves correctly
        // Include frontmatter override to prevent layout jump for notes with custom content start
        const frontmatterContentStartRaw = getFrontmatterValue(frontmatter, plugin.settings.customContentStartField);
        const initialContentStart = (frontmatterContentStartRaw !== null ? Number(frontmatterContentStartRaw) : null) ?? contentStartPosition ?? plugin.settings.contentStartPosition;
        applyContentStartPosition(plugin, viewContent, initialContentStart);

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
                const maxWidthValue = maxWidthCssValue(resolveMaxWidth(plugin, frontmatter));

                const bannerYPosition = resolveField(plugin, 'yPosition', frontmatter, folderSpecific);
                const bannerXPosition = resolveField(plugin, 'xPosition', frontmatter, folderSpecific);
                const bannerTitleColor = resolveField(plugin, 'titleColor', frontmatter, folderSpecific);
                
                previewViewEl.style.setProperty('--pixel-banner-y-position', `${bannerYPosition}%`);
                previewViewEl.style.setProperty('--pixel-banner-x-position', `${bannerXPosition}%`);
                previewViewEl.style.setProperty('--pixel-banner-max-width', maxWidthValue);
                previewViewEl.style.setProperty('--pixel-banner-title-color', bannerTitleColor);
                
                const bannerIconSize = resolveField(plugin, 'iconSize', frontmatter, folderSpecific);
                const bannerIconXPosition = resolveField(plugin, 'iconXPosition', frontmatter, folderSpecific);
                const bannerIconOpacity = resolveField(plugin, 'iconOpacity', frontmatter, folderSpecific);
                const bannerIconColor = resolveField(plugin, 'iconColor', frontmatter, folderSpecific);
                const bannerIconFontWeight = resolveField(plugin, 'iconFontWeight', frontmatter, folderSpecific);
                const bannerIconBackgroundColor = resolveField(plugin, 'iconBackgroundColor', frontmatter, folderSpecific) ?? 'transparent';
                const bannerIconPaddingX = resolveField(plugin, 'iconPaddingX', frontmatter, folderSpecific);
                const bannerIconPaddingY = resolveField(plugin, 'iconPaddingY', frontmatter, folderSpecific);
                const bannerIconBorderRadius = resolveField(plugin, 'iconBorderRadius', frontmatter, folderSpecific);
                const bannerIconVerticalOffset = resolveField(plugin, 'iconVerticalOffset', frontmatter, folderSpecific);
                const bannerIconRotate = resolveField(plugin, 'iconRotate', frontmatter, folderSpecific);
                const bannerIconImageSizeMultiplier = resolveField(plugin, 'iconImageSizeMultiplier', frontmatter, folderSpecific);
                const bannerIconTextVerticalOffset = resolveField(plugin, 'iconTextVerticalOffset', frontmatter, folderSpecific);
                
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
                const bannerHeight = resolveField(plugin, 'height', frontmatter, folderSpecific);
                const embedMinHeight = `${(parseInt(bannerHeight) + (parseInt(bannerIconSize) / 2))}px`;
                previewViewEl.style.setProperty('--pixel-banner-embed-min-height', embedMinHeight);
                previewViewEl.style.setProperty('--pixel-banner-height', `${bannerHeight}px`);

                // set pixel banner fade
                const bannerFade = resolveField(plugin, 'fade', frontmatter, folderSpecific);
                previewViewEl.style.setProperty('--pixel-banner-fade', `${bannerFade}%`);

                // set pixel banner border radius
                const bannerRadius = resolveField(plugin, 'borderRadius', frontmatter, folderSpecific);
                previewViewEl.style.setProperty('--pixel-banner-radius', `${bannerRadius}px`);

                // set pixel banner alignment
                const bannerAlignment = resolveField(plugin, 'alignment', frontmatter, folderSpecific);
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

    // Claim the banner for this render. The image is fetched asynchronously, and a
    // pane can move to another note meanwhile (whose update may already have run, or
    // hidden the banner), so stop at each await once a newer render or a cleanup
    // (which sets _pixelBannerRender to null) has taken the banner over
    const renderToken = {};
    bannerDiv._pixelBannerRender = renderToken;
    const isStaleRender = () => bannerDiv._pixelBannerRender !== renderToken;

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
            const flagColor = resolveField(plugin, 'flagColor', frontmatter);
            selectImageIcon.innerHTML = `<img src="${flags[flagColor] || flags['red']}" alt="Select Banner" style="width: 25px; height: 30px;">`;
            selectImageIcon._isPersistentSelectImage = true;

            selectImageIcon.onclick = () => plugin.handleBannerIconClick();
            insertPersistentElement(container, selectImageIcon);
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

            insertPersistentElement(container, viewImageIcon);
            leftOffset += 35;
        }

        const activeFile = plugin.app.workspace.getActiveFile();
        const hasBanner = activeFile && plugin.hasBannerFrontmatter(activeFile);
    }

    // 4) Keep our elements through Obsidian's child reconciliation (see installPersistentChildrenOverride)
    installPersistentChildrenOverride(container);

    // Build the banner <video>, replacing any existing one; shared by the first render
    // and the keyword refresh icon so both honour Image Display
    const buildBannerVideo = (bannerDiv, fileUrl, imageDisplay) => {
        const existingVideo = bannerDiv.querySelector('video');
        if (existingVideo) {
            existingVideo.remove();
        }

        const videoEl = document.createElement('video');
        videoEl.className = 'pixel-banner-video';
        setBannerVideoSource(videoEl, fileUrl);
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
    };

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
            if (isStaleRender()) return;
        }

        if (imageUrl) {
            // Display banner
            const imageDisplay = resolveField(plugin, 'imageDisplay', frontmatter, folderSpecific);
            const imageRepeat = resolveField(plugin, 'imageRepeat', frontmatter, folderSpecific);
            
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
                    // A shared vault image URL is dropped from its cache too, so the
                    // fresh request below reads the file again
                    releaseVaultImageBlobUrl(fileUrl);
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
                if (isStaleRender()) return;
            }
            
            // Handle video files (MP4)
            if (isVideoFile) {
                // Clear any background image
                bannerDiv.style.backgroundImage = '';
                
                buildBannerVideo(bannerDiv, fileUrl, imageDisplay);
            } else {
                // Handle as image
                // Remove any existing video element
                const existingVideo = bannerDiv.querySelector('video');
                if (existingVideo) {
                    existingVideo.remove();
                }
                
                // Set the background image (once decoded, so the swap does not flicker)
                setBannerBackground(bannerDiv, fileUrl);

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
            const hideEmbeddedNoteBanners = resolveHideEmbeddedBanners(plugin, frontmatter, folderSpecific);
            
            let effectiveContentStart = 0;
            if (!hideEmbeddedNoteBanners || !isEmbedded) {
                const frontmatterContentStart = getFrontmatterValue(frontmatter, plugin.settings.customContentStartField);
                const parsedFrontmatterStart = frontmatterContentStart ? Number(frontmatterContentStart) : null;
                
                effectiveContentStart = parsedFrontmatterStart ??
                    contentStartPosition ??
                    folderSpecific?.contentStartPosition ??
                    plugin.settings.contentStartPosition;
            }

            // A popover banner is capped (see capPopoverBannerHeight), so pull the content up by
            // the height it lost to keep the gap below the banner
            if (isHoverPopover) {
                const fullHeight = Number(ctx.bannerHeight ?? resolveField(plugin, 'height', frontmatter, folderSpecific));
                const cutHeight = fullHeight - capPopoverBannerHeight(plugin, fullHeight, true);
                if (cutHeight > 0) effectiveContentStart = Math.max(0, effectiveContentStart - cutHeight);
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
                        await handlePinIconClick(imageUrlToPin, plugin, null, null, true, file);
                    } catch (error) {
                        console.error('Error pinning image:', error);
                        new Notice('Failed to pin the image.');
                    }
                };

                insertPersistentElement(container, pinIcon);
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
                        const refreshToken = {};
                        bannerDiv._pixelBannerRender = refreshToken;
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

                                // The pane moved on (or re-rendered) while the image loaded
                                if (bannerDiv._pixelBannerRender !== refreshToken) return;

                                // Update the banner display based on file type
                                if (isVideoFile) {
                                    // Clear background image
                                    bannerDiv.style.backgroundImage = '';
                                    
                                    buildBannerVideo(bannerDiv, fileUrl, resolveField(plugin, 'imageDisplay', frontmatter, folderSpecific));
                                } else {
                                    // It's an image; go through setBannerBackground so a decode
                                    // still pending for the old image cannot put it back
                                    setBannerBackground(bannerDiv, fileUrl);
                                    
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

                    insertPersistentElement(container, refreshIcon);
                }
            }

            return true;
        } else {
            // No final imageUrl => hide banner, and drop its image so it cannot
            // flash while the next note's image decodes (setBannerBackground)
            bannerDiv.style.display = 'none';
            bannerDiv.style.backgroundImage = '';
            plugin.loadedImages.delete(file.path);
            plugin.lastKeywords.delete(file.path);

            if (!isEmbedded) {
                viewContent.classList.remove('pixel-banner');
            }

            return false;
        }
    }
}


// ---------------------------
// -- updateBanner function --
// ---------------------------
// Trailing debounce per pane (content element): a shared one let an update for one
// pane cancel a pending update for another (issue #207). Calls for the same pane
// within the window merge: a content change is kept, and an ENSURE_VISIBILITY
// request never replaces a stronger pending mode (FULL_UPDATE, SHUFFLE_UPDATE).
// Returns a promise that resolves once the merged update has run, so callers can
// await it: false when it threw or was skipped as a repeat (or the view had no
// file, or moved to another note before the update finished), otherwise true. True does not promise an image: a banner value that
// resolves to nothing hides the banner without an error. It never rejects, a
// failed update is logged here instead.
const updateBannerPending = new WeakMap();
function debouncedUpdateBanner(plugin, view, isContentChange = false, updateMode = plugin.UPDATE_MODE.FULL_UPDATE) {
    const key = view?.contentEl || view;
    if (!key || typeof key !== 'object') {
        return Promise.resolve(false);
    }
    const pending = updateBannerPending.get(key);
    const resolvers = pending ? pending.resolvers : [];
    if (pending) {
        clearTimeout(pending.timer);
        isContentChange = isContentChange || pending.isContentChange;
        if (updateMode === plugin.UPDATE_MODE.ENSURE_VISIBILITY) {
            updateMode = pending.updateMode;
        }
    }
    const done = new Promise(resolve => resolvers.push(resolve));
    const timer = setTimeout(() => {
        updateBannerPending.delete(key);
        updateBanner(plugin, view, isContentChange, updateMode)
            .then(result => result !== false, error => {
                console.error('Pixel Banner: banner update failed', error);
                // Let handleLayoutChange try this pane again
                if (view.contentEl && view.contentEl._pixelBannerFilePath === view.file?.path) {
                    delete view.contentEl._pixelBannerFilePath;
                }
                return false;
            })
            .then(ok => resolvers.forEach(resolve => resolve(ok)));
    }, 50);
    updateBannerPending.set(key, { timer, isContentChange, updateMode, resolvers });
    return done;
}
async function updateBanner(plugin, view, isContentChange, updateMode = plugin.UPDATE_MODE.FULL_UPDATE) {
    if (!view || !view.file) {
        return false;
    }

    const filePath = view.file.path;
    const currentTime = Date.now();
    const debounceKey = view.contentEl || view;
    const isEnsureVisibility = updateMode === plugin.UPDATE_MODE.ENSURE_VISIBILITY;

    // Check if we recently updated this file's banner in this pane. A stronger request
    // still runs: a content change after a run without one, or a full update after an
    // ENSURE_VISIBILITY run (the reading-view post-processor's ENSURE run can draw the
    // old cached image just before the metadata "changed" update arrives)
    const lastUpdate = updateBannerDebounceMap.get(debounceKey);
    const isStronger = !!lastUpdate &&
        ((isContentChange && !lastUpdate.isContentChange) ||
            (!isEnsureVisibility && lastUpdate.isEnsureVisibility));
    if (lastUpdate && !isStronger && lastUpdate.filePath === filePath && (currentTime - lastUpdate.time) < UPDATE_BANNER_DEBOUNCE_DELAY) {
        return false;
    }

    // Update the debounce timestamp
    updateBannerDebounceMap.set(debounceKey, { filePath, time: currentTime, isContentChange: !!isContentChange, isEnsureVisibility });

    // Remember which note this pane's banner was rendered for (see handleLayoutChange)
    if (view.contentEl) {
        view.contentEl._pixelBannerFilePath = filePath;
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
    // A note pane gets header modes. The reading-view post processor also passes stand-in views
    // for embeds (contentEl: the embed's .markdown-preview-view); those keep today's path
    const isMainPane = !isEmbedded && contentEl.classList.contains('view-content');

    // Only clean up non-persistent overlays
    const nonPersistentOverlays = viewContent.querySelectorAll('.banner-icon-overlay:not([data-persistent="true"])');
    nonPersistentOverlays.forEach(overlay => overlay.remove());

    // Clean up any duplicate persistent overlays: keep the first one in each sizer, with or
    // without a banner element (icon-only notes have none)
    Object.values(getOverlaySizers(viewContent, isMainPane)).forEach(containerEl => {
        if (containerEl) {
            const allOverlays = containerEl.querySelectorAll(':scope > .banner-icon-overlay[data-persistent="true"]');
            Array.from(allOverlays).slice(1).forEach(overlay => overlay.remove());
        }
    });

    // Get existing banner before trying to use it
    const existingBanner = contentEl.querySelector('.pixel-banner-image');
    
    // Get folder-specific settings first
    const folderSpecific = plugin.getFolderSpecificImage(view.file.path);
    let bannerImage = null;

    // Read the icon before the banner: together they decide the header mode
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

    // Check for banner shuffle path in frontmatter first. Only a folder path can be
    // shuffled: `banner-shuffle: true` names no folder, and a folder group's shuffle is
    // its shuffleFolder, not its enableImageShuffle flag
    const frontmatterShuffle = getFrontmatterValue(frontmatter, plugin.settings.customBannerShuffleField);
    const shufflePath = (typeof frontmatterShuffle === 'string' && frontmatterShuffle.trim()) ||
        (folderSpecific?.enableImageShuffle && folderSpecific.shuffleFolder) || null;
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
    
    // A main pane's layout is set from its header mode once the banner is processed (below)
    if (isEmbedded && !bannerImage) {
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

    let imageDisplay = resolveField(plugin, 'imageDisplay', frontmatter, folderSpecific);
    let imageRepeat = resolveField(plugin, 'imageRepeat', frontmatter, folderSpecific);
    let bannerHeight = resolveField(plugin, 'height', frontmatter, folderSpecific);
    let fade = resolveField(plugin, 'fade', frontmatter, folderSpecific);
    let borderRadius = resolveField(plugin, 'borderRadius', frontmatter, folderSpecific);
    let maxWidth = resolveMaxWidth(plugin, frontmatter);

    // Process this note's banner if it exists
    let imageShown;
    if (bannerImage) {
        imageShown = await addPixelBanner(plugin, contentEl, {
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
        // The pane may have moved to another note while the image loaded (addPixelBanner
        // then stops early). Stop too, so this note's icon is not drawn on the note
        // the pane now shows; its own update draws that one
        if (view.file?.path !== filePath) {
            return false;
        }
    } else if (existingBanner && !isMainPane) {
        // (a main pane's banners are hidden by clearHeaderLayout, in its own sizers only)
        existingBanner._pixelBannerRender = null;
        existingBanner.style.display = 'none';
    }

    // Header mode for main panes (embeds keep their own path): a banner, an icon-only header
    // (no banner value, or one that gave no image) or nothing. Clear the other modes' leftovers
    let headerMode = null;
    if (isMainPane) {
        headerMode = getHeaderMode({
            hasBannerSource: !!bannerImage,
            imageFailed: imageShown === false,
            icon: bannerIcon,
            iconImage: bannerIconImage
        });
        clearHeaderLayout(contentEl, headerMode);
        if (headerMode === 'icon-only') {
            applyIconOnlyLayout(plugin, contentEl, { frontmatter, folderSpecific });
        }
    }

    // An embedded note with an icon and no banner gets a compact icon-only header, unless embedded
    // note banners are hidden: then it keeps the 1% / 0 values set above (or its hidden banner's)
    let embedIconOnly = false;
    if (isEmbedded) {
        const hideEmbeddedNoteBanners = resolveHideEmbeddedBanners(plugin, frontmatter, folderSpecific);
        embedIconOnly = !hideEmbeddedNoteBanners && getHeaderMode({
            hasBannerSource: !!bannerImage,
            imageFailed: imageShown === false,
            icon: bannerIcon,
            iconImage: bannerIconImage
        }) === 'icon-only';
        applyEmbedIconOnlyLayout(plugin, contentEl, { iconOnly: embedIconOnly, frontmatter, folderSpecific });
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
                const flagColor = resolveField(plugin, 'flagColor', frontmatter);
                selectImageIcon.innerHTML = `<img src="${flags[flagColor] || flags['red']}" alt="Select Banner" style="width: 25px; height: 30px;">`;
                selectImageIcon._isPersistentSelectImage = true;
                selectImageIcon.onclick = () => plugin.handleBannerIconClick();
                insertPersistentElement(container, selectImageIcon);
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
            const { preview: previewContainer, source: sourceContainer } = getOverlaySizers(contentEl, isMainPane);

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

        // Function to create or update the icon overlay in a sizer. It needs no banner element
        // (icon-only notes have none) and carries no inline styles: it reads the
        // --pixel-banner-icon-* variables set on the view
        const createOrUpdateIconOverlay = async (sizer, viewType) => {
            if (!sizer) {
                return;
            }

            // Get current icon state
            const currentIconState = {
                icon: cleanIcon,
                iconImage: typeof bannerIconImage === 'string' ? bannerIconImage.trim() : '',
                size: resolveField(plugin, 'iconSize', frontmatter, folderSpecific),
                xPosition: resolveField(plugin, 'iconXPosition', frontmatter, folderSpecific),
                opacity: resolveField(plugin, 'iconOpacity', frontmatter, folderSpecific),
                color: resolveField(plugin, 'iconColor', frontmatter, folderSpecific),
                fontWeight: resolveField(plugin, 'iconFontWeight', frontmatter, folderSpecific),
                backgroundColor: resolveField(plugin, 'iconBackgroundColor', frontmatter, folderSpecific) ?? 'transparent',
                paddingX: resolveField(plugin, 'iconPaddingX', frontmatter, folderSpecific),
                paddingY: resolveField(plugin, 'iconPaddingY', frontmatter, folderSpecific),
                borderRadius: resolveField(plugin, 'iconBorderRadius', frontmatter, folderSpecific),
                verticalOffset: resolveField(plugin, 'iconVerticalOffset', frontmatter, folderSpecific),
                imageAlignment: resolveField(plugin, 'iconImageAlignment', frontmatter, folderSpecific),
                viewType
            };

            // Check if we already have a persistent icon overlay
            const existingOverlay = sizer.querySelector(':scope > .banner-icon-overlay[data-persistent="true"]');

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
            bannerIconOverlay._pixelBannerIconState = currentIconState;

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
                            const mdPath = plugin.getPathFromMarkdownImage(bannerIconImage, view.file.path);
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

            // In front of Obsidian's children, after the banner when there is one (issue #315).
            // An icon-only sizer never went through addPixelBanner, so it may not keep our
            // elements through Obsidian's child reconciliation yet
            installPersistentChildrenOverride(sizer);
            insertPersistentElement(sizer, bannerIconOverlay);
            return bannerIconOverlay;
        };

        // For embedded notes, only apply to preview view
        if (isEmbedded) {
            const embedContainer = contentEl.querySelector('.markdown-preview-sizer') ||
                                    contentEl.querySelector('.markdown-embed-content') ||
                                    contentEl;
            // An embed's icon sits next to its banner, or alone in an icon-only header
            if (embedIconOnly || embedContainer.querySelector(':scope > .pixel-banner-image')) {
                await createOrUpdateIconOverlay(embedContainer, 'preview');
            }
        } else {
            // For main notes, apply to both views. An icon-only header shows in both; a banner
            // note's icon only next to a banner, as before (the other view's banner and its icon
            // variables arrive when that view renders), so drop an overlay left there
            const sizers = getOverlaySizers(contentEl, isMainPane);
            for (const [sizer, viewType] of [[sizers.preview, 'preview'], [sizers.source, 'source']]) {
                if (!sizer) continue;
                if (headerMode === 'icon-only' || sizer.querySelector(':scope > .pixel-banner-image')) {
                    await createOrUpdateIconOverlay(sizer, viewType);
                } else if (isMainPane) {
                    sizer.querySelectorAll(':scope > .banner-icon-overlay[data-persistent="true"]').forEach(overlay => {
                        plugin.returnIconOverlay(overlay);
                        overlay.remove();
                    });
                }
            }
        }
    }
}


// The main pane's reading and editing view elements, which carry the header's CSS variables
// like the pane itself (embeds are not matched)
function getMainViewEls(contentEl) {
    return [
        contentEl.querySelector(':scope > .markdown-reading-view > .markdown-preview-view'),
        contentEl.querySelector(':scope > .markdown-source-view')
    ].filter(Boolean);
}

// The main pane's own sizers. Scoped to its views: in editing view the source view comes first
// and an embedded note in live preview has a .markdown-preview-sizer of its own, which a plain
// querySelector would find before the reading view's
function getMainSizers(contentEl) {
    return {
        preview: contentEl.querySelector(':scope > .markdown-reading-view .markdown-preview-sizer'),
        source: contentEl.querySelector(':scope > .markdown-source-view .cm-sizer')
    };
}

// The sizers that hold a view's icon overlay: the main pane's own, or, for the stand-in views the
// reading-view post processor passes for embeds, the first ones found, as before
function getOverlaySizers(contentEl, isMainPane) {
    if (isMainPane) return getMainSizers(contentEl);
    return {
        preview: contentEl.querySelector('div.markdown-preview-sizer'),
        source: contentEl.querySelector('div.cm-sizer')
    };
}


// ----------------------------------
// -- applyIconOnlyLayout function --
// ----------------------------------
// A main pane whose note shows an icon and no banner (issues #322, #238): a compact header
// sized from the icon settings, the same in a fresh pane and in one that showed another note
function applyIconOnlyLayout(plugin, contentEl, { frontmatter, folderSpecific }) {
    contentEl.classList.add('pixel-banner-icon-only');
    contentEl.classList.remove('pixel-banner');

    const cssVars = {
        ...getIconLayoutVars(plugin, frontmatter, folderSpecific, { mode: 'icon-only' }),
        '--pixel-banner-content-start': `${getIconOnlyContentStart(plugin, frontmatter, folderSpecific)}px`
    };
    [contentEl, ...getMainViewEls(contentEl)].forEach(el => el.setCssProps(cssVars));

    // --pixel-banner-width caps the overlay's max-width. Unthrottled: the shared 350 ms throttle of
    // plugin.applyBannerWidth would drop this write when another pane set its width just before
    applyBannerWidth(plugin, contentEl);
    plugin.setupResizeObserver(contentEl);
}


// ----------------------------------------
// -- applyEmbedIconOnlyLayout function --
// ----------------------------------------
// The embedded counterpart of applyIconOnlyLayout: the icon variables go on the embed's preview
// view, and the content start and min height (the header's height) on the embed, where banner
// embeds keep them. Called for every embed, so one that stopped being icon-only is cleared
function applyEmbedIconOnlyLayout(plugin, embedRoot, { iconOnly, frontmatter, folderSpecific }) {
    embedRoot.classList.toggle('pixel-banner-icon-only', iconOnly);
    if (!iconOnly) return;

    // A banner that gave no image leaves its element and class behind
    embedRoot.classList.remove('pixel-banner');
    const sizer = embedRoot.querySelector('.markdown-preview-sizer');
    const failedBanner = sizer?.querySelector(':scope > .pixel-banner-image');
    if (failedBanner) {
        failedBanner._pixelBannerRender = null;
        failedBanner.style.display = 'none';
    }

    const contentStart = `${getIconOnlyContentStart(plugin, frontmatter, folderSpecific)}px`;
    // A banner render wrote the content start and min height on the preview view too, where they
    // would shadow the embed's own
    embedRoot.querySelector(':scope > .markdown-embed-content > .markdown-preview-view')
        ?.setCssProps({
            ...getIconLayoutVars(plugin, frontmatter, folderSpecific, { mode: 'icon-only' }),
            '--pixel-banner-content-start': contentStart,
            '--pixel-banner-embed-min-height': contentStart
        });
    embedRoot.setCssProps({
        '--pixel-banner-content-start': contentStart,
        '--pixel-banner-embed-min-height': contentStart
    });
}


// --------------------------------
// -- clearHeaderLayout function --
// --------------------------------
// Clear what other header modes left on a main pane, so switching notes in one pane looks like
// a fresh render of the new note
function clearHeaderLayout(contentEl, mode) {
    const isHeaderVar = name => name.startsWith('--pixel-banner-icon-') || name === '--pixel-banner-content-start';
    const removeVars = (el, test) => Array.from(el.style).filter(test).forEach(name => el.style.removeProperty(name));

    if (mode !== 'icon-only') {
        contentEl.classList.remove('pixel-banner-icon-only');
    }

    // A banner after an icon-only note: banner mode writes the icon variables on the banner and
    // its view and the content start on the pane, so icon-only values left on the pane (icon
    // variables) or on a view (content start, and icon variables the banner render did not
    // replace, still translate-y 0%) would shadow them
    if (mode === 'banner') {
        removeVars(contentEl, name => name.startsWith('--pixel-banner-icon-'));
        getMainViewEls(contentEl).forEach(el => {
            const isIconOnlyStyled = el.style.getPropertyValue('--pixel-banner-icon-translate-y') === '0%';
            removeVars(el, name => name === '--pixel-banner-content-start' ||
                (isIconOnlyStyled && name.startsWith('--pixel-banner-icon-')));
        });
    }

    if (mode !== 'banner') {
        contentEl.classList.remove('pixel-banner');

        // cleanup padding-top from preview & source sizers, and hide their banners (the pane's
        // own only: an embedded note keeps its banner)
        Object.values(getMainSizers(contentEl)).forEach(sizer => {
            if (!sizer) return;
            // Remove only the 'padding-top' inline style from the sizer
            sizer.style.removeProperty('padding-top');

            const existingBanner = sizer.querySelector(':scope > .pixel-banner-image');
            if (existingBanner) {
                // A fetch still running for the previous note must not show its image here
                existingBanner._pixelBannerRender = null;
                existingBanner.style.backgroundImage = '';
                existingBanner.style.display = 'none';
            }
        });
    }

    if (mode === 'none') {
        [contentEl, ...getMainViewEls(contentEl)].forEach(el => removeVars(el, isHeaderVar));
    }
}


// Hover popovers cap the banner height at the Popover Banner Max Height setting
// (issue #342); a banner already shorter than the cap is left alone
function capPopoverBannerHeight(plugin, bannerHeight, isHoverPopover) {
    const maxHeight = Number(plugin.settings.popoverBannerMaxHeight);
    if (!isHoverPopover || !Number.isFinite(maxHeight) || isNaN(Number(bannerHeight))) return bannerHeight;
    return Math.min(Number(bannerHeight), maxHeight);
}


// ----------------------------------
// -- applyBannerSettings function --
// ----------------------------------
// Not throttled: it only sets CSS variables, so a repeat call is harmless, and a
// shared throttle dropped the call for a second banner rendered within 350ms of
// another, leaving it with default fade and icon position (issue #333)
function applyBannerSettings(plugin, bannerDiv, ctx, isEmbedded) {
    // console.log('🔍 Applying banner settings');
    const { frontmatter, imageDisplay, imageRepeat, maxWidth } = ctx;
    const folderSpecific = plugin.getFolderSpecificImage(ctx.file.path);

    // The markdown post-processors (reading view, hover popovers) pass no height, fade
    // or radius; resolve them like updateBanner does instead of writing "undefinedpx",
    // which is invalid at computed-value time and drops the CSS fallbacks
    const isHoverPopover = bannerDiv.closest?.('.hover-popover') != null;
    const bannerHeight = capPopoverBannerHeight(plugin, ctx.bannerHeight ?? resolveField(plugin, 'height', frontmatter, folderSpecific), isHoverPopover);
    const fade = ctx.fade ?? resolveField(plugin, 'fade', frontmatter, folderSpecific);
    const borderRadius = ctx.borderRadius ?? resolveField(plugin, 'borderRadius', frontmatter, folderSpecific);
    
    // Get pixel banner y position
    let pixelBannerYPosition = resolveField(plugin, 'yPosition', frontmatter, folderSpecific);
    
    // Get pixel banner x position
    let pixelBannerXPosition = resolveField(plugin, 'xPosition', frontmatter, folderSpecific);

    // Get pixel banner max width: a pixel value, unset, or the readable line length (issue #267)
    const pixelBannerMaxWidth = maxWidthCssValue(resolveMaxWidth(plugin, frontmatter));

    // Get title color from frontmatter, folder settings, or default
    const titleColor = resolveField(plugin, 'titleColor', frontmatter, folderSpecific);

    // The banner-icon values the embed min height needs; every icon variable comes from getIconLayoutVars
    const bannerIconSize = resolveField(plugin, 'iconSize', frontmatter, folderSpecific);
    const bannerIconPaddingY = resolveField(plugin, 'iconPaddingY', frontmatter, folderSpecific);
    const bannerIconVerticalOffset = resolveField(plugin, 'iconVerticalOffset', frontmatter, folderSpecific);

    // Get hide embedded note banners setting
    const hideEmbeddedNoteBanners = resolveHideEmbeddedBanners(plugin, frontmatter, folderSpecific);

    // Get banner alignment
    const bannerAlignment = resolveField(plugin, 'alignment', frontmatter, folderSpecific);
    
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
        '--pixel-banner-max-width': pixelBannerMaxWidth,
        '--pixel-banner-y-position': `${pixelBannerYPosition}%`,
        '--pixel-banner-x-position': `${pixelBannerXPosition}%`,
        '--pixel-banner-title-color': titleColor,
        ...getIconLayoutVars(plugin, frontmatter, folderSpecific, { mode: 'banner', bannerHeight }),
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

    // Switch off the focal point slide when the setting is off (issue #226). On the
    // banner element, not document.body, so pop-out windows get it too
    bannerDiv.classList.toggle('pixel-banner-no-position-transition', plugin.settings.bannerPositionTransition === false);

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
            // The per-pane debounced entry point: it merges with an update already
            // pending for the pane and never rejects
            debouncedUpdateBanner(plugin, leaf.view, true);
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


export {
    debouncedAddPixelBanner as addPixelBanner,
    debouncedUpdateBanner as updateBanner,
    applyBannerSettings,
    debouncedApplyContentStartPosition as applyContentStartPosition,
    debouncedApplyBannerWidth as applyBannerWidth,
    debouncedUpdateAllBanners as updateAllBanners,
    debouncedUpdateBannerPosition as updateBannerPosition,
    insertPersistentElement,
    setBannerBackground,
    setBannerVideoSource,
    installPersistentChildrenOverride
};