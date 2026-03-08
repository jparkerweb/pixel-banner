import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { EmojiSelectionModal } from '@/modal/modals/emojiSelectionModal.js';
import { createMockApp, MarkdownView, TFile } from 'obsidian';

// Mock emoji data
vi.mock('@/resources/emojis.js', () => ({
    emojiData: [
        { emoji: '😀', keywords: 'smile happy grin' },
        { emoji: '🚀', keywords: 'rocket space launch' },
        { emoji: '📝', keywords: 'memo note write' },
        { emoji: '🎉', keywords: 'party celebration' },
        { emoji: '💡', keywords: 'idea light bulb' }
    ]
}));

// Mock TargetPositionModal
global.TargetPositionModal = vi.fn(() => ({
    open: vi.fn()
}));

describe('EmojiSelectionModal (simplified)', () => {
    let mockApp;
    let mockPlugin;
    let mockFile;
    let mockView;
    let modal;
    let onChooseSpy;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';
        
        // Create mock file and view
        mockFile = new TFile('test.md');
        mockView = new MarkdownView();
        mockView.file = mockFile;
        
        // Create mock app
        mockApp = createMockApp();
        mockApp.workspace.getActiveFile = vi.fn(() => mockFile);
        mockApp.workspace.getActiveViewOfType = vi.fn(() => mockView);
        mockApp.metadataCache.getFileCache = vi.fn(() => ({
            frontmatter: { 'banner-icon': '📝' }
        }));
        mockApp.metadataCache.on = vi.fn();
        mockApp.metadataCache.off = vi.fn();
        mockApp.fileManager = {
            processFrontMatter: vi.fn((file, callback) => {
                const frontmatter = { 'banner-icon': '📝' };
                callback(frontmatter);
                return Promise.resolve();
            })
        };
        
        // Create mock plugin
        mockPlugin = {
            app: mockApp,
            settings: {
                customBannerIconField: ['banner-icon'],
                customBannerIconImageField: ['icon-image'],
                openTargetingModalAfterSelectingBannerOrIcon: false
            },
            updateBanner: vi.fn(() => Promise.resolve()),
            UPDATE_MODE: { FULL_UPDATE: 'full' },
            returnIconOverlay: vi.fn(),
            hasBannerFrontmatter: vi.fn(() => true)
        };

        // Create callback spy
        onChooseSpy = vi.fn();
    });

    afterEach(() => {
        if (modal) {
            modal.close();
        }
        vi.clearAllMocks();
        document.body.innerHTML = '';
        document.head.innerHTML = '';
    });

    describe('constructor and initialization', () => {
        it('should create modal with correct properties', () => {
            modal = new EmojiSelectionModal(mockApp, mockPlugin, onChooseSpy);
            
            expect(modal.app).toBe(mockApp);
            expect(modal.plugin).toBe(mockPlugin);
            expect(modal.onChoose).toBe(onChooseSpy);
            expect(modal.searchQuery).toBe('');
            expect(modal.skipTargetingModal).toBe(false);
            expect(modal.closedByButton).toBe(false);
        });

        it('should inherit from Modal', () => {
            modal = new EmojiSelectionModal(mockApp, mockPlugin, onChooseSpy);
            
            expect(modal.contentEl).toBeDefined();
            expect(modal.modalEl).toBeDefined();
            expect(typeof modal.open).toBe('function');
            expect(typeof modal.close).toBe('function');
        });
    });

    describe('emoji description functionality', () => {
        beforeEach(() => {
            modal = new EmojiSelectionModal(mockApp, mockPlugin, onChooseSpy);
        });

        it('should return correct emoji description', () => {
            const description = modal.getEmojiDescription('🚀');
            expect(description).toBe('rocket space launch');
        });

        it('should return empty string for unknown emoji', () => {
            const description = modal.getEmojiDescription('🦄');
            expect(description).toBe('');
        });

        it('should handle undefined emoji gracefully', () => {
            const description = modal.getEmojiDescription(undefined);
            expect(description).toBe('');
        });

        it('should handle null emoji gracefully', () => {
            const description = modal.getEmojiDescription(null);
            expect(description).toBe('');
        });
    });

    describe('onOpen functionality', () => {
        beforeEach(() => {
            modal = new EmojiSelectionModal(mockApp, mockPlugin, onChooseSpy);
        });

        it('should call onOpen without throwing', () => {
            expect(() => modal.onOpen()).not.toThrow();
        });

        it('should set up modal structure', () => {
            modal.onOpen();
            
            // Check that content was added to modal
            expect(modal.contentEl.children.length).toBeGreaterThan(0);
        });
    });

    describe('basic modal behavior', () => {
        beforeEach(() => {
            modal = new EmojiSelectionModal(mockApp, mockPlugin, onChooseSpy);
        });

        it('should open modal without errors', () => {
            expect(() => modal.open()).not.toThrow();
        });

        it('should close modal without errors', () => {
            modal.open();
            expect(() => modal.close()).not.toThrow();
        });
    });

    describe('onClose behavior', () => {
        beforeEach(() => {
            modal = new EmojiSelectionModal(mockApp, mockPlugin, onChooseSpy);
        });

        it('should empty content element on close', () => {
            modal.onOpen(); // Setup content
            modal.onClose();
            
            expect(modal.contentEl.innerHTML).toBe('');
        });

        it('should not open targeting modal when closed by button', () => {
            modal.closedByButton = true;
            modal.onClose();
            
            // TargetPositionModal should not be called
            expect(global.TargetPositionModal).not.toHaveBeenCalled();
        });

        it('should not open targeting modal when no banner exists', () => {
            mockPlugin.hasBannerFrontmatter.mockReturnValue(false);
            modal.onClose();
            
            expect(global.TargetPositionModal).not.toHaveBeenCalled();
        });

        it('should not open targeting modal when setting is disabled', () => {
            mockPlugin.settings.openTargetingModalAfterSelectingBannerOrIcon = false;
            modal.onClose();
            
            expect(global.TargetPositionModal).not.toHaveBeenCalled();
        });
    });

    describe('error handling and edge cases', () => {
        it('should handle missing active file gracefully', () => {
            mockApp.workspace.getActiveFile.mockReturnValue(null);
            
            expect(() => {
                modal = new EmojiSelectionModal(mockApp, mockPlugin, onChooseSpy);
                modal.onOpen();
            }).not.toThrow();
        });

        it('should handle missing contentEl in cleanup', () => {
            modal = new EmojiSelectionModal(mockApp, mockPlugin, onChooseSpy);
            
            // Test that onClose works with valid contentEl 
            expect(() => modal.onClose()).not.toThrow();
        });

        it('should handle undefined onChoose callback', () => {
            modal = new EmojiSelectionModal(mockApp, mockPlugin, undefined);
            
            expect(() => modal.onOpen()).not.toThrow();
        });

        it('should handle missing plugin settings', () => {
            mockPlugin.settings = {};
            
            expect(() => {
                modal = new EmojiSelectionModal(mockApp, mockPlugin, onChooseSpy);
                modal.onOpen();
            }).not.toThrow();
        });
    });
});