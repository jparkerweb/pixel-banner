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
import { confettiManager } from '@/core/confettiManager.js';
import { getVaultImageUrl, releaseAllVaultImageUrls } from '@/core/bannerUtils.js';
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
                customBannerIconVerticalOffsetField: ['icon-vertical-offset'],
                useShortPath: false,
                imagePropertyFormat: '![[image]]',
                defaultSelectImagePath: 'Images'
            },
            loadedImages: new Map(),
            lastKeywords: new Map(),
            imageCache: new Map(),
            lastFrontmatter: new Map(),
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
        // The cached-state comparison reads every registry field but confetti,
        // so hand edits of fields the old hand-kept list missed refresh too
        describe('relevant field changes', () => {
            const cachedFrontmatter = {
                banner: 'test-banner.jpg',
                'banner-align': 'left',
                'icon-image': 'a.png',
                'pixel-banner-flag-color': 'red',
                'banner-confetti': 'type: snow'
            };

            beforeEach(() => {
                Object.assign(mockPlugin.settings, {
                    customBannerAlignmentField: ['banner-align'],
                    customBannerIconImageField: ['icon-image'],
                    customFlagColorField: ['pixel-banner-flag-color'],
                    customBannerConfettiField: ['banner-confetti']
                });
                vi.spyOn(confettiManager, 'update').mockImplementation(() => null);
                mockPlugin.loadedImages.set(mockLeaf.view.file.path, 'blob:image');
                mockPlugin.bannerStateCache.get.mockReturnValue({
                    timestamp: Date.now(),
                    frontmatter: { ...cachedFrontmatter }
                });
            });

            const withChange = (change) => {
                mockApp.metadataCache.getFileCache = vi.fn(() => ({
                    frontmatter: { ...cachedFrontmatter, ...change }
                }));
            };

            it.each([
                ['alignment', { 'banner-align': 'right' }],
                ['icon image', { 'icon-image': 'b.png' }],
                ['flag color', { 'pixel-banner-flag-color': 'blue' }]
            ])('refreshes the banner when only %s changed', async (name, change) => {
                withChange(change);

                await handleActiveLeafChange.call(mockPlugin, mockLeaf);

                expect(mockPlugin.updateBanner).toHaveBeenCalledWith(mockView, false, 'full');
            });

            it('does not refresh the banner when only confetti changed', async () => {
                withChange({ 'banner-confetti': 'type: hearts' });

                await handleActiveLeafChange.call(mockPlugin, mockLeaf);

                expect(mockPlugin.updateBanner).toHaveBeenCalledWith(mockView, false, 'visibility');
                expect(mockPlugin.updateBanner).not.toHaveBeenCalledWith(mockView, false, 'full');
            });
        });

        describe('icon state', () => {
            it('keeps icon-opacity: 0 instead of falling back to the setting', async () => {
                mockPlugin.settings.bannerIconOpacity = 100;
                mockApp.metadataCache.getFileCache = vi.fn(() => ({
                    frontmatter: { banner: 'test-banner.jpg', 'banner-icon': '🌟', 'icon-opacity': 0 }
                }));

                await handleActiveLeafChange.call(mockPlugin, mockLeaf);

                const cached = mockPlugin.bannerStateCache.set.mock.calls.at(-1)[1];
                expect(cached.state.iconState.opacity).toBe(0);
            });
        });

        // F45: a slow banner load must not start confetti on a pane that no
        // longer shows the note. Effects are per leaf, so a note left visible
        // in a split keeps its confetti when focus moves to another pane.
        // Both await paths (full update, ensure visibility).
        describe('slow banner race', () => {
            let update;
            let otherLeaf;

            beforeEach(() => {
                update = vi.spyOn(confettiManager, 'update').mockImplementation(() => null);
                mockPlugin.settings.customBannerConfettiField = ['banner-confetti'];
                mockPlugin.settings.confettiDisableOnMobile = false;
                mockApp.metadataCache.getFileCache = vi.fn(() => ({
                    frontmatter: { banner: 'test-banner.jpg', 'banner-confetti': 'type: snow' }
                }));
                otherLeaf = { id: 'other-leaf', view: new MarkdownView() };
                otherLeaf.view.file = new TFile('other.md');
                // A leaf in the workspace is attached to the document
                document.body.appendChild(mockView.containerEl);
            });

            // Make the second path run: a cached state and a loaded image
            function useCachedBanner() {
                const path = mockLeaf.view.file.path;
                mockPlugin.loadedImages.set(path, 'blob:image');
                mockPlugin.bannerStateCache.get.mockReturnValue({
                    timestamp: Date.now(),
                    frontmatter: { banner: 'test-banner.jpg', 'banner-confetti': 'type: snow' }
                });
            }

            it('starts confetti when the pane is still active after the banner load', async () => {
                await handleActiveLeafChange.call(mockPlugin, mockLeaf);

                expect(mockPlugin.updateBanner).toHaveBeenCalledWith(mockView, false, 'full');
                expect(update).toHaveBeenCalledWith(mockLeaf.id, mockContentEl, 'snow', {}, { filePath: mockFile.path });
            });

            it('starts confetti on a split pane when focus moved to another pane during a full update', async () => {
                mockPlugin.updateBanner.mockImplementation(async () => {
                    mockApp.workspace.activeLeaf = otherLeaf;
                });

                await handleActiveLeafChange.call(mockPlugin, mockLeaf);

                expect(mockPlugin.updateBanner).toHaveBeenCalledWith(mockView, false, 'full');
                expect(update).toHaveBeenCalledWith(mockLeaf.id, mockContentEl, 'snow', {}, { filePath: mockFile.path });
            });

            it('skips confetti when the pane switched file during a full update', async () => {
                mockPlugin.updateBanner.mockImplementation(async () => {
                    mockView.file = new TFile('switched.md');
                });

                await handleActiveLeafChange.call(mockPlugin, mockLeaf);

                expect(mockPlugin.updateBanner).toHaveBeenCalledWith(mockView, false, 'full');
                expect(update).not.toHaveBeenCalled();
            });

            it('skips confetti when the leaf was closed during a full update', async () => {
                mockPlugin.updateBanner.mockImplementation(async () => {
                    mockView.containerEl.remove();
                });

                await handleActiveLeafChange.call(mockPlugin, mockLeaf);

                expect(mockPlugin.updateBanner).toHaveBeenCalledWith(mockView, false, 'full');
                expect(update).not.toHaveBeenCalled();
            });

            it('uses the frontmatter read after the banner load, not the one read before', async () => {
                mockPlugin.updateBanner.mockImplementation(async () => {
                    // The note was edited while the banner loaded
                    mockApp.metadataCache.getFileCache = vi.fn(() => ({
                        frontmatter: { banner: 'test-banner.jpg', 'banner-confetti': 'type: hearts' }
                    }));
                });

                await handleActiveLeafChange.call(mockPlugin, mockLeaf);

                expect(update).toHaveBeenCalledTimes(1);
                expect(update).toHaveBeenCalledWith(mockLeaf.id, mockContentEl, 'hearts', {}, { filePath: mockFile.path });
            });

            it('honours confetti removed from the note during the banner load', async () => {
                mockPlugin.updateBanner.mockImplementation(async () => {
                    mockApp.metadataCache.getFileCache = vi.fn(() => ({
                        frontmatter: { banner: 'test-banner.jpg' }
                    }));
                });

                await handleActiveLeafChange.call(mockPlugin, mockLeaf);

                expect(mockPlugin.updateBanner).toHaveBeenCalledWith(mockView, false, 'full');
                expect(update).not.toHaveBeenCalled();
            });

            it('starts confetti on the visibility-only path when nothing changed', async () => {
                useCachedBanner();

                await handleActiveLeafChange.call(mockPlugin, mockLeaf);

                expect(mockPlugin.updateBanner).toHaveBeenCalledWith(mockView, false, 'visibility');
                expect(update).toHaveBeenCalled();
            });

            it('starts confetti on a split pane when focus moved to another pane on the visibility-only path', async () => {
                useCachedBanner();
                mockPlugin.updateBanner.mockImplementation(async () => {
                    mockApp.workspace.activeLeaf = otherLeaf;
                });

                await handleActiveLeafChange.call(mockPlugin, mockLeaf);

                expect(mockPlugin.updateBanner).toHaveBeenCalledWith(mockView, false, 'visibility');
                expect(update).toHaveBeenCalledWith(mockLeaf.id, mockContentEl, 'snow', {}, { filePath: mockFile.path });
            });

            it('skips confetti when the pane switched file on the visibility-only path', async () => {
                useCachedBanner();
                mockPlugin.updateBanner.mockImplementation(async () => {
                    mockView.file = new TFile('switched.md');
                });

                await handleActiveLeafChange.call(mockPlugin, mockLeaf);

                expect(mockPlugin.updateBanner).toHaveBeenCalledWith(mockView, false, 'visibility');
                expect(update).not.toHaveBeenCalled();
            });

            it('uses fresh frontmatter on the visibility-only path', async () => {
                useCachedBanner();
                mockPlugin.updateBanner.mockImplementation(async () => {
                    mockApp.metadataCache.getFileCache = vi.fn(() => ({
                        frontmatter: { banner: 'test-banner.jpg', 'banner-confetti': 'type: hearts' }
                    }));
                });

                await handleActiveLeafChange.call(mockPlugin, mockLeaf);

                expect(update).toHaveBeenCalledWith(mockLeaf.id, mockContentEl, 'hearts', {}, { filePath: mockFile.path });
            });
        });

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

        // Issue #333: a plugin that re-opens the note on startup (e.g. Homepage)
        // gives the same leaf and file a new view within the debounce window
        it('does not skip a new view of the same file within the debounce window', async () => {
            const filePath = 'homepage.md';
            mockLeaf.view.file.path = filePath;

            await handleActiveLeafChange.call(mockPlugin, mockLeaf);

            const reopenedView = new MarkdownView();
            reopenedView.file = new TFile(filePath);
            reopenedView.contentEl = mockContentEl;
            reopenedView.containerEl = mockView.containerEl;
            mockLeaf.view = reopenedView;
            currentTime += 100;

            await handleActiveLeafChange.call(mockPlugin, mockLeaf);

            expect(mockPlugin.updateBanner).toHaveBeenCalledTimes(2);
            expect(mockPlugin.updateBanner).toHaveBeenLastCalledWith(reopenedView, false, 'full');
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
        // Issue #207: a linked tab changes note without focus, so it gets no
        // active-leaf-change; layout-change refreshes it instead
        describe('panes that changed note without focus', () => {
            function makePane(path, { marker, shown = true } = {}) {
                const view = new MarkdownView();
                view.file = new TFile(path);
                view.contentEl = document.createElement('div');
                if (marker) view.contentEl._pixelBannerFilePath = marker;
                view.containerEl = document.createElement('div');
                view.containerEl.isShown = () => shown;
                return { id: `leaf-${path}`, view };
            }

            beforeEach(() => {
                mockApp.workspace.activeLeaf = mockLeaf;
            });

            it('updates a visible pane whose banner was rendered for another note', () => {
                const linked = makePane('b.md', { marker: 'a.md' });
                mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf, linked]);

                handleLayoutChange.call(mockPlugin);

                expect(mockPlugin.updateBanner).toHaveBeenCalledWith(linked.view, false, mockPlugin.UPDATE_MODE.ENSURE_VISIBILITY);
            });

            it('updates a visible pane that never had a banner update', () => {
                const pane = makePane('b.md');
                mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf, pane]);

                handleLayoutChange.call(mockPlugin);

                expect(mockPlugin.updateBanner).toHaveBeenCalledWith(pane.view, false, mockPlugin.UPDATE_MODE.ENSURE_VISIBILITY);
            });

            it('leaves a pane alone when its banner matches its note', () => {
                const pane = makePane('b.md', { marker: 'b.md' });
                mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf, pane]);

                handleLayoutChange.call(mockPlugin);

                // Not updated with any arguments, not just not with ENSURE_VISIBILITY
                expect(mockPlugin.updateBanner.mock.calls.some(([view]) => view === pane.view)).toBe(false);
            });

            it('leaves hidden panes (background tabs) for when they are shown', () => {
                const pane = makePane('b.md', { marker: 'a.md', shown: false });
                mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf, pane]);

                handleLayoutChange.call(mockPlugin);

                // Not updated with any arguments, not just not with ENSURE_VISIBILITY
                expect(mockPlugin.updateBanner.mock.calls.some(([view]) => view === pane.view)).toBe(false);
            });

            // Such a pane gets no active-leaf-change either, so confetti for the
            // note it moved to starts after its banner update
            describe('confetti', () => {
                let update;

                // Let the banner update promise chain settle
                async function flushPromises() {
                    for (let i = 0; i < 5; i++) await Promise.resolve();
                }

                beforeEach(() => {
                    update = vi.spyOn(confettiManager, 'update').mockImplementation(() => null);
                    mockPlugin.settings.customBannerConfettiField = ['banner-confetti'];
                    mockPlugin.settings.confettiDisableOnMobile = false;
                    mockApp.metadataCache.getFileCache = vi.fn(() => ({
                        frontmatter: { banner: 'test-banner.jpg', 'banner-confetti': 'type: snow' }
                    }));
                });

                it('starts confetti on a linked pane that moved to a note with confetti', async () => {
                    const linked = makePane('b.md', { marker: 'a.md' });
                    // A leaf in the workspace is attached to the document
                    document.body.appendChild(linked.view.containerEl);
                    mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf, linked]);

                    handleLayoutChange.call(mockPlugin);
                    await flushPromises();

                    expect(update).toHaveBeenCalledWith(linked.id, linked.view.contentEl, 'snow', {}, { filePath: 'b.md' });
                });

                it('skips confetti when the pane moved to another note before its banner update finished', async () => {
                    const linked = makePane('b.md', { marker: 'a.md' });
                    document.body.appendChild(linked.view.containerEl);
                    mockApp.workspace.getLeavesOfType.mockReturnValue([mockLeaf, linked]);
                    mockPlugin.updateBanner.mockImplementation(async (view) => {
                        if (view === linked.view) {
                            linked.view.file = new TFile('c.md');
                        }
                    });

                    handleLayoutChange.call(mockPlugin);
                    await flushPromises();

                    expect(mockPlugin.updateBanner).toHaveBeenCalledWith(linked.view, false, mockPlugin.UPDATE_MODE.ENSURE_VISIBILITY);
                    expect(update.mock.calls.some(([effectId]) => effectId === linked.id)).toBe(false);
                });
            });
        });

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

        // A closed pane's shared vault image may still show in other panes
        it('keeps a shared vault image blob URL when a closed leaf\'s cache is dropped', async () => {
            global.URL = {
                createObjectURL: vi.fn(() => 'blob:shared-vault-image'),
                revokeObjectURL: vi.fn()
            };
            releaseAllVaultImageUrls();
            const imageFile = new TFile('shared.png');
            imageFile.extension = 'png';
            const vaultContext = { app: createMockApp() };
            vaultContext.app.vault.getAbstractFileByPath = vi.fn(() => imageFile);
            vaultContext.app.vault.readBinary = vi.fn().mockResolvedValue(new ArrayBuffer(4));
            const { url: sharedUrl } = await getVaultImageUrl.call(vaultContext, 'shared.png');

            mockPlugin.bannerStateCache.set('cache-shared', { leafId: 'closed-1', state: { imageUrl: sharedUrl } });
            mockPlugin.bannerStateCache.set('cache-own', { leafId: 'closed-2', state: { imageUrl: 'blob:pane-only' } });
            mockApp.workspace.getLeavesOfType.mockReturnValue([]);

            try {
                handleLayoutChange.call(mockPlugin);

                expect(mockPlugin.bannerStateCache.size).toBe(0);
                expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:pane-only');
                expect(global.URL.revokeObjectURL).not.toHaveBeenCalledWith(sharedUrl);
            } finally {
                releaseAllVaultImageUrls();
            }
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

        // The frontmatter object the command's processFrontMatter callback edits.
        // selectedFile, when given, is the file the modal hands to onChoose
        const chooseImage = async (frontmatter = {}, selectedFile = null) => {
            if (selectedFile) {
                ImageSelectionModal.mockImplementationOnce(function(app, plugin, callback) {
                    this.open = () => {
                        callback(selectedFile);
                        return this;
                    };
                    return this;
                });
            }
            mockApp.fileManager.processFrontMatter = vi.fn(async (file, callback) => callback(frontmatter));
            await handleSelectImage.call(mockPlugin);
            for (let i = 0; i < 20; i++) await Promise.resolve();
            return frontmatter;
        };

        it('should use short path when filename is unique', async () => {
            mockPlugin.settings.useShortPath = true;
            mockApp.vault.getFiles.mockReturnValue([
                { name: 'test-image.jpg', path: 'Images/test-image.jpg' }
            ]);

            const frontmatter = await chooseImage({}, { path: 'Images/test-image.jpg', name: 'test-image.jpg' });

            expect(mockApp.fileManager.processFrontMatter).toHaveBeenCalledWith(mockFile, expect.any(Function));
            expect(frontmatter.banner).toBe('![[test-image.jpg]]');
            expect(Notice).toHaveBeenCalledWith('Banner image updated');
            expect(Notice).not.toHaveBeenCalledWith('Banner image updated (full path used due to duplicate filenames)');
        });

        it('should use full path when filename is not unique', async () => {
            mockPlugin.settings.useShortPath = true;
            mockApp.vault.getFiles.mockReturnValue([
                { name: 'test-image.jpg', path: 'Images/test-image.jpg' },
                { name: 'test-image.jpg', path: 'Other/test-image.jpg' }
            ]);

            const frontmatter = await chooseImage({}, { path: 'Images/test-image.jpg', name: 'test-image.jpg' });

            expect(frontmatter.banner).toBe('![[Images/test-image.jpg]]');
            expect(Notice).toHaveBeenCalledWith('Banner image updated (full path used due to duplicate filenames)');
        });

        it('should update existing frontmatter', async () => {
            const frontmatter = await chooseImage({ banner: 'old-banner.jpg', other: 'value' });

            expect(frontmatter).toEqual({ banner: '![[test-image.jpg]]', other: 'value' });
        });

        it('should create frontmatter when none exists', async () => {
            const frontmatter = await chooseImage({});

            expect(frontmatter).toEqual({ banner: '![[test-image.jpg]]' });
        });

        it('should use different image property format', async () => {
            mockPlugin.settings.imagePropertyFormat = '[[image]]';

            const frontmatter = await chooseImage();

            expect(frontmatter.banner).toBe('[[test-image.jpg]]');
        });

        // The note is kept as frontmatter plus body and is readable both ways:
        // vault.read and vault.modify see text, processFrontMatter sees the
        // object, so these hold whichever way the command writes the note
        describe('frontmatter it writes', () => {
            let note;

            const toText = () => {
                if (!note.frontmatter) return note.body;
                const lines = Object.entries(note.frontmatter).map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
                return `---\n${lines.join('\n')}\n---\n\n${note.body}`;
            };

            const fromText = (text) => {
                const match = text.match(/^---\n([\s\S]*?)\n---\n*([\s\S]*)$/);
                if (!match) return { frontmatter: null, body: text };
                const frontmatter = {};
                for (const line of match[1].split('\n')) {
                    const at = line.indexOf(':');
                    if (at === -1) continue;
                    frontmatter[line.slice(0, at).trim()] = line.slice(at + 1).trim().replace(/^"(.*)"$/, '$1');
                }
                return { frontmatter, body: match[2] };
            };

            // The modal mock calls onChoose without awaiting it
            const settle = async () => {
                for (let i = 0; i < 20; i++) await Promise.resolve();
            };

            beforeEach(() => {
                mockPlugin.settings.customBannerField = ['banner', 'image'];
                mockApp.vault.read = vi.fn(() => Promise.resolve(toText()));
                mockApp.vault.modify = vi.fn((file, text) => {
                    note = fromText(text);
                    return Promise.resolve();
                });
                mockApp.fileManager.processFrontMatter = vi.fn(async (file, callback) => {
                    note.frontmatter = note.frontmatter || {};
                    callback(note.frontmatter);
                });
            });

            it('writes the primary banner name and keeps the other properties', async () => {
                note = { frontmatter: { banner: 'old-banner.jpg', other: 'value' }, body: '# Content' };

                await handleSelectImage.call(mockPlugin);
                await settle();

                expect(note.frontmatter).toEqual({ banner: '![[test-image.jpg]]', other: 'value' });
                expect(note.body).toBe('# Content');
                expect(Notice).toHaveBeenCalledWith('Banner image updated');
            });

            it('removes the other configured banner names', async () => {
                note = { frontmatter: { banner: 'old-banner.jpg', image: 'older.jpg', other: 'value' }, body: '# Content' };

                await handleSelectImage.call(mockPlugin);
                await settle();

                expect(note.frontmatter).toEqual({ banner: '![[test-image.jpg]]', other: 'value' });
            });

            // The regex rewrite moved this banner to the primary name; writeField
            // keeps the name the note already uses
            it('replaces a banner set under the second configured name in place', async () => {
                note = { frontmatter: { image: 'older.jpg', other: 'value' }, body: '# Content' };

                await handleSelectImage.call(mockPlugin);
                await settle();

                expect(note.frontmatter).toEqual({ image: '![[test-image.jpg]]', other: 'value' });
            });

            it('adds frontmatter to a note without any', async () => {
                note = { frontmatter: null, body: '# Content without frontmatter' };

                await handleSelectImage.call(mockPlugin);
                await settle();

                expect(note.frontmatter).toEqual({ banner: '![[test-image.jpg]]' });
                expect(note.body).toBe('# Content without frontmatter');
            });
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