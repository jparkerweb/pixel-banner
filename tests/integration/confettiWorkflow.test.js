import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { confettiManager, PREVIEW_EFFECT_ID } from '@/core/confettiManager.js';
import { parseConfettiConfig, buildConfettiFrontmatter } from '@/utils/confettiUtils.js';
import {
    handleConfettiForNote,
    handleConfettiCleanup,
    handleConfettiMetadataChange,
    runConfettiPass,
    reconcileConfettiEffects
} from '@/core/eventHandler.js';
import { PixelBannerPlugin } from '@/core/pixelBannerPlugin.js';
import { createMockApp, createMockManifest } from 'obsidian';
import { ConfettiModal } from '@/modal/modals/confettiModal.js';
import { parse } from '@/utils/confettiConfig.js';
import { getPresetNames, getPreset } from '@/core/confettiPresets.js';

// Mock canvas-confetti
vi.mock('canvas-confetti', () => {
    const mockConfettiInstance = vi.fn(() => Promise.resolve());
    mockConfettiInstance.reset = vi.fn();

    return {
        default: {
            create: vi.fn(() => mockConfettiInstance),
            shapeFromText: vi.fn(({ text, scalar }) => ({ text, scalar })),
            shapeFromPath: vi.fn(({ path, matrix }) => ({ type: 'path', path, matrix }))
        }
    };
});

// Mock Platform for mobile detection (mutable per test)
const platform = vi.hoisted(() => ({ isMobile: false }));
vi.mock('obsidian', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, Platform: platform };
});

// A markdown leaf with its own id, file and content element
function makeLeaf(id, path) {
    return {
        id,
        view: {
            file: { path },
            contentEl: document.createElement('div')
        }
    };
}

function mockReducedMotion(matches) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation(query => ({
            matches,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn()
        }))
    });
}

