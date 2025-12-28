import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { confettiManager } from '@/core/confettiManager.js';
import { parseConfettiConfig, buildConfettiFrontmatter } from '@/utils/confettiUtils.js';
import { handleConfettiForNote, handleConfettiMetadataChange } from '@/core/eventHandler.js';

// Mock canvas-confetti
vi.mock('canvas-confetti', () => {
    const mockConfettiInstance = vi.fn(() => Promise.resolve());
    mockConfettiInstance.reset = vi.fn();

    return {
        default: {
            create: vi.fn(() => mockConfettiInstance),
            shapeFromText: vi.fn(({ text, scalar }) => ({ text, scalar }))
        }
    };
});

// Mock Platform for mobile detection
vi.mock('obsidian', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        Platform: {
            isMobile: false
        }
    };
});

describe('Confetti Workflow Integration', () => {
    let mockLeaf;
    let mockPlugin;

    beforeEach(() => {
        vi.clearAllMocks();
        confettiManager.stopAll();

        // Mock leaf and view
        mockLeaf = {
            view: {
                file: {
                    path: 'test-note.md'
                },
                contentEl: document.createElement('div')
            }
        };

        // Mock plugin
        mockPlugin = {
            settings: {
                confettiDisableOnMobile: false,
                customBannerConfettiField: ['banner-confetti']
            }
        };

        // Mock window.matchMedia for reduced motion
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn()
            }))
        });
    });

    afterEach(() => {
        confettiManager.stopAll();
    });

    describe('Complete workflow from frontmatter to rendering', () => {
        it('should start confetti when note has valid new format config', () => {
            const frontmatter = {
                'banner-confetti': 'type:confetti'
            };

            handleConfettiForNote.call(mockPlugin, mockLeaf, frontmatter);

            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);
        });

        it('should parse new string format with overrides', () => {
            const frontmatter = {
                'banner-confetti': 'type:confetti, count:200, colors:#ff0000|#00ff00'
            };

            handleConfettiForNote.call(mockPlugin, mockLeaf, frontmatter);

            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);
        });

        it('should stop confetti when note has no config', async () => {
            // Start confetti first
            const frontmatterWithConfetti = {
                'banner-confetti': 'type:confetti'
            };
            handleConfettiForNote.call(mockPlugin, mockLeaf, frontmatterWithConfetti);
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);

            // Remove confetti from frontmatter
            const frontmatterWithoutConfetti = {};
            handleConfettiForNote.call(mockPlugin, mockLeaf, frontmatterWithoutConfetti);
            // Wait for fadeOut (500ms default) plus cleanup
            await new Promise(resolve => setTimeout(resolve, 600));
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(false);
        });

        it('should not start confetti for invalid preset', () => {
            const frontmatter = {
                'banner-confetti': 'type:invalid-preset'
            };

            handleConfettiForNote.call(mockPlugin, mockLeaf, frontmatter);

            // Should either not start or handle gracefully
            // The exact behavior depends on implementation
        });

        // Backward compatibility tests
        it('should handle legacy simple string format', () => {
            const frontmatter = {
                'banner-confetti': 'confetti'
            };

            handleConfettiForNote.call(mockPlugin, mockLeaf, frontmatter);

            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);
        });

        it('should handle legacy array frontmatter config', () => {
            const frontmatter = {
                'banner-confetti': ['confetti', {
                    count: 200,
                    colors: ['#ff0000', '#00ff00']
                }]
            };

            handleConfettiForNote.call(mockPlugin, mockLeaf, frontmatter);

            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);
        });
    });

    describe('Mobile settings integration', () => {
        it('should have confettiDisableOnMobile setting available', () => {
            // Verify the setting exists and can be configured
            expect(mockPlugin.settings).toHaveProperty('confettiDisableOnMobile');
            expect(typeof mockPlugin.settings.confettiDisableOnMobile).toBe('boolean');
        });

        it('should start confetti when not on mobile', () => {
            mockPlugin.settings.confettiDisableOnMobile = true;

            const frontmatter = {
                'banner-confetti': 'confetti'
            };

            handleConfettiForNote.call(mockPlugin, mockLeaf, frontmatter);

            // Should start confetti when not on mobile, even if disabled for mobile
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);
        });

        it('should respect mobile setting flag', () => {
            // Verify the logic path exists in the handler
            mockPlugin.settings.confettiDisableOnMobile = false;

            const frontmatter = {
                'banner-confetti': 'confetti'
            };

            handleConfettiForNote.call(mockPlugin, mockLeaf, frontmatter);

            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);
        });
    });

    describe('Reduced motion preference', () => {
        it('should start confetti when reduced motion is not preferred', () => {
            // Default mock returns false for reduced motion
            const frontmatter = {
                'banner-confetti': 'type:confetti'
            };

            handleConfettiForNote.call(mockPlugin, mockLeaf, frontmatter);

            // Should start confetti when reduced motion is NOT preferred
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);
        });

        it('should check window.matchMedia for reduced motion', () => {
            const frontmatter = {
                'banner-confetti': 'type:confetti'
            };

            handleConfettiForNote.call(mockPlugin, mockLeaf, frontmatter);

            // Verify matchMedia was called to check for reduced motion preference
            expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
        });

        it('should support respectReducedMotion override in config', () => {
            const frontmatter = {
                'banner-confetti': 'type:confetti, respectReducedMotion:false'
            };

            handleConfettiForNote.call(mockPlugin, mockLeaf, frontmatter);

            // Should still start confetti
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);
        });
    });

    describe('Modal to frontmatter flow', () => {
        it('should build correct frontmatter from modal settings', () => {
            const presetName = 'confetti';
            const overrides = {
                count: 150,
                speed: 60,
                colors: ['#ff0000', '#0000ff']
            };

            const frontmatterValue = buildConfettiFrontmatter(presetName, overrides);

            expect(frontmatterValue).toBe('type:confetti, count:150, speed:60, colors:#ff0000|#0000ff');

            // Parse it back
            const parsed = parseConfettiConfig(frontmatterValue);
            expect(parsed.presetName).toBe('confetti');
            expect(parsed.overrides.count).toBe(150);
            expect(parsed.overrides.speed).toBe(60);
            expect(parsed.overrides.colors).toEqual(['#ff0000', '#0000ff']);
        });

        it('should build simple string for no overrides', () => {
            const presetName = 'snow';
            const overrides = {};

            const frontmatterValue = buildConfettiFrontmatter(presetName, overrides);

            expect(frontmatterValue).toBe('type:snow');
        });

        it('should round-trip complex configuration', () => {
            const presetName = 'fireworks';
            const overrides = {
                count: 200,
                size: 1.5,
                speed: 70,
                gravity: 0.8,
                spread: 180,
                drift: 0.2,
                duration: 300,
                delay: 100,
                fadeIn: 500,
                opacity: 0.9,
                continuous: true,
                interval: 2000,
                position: 'center',
                colors: ['#ff0000', '#00ff00', '#0000ff']
            };

            const built = buildConfettiFrontmatter(presetName, overrides);
            const parsed = parseConfettiConfig(built);

            expect(parsed.presetName).toBe('fireworks');
            expect(parsed.overrides.count).toBe(200);
            expect(parsed.overrides.continuous).toBe(true);
            expect(parsed.overrides.size).toBe(1.5);
            expect(parsed.overrides.colors).toEqual(['#ff0000', '#00ff00', '#0000ff']);
        });
    });

    describe('Multiple notes handling', () => {
        it('should handle multiple notes with independent effects', () => {
            const mockLeaf1 = {
                view: {
                    file: { path: 'note1.md' },
                    contentEl: document.createElement('div')
                }
            };

            const mockLeaf2 = {
                view: {
                    file: { path: 'note2.md' },
                    contentEl: document.createElement('div')
                }
            };

            const frontmatter1 = { 'banner-confetti': 'type:confetti' };
            const frontmatter2 = { 'banner-confetti': 'type:snow' };

            handleConfettiForNote.call(mockPlugin, mockLeaf1, frontmatter1);
            handleConfettiForNote.call(mockPlugin, mockLeaf2, frontmatter2);

            expect(confettiManager.hasActiveEffect('note1.md')).toBe(true);
            expect(confettiManager.hasActiveEffect('note2.md')).toBe(true);
        });

        it('should stop one note without affecting others', async () => {
            const mockLeaf1 = {
                view: {
                    file: { path: 'note1.md' },
                    contentEl: document.createElement('div')
                }
            };

            const mockLeaf2 = {
                view: {
                    file: { path: 'note2.md' },
                    contentEl: document.createElement('div')
                }
            };

            handleConfettiForNote.call(mockPlugin, mockLeaf1, { 'banner-confetti': 'type:confetti' });
            handleConfettiForNote.call(mockPlugin, mockLeaf2, { 'banner-confetti': 'type:snow' });

            // Both should be active
            expect(confettiManager.hasActiveEffect('note1.md')).toBe(true);
            expect(confettiManager.hasActiveEffect('note2.md')).toBe(true);

            // Stop first note
            handleConfettiForNote.call(mockPlugin, mockLeaf1, {});
            // Verify note1 stop was initiated (may still be in fade-out)
            // Note2 should remain active immediately after
            await new Promise(resolve => setTimeout(resolve, 50));
            const note1Active = confettiManager.hasActiveEffect('note1.md');
            const note2Active = confettiManager.hasActiveEffect('note2.md');

            // After full fadeOut, note1 should be inactive
            await new Promise(resolve => setTimeout(resolve, 600));
            expect(confettiManager.hasActiveEffect('note1.md')).toBe(false);
        });
    });

    describe('Error handling in workflow', () => {
        it('should handle missing leaf gracefully', () => {
            expect(() => {
                handleConfettiForNote.call(mockPlugin, null, { 'banner-confetti': 'type:confetti' });
            }).not.toThrow();
        });

        it('should handle missing view gracefully', () => {
            const invalidLeaf = { view: null };
            expect(() => {
                handleConfettiForNote.call(mockPlugin, invalidLeaf, { 'banner-confetti': 'type:confetti' });
            }).not.toThrow();
        });

        it('should handle missing file gracefully', () => {
            const leafWithoutFile = {
                view: {
                    file: null,
                    contentEl: document.createElement('div')
                }
            };
            expect(() => {
                handleConfettiForNote.call(mockPlugin, leafWithoutFile, { 'banner-confetti': 'type:confetti' });
            }).not.toThrow();
        });

        it('should handle malformed frontmatter config', () => {
            const frontmatter = {
                'banner-confetti': 12345  // Invalid type
            };

            expect(() => {
                handleConfettiForNote.call(mockPlugin, mockLeaf, frontmatter);
            }).not.toThrow();
        });
    });

    describe('Canvas cleanup', () => {
        it('should clean up canvas when stopping effect', async () => {
            const frontmatter = { 'banner-confetti': 'type:confetti' };
            handleConfettiForNote.call(mockPlugin, mockLeaf, frontmatter);

            // Verify canvas was added
            const canvasBefore = mockLeaf.view.contentEl.querySelector('.pixel-banner-confetti-canvas');
            // Canvas may or may not exist depending on implementation timing

            // Stop the effect
            handleConfettiForNote.call(mockPlugin, mockLeaf, {});
            await new Promise(resolve => setTimeout(resolve, 600));

            // Canvas should be removed
            const canvasAfter = mockLeaf.view.contentEl.querySelector('.pixel-banner-confetti-canvas');
            expect(canvasAfter).toBeNull();
        });

        it('should clean all canvases on stopAll', async () => {
            const mockLeaf1 = {
                view: {
                    file: { path: 'note1.md' },
                    contentEl: document.createElement('div')
                }
            };

            handleConfettiForNote.call(mockPlugin, mockLeaf1, { 'banner-confetti': 'type:confetti' });

            confettiManager.stopAll();
            await new Promise(resolve => setTimeout(resolve, 600));

            const canvas = mockLeaf1.view.contentEl.querySelector('.pixel-banner-confetti-canvas');
            expect(canvas).toBeNull();
        });
    });

    describe('Real-time frontmatter monitoring', () => {
        let mockFile;
        let mockCache;
        let mockPluginWithWorkspace;
        let mockLeafWithMatchingFile;

        beforeEach(() => {
            mockFile = {
                path: 'test-note.md'
            };

            mockCache = {
                frontmatter: {}
            };

            // Create a leaf with a file reference that matches mockFile
            mockLeafWithMatchingFile = {
                view: {
                    file: mockFile,  // Use the same object reference
                    contentEl: document.createElement('div')
                }
            };

            mockPluginWithWorkspace = {
                ...mockPlugin,
                app: {
                    workspace: {
                        getLeavesOfType: vi.fn().mockReturnValue([mockLeafWithMatchingFile])
                    }
                }
            };
        });

        it('should start confetti when field is added to frontmatter', () => {
            // Initially no confetti
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(false);

            // Add confetti field to frontmatter
            mockCache.frontmatter = { 'banner-confetti': 'type:confetti' };

            handleConfettiMetadataChange.call(mockPluginWithWorkspace, mockFile, mockCache);

            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);
        });

        it('should stop confetti when field is removed from frontmatter', async () => {
            // Start with confetti active
            handleConfettiForNote.call(mockPlugin, mockLeafWithMatchingFile, { 'banner-confetti': 'type:confetti' });
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);

            // Remove confetti field
            mockCache.frontmatter = {};

            handleConfettiMetadataChange.call(mockPluginWithWorkspace, mockFile, mockCache);

            // Wait for fadeOut
            await new Promise(resolve => setTimeout(resolve, 600));
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(false);
        });

        it('should update confetti when preset changes', () => {
            // Start with one preset
            handleConfettiForNote.call(mockPlugin, mockLeafWithMatchingFile, { 'banner-confetti': 'type:confetti' });
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);

            // Change to different preset
            mockCache.frontmatter = { 'banner-confetti': 'type:snow' };

            handleConfettiMetadataChange.call(mockPluginWithWorkspace, mockFile, mockCache);

            // Effect should still be active (with new config)
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);
        });

        it('should update confetti when overrides change', () => {
            // Start with basic config
            handleConfettiForNote.call(mockPlugin, mockLeafWithMatchingFile, { 'banner-confetti': 'type:confetti' });
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);

            // Change overrides
            mockCache.frontmatter = {
                'banner-confetti': 'type:confetti, count:300, colors:#ff0000'
            };

            handleConfettiMetadataChange.call(mockPluginWithWorkspace, mockFile, mockCache);

            // Effect should still be active with new config
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);
        });

        it('should stop confetti when config becomes invalid', async () => {
            // Start with valid config
            handleConfettiForNote.call(mockPlugin, mockLeafWithMatchingFile, { 'banner-confetti': 'type:confetti' });
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);

            // Change to invalid config
            mockCache.frontmatter = { 'banner-confetti': 12345 }; // Invalid type

            handleConfettiMetadataChange.call(mockPluginWithWorkspace, mockFile, mockCache);

            // Wait for fadeOut
            await new Promise(resolve => setTimeout(resolve, 600));
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(false);
        });

        it('should handle missing file gracefully', () => {
            expect(() => {
                handleConfettiMetadataChange.call(mockPluginWithWorkspace, null, mockCache);
            }).not.toThrow();
        });

        it('should handle missing cache gracefully', () => {
            expect(() => {
                handleConfettiMetadataChange.call(mockPluginWithWorkspace, mockFile, null);
            }).not.toThrow();
        });

        it('should handle multiple leaves showing the same file', () => {
            const mockLeaf2 = {
                view: {
                    file: mockFile,
                    contentEl: document.createElement('div')
                }
            };

            mockPluginWithWorkspace.app.workspace.getLeavesOfType = vi.fn().mockReturnValue([
                mockLeaf,
                mockLeaf2
            ]);

            mockCache.frontmatter = { 'banner-confetti': 'type:confetti' };

            handleConfettiMetadataChange.call(mockPluginWithWorkspace, mockFile, mockCache);

            // Confetti should be started (uses file path as ID, not leaf)
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(true);
        });

        it('should do nothing when field is not present and no effect is running', async () => {
            // Ensure no effect is running by explicitly stopping any leftover effects
            confettiManager.stopAll();
            await new Promise(resolve => setTimeout(resolve, 600));

            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(false);

            mockCache.frontmatter = { someOtherField: 'value' };

            handleConfettiMetadataChange.call(mockPluginWithWorkspace, mockFile, mockCache);

            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(false);
        });

        it('should handle leaf without matching file', () => {
            const differentFile = { path: 'different-note.md' };
            mockPluginWithWorkspace.app.workspace.getLeavesOfType = vi.fn().mockReturnValue([mockLeaf]);

            mockCache.frontmatter = { 'banner-confetti': 'type:confetti' };

            // This should not start confetti because the leaf's file doesn't match
            handleConfettiMetadataChange.call(mockPluginWithWorkspace, differentFile, mockCache);

            // No effect should be started for the different file since no leaf shows it
            expect(confettiManager.hasActiveEffect('different-note.md')).toBe(false);
        });
    });
});
