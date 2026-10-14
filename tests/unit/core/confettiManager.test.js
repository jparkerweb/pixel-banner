import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import confetti from 'canvas-confetti';
import { Platform } from 'obsidian';
import { confettiManager, ConfettiManager, PREVIEW_EFFECT_ID, shouldRunConfetti } from '@/core/confettiManager.js';
import { CONFETTI_PRESETS, getLightThemeColors } from '@/core/confettiPresets.js';
import { clearShapeCache } from '@/core/confettiShapes.js';

// Mock canvas-confetti
const { mockConfettiInstance } = vi.hoisted(() => {
    const instance = vi.fn(() => Promise.resolve());
    instance.reset = vi.fn();
    return { mockConfettiInstance: instance };
});

vi.mock('canvas-confetti', () => ({
    default: {
        create: vi.fn(() => mockConfettiInstance),
        shapeFromText: vi.fn(({ text, scalar }) => ({ text, scalar })),
        shapeFromPath: vi.fn(({ path }) => ({ path }))
    }
}));

// happy-dom lays nothing out, so give containers a real size
function setSize(el, width, height) {
    Object.defineProperty(el, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: height, configurable: true });
}

function sizedElement(width = 800, height = 400) {
    const el = document.createElement('div');
    setSize(el, width, height);
    return el;
}

// Observers the tests can drive by hand
class FakeIntersectionObserver {
    static instances = [];
    constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.targets = [];
        this.disconnected = false;
        FakeIntersectionObserver.instances.push(this);
    }
    observe(target) { this.targets.push(target); }
    disconnect() { this.disconnected = true; }
    trigger(isIntersecting, target = this.targets[0]) {
        this.callback([{ target, isIntersecting }]);
    }
}

class FakeResizeObserver {
    static instances = [];
    constructor(callback) {
        this.callback = callback;
        this.disconnected = false;
        FakeResizeObserver.instances.push(this);
    }
    observe() {}
    disconnect() { this.disconnected = true; }
    trigger() { this.callback([]); }
}