describe('Confetti Workflow Integration', () => {
    let mockLeaf;
    let mockPlugin;
    let leaves;
    let fileCache;

    beforeEach(() => {
        vi.clearAllMocks();
        confettiManager.stopAll(true);
        platform.isMobile = false;
        mockReducedMotion(false);

        mockLeaf = makeLeaf('leaf-1', 'test-note.md');
        leaves = [mockLeaf];
        fileCache = new Map();

        // Mock plugin with the workspace and metadata cache the handlers use
        mockPlugin = {
            settings: {
                confettiDisableOnMobile: false,
                customBannerConfettiField: ['banner-confetti']
            },
            lastFrontmatter: new Map(),
            app: {
                workspace: {
                    getLeavesOfType: vi.fn(() => leaves)
                },
                metadataCache: {
                    getFileCache: vi.fn(file => ({ frontmatter: fileCache.get(file.path) }))
                }
            }
        };
    });

    afterEach(() => {
        confettiManager.stopAll(true);
    });

    describe('Complete workflow from frontmatter to rendering', () => {
        it('should start confetti when note has valid config, keyed by leaf id', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(true);
            expect(confettiManager.hasActiveEffect('test-note.md')).toBe(false);
            expect(confettiManager.getEffect('leaf-1').filePath).toBe('test-note.md');
        });

        it('should parse new string format with overrides', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, {
                'banner-confetti': 'type:confetti, count:120, colors:#ff0000|#00ff00'
            });

            const effect = confettiManager.getEffect('leaf-1');
            expect(effect.rawConfig.overrides).toEqual({ count: 120, colors: ['#ff0000', '#00ff00'] });
        });

        it('should stop confetti when note has no config', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });
            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(true);

            handleConfettiForNote.call(mockPlugin, mockLeaf, {});

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
        });

        it('should not start confetti for an invalid preset', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:invalid-preset' });

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
        });

        it('should handle legacy simple string format', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'confetti' });

            const effect = confettiManager.getEffect('leaf-1');
            expect(effect.presetName).toBe('confetti');
            expect(effect.rawConfig.overrides).toEqual({});
        });

        it('should handle legacy array frontmatter config', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, {
                'banner-confetti': ['confetti', { count: 120, colors: ['#ff0000', '#00ff00'] }]
            });

            const effect = confettiManager.getEffect('leaf-1');
            expect(effect.presetName).toBe('confetti');
            expect(effect.rawConfig.overrides).toEqual({ count: 120, colors: ['#ff0000', '#00ff00'] });
        });
    });

    describe('Independent panes', () => {
        it('runs two independent effects for two leaves on the same file', () => {
            const second = makeLeaf('leaf-2', 'test-note.md');
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:snow' });
            handleConfettiForNote.call(mockPlugin, second, { 'banner-confetti': 'type:snow' });

            const one = confettiManager.getEffect('leaf-1');
            const two = confettiManager.getEffect('leaf-2');
            expect(one).not.toBeNull();
            expect(two).not.toBeNull();
            expect(one.canvas).not.toBe(two.canvas);
        });

        it('keeps both sides of a split running when one is activated', () => {
            const left = makeLeaf('leaf-a', 'note1.md');
            const right = makeLeaf('leaf-b', 'note2.md');
            handleConfettiForNote.call(mockPlugin, left, { 'banner-confetti': 'type:confetti' });
            handleConfettiForNote.call(mockPlugin, right, { 'banner-confetti': 'type:snow' });
            const leftEffect = confettiManager.getEffect('leaf-a');

            // Activate the right pane: active-leaf-change cleans up the left
            // one, which still shows its file, then handles the right one
            handleConfettiCleanup(left);
            handleConfettiForNote.call(mockPlugin, right, { 'banner-confetti': 'type:snow' });

            expect(confettiManager.getEffect('leaf-a')).toBe(leftEffect);
            expect(confettiManager.hasActiveEffect('leaf-b')).toBe(true);
        });

        it('a leaf switched to another file stops only that leaf', () => {
            const other = makeLeaf('leaf-2', 'other.md');
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:snow' });
            handleConfettiForNote.call(mockPlugin, other, { 'banner-confetti': 'type:hearts' });
            const otherEffect = confettiManager.getEffect('leaf-2');

            mockLeaf.view.file = { path: 'plain.md' };
            handleConfettiCleanup(mockLeaf);

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
            expect(confettiManager.getEffect('leaf-2')).toBe(otherEffect);
        });

        it('a leaf switched to another confetti note gets that note\'s effect', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:snow' });

            mockLeaf.view.file = { path: 'hearts.md' };
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:hearts' });

            const effect = confettiManager.getEffect('leaf-1');
            expect(effect.filePath).toBe('hearts.md');
            expect(effect.presetName).toBe('hearts');
        });
    });

    describe('Gates on every path', () => {
        it('blocks start on mobile when Disable on Mobile is set', () => {
            platform.isMobile = true;
            mockPlugin.settings.confettiDisableOnMobile = true;

            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
        });

        it('starts on mobile when Disable on Mobile is off', () => {
            platform.isMobile = true;

            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(true);
        });

        it('starts on desktop even when Disable on Mobile is set', () => {
            mockPlugin.settings.confettiDisableOnMobile = true;

            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(true);
        });

        it('blocks start under reduced motion', () => {
            mockReducedMotion(true);

            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });

            expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
        });

        it('starts under reduced motion when the effect opts out', () => {
            mockReducedMotion(true);

            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti, respectReducedMotion:false' });

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(true);
        });

        it('stops a running effect when the gate closes', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });
            mockReducedMotion(true);

            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
        });

        it('applies the gates on the metadata path', () => {
            mockReducedMotion(true);

            handleConfettiMetadataChange.call(mockPlugin, mockLeaf.view.file, { frontmatter: { 'banner-confetti': 'type:snow' } });

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
        });

        it('applies the gates on the startup pass', () => {
            platform.isMobile = true;
            mockPlugin.settings.confettiDisableOnMobile = true;
            fileCache.set('test-note.md', { 'banner-confetti': 'type:snow' });

            runConfettiPass.call(mockPlugin);

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
        });
    });

    describe('Startup pass', () => {
        it('starts confetti for every open markdown leaf and seeds lastFrontmatter', () => {
            const second = makeLeaf('leaf-2', 'other.md');
            const plain = makeLeaf('leaf-3', 'plain.md');
            leaves = [mockLeaf, second, plain];
            fileCache.set('test-note.md', { 'banner-confetti': 'type:snow' });
            fileCache.set('other.md', { 'banner-confetti': 'type:hearts' });
            fileCache.set('plain.md', { title: 'x' });

            runConfettiPass.call(mockPlugin);

            expect(confettiManager.getNoteEffectIds().sort()).toEqual(['leaf-1', 'leaf-2']);
            expect(mockPlugin.lastFrontmatter.get('test-note.md')).toEqual({ 'banner-confetti': 'type:snow' });
            expect(mockPlugin.lastFrontmatter.get('plain.md')).toEqual({ title: 'x' });
        });

        it('a second pass with the same config does not restart effects', () => {
            fileCache.set('test-note.md', { 'banner-confetti': 'type:snow' });
            runConfettiPass.call(mockPlugin);
            const effect = confettiManager.getEffect('leaf-1');

            runConfettiPass.call(mockPlugin);

            expect(confettiManager.getEffect('leaf-1')).toBe(effect);
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

            expect(frontmatterValue).toBe('type: confetti, count: 150, speed: 60, colors: #ff0000|#0000ff');

            // Parse it back
            const parsed = parseConfettiConfig(frontmatterValue);
            expect(parsed.presetName).toBe('confetti');
            expect(parsed.overrides.count).toBe(150);
            expect(parsed.overrides.speed).toBe(60);
            expect(parsed.overrides.colors).toEqual(['#ff0000', '#0000ff']);
        });

        it('should build simple string for no overrides', () => {
            const frontmatterValue = buildConfettiFrontmatter('snow', {});

            expect(frontmatterValue).toBe('type: snow');
        });

        it('should round-trip complex configuration', () => {
            const presetName = 'fireworks';
            const overrides = {
                count: 120,
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
            expect(parsed.overrides.count).toBe(120);
            expect(parsed.overrides.continuous).toBe(true);
            expect(parsed.overrides.size).toBe(1.5);
            expect(parsed.overrides.colors).toEqual(['#ff0000', '#00ff00', '#0000ff']);
        });
    });

    describe('Error handling in workflow', () => {
        it('should handle missing leaf gracefully', () => {
            expect(() => {
                handleConfettiForNote.call(mockPlugin, null, { 'banner-confetti': 'type:confetti' });
            }).not.toThrow();
            expect(confettiManager.getNoteEffectIds()).toEqual([]);
        });

        it('should handle missing view gracefully', () => {
            expect(() => {
                handleConfettiForNote.call(mockPlugin, { id: 'x', view: null }, { 'banner-confetti': 'type:confetti' });
            }).not.toThrow();
            expect(confettiManager.getNoteEffectIds()).toEqual([]);
        });

        it('should handle missing file gracefully', () => {
            const leafWithoutFile = { id: 'x', view: { file: null, contentEl: document.createElement('div') } };
            expect(() => {
                handleConfettiForNote.call(mockPlugin, leafWithoutFile, { 'banner-confetti': 'type:confetti' });
            }).not.toThrow();
            expect(confettiManager.getNoteEffectIds()).toEqual([]);
            expect(leafWithoutFile.view.contentEl.querySelector('.pixel-banner-confetti-canvas')).toBeNull();
        });

        it('should handle malformed frontmatter config', () => {
            expect(() => {
                handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 12345 });
            }).not.toThrow();
            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
        });

        it('should handle missing frontmatter', () => {
            expect(() => handleConfettiForNote.call(mockPlugin, mockLeaf, undefined)).not.toThrow();
            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
        });

        it('should stop a running effect when the frontmatter goes away', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });

            handleConfettiForNote.call(mockPlugin, mockLeaf, undefined);

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
        });
    });

    describe('Canvas cleanup', () => {
        afterEach(() => {
            vi.useRealTimers();
        });

        it('should fade the canvas out, then remove it, when the config goes away', () => {
            vi.useFakeTimers();
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });
            const canvas = mockLeaf.view.contentEl.querySelector('.pixel-banner-confetti-canvas');
            expect(canvas).not.toBeNull();

            handleConfettiForNote.call(mockPlugin, mockLeaf, {});

            // Still fading: in the pane at opacity 0
            expect(canvas.parentNode).toBe(mockLeaf.view.contentEl);
            expect(canvas.style.opacity).toBe('0');

            vi.advanceTimersByTime(600);

            expect(canvas.parentNode).toBeNull();
            expect(mockLeaf.view.contentEl.querySelector('.pixel-banner-confetti-canvas')).toBeNull();
        });

        it('switching a pane to another confetti note fades the old canvas out and runs the new note\'s effect', () => {
            vi.useFakeTimers();
            const container = mockLeaf.view.contentEl;
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:snow' });
            const note1Canvas = container.querySelector('.pixel-banner-confetti-canvas');
            expect(note1Canvas).not.toBeNull();

            // active-leaf-change for the same pane, now showing note2
            mockLeaf.view.file = { path: 'note2.md' };
            handleConfettiCleanup(mockLeaf);
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:hearts' });

            // During the fade both canvases are present; only note2's is live
            expect(note1Canvas.parentNode).toBe(container);
            expect(note1Canvas.style.opacity).toBe('0');

            vi.advanceTimersByTime(600);

            const canvases = container.querySelectorAll('.pixel-banner-confetti-canvas');
            const note2Effect = confettiManager.getEffect('leaf-1');
            expect(note1Canvas.parentNode).toBeNull();
            expect(canvases.length).toBe(1);
            expect(note2Effect.filePath).toBe('note2.md');
            expect(note2Effect.presetName).toBe('hearts');
            expect(note2Effect.stopped).toBe(false);
            expect(canvases[0]).toBe(note2Effect.canvas);
        });

        it('should clean all canvases on stopAll', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });

            confettiManager.stopAll(true);

            expect(mockLeaf.view.contentEl.querySelector('.pixel-banner-confetti-canvas')).toBeNull();
        });
    });

    describe('Layout-change reconciliation', () => {
        it('disposes the effect after the last tab closes', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:snow' });
            leaves = [];

            reconcileConfettiEffects.call(mockPlugin);

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
            expect(mockLeaf.view.contentEl.querySelector('.pixel-banner-confetti-canvas')).toBeNull();
        });

        it('restarts a renamed note for its new path', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:snow' });
            mockLeaf.view.file.path = 'renamed.md';
            fileCache.set('renamed.md', { 'banner-confetti': 'type:snow' });

            reconcileConfettiEffects.call(mockPlugin);

            expect(confettiManager.getEffect('leaf-1').filePath).toBe('renamed.md');
        });

        it('leaves open panes and the preview alone', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:snow' });
            const effect = confettiManager.getEffect('leaf-1');
            confettiManager.start(PREVIEW_EFFECT_ID, document.createElement('div'), 'hearts', {}, { isPreview: true });

            reconcileConfettiEffects.call(mockPlugin);

            expect(confettiManager.getEffect('leaf-1')).toBe(effect);
            expect(confettiManager.hasActiveEffect(PREVIEW_EFFECT_ID)).toBe(true);
        });
    });

    describe('Real-time frontmatter monitoring', () => {
        let mockFile;

        beforeEach(() => {
            mockFile = mockLeaf.view.file;
        });

        it('should start confetti when field is added to frontmatter', () => {
            handleConfettiMetadataChange.call(mockPlugin, mockFile, { frontmatter: { 'banner-confetti': 'type:confetti' } });

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(true);
        });

        it('should stop confetti when field is removed from frontmatter', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });

            handleConfettiMetadataChange.call(mockPlugin, mockFile, { frontmatter: {} });

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
        });

        it('should restart when the preset changes', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });
            const before = confettiManager.getEffect('leaf-1');

            handleConfettiMetadataChange.call(mockPlugin, mockFile, { frontmatter: { 'banner-confetti': 'type:snow' } });

            const after = confettiManager.getEffect('leaf-1');
            expect(after).not.toBe(before);
            expect(after.presetName).toBe('snow');
        });

        it('should restart when overrides change', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });
            const before = confettiManager.getEffect('leaf-1');

            handleConfettiMetadataChange.call(mockPlugin, mockFile, {
                frontmatter: { 'banner-confetti': 'type:confetti, count:100, colors:#ff0000' }
            });

            expect(confettiManager.getEffect('leaf-1')).not.toBe(before);
        });

        it('should not restart when an unrelated field changes (equal config)', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:snow, count:5' });
            const before = confettiManager.getEffect('leaf-1');

            handleConfettiMetadataChange.call(mockPlugin, mockFile, {
                frontmatter: { 'banner-confetti': 'type: snow, count: 5', title: 'edited' }
            });

            expect(confettiManager.getEffect('leaf-1')).toBe(before);
        });

        it('should stop confetti when config becomes invalid', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });

            handleConfettiMetadataChange.call(mockPlugin, mockFile, { frontmatter: { 'banner-confetti': 12345 } });

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
        });

        it('should handle missing file or cache gracefully', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });
            const effect = confettiManager.getEffect('leaf-1');

            // No file: nothing is touched
            expect(() => handleConfettiMetadataChange.call(mockPlugin, null, { frontmatter: {} })).not.toThrow();
            expect(confettiManager.getEffect('leaf-1')).toBe(effect);

            // No cache: read as no frontmatter, so the effect stops
            expect(() => handleConfettiMetadataChange.call(mockPlugin, mockFile, null)).not.toThrow();
            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
        });

        it('should update every leaf showing the file', () => {
            const second = makeLeaf('leaf-2', 'test-note.md');
            leaves = [mockLeaf, second];

            handleConfettiMetadataChange.call(mockPlugin, mockFile, { frontmatter: { 'banner-confetti': 'type:confetti' } });

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(true);
            expect(confettiManager.hasActiveEffect('leaf-2')).toBe(true);
        });

        it('a change on file A leaves file B and the preview untouched', () => {
            const other = makeLeaf('leaf-b', 'b.md');
            leaves = [mockLeaf, other];
            handleConfettiForNote.call(mockPlugin, other, { 'banner-confetti': 'type:hearts' });
            const otherEffect = confettiManager.getEffect('leaf-b');
            confettiManager.start(PREVIEW_EFFECT_ID, document.createElement('div'), 'snow', {}, { isPreview: true });
            const preview = confettiManager.getEffect(PREVIEW_EFFECT_ID);

            handleConfettiMetadataChange.call(mockPlugin, mockFile, { frontmatter: { 'banner-confetti': 'type:confetti' } });
            handleConfettiMetadataChange.call(mockPlugin, mockFile, { frontmatter: {} });

            expect(confettiManager.getEffect('leaf-b')).toBe(otherEffect);
            expect(confettiManager.getEffect(PREVIEW_EFFECT_ID)).toBe(preview);
        });

        it('should do nothing when field is not present and no effect is running', () => {
            handleConfettiMetadataChange.call(mockPlugin, mockFile, { frontmatter: { someOtherField: 'value' } });

            expect(confettiManager.getNoteEffectIds()).toEqual([]);
        });

        it('should handle rapid preset changes without errors', () => {
            handleConfettiForNote.call(mockPlugin, mockLeaf, { 'banner-confetti': 'type:confetti' });

            for (const preset of ['snow', 'fireworks', 'sparkles', 'hearts', 'confetti']) {
                expect(() => {
                    handleConfettiMetadataChange.call(mockPlugin, mockFile, { frontmatter: { 'banner-confetti': `type:${preset}` } });
                }).not.toThrow();
            }

            expect(confettiManager.getEffect('leaf-1').presetName).toBe('confetti');
        });

        it('should start nothing for a file no leaf shows', () => {
            handleConfettiMetadataChange.call(mockPlugin, { path: 'different-note.md' }, { frontmatter: { 'banner-confetti': 'type:confetti' } });

            expect(confettiManager.getNoteEffectIds()).toEqual([]);
        });
    });
    // The real 'changed' handler registered in PixelBannerPlugin.onload, so
    // the lastFrontmatter bookkeeping and the gates run together
    describe('Plugin metadata path', () => {
        let plugin;
        let changed;
        let file;
        let consoleSpies;

        beforeEach(async () => {
            consoleSpies = [
                vi.spyOn(console, 'error').mockImplementation(() => {}),
                vi.spyOn(console, 'warn').mockImplementation(() => {})
            ];
            plugin = new PixelBannerPlugin(createMockApp(), createMockManifest());
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            plugin.app.workspace.getLeavesOfType = vi.fn(() => leaves);
            file = mockLeaf.view.file;
            changed = plugin.app.metadataCache.on.mock.calls.find(([event]) => event === 'changed')[1];
        });

        afterEach(() => {
            confettiManager.destroy();
            // Not vi.restoreAllMocks(): it would also strip the global observer mocks
            consoleSpies.forEach(spy => spy.mockRestore());
        });

        // Write the note's frontmatter to the cache and fire 'changed'
        function edit(frontmatter) {
            const cache = frontmatter ? { frontmatter } : {};
            plugin.app.metadataCache.setFileCache(file, cache);
            return changed(file, '', cache);
        }

        it('adding the field starts the pane\'s effect and records the frontmatter', async () => {
            await edit({ 'banner-confetti': 'type: snow, count: 5' });

            const effect = confettiManager.getEffect('leaf-1');
            expect(effect.presetName).toBe('snow');
            expect(effect.rawConfig.overrides).toEqual({ count: 5 });
            expect(plugin.lastFrontmatter.get('test-note.md')).toEqual({ 'banner-confetti': 'type: snow, count: 5' });
        });

        it('a preset change restarts, removing the frontmatter stops, restoring it restarts', async () => {
            await edit({ 'banner-confetti': 'type: snow' });
            await edit({ 'banner-confetti': 'type: hearts' });
            expect(confettiManager.getEffect('leaf-1').presetName).toBe('hearts');

            await edit(null);
            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
            expect(plugin.lastFrontmatter.has('test-note.md')).toBe(false);

            // Undo restores the same frontmatter: it still counts as a change
            await edit({ 'banner-confetti': 'type: hearts' });
            expect(confettiManager.getEffect('leaf-1').presetName).toBe('hearts');
        });

        it('an unrelated edit does not restart a running effect', async () => {
            await edit({ 'banner-confetti': 'type: snow' });
            const effect = confettiManager.getEffect('leaf-1');

            await edit({ 'banner-confetti': 'type: snow', title: 'edited' });

            expect(confettiManager.getEffect('leaf-1')).toBe(effect);
        });

        it('honours Disable on Mobile on mobile, then starts once it is turned off', async () => {
            platform.isMobile = true;
            plugin.settings.confettiDisableOnMobile = true;

            await edit({ 'banner-confetti': 'type: snow' });
            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);

            plugin.settings.confettiDisableOnMobile = false;
            await edit({ 'banner-confetti': 'type: snow', title: 'edited' });
            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(true);
        });

        it('honours reduced motion unless the effect opts out', async () => {
            mockReducedMotion(true);

            await edit({ 'banner-confetti': 'type: snow' });
            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);

            await edit({ 'banner-confetti': 'type: snow, respectReducedMotion: false' });
            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(true);
        });

        it('a running effect stops when the OS turns reduced motion on', async () => {
            await edit({ 'banner-confetti': 'type: snow' });
            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(true);

            // The change listener onload registered on the reduced-motion query
            const query = window.matchMedia.mock.results
                .map(result => result.value)
                .find(value => value.media === '(prefers-reduced-motion: reduce)' && value.addEventListener.mock.calls.length > 0);
            const [event, onChange] = query.addEventListener.mock.calls[0];
            expect(event).toBe('change');

            mockReducedMotion(true);
            plugin.app.metadataCache.setFileCache(file, { frontmatter: { 'banner-confetti': 'type: snow' } });
            onChange();

            expect(confettiManager.hasActiveEffect('leaf-1')).toBe(false);
        });
    });
    // Modal Apply, then the written frontmatter read back through the codec
    // and buildOptions, for every preset: what canvas-confetti receives must
    // be numbers, valid hex colours and real shapes (F1, F2, F3, F5)
    describe('Modal Apply round trip, every preset', () => {
        const NUMERIC_OPTIONS = ['particleCount', 'scalar', 'gravity', 'startVelocity', 'drift', 'spread'];
        let frontmatter;
        let app;
        let modalPlugin;

        beforeEach(() => {
            frontmatter = {};
            app = {
                workspace: {
                    getActiveFile: vi.fn(() => mockLeaf.view.file),
                    getActiveViewOfType: vi.fn(() => ({ file: mockLeaf.view.file, leaf: mockLeaf, contentEl: mockLeaf.view.contentEl }))
                },
                fileManager: {
                    processFrontMatter: vi.fn(async (file, callback) => callback(frontmatter))
                }
            };
            modalPlugin = {
                ...mockPlugin,
                handleConfettiForNote(leaf, fm) {
                    return handleConfettiForNote.call(this, leaf, fm);
                }
            };
        });

        function openModal(value) {
            if (value) frontmatter['banner-confetti'] = value;
            const modal = new ConfettiModal(app, modalPlugin, value ? parse(value) : null);
            modal.open();
            return modal;
        }

        function change(el, value, event = 'change') {
            el.value = value;
            el.dispatchEvent(new Event(event));
        }

        function press(el, key) {
            el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        }

        // Click Apply and let its awaited frontmatter write finish
        async function apply(modal) {
            modal.contentEl.querySelector('.confetti-apply-button').click();
            await new Promise(resolve => setTimeout(resolve, 0));
            return frontmatter['banner-confetti'];
        }

        // Parse what was written, build the options and fire one burst into a
        // spy standing in for canvas-confetti; returns every options object
        function readBack(value) {
            const parsed = parse(value);
            const built = confettiManager.buildOptions(parsed.presetName, parsed.overrides);
            const fire = vi.fn();
            confettiManager.fireBurst(fire, built.config, built.options);
            expect(fire).toHaveBeenCalled();
            return { parsed, bursts: fire.mock.calls.map(([options]) => options) };
        }

        function expectDrawable(options, presetName) {
            for (const key of NUMERIC_OPTIONS) {
                expect(typeof options[key], `${presetName} ${key}`).toBe('number');
                expect(Number.isFinite(options[key]), `${presetName} ${key}`).toBe(true);
            }
            expect(Array.isArray(options.shapes) && options.shapes.length > 0, `${presetName} shapes`).toBe(true);
            if (options.colors) {
                for (const color of options.colors) {
                    expect(color).toMatch(/^#[0-9a-f]{6}$/);
                }
            }
        }

        it.each(getPresetNames())('%s: Apply with nothing changed writes only the preset', async (presetName) => {
            const modal = openModal(`type: ${presetName}`);

            const written = await apply(modal);

            expect(written).toBe(`type: ${presetName}`);
            expect(confettiManager.getEffect('leaf-1').presetName).toBe(presetName);
        });

        it.each(getPresetNames())('%s: one edit of each control type survives Apply, reload and buildOptions', async (presetName) => {
            const modal = openModal(`type: ${presetName}`);
            const refs = modal.sliderInputRefs;
            const continuous = !modal.settings.continuous;
            const flat = !modal.settings.flat;
            const shape = getPreset(presetName).shapes?.[0] === 'star' ? 'circle' : 'star';

            change(refs.count.slider.sliderEl, '13', 'input');           // integer slider
            change(refs.opacity.text.inputEl, '0.55');                    // float number box
            change(refs.sizeRange.minInput, '0.4');                       // range number boxes
            change(refs.sizeRange.maxInput, '2.9');
            change(refs.speedRange.minInput, '0');                        // thumbs never cross: open the pair first
            change(refs.speedRange.maxInput, '47');
            change(refs.speedRange.minInput, '12');
            press(refs.gravityRange.thumbs[0], 'Home');                   // range keyboard
            press(refs.driftRange.thumbs[1], 'End');
            change(modal.colorContainer.querySelector('.color-input-hidden'), '#123456', 'input'); // colour
            change(modal.positionDropdown.selectEl, 'bottom-right');      // dropdowns
            change(modal.shapeDropdown.selectEl, shape);
            change(modal.flatDropdown.selectEl, flat ? 'flat' : 'tumble');
            modal.continuousToggle.toggleEl.checked = continuous;        // toggles
            modal.continuousToggle.toggleEl.dispatchEvent(new Event('change'));
            modal.reducedMotionToggle.toggleEl.checked = false;
            modal.reducedMotionToggle.toggleEl.dispatchEvent(new Event('change'));

            const written = await apply(modal);
            const { parsed, bursts } = readBack(written);

            expect(typeof written).toBe('string');
            expect(parsed.presetName).toBe(presetName);
            expect(parsed.overrides).toMatchObject({
                count: 13,
                opacity: 0.55,
                sizeRange: [0.4, 2.9],
                speedRange: [12, 47],
                position: 'bottom-right',
                shapes: [shape],
                continuous,
                flat,
                respectReducedMotion: false
            });
            expect(parsed.overrides.gravityRange[0]).toBe(-3);
            expect(parsed.overrides.driftRange[1]).toBe(5);
            expect(parsed.overrides.colors[0]).toBe('#123456');

            for (const options of bursts) {
                expectDrawable(options, presetName);
                expect(options.disableForReducedMotion).toBe(false);
                if (!getPreset(presetName).emoji) {
                    expect(options.shapes).toEqual([shape]);
                    expect(options.colors).toContain('#123456');
                }
            }

            // Apply also started the note's own effect from the same value
            const effect = confettiManager.getEffect('leaf-1');
            expect(effect.presetName).toBe(presetName);
            expect(effect.rawConfig.overrides).toEqual(parsed.overrides);
        });

        it.each(getPresetNames())('%s: a single colour and a custom emoji come back as a list and as emoji shapes', async (presetName) => {
            const modal = openModal(`type: ${presetName}`);
            while (modal.colorContainer.querySelectorAll('.remove-color').length > 1) {
                modal.colorContainer.querySelector('.remove-color').click();
            }
            change(modal.colorContainer.querySelector('.color-input-hidden'), '#abcdef', 'input');
            change(modal.emojiInput.inputEl, '🍕');

            const written = await apply(modal);
            const { parsed, bursts } = readBack(written);

            expect(parsed.overrides.colors).toEqual(['#abcdef']);
            expect(parsed.overrides.emoji).toBe('🍕');
            for (const options of bursts) {
                expectDrawable(options, presetName);
                expect(options.shapes.every(shape => shape.text === '🍕')).toBe(true);
            }
        });

        it('switching the preset in the dropdown, then Apply, writes the new preset only', async () => {
            const modal = openModal('type: snow, count: 3');

            change(modal.effectDropdown.selectEl, 'hearts');
            const written = await apply(modal);

            expect(written).toBe('type: hearts');
        });

        it('edits after a dropdown switch (ranges included) are written and stay numeric', async () => {
            const modal = openModal('type: snow');

            change(modal.effectDropdown.selectEl, 'bubbles');
            change(modal.sliderInputRefs.count.text.inputEl, '13');
            change(modal.sliderInputRefs.sizeRange.minInput, '0.4');
            press(modal.sliderInputRefs.speedRange.thumbs[1], 'End');
            const written = await apply(modal);
            const { parsed, bursts } = readBack(written);

            expect(parsed.presetName).toBe('bubbles');
            expect(parsed.overrides).toEqual({ count: 13, sizeRange: [0.4, 2], speedRange: [20, 100] });
            for (const options of bursts) {
                expectDrawable(options, 'bubbles');
            }
        });
    });
});
