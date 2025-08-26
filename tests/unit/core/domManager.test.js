import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
    setupMutationObserver,
    setupResizeObserver,
    updateFieldVisibility,
    updateEmbeddedTitlesVisibility,
    updateEmbeddedBannersVisibility,
    cleanupPreviousLeaf
} from '@/core/domManager.js';
import { createMockApp, MarkdownView } from 'obsidian';

// Mock DOM globals
global.MutationObserver = vi.fn(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => [])
}));
global.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
}));

describe('domManager', () => {
    let mockPlugin;
    let mockApp;
    let mockView;
    let mockLeaf;
    let mockContentEl;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';
        
        // Create mock content elements
        mockContentEl = document.createElement('div');
        mockContentEl.className = 'view-content';
        
        // Create mock view
        mockView = new MarkdownView();
        mockView.contentEl = mockContentEl;
        mockView.file = { path: 'test.md' };
        
        // Create mock leaf
        mockLeaf = {
            id: 'test-leaf-id',
            view: mockView
        };
        
        // Create mock app
        mockApp = createMockApp();
        mockApp.workspace.activeLeaf = mockLeaf;
        
        // Create mock plugin with required methods and properties
        mockPlugin = {
            app: mockApp,
            settings: {
                customBannerField: ['banner'],
                customYPositionField: ['y-position'],
                customXPositionField: ['x-position'],
                customContentStartField: ['content-start'],
                customImageDisplayField: ['image-display'],
                customImageRepeatField: ['image-repeat'],
                customBannerMaxWidthField: ['banner-max-width'],
                customBannerHeightField: ['banner-height'],
                customBannerAlignmentField: ['banner-alignment'],
                customFadeField: ['fade'],
                customBorderRadiusField: ['border-radius'],
                customTitleColorField: ['title-color'],
                customBannerShuffleField: ['banner-shuffle'],
                customBannerIconField: ['banner-icon'],
                customBannerIconImageField: ['icon-image'],
                customBannerIconImageAlignmentField: ['icon-image-alignment'],
                customBannerIconSizeField: ['icon-size'],
                customBannerIconImageSizeMultiplierField: ['icon-image-size-multiplier'],
                customBannerIconTextVerticalOffsetField: ['icon-text-vertical-offset'],
                customBannerIconRotateField: ['icon-rotate'],
                customBannerIconXPositionField: ['icon-x-position'],
                customBannerIconOpacityField: ['icon-opacity'],
                customBannerIconColorField: ['icon-color'],
                customBannerIconFontWeightField: ['icon-font-weight'],
                customBannerIconBackgroundColorField: ['icon-bg-color'],
                customBannerIconPaddingXField: ['icon-padding-x'],
                customBannerIconPaddingYField: ['icon-padding-y'],
                customBannerIconBorderRadiusField: ['icon-border-radius'],
                customBannerIconVerticalOffsetField: ['icon-vertical-offset'],
                customFlagColorField: ['flag-color'],
                hidePixelBannerFields: true,
                hidePropertiesSectionIfOnlyBanner: false,
                hideEmbeddedNoteTitles: false,
                hideEmbeddedNoteBanners: false
            },
            observer: null,
            loadedImages: new Map(),
            debouncedEnsureBanner: vi.fn(),
            applyBannerWidth: vi.fn(),
            returnIconOverlay: vi.fn(),
            updateFieldVisibility: vi.fn(),
            updateEmbeddedTitlesVisibility: vi.fn(),
            updateEmbeddedBannersVisibility: vi.fn(),
            cleanupPreviousLeaf: vi.fn()
        };

        // Mock MutationObserver
        const mockMutationObserver = vi.fn((callback) => {
            return {
                observe: vi.fn(),
                disconnect: vi.fn(),
                takeRecords: vi.fn(() => [])
            };
        });
        global.MutationObserver = mockMutationObserver;

        // Mock ResizeObserver
        const mockResizeObserver = vi.fn((callback) => {
            return {
                observe: vi.fn(),
                disconnect: vi.fn(),
                unobserve: vi.fn()
            };
        });
        global.ResizeObserver = mockResizeObserver;
    });

    afterEach(() => {
        vi.clearAllMocks();
        // Clean up DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';
    });

    describe('setupMutationObserver', () => {
        it('should create and configure MutationObserver', () => {
            setupMutationObserver.call(mockPlugin);
            
            expect(MutationObserver).toHaveBeenCalledTimes(1);
            expect(mockPlugin.observer).toBeDefined();
            expect(mockPlugin.observer.observe).toHaveBeenCalledWith(document.body, {
                childList: true,
                subtree: true
            });
        });

        it('should handle banner removal mutations', () => {
            const callback = vi.fn();
            MutationObserver.mockImplementation((cb) => {
                callback.mockImplementation(cb);
                return {
                    observe: vi.fn(),
                    disconnect: vi.fn(),
                    takeRecords: vi.fn(() => [])
                };
            });

            setupMutationObserver.call(mockPlugin);

            // Create mock removed node with banner class
            const removedNode = document.createElement('div');
            removedNode.className = 'pixel-banner-image';
            
            const mutations = [{
                type: 'childList',
                removedNodes: [removedNode],
                addedNodes: []
            }];

            callback(mutations);
            expect(mockPlugin.debouncedEnsureBanner).toHaveBeenCalled();
        });

        it('should handle structural change mutations', () => {
            const callback = vi.fn();
            MutationObserver.mockImplementation((cb) => {
                callback.mockImplementation(cb);
                return {
                    observe: vi.fn(),
                    disconnect: vi.fn(),
                    takeRecords: vi.fn(() => [])
                };
            });

            setupMutationObserver.call(mockPlugin);

            // Create mock added node with structural class
            const addedNode = document.createElement('div');
            addedNode.className = 'markdown-preview-section';
            
            const mutations = [{
                type: 'childList',
                removedNodes: [],
                addedNodes: [addedNode]
            }];

            // Add existing banner to content
            const banner = document.createElement('div');
            banner.className = 'pixel-banner-image';
            banner.style.display = 'block';
            mockContentEl.appendChild(banner);

            callback(mutations);
            expect(mockPlugin.debouncedEnsureBanner).toHaveBeenCalled();
        });

        it('should remove pixel-banner class when no banner present', () => {
            const callback = vi.fn();
            MutationObserver.mockImplementation((cb) => {
                callback.mockImplementation(cb);
                return {
                    observe: vi.fn(),
                    disconnect: vi.fn(),
                    takeRecords: vi.fn(() => [])
                };
            });

            setupMutationObserver.call(mockPlugin);
            mockContentEl.classList.add('pixel-banner');

            const removedNode = document.createElement('div');
            removedNode.className = 'pixel-banner-image';
            
            const mutations = [{
                type: 'childList',
                removedNodes: [removedNode],
                addedNodes: []
            }];

            callback(mutations);
            expect(mockContentEl.classList.contains('pixel-banner')).toBe(false);
        });

        it('should ignore non-childList mutations', () => {
            const callback = vi.fn();
            MutationObserver.mockImplementation((cb) => {
                callback.mockImplementation(cb);
                return {
                    observe: vi.fn(),
                    disconnect: vi.fn(),
                    takeRecords: vi.fn(() => [])
                };
            });

            setupMutationObserver.call(mockPlugin);

            const mutations = [{
                type: 'attributes',
                removedNodes: [],
                addedNodes: []
            }];

            callback(mutations);
            expect(mockPlugin.debouncedEnsureBanner).not.toHaveBeenCalled();
        });
    });

    describe('setupResizeObserver', () => {
        it('should create ResizeObserver for view-content elements', () => {
            const viewContent = document.createElement('div');
            viewContent.className = 'view-content';

            setupResizeObserver.call(mockPlugin, viewContent);

            expect(ResizeObserver).toHaveBeenCalledTimes(1);
            expect(viewContent._resizeObserver).toBeDefined();
            expect(viewContent._resizeObserver.observe).toHaveBeenCalledWith(viewContent);
        });

        it('should not create ResizeObserver for non-view-content elements', () => {
            const regularDiv = document.createElement('div');
            regularDiv.className = 'regular-div';

            setupResizeObserver.call(mockPlugin, regularDiv);

            expect(ResizeObserver).not.toHaveBeenCalled();
            expect(regularDiv._resizeObserver).toBeUndefined();
        });

        it('should not create duplicate ResizeObserver', () => {
            const viewContent = document.createElement('div');
            viewContent.className = 'view-content';
            viewContent._resizeObserver = { existing: true };

            setupResizeObserver.call(mockPlugin, viewContent);

            expect(ResizeObserver).not.toHaveBeenCalled();
        });

        it('should call applyBannerWidth on resize with debounce', () => {
            vi.useFakeTimers();
            
            let resizeCallback;
            ResizeObserver.mockImplementation((callback) => {
                resizeCallback = callback;
                return {
                    observe: vi.fn(),
                    disconnect: vi.fn(),
                    unobserve: vi.fn()
                };
            });

            const viewContent = document.createElement('div');
            viewContent.className = 'view-content';

            setupResizeObserver.call(mockPlugin, viewContent);

            // Trigger resize
            resizeCallback();
            
            // Fast-forward past debounce delay
            vi.advanceTimersByTime(100);
            
            expect(mockPlugin.applyBannerWidth).toHaveBeenCalledWith(viewContent);
            
            vi.useRealTimers();
        });
    });

    describe('updateFieldVisibility', () => {
        beforeEach(() => {
            // Bind the method to mockPlugin context
            mockPlugin.updateFieldVisibility = updateFieldVisibility.bind(mockPlugin);
        });

        it('should hide banner fields in preview mode', () => {
            mockView.getMode = vi.fn(() => 'preview');
            
            // Create metadata container with properties
            const metadataContainer = document.createElement('div');
            metadataContainer.className = 'metadata-container';
            
            const property1 = document.createElement('div');
            property1.className = 'metadata-property';
            property1.setAttribute('data-property-key', 'banner');
            
            const property2 = document.createElement('div');
            property2.className = 'metadata-property';
            property2.setAttribute('data-property-key', 'regular-property');
            
            metadataContainer.appendChild(property1);
            metadataContainer.appendChild(property2);
            mockContentEl.appendChild(metadataContainer);

            mockPlugin.updateFieldVisibility(mockView);

            expect(property1.classList.contains('pixel-banner-hidden-field')).toBe(true);
            expect(property2.classList.contains('pixel-banner-hidden-field')).toBe(false);
        });

        it('should hide properties section when only banner fields present', () => {
            mockView.getMode = vi.fn(() => 'preview');
            mockPlugin.settings.hidePropertiesSectionIfOnlyBanner = true;
            
            const metadataContainer = document.createElement('div');
            metadataContainer.className = 'metadata-container';
            
            const bannerProperty = document.createElement('div');
            bannerProperty.className = 'metadata-property';
            bannerProperty.setAttribute('data-property-key', 'banner');
            
            metadataContainer.appendChild(bannerProperty);
            mockContentEl.appendChild(metadataContainer);

            mockPlugin.updateFieldVisibility(mockView);

            expect(metadataContainer.classList.contains('pixel-banner-hidden-section')).toBe(true);
        });

        it('should not hide properties section when mixed fields present', () => {
            mockView.getMode = vi.fn(() => 'preview');
            mockPlugin.settings.hidePropertiesSectionIfOnlyBanner = true;
            
            const metadataContainer = document.createElement('div');
            metadataContainer.className = 'metadata-container';
            
            const bannerProperty = document.createElement('div');
            bannerProperty.className = 'metadata-property';
            bannerProperty.setAttribute('data-property-key', 'banner');
            
            const regularProperty = document.createElement('div');
            regularProperty.className = 'metadata-property';
            regularProperty.setAttribute('data-property-key', 'regular-field');
            
            metadataContainer.appendChild(bannerProperty);
            metadataContainer.appendChild(regularProperty);
            mockContentEl.appendChild(metadataContainer);

            mockPlugin.updateFieldVisibility(mockView);

            expect(metadataContainer.classList.contains('pixel-banner-hidden-section')).toBe(false);
        });

        it('should not hide properties section when hidePixelBannerFields is false', () => {
            mockView.getMode = vi.fn(() => 'preview');
            mockPlugin.settings.hidePropertiesSectionIfOnlyBanner = true;
            mockPlugin.settings.hidePixelBannerFields = false; // This should prevent hiding
            
            const metadataContainer = document.createElement('div');
            metadataContainer.className = 'metadata-container';
            
            const bannerProperty = document.createElement('div');
            bannerProperty.className = 'metadata-property';
            bannerProperty.setAttribute('data-property-key', 'banner');
            
            metadataContainer.appendChild(bannerProperty);
            mockContentEl.appendChild(metadataContainer);

            mockPlugin.updateFieldVisibility(mockView);

            expect(metadataContainer.classList.contains('pixel-banner-hidden-section')).toBe(false);
        });

        it('should return early for non-preview mode', () => {
            mockView.getMode = vi.fn(() => 'edit');
            
            const metadataContainer = document.createElement('div');
            metadataContainer.className = 'metadata-container';
            mockContentEl.appendChild(metadataContainer);

            mockPlugin.updateFieldVisibility(mockView);

            const properties = metadataContainer.querySelectorAll('.pixel-banner-hidden-field');
            expect(properties.length).toBe(0);
        });

        it('should handle missing metadata container gracefully', () => {
            mockView.getMode = vi.fn(() => 'preview');

            expect(() => {
                mockPlugin.updateFieldVisibility(mockView);
            }).not.toThrow();
        });

        it('should handle empty metadata container gracefully', () => {
            mockView.getMode = vi.fn(() => 'preview');
            
            const metadataContainer = document.createElement('div');
            metadataContainer.className = 'metadata-container';
            mockContentEl.appendChild(metadataContainer);

            expect(() => {
                mockPlugin.updateFieldVisibility(mockView);
            }).not.toThrow();
            
            // Should not add hidden section class when no properties exist
            expect(metadataContainer.classList.contains('pixel-banner-hidden-section')).toBe(false);
        });
    });

    describe('updateEmbeddedTitlesVisibility', () => {
        beforeEach(() => {
            mockPlugin.updateEmbeddedTitlesVisibility = updateEmbeddedTitlesVisibility.bind(mockPlugin);
        });

        it('should add style to hide embedded titles when enabled', () => {
            mockPlugin.settings.hideEmbeddedNoteTitles = true;

            mockPlugin.updateEmbeddedTitlesVisibility();

            const styleEl = document.getElementById('pixel-banner-embedded-titles');
            expect(styleEl).toBeTruthy();
            expect(styleEl.textContent).toContain('.embed-title.markdown-embed-title { display: none !important; }');
        });

        it('should remove style when disabled', () => {
            // First add the style
            const existingStyle = document.createElement('style');
            existingStyle.id = 'pixel-banner-embedded-titles';
            document.head.appendChild(existingStyle);

            mockPlugin.settings.hideEmbeddedNoteTitles = false;

            mockPlugin.updateEmbeddedTitlesVisibility();

            const styleEl = document.getElementById('pixel-banner-embedded-titles');
            expect(styleEl).toBeFalsy();
        });

        it('should not create duplicate styles', () => {
            mockPlugin.settings.hideEmbeddedNoteTitles = true;

            // Call twice
            mockPlugin.updateEmbeddedTitlesVisibility();
            mockPlugin.updateEmbeddedTitlesVisibility();

            const styleEls = document.querySelectorAll('#pixel-banner-embedded-titles');
            expect(styleEls.length).toBe(1);
        });
    });

    describe('updateEmbeddedBannersVisibility', () => {
        beforeEach(() => {
            mockPlugin.updateEmbeddedBannersVisibility = updateEmbeddedBannersVisibility.bind(mockPlugin);
        });

        it('should add style to hide embedded banners when enabled', () => {
            mockPlugin.settings.hideEmbeddedNoteBanners = true;

            mockPlugin.updateEmbeddedBannersVisibility();

            const styleEl = document.getElementById('pixel-banner-embedded-banners');
            expect(styleEl).toBeTruthy();
            expect(styleEl.textContent).toContain('.internal-embed .pixel-banner-image');
            expect(styleEl.textContent).toContain('display: none !important');
        });

        it('should remove style when disabled', () => {
            // First add the style
            const existingStyle = document.createElement('style');
            existingStyle.id = 'pixel-banner-embedded-banners';
            document.head.appendChild(existingStyle);

            mockPlugin.settings.hideEmbeddedNoteBanners = false;

            mockPlugin.updateEmbeddedBannersVisibility();

            const styleEl = document.getElementById('pixel-banner-embedded-banners');
            expect(styleEl).toBeFalsy();
        });
    });

    describe('cleanupPreviousLeaf', () => {
        beforeEach(() => {
            mockPlugin.cleanupPreviousLeaf = cleanupPreviousLeaf.bind(mockPlugin);
        });

        it('should remove pixel-banner class from content element', () => {
            mockContentEl.classList.add('pixel-banner');
            
            mockPlugin.cleanupPreviousLeaf(mockLeaf);

            expect(mockContentEl.classList.contains('pixel-banner')).toBe(false);
        });

        it('should clean up banner in cm-sizer container', () => {
            const container = document.createElement('div');
            container.className = 'cm-sizer';
            
            const banner = document.createElement('div');
            banner.className = 'pixel-banner-image';
            banner.style.backgroundImage = 'url(test.jpg)';
            banner.style.display = 'block';
            
            container.appendChild(banner);
            mockContentEl.appendChild(container);
            
            // Mock file path for cleanup
            mockLeaf.view.file = { path: 'test.md' };
            mockPlugin.loadedImages.set('test.md', 'blob:test-url');

            mockPlugin.cleanupPreviousLeaf(mockLeaf);

            expect(banner.style.backgroundImage).toBe('');
            expect(banner.style.display).toBe('none');
        });

        it('should clean up banner in markdown-preview-sizer container', () => {
            const container = document.createElement('div');
            container.className = 'markdown-preview-sizer';
            
            const banner = document.createElement('div');
            banner.className = 'pixel-banner-image';
            banner.style.backgroundImage = 'url(test.jpg)';
            banner.style.display = 'block';
            
            container.appendChild(banner);
            mockContentEl.appendChild(container);

            mockPlugin.cleanupPreviousLeaf(mockLeaf);

            expect(banner.style.backgroundImage).toBe('');
            expect(banner.style.display).toBe('none');
        });

        it('should clean up icon overlays', () => {
            const container = document.createElement('div');
            container.className = 'cm-sizer';
            
            const overlay1 = document.createElement('div');
            overlay1.className = 'banner-icon-overlay';
            
            const overlay2 = document.createElement('div');
            overlay2.className = 'banner-icon-overlay';
            overlay2.dataset.persistent = 'true';
            
            container.appendChild(overlay1);
            container.appendChild(overlay2);
            mockContentEl.appendChild(container);

            mockPlugin.cleanupPreviousLeaf(mockLeaf);

            expect(mockPlugin.returnIconOverlay).toHaveBeenCalledWith(overlay1);
            expect(mockPlugin.returnIconOverlay).not.toHaveBeenCalledWith(overlay2);
        });

        it('should revoke blob URLs from loadedImages', () => {
            const container = document.createElement('div');
            container.className = 'cm-sizer';
            
            const banner = document.createElement('div');
            banner.className = 'pixel-banner-image';
            container.appendChild(banner);
            mockContentEl.appendChild(container);
            
            // Mock blob URL
            const mockBlobUrl = 'blob:http://localhost/test-uuid';
            mockPlugin.loadedImages.set('test.md', mockBlobUrl);
            
            // Mock URL.revokeObjectURL
            global.URL = {
                revokeObjectURL: vi.fn()
            };

            mockPlugin.cleanupPreviousLeaf(mockLeaf);

            expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockBlobUrl);
            expect(mockPlugin.loadedImages.has('test.md')).toBe(false);
        });

        it('should handle missing file gracefully', () => {
            mockLeaf.view.file = null;
            
            expect(() => {
                mockPlugin.cleanupPreviousLeaf(mockLeaf);
            }).not.toThrow();
        });

        it('should handle missing containers gracefully', () => {
            // No containers in contentEl
            expect(() => {
                mockPlugin.cleanupPreviousLeaf(mockLeaf);
            }).not.toThrow();
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle null view in updateFieldVisibility', () => {
            mockPlugin.updateFieldVisibility = updateFieldVisibility.bind(mockPlugin);
            
            expect(() => {
                mockPlugin.updateFieldVisibility(null);
            }).not.toThrow();
        });

        it('should handle missing contentEl in cleanupPreviousLeaf', () => {
            mockPlugin.cleanupPreviousLeaf = cleanupPreviousLeaf.bind(mockPlugin);
            mockLeaf.view.contentEl = null;
            
            expect(() => {
                mockPlugin.cleanupPreviousLeaf(mockLeaf);
            }).not.toThrow();
        });

        it('should handle observer being null in setupMutationObserver', () => {
            mockPlugin.observer = null;
            
            expect(() => {
                setupMutationObserver.call(mockPlugin);
            }).not.toThrow();
        });
    });
});