describe('confettiManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the manager state immediately (no fade-out delay)
        confettiManager.stopAll(true);
    });

    afterEach(() => {
        confettiManager.stopAll(true);
    });

    describe('mapPosition', () => {
        it('should map "center" to 0.5, 0.5', () => {
            const result = confettiManager.mapPosition('center');
            expect(result).toEqual({ x: 0.5, y: 0.5 });
        });

        it('should map "top" to 0.5, 0', () => {
            const result = confettiManager.mapPosition('top');
            expect(result).toEqual({ x: 0.5, y: 0 });
        });

        it('should map "bottom" to 0.5, 1', () => {
            const result = confettiManager.mapPosition('bottom');
            expect(result).toEqual({ x: 0.5, y: 1 });
        });

        it('should map "left" to 0, 0.5', () => {
            const result = confettiManager.mapPosition('left');
            expect(result).toEqual({ x: 0, y: 0.5 });
        });

        it('should map "right" to 1, 0.5', () => {
            const result = confettiManager.mapPosition('right');
            expect(result).toEqual({ x: 1, y: 0.5 });
        });

        it('should map "top-left" to 0, 0', () => {
            const result = confettiManager.mapPosition('top-left');
            expect(result).toEqual({ x: 0, y: 0 });
        });

        it('should map "top-right" to 1, 0', () => {
            const result = confettiManager.mapPosition('top-right');
            expect(result).toEqual({ x: 1, y: 0 });
        });

        it('should map "bottom-left" to 0, 1', () => {
            const result = confettiManager.mapPosition('bottom-left');
            expect(result).toEqual({ x: 0, y: 1 });
        });

        it('should map "bottom-right" to 1, 1', () => {
            const result = confettiManager.mapPosition('bottom-right');
            expect(result).toEqual({ x: 1, y: 1 });
        });

        it('should return random position for "random"', () => {
            const random = vi.spyOn(Math, 'random').mockReturnValueOnce(0.25).mockReturnValueOnce(0.75);
            const result = confettiManager.mapPosition('random');
            expect(result).toEqual({ x: 0.25, y: 0.75 });
            random.mockRestore();
        });

        it('should default to center for unknown position', () => {
            const result = confettiManager.mapPosition('unknown');
            expect(result).toEqual({ x: 0.5, y: 0.5 });
        });
    });

    describe('getEdgePosition', () => {
        it('should distribute positions across top edge', () => {
            const result1 = confettiManager.getEdgePosition('top', 0, 7);
            const result2 = confettiManager.getEdgePosition('top', 3, 7);
            const result3 = confettiManager.getEdgePosition('top', 6, 7);

            // All should be on top edge (y = 0)
            expect(result1.y).toBe(0);
            expect(result2.y).toBe(0);
            expect(result3.y).toBe(0);

            // X positions should be distributed
            expect(result1.x).toBeCloseTo(0.05, 2);
            expect(result2.x).toBeCloseTo(0.5, 2);
            expect(result3.x).toBeCloseTo(0.95, 2);
        });

        it('should distribute positions across bottom edge', () => {
            const result1 = confettiManager.getEdgePosition('bottom', 0, 5);
            const result2 = confettiManager.getEdgePosition('bottom', 4, 5);

            // All should be on bottom edge (y = 1)
            expect(result1.y).toBe(1);
            expect(result2.y).toBe(1);

            // X positions should be distributed
            expect(result1.x).toBeCloseTo(0.05, 2);
            expect(result2.x).toBeCloseTo(0.95, 2);
        });

        it('should distribute positions across left edge', () => {
            const result = confettiManager.getEdgePosition('left', 2, 5);

            // Should be on left edge (x = 0)
            expect(result.x).toBe(0);
            // Y position should be distributed
            expect(result.y).toBeGreaterThan(0);
            expect(result.y).toBeLessThan(1);
        });

        it('should distribute positions across right edge', () => {
            const result = confettiManager.getEdgePosition('right', 2, 5);

            // Should be on right edge (x = 1)
            expect(result.x).toBe(1);
            // Y position should be distributed
            expect(result.y).toBeGreaterThan(0);
            expect(result.y).toBeLessThan(1);
        });

        it('should handle center position gracefully', () => {
            const result = confettiManager.getEdgePosition('center', 2, 5);

            // Should distribute along x-axis at center y
            expect(result.y).toBe(0.5);
            expect(result.x).toBeGreaterThan(0);
            expect(result.x).toBeLessThan(1);
        });
    });

    describe('getRandomEdgePosition', () => {
        it('should return position along top edge', () => {
            const result = confettiManager.getRandomEdgePosition('top');
            expect(result.y).toBe(0);
            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeLessThanOrEqual(1);
        });

        it('should return position along bottom edge', () => {
            const result = confettiManager.getRandomEdgePosition('bottom');
            expect(result.y).toBe(1);
            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeLessThanOrEqual(1);
        });

        it('should return position along left edge', () => {
            const result = confettiManager.getRandomEdgePosition('left');
            expect(result.x).toBe(0);
            expect(result.y).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeLessThanOrEqual(1);
        });

        it('should return position along right edge', () => {
            const result = confettiManager.getRandomEdgePosition('right');
            expect(result.x).toBe(1);
            expect(result.y).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeLessThanOrEqual(1);
        });

        it('should return random position for "random"', () => {
            const random = vi.spyOn(Math, 'random').mockReturnValueOnce(0.25).mockReturnValueOnce(0.75);
            const result = confettiManager.getRandomEdgePosition('random');
            expect(result).toEqual({ x: 0.25, y: 0.75 });
            random.mockRestore();
        });

        it('should handle top-left corner by randomizing x', () => {
            // A corner's own x (0) would pass a range check, so pin the random value
            const random = vi.spyOn(Math, 'random').mockReturnValue(0.3);
            const result = confettiManager.getRandomEdgePosition('top-left');
            expect(result).toEqual({ x: 0.3, y: 0 });
            random.mockRestore();
        });

        it('should handle bottom-right corner by randomizing x', () => {
            const random = vi.spyOn(Math, 'random').mockReturnValue(0.3);
            const result = confettiManager.getRandomEdgePosition('bottom-right');
            expect(result).toEqual({ x: 0.3, y: 1 });
            random.mockRestore();
        });
    });

    describe('createEmojiShapes', () => {
        it('should create shapes for single emoji', () => {
            const result = confettiManager.createEmojiShapes('🎉');
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(1);
        });

        it('should create shapes for multiple emoji', () => {
            const result = confettiManager.createEmojiShapes('🍂🍁🍃');
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(3);
        });

        it('should handle emoji with skin tone modifiers', () => {
            const result = confettiManager.createEmojiShapes('👍🏻👍🏿');
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThanOrEqual(2);
        });

        it('should return null for empty string', () => {
            const result = confettiManager.createEmojiShapes('');
            expect(result).toBeNull();
        });

        it('should return null for null input', () => {
            const result = confettiManager.createEmojiShapes(null);
            expect(result).toBeNull();
        });

        it('should handle complex emoji like flags', () => {
            const result = confettiManager.createEmojiShapes('🇺🇸🇬🇧');
            // Adjacent flags stay separate, one shape each
            expect(result).toEqual([
                { text: '🇺🇸', scalar: 1 },
                { text: '🇬🇧', scalar: 1 }
            ]);
        });
    });

    describe('buildOptions', () => {
        describe('light theme palettes', () => {
            afterEach(() => {
                document.body.classList.remove('theme-light');
            });

            it('draws white presets in their light palette in the light theme', () => {
                document.body.classList.add('theme-light');
                for (const name of ['snow', 'snowflakes', 'space', 'aliens']) {
                    const { options } = confettiManager.buildOptions(name, {});
                    expect(options.colors, name).toEqual(getLightThemeColors(name));
                    expect(options.colors).not.toContain('#ffffff');
                }
            });

            it('keeps the preset colours in the dark theme', () => {
                const { options } = confettiManager.buildOptions('snow', {});
                expect(options.colors).toEqual(CONFETTI_PRESETS.snow.colors);
            });

            it('keeps colours the note sets in the light theme', () => {
                document.body.classList.add('theme-light');
                const { options } = confettiManager.buildOptions('snow', { colors: ['#ffffff'] });
                expect(options.colors).toEqual(['#ffffff']);
            });

            it('leaves presets without a light palette alone', () => {
                document.body.classList.add('theme-light');
                const { options } = confettiManager.buildOptions('confetti', {});
                expect(getLightThemeColors('confetti')).toBeNull();
                expect(options.colors).toEqual(CONFETTI_PRESETS.confetti.colors);
            });
        });

        it('should merge preset with empty overrides', () => {
            const result = confettiManager.buildOptions('confetti', {});
            expect(result).toBeTruthy();
            expect(result.options).toHaveProperty('particleCount');
            expect(result.options).toHaveProperty('spread');
            expect(result.options).toHaveProperty('gravity');
        });

        it('should apply count override', () => {
            const result = confettiManager.buildOptions('confetti', { count: 50 });
            expect(result.options.particleCount).toBe(50);
        });

        it('should apply size override', () => {
            const result = confettiManager.buildOptions('confetti', { size: 2.0 });
            expect(result.options.scalar).toBe(2.0);
        });

        it('should apply speed override', () => {
            const result = confettiManager.buildOptions('confetti', { speed: 70 });
            expect(result.options.startVelocity).toBe(70);
        });

        it('should apply gravity override', () => {
            const result = confettiManager.buildOptions('confetti', { gravity: 2.0 });
            expect(result.options.gravity).toBe(2.0);
        });

        it('should apply spread override', () => {
            const result = confettiManager.buildOptions('confetti', { spread: 180 });
            expect(result.options.spread).toBe(180);
        });

        it('should apply drift override', () => {
            const result = confettiManager.buildOptions('confetti', { drift: 2.0 });
            expect(result.options.drift).toBe(2.0);
        });

        it('should apply duration override', () => {
            const result = confettiManager.buildOptions('confetti', { duration: 300 });
            expect(result.options.ticks).toBe(300);
        });

        it('should apply colors override', () => {
            const colors = ['#ff0000', '#00ff00'];
            const result = confettiManager.buildOptions('confetti', { colors });
            expect(result.options.colors).toEqual(colors);
        });

        it('should use emoji shapes when emoji is provided', () => {
            const result = confettiManager.buildOptions('confetti', { emoji: '🎉' });
            expect(result.options).toHaveProperty('shapes');
            expect(Array.isArray(result.options.shapes)).toBe(true);
        });

        it('should return null for invalid preset', () => {
            const result = confettiManager.buildOptions('nonexistent', {});
            expect(result).toBeNull();
        });

        it('should set correct origin from position', () => {
            const result = confettiManager.buildOptions('confetti', { position: 'top-left' });
            expect(result.options.origin).toEqual({ x: 0, y: 0 });
        });

        it('should include config in result', () => {
            const result = confettiManager.buildOptions('snow', { count: 100 });
            expect(result.config).toBeTruthy();
            expect(result.config.count).toBe(100);
        });
    });

    describe('hasActiveEffect', () => {
        it('should return false for non-existent note', () => {
            const result = confettiManager.hasActiveEffect('nonexistent-note');
            expect(result).toBe(false);
        });

        it('should return true after starting effect', () => {
            const mockElement = document.createElement('div');
            confettiManager.start('test-note', mockElement, 'confetti', {});
            const result = confettiManager.hasActiveEffect('test-note');
            expect(result).toBe(true);
        });

        it('should return false after stopping effect', () => {
            const mockElement = document.createElement('div');
            confettiManager.start('test-note', mockElement, 'confetti', {});
            confettiManager.stop('test-note', 0);
            const result = confettiManager.hasActiveEffect('test-note');
            expect(result).toBe(false);
        });
    });

    describe('start and stop', () => {
        it('should start confetti effect', () => {
            const mockElement = document.createElement('div');
            confettiManager.start('test-note', mockElement, 'confetti', {});
            expect(confettiManager.hasActiveEffect('test-note')).toBe(true);
        });

        it('should stop confetti effect', () => {
            const mockElement = document.createElement('div');
            confettiManager.start('test-note', mockElement, 'confetti', {});
            confettiManager.stop('test-note', 0);
            expect(confettiManager.hasActiveEffect('test-note')).toBe(false);
        });

        it('should handle stopping non-existent effect gracefully', () => {
            expect(() => {
                confettiManager.stop('nonexistent', 0);
            }).not.toThrow();
        });

        it('should clean up canvas on stop', () => {
            const mockElement = document.createElement('div');
            confettiManager.start('test-note', mockElement, 'confetti', {});
            expect(mockElement.querySelectorAll('.pixel-banner-confetti-canvas').length).toBe(1);
            confettiManager.stop('test-note', 0);
            const canvases = mockElement.querySelectorAll('.pixel-banner-confetti-canvas');
            expect(canvases.length).toBe(0);
        });

        it('should apply fade in transition', () => {
            const mockElement = document.createElement('div');
            confettiManager.start('test-note', mockElement, 'snow', { fadeIn: 1000 });
            const canvas = mockElement.querySelector('.pixel-banner-confetti-canvas');
            expect(canvas.style.transition).toContain('1000ms');
        });

        it('should handle continuous effects', () => {
            const mockElement = document.createElement('div');
            confettiManager.start('test-note', mockElement, 'snow', {});
            expect(confettiManager.getEffect('test-note').isContinuous).toBe(true);
            expect(confettiManager.getEffect('test-note').config.interval).toBe(CONFETTI_PRESETS.snow.interval);
            confettiManager.stop('test-note', 0);
        });
    });

    describe('stopAll', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should stop all active effects and remove their canvases after the fade', () => {
            const mockElement1 = document.createElement('div');
            const mockElement2 = document.createElement('div');
            confettiManager.start('note1', mockElement1, 'confetti', {});
            confettiManager.start('note2', mockElement2, 'snow', {});

            confettiManager.stopAll();

            expect(confettiManager.hasActiveEffect('note1')).toBe(false);
            expect(confettiManager.hasActiveEffect('note2')).toBe(false);
            // The canvases stay while they fade out, then go
            expect(mockElement1.querySelector('.pixel-banner-confetti-canvas')).not.toBeNull();
            vi.advanceTimersByTime(500);
            expect(mockElement1.querySelector('.pixel-banner-confetti-canvas')).toBeNull();
            expect(mockElement2.querySelector('.pixel-banner-confetti-canvas')).toBeNull();
        });

        it('should handle stopping when no effects are active', () => {
            expect(() => {
                confettiManager.stopAll();
            }).not.toThrow();
        });
    });

    describe('per-pane effects', () => {
        let manager;

        beforeEach(() => {
            vi.useFakeTimers();
            FakeIntersectionObserver.instances = [];
            FakeResizeObserver.instances = [];
            vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
            vi.stubGlobal('ResizeObserver', FakeResizeObserver);
            manager = new ConfettiManager();
        });

        afterEach(() => {
            manager.destroy();
            vi.unstubAllGlobals();
            vi.useRealTimers();
        });

        it('creates a main-thread instance per canvas (no shared worker)', () => {
            manager.start('leaf-1', sizedElement(), 'snow', {});
            manager.start('leaf-2', sizedElement(), 'snow', {});

            expect(confetti.create).toHaveBeenCalledTimes(2);
            for (const [canvas, opts] of confetti.create.mock.calls) {
                expect(canvas.tagName).toBe('CANVAS');
                expect(opts).toEqual({ resize: false, useWorker: false });
            }
        });

        it('overlays a canvas styled by class that starts transparent', () => {
            const el = sizedElement();
            const effect = manager.start('leaf-1', el, 'snow', {});

            expect(el.querySelector('.pixel-banner-confetti-canvas')).toBe(effect.canvas);
            // Layout comes from styles.css, not inline styles
            expect(effect.canvas.style.position).toBe('');
            expect(effect.canvas.style.pointerEvents).toBe('');
            expect(effect.canvas.style.opacity).toBe('0');
        });

        it('marks a static container as the host only while an effect runs in it', () => {
            const el = sizedElement();
            document.body.appendChild(el);
            try {
                const first = manager.start('leaf-1', el, 'snow', {});
                expect(el.classList.contains('pixel-banner-confetti-host')).toBe(true);
                expect(el.style.position).toBe('');

                const preview = manager.start('preview', el, 'snow', {});
                manager.stop('leaf-1', 0);
                expect(first.disposed).toBe(true);
                expect(el.classList.contains('pixel-banner-confetti-host')).toBe(true);

                manager.stop('preview', 0);
                expect(preview.disposed).toBe(true);
                expect(el.classList.contains('pixel-banner-confetti-host')).toBe(false);
            } finally {
                el.remove();
            }
        });

        it('keeps the canvas buffer at the container size', () => {
            const el = sizedElement(640, 200);
            const effect = manager.start('leaf-1', el, 'snow', {});
            expect([effect.canvas.width, effect.canvas.height]).toEqual([640, 200]);

            setSize(el, 300, 150);
            FakeResizeObserver.instances[0].trigger();

            expect([effect.canvas.width, effect.canvas.height]).toEqual([300, 150]);
        });

        it('resets particles in flight when the container resizes after the first burst', () => {
            const el = sizedElement(640, 200);
            manager.start('leaf-1', el, 'snow', {});
            expect(mockConfettiInstance).toHaveBeenCalled();
            mockConfettiInstance.reset.mockClear();

            // Same size: nothing to clear
            FakeResizeObserver.instances[0].trigger();
            expect(mockConfettiInstance.reset).not.toHaveBeenCalled();

            setSize(el, 300, 150);
            FakeResizeObserver.instances[0].trigger();
            expect(mockConfettiInstance.reset).toHaveBeenCalledTimes(1);
        });

        it('fires nothing on a 0x0 container until it gets a size', () => {
            const el = sizedElement(0, 0);
            const effect = manager.start('leaf-1', el, 'snow', {});

            expect(effect.intervalId).toBeNull();
            expect(mockConfettiInstance).not.toHaveBeenCalled();

            setSize(el, 400, 300);
            FakeResizeObserver.instances[0].trigger();

            expect(mockConfettiInstance).toHaveBeenCalled();
            expect(effect.intervalId).not.toBeNull();
        });

        it('runs an interval for a continuous preset and fires at once', () => {
            const effect = manager.start('leaf-1', sizedElement(), 'snow', {});

            expect(effect.isContinuous).toBe(true);
            expect(effect.intervalId).not.toBeNull();
            expect(mockConfettiInstance).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(effect.config.interval * 3);
            expect(mockConfettiInstance).toHaveBeenCalledTimes(4);
        });

        it('fires a single-burst effect once, with no interval', () => {
            const effect = manager.start('leaf-1', sizedElement(), 'confetti', { continuous: false });

            expect(effect.isContinuous).toBe(false);
            expect(effect.intervalId).toBeNull();
            vi.advanceTimersByTime(10000);
            expect(mockConfettiInstance).toHaveBeenCalledTimes(1);
        });

        it('pauses while the document is hidden and resumes with an immediate burst', () => {
            const effect = manager.start('leaf-1', sizedElement(), 'snow', {});
            const hidden = vi.spyOn(document, 'hidden', 'get');

            hidden.mockReturnValue(true);
            manager._onVisibilityChange();
            expect(effect.intervalId).toBeNull();

            mockConfettiInstance.mockClear();
            hidden.mockReturnValue(false);
            manager._onVisibilityChange();
            expect(effect.intervalId).not.toBeNull();
            expect(mockConfettiInstance).toHaveBeenCalledTimes(1);
            hidden.mockRestore();
        });

        // A popout window has its own document: its visibility, not the main
        // window's, pauses the effects in it
        it('follows the visibility of a popout window document', () => {
            const popoutDoc = document.implementation.createHTMLDocument('popout');
            let popoutHidden = false;
            Object.defineProperty(popoutDoc, 'hidden', { get: () => popoutHidden, configurable: true });
            const add = vi.spyOn(popoutDoc, 'addEventListener');
            const remove = vi.spyOn(popoutDoc, 'removeEventListener');
            const popoutEl = popoutDoc.createElement('div');
            setSize(popoutEl, 800, 400);
            popoutEl.doc = popoutDoc;
            const mainEl = sizedElement();

            const popout = manager.start('leaf-1', popoutEl, 'snow', {});
            const second = manager.start('leaf-2', popoutEl, 'snow', {});
            const main = manager.start('leaf-3', mainEl, 'snow', {});

            // The canvas comes from the popout's document, one listener per document
            expect(popout.canvas.ownerDocument).toBe(popoutDoc);
            expect(add.mock.calls.filter(call => call[0] === 'visibilitychange')).toHaveLength(1);

            popoutHidden = true;
            popoutDoc.dispatchEvent(new Event('visibilitychange'));
            expect(popout.intervalId).toBeNull();
            expect(second.intervalId).toBeNull();
            expect(main.intervalId).not.toBeNull();

            popoutHidden = false;
            manager._onVisibilityChange();
            expect(popout.intervalId).not.toBeNull();

            // Released with the last effect in that window
            manager.stop('leaf-1', 0);
            expect(remove).not.toHaveBeenCalled();
            manager.stop('leaf-2', 0);
            expect(remove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
            expect(manager.popoutDocs.size).toBe(0);
        });

        it('pauses a hidden or scrolled-away pane and resumes when it is back', () => {
            const el = sizedElement();
            document.body.appendChild(el);
            const effect = manager.start('leaf-1', el, 'snow', {});
            const observer = FakeIntersectionObserver.instances[0];

            observer.trigger(false);
            expect(effect.intervalId).toBeNull();

            observer.trigger(true);
            expect(effect.intervalId).not.toBeNull();
            el.remove();
        });

        // Regression: a pane hidden behind another tab has no shown scroller.
        // Its first banner (often in the editing view, hidden in reading mode)
        // never comes on screen, so watching it kept the effect paused after
        // the tab was shown again.
        it('watches the container, not a banner outside the shown scroller', () => {
            const el = sizedElement();
            const banner = document.createElement('div');
            banner.className = 'pixel-banner-image';
            el.appendChild(banner);

            manager.start('leaf-1', el, 'snow', {});

            const observer = FakeIntersectionObserver.instances[0];
            expect(observer.targets).toEqual([el]);
            expect(observer.options.root).toBeNull();
        });

        it('resumes when a hidden tab is shown again, then watches its banner', () => {
            const el = sizedElement();
            let shown = false;
            const scroller = document.createElement('div');
            scroller.className = 'markdown-preview-view';
            Object.defineProperty(scroller, 'offsetParent', { get: () => (shown ? el : null) });
            const banner = document.createElement('div');
            banner.className = 'pixel-banner-image';
            scroller.appendChild(banner);
            el.appendChild(scroller);
            document.body.appendChild(el);
            const effect = manager.start('leaf-1', el, 'snow', {});
            const hiddenObserver = FakeIntersectionObserver.instances[0];
            hiddenObserver.trigger(false);
            expect(effect.intervalId).toBeNull();

            shown = true;
            hiddenObserver.trigger(true);

            expect(effect.intervalId).not.toBeNull();
            const bannerObserver = FakeIntersectionObserver.instances[1];
            expect(bannerObserver.targets).toEqual([banner]);
            expect(bannerObserver.options.root).toBe(scroller);
            expect(hiddenObserver.disconnected).toBe(true);
            el.remove();
        });

        // A shown editor scroller: offsetParent is how the effect tells it is shown
        function addScroller(el) {
            const scroller = document.createElement('div');
            scroller.className = 'cm-scroller';
            Object.defineProperty(scroller, 'offsetParent', { get: () => el });
            el.appendChild(scroller);
            return scroller;
        }

        it('watches the banner inside the shown scroller', () => {
            const el = sizedElement();
            const scroller = addScroller(el);
            const banner = document.createElement('div');
            banner.className = 'pixel-banner-image';
            scroller.appendChild(banner);

            manager.start('leaf-1', el, 'snow', {});

            const observer = FakeIntersectionObserver.instances[0];
            expect(observer.targets).toEqual([banner]);
            expect(observer.options.root).toBe(scroller);
        });

        // Regression: a new split pane has its scroller but no banner yet. The
        // container holds the scroller, so watching it against the scroller
        // never intersects and the effect stayed paused for good.
        it('watches a pane without a banner against the viewport, not its own scroller', () => {
            const el = sizedElement();
            addScroller(el);

            const effect = manager.start('leaf-1', el, 'snow', {});

            const observer = FakeIntersectionObserver.instances[0];
            expect(observer.targets).toEqual([el]);
            expect(observer.options.root).toBeNull();
            observer.trigger(true);
            expect(effect.intervalId).not.toBeNull();
        });

        // Regression: in a new split the banner renders after the effect
        // starts; a matching update() must start watching it, or scrolling
        // the banner away never pauses the effect
        it('watches a banner that renders after the effect started once update() runs', () => {
            const el = sizedElement();
            const scroller = addScroller(el);
            document.body.appendChild(el);
            const effect = manager.start('leaf-1', el, 'snow', {});
            FakeIntersectionObserver.instances[0].trigger(true);
            expect(FakeIntersectionObserver.instances).toHaveLength(1);

            const banner = document.createElement('div');
            banner.className = 'pixel-banner-image';
            scroller.appendChild(banner);
            expect(manager.update('leaf-1', el, 'snow', {})).toBe(effect);

            const bannerObserver = FakeIntersectionObserver.instances[1];
            expect(bannerObserver.targets).toEqual([banner]);
            expect(bannerObserver.options.root).toBe(scroller);
            bannerObserver.trigger(false);
            expect(effect.intervalId).toBeNull();
            el.remove();
        });

        it('watches a banner that renders later at a burst within a second, then pauses when it scrolls away', () => {
            const el = sizedElement();
            const scroller = addScroller(el);
            document.body.appendChild(el);
            const effect = manager.start('leaf-1', el, 'snow', {});
            FakeIntersectionObserver.instances[0].trigger(true);

            const banner = document.createElement('div');
            banner.className = 'pixel-banner-image';
            scroller.appendChild(banner);
            vi.advanceTimersByTime(1000);

            const bannerObserver = FakeIntersectionObserver.instances[1];
            expect(bannerObserver.targets).toEqual([banner]);
            bannerObserver.trigger(false);
            expect(effect.intervalId).toBeNull();
            el.remove();
        });

        // Regression: a note without a banner re-ran the lookup (a forced
        // layout) on every burst, 10 times a second for snow
        it('looks for a missing banner at most once a second, not on every burst', () => {
            const el = sizedElement();
            addScroller(el);
            document.body.appendChild(el);
            const effect = manager.start('leaf-1', el, 'snow', {});
            const lookups = vi.spyOn(el, 'querySelectorAll');
            mockConfettiInstance.mockClear();

            vi.advanceTimersByTime(2000);

            expect(mockConfettiInstance.mock.calls.length).toBe(2000 / effect.config.interval);
            expect(lookups.mock.calls.length).toBeLessThanOrEqual(2);
            expect(effect.observedEl).toBe(el);
            el.remove();
        });

        it('re-targets instead of pausing when the watched banner is re-rendered', () => {
            const el = sizedElement();
            const scroller = addScroller(el);
            const oldBanner = document.createElement('div');
            oldBanner.className = 'pixel-banner-image';
            scroller.appendChild(oldBanner);
            document.body.appendChild(el);
            const effect = manager.start('leaf-1', el, 'snow', {});

            oldBanner.remove();
            const newBanner = document.createElement('div');
            newBanner.className = 'pixel-banner-image';
            scroller.appendChild(newBanner);
            FakeIntersectionObserver.instances[0].trigger(false, oldBanner);

            expect(effect.intervalId).not.toBeNull();
            expect(FakeIntersectionObserver.instances[1].targets).toEqual([newBanner]);
            el.remove();
        });

        it('pauses and resumes by id', () => {
            const effect = manager.start('leaf-1', sizedElement(), 'snow', {});

            manager.pause('leaf-1');
            expect(effect.intervalId).toBeNull();
            manager.resume('leaf-1');
            expect(effect.intervalId).not.toBeNull();
        });

        it('stop clears the interval at once but resets particles only after the fade', () => {
            const el = sizedElement();
            const effect = manager.start('leaf-1', el, 'snow', {});
            mockConfettiInstance.reset.mockClear();

            manager.stop('leaf-1', 500);

            expect(effect.intervalId).toBeNull();
            expect(manager.hasActiveEffect('leaf-1')).toBe(false);
            expect(mockConfettiInstance.reset).not.toHaveBeenCalled();
            expect(el.querySelector('canvas').style.opacity).toBe('0');

            vi.advanceTimersByTime(499);
            expect(mockConfettiInstance.reset).not.toHaveBeenCalled();
            expect(el.querySelector('canvas')).not.toBeNull();

            vi.advanceTimersByTime(1);
            expect(mockConfettiInstance.reset).toHaveBeenCalledTimes(1);
            expect(el.querySelector('canvas')).toBeNull();
        });

        it('stop with 0 removes everything at once and cancels the fade-in', () => {
            const el = sizedElement();
            const effect = manager.start('leaf-1', el, 'snow', { fadeIn: 1000 });

            manager.stop('leaf-1', 0);

            expect(mockConfettiInstance.reset).toHaveBeenCalled();
            expect(el.querySelector('canvas')).toBeNull();
            expect(effect.fadeInTimeoutId).toBeNull();
            expect(FakeIntersectionObserver.instances[0].disconnected).toBe(true);
            expect(FakeResizeObserver.instances[0].disconnected).toBe(true);
            expect(vi.getTimerCount()).toBe(0);
        });

        it('dispose is idempotent and leaves no DOM, timers or observers', () => {
            const el = sizedElement();
            const effect = manager.start('leaf-1', el, 'snow', { delay: 1000 });

            effect.dispose();
            effect.dispose();

            expect(el.childElementCount).toBe(0);
            expect(vi.getTimerCount()).toBe(0);
            expect(manager.hasActiveEffect('leaf-1')).toBe(false);
        });

        it('update with an equal config keeps the running effect', () => {
            const el = sizedElement();
            const first = manager.start('leaf-1', el, 'snow', { count: 5, colors: ['#fff'] });

            const second = manager.update('leaf-1', el, 'snow', { colors: '#fff', count: '5' });

            expect(second).toBe(first);
            expect(confetti.create).toHaveBeenCalledTimes(1);
        });

        it('update with a different config restarts that one effect', () => {
            const el = sizedElement();
            const first = manager.start('leaf-1', el, 'snow', {});
            const other = manager.start('leaf-2', sizedElement(), 'snow', {});

            const second = manager.update('leaf-1', el, 'snow', { count: 9 });

            expect(second).not.toBe(first);
            expect(manager.getEffect('leaf-2')).toBe(other);
        });

        it('keeps note effects and the preview independent', () => {
            manager.start('leaf-1', sizedElement(), 'snow', {});
            manager.start(PREVIEW_EFFECT_ID, sizedElement(), 'hearts', {}, { isPreview: true });
            manager.start('leaf-2', sizedElement(), 'snow', {});

            expect(manager.hasActiveEffect(PREVIEW_EFFECT_ID)).toBe(true);
            expect(manager.getNoteEffectIds().sort()).toEqual(['leaf-1', 'leaf-2']);

            manager.stop(PREVIEW_EFFECT_ID, 0);
            expect(manager.hasActiveEffect('leaf-1')).toBe(true);
        });

        it('stores the file path and the raw parsed config on each effect', () => {
            const effect = manager.start('leaf-1', sizedElement(), 'snow', { count: 3 }, { filePath: 'a.md' });

            expect(effect.filePath).toBe('a.md');
            expect(effect.rawConfig).toEqual({ presetName: 'snow', overrides: { count: 3 } });
        });

        it('destroy disposes running and fading effects', () => {
            const el1 = sizedElement();
            const el2 = sizedElement();
            manager.start('leaf-1', el1, 'snow', {});
            manager.start('leaf-2', el2, 'snow', {});
            manager.stop('leaf-2', 500);

            manager.destroy();

            expect(el1.querySelector('canvas')).toBeNull();
            expect(el2.querySelector('canvas')).toBeNull();
            expect(vi.getTimerCount()).toBe(0);
        });
    });

    describe('plugin lifecycle', () => {
        function fakePlugin() {
            const registered = [];
            return {
                registered,
                intervals: [],
                registerDomEvent: vi.fn((el, type, fn) => {
                    el.addEventListener(type, fn);
                    registered.push(() => el.removeEventListener(type, fn));
                }),
                registerInterval: vi.fn(function (id) { this.intervals.push(id); return id; }),
                register: vi.fn(fn => registered.push(fn)),
                unload() {
                    registered.splice(0).forEach(off => off());
                }
            };
        }

        it('registers the visibilitychange listener through the plugin, once', () => {
            const manager = new ConfettiManager();
            const plugin = fakePlugin();

            manager.init(plugin);
            manager.init(plugin);

            expect(plugin.registerDomEvent).toHaveBeenCalledTimes(1);
            expect(plugin.registerDomEvent).toHaveBeenCalledWith(document, 'visibilitychange', expect.any(Function));
            manager.destroy();
            plugin.unload();
        });

        it('keeps the document listener count stable across init/destroy cycles', () => {
            const add = vi.spyOn(document, 'addEventListener');
            const remove = vi.spyOn(document, 'removeEventListener');
            const manager = new ConfettiManager();

            for (let i = 0; i < 3; i++) {
                const plugin = fakePlugin();
                manager.init(plugin);
                manager.destroy();
                plugin.unload();
            }

            const added = add.mock.calls.filter(call => call[0] === 'visibilitychange').length;
            const removed = remove.mock.calls.filter(call => call[0] === 'visibilitychange').length;
            expect(added).toBe(3);
            expect(removed).toBe(3);
            add.mockRestore();
            remove.mockRestore();
        });

        it('registers one unload cleanup that disposes every effect, not one per interval', () => {
            vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
            vi.stubGlobal('ResizeObserver', FakeResizeObserver);
            const manager = new ConfettiManager();
            const plugin = fakePlugin();
            manager.init(plugin);

            const el = sizedElement();
            const effect = manager.start('leaf-1', el, 'snow', {});
            manager.pause('leaf-1');
            manager.resume('leaf-1');

            expect(plugin.register).toHaveBeenCalledTimes(1);
            expect(plugin.registerInterval).not.toHaveBeenCalled();

            plugin.unload();
            expect(effect.disposed).toBe(true);
            expect(el.querySelector('canvas')).toBeNull();
            vi.unstubAllGlobals();
        });
    });

    describe('gates', () => {
        function mockReducedMotion(matches) {
            window.matchMedia = vi.fn().mockReturnValue({ matches });
        }

        afterEach(() => {
            Platform.isMobile = false;
            mockReducedMotion(false);
        });

        it('allows confetti by default', () => {
            mockReducedMotion(false);
            expect(shouldRunConfetti({ settings: { confettiDisableOnMobile: true } }, {})).toBe(true);
        });

        it('blocks on mobile when Disable on Mobile is set', () => {
            Platform.isMobile = true;
            expect(shouldRunConfetti({ settings: { confettiDisableOnMobile: true } }, {})).toBe(false);
            expect(shouldRunConfetti({ settings: { confettiDisableOnMobile: false } }, {})).toBe(true);
        });

        it('blocks under reduced motion unless the effect opts out', () => {
            mockReducedMotion(true);
            expect(shouldRunConfetti({ settings: {} }, {})).toBe(false);
            expect(shouldRunConfetti({ settings: {} }, { respectReducedMotion: false })).toBe(true);
        });

        it('passes the reduced-motion opt-out to canvas-confetti', () => {
            expect(confettiManager.buildOptions('snow', {}).options.disableForReducedMotion).toBe(true);
            expect(confettiManager.buildOptions('snow', { respectReducedMotion: false }).options.disableForReducedMotion).toBe(false);
        });
    });

    describe('error handling', () => {
        it('should not throw on invalid preset', () => {
            const mockElement = document.createElement('div');
            expect(() => {
                confettiManager.start('test', mockElement, 'invalid-preset', {});
            }).not.toThrow();
        });

        it('should handle null element gracefully', () => {
            let result;
            expect(() => {
                result = confettiManager.start('test', null, 'confetti', {});
            }).not.toThrow();
            expect(result).toBeNull();
            expect(confettiManager.hasActiveEffect('test')).toBe(false);
        });
    });

    describe('fireBurst with originSpread', () => {
        it('should handle edge spread type by firing multiple bursts', () => {
            const mockConfettiInstance = vi.fn(() => Promise.resolve());
            const config = {
                count: 50,
                position: 'top',
                originSpread: 'edge',
                drift: 0.5,
                emoji: null
            };
            const baseOptions = {
                particleCount: 50,
                origin: { x: 0.5, y: 0 }
            };

            confettiManager.fireBurst(mockConfettiInstance, config, baseOptions);

            // Should fire 7 bursts (numBursts = 7)
            expect(mockConfettiInstance).toHaveBeenCalledTimes(7);

            // Each burst should have different x position but same y = 0 (top edge)
            const calls = mockConfettiInstance.mock.calls;
            calls.forEach(call => {
                const options = call[0];
                expect(options.origin.y).toBe(0);
                expect(options.origin.x).toBeGreaterThanOrEqual(0);
                expect(options.origin.x).toBeLessThanOrEqual(1);
            });
        });

        it('should handle random spread type by setting random position', () => {
            const mockConfettiInstance = vi.fn(() => Promise.resolve());
            const config = {
                count: 50,
                position: 'bottom',
                originSpread: 'random',
                emoji: null
            };
            const baseOptions = {
                particleCount: 50,
                origin: { x: 0.5, y: 1 }
            };

            confettiManager.fireBurst(mockConfettiInstance, config, baseOptions);

            // Should fire only 1 burst
            expect(mockConfettiInstance).toHaveBeenCalledTimes(1);

            // Origin should be on bottom edge but x is randomized
            const options = mockConfettiInstance.mock.calls[0][0];
            expect(options.origin.y).toBe(1);
            expect(options.origin.x).toBeGreaterThanOrEqual(0);
            expect(options.origin.x).toBeLessThanOrEqual(1);
        });

        it('should handle fixed spread type with original behavior', () => {
            const mockConfettiInstance = vi.fn(() => Promise.resolve());
            const config = {
                count: 50,
                position: 'center',
                originSpread: 'fixed',
                emoji: null
            };
            const baseOptions = {
                particleCount: 50,
                origin: { x: 0.5, y: 0.5 }
            };

            confettiManager.fireBurst(mockConfettiInstance, config, baseOptions);

            // Should fire only 1 burst
            expect(mockConfettiInstance).toHaveBeenCalledTimes(1);

            // Origin should be exactly as specified
            const options = mockConfettiInstance.mock.calls[0][0];
            expect(options.origin).toEqual({ x: 0.5, y: 0.5 });
        });

        it('should default to fixed spread when originSpread is not specified', () => {
            const mockConfettiInstance = vi.fn(() => Promise.resolve());
            const config = {
                count: 50,
                position: 'center',
                emoji: null
            };
            const baseOptions = {
                particleCount: 50,
                origin: { x: 0.5, y: 0.5 }
            };

            confettiManager.fireBurst(mockConfettiInstance, config, baseOptions);

            // Should fire only 1 burst (fixed behavior)
            expect(mockConfettiInstance).toHaveBeenCalledTimes(1);
        });

        it('should distribute particles evenly across edge bursts', () => {
            const mockConfettiInstance = vi.fn(() => Promise.resolve());
            const config = {
                count: 49,
                position: 'top',
                originSpread: 'edge',
                drift: 0,
                emoji: null
            };
            const baseOptions = {
                particleCount: 49,
                origin: { x: 0.5, y: 0 }
            };

            confettiManager.fireBurst(mockConfettiInstance, config, baseOptions);

            // Each burst should get ceil(49/7) = 7 particles
            expect(mockConfettiInstance).toHaveBeenCalledTimes(7);
            const calls = mockConfettiInstance.mock.calls;
            calls.forEach(call => {
                expect(call[0].particleCount).toBe(7);
            });
        });

        it('should add drift variation for edge spread', () => {
            const mockConfettiInstance = vi.fn(() => Promise.resolve());
            const config = {
                count: 50,
                position: 'top',
                originSpread: 'edge',
                drift: 0.5,
                emoji: null
            };
            const baseOptions = {
                particleCount: 50,
                origin: { x: 0.5, y: 0 },
                drift: 0.5
            };

            confettiManager.fireBurst(mockConfettiInstance, config, baseOptions);

            // Drift should be varied (not always the same)
            const drifts = mockConfettiInstance.mock.calls.map(call => call[0].drift);
            expect(drifts).toHaveLength(7);
            // At least some variation should exist (within +/- 0.25 of original)
            drifts.forEach(drift => {
                expect(drift).toBeGreaterThanOrEqual(0.25);
                expect(drift).toBeLessThanOrEqual(0.75);
            });
        });
    });

    describe('fireBurst randomization ranges', () => {
        it('should apply speedRange as startVelocity (not speed)', () => {
            const mockConfettiInstance = vi.fn(() => Promise.resolve());
            const config = {
                count: 1,
                position: 'random',
                originSpread: 'random',
                speedRange: [3, 11],
                emoji: null
            };
            const baseOptions = {
                particleCount: 1,
                origin: { x: 0.5, y: 0.5 },
                startVelocity: 15
            };

            confettiManager.fireBurst(mockConfettiInstance, config, baseOptions);

            const call = mockConfettiInstance.mock.calls[0][0];
            expect(call.startVelocity).toBeGreaterThanOrEqual(3);
            expect(call.startVelocity).toBeLessThanOrEqual(11);
            expect(call.speed).toBeUndefined();
        });

        it('should apply sizeRange as scalar', () => {
            const mockConfettiInstance = vi.fn(() => Promise.resolve());
            const config = {
                count: 1,
                position: 'random',
                originSpread: 'random',
                sizeRange: [0.5, 1.0],
                emoji: null
            };
            const baseOptions = {
                particleCount: 1,
                origin: { x: 0.5, y: 0.5 },
                scalar: 0.7
            };

            confettiManager.fireBurst(mockConfettiInstance, config, baseOptions);

            const call = mockConfettiInstance.mock.calls[0][0];
            expect(call.scalar).toBeGreaterThanOrEqual(0.5);
            expect(call.scalar).toBeLessThanOrEqual(1.0);
        });

        it('should apply gravityRange as gravity', () => {
            const mockConfettiInstance = vi.fn(() => Promise.resolve());
            const config = {
                count: 1,
                position: 'random',
                originSpread: 'random',
                gravityRange: [0.4, 0.6],
                emoji: null
            };
            const baseOptions = {
                particleCount: 1,
                origin: { x: 0.5, y: 0.5 },
                gravity: 0.5
            };

            confettiManager.fireBurst(mockConfettiInstance, config, baseOptions);

            const call = mockConfettiInstance.mock.calls[0][0];
            expect(call.gravity).toBeGreaterThanOrEqual(0.4);
            expect(call.gravity).toBeLessThanOrEqual(0.6);
        });
    });
    describe('preset looks', () => {
        beforeEach(() => {
            clearShapeCache();
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('uses a user emoji instead of the preset custom shapes', () => {
            const result = confettiManager.buildOptions('rain_heavy', { emoji: '🌧️' });
            expect(result.options.shapes).toEqual([{ text: '🌧️', scalar: result.config.size }]);
            expect(result.options.flat).toBe(true);
            expect(result.options.colors).toBeUndefined();
        });

        it('keeps the colours of custom-shape presets', () => {
            for (const name of ['rain_light', 'rain_heavy', 'aliens', 'crystals', 'snowflakes', 'leaves']) {
                const result = confettiManager.buildOptions(name, {});
                expect(result.options.colors, name).toEqual(CONFETTI_PRESETS[name].colors);
                expect(result.options.shapes.length, name).toBe(CONFETTI_PRESETS[name].customShapes.length);
                expect(result.options.shapes[0], name).toHaveProperty('path');
            }
        });

        // Regression: the modal's Circle/Square/Star wrote only `shapes`, and
        // the preset's own custom shapes kept winning over it
        it('lets a user built-in shape replace the preset custom shapes', () => {
            for (const name of ['rain_light', 'rain_heavy', 'aliens', 'crystals', 'snowflakes', 'leaves']) {
                expect(confettiManager.buildOptions(name, { shapes: ['star'] }).options.shapes, name).toEqual(['star']);
                expect(confettiManager.buildOptions(name, { shapes: 'square' }).options.shapes, name).toEqual(['square']);
            }
        });

        it('keeps a user custom shape over a user built-in shape, and emoji over both', () => {
            const custom = confettiManager.buildOptions('snowflakes', { shapes: ['star'], customShapes: ['heart'] });
            expect(custom.options.shapes).toHaveLength(1);
            expect(custom.options.shapes[0]).toHaveProperty('path');

            const emoji = confettiManager.buildOptions('snowflakes', { shapes: ['star'], emoji: '❄️' });
            expect(emoji.options.shapes).toEqual([{ text: '❄️', scalar: emoji.config.size }]);
        });

        it('builds custom path shapes with a precomputed matrix (no sampling)', () => {
            confettiManager.buildOptions('snowflakes', {});
            expect(confetti.shapeFromPath).toHaveBeenCalled();
            for (const [arg] of confetti.shapeFromPath.mock.calls) {
                expect(arg.matrix).toHaveLength(6);
            }
        });

        it('drops invalid hex colours and expands short ones', () => {
            const result = confettiManager.buildOptions('confetti', { colors: ['#F00', 'red', '#12345', '#00ff0080'] });
            expect(result.options.colors).toEqual(['#ff0000', '#00ff00']);
        });

        it('falls back to the preset colours when no override colour is valid', () => {
            const result = confettiManager.buildOptions('confetti', { colors: ['red', '#zzzzzz'] });
            expect(result.options.colors).toEqual(CONFETTI_PRESETS.confetti.colors);
        });

        it('applies the ranges in the fixed branch', () => {
            vi.spyOn(Math, 'random').mockReturnValue(1);
            const instance = vi.fn();
            const config = {
                count: 80,
                position: 'center',
                originSpread: 'fixed',
                sizeRange: [2, 3],
                speedRange: [10, 20],
                gravityRange: [-1, -0.5],
                driftRange: [1, 2]
            };

            confettiManager.fireBurst(instance, config, { particleCount: 80, scalar: 1, startVelocity: 55, gravity: 1, drift: 0 });

            const call = instance.mock.calls[0][0];
            expect(call.scalar).toBe(3);
            expect(call.startVelocity).toBe(20);
            expect(call.gravity).toBe(-0.5);
            expect(call.drift).toBe(2);
        });

        it('changes the confetti preset when its ranges are overridden', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0);
            const instance = vi.fn();
            const { options, config } = confettiManager.buildOptions('confetti', { sizeRange: [2.5, 3], speedRange: [10, 12] });

            confettiManager.fireBurst(instance, config, options);

            const call = instance.mock.calls[0][0];
            expect(call.scalar).toBe(2.5);
            expect(call.startVelocity).toBe(10);
        });

        it('lets a singular override replace the preset range', () => {
            vi.spyOn(Math, 'random').mockReturnValue(0.5);
            const instance = vi.fn();
            const { options, config } = confettiManager.buildOptions('snow', { speed: 10, gravity: 0.3 });
            expect(config.speedRange).toEqual([10, 10]);
            expect(config.gravityRange).toEqual([0.3, 0.3]);

            confettiManager.fireBurst(instance, config, options);

            const call = instance.mock.calls[0][0];
            expect(call.startVelocity).toBe(10);
            expect(call.gravity).toBeCloseTo(0.3);
            expect(call.scalar).toBeCloseTo(0.55); // size untouched: snow's own sizeRange
        });

        it('keeps an explicit range over its singular override', () => {
            const { config } = confettiManager.buildOptions('snow', { speed: 10, speedRange: [20, 30] });
            expect(config.speedRange).toEqual([20, 30]);
        });

        it('keeps the full emoji list on a multi-particle burst', () => {
            const instance = vi.fn();
            const { options, config } = confettiManager.buildOptions('hearts', {});
            expect(options.shapes.length).toBe(3);

            confettiManager.fireBurst(instance, config, options);

            expect(instance.mock.calls[0][0].shapes).toHaveLength(3);
        });

        it('picks one emoji per burst when the burst has 3 or fewer particles', () => {
            const instance = vi.fn();
            const { options, config } = confettiManager.buildOptions('pop_rocks', {});
            expect(options.shapes.length).toBe(6);

            confettiManager.fireBurst(instance, config, options);

            expect(instance.mock.calls[0][0].shapes).toHaveLength(1);
        });
    });
});
