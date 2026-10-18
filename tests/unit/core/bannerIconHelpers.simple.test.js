import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
    getIconOverlay,
    returnIconOverlay,
    shouldUpdateIconOverlay,
    handleSetBannerIcon,
    handleSetBannerIconImage
} from '@/core/bannerIconHelpers.js';
import { createMockApp, MarkdownView, TFile } from 'obsidian';

// Captures the callbacks the icon handlers give the emoji and icon image pickers
const pickerCallbacks = vi.hoisted(() => []);
const emojiCallbacks = vi.hoisted(() => []);
vi.mock('@/modal/modals.js', () => ({
    EmojiSelectionModal: vi.fn().mockImplementation((app, plugin, onChoose) => {
        emojiCallbacks.push(onChoose);
        return { open: vi.fn() };
    }),
    IconImageSelectionModal: vi.fn().mockImplementation((app, plugin, onChoose) => {
        pickerCallbacks.push(onChoose);
        return { open: vi.fn() };
    })
}));

describe('bannerIconHelpers (simplified)', () => {
    let mockPlugin;
    let mockApp;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        
        // Create mock app
        mockApp = createMockApp();
        
        // Create mock plugin with icon overlay pool
        mockPlugin = {
            app: mockApp,
            iconOverlayPool: [],
            MAX_POOL_SIZE: 10,
            settings: {
                customBannerIconField: ['banner-icon'],
                customBannerIconImageField: ['icon-image']
            }
        };
    });

    describe('getIconOverlay', () => {
        it('should return overlay from pool when available', () => {
            const poolOverlay = document.createElement('div');
            poolOverlay.className = 'banner-icon-overlay';
            mockPlugin.iconOverlayPool.push(poolOverlay);

            const result = getIconOverlay(mockPlugin);

            expect(result).toBe(poolOverlay);
            expect(mockPlugin.iconOverlayPool.length).toBe(0);
        });

        it('should create new overlay when pool is empty', () => {
            const result = getIconOverlay(mockPlugin);

            expect(result).toBeInstanceOf(HTMLElement);
            expect(result.className).toBe('banner-icon-overlay');
            expect(mockPlugin.iconOverlayPool.length).toBe(0);
        });
    });

    describe('returnIconOverlay', () => {
        it('should return overlay to pool when under max size', () => {
            const overlay = document.createElement('div');
            overlay.className = 'banner-icon-overlay';
            overlay.style.color = 'red';
            overlay.textContent = 'test';
            document.body.appendChild(overlay);

            returnIconOverlay(mockPlugin, overlay);

            expect(mockPlugin.iconOverlayPool.length).toBe(1);
            expect(overlay.style.cssText).toBe('');
            expect(overlay.textContent).toBe('');
            expect(overlay.className).toBe('banner-icon-overlay');
        });

        it('should not return overlay when pool is at max size', () => {
            // Fill pool to max
            mockPlugin.iconOverlayPool = new Array(mockPlugin.MAX_POOL_SIZE).fill(null);
            
            const overlay = document.createElement('div');
            returnIconOverlay(mockPlugin, overlay);

            expect(mockPlugin.iconOverlayPool.length).toBe(mockPlugin.MAX_POOL_SIZE);
        });

        it('should handle null overlay gracefully', () => {
            expect(() => returnIconOverlay(mockPlugin, null)).not.toThrow();
            expect(mockPlugin.iconOverlayPool.length).toBe(0);
        });
    });

    describe('shouldUpdateIconOverlay', () => {
        it('should return true when no existing overlay', () => {
            const newIconState = { icon: '📝', size: 24 };
            
            const result = shouldUpdateIconOverlay(mockPlugin, null, newIconState, 'preview');
            
            expect(result).toBe(true);
        });

        it('should return true when no new icon state', () => {
            const existingOverlay = document.createElement('div');
            
            const result = shouldUpdateIconOverlay(mockPlugin, existingOverlay, null, 'preview');
            
            expect(result).toBe(true);
        });

        it('should return true when icon content differs', () => {
            const existingOverlay = document.createElement('div');
            existingOverlay._isPersistentBannerIcon = true;
            existingOverlay.dataset.viewType = 'preview';
            existingOverlay.textContent = '📄';
            
            const newIconState = { icon: '📝', size: 24 };
            
            const result = shouldUpdateIconOverlay(mockPlugin, existingOverlay, newIconState, 'preview');
            
            expect(result).toBe(true);
        });

        it('should return true when view type differs', () => {
            const existingOverlay = document.createElement('div');
            existingOverlay._isPersistentBannerIcon = true;
            existingOverlay.dataset.viewType = 'edit';
            existingOverlay.textContent = '📝';
            
            const newIconState = { icon: '📝', size: 24 };
            
            const result = shouldUpdateIconOverlay(mockPlugin, existingOverlay, newIconState, 'preview');
            
            expect(result).toBe(true);
        });

        it('should return true when not persistent', () => {
            const existingOverlay = document.createElement('div');
            existingOverlay._isPersistentBannerIcon = false;
            existingOverlay.dataset.viewType = 'preview';
            existingOverlay.textContent = '📝';
            
            const newIconState = { icon: '📝', size: 24 };
            
            const result = shouldUpdateIconOverlay(mockPlugin, existingOverlay, newIconState, 'preview');
            
            expect(result).toBe(true);
        });
    });

    describe('handleSetBannerIconImage', () => {
        // Picks an image in the mocked modal and returns the frontmatter it wrote
        const pickImage = async (frontmatter) => {
            const activeFile = new TFile('note.md');
            mockApp.workspace.getActiveFile = vi.fn(() => activeFile);
            mockApp.workspace.getActiveViewOfType = vi.fn(() => null);
            mockApp.fileManager.processFrontMatter = vi.fn(async (file, callback) => callback(frontmatter));
            // Fire the metadata change at once so the handler does not sit out its 2s timeout
            mockApp.metadataCache.on = vi.fn((event, handler) => {
                handler(activeFile);
                return {};
            });
            mockApp.metadataCache.off = vi.fn();

            pickerCallbacks.length = 0;
            await handleSetBannerIconImage(mockPlugin);
            await pickerCallbacks[0]({ path: 'icons/star.png' });
            return frontmatter;
        };

        beforeEach(() => {
            mockPlugin.settings.imagePropertyFormat = '![[image]]';
        });

        it('writes under a second configured name the note already uses, and adds no primary name', async () => {
            mockPlugin.settings.customBannerIconImageField = ['icon-image', 'banner-icon-image'];

            const frontmatter = await pickImage({ title: 'Note', 'banner-icon-image': '![[old.png]]' });

            expect(frontmatter['banner-icon-image']).toBe('![[icons/star.png]]');
            expect(frontmatter).not.toHaveProperty('icon-image');
            expect(frontmatter.title).toBe('Note');
        });

        it('writes the primary name when the note uses none of the names', async () => {
            mockPlugin.settings.customBannerIconImageField = ['icon-image, banner-icon-image'];

            const frontmatter = await pickImage({ title: 'Note' });

            expect(frontmatter['icon-image']).toBe('![[icons/star.png]]');
            expect(frontmatter).not.toHaveProperty('banner-icon-image');
        });

        it('refreshes the banner once the link-format value reaches the metadata cache', async () => {
            mockPlugin.settings.customBannerIconImageField = ['icon-image'];
            mockPlugin.updateBanner = vi.fn(() => Promise.resolve());
            const frontmatter = {};
            mockApp.metadataCache.getFileCache = vi.fn(() => ({ frontmatter }));
            mockApp.workspace.getActiveViewOfType = vi.fn(() => new MarkdownView());
            const activeFile = new TFile('note.md');
            mockApp.workspace.getActiveFile = vi.fn(() => activeFile);
            mockApp.fileManager.processFrontMatter = vi.fn(async (file, callback) => callback(frontmatter));
            mockApp.metadataCache.on = vi.fn((event, handler) => {
                handler(activeFile);
                return {};
            });
            mockApp.metadataCache.off = vi.fn();

            pickerCallbacks.length = 0;
            await handleSetBannerIconImage(mockPlugin);
            await pickerCallbacks[0]({ path: 'icons/star.png' });

            expect(frontmatter['icon-image']).toBe('![[icons/star.png]]');
            expect(mockPlugin.updateBanner).toHaveBeenCalled();
        });
    });

    describe('handleSetBannerIcon', () => {
        // Picks an emoji (or '' to remove it) and returns the frontmatter written
        const pickEmoji = async (emoji, frontmatter) => {
            const activeFile = new TFile('note.md');
            mockApp.workspace.getActiveFile = vi.fn(() => activeFile);
            mockApp.workspace.getActiveViewOfType = vi.fn(() => null);
            mockApp.fileManager.processFrontMatter = vi.fn(async (file, callback) => callback(frontmatter));
            mockApp.metadataCache.on = vi.fn((event, handler) => {
                handler(activeFile);
                return {};
            });
            mockApp.metadataCache.off = vi.fn();

            emojiCallbacks.length = 0;
            await handleSetBannerIcon(mockPlugin);
            await emojiCallbacks[0](emoji);
            return frontmatter;
        };

        it('writes to the first comma-separated name, never a key named "banner-icon, icon"', async () => {
            mockPlugin.settings.customBannerIconField = ['banner-icon, icon'];

            const frontmatter = await pickEmoji('🚀', { title: 'Note' });

            expect(frontmatter['banner-icon']).toBe('🚀');
            expect(frontmatter).not.toHaveProperty('banner-icon, icon');
            expect(frontmatter.title).toBe('Note');
        });

        it('writes under a second configured name the note already uses', async () => {
            mockPlugin.settings.customBannerIconField = ['banner-icon', 'icon'];

            const frontmatter = await pickEmoji('🚀', { icon: '📝' });

            expect(frontmatter).toEqual({ icon: '🚀' });
        });

        it('removing the emoji clears it under every configured name', async () => {
            mockPlugin.settings.customBannerIconField = ['banner-icon, icon'];

            const frontmatter = await pickEmoji('', { icon: '📝', title: 'Note' });

            expect(frontmatter).toEqual({ title: 'Note' });
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle missing icon overlay pool', () => {
            delete mockPlugin.iconOverlayPool;
            
            expect(() => getIconOverlay(mockPlugin)).toThrow();
        });

        it('should handle invalid icon state in shouldUpdate', () => {
            const existingOverlay = document.createElement('div');
            existingOverlay._isPersistentBannerIcon = true;
            existingOverlay.dataset.viewType = 'preview';
            existingOverlay.textContent = '📝';
            
            const invalidIconState = {}; // Missing required properties
            
            // Should not throw, should handle gracefully
            const result = shouldUpdateIconOverlay(mockPlugin, existingOverlay, invalidIconState, 'preview');
            
            expect(typeof result).toBe('boolean');
        });
    });
});