import { describe, it, expect } from 'vitest';
import { CONFETTI_PRESETS } from '@/core/confettiPresets.js';

describe('confettiPresets', () => {
    describe('CONFETTI_PRESETS structure', () => {
        it('should have at least one preset', () => {
            const presetNames = Object.keys(CONFETTI_PRESETS);
            expect(presetNames.length).toBeGreaterThan(0);
        });

        it('should have expected preset names', () => {
            // Actual presets in the codebase
            const expectedPresets = [
                'snow', 'snowflakes', 'leaves', 'rain_light', 'rain_heavy',
                'space', 'aliens', 'fireworks', 'confetti', 'hearts',
                'sparkles', 'pop_rocks', 'crystals', 'bubbles'
            ];
            expectedPresets.forEach(preset => {
                expect(CONFETTI_PRESETS).toHaveProperty(preset);
            });
        });

        it('each preset should have required properties', () => {
            // Core properties that all presets must have
            const requiredProperties = [
                'count',
                'size',
                'speed',
                'gravity',
                'spread',
                'drift',
                'duration',
                'delay',
                'fadeIn',
                'opacity',
                'continuous',
                'interval',
                'position',
                'colors',
                'originSpread'
            ];

            Object.keys(CONFETTI_PRESETS).forEach(presetName => {
                const preset = CONFETTI_PRESETS[presetName];
                requiredProperties.forEach(prop => {
                    expect(preset, `${presetName} should have ${prop}`).toHaveProperty(prop);
                });
            });
        });

        it('each preset should have colors or particles defined', () => {
            // Presets can use emoji, shapes, customShapes, or default to built-in shapes
            // All presets must have colors defined for visual effect
            Object.entries(CONFETTI_PRESETS).forEach(([name, preset]) => {
                expect(
                    preset.colors !== null && preset.colors !== undefined,
                    `${name} should have colors defined`
                ).toBe(true);
            });
        });
    });

    describe('preset value validation', () => {
        it('count should be between 1 and 500', () => {
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                expect(preset.count).toBeGreaterThanOrEqual(1);
                expect(preset.count).toBeLessThanOrEqual(500);
            });
        });

        it('size should be between 0.1 and 5.0', () => {
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                expect(preset.size).toBeGreaterThanOrEqual(0.1);
                expect(preset.size).toBeLessThanOrEqual(5.0);
            });
        });

        it('speed should be between 0 and 100', () => {
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                expect(preset.speed).toBeGreaterThanOrEqual(0);
                expect(preset.speed).toBeLessThanOrEqual(100);
            });
        });

        it('gravity should be between -3.0 and 3.0', () => {
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                expect(preset.gravity).toBeGreaterThanOrEqual(-3.0);
                expect(preset.gravity).toBeLessThanOrEqual(3.0);
            });
        });

        it('spread should be between 0 and 1000', () => {
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                expect(preset.spread).toBeGreaterThanOrEqual(0);
                expect(preset.spread).toBeLessThanOrEqual(1000);
            });
        });

        it('drift should be between -5.0 and 5.0', () => {
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                expect(preset.drift).toBeGreaterThanOrEqual(-5.0);
                expect(preset.drift).toBeLessThanOrEqual(5.0);
            });
        });

        it('duration should be between 50 and 1000', () => {
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                expect(preset.duration).toBeGreaterThanOrEqual(50);
                expect(preset.duration).toBeLessThanOrEqual(1000);
            });
        });

        it('delay should be between 0 and 5000', () => {
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                expect(preset.delay).toBeGreaterThanOrEqual(0);
                expect(preset.delay).toBeLessThanOrEqual(5000);
            });
        });

        it('fadeIn should be between 0 and 2000', () => {
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                expect(preset.fadeIn).toBeGreaterThanOrEqual(0);
                expect(preset.fadeIn).toBeLessThanOrEqual(2000);
            });
        });

        it('opacity should be between 0.1 and 1.0', () => {
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                expect(preset.opacity).toBeGreaterThanOrEqual(0.1);
                expect(preset.opacity).toBeLessThanOrEqual(1.0);
            });
        });

        it('continuous should be a boolean', () => {
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                expect(typeof preset.continuous).toBe('boolean');
            });
        });

        it('interval should be between 0 and 10000', () => {
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                expect(preset.interval).toBeGreaterThanOrEqual(0);
                expect(preset.interval).toBeLessThanOrEqual(10000);
            });
        });

        it('position should be a valid position string', () => {
            const validPositions = [
                'top', 'bottom', 'left', 'right', 'center',
                'top-left', 'top-right', 'bottom-left', 'bottom-right', 'random'
            ];
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                expect(validPositions).toContain(preset.position);
            });
        });

        it('colors should be an array of hex strings or null', () => {
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                if (preset.colors !== null) {
                    expect(Array.isArray(preset.colors)).toBe(true);
                    expect(preset.colors.length).toBeGreaterThan(0);
                    preset.colors.forEach(color => {
                        // Support both 6-char and 8-char hex colors (with alpha)
                        expect(color).toMatch(/^#[0-9A-Fa-f]{6,8}$/);
                    });
                } else {
                    expect(preset.colors).toBeNull();
                }
            });
        });

        it('emoji should be null, undefined, or a string', () => {
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                expect(
                    preset.emoji === null ||
                    preset.emoji === undefined ||
                    typeof preset.emoji === 'string'
                ).toBe(true);
            });
        });

        it('originSpread should be "edge", "random", or "fixed"', () => {
            Object.values(CONFETTI_PRESETS).forEach(preset => {
                expect(['edge', 'random', 'fixed']).toContain(preset.originSpread);
            });
        });
    });

    describe('specific presets characteristics', () => {
        it('confetti preset should have moderate count and good speed', () => {
            const confetti = CONFETTI_PRESETS.confetti;
            expect(confetti.count).toBeGreaterThanOrEqual(50);
            expect(confetti.speed).toBeGreaterThanOrEqual(40);
        });

        it('snow preset should have lower speed and gravity', () => {
            const snow = CONFETTI_PRESETS.snow;
            expect(snow.speed).toBeLessThanOrEqual(30);
            expect(snow.gravity).toBeLessThanOrEqual(0.5);
        });

        it('fireworks preset should have wide spread', () => {
            const fireworks = CONFETTI_PRESETS.fireworks;
            expect(fireworks.spread).toBeGreaterThanOrEqual(90);
        });

        it('snow preset should have low gravity and continuous', () => {
            const snow = CONFETTI_PRESETS.snow;
            expect(snow.gravity).toBeLessThanOrEqual(0.5);
            expect(snow.continuous).toBe(true);
        });

        it('leaves preset should use customShapes', () => {
            const leaves = CONFETTI_PRESETS.leaves;
            expect(leaves.customShapes).toBeTruthy();
            expect(leaves.customShapes).toContain('leaf');
        });

        it('hearts preset should have negative gravity (floating up)', () => {
            const hearts = CONFETTI_PRESETS.hearts;
            expect(hearts.gravity).toBeLessThan(0);
        });

        it('sparkles preset should use random position', () => {
            const sparkles = CONFETTI_PRESETS.sparkles;
            expect(sparkles.position).toBe('random');
        });

        it('bubbles preset should have negative gravity (rising)', () => {
            const bubbles = CONFETTI_PRESETS.bubbles;
            expect(bubbles.gravity).toBeLessThan(0);
        });

        it('snow preset should use random origin spread', () => {
            const snow = CONFETTI_PRESETS.snow;
            expect(snow.originSpread).toBe('random');
        });

        it('rain_light preset should use random origin spread', () => {
            const rain = CONFETTI_PRESETS.rain_light;
            expect(rain.originSpread).toBe('random');
        });

        it('leaves preset should use random origin spread', () => {
            const leaves = CONFETTI_PRESETS.leaves;
            expect(leaves.originSpread).toBe('random');
        });

        it('confetti preset should use fixed origin spread for center burst', () => {
            const confetti = CONFETTI_PRESETS.confetti;
            expect(confetti.originSpread).toBe('fixed');
        });

        it('fireworks preset should use random origin spread', () => {
            const fireworks = CONFETTI_PRESETS.fireworks;
            expect(fireworks.originSpread).toBe('random');
        });

        it('hearts preset should use random origin spread', () => {
            const hearts = CONFETTI_PRESETS.hearts;
            expect(hearts.originSpread).toBe('random');
        });

        it('space preset should have horizontal drift', () => {
            const space = CONFETTI_PRESETS.space;
            expect(space.drift).toBeGreaterThan(0);
        });

        it('sparkles preset should use random origin spread', () => {
            const sparkles = CONFETTI_PRESETS.sparkles;
            expect(sparkles.originSpread).toBe('random');
        });

        it('bubbles preset should use random origin spread', () => {
            const bubbles = CONFETTI_PRESETS.bubbles;
            expect(bubbles.originSpread).toBe('random');
        });

        it('crystals preset should use customShapes for gem particles', () => {
            const crystals = CONFETTI_PRESETS.crystals;
            expect(crystals.customShapes).toBeTruthy();
            expect(crystals.customShapes.length).toBeGreaterThan(0);
        });
    });
});
