import { describe, it, expect } from 'vitest';
import {
    parseConfettiConfig,
    buildConfettiFrontmatter,
    hasOverrides,
    getPresetNames,
    getFullConfig,
    getPresetDefaults,
    parseEmojiString,
    sanitizeConfig
} from '@/utils/confettiUtils.js';

describe('confettiUtils', () => {
    describe('parseConfettiConfig', () => {
        it('should parse new string format with type only', () => {
            const result = parseConfettiConfig('type:snow');
            expect(result).toEqual({
                presetName: 'snow',
                overrides: {}
            });
        });

        it('should parse new string format with overrides', () => {
            const result = parseConfettiConfig('type:hearts, spread:360, continuous:true');
            expect(result.presetName).toBe('hearts');
            expect(result.overrides.spread).toBe(360);
            expect(result.overrides.continuous).toBe(true);
        });

        it('should parse colors with pipe separator', () => {
            const result = parseConfettiConfig('type:fireworks, count:150, colors:#ff0000|#00ff00|#0000ff');
            expect(result.presetName).toBe('fireworks');
            expect(result.overrides.count).toBe(150);
            expect(result.overrides.colors).toEqual(['#ff0000', '#00ff00', '#0000ff']);
        });

        it('should parse boolean values', () => {
            const result = parseConfettiConfig('type:confetti, continuous:true, respectReducedMotion:false');
            expect(result.overrides.continuous).toBe(true);
            expect(result.overrides.respectReducedMotion).toBe(false);
        });

        it('should parse numeric values including floats', () => {
            const result = parseConfettiConfig('type:snow, count:150, speed:25.5, gravity:0.8');
            expect(result.overrides.count).toBe(150);
            expect(result.overrides.speed).toBe(25.5);
            expect(result.overrides.gravity).toBe(0.8);
        });

        it('should parse string values', () => {
            const result = parseConfettiConfig('type:confetti, position:top-left, emoji:🎉');
            expect(result.overrides.position).toBe('top-left');
            expect(result.overrides.emoji).toBe('🎉');
        });

        it('should handle null input', () => {
            const result = parseConfettiConfig(null);
            expect(result).toBeNull();
        });

        it('should handle undefined input', () => {
            const result = parseConfettiConfig(undefined);
            expect(result).toBeNull();
        });

        it('should return null for string without type', () => {
            const result = parseConfettiConfig('count:150, spread:360');
            expect(result).toBeNull();
        });

        it('should trim whitespace from preset name and values', () => {
            const result = parseConfettiConfig('  type:snow  ');
            expect(result.presetName).toBe('snow');
        });

        // Backward compatibility tests
        it('should handle legacy simple string preset name', () => {
            const result = parseConfettiConfig('snow');
            expect(result.presetName).toBe('snow');
            expect(result.overrides).toEqual({});
        });

        it('should handle legacy array with preset name only', () => {
            const result = parseConfettiConfig(['snow']);
            expect(result).toEqual({
                presetName: 'snow',
                overrides: {}
            });
        });

        it('should handle legacy array with preset and overrides', () => {
            const config = ['confetti', { count: 200, speed: 60 }];
            const result = parseConfettiConfig(config);
            expect(result.presetName).toBe('confetti');
            expect(result.overrides.count).toBe(200);
            expect(result.overrides.speed).toBe(60);
        });

        it('should handle legacy array format with complex overrides', () => {
            const config = ['fireworks', {
                colors: ['#ff0000', '#00ff00'],
                spread: 180
            }];
            const result = parseConfettiConfig(config);
            expect(result.presetName).toBe('fireworks');
            expect(result.overrides.colors).toEqual(['#ff0000', '#00ff00']);
            expect(result.overrides.spread).toBe(180);
        });

        it('should handle legacy empty array', () => {
            const result = parseConfettiConfig([]);
            expect(result).toBeNull();
        });

        it('should trim whitespace from legacy preset name', () => {
            const result = parseConfettiConfig('  snow  ');
            expect(result.presetName).toBe('snow');
        });
    });

    describe('buildConfettiFrontmatter', () => {
        it('should build string with type only for no overrides', () => {
            const result = buildConfettiFrontmatter('confetti', {});
            expect(result).toBe('type:confetti');
        });

        it('should build string with type and overrides', () => {
            const overrides = { count: 200, speed: 60 };
            const result = buildConfettiFrontmatter('confetti', overrides);
            expect(result).toBe('type:confetti, count:200, speed:60');
        });

        it('should include array values with pipe separator', () => {
            const overrides = {
                count: 150,
                colors: ['#ff0000', '#00ff00', '#0000ff']
            };
            const result = buildConfettiFrontmatter('snow', overrides);
            expect(result).toBe('type:snow, count:150, colors:#ff0000|#00ff00|#0000ff');
        });

        it('should handle empty overrides object', () => {
            const result = buildConfettiFrontmatter('fireworks', {});
            expect(result).toBe('type:fireworks');
        });

        it('should preserve all override types in string format', () => {
            const overrides = {
                count: 100,          // number
                continuous: true,    // boolean
                colors: ['#000'],    // array
                emoji: '🎉',         // string
                opacity: 0.5         // float
            };
            const result = buildConfettiFrontmatter('confetti', overrides);
            expect(result).toBe('type:confetti, count:100, continuous:true, colors:#000, emoji:🎉, opacity:0.5');
        });

        it('should return null for missing preset name', () => {
            const result = buildConfettiFrontmatter(null, {});
            expect(result).toBeNull();
        });

        it('should handle boolean false values', () => {
            const overrides = { continuous: false, respectReducedMotion: false };
            const result = buildConfettiFrontmatter('confetti', overrides);
            expect(result).toBe('type:confetti, continuous:false, respectReducedMotion:false');
        });

        it('should round-trip correctly', () => {
            const preset = 'hearts';
            const overrides = {
                spread: 360,
                continuous: true,
                count: 150,
                colors: ['#ff0000', '#00ff00']
            };
            const built = buildConfettiFrontmatter(preset, overrides);
            const parsed = parseConfettiConfig(built);

            expect(parsed.presetName).toBe(preset);
            expect(parsed.overrides.spread).toBe(overrides.spread);
            expect(parsed.overrides.continuous).toBe(overrides.continuous);
            expect(parsed.overrides.count).toBe(overrides.count);
            expect(parsed.overrides.colors).toEqual(overrides.colors);
        });
    });

    describe('hasOverrides', () => {
        it('should return false for no config', () => {
            const result = hasOverrides('confetti', null);
            expect(result).toBe(false);
        });

        it('should return false for empty config', () => {
            const result = hasOverrides('confetti', {});
            expect(result).toBe(false);
        });

        it('should return true when count differs', () => {
            const result = hasOverrides('confetti', { count: 50 });
            expect(result).toBe(true);
        });

        it('should return true when speed differs', () => {
            const result = hasOverrides('snow', { speed: 100 });
            expect(result).toBe(true);
        });

        it('should return true when colors differ', () => {
            const result = hasOverrides('confetti', { colors: ['#000000'] });
            expect(result).toBe(true);
        });

        it('should return false when config matches defaults', () => {
            // This test requires actual preset values - confetti has count: 80, speed: 55
            const result = hasOverrides('confetti', {
                count: 80,
                speed: 55
            });
            expect(result).toBe(false);
        });

        it('should handle null preset name', () => {
            const result = hasOverrides(null, { count: 100 });
            expect(result).toBe(false);
        });

        it('should handle invalid preset name', () => {
            const result = hasOverrides('nonexistent', { count: 100 });
            expect(result).toBe(false);
        });
    });

    describe('getPresetNames', () => {
        it('should return array of preset names', () => {
            const result = getPresetNames();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThan(0);
        });

        it('should include expected presets', () => {
            const result = getPresetNames();
            expect(result).toContain('confetti');
            expect(result).toContain('snow');
            expect(result).toContain('fireworks');
            expect(result).toContain('leaves');
            expect(result).toContain('hearts');
        });

        it('should not include "none"', () => {
            const result = getPresetNames();
            expect(result).not.toContain('none');
        });

        it('should return strings only', () => {
            const result = getPresetNames();
            result.forEach(name => {
                expect(typeof name).toBe('string');
            });
        });
    });

    describe('getPresetDefaults', () => {
        it('should return defaults for valid preset', () => {
            const result = getPresetDefaults('confetti');
            expect(result).toBeTruthy();
            expect(result).toHaveProperty('count');
            expect(result).toHaveProperty('speed');
        });

        it('should return null for invalid preset', () => {
            const result = getPresetDefaults('nonexistent');
            expect(result).toBeNull();
        });

        it('should return complete preset configuration', () => {
            const result = getPresetDefaults('snow');
            const requiredProps = [
                'count', 'size', 'speed', 'gravity', 'spread', 'drift',
                'duration', 'delay', 'fadeIn', 'opacity', 'continuous',
                'interval', 'position', 'colors', 'emoji'
            ];
            requiredProps.forEach(prop => {
                expect(result).toHaveProperty(prop);
            });
        });

        it('should return a copy that can be modified', () => {
            const result = getPresetDefaults('confetti');
            expect(result.count).toBeGreaterThanOrEqual(10);
        });
    });

    describe('getFullConfig', () => {
        it('should return full config with no overrides', () => {
            const result = getFullConfig('confetti', {});
            expect(result).toBeTruthy();
            expect(result).toHaveProperty('count');
        });

        it('should merge overrides into preset', () => {
            const result = getFullConfig('confetti', { count: 50 });
            expect(result.count).toBe(50);
        });

        it('should preserve non-overridden values', () => {
            const defaults = getPresetDefaults('confetti');
            const result = getFullConfig('confetti', { count: 50 });
            expect(result.speed).toBe(defaults.speed);
            expect(result.gravity).toBe(defaults.gravity);
        });

        it('should return null for invalid preset', () => {
            const result = getFullConfig('invalid', {});
            expect(result).toBeNull();
        });
    });

    describe('parseEmojiString', () => {
        it('should parse single emoji', () => {
            const result = parseEmojiString('🎉');
            expect(Array.isArray(result)).toBe(true);
            expect(result).toContain('🎉');
        });

        it('should parse multiple emoji', () => {
            const result = parseEmojiString('🍂🍁🍃');
            expect(result.length).toBe(3);
            expect(result).toContain('🍂');
            expect(result).toContain('🍁');
            expect(result).toContain('🍃');
        });

        it('should handle empty string', () => {
            const result = parseEmojiString('');
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });

        it('should handle null input', () => {
            const result = parseEmojiString(null);
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });

        it('should handle emoji with zero-width joiners', () => {
            const result = parseEmojiString('👨‍👩‍👧‍👦');
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBeGreaterThanOrEqual(1);
        });

        it('should handle mixed content (ignoring non-emoji)', () => {
            const result = parseEmojiString('🎉 🎊');
            expect(Array.isArray(result)).toBe(true);
            // Should contain emoji, may or may not include space
            expect(result.some(item => item === '🎉')).toBe(true);
            expect(result.some(item => item === '🎊')).toBe(true);
        });
    });

    describe('sanitizeConfig', () => {
        it('should clamp count to valid range', () => {
            const config = { count: 1000 };
            const result = sanitizeConfig(config);
            expect(result.count).toBeLessThanOrEqual(500);
        });

        it('should clamp count minimum', () => {
            const config = { count: 1 };
            const result = sanitizeConfig(config);
            expect(result.count).toBeGreaterThanOrEqual(10);
        });

        it('should clamp size to valid range', () => {
            const config = { size: 10 };
            const result = sanitizeConfig(config);
            expect(result.size).toBeLessThanOrEqual(5.0);
        });

        it('should clamp gravity to valid range', () => {
            const config = { gravity: 10 };
            const result = sanitizeConfig(config);
            expect(result.gravity).toBeLessThanOrEqual(3.0);
        });

        it('should clamp spread to valid range', () => {
            const config = { spread: 500 };
            const result = sanitizeConfig(config);
            expect(result.spread).toBeLessThanOrEqual(360);
        });

        it('should clamp opacity to valid range', () => {
            const config = { opacity: 2.0 };
            const result = sanitizeConfig(config);
            expect(result.opacity).toBeLessThanOrEqual(1.0);
        });

        it('should not modify valid values', () => {
            const config = { count: 100, size: 1.0, gravity: 1.0 };
            const result = sanitizeConfig(config);
            expect(result.count).toBe(100);
            expect(result.size).toBe(1.0);
            expect(result.gravity).toBe(1.0);
        });

        it('should handle empty config', () => {
            const result = sanitizeConfig({});
            expect(result).toEqual({});
        });

        it('should preserve non-numeric fields', () => {
            const config = { position: 'center', colors: ['#fff'] };
            const result = sanitizeConfig(config);
            expect(result.position).toBe('center');
            expect(result.colors).toEqual(['#fff']);
        });
    });
});
