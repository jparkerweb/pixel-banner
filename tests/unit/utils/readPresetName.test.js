import { describe, it, expect } from 'vitest';
import { readPresetName } from '@/utils/confettiConfig.js';

// readPresetName reads the name a banner-confetti value asks for, whether or
// not a preset by that name exists, so an unknown one can be named to the user
describe('readPresetName', () => {
    it.each([
        ['type: snow', 'snow'],
        ['type: snow, count: 5', 'snow'],
        ['type:snow,count:5', 'snow'],
        ['snow', 'snow'],
        ['snow, count: 5', 'snow'],
        ['  TYPE:  Snow  ', 'Snow']
    ])('reads the string form %j', (value, expected) => {
        expect(readPresetName(value)).toBe(expected);
    });

    it('reads a name that is not a known preset', () => {
        expect(readPresetName('type: glitter, count: 5')).toBe('glitter');
        expect(readPresetName({ type: 'glitter' })).toBe('glitter');
        expect(readPresetName(['glitter', { count: 5 }])).toBe('glitter');
    });

    it('reads the object form, with any case of "type"', () => {
        expect(readPresetName({ type: 'snow', count: 5 })).toBe('snow');
        expect(readPresetName({ Type: ' hearts ' })).toBe('hearts');
    });

    it('reads the legacy array form', () => {
        expect(readPresetName(['snow', { count: 5 }])).toBe('snow');
    });

    it.each([
        ['undefined', undefined],
        ['null', null],
        ['a number', 42],
        ['a boolean', true],
        ['an empty string', ''],
        ['a blank string', '   '],
        ['an empty array', []],
        ['an array without a name', [{ count: 5 }]],
        ['an array with a blank name', ['  ']],
        ['an object without a type', { count: 5 }],
        ['an object with a non-string type', { type: 7 }],
        ['an object with a blank type', { type: '' }]
    ])('returns null for %s', (_label, value) => {
        expect(readPresetName(value)).toBeNull();
    });
});
