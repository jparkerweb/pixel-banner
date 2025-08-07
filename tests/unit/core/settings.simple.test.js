import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockApp, MarkdownView } from 'obsidian';

// Mock the DEFAULT_SETTINGS module before importing
vi.mock('@/settings/settings.js', () => ({
    DEFAULT_SETTINGS: {
        showSelectImageIcon: true,
        bannerMaxWidth: 100,
        yPosition: 50,
        contentStartPosition: 150,
        imageDisplay: 'cover',
        imageRepeat: false,
        bannerHeight: 350,
        fade: 0,
        bannerFadeInAnimationDuration: 300,
        borderRadius: 0,
        bannerGap: 0,
        titleColor: 'var(--text-normal)',
        hideEmbeddedNoteTitles: false,
        hideEmbeddedNoteBanners: false,
        showBannerInPopoverPreviews: true,
        showViewImageIcon: true,
        imagePropertyFormat: '![[image]]',
        hidePixelBannerFields: false,
        hidePropertiesSectionIfOnlyBanner: false,
        bannerIconSize: 24,
        bannerIconXPosition: 50,
        bannerIconOpacity: 100,
        bannerIconColor: 'var(--text-normal)',
        bannerIconFontWeight: 'normal',
        bannerIconBackgroundColor: 'transparent',
        bannerIconPaddingX: 0,
        bannerIconPaddingY: 0,
        bannerIconBorderRadius: 0,
        bannerIconVeritalOffset: 0,
        showReleaseNotes: true,
        folderImages: [],
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
        customBannerIconVeritalOffsetField: ['icon-vertical-offset'],
        customFlagColorField: ['flag-color']
    }
}));

import { loadSettings, saveSettings } from '@/core/settings.js';

// Define test DEFAULT_SETTINGS locally to avoid import issues
const DEFAULT_SETTINGS = {
    showSelectImageIcon: true,
    bannerMaxWidth: 100,
    yPosition: 50,
    contentStartPosition: 150,
    imageDisplay: 'cover',
    imageRepeat: false,
    bannerHeight: 350,
    fade: 0,
    bannerFadeInAnimationDuration: 300,
    borderRadius: 0,
    bannerGap: 0,
    titleColor: 'var(--text-normal)',
    hideEmbeddedNoteTitles: false,
    hideEmbeddedNoteBanners: false,
    showBannerInPopoverPreviews: true,
    showViewImageIcon: true,
    imagePropertyFormat: '![[image]]',
    hidePixelBannerFields: false,
    hidePropertiesSectionIfOnlyBanner: false,
    bannerIconSize: 24,
    bannerIconXPosition: 50,
    bannerIconOpacity: 100,
    bannerIconColor: 'var(--text-normal)',
    bannerIconFontWeight: 'normal',
    bannerIconBackgroundColor: 'transparent',
    bannerIconPaddingX: 0,
    bannerIconPaddingY: 0,
    bannerIconBorderRadius: 0,
    bannerIconVeritalOffset: 0,
    showReleaseNotes: true,
    folderImages: [],
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
    customBannerIconVeritalOffsetField: ['icon-vertical-offset'],
    customFlagColorField: ['flag-color']
};

describe('settings (simplified)', () => {
    let mockPlugin;
    let mockApp;
    let mockView;
    let mockLeaf;

    beforeEach(() => {
        // Create mock view and leaf
        mockView = new MarkdownView();
        mockView.contentEl = document.createElement('div');
        mockLeaf = {
            id: 'test-leaf',
            view: mockView
        };
        
        // Create mock app
        mockApp = createMockApp();
        mockApp.workspace.iterateAllLeaves = vi.fn((callback) => {
            callback(mockLeaf);
        });
        
        // Create mock plugin
        mockPlugin = {
            app: mockApp,
            settings: {},
            loadData: vi.fn(() => Promise.resolve({})),
            saveData: vi.fn(() => Promise.resolve()),
            loadedImages: new Map(),
            lastKeywords: new Map(),
            imageCache: new Map(),
            updateBanner: vi.fn(() => Promise.resolve()),
            updateFieldVisibility: vi.fn()
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('loadSettings', () => {
        it('should merge loaded data with default settings', async () => {
            const savedData = {
                showSelectImageIcon: false,
                bannerHeight: 400,
                customBannerField: ['custom-banner']
            };
            
            mockPlugin.loadData.mockResolvedValue(savedData);
            
            await loadSettings(mockPlugin);
            
            expect(mockPlugin.settings.showSelectImageIcon).toBe(false);
            expect(mockPlugin.settings.bannerHeight).toBe(400);
            expect(mockPlugin.settings.customBannerField).toEqual(['custom-banner']);
            // Should still have default values for unspecified settings
            expect(mockPlugin.settings.bannerMaxWidth).toBe(DEFAULT_SETTINGS.bannerMaxWidth);
        });

        it('should use default settings when no saved data', async () => {
            mockPlugin.loadData.mockResolvedValue(null);
            
            await loadSettings(mockPlugin);
            
            expect(mockPlugin.settings).toEqual(DEFAULT_SETTINGS);
        });

        it('should ensure folderImages is always an array', async () => {
            const savedData = {
                folderImages: null
            };
            
            mockPlugin.loadData.mockResolvedValue(savedData);
            
            await loadSettings(mockPlugin);
            
            expect(Array.isArray(mockPlugin.settings.folderImages)).toBe(true);
            expect(mockPlugin.settings.folderImages.length).toBe(0);
        });
    });

    describe('saveSettings', () => {
        beforeEach(() => {
            mockPlugin.settings = { ...DEFAULT_SETTINGS };
        });

        it('should save plugin data', async () => {
            await saveSettings(mockPlugin);
            
            expect(mockPlugin.saveData).toHaveBeenCalledWith(mockPlugin.settings);
        });

        it('should clear caches after saving', async () => {
            mockPlugin.loadedImages.set('test1', 'url1');
            mockPlugin.lastKeywords.set('test2', 'keywords');
            mockPlugin.imageCache.set('test3', 'data');
            
            await saveSettings(mockPlugin);
            
            expect(mockPlugin.loadedImages.size).toBe(0);
            expect(mockPlugin.lastKeywords.size).toBe(0);
            expect(mockPlugin.imageCache.size).toBe(0);
        });

        it('should update banners for markdown views', async () => {
            const view1 = new MarkdownView();
            const view2 = new MarkdownView();
            const view3 = { getViewType: () => 'file-explorer' }; // Non-markdown view
            
            const leaf1 = { view: view1 };
            const leaf2 = { view: view2 };
            const leaf3 = { view: view3 };
            
            mockApp.workspace.iterateAllLeaves = vi.fn((callback) => {
                callback(leaf1);
                callback(leaf2);
                callback(leaf3);
            });
            
            await saveSettings(mockPlugin);
            
            expect(mockPlugin.updateBanner).toHaveBeenCalledTimes(2); // Only markdown views
            expect(mockPlugin.updateBanner).toHaveBeenCalledWith(view1, true);
            expect(mockPlugin.updateBanner).toHaveBeenCalledWith(view2, true);
        });
    });
});