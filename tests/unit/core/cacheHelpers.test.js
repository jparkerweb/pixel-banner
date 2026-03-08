import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
    generateCacheKey, 
    getCacheEntriesForFile, 
    cleanupCache, 
    invalidateLeafCache 
} from '@/core/cacheHelpers.js';
import { createMockApp, MarkdownView } from 'obsidian';

// Mock URL.revokeObjectURL
global.URL.revokeObjectURL = vi.fn();

// Test context object to simulate 'this' context in cache helpers
let testContext;

describe('cacheHelpers', () => {
    beforeEach(() => {
        // Create mock app
        const mockApp = createMockApp();
        
        // Mock workspace methods
        mockApp.workspace.getLeafById = vi.fn();
        
        // Test context with mock cache and settings
        testContext = {
            app: mockApp,
            bannerStateCache: new Map(),
            MAX_CACHE_AGE: 300000, // 5 minutes
            SHUFFLE_CACHE_AGE: 60000, // 1 minute
            MAX_CACHE_ENTRIES: 100
        };
        
        vi.clearAllMocks();
    });
    
    afterEach(() => {
        vi.clearAllMocks();
        global.URL.revokeObjectURL.mockClear();
    });

    describe('generateCacheKey', () => {
        it('should generate cache key with file path and leaf ID', () => {
            const result = generateCacheKey('folder/file.md', 'leaf-123');
            expect(result).toBe('folder%2Ffile.md-leaf-123');
        });

        it('should handle special characters in file path', () => {
            const result = generateCacheKey('folder with spaces/file (1).md', 'leaf-123');
            expect(result).toBe('folder%20with%20spaces%2Ffile%20(1).md-leaf-123');
        });

        it('should add shuffle suffix when isShuffled is true', () => {
            const result = generateCacheKey('file.md', 'leaf-123', true);
            expect(result).toBe('file.md-leaf-123-shuffle');
        });

        it('should handle empty file path', () => {
            const result = generateCacheKey('', 'leaf-123');
            expect(result).toBe('-leaf-123');
        });

        it('should handle numeric characters in path', () => {
            const result = generateCacheKey('folder123/file456.md', 'leaf-789');
            expect(result).toBe('folder123%2Ffile456.md-leaf-789');
        });
    });

    describe('getCacheEntriesForFile', () => {
        beforeEach(() => {
            // Set up test cache entries
            testContext.bannerStateCache.set('file1.md-leaf1', { state: 'data1' });
            testContext.bannerStateCache.set('file1.md-leaf2', { state: 'data2' });
            testContext.bannerStateCache.set('file1.md-leaf3-shuffle', { state: 'data3' });
            testContext.bannerStateCache.set('file2.md-leaf1', { state: 'data4' });
            testContext.bannerStateCache.set('other-key', { state: 'data5' });
        });

        it('should return all cache entries for a specific file', () => {
            const result = getCacheEntriesForFile.call(testContext, 'file1.md');
            expect(result).toHaveLength(3);
            expect(result.map(([key]) => key)).toEqual([
                'file1.md-leaf1',
                'file1.md-leaf2', 
                'file1.md-leaf3-shuffle'
            ]);
        });

        it('should handle encoded file paths', () => {
            const result = getCacheEntriesForFile.call(testContext, 'file with spaces.md');
            // Should encode the path and look for matching entries
            expect(result).toHaveLength(0); // No matching entries in test data
        });

        it('should return empty array for non-existent file', () => {
            const result = getCacheEntriesForFile.call(testContext, 'nonexistent.md');
            expect(result).toHaveLength(0);
        });

        it('should handle special characters in file path', () => {
            testContext.bannerStateCache.set('folder%2Ffile%20(1).md-leaf1', { state: 'test' });
            const result = getCacheEntriesForFile.call(testContext, 'folder/file (1).md');
            expect(result).toHaveLength(1);
        });
    });

    describe('cleanupCache', () => {
        let mockLeaf, mockView, mockContentEl, mockContainer;

        beforeEach(() => {
            // Create DOM mocks
            mockContentEl = {
                querySelector: vi.fn(),
                querySelectorAll: vi.fn(() => [])
            };
            
            mockContainer = {
                querySelectorAll: vi.fn(() => [])
            };
            
            mockView = new MarkdownView();
            mockView.contentEl = mockContentEl;
            
            mockLeaf = {
                view: mockView
            };
            
            testContext.app.workspace.getLeafById = vi.fn().mockReturnValue(mockLeaf);
            mockContentEl.querySelector.mockReturnValue(mockContainer);
        });

        it('should clean up aged cache entries', () => {
            const now = Date.now();
            const oldTimestamp = now - 400000; // Older than MAX_CACHE_AGE
            
            testContext.bannerStateCache.set('old-entry', { 
                timestamp: oldTimestamp,
                state: { imageUrl: 'blob:old-url' },
                leafId: 'leaf-1'
            });
            testContext.bannerStateCache.set('new-entry', { 
                timestamp: now,
                state: { imageUrl: 'blob:new-url' },
                leafId: 'leaf-2'
            });

            cleanupCache.call(testContext);

            expect(testContext.bannerStateCache.has('old-entry')).toBe(false);
            expect(testContext.bannerStateCache.has('new-entry')).toBe(true);
            expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:old-url');
        });

        it('should use shorter timeout for shuffle images', () => {
            const now = Date.now();
            const shuffleOldTimestamp = now - 70000; // Older than SHUFFLE_CACHE_AGE but newer than MAX_CACHE_AGE
            
            testContext.bannerStateCache.set('shuffle-entry', { 
                timestamp: shuffleOldTimestamp,
                isShuffled: true,
                state: { imageUrl: 'blob:shuffle-url' },
                leafId: 'leaf-1'
            });

            cleanupCache.call(testContext);

            expect(testContext.bannerStateCache.has('shuffle-entry')).toBe(false);
            expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:shuffle-url');
        });

        it('should force cleanup all entries when force=true', () => {
            const now = Date.now();
            testContext.bannerStateCache.set('entry1', { 
                timestamp: now,
                state: { imageUrl: 'blob:url1' },
                leafId: 'leaf-1'
            });
            testContext.bannerStateCache.set('entry2', { 
                timestamp: now,
                state: { imageUrl: 'blob:url2' },
                leafId: 'leaf-2'
            });

            cleanupCache.call(testContext, true);

            expect(testContext.bannerStateCache.size).toBe(0);
            expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(2);
        });

        it('should clean up entries by size when cache exceeds limit', () => {
            testContext.MAX_CACHE_ENTRIES = 2;
            const now = Date.now();
            
            // Add entries with different timestamps
            testContext.bannerStateCache.set('oldest', { 
                timestamp: now - 3000,
                state: { imageUrl: 'blob:oldest' },
                leafId: 'leaf-1'
            });
            testContext.bannerStateCache.set('middle', { 
                timestamp: now - 2000,
                state: { imageUrl: 'blob:middle' },
                leafId: 'leaf-2'
            });
            testContext.bannerStateCache.set('newest', { 
                timestamp: now - 1000,
                state: { imageUrl: 'blob:newest' },
                leafId: 'leaf-3'
            });

            cleanupCache.call(testContext);

            expect(testContext.bannerStateCache.size).toBe(2);
            expect(testContext.bannerStateCache.has('oldest')).toBe(false);
            expect(testContext.bannerStateCache.has('middle')).toBe(true);
            expect(testContext.bannerStateCache.has('newest')).toBe(true);
        });

        it('should clean up icon overlays for removed entries', () => {
            const mockOverlay = { remove: vi.fn() };
            mockContainer.querySelectorAll.mockReturnValue([mockOverlay]);
            
            const now = Date.now();
            const oldTimestamp = now - 400000;
            
            testContext.bannerStateCache.set('old-entry', { 
                timestamp: oldTimestamp,
                state: { imageUrl: 'blob:old-url' },
                leafId: 'leaf-1'
            });

            cleanupCache.call(testContext);

            expect(mockContentEl.querySelector).toHaveBeenCalledWith('.cm-sizer');
            expect(mockContentEl.querySelector).toHaveBeenCalledWith('.markdown-preview-sizer');
            expect(mockContainer.querySelectorAll).toHaveBeenCalledWith('.banner-icon-overlay[data-persistent="true"]');
            expect(mockOverlay.remove).toHaveBeenCalled();
        });

        it('should handle missing leaf gracefully', () => {
            testContext.app.workspace.getLeafById = vi.fn().mockReturnValue(null);
            
            const now = Date.now();
            const oldTimestamp = now - 400000;
            
            testContext.bannerStateCache.set('old-entry', { 
                timestamp: oldTimestamp,
                state: { imageUrl: 'blob:old-url' },
                leafId: 'leaf-1'
            });

            expect(() => cleanupCache.call(testContext)).not.toThrow();
            expect(testContext.bannerStateCache.has('old-entry')).toBe(false);
        });

        it('should handle missing container elements gracefully', () => {
            mockContentEl.querySelector.mockReturnValue(null);
            
            const now = Date.now();
            const oldTimestamp = now - 400000;
            
            testContext.bannerStateCache.set('old-entry', { 
                timestamp: oldTimestamp,
                state: { imageUrl: 'blob:old-url' },
                leafId: 'leaf-1'
            });

            expect(() => cleanupCache.call(testContext)).not.toThrow();
            expect(testContext.bannerStateCache.has('old-entry')).toBe(false);
        });

        it('should not revoke non-blob URLs', () => {
            const now = Date.now();
            const oldTimestamp = now - 400000;
            
            testContext.bannerStateCache.set('old-entry', { 
                timestamp: oldTimestamp,
                state: { imageUrl: 'https://example.com/image.jpg' },
                leafId: 'leaf-1'
            });

            cleanupCache.call(testContext);

            expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
            expect(testContext.bannerStateCache.has('old-entry')).toBe(false);
        });
    });

    describe('invalidateLeafCache', () => {
        let mockLeaf, mockView, mockContentEl, mockContainer;

        beforeEach(() => {
            // Create DOM mocks
            mockContentEl = {
                querySelector: vi.fn(),
                querySelectorAll: vi.fn(() => [])
            };
            
            mockContainer = {
                querySelectorAll: vi.fn(() => [])
            };
            
            mockView = new MarkdownView();
            mockView.contentEl = mockContentEl;
            
            mockLeaf = {
                view: mockView
            };
            
            testContext.app.workspace.getLeafById = vi.fn().mockReturnValue(mockLeaf);
            mockContentEl.querySelector.mockReturnValue(mockContainer);
        });

        it('should invalidate all cache entries for specific leaf', () => {
            testContext.bannerStateCache.set('file1.md-leaf-123', { 
                state: { imageUrl: 'blob:url1' }
            });
            testContext.bannerStateCache.set('file2.md-leaf-123', { 
                state: { imageUrl: 'blob:url2' }
            });
            testContext.bannerStateCache.set('file1.md-leaf-456', { 
                state: { imageUrl: 'blob:url3' }
            });

            invalidateLeafCache.call(testContext, 'leaf-123');

            expect(testContext.bannerStateCache.has('file1.md-leaf-123')).toBe(false);
            expect(testContext.bannerStateCache.has('file2.md-leaf-123')).toBe(false);
            expect(testContext.bannerStateCache.has('file1.md-leaf-456')).toBe(true);
        });

        it('should clean up blob URLs for invalidated entries', () => {
            testContext.bannerStateCache.set('file.md-leaf-123', { 
                state: { imageUrl: 'blob:test-url' }
            });

            invalidateLeafCache.call(testContext, 'leaf-123');

            expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
        });

        it('should clean up icon overlays for invalidated leaf', () => {
            const mockOverlay = { remove: vi.fn() };
            mockContainer.querySelectorAll.mockReturnValue([mockOverlay]);
            
            testContext.bannerStateCache.set('file.md-leaf-123', { 
                state: { imageUrl: 'blob:test-url' }
            });

            invalidateLeafCache.call(testContext, 'leaf-123');

            expect(mockContentEl.querySelector).toHaveBeenCalledWith('.cm-sizer');
            expect(mockContentEl.querySelector).toHaveBeenCalledWith('.markdown-preview-sizer');
            expect(mockContainer.querySelectorAll).toHaveBeenCalledWith('.banner-icon-overlay[data-persistent="true"]');
            expect(mockOverlay.remove).toHaveBeenCalled();
        });

        it('should handle missing leaf gracefully', () => {
            testContext.app.workspace.getLeafById = vi.fn().mockReturnValue(null);
            
            testContext.bannerStateCache.set('file.md-leaf-123', { 
                state: { imageUrl: 'blob:test-url' }
            });

            expect(() => invalidateLeafCache.call(testContext, 'leaf-123')).not.toThrow();
            expect(testContext.bannerStateCache.has('file.md-leaf-123')).toBe(false);
        });

        it('should handle non-MarkdownView gracefully', () => {
            mockLeaf.view = { contentEl: mockContentEl }; // Not a MarkdownView instance
            
            testContext.bannerStateCache.set('file.md-leaf-123', { 
                state: { imageUrl: 'blob:test-url' }
            });

            expect(() => invalidateLeafCache.call(testContext, 'leaf-123')).not.toThrow();
            expect(testContext.bannerStateCache.has('file.md-leaf-123')).toBe(false);
        });

        it('should handle invalid cache keys gracefully', () => {
            testContext.bannerStateCache.set(null, { state: { imageUrl: 'blob:test-url' } });
            testContext.bannerStateCache.set(123, { state: { imageUrl: 'blob:test-url2' } });
            
            expect(() => invalidateLeafCache.call(testContext, 'leaf-123')).not.toThrow();
        });

        it('should not revoke non-blob URLs', () => {
            testContext.bannerStateCache.set('file.md-leaf-123', { 
                state: { imageUrl: 'https://example.com/image.jpg' }
            });

            invalidateLeafCache.call(testContext, 'leaf-123');

            expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
            expect(testContext.bannerStateCache.has('file.md-leaf-123')).toBe(false);
        });

        it('should handle entries without state or imageUrl', () => {
            testContext.bannerStateCache.set('file.md-leaf-123', { timestamp: Date.now() });
            testContext.bannerStateCache.set('file2.md-leaf-123', { state: {} });

            expect(() => invalidateLeafCache.call(testContext, 'leaf-123')).not.toThrow();
            expect(testContext.bannerStateCache.size).toBe(0);
        });
    });
});