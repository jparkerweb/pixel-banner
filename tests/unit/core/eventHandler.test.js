import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
    handleActiveLeafChange,
    handleLayoutChange,
    handleModeChange,
    handleSelectImage,
    handleBannerIconClick,
    handleOpenStore
} from '@/core/eventHandler.js';
import { createMockApp, MarkdownView, TFile, Notice } from 'obsidian';
import { ImageSelectionModal, SelectPixelBannerModal, PixelBannerStoreModal } from '@/modal/modals.js';

// Mock Notice constructor properly
vi.mock('obsidian', async () => {
    const actual = await vi.importActual('obsidian');
    return {
        ...actual,
        Notice: vi.fn()
    };
});

// Mock the modals
vi.mock('@/modal/modals.js', () => {
    const mockOpen = vi.fn();
    
    return {
        ImageSelectionModal: vi.fn(function(app, plugin, callback, defaultPath) {
            this.app = app;
            this.plugin = plugin;
            this.callback = callback;
            this.defaultPath = defaultPath;
            this.open = mockOpen.mockImplementation(() => {
                // Immediately simulate selecting an image when open is called
                const mockSelectedFile = { path: 'test-image.jpg', name: 'test-image.jpg' };
                if (callback) callback(mockSelectedFile);
                return this;
            });
            return this;
        }),
        SelectPixelBannerModal: vi.fn(function(app, plugin) {
            this.app = app;
            this.plugin = plugin;
            this.open = mockOpen.mockReturnValue(this);
            return this;
        }),
        PixelBannerStoreModal: vi.fn(function(app, plugin) {
            this.app = app;
            this.plugin = plugin;
            this.open = mockOpen.mockReturnValue(this);
            return this;
        })
    };
});

// Mock DOM globals

