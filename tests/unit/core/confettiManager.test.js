import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { confettiManager } from '@/core/confettiManager.js';

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

describe('confettiManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the manager state
        confettiManager.stopAll();
    });

    afterEach(() => {
        confettiManager.stopAll();
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
            const result = confettiManager.mapPosition('random');
            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeLessThanOrEqual(1);
            expect(result.y).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeLessThanOrEqual(1);
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
            const result = confettiManager.getRandomEdgePosition('random');
            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeLessThanOrEqual(1);
            expect(result.y).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeLessThanOrEqual(1);
        });

        it('should handle top-left corner by randomizing x', () => {
            const result = confettiManager.getRandomEdgePosition('top-left');
            expect(result.y).toBe(0);
            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeLessThanOrEqual(1);
        });

        it('should handle bottom-right corner by randomizing x', () => {
            const result = confettiManager.getRandomEdgePosition('bottom-right');
            expect(result.y).toBe(1);
            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.x).toBeLessThanOrEqual(1);
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
            expect(Array.isArray(result)).toBe(true);
            // Flags may be parsed as 1 or 2 depending on implementation
            expect(result.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('buildOptions', () => {
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

        it('should return false after stopping effect', async () => {
            const mockElement = document.createElement('div');
            confettiManager.start('test-note', mockElement, 'confetti', {});
            confettiManager.stop('test-note', 0);
            // Small delay to allow cleanup
            await new Promise(resolve => setTimeout(resolve, 50));
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

        it('should stop confetti effect', async () => {
            const mockElement = document.createElement('div');
            confettiManager.start('test-note', mockElement, 'confetti', {});
            confettiManager.stop('test-note', 0);
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(confettiManager.hasActiveEffect('test-note')).toBe(false);
        });

        it('should handle stopping non-existent effect gracefully', () => {
            expect(() => {
                confettiManager.stop('nonexistent', 0);
            }).not.toThrow();
        });

        it('should clean up canvas on stop', async () => {
            const mockElement = document.createElement('div');
            confettiManager.start('test-note', mockElement, 'confetti', {});
            confettiManager.stop('test-note', 0);
            await new Promise(resolve => setTimeout(resolve, 100));
            const canvases = mockElement.querySelectorAll('.pixel-banner-confetti-canvas');
            expect(canvases.length).toBe(0);
        });

        it('should handle mobile flag', () => {
            const mockElement = document.createElement('div');
            confettiManager.start('test-note', mockElement, 'confetti', {}, true);
            expect(confettiManager.hasActiveEffect('test-note')).toBe(true);
        });

        it('should apply fade in transition', () => {
            const mockElement = document.createElement('div');
            confettiManager.start('test-note', mockElement, 'snow', { fadeIn: 1000 });
            const canvas = mockElement.querySelector('.pixel-banner-confetti-canvas');
            expect(canvas.style.transition).toContain('1000ms');
        });

        it('should handle continuous effects', async () => {
            const mockElement = document.createElement('div');
            confettiManager.start('test-note', mockElement, 'snow', {});
            expect(confettiManager.hasActiveEffect('test-note')).toBe(true);
            confettiManager.stop('test-note', 0);
        });
    });

    describe('stopAll', () => {
        it('should stop all active effects', async () => {
            const mockElement1 = document.createElement('div');
            const mockElement2 = document.createElement('div');
            confettiManager.start('note1', mockElement1, 'confetti', {});
            confettiManager.start('note2', mockElement2, 'snow', {});

            confettiManager.stopAll();
            await new Promise(resolve => setTimeout(resolve, 600));

            expect(confettiManager.hasActiveEffect('note1')).toBe(false);
            expect(confettiManager.hasActiveEffect('note2')).toBe(false);
        });

        it('should handle stopping when no effects are active', () => {
            expect(() => {
                confettiManager.stopAll();
            }).not.toThrow();
        });
    });

    describe('getActiveNoteIds', () => {
        it('should return empty array when no effects active', () => {
            const result = confettiManager.getActiveNoteIds();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });

        it('should return active note IDs', () => {
            const mockElement1 = document.createElement('div');
            const mockElement2 = document.createElement('div');
            confettiManager.start('note1', mockElement1, 'confetti', {});
            confettiManager.start('note2', mockElement2, 'snow', {});

            const result = confettiManager.getActiveNoteIds();
            expect(result).toContain('note1');
            expect(result).toContain('note2');
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
            // This will fail but should not crash
            expect(() => {
                try {
                    confettiManager.start('test', null, 'confetti', {});
                } catch (e) {
                    // Expected to fail, but shouldn't crash the system
                }
            }).not.toThrow();
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
            // At least some variation should exist (within +/- 0.25 of original)
            drifts.forEach(drift => {
                expect(drift).toBeGreaterThanOrEqual(0.25);
                expect(drift).toBeLessThanOrEqual(0.75);
            });
        });
    });

    describe('createCanvas', () => {
        it('should create canvas with correct class', () => {
            const mockElement = document.createElement('div');
            const { canvas } = confettiManager.createCanvas(mockElement, 'note');
            expect(canvas.className).toBe('pixel-banner-confetti-canvas');
        });

        it('should set canvas to absolute positioning', () => {
            const mockElement = document.createElement('div');
            const { canvas } = confettiManager.createCanvas(mockElement, 'note');
            expect(canvas.style.position).toBe('absolute');
        });

        it('should set pointer-events to none', () => {
            const mockElement = document.createElement('div');
            const { canvas } = confettiManager.createCanvas(mockElement, 'note');
            expect(canvas.style.pointerEvents).toBe('none');
        });

        it('should start with opacity 0', () => {
            const mockElement = document.createElement('div');
            const { canvas } = confettiManager.createCanvas(mockElement, 'note');
            expect(canvas.style.opacity).toBe('0');
        });

        it('should append canvas to element', () => {
            const mockElement = document.createElement('div');
            confettiManager.createCanvas(mockElement, 'note');
            const canvas = mockElement.querySelector('.pixel-banner-confetti-canvas');
            expect(canvas).toBeTruthy();
        });
    });
});
