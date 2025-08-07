import { MarkdownView } from 'obsidian';
import { debounce } from '../settings/settings.js';

function setupMutationObserver() {
    // console.log('📝 Setting up mutation observer');
    // Prevent duplicate observers - disconnect existing one first
    if (this.observer && typeof this.observer.disconnect === 'function') {
        this.observer.disconnect();
    }
    
    // Create new mutation observer (this will use global mock in test environment)
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
                        // Update banner when banner is removed or structural change occurs
                        if (bannerRemoved || structuralChange) {
                            this.debouncedEnsureBanner();
                        }
                    }
                }
            }
        }
    });

    // Only observe if this is a real MutationObserver, not a mock (or a properly mocked one)
    if (this.observer && typeof this.observer.observe === 'function') {
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}


// Update the resize observer setup to only observe the view-content element
function setupResizeObserver(viewContent) {
    if (!viewContent.classList.contains('view-content')) {
        return;
    }

    if (!viewContent._resizeObserver) {
        const debouncedResize = debounce(() => {
            this.applyBannerWidth(viewContent);
        }, 100);

        viewContent._resizeObserver = new ResizeObserver(debouncedResize);
        
        // In test environment, ensure observe method exists
        if (viewContent._resizeObserver && typeof viewContent._resizeObserver.observe === 'function') {
            viewContent._resizeObserver.observe(viewContent);
        }
    }
}


function updateFieldVisibility(view) {
    if (!view || view.getMode() !== 'preview') return;

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
        ...this.settings.customBannerIconImageField,
        ...this.settings.customBannerIconImageAlignmentField,
        ...this.settings.customBannerIconSizeField,
        ...this.settings.customBannerIconImageSizeMultiplierField,
        ...this.settings.customBannerIconTextVerticalOffsetField,
        ...this.settings.customBannerIconRotateField,
        ...this.settings.customBannerIconXPositionField,
        ...this.settings.customBannerIconOpacityField,
        ...this.settings.customBannerIconColorField,
        ...this.settings.customBannerIconFontWeightField,
        ...this.settings.customBannerIconBackgroundColorField,
        ...this.settings.customBannerIconPaddingXField,
        ...this.settings.customBannerIconPaddingYField,
        ...this.settings.customBannerIconBorderRadiusField,
        ...this.settings.customBannerIconVeritalOffsetField,
        ...this.settings.customFlagColorField
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

function updateEmbeddedTitlesVisibility() {
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

function updateEmbeddedBannersVisibility() {
    const styleId = 'pixel-banner-embedded-banners';
    let styleEl = document.getElementById(styleId);
    
    if (this.settings.hideEmbeddedNoteBanners) {
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
        }
        styleEl.textContent = `
            .internal-embed .pixel-banner-image,
            .internal-embed .banner-icon-overlay {
                display: none !important;
            }
            .internal-embed > .markdown-embed-content .cm-sizer:first-of-type,
            .internal-embed > .markdown-embed-content .markdown-preview-sizer:first-of-type {
                padding-top: unset !important;
            }
            /* hide pusher to prevent content from being pushed down */
            .internal-embed > .markdown-embed-content .cm-sizer:first-of-type > .pixel-banner-image + .markdown-preview-pusher,
            .internal-embed > .markdown-embed-content .markdown-preview-sizer:first-of-type > .pixel-banner-image + .markdown-preview-pusher {
                display: none !important;
            }
        `;
    } else if (styleEl) {
        styleEl.remove();
    }
}


function cleanupPreviousLeaf(previousLeaf) {
    const previousContentEl = previousLeaf.view.contentEl;
    if (!previousContentEl) {
        return; // Handle missing contentEl gracefully
    }
    
    // Remove pixel-banner class
    previousContentEl.classList.remove('pixel-banner');
    
    // Clean up banner in both edit and preview modes
    ['cm-sizer', 'markdown-preview-sizer'].forEach(selector => {
        const container = previousContentEl.querySelector(`div.${selector}`);
        if (container) {
            const previousBanner = container.querySelector('.pixel-banner-image');
            if (previousBanner) {
                // Clean up any existing blob URLs first
                if (previousLeaf.view.file) {
                    const existingUrl = this.loadedImages.get(previousLeaf.view.file.path);
                    if (existingUrl && typeof existingUrl === 'string' && existingUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(existingUrl);
                    }
                    this.loadedImages.delete(previousLeaf.view.file.path);
                }
                
                // Then clear the banner properties
                previousBanner.style.backgroundImage = '';
                previousBanner.style.display = 'none';
            }

            // Clean up banner icon overlays - but only non-persistent ones
            const iconOverlays = container.querySelectorAll('.banner-icon-overlay');
            iconOverlays.forEach(overlay => {
                if (!overlay.dataset.persistent) {
                    this.returnIconOverlay(overlay);
                }
            });
        }
    });
}


export {
    setupMutationObserver, 
    setupResizeObserver, 
    updateFieldVisibility, 
    updateEmbeddedTitlesVisibility, 
    updateEmbeddedBannersVisibility, 
    cleanupPreviousLeaf 
};