describe('eventHandler', () => {
    let mockPlugin;
    let mockApp;
    let mockView;
    let mockLeaf;
    let mockFile;
    let mockContentEl;
    let currentTime;

    beforeEach(() => {
        // Setup fake timers for debouncing
        vi.useFakeTimers();
        
        // Mock Date.now to work with fake timers for debounce functions
        // Start with a high value to avoid debounce conflicts
        currentTime = 1000000;
        const mockDateNow = vi.fn(() => currentTime);
        global.Date.now = mockDateNow;
        
        // Reset DOM
        document.body.innerHTML = '';
        
        // Clear debounce map to ensure clean test state
        // Note: debounce map is internal to the module, so we can't directly clear it
        // This will be addressed when fixing the debouncing logic
        
        // Create mock file with unique path to avoid debounce conflicts
        mockFile = new TFile(`test-${currentTime}-${Math.random()}.md`);
        
        // Create mock content elements
        mockContentEl = document.createElement('div');
        mockContentEl.className = 'view-content';
        
        // Create mock view
        mockView = new MarkdownView();
        mockView.contentEl = mockContentEl;
        mockView.file = mockFile;
        mockView.getMode = vi.fn(() => 'preview');
        
        // Create mock leaf
        mockLeaf = {
            id: 'test-leaf-id',
            view: mockView
        };
        
        // Create mock app
        mockApp = createMockApp();
        mockApp.workspace.activeLeaf = mockLeaf;
        mockApp.workspace.getActiveFile = vi.fn(() => mockFile);
        mockApp.workspace.getActiveViewOfType = vi.fn(() => mockView);
        mockApp.workspace.getLeavesOfType = vi.fn(() => [mockLeaf]);
        mockApp.vault.read = vi.fn(() => Promise.resolve('# Test\n'));
        mockApp.vault.modify = vi.fn(() => Promise.resolve());
        mockApp.vault.getFiles = vi.fn(() => []);
        mockApp.metadataCache.getFileCache = vi.fn(() => ({
            frontmatter: { banner: 'test-banner.jpg' }
        }));
        
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
                customBannerHeightField: ['banner-height'],
                customFadeField: ['fade'],
                customBorderRadiusField: ['border-radius'],
                customTitleColorField: ['title-color'],
                customBannerShuffleField: ['banner-shuffle'],
                customBannerIconField: ['banner-icon'],
                customBannerIconSizeField: ['icon-size'],
                customBannerIconXPositionField: ['icon-x-position'],
                customBannerIconOpacityField: ['icon-opacity'],
                customBannerIconColorField: ['icon-color'],
                customBannerIconFontWeightField: ['icon-font-weight'],
                customBannerIconBackgroundColorField: ['icon-bg-color'],
                customBannerIconPaddingXField: ['icon-padding-x'],
                customBannerIconPaddingYField: ['icon-padding-y'],
                customBannerIconBorderRadiusField: ['icon-border-radius'],
                customBannerIconVeritalOffsetField: ['icon-vertical-offset'],
                useShortPath: false,
                imagePropertyFormat: '![[image]]',
                defaultSelectImagePath: 'Images'
            },
            loadedImages: new Map(),
            lastKeywords: new Map(),
            imageCache: new Map(),
            bannerStateCache: new Map(),
            SHUFFLE_CACHE_AGE: 3600000,
            UPDATE_MODE: {
                FULL_UPDATE: 'full',
                ENSURE_VISIBILITY: 'visibility'
            },
            cleanupCache: vi.fn(),
            cleanupPreviousLeaf: vi.fn(),
            cleanupIconOverlay: vi.fn(),
            getFolderSpecificImage: vi.fn(() => null),
            generateCacheKey: vi.fn((path, leafId, isShuffled) => `${path}-${leafId}-${isShuffled}`),
            updateBanner: vi.fn(() => Promise.resolve()),
            invalidateLeafCache: vi.fn(),
            updateFieldVisibility: vi.fn(),
            hasBannerFrontmatter: vi.fn(() => true)
        };
        
        // Spy on Map methods we want to track
        vi.spyOn(mockPlugin.loadedImages, 'delete');
        vi.spyOn(mockPlugin.bannerStateCache, 'set');
        vi.spyOn(mockPlugin.bannerStateCache, 'get');

        // Mock global Date.now
        vi.spyOn(Date, 'now').mockReturnValue(1000000);

        // Mock setTimeout
        vi.spyOn(global, 'setTimeout').mockImplementation((fn, delay) => {
            if (typeof fn === 'function') {
                fn();
            }
            return 1;
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
        vi.useRealTimers();
        document.body.innerHTML = '';
        
        // Reset the modal mocks 
        vi.clearAllMocks();
        
        // Reset Date.now counter for next test with large increment to avoid debounce conflicts
        currentTime += 1000000; // Add 1 second gap between tests
        
        // Also create a new unique file path for each test to avoid debounce conflicts
        if (mockFile) {
            mockFile.path = `test-${currentTime}-${Math.random()}.md`;
        }
        
        // Create unique file paths for views to avoid debounce conflicts
        if (mockView && mockView.file) {
            mockView.file.path = `test-${currentTime}-${Math.random()}.md`;
        }
    });

    describe('handleActiveLeafChange', () => {
        it('should return early for non-markdown views', async () => {
            const nonMarkdownLeaf = {
                view: { constructor: { name: 'FileView' } }
            };

            await handleActiveLeafChange.call(mockPlugin, nonMarkdownLeaf);

            expect(mockPlugin.updateBanner).not.toHaveBeenCalled();
        });

        it('should return early for views without files', async () => {
            const leafWithoutFile = {
                view: new MarkdownView()
            };
            leafWithoutFile.view.file = null;

            await handleActiveLeafChange.call(mockPlugin, leafWithoutFile);

            expect(mockPlugin.updateBanner).not.toHaveBeenCalled();
        });

        it('should handle debouncing for rapid banner updates', async () => {
            const filePath = 'test.md';
            mockLeaf.view.file.path = filePath;

            // First call
            const promise1 = handleActiveLeafChange.call(mockPlugin, mockLeaf);
            
            // Advance time to allow first call to complete
            currentTime += 350;
            vi.advanceTimersByTime(350);
            await promise1;
            
            // Second call within debounce window (should be debounced)
            currentTime += 200; // Only 200ms later (within 300ms debounce window)
            const promise2 = handleActiveLeafChange.call(mockPlugin, mockLeaf);
            
            // Advance timers again
            vi.advanceTimersByTime(350);
            await promise2;

            // Only first call should trigger banner update
            expect(mockPlugin.updateBanner).toHaveBeenCalledTimes(1);
        });

        it('should clean up previous leaf when switching', async () => {
            const previousLeaf = {
                id: 'previous-leaf',
                view: new MarkdownView()
            };
            // Set the previous leaf as the current active leaf before switching
            mockPlugin.app.workspace.activeLeaf = previousLeaf;

            const promise = handleActiveLeafChange.call(mockPlugin, mockLeaf);
            
            // Advance both real time and timers to allow debouncing to complete
            currentTime += 350;
            vi.advanceTimersByTime(350);
            await promise;

            expect(mockPlugin.cleanupPreviousLeaf).toHaveBeenCalledWith(previousLeaf);
            expect(mockPlugin.cleanupIconOverlay).toHaveBeenCalledWith(previousLeaf.view);
        });

        it('should clean up icon overlay when no banner icon in frontmatter', async () => {
            mockApp.metadataCache.getFileCache.mockReturnValue({
                frontmatter: { someOtherField: 'value' }
            });

            const promise = handleActiveLeafChange.call(mockPlugin, mockLeaf);
            
            // Advance both real time and timers to allow debouncing to complete
            currentTime += 350;
            vi.advanceTimersByTime(350);
            await promise;

            expect(mockPlugin.cleanupIconOverlay).toHaveBeenCalledWith(mockLeaf.view);
        });

        it('should update banner for shuffled images', async () => {
            mockPlugin.getFolderSpecificImage.mockReturnValue({
                enableImageShuffle: true
            });

            const promise = handleActiveLeafChange.call(mockPlugin, mockLeaf);
            
            // Advance both real time and timers to allow debouncing to complete
            currentTime += 350;
            vi.advanceTimersByTime(350);
            await promise;

            expect(mockPlugin.updateBanner).toHaveBeenCalledWith(
                mockLeaf.view,
                false,
                mockPlugin.UPDATE_MODE.FULL_UPDATE
            );
        });

        it('should use cached state when available and valid', async () => {
            const cacheKey = mockPlugin.generateCacheKey(mockFile.path, 'test-leaf-id', false);
            const cachedState = {
                timestamp: 999000,
                frontmatter: { banner: 'test-banner.jpg' },
                leafId: 'test-leaf-id',
                isShuffled: false,
                state: { imageUrl: 'test-url' }
            };
            mockPlugin.bannerStateCache.set(cacheKey, cachedState);
            mockPlugin.loadedImages.set(mockFile.path, 'test-url');

            const promise = handleActiveLeafChange.call(mockPlugin, mockLeaf);
            
            // Advance both real time and timers to allow debouncing to complete
            currentTime += 350;
            vi.advanceTimersByTime(350);
            await promise;

            expect(mockPlugin.updateBanner).toHaveBeenCalledWith(
                mockLeaf.view,
                false,
                mockPlugin.UPDATE_MODE.ENSURE_VISIBILITY
            );
        });

        it('should detect frontmatter changes and update banner', async () => {
            const cacheKey = mockPlugin.generateCacheKey(mockFile.path, 'test-leaf-id', false);
            const cachedState = {
                timestamp: 999000,
                frontmatter: { banner: 'old-banner.jpg' },
                leafId: 'test-leaf-id',
                isShuffled: false,
                state: { imageUrl: 'test-url' }
            };
            mockPlugin.bannerStateCache.set(cacheKey, cachedState);
            
            // Current frontmatter is different
            mockApp.metadataCache.getFileCache.mockReturnValue({
                frontmatter: { banner: 'new-banner.jpg' }
            });

            const promise = handleActiveLeafChange.call(mockPlugin, mockLeaf);
            
            // Advance both real time and timers to allow debouncing to complete
            currentTime += 350;
            vi.advanceTimersByTime(350);
            await promise;

            expect(mockPlugin.updateBanner).toHaveBeenCalledWith(
                mockLeaf.view,
                false,
                mockPlugin.UPDATE_MODE.FULL_UPDATE
            );
        });

        it('should handle shuffle cache expiration', async () => {
            const cacheKey = mockPlugin.generateCacheKey(mockFile.path, 'test-leaf-id', true);
            // Set up an old timestamp that exceeds SHUFFLE_CACHE_AGE (3600000ms)
            const oldTimestamp = currentTime - (mockPlugin.SHUFFLE_CACHE_AGE + 1000);
            const cachedState = {
                timestamp: oldTimestamp,
                frontmatter: { banner: 'test-banner.jpg' },
                leafId: 'test-leaf-id',
                isShuffled: true,
                state: { imageUrl: 'test-url' }
            };
            mockPlugin.bannerStateCache.set(cacheKey, cachedState);
            
            mockPlugin.getFolderSpecificImage.mockReturnValue({
                enableImageShuffle: true
            });

            const promise = handleActiveLeafChange.call(mockPlugin, mockLeaf);
            
            // Advance both real time and timers to allow debouncing to complete
            currentTime += 350;
            vi.advanceTimersByTime(350);
            await promise;

            expect(mockPlugin.loadedImages.delete).toHaveBeenCalledWith(mockFile.path);
            expect(mockPlugin.updateBanner).toHaveBeenCalledWith(
                mockLeaf.view,
                false,
                mockPlugin.UPDATE_MODE.FULL_UPDATE
            );
        });

        it('should handle errors gracefully', async () => {
            mockPlugin.updateBanner.mockRejectedValue(new Error('Update failed'));

            const promise = handleActiveLeafChange.call(mockPlugin, mockLeaf);
            
            // Advance both real time and timers to allow debouncing to complete
            currentTime += 350;
            vi.advanceTimersByTime(350);
            await promise;

            expect(mockPlugin.invalidateLeafCache).toHaveBeenCalledWith('test-leaf-id');
        });

        it('should cache banner state after successful update', async () => {
            const frontmatter = { banner: 'test-banner.jpg', 'banner-icon': '📝' };
            mockApp.metadataCache.getFileCache.mockReturnValue({ frontmatter });
            mockPlugin.loadedImages.set(mockFile.path, 'test-image-url');

            // Mock the updateBanner to simulate caching the state
            mockPlugin.updateBanner.mockImplementation(async () => {
                const cacheKey = mockPlugin.generateCacheKey(mockFile.path, mockLeaf.id, false);
                const cachedState = {
                    timestamp: currentTime,
                    frontmatter: frontmatter,
                    leafId: mockLeaf.id,
                    isShuffled: false,
                    state: { imageUrl: 'test-image-url' }
                };
                mockPlugin.bannerStateCache.set(cacheKey, cachedState);
            });

            const promise = handleActiveLeafChange.call(mockPlugin, mockLeaf);
            
            // Advance both real time and timers to allow debouncing to complete
            currentTime += 350;
            vi.advanceTimersByTime(350);
            await promise;

            const cacheKey = mockPlugin.generateCacheKey(mockFile.path, mockLeaf.id, false);
            const cachedState = mockPlugin.bannerStateCache.get(cacheKey);
            
            expect(cachedState).toBeDefined();
            expect(cachedState.frontmatter).toEqual(frontmatter);
            expect(cachedState.state.imageUrl).toBe('test-image-url');
        });
    });

    describe('handleLayoutChange', () => {
        it('should clean up cache for closed leaves', () => {
            const closedLeafId = 'closed-leaf-id';
            const activeLeafId = 'active-leaf-id';
            
            mockPlugin.bannerStateCache.set(`cache-${closedLeafId}`, {
                leafId: closedLeafId,
                state: { imageUrl: 'blob:test-url' }
            });
            mockPlugin.bannerStateCache.set(`cache-${activeLeafId}`, {
                leafId: activeLeafId,
                state: { imageUrl: 'test-url' }
            });
            
            mockApp.workspace.getLeavesOfType.mockReturnValue([
                { id: activeLeafId }
            ]);
            
            global.URL = { revokeObjectURL: vi.fn() };

            handleLayoutChange.call(mockPlugin);

            expect(mockPlugin.bannerStateCache.has(`cache-${closedLeafId}`)).toBe(false);
            expect(mockPlugin.bannerStateCache.has(`cache-${activeLeafId}`)).toBe(true);
            expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
        });

        it('should update banner for active leaf when no cache entry exists', () => {
            const banner = document.createElement('div');
            banner.className = 'pixel-banner-image';
            mockContentEl.appendChild(banner);
            
            mockApp.workspace.activeLeaf = mockLeaf;

            handleLayoutChange.call(mockPlugin);

            expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
            expect(mockPlugin.updateBanner).toHaveBeenCalledWith(mockLeaf.view, false);
        });

        it('should not update banner when valid cache entry exists', () => {
            const banner = document.createElement('div');
            banner.className = 'pixel-banner-image';
            mockContentEl.appendChild(banner);
            
            mockApp.workspace.activeLeaf = mockLeaf;
            mockPlugin.bannerStateCache.set('test-leaf-id', { valid: true });

            handleLayoutChange.call(mockPlugin);

            expect(mockPlugin.updateBanner).not.toHaveBeenCalled();
        });

        it('should handle missing active leaf gracefully', () => {
            mockApp.workspace.activeLeaf = null;

            expect(() => {
                handleLayoutChange.call(mockPlugin);
            }).not.toThrow();
        });
    });

    describe('handleModeChange', () => {
        it('should update banner when mode changes', async () => {
            await handleModeChange.call(mockPlugin, mockLeaf);

            expect(mockPlugin.updateBanner).toHaveBeenCalledWith(mockLeaf.view, true);
        });

        it('should update field visibility when hidePixelBannerFields is enabled', async () => {
            mockPlugin.settings.hidePixelBannerFields = true;

            await handleModeChange.call(mockPlugin, mockLeaf);

            expect(mockPlugin.updateFieldVisibility).toHaveBeenCalledWith(mockLeaf.view);
        });

        it('should handle null leaf gracefully', async () => {
            await expect(handleModeChange.call(mockPlugin, null)).resolves.not.toThrow();
        });

        it('should handle leaf without file gracefully', async () => {
            const leafWithoutFile = {
                view: new MarkdownView()
            };
            leafWithoutFile.view.file = null;

            await expect(handleModeChange.call(mockPlugin, leafWithoutFile)).resolves.not.toThrow();
        });
    });

    describe('handleSelectImage', () => {

        it('should show notice when no active file', async () => {
            mockApp.workspace.getActiveFile.mockReturnValue(null);

            await handleSelectImage.call(mockPlugin);

            expect(Notice).toHaveBeenCalledWith('No active file');
        });

        it('should open ImageSelectionModal with correct parameters', async () => {
            await handleSelectImage.call(mockPlugin);

            expect(ImageSelectionModal).toHaveBeenCalledWith(
                mockApp,
                mockPlugin,
                expect.any(Function),
                'Images'
            );
        });

        it('should use short path when filename is unique', async () => {
            mockPlugin.settings.useShortPath = true;
            mockApp.vault.getFiles.mockReturnValue([
                { name: 'test-image.jpg', path: 'Images/test-image.jpg' }
            ]);

            await handleSelectImage.call(mockPlugin);

            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('banner: "![[test-image.jpg]]"')
            );
        });

        it('should use full path when filename is not unique', async () => {
            mockPlugin.settings.useShortPath = true;
            mockApp.vault.getFiles.mockReturnValue([
                { name: 'test-image.jpg', path: 'Images/test-image.jpg' },
                { name: 'test-image.jpg', path: 'Other/test-image.jpg' }
            ]);

            await handleSelectImage.call(mockPlugin);

            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('banner: "![[test-image.jpg]]"')
            );
        });

        it('should update existing frontmatter', async () => {
            mockApp.vault.read.mockResolvedValue(`---
banner: "old-banner.jpg"
other: "value"
---

# Content`);

            await handleSelectImage.call(mockPlugin);

            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('banner: "![[test-image.jpg]]"')
            );
            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('other: "value"')
            );
        });

        it('should create frontmatter when none exists', async () => {
            mockApp.vault.read.mockResolvedValue('# Content without frontmatter');

            await handleSelectImage.call(mockPlugin);

            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                mockFile,
                expect.stringMatching(/^---\nbanner: "!\[\[test-image\.jpg\]\]"\n---/)
            );
        });

        it('should use different image property format', async () => {
            mockPlugin.settings.imagePropertyFormat = '[[image]]';

            await handleSelectImage.call(mockPlugin);

            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                mockFile,
                expect.stringContaining('banner: "[[test-image.jpg]]"')
            );
        });
    });

    describe('handleBannerIconClick', () => {
        it('should open SelectPixelBannerModal', () => {
            handleBannerIconClick.call(mockPlugin);

            expect(SelectPixelBannerModal).toHaveBeenCalledWith(mockApp, mockPlugin);
        });
    });

    describe('handleOpenStore', () => {
        it('should open PixelBannerStoreModal', () => {
            handleOpenStore.call(mockPlugin);

            expect(PixelBannerStoreModal).toHaveBeenCalledWith(mockApp, mockPlugin);
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle cache cleanup for blob URLs', () => {
            mockPlugin.bannerStateCache.set('test-key', {
                leafId: 'non-existent-leaf',
                state: { imageUrl: 'blob:http://localhost/test-uuid' }
            });
            
            mockApp.workspace.getLeavesOfType.mockReturnValue([]);
            global.URL = { revokeObjectURL: vi.fn() };

            handleLayoutChange.call(mockPlugin);

            expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-uuid');
        });

        it('should handle missing frontmatter in cache comparison', async () => {
            const cacheKey = 'test.md-test-leaf-id-false';
            const cachedState = {
                timestamp: 999000,
                frontmatter: null,
                leafId: 'test-leaf-id',
                isShuffled: false
            };
            mockPlugin.bannerStateCache.set(cacheKey, cachedState);
            
            mockApp.metadataCache.getFileCache.mockReturnValue({ frontmatter: null });

            await expect(handleActiveLeafChange.call(mockPlugin, mockLeaf)).resolves.not.toThrow();
        });

        it('should handle missing contentEl in layout change', () => {
            mockLeaf.view.contentEl = null;
            mockApp.workspace.activeLeaf = mockLeaf;

            expect(() => {
                handleLayoutChange.call(mockPlugin);
            }).not.toThrow();
        });

        it('should handle recovery from banner update error', async () => {
            mockPlugin.updateBanner
                .mockRejectedValueOnce(new Error('First error'))
                .mockResolvedValueOnce(undefined);

            const promise = handleActiveLeafChange.call(mockPlugin, mockLeaf);
            
            // Advance both real time and timers to allow debouncing to complete
            currentTime += 350;
            vi.advanceTimersByTime(350);
            await promise;

            expect(mockPlugin.updateBanner).toHaveBeenCalledTimes(2);
        });
    });
});