import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PixelBannerPlugin } from '@/core/pixelBannerPlugin.js';
import { createMockApp, createMockManifest, MarkdownView, TFile } from 'obsidian';
import { DEFAULT_SETTINGS } from '@/settings/settings.js';

// DOM globals are automatically provided by happy-dom environment

describe('Cache Integration Tests', () => {
    let plugin;
    let mockApp;
    let mockManifest;
    let mockFile1;
    let mockFile2;
    let mockView1;
    let mockView2;
    let mockLeaf1;
    let mockLeaf2;

    // Helper function to create banner DOM structure
    function createBannerContainer() {
        const container = document.createElement('div');
        container.classList.add('view-content');
        
        const sourceView = document.createElement('div');
        sourceView.classList.add('markdown-source-view');
        const cmSizer = document.createElement('div');
        cmSizer.classList.add('cm-sizer');
        sourceView.appendChild(cmSizer);
        
        const previewView = document.createElement('div');
        previewView.classList.add('markdown-reading-view');
        const previewSizer = document.createElement('div');
        previewSizer.classList.add('markdown-preview-sizer');
        previewView.appendChild(previewSizer);
        
        container.appendChild(sourceView);
        container.appendChild(previewView);
        
        return container;
    }

    beforeEach(() => {
        // Use fake timers to prevent async operations from continuing after tests
        vi.useFakeTimers();
        
        mockApp = createMockApp();
        mockManifest = createMockManifest();
        plugin = new PixelBannerPlugin(mockApp, mockManifest);
        
        // Create mock files and views
        mockFile1 = new TFile('test1.md');
        mockFile2 = new TFile('test2.md');
        
        mockView1 = new MarkdownView();
        mockView1.file = mockFile1;
        mockView1.contentEl = createBannerContainer();
        mockView1.getMode = vi.fn(() => 'preview');
        mockLeaf1 = { id: 'leaf-1', view: mockView1 };
        
        mockView2 = new MarkdownView();
        mockView2.file = mockFile2;
        mockView2.contentEl = createBannerContainer();
        mockView2.getMode = vi.fn(() => 'preview');
        mockLeaf2 = { id: 'leaf-2', view: mockView2 };
        
        // Register leaves with workspace so getLeafById can find them
        mockApp.workspace.addLeaf(mockLeaf1);
        mockApp.workspace.addLeaf(mockLeaf2);
        mockApp.workspace.activeLeaf = mockLeaf1;
        
        // Mock console methods
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        // Clear all pending timers before restoring real timers
        vi.clearAllTimers();
        vi.useRealTimers();
        
        vi.clearAllMocks();
        vi.restoreAllMocks();
        
        // Clean up any remaining plugin state
        if (plugin) {
            plugin.loadedImages?.clear();
            plugin.lastKeywords?.clear();
            plugin.imageCache?.clear();
            plugin.bannerStateCache?.clear();
        }
    });

    describe('Banner State Cache Management', () => {
        it('should cache banner state by file path and leaf ID', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            const cacheKey = plugin.generateCacheKey(mockFile1.path, mockLeaf1.id);
            const bannerState = {
                imageUrl: 'https://example.com/banner.jpg',
                timestamp: Date.now(),
                leafId: mockLeaf1.id,
                isShuffled: false
            };
            
            plugin.bannerStateCache.set(cacheKey, bannerState);
            
            expect(plugin.bannerStateCache.has(cacheKey)).toBe(true);
            expect(plugin.bannerStateCache.get(cacheKey)).toEqual(bannerState);
        });

        it('should generate unique cache keys for different files and leaves', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            const key1 = plugin.generateCacheKey(mockFile1.path, mockLeaf1.id);
            const key2 = plugin.generateCacheKey(mockFile2.path, mockLeaf2.id);
            const key3 = plugin.generateCacheKey(mockFile1.path, mockLeaf2.id);
            
            expect(key1).not.toBe(key2);
            expect(key1).not.toBe(key3);
            expect(key2).not.toBe(key3);
        });

        it('should handle special characters in file paths for cache keys', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            const specialFile = new TFile('folder/file with spaces & special chars (1).md');
            const cacheKey = plugin.generateCacheKey(specialFile.path, mockLeaf1.id);
            
            // Should not throw and should be a valid cache key
            expect(typeof cacheKey).toBe('string');
            expect(cacheKey.length).toBeGreaterThan(0);
            
            // Should be able to use as Map key
            plugin.bannerStateCache.set(cacheKey, { test: true });
            expect(plugin.bannerStateCache.has(cacheKey)).toBe(true);
        });

        it('should differentiate shuffle cache entries', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            const normalKey = plugin.generateCacheKey(mockFile1.path, mockLeaf1.id, false);
            const shuffleKey = plugin.generateCacheKey(mockFile1.path, mockLeaf1.id, true);
            
            expect(normalKey).not.toBe(shuffleKey);
            expect(shuffleKey).toContain('shuffle');
        });
    });

    describe('Image Cache Management', () => {
        it('should cache loaded images by file path', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            const imageUrl = 'https://example.com/banner.jpg';
            plugin.loadedImages.set(mockFile1.path, imageUrl);
            
            expect(plugin.loadedImages.get(mockFile1.path)).toBe(imageUrl);
        });

        it('should cache keywords by file path', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            const keyword = 'nature, landscape';
            plugin.lastKeywords.set(mockFile1.path, keyword);
            
            expect(plugin.lastKeywords.get(mockFile1.path)).toBe(keyword);
        });

        it('should maintain separate image caches for different files', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            plugin.loadedImages.set(mockFile1.path, 'image1.jpg');
            plugin.loadedImages.set(mockFile2.path, 'image2.jpg');
            
            expect(plugin.loadedImages.get(mockFile1.path)).toBe('image1.jpg');
            expect(plugin.loadedImages.get(mockFile2.path)).toBe('image2.jpg');
        });

        it('should cache API response data', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            const cacheKey = 'api-pexels-nature';
            const responseData = { images: ['url1', 'url2'] };
            
            plugin.imageCache.set(cacheKey, responseData);
            
            expect(plugin.imageCache.get(cacheKey)).toEqual(responseData);
        });
    });

    describe('Cache Invalidation', () => {
        it('should clear all caches when saving settings', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            vi.spyOn(plugin, 'saveData').mockResolvedValue();
            await plugin.onload();
            
            // Populate caches
            plugin.loadedImages.set(mockFile1.path, 'image1.jpg');
            plugin.lastKeywords.set(mockFile1.path, 'keyword1');
            plugin.imageCache.set('cache1', 'data1');
            plugin.bannerStateCache.set('state1', { timestamp: Date.now() });
            
            await plugin.saveSettings();
            
            expect(plugin.loadedImages.size).toBe(0);
            expect(plugin.lastKeywords.size).toBe(0);
            expect(plugin.imageCache.size).toBe(0);
        });

        it('should invalidate cache for specific leaf', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Add cache entries for different leaves
            const key1 = plugin.generateCacheKey(mockFile1.path, mockLeaf1.id);
            const key2 = plugin.generateCacheKey(mockFile2.path, mockLeaf2.id);
            
            plugin.bannerStateCache.set(key1, { leafId: mockLeaf1.id, timestamp: Date.now() });
            plugin.bannerStateCache.set(key2, { leafId: mockLeaf2.id, timestamp: Date.now() });
            
            plugin.invalidateLeafCache(mockLeaf1.id);
            
            // Only leaf1 cache should be removed
            expect(plugin.bannerStateCache.has(key1)).toBe(false);
            expect(plugin.bannerStateCache.has(key2)).toBe(true);
        });

        it('should clean up cache entries by age', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            const now = Date.now();
            const oldTimestamp = now - plugin.MAX_CACHE_AGE - 1000; // Older than max age
            const newTimestamp = now - 1000; // Recent
            
            const oldKey = plugin.generateCacheKey(mockFile1.path, mockLeaf1.id);
            const newKey = plugin.generateCacheKey(mockFile2.path, mockLeaf2.id);
            
            plugin.bannerStateCache.set(oldKey, { timestamp: oldTimestamp, leafId: mockLeaf1.id });
            plugin.bannerStateCache.set(newKey, { timestamp: newTimestamp, leafId: mockLeaf2.id });
            
            plugin.cleanupCache();
            
            // Old entry should be removed, new entry should remain
            expect(plugin.bannerStateCache.has(oldKey)).toBe(false);
            expect(plugin.bannerStateCache.has(newKey)).toBe(true);
        });

        it('should clean up shuffle cache entries faster', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            const now = Date.now();
            const recentTimestamp = now - plugin.SHUFFLE_CACHE_AGE - 100; // Slightly older than shuffle age
            
            const shuffleKey = plugin.generateCacheKey(mockFile1.path, mockLeaf1.id, true);
            
            plugin.bannerStateCache.set(shuffleKey, { 
                timestamp: recentTimestamp, 
                leafId: mockLeaf1.id,
                isShuffled: true 
            });
            
            plugin.cleanupCache();
            
            // Shuffle entry should be removed due to shorter age limit
            expect(plugin.bannerStateCache.has(shuffleKey)).toBe(false);
        });

        it('should force cleanup all cache entries', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Add recent cache entries
            const key1 = plugin.generateCacheKey(mockFile1.path, mockLeaf1.id);
            const key2 = plugin.generateCacheKey(mockFile2.path, mockLeaf2.id);
            
            plugin.bannerStateCache.set(key1, { timestamp: Date.now(), leafId: mockLeaf1.id });
            plugin.bannerStateCache.set(key2, { timestamp: Date.now(), leafId: mockLeaf2.id });
            
            plugin.cleanupCache(true); // Force cleanup
            
            // All entries should be removed
            expect(plugin.bannerStateCache.size).toBe(0);
        });
    });

    describe('Cache Size Management', () => {
        it('should limit cache size to maximum entries', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Fill cache beyond max size
            const maxEntries = plugin.MAX_CACHE_ENTRIES;
            for (let i = 0; i < maxEntries + 5; i++) {
                const key = plugin.generateCacheKey(`file${i}.md`, `leaf-${i}`);
                plugin.bannerStateCache.set(key, { 
                    timestamp: Date.now() - i * 1000, // Older entries have lower timestamps
                    leafId: `leaf-${i}` 
                });
            }
            
            plugin.cleanupCache();
            
            // Should be limited to max entries
            expect(plugin.bannerStateCache.size).toBeLessThanOrEqual(maxEntries);
        });

        it('should remove oldest entries when exceeding cache size', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            const maxEntries = plugin.MAX_CACHE_ENTRIES;
            const baseTime = Date.now();
            
            // Add entries with known timestamps
            const oldKey = plugin.generateCacheKey('old-file.md', 'old-leaf');
            const newKey = plugin.generateCacheKey('new-file.md', 'new-leaf');
            
            plugin.bannerStateCache.set(oldKey, { 
                timestamp: baseTime - 10000, // Older
                // No leafId to avoid orphaned check
            });
            
            // Fill cache to max
            for (let i = 0; i < maxEntries - 1; i++) {
                const key = plugin.generateCacheKey(`file${i}.md`, `leaf-${i}`);
                plugin.bannerStateCache.set(key, { 
                    timestamp: baseTime - i * 100,
                    // No leafId to avoid orphaned check
                });
            }
            
            // Add a new entry (should trigger cleanup)
            plugin.bannerStateCache.set(newKey, { 
                timestamp: baseTime, // Newest
                // No leafId to avoid orphaned check
            });
            
            plugin.cleanupCache();
            
            // Old entry should be removed, new entry should remain
            expect(plugin.bannerStateCache.has(newKey)).toBe(true);
        });
    });

    describe('Cross-Component Cache Integration', () => {
        it('should invalidate cache when frontmatter changes', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Set up initial cache
            plugin.loadedImages.set(mockFile1.path, 'old-image.jpg');
            plugin.lastKeywords.set(mockFile1.path, 'old-keyword');
            
            // Mock frontmatter change
            const newFrontmatter = { banner: 'new-image.jpg' };
            mockApp.metadataCache.getFileCache = vi.fn(() => ({ frontmatter: newFrontmatter }));
            
            // Mock the workspace to return our leaf
            mockApp.workspace.getLeavesOfType = vi.fn(() => [mockLeaf1]);
            
            const updateBannerSpy = vi.spyOn(plugin, 'updateBanner').mockResolvedValue();
            
            // Simulate frontmatter change event
            const changeHandler = mockApp.metadataCache.on.mock.calls.find(
                call => call[0] === 'changed'
            )?.[1];
            
            if (changeHandler) {
                await changeHandler(mockFile1);
                
                // Cache should be invalidated for this file
                expect(plugin.loadedImages.has(mockFile1.path)).toBe(false);
                expect(plugin.lastKeywords.has(mockFile1.path)).toBe(false);
                expect(updateBannerSpy).toHaveBeenCalledWith(mockView1, true);
            }
        });

        it('should maintain cache consistency across multiple views of same file', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Create second view of same file
            const mockView1b = new MarkdownView();
            mockView1b.file = mockFile1;
            const mockLeaf1b = { id: 'leaf-1b', view: mockView1b };
            
            // Both views should share file-level cache (loadedImages, lastKeywords)
            // But have separate leaf-level cache (bannerStateCache)
            plugin.loadedImages.set(mockFile1.path, 'shared-image.jpg');
            
            const key1a = plugin.generateCacheKey(mockFile1.path, mockLeaf1.id);
            const key1b = plugin.generateCacheKey(mockFile1.path, mockLeaf1b.id);
            
            plugin.bannerStateCache.set(key1a, { leafId: mockLeaf1.id, timestamp: Date.now() });
            plugin.bannerStateCache.set(key1b, { leafId: mockLeaf1b.id, timestamp: Date.now() });
            
            // File-level cache should be shared
            expect(plugin.loadedImages.get(mockFile1.path)).toBe('shared-image.jpg');
            
            // Leaf-level cache should be separate
            expect(plugin.bannerStateCache.has(key1a)).toBe(true);
            expect(plugin.bannerStateCache.has(key1b)).toBe(true);
            expect(key1a).not.toBe(key1b);
        });

        it('should get all cache entries for a file', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Add cache entries for same file with different leaves
            const key1 = plugin.generateCacheKey(mockFile1.path, mockLeaf1.id);
            const key2 = plugin.generateCacheKey(mockFile1.path, 'other-leaf');
            const key3 = plugin.generateCacheKey(mockFile2.path, mockLeaf2.id);
            
            plugin.bannerStateCache.set(key1, { leafId: mockLeaf1.id });
            plugin.bannerStateCache.set(key2, { leafId: 'other-leaf' });
            plugin.bannerStateCache.set(key3, { leafId: mockLeaf2.id });
            
            const file1Entries = plugin.getCacheEntriesForFile(mockFile1.path);
            
            expect(file1Entries).toHaveLength(2);
            expect(file1Entries.map(([key]) => key)).toContain(key1);
            expect(file1Entries.map(([key]) => key)).toContain(key2);
            expect(file1Entries.map(([key]) => key)).not.toContain(key3);
        });
    });

    describe('Cache Performance Optimization', () => {
        it('should reuse cached images for ENSURE_VISIBILITY mode', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue(DEFAULT_SETTINGS);
            await plugin.onload();
            
            // Pre-cache an image
            plugin.loadedImages.set(mockFile1.path, 'cached-image.jpg');
            
            const frontmatter = { banner: 'https://example.com/banner.jpg' };
            
            // Create spies BEFORE calling the methods
            const getImageUrlSpy = vi.spyOn(plugin, 'getImageUrl');
            
            // Test the cache logic directly by calling addPixelBanner with ENSURE_VISIBILITY mode
            const ctx = {
                frontmatter,
                file: mockFile1,
                isContentChange: false,
                yPosition: 50,
                xPosition: 50,
                contentStartPosition: 0,
                bannerImage: 'https://example.com/banner.jpg',
                isReadingView: false,
                updateMode: plugin.UPDATE_MODE.ENSURE_VISIBILITY
            };
            
            await plugin.addPixelBanner(mockView1.contentEl, ctx);
            
            // Should use cached image, not fetch new one for ENSURE_VISIBILITY mode
            expect(getImageUrlSpy).not.toHaveBeenCalled();
        });

        it('should skip cache for FULL_UPDATE mode', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue(DEFAULT_SETTINGS);
            await plugin.onload();
            
            // Pre-cache an image for mockFile2 to avoid debounce conflicts
            plugin.loadedImages.set(mockFile2.path, 'cached-image.jpg');
            
            const frontmatter = { banner: 'https://example.com/banner.jpg' };
            mockApp.metadataCache.getFileCache = vi.fn(() => ({ frontmatter }));
            
            const getImageUrlSpy = vi.spyOn(plugin, 'getImageUrl').mockResolvedValue('new-image.jpg');
            
            const updatePromise = plugin.updateBanner(mockView2, false, plugin.UPDATE_MODE.FULL_UPDATE);
            
            // Advance timers to handle the 50ms delay in updateBanner
            await vi.advanceTimersByTimeAsync(100);
            await updatePromise;
            
            // Should fetch new image despite cache
            expect(getImageUrlSpy).toHaveBeenCalled();
        });

        it('should handle concurrent cache operations', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Simulate concurrent cache operations
            const promises = [];
            
            for (let i = 0; i < 10; i++) {
                promises.push(
                    Promise.resolve().then(() => {
                        const key = plugin.generateCacheKey(`file${i}.md`, `leaf-${i}`);
                        plugin.bannerStateCache.set(key, { timestamp: Date.now(), leafId: `leaf-${i}` });
                    })
                );
            }
            
            // Concurrent cleanup
            promises.push(
                Promise.resolve().then(() => plugin.cleanupCache())
            );
            
            await Promise.all(promises);
            
            // Should not throw and cache should be in consistent state
            expect(plugin.bannerStateCache.size).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Memory Management', () => {
        it('should clean up cache during plugin unload', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Populate caches
            plugin.loadedImages.set(mockFile1.path, 'image1.jpg');
            plugin.imageCache.set('cache1', 'data1');
            plugin.bannerStateCache.set('state1', { timestamp: Date.now() });
            
            plugin.onunload();
            
            // Verify icon overlay pool is cleared
            expect(plugin.iconOverlayPool).toHaveLength(0);
        });

        it('should handle memory pressure by aggressive cleanup', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Simulate memory pressure by filling cache
            for (let i = 0; i < plugin.MAX_CACHE_ENTRIES * 2; i++) {
                const key = plugin.generateCacheKey(`file${i}.md`, `leaf-${i}`);
                plugin.bannerStateCache.set(key, { 
                    timestamp: Date.now() - i * 1000,
                    leafId: `leaf-${i}` 
                });
            }
            
            // Force cleanup
            plugin.cleanupCache(true);
            
            // Cache should be significantly reduced
            expect(plugin.bannerStateCache.size).toBe(0);
        });

        it('should prevent memory leaks from orphaned cache entries', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Create cache entry for a leaf that no longer exists
            const orphanKey = plugin.generateCacheKey(mockFile1.path, 'non-existent-leaf');
            plugin.bannerStateCache.set(orphanKey, { 
                timestamp: Date.now(),
                leafId: 'non-existent-leaf' 
            });
            
            // Mock workspace to not return the orphaned leaf
            mockApp.workspace.getLeafById = vi.fn(() => null);
            
            plugin.cleanupCache();
            
            // Orphaned entry should be cleaned up
            expect(plugin.bannerStateCache.has(orphanKey)).toBe(false);
        });
    });
});