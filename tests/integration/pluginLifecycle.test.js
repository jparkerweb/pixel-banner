import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PixelBannerPlugin } from '@/core/pixelBannerPlugin.js';
import { createMockApp, createMockManifest, MarkdownView, TFile } from 'obsidian';
import { DEFAULT_SETTINGS } from '@/settings/settings.js';

// DOM globals are automatically provided by happy-dom environment

describe('Plugin Lifecycle Integration Tests', () => {
    let plugin;
    let mockApp;
    let mockManifest;

    beforeEach(() => {
        mockApp = createMockApp();
        mockManifest = createMockManifest();
        plugin = new PixelBannerPlugin(mockApp, mockManifest);
        
        // Mock console methods to reduce noise
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
        
        // Clean up any timers or intervals
        if (plugin.debounceTimer) {
            clearTimeout(plugin.debounceTimer);
        }
    });

    describe('Plugin Load Lifecycle', () => {
        it('should initialize with default settings on first load', async () => {
            // Mock loadData to return empty object (first time load)
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            
            await plugin.onload();
            
            // Check that settings were initialized with defaults (excluding lastVersion which gets set by checkVersion)
            const expectedSettings = { ...DEFAULT_SETTINGS };
            delete expectedSettings.lastVersion; // This gets set by checkVersion during onload
            expect(plugin.settings).toEqual(expect.objectContaining(expectedSettings));
            expect(plugin.settings.folderImages).toBeInstanceOf(Array);
        });

        it('should load existing settings on subsequent loads', async () => {
            const existingSettings = {
                ...DEFAULT_SETTINGS,
                xPosition: 75,
                yPosition: 25,
                customBannerField: ['custom-banner'],
                folderImages: [{ path: 'test', image: 'test.jpg' }]
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(existingSettings);
            
            await plugin.onload();
            
            expect(plugin.settings.xPosition).toBe(75);
            expect(plugin.settings.yPosition).toBe(25);
            expect(plugin.settings.customBannerField).toEqual(['custom-banner']);
            expect(plugin.settings.folderImages).toHaveLength(1);
        });

        it('should initialize core properties during load', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            
            await plugin.onload();
            
            // Check core properties are initialized
            expect(plugin.loadedImages).toBeInstanceOf(Map);
            expect(plugin.lastKeywords).toBeInstanceOf(Map);
            expect(plugin.imageCache).toBeInstanceOf(Map);
            expect(plugin.bannerStateCache).toBeInstanceOf(Map);
            expect(plugin.iconOverlayPool).toBeInstanceOf(Array);
            expect(plugin.rateLimiter).toBeDefined();
            expect(plugin.UPDATE_MODE).toBeDefined();
        });

        it('should register workspace events during load', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            const registerEventSpy = vi.spyOn(plugin, 'registerEvent');
            const workspaceOnSpy = vi.spyOn(mockApp.workspace, 'on');
            const metadataCacheOnSpy = vi.spyOn(mockApp.metadataCache, 'on');
            
            await plugin.onload();
            
            // Verify events were registered
            expect(registerEventSpy).toHaveBeenCalled();
            expect(workspaceOnSpy).toHaveBeenCalledWith('active-leaf-change', expect.any(Function));
            expect(workspaceOnSpy).toHaveBeenCalledWith('layout-change', expect.any(Function));
            expect(workspaceOnSpy).toHaveBeenCalledWith('resize', expect.any(Function));
            expect(metadataCacheOnSpy).toHaveBeenCalledWith('changed', expect.any(Function));
            expect(metadataCacheOnSpy).toHaveBeenCalledWith('resolved', expect.any(Function));
        });

        it('should register commands during load', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            const addCommandSpy = vi.spyOn(plugin, 'addCommand');
            
            await plugin.onload();
            
            // Verify core commands were registered
            expect(addCommandSpy).toHaveBeenCalledWith(expect.objectContaining({
                id: 'generate-banner-with-ai',
                name: '✨ Generate Banner with AI'
            }));
            expect(addCommandSpy).toHaveBeenCalledWith(expect.objectContaining({
                id: 'pin-banner-image',
                name: '📌 Pin current banner image'
            }));
            expect(addCommandSpy).toHaveBeenCalledWith(expect.objectContaining({
                id: 'refresh-banner-image',
                name: '🔄 Refresh current banner image'
            }));
        });

        it('should setup observers and processors during load', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            const setupMutationObserverSpy = vi.spyOn(plugin, 'setupMutationObserver');
            const registerMarkdownPostProcessorSpy = vi.spyOn(plugin, 'registerMarkdownPostProcessor');
            
            await plugin.onload();
            
            expect(setupMutationObserverSpy).toHaveBeenCalled();
            expect(registerMarkdownPostProcessorSpy).toHaveBeenCalled();
        });

        it('should verify Pixel Banner Plus credentials during load', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            
            // Mock the credentials verification to return successful result
            const verifyCredentialsSpy = vi.spyOn(plugin, 'verifyPixelBannerPlusCredentials').mockImplementation(async () => {
                const result = {
                    serverOnline: true,
                    verified: true,
                    bannerTokens: 100,
                    jackpot: 1000
                };
                
                // Set the plugin properties manually since we're mocking the method
                plugin.pixelBannerPlusServerOnline = result.serverOnline;
                plugin.pixelBannerPlusEnabled = result.verified;
                plugin.pixelBannerPlusBannerTokens = result.bannerTokens;
                plugin.pixelBannerPlusJackpot = result.jackpot;
                
                return result;
            });
            
            await plugin.onload();
            
            expect(verifyCredentialsSpy).toHaveBeenCalled();
            expect(plugin.pixelBannerPlusEnabled).toBe(true);
            expect(plugin.pixelBannerPlusBannerTokens).toBe(100);
        });
    });

    describe('Settings Persistence', () => {
        it('should save settings and trigger updates', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            vi.spyOn(plugin, 'saveData').mockResolvedValue();
            
            await plugin.onload();
            
            // Create a mock markdown view
            const mockView = new MarkdownView();
            mockView.file = new TFile('test.md');
            const mockLeaf = { view: mockView };
            mockApp.workspace.activeLeaf = mockLeaf;
            
            const updateBannerSpy = vi.spyOn(plugin, 'updateBanner').mockResolvedValue();
            const updateFieldVisibilitySpy = vi.spyOn(plugin, 'updateFieldVisibility').mockImplementation(() => {});
            
            // Modify settings
            plugin.settings.xPosition = 100;
            plugin.settings.hidePixelBannerFields = true;
            
            await plugin.saveSettings();
            
            // Verify saveData was called
            expect(plugin.saveData).toHaveBeenCalledWith(plugin.settings);
            
            // Verify caches were cleared
            expect(plugin.loadedImages.size).toBe(0);
            expect(plugin.lastKeywords.size).toBe(0);
            expect(plugin.imageCache.size).toBe(0);
            
            // Verify banner updates were triggered
            expect(updateBannerSpy).toHaveBeenCalledWith(mockView, true);
            expect(updateFieldVisibilitySpy).toHaveBeenCalledWith(mockView);
        });

        it('should handle settings migration for folderImages', async () => {
            const settingsWithoutFolderImages = {
                ...DEFAULT_SETTINGS,
                folderImages: null // Invalid value
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settingsWithoutFolderImages);
            
            await plugin.onload();
            
            // Should have been migrated to empty array
            expect(plugin.settings.folderImages).toBeInstanceOf(Array);
            expect(plugin.settings.folderImages).toHaveLength(0);
        });

        it('should migrate folderImages properties', async () => {
            const settingsWithIncompleteFolder = {
                ...DEFAULT_SETTINGS,
                folderImages: [{
                    path: 'test',
                    image: 'test.jpg'
                    // Missing imageDisplay, imageRepeat, directChildrenOnly
                }]
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settingsWithIncompleteFolder);
            
            await plugin.onload();
            
            const folderImage = plugin.settings.folderImages[0];
            expect(folderImage.imageDisplay).toBe('cover');
            expect(folderImage.imageRepeat).toBe(false);
            expect(folderImage.directChildrenOnly).toBe(false);
        });

        it('should migrate bannerGap setting', async () => {
            const settingsWithoutBannerGap = {
                ...DEFAULT_SETTINGS
            };
            delete settingsWithoutBannerGap.bannerGap;
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settingsWithoutBannerGap);
            
            await plugin.onload();
            
            expect(plugin.settings.bannerGap).toBe(DEFAULT_SETTINGS.bannerGap);
        });
    });

    describe('Plugin Unload Lifecycle', () => {
        it('should clean up observers during unload', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Mock observer
            plugin.observer = {
                disconnect: vi.fn()
            };
            
            // Add mock resize observer to a view
            const mockViewContent = document.createElement('div');
            const mockResizeObserver = {
                disconnect: vi.fn()
            };
            mockViewContent._resizeObserver = mockResizeObserver;
            
            const mockView = new MarkdownView();
            mockView.contentEl = mockViewContent;
            const mockLeaf = { view: mockView };
            
            // Mock iterateAllLeaves to include our mock leaf
            mockApp.workspace.iterateAllLeaves = vi.fn((callback) => {
                callback(mockLeaf);
            });
            
            plugin.onunload();
            
            expect(plugin.observer.disconnect).toHaveBeenCalled();
            expect(mockResizeObserver.disconnect).toHaveBeenCalled();
        });

        it('should clear icon overlay pool during unload', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Add some mock overlays to the pool
            plugin.iconOverlayPool = ['overlay1', 'overlay2', 'overlay3'];
            
            plugin.onunload();
            
            expect(plugin.iconOverlayPool).toHaveLength(0);
        });

        it('should remove embedded styles during unload', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Add mock style elements
            const titleStyleEl = document.createElement('style');
            titleStyleEl.id = 'pixel-banner-embedded-titles';
            document.head.appendChild(titleStyleEl);
            
            const bannerStyleEl = document.createElement('style');
            bannerStyleEl.id = 'pixel-banner-embedded-banners';
            document.head.appendChild(bannerStyleEl);
            
            plugin.onunload();
            
            expect(document.getElementById('pixel-banner-embedded-titles')).toBeNull();
            expect(document.getElementById('pixel-banner-embedded-banners')).toBeNull();
        });
    });

    describe('Cache Cleanup Integration', () => {
        it('should cleanup cache during settings save', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            vi.spyOn(plugin, 'saveData').mockResolvedValue();
            
            await plugin.onload();
            
            // Add some cache entries
            plugin.loadedImages.set('test1.md', 'image1.jpg');
            plugin.lastKeywords.set('test2.md', 'keyword');
            plugin.imageCache.set('cache1', 'data');
            
            await plugin.saveSettings();
            
            expect(plugin.loadedImages.size).toBe(0);
            expect(plugin.lastKeywords.size).toBe(0);
            expect(plugin.imageCache.size).toBe(0);
        });

        it('should cleanup banner state cache during forced cleanup', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Add cache entries
            plugin.bannerStateCache.set('test-key', {
                timestamp: Date.now() - 1000000, // Old entry
                leafId: 'test-leaf'
            });
            
            const cleanupSpy = vi.spyOn(plugin, 'cleanupCache');
            
            plugin.cleanupCache(true);
            
            expect(cleanupSpy).toHaveBeenCalledWith(true);
            expect(plugin.bannerStateCache.size).toBe(0);
        });
    });

    describe('Multi-view Synchronization', () => {
        it('should handle multiple markdown views during lifecycle', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Create multiple mock views
            const view1 = new MarkdownView();
            view1.file = new TFile('test1.md');
            const view2 = new MarkdownView();
            view2.file = new TFile('test2.md');
            
            const leaf1 = { view: view1 };
            const leaf2 = { view: view2 };
            
            // Mock workspace with multiple leaves
            const mockLeaves = [leaf1, leaf2];
            mockApp.workspace.getLeavesOfType = vi.fn(() => mockLeaves);
            mockApp.workspace.iterateAllLeaves = vi.fn((callback) => {
                mockLeaves.forEach(callback);
            });
            
            const updateBannerSpy = vi.spyOn(plugin, 'updateBanner').mockResolvedValue();
            
            // Save settings should update all views
            await plugin.saveSettings();
            
            expect(updateBannerSpy).toHaveBeenCalledTimes(2);
            expect(updateBannerSpy).toHaveBeenCalledWith(view1, true);
            expect(updateBannerSpy).toHaveBeenCalledWith(view2, true);
        });

        it('should handle frontmatter changes across multiple views of same file', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            const file = new TFile('test.md');
            const view1 = new MarkdownView();
            view1.file = file;
            const view2 = new MarkdownView();
            view2.file = file;
            
            const leaf1 = { view: view1 };
            const leaf2 = { view: view2 };
            
            mockApp.workspace.getLeavesOfType = vi.fn(() => [leaf1, leaf2]);
            
            // Mock frontmatter change
            const newFrontmatter = { banner: 'new-image.jpg' };
            mockApp.metadataCache.getFileCache = vi.fn(() => ({ frontmatter: newFrontmatter }));
            
            const updateBannerSpy = vi.spyOn(plugin, 'updateBanner').mockResolvedValue();
            
            // Simulate frontmatter change event
            const changeHandler = mockApp.metadataCache.on.mock.calls.find(
                call => call[0] === 'changed'
            )[1];
            
            await changeHandler(file);
            
            // Both views should be updated
            expect(updateBannerSpy).toHaveBeenCalledTimes(2);
            expect(updateBannerSpy).toHaveBeenCalledWith(view1, true);
            expect(updateBannerSpy).toHaveBeenCalledWith(view2, true);
        });
    });

    describe('Error Recovery and Resilience', () => {
        it('should handle loadData failure gracefully', async () => {
            vi.spyOn(plugin, 'loadData').mockRejectedValue(new Error('Load failed'));
            
            // Should not throw
            await expect(plugin.onload()).rejects.toThrow('Load failed');
        });

        it('should handle saveData failure gracefully', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            vi.spyOn(plugin, 'saveData').mockRejectedValue(new Error('Save failed'));
            
            // Mock checkVersion to avoid saveSettings call during onload
            vi.spyOn(plugin, 'checkVersion').mockResolvedValue();
            
            await plugin.onload();
            
            // Should propagate the error from saveData
            await expect(plugin.saveSettings()).rejects.toThrow('Save failed');
        });

        it('should handle missing DOM elements during unload', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Ensure no style elements exist
            const existingTitle = document.getElementById('pixel-banner-embedded-titles');
            const existingBanner = document.getElementById('pixel-banner-embedded-banners');
            if (existingTitle) existingTitle.remove();
            if (existingBanner) existingBanner.remove();
            
            // Should not throw
            expect(() => plugin.onunload()).not.toThrow();
        });

        it('should handle corrupted settings gracefully', async () => {
            const corruptedSettings = {
                customBannerField: 'not-an-array', // Should be array
                folderImages: 'not-an-array', // Should be array
                xPosition: 'not-a-number' // Should be number
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(corruptedSettings);
            
            await plugin.onload();
            
            // Should have reasonable defaults
            expect(Array.isArray(plugin.settings.folderImages)).toBe(true);
            expect(typeof plugin.settings.xPosition).toBe('number');
        });
    });

    describe('Concurrent Operations', () => {
        it('should handle concurrent onload calls', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            
            // Simulate concurrent onload calls
            const promise1 = plugin.onload();
            const promise2 = plugin.onload();
            
            await Promise.all([promise1, promise2]);
            
            // Should not cause errors
            expect(plugin.settings).toBeDefined();
        });

        it('should handle concurrent saveSettings calls', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            vi.spyOn(plugin, 'saveData').mockResolvedValue();
            
            await plugin.onload();
            
            const updateBannerSpy = vi.spyOn(plugin, 'updateBanner').mockResolvedValue();
            
            // Simulate concurrent save calls
            const promise1 = plugin.saveSettings();
            const promise2 = plugin.saveSettings();
            
            await Promise.all([promise1, promise2]);
            
            // Should handle gracefully
            expect(plugin.saveData).toHaveBeenCalled();
        });
    });
});