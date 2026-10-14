import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
    CONFETTI_SCHEMA,
    RANGE_KEYS,
    ARRAY_KEYS,
    resolvePresetName,
    parseValue,
    parse,
    normalize,
    diffFromPreset,
    serialize,
    writeConfettiField
} from '@/utils/confettiConfig.js';
import { CONFETTI_PRESETS, getPreset, getPresetCopy } from '@/core/confettiPresets.js';
import { isValidPreset } from '@/utils/confettiUtils.js';

const FIXTURE_DIR = path.resolve(process.cwd(), '.vault/pixel-banner-example/Confetti');

// Each fixture note's confetti value and what it must parse to. The vault is
// not tracked in git, so the values live here and are checked against the
// files whenever the vault is present.
const FIXTURES = {
    'Aliens.md': { raw: 'type:aliens', presetName: 'aliens', overrides: {} },
    'Bubbles.md': { raw: 'type: bubbles', presetName: 'bubbles', overrides: {} },
    'Confetti Classic.md': { raw: 'type:confetti', presetName: 'confetti', overrides: {} },
    'Crystals.md': { raw: 'type:crystals', presetName: 'crystals', overrides: {} },
    'Custom Overrides.md': {
        raw: 'type:snow, count:5, speed:10, gravity:0.3, colors:#ff0000|#00ff00',
        presetName: 'snow',
        overrides: { count: 5, speed: 10, gravity: 0.3, colors: ['#ff0000', '#00ff00'] }
    },
    'Fireworks.md': { raw: 'type:fireworks', presetName: 'fireworks', overrides: {} },
    'Hearts.md': { raw: 'type:hearts', presetName: 'hearts', overrides: {} },
    'Leaves.md': { raw: 'type:leaves', presetName: 'leaves', overrides: {} },
    'Pop Rocks.md': { raw: 'type:pop_rocks', presetName: 'pop_rocks', overrides: {} },
    'Rain Heavy.md': { raw: 'type:rain_heavy', presetName: 'rain_heavy', overrides: {} },
    'Rain Light.md': { raw: 'type:rain_light', presetName: 'rain_light', overrides: {} },
    'Snow.md': { raw: 'type:snow', presetName: 'snow', overrides: {} },
    'Snowflakes.md': { raw: 'type:snowflakes', presetName: 'snowflakes', overrides: {} },
    'Space.md': { raw: 'type:space', presetName: 'space', overrides: {} },
    'Sparkles.md': { raw: 'type:sparkles', presetName: 'sparkles', overrides: {} }
};

// Pull the banner-confetti value out of a fixture's frontmatter (quoted or not)
function readFixtureValue(file) {
    const text = fs.readFileSync(path.join(FIXTURE_DIR, file), 'utf-8');
    const match = text.match(/^banner-confetti:\s*(.*)$/m);
    if (!match) return null;
    return match[1].trim().replace(/^"(.*)"$/, '$1');
}

describe('confettiConfig', () => {
    describe('schema', () => {
        it('covers every key the presets use', () => {
            const presetKeys = new Set();
            Object.values(CONFETTI_PRESETS).forEach(preset => Object.keys(preset).forEach(key => presetKeys.add(key)));
            presetKeys.forEach(key => expect(CONFETTI_SCHEMA, key).toHaveProperty(key));
        });

        it('lists range and array keys', () => {
            expect([...RANGE_KEYS].sort()).toEqual(['driftRange', 'gravityRange', 'sizeRange', 'speedRange']);
            expect(ARRAY_KEYS).toEqual(expect.arrayContaining(['colors', 'shapes', 'customShapes', ...RANGE_KEYS]));
        });
    });

    describe('preset lookup', () => {
        it('resolves names case-insensitively and trimmed', () => {
            expect(resolvePresetName('Snow')).toBe('snow');
            expect(resolvePresetName('  RAIN_LIGHT ')).toBe('rain_light');
            expect(isValidPreset('Snow')).toBe(true);
        });

        it.each(['toString', 'constructor', '__proto__', 'hasOwnProperty', '', 'bogus'])('rejects %s', name => {
            expect(resolvePresetName(name)).toBeNull();
            expect(getPreset(name)).toBeNull();
            expect(getPresetCopy(name)).toBeNull();
            expect(isValidPreset(name)).toBe(false);
        });
    });

    describe('fixture notes (golden)', () => {
        it.each(Object.entries(FIXTURES))('%s parses to the expected preset and typed overrides', (file, fixture) => {
            const result = parse(fixture.raw);
            expect(result).toEqual({ presetName: fixture.presetName, overrides: fixture.overrides });
        });

        // The example vault is gitignored: without it this test is reported as
        // skipped (not silently passed), and it runs whenever the vault exists.
        const hasFixtureVault = fs.existsSync(FIXTURE_DIR);
        it.skipIf(!hasFixtureVault)(`fixture files still hold the values above${hasFixtureVault ? '' : ' (skipped: .vault/pixel-banner-example/Confetti not found)'}`, () => {
            for (const [file, fixture] of Object.entries(FIXTURES)) {
                expect(readFixtureValue(file), file).toBe(fixture.raw);
            }
            expect(readFixtureValue('No Confetti.md')).toBeNull();
        });
    });

    describe('parse: accepted forms', () => {
        const expected = { presetName: 'snow', overrides: { count: 5 } };

        it.each([
            ['spaced', 'type: snow, count: 5'],
            ['unspaced', 'type:snow,count:5'],
            ['mixed spacing', 'type :snow ,  count:  5'],
            ['capitalised preset', 'type:Snow, count:5'],
            ['bare preset', 'snow, count: 5'],
            ['YAML object', { type: 'snow', count: 5 }],
            ['YAML object with string values', { type: 'Snow', count: '5' }],
            ['legacy array', ['snow', { count: 5 }]]
        ])('%s', (label, value) => {
            expect(parse(value)).toEqual(expected);
        });

        it('parses a bare preset with no overrides', () => {
            expect(parse('snow')).toEqual({ presetName: 'snow', overrides: {} });
            expect(parse(['snow'])).toEqual({ presetName: 'snow', overrides: {} });
        });

        it('keeps emoji containing commas inside its value', () => {
            const result = parse('type: hearts, emoji: 🎉, 🎊, count: 4');
            expect(result.overrides.emoji).toBe('🎉 🎊');
            expect(result.overrides.count).toBe(4);
        });

        it('keeps unknown keys as trimmed strings', () => {
            expect(parse('type: snow, sparkle:  yes ').overrides.sparkle).toBe('yes');
        });
    });

    describe('parse: junk never throws', () => {
        it.each([
            ['toString', 'type:toString'],
            ['__proto__', 'type:__proto__'],
            ['constructor', 'type: constructor'],
            ['number', 42],
            ['numeric string', '42'],
            ['empty string', ''],
            ['type with no value', 'type:'],
            ['unknown preset', 'type:bogus'],
            ['no type', 'count: 5'],
            ['null', null],
            ['undefined', undefined],
            ['empty array', []],
            ['object without type', { count: 5 }]
        ])('%s returns null', (label, value) => {
            expect(() => parse(value)).not.toThrow();
            expect(parse(value)).toBeNull();
        });
    });

    describe('parse: typed values', () => {
        it('drops count: Infinity and count: abc so the preset default applies', () => {
            expect(parse('type: snow, count: Infinity').overrides).not.toHaveProperty('count');
            expect(parse('type: snow, count: abc').overrides).not.toHaveProperty('count');
        });

        it('drops a range with a non-numeric half', () => {
            expect(parse('type: snow, sizeRange: 1|abc').overrides).not.toHaveProperty('sizeRange');
        });

        it('parses ranges to two finite numbers', () => {
            const { overrides } = parse('type: snow, sizeRange: 1|3, speedRange: 2|8, gravityRange: -0.5|0.5, driftRange: -1|1');
            expect(overrides.sizeRange).toEqual([1, 3]);
            expect(overrides.speedRange).toEqual([2, 8]);
            expect(overrides.gravityRange).toEqual([-0.5, 0.5]);
            expect(overrides.driftRange).toEqual([-1, 1]);
        });

        it('parses a single colour to a one-item array, expanding #rgb', () => {
            expect(parse('type: snow, colors: #fff').overrides.colors).toEqual(['#ffffff']);
        });

        it('parses a single shape to a one-item array', () => {
            expect(parse('type: snow, shapes: star').overrides.shapes).toEqual(['star']);
            expect(parse('type: snow, customShapes: leaf').overrides.customShapes).toEqual(['leaf']);
        });

        it('treats emoji: null as cleared', () => {
            expect(parse('type: snow, emoji: null').overrides).not.toHaveProperty('emoji');
        });

        it('parses booleans and enums', () => {
            const { overrides } = parse('type: snow, continuous: false, flat: TRUE, position: Top-Left, originSpread: edge');
            expect(overrides).toEqual({ continuous: false, flat: true, position: 'top-left', originSpread: 'edge' });
        });

        it('drops enum values that are not listed', () => {
            expect(parse('type: snow, position: sideways').overrides).not.toHaveProperty('position');
        });
    });

    describe('parseValue', () => {
        it('returns undefined for cleared values', () => {
            expect(parseValue('count', 'null')).toBeUndefined();
            expect(parseValue('count', '')).toBeUndefined();
            expect(parseValue('count', undefined)).toBeUndefined();
        });

        it('returns real numbers', () => {
            expect(parseValue('count', '12')).toBe(12);
            expect(parseValue('gravity', ' -0.5 ')).toBe(-0.5);
        });
    });

    describe('normalize', () => {
        it('maps Infinity to the bounds and drops NaN', () => {
            expect(normalize({ count: Infinity, gravity: -Infinity, size: NaN })).toEqual({ count: 150, gravity: -3 });
        });

        it('coerces numeric strings and clamps', () => {
            expect(normalize({ count: '500', opacity: '0.5', speed: 'fast' })).toEqual({ count: 150, opacity: 0.5 });
        });

        it('clamps each half of a range and swaps reversed halves', () => {
            expect(normalize({ sizeRange: [9, -2] })).toEqual({ sizeRange: [0.1, 5] });
            expect(normalize({ gravityRange: ['1', '-1'] })).toEqual({ gravityRange: [-1, 1] });
            expect(normalize({ driftRange: [1, 'x'] })).toEqual({});
        });

        it('rounds integers and removes float noise', () => {
            expect(normalize({ count: 4.6, opacity: 0.1 + 0.2 })).toEqual({ count: 5, opacity: 0.3 });
        });

        it('keeps null, undefined and unknown keys, and never throws', () => {
            expect(normalize({ emoji: null, mystery: 'x' })).toEqual({ emoji: null, mystery: 'x' });
            expect(() => normalize(null)).not.toThrow();
            expect(normalize('junk')).toEqual({});
        });
    });

    describe('diffFromPreset', () => {
        it('returns nothing for an untouched preset', () => {
            for (const name of Object.keys(CONFETTI_PRESETS)) {
                expect(diffFromPreset(name, getPresetCopy(name)), name).toEqual({});
            }
        });

        it('returns only keys that really differ', () => {
            const config = { ...getPresetCopy('snow'), count: 9, colors: ['#FFFFFF', '#B8CDE0', '#9FB3C8'], sizeRange: [0.3, 0.8000001] };
            expect(diffFromPreset('snow', config)).toEqual({ count: 9 });
        });

        it('compares keys the preset lacks against the schema default', () => {
            expect(diffFromPreset('confetti', { flat: false, respectReducedMotion: true })).toEqual({});
            expect(diffFromPreset('confetti', { flat: true, respectReducedMotion: false })).toEqual({ flat: true, respectReducedMotion: false });
        });

        it('returns an empty diff for an unknown preset', () => {
            expect(diffFromPreset('bogus', { count: 3 })).toEqual({});
        });
    });

    describe('serialize', () => {
        it('writes the preset alone when there are no overrides', () => {
            expect(serialize('snow', {})).toBe('type: snow');
        });

        it('returns null without a valid preset', () => {
            expect(serialize(null, {})).toBeNull();
            expect(serialize('toString', {})).toBeNull();
        });

        it('skips null, undefined and empty arrays', () => {
            expect(serialize('snow', { emoji: null, shapes: undefined, colors: [] })).toBe('type: snow');
        });

        it('strips commas from emoji', () => {
            expect(serialize('hearts', { emoji: '🎉,🎊' })).toBe('type: hearts, emoji: 🎉🎊');
        });
    });

    describe('round trip for every preset', () => {
        // One override per schema type, all on-step so they survive rounding
        const overrides = {
            count: 42,
            size: 1.25,
            gravity: 0.1 + 0.2,
            opacity: 0.35,
            continuous: false,
            flat: true,
            sizeRange: [0.5, 2.5],
            speedRange: [3, 30],
            gravityRange: [-0.2, 0.7],
            driftRange: [-1.5, 1.5],
            colors: ['#ff0000', '#00ff00'],
            shapes: ['square'],
            position: 'bottom-right',
            originSpread: 'edge',
            emoji: '🎉, 🎊'
        };

        it.each(Object.keys(CONFETTI_PRESETS))('%s', name => {
            const written = serialize(name, overrides);
            expect(parse(written)).toEqual({ presetName: name, overrides: normalize(overrides) });
            expect(written.startsWith(`type: ${name}, `)).toBe(true);
            expect(written).toMatch(/^(\w+: [^,]*)(, \w+: [^,]*)*$/);
            expect(written).not.toContain('null');
            expect(written).not.toContain('0.30000000000000004');
            expect(written).toContain('gravity: 0.3');
        });
    });

    describe('writeConfettiField', () => {
        const settings = { customBannerConfettiField: ['banner-confetti', 'confetti'] };

        it('replaces the alias the note already uses and keeps one property', () => {
            const fm = { title: 'x', confetti: 'type: snow' };
            writeConfettiField(fm, settings, 'type: hearts');
            expect(fm).toEqual({ title: 'x', confetti: 'type: hearts' });
        });

        it('removes duplicate aliases when writing', () => {
            const fm = { 'banner-confetti': 'type: snow', confetti: 'type: space' };
            writeConfettiField(fm, settings, 'type: hearts');
            expect(fm).toEqual({ 'banner-confetti': 'type: hearts' });
        });

        it('writes the first alias when none is present', () => {
            const fm = {};
            writeConfettiField(fm, settings, 'type: snow');
            expect(fm).toEqual({ 'banner-confetti': 'type: snow' });
        });

        it('removes every alias for null', () => {
            const fm = { title: 'x', 'banner-confetti': 'type: snow', confetti: 'type: space' };
            writeConfettiField(fm, settings, null);
            expect(fm).toEqual({ title: 'x' });
        });

        it('falls back to banner-confetti without settings', () => {
            const fm = {};
            writeConfettiField(fm, undefined, 'type: snow');
            expect(fm).toEqual({ 'banner-confetti': 'type: snow' });
        });
    });
});
