import { CONFETTI_PRESETS, getPresetCopy } from '../core/confettiPresets';
import { writeField, clearField } from '../core/fieldRegistry.js';

// Single source of truth for the banner-confetti frontmatter value:
// the field schema plus parse, normalize, diff and serialize.

const POSITIONS = [
    'top', 'bottom', 'left', 'right', 'center',
    'top-left', 'top-right', 'bottom-left', 'bottom-right', 'random'
];

// Every override key the plugin understands. `step` is the modal control step
// (or a sensible precision where there is no control) and drives rounding.
export const CONFETTI_SCHEMA = {
    count: { type: 'integer', min: 1, max: 150, step: 1 },
    size: { type: 'number', min: 0.1, max: 5.0, step: 0.05 },
    speed: { type: 'number', min: 0, max: 100, step: 1 },
    gravity: { type: 'number', min: -3, max: 3, step: 0.1 },
    spread: { type: 'number', min: 0, max: 360, step: 1 },
    drift: { type: 'number', min: -5, max: 5, step: 0.1 },
    duration: { type: 'integer', min: 50, max: 1000, step: 10 },
    delay: { type: 'integer', min: 0, max: 5000, step: 1 },
    fadeIn: { type: 'integer', min: 0, max: 2000, step: 1 },
    opacity: { type: 'number', min: 0.1, max: 1.0, step: 0.05 },
    interval: { type: 'integer', min: 50, max: 10000, step: 50 },
    startY: { type: 'number', min: -1, max: 1, step: 0.01 },
    sizeRange: { type: 'range', min: 0.1, max: 5.0, step: 0.1 },
    speedRange: { type: 'range', min: 0, max: 100, step: 1 },
    gravityRange: { type: 'range', min: -3, max: 3, step: 0.1 },
    driftRange: { type: 'range', min: -5, max: 5, step: 0.1 },
    continuous: { type: 'boolean' },
    flat: { type: 'boolean', default: false },
    respectReducedMotion: { type: 'boolean', default: true },
    position: { type: 'enum', values: POSITIONS },
    originSpread: { type: 'enum', values: ['fixed', 'edge', 'random'] },
    colors: { type: 'colors' },
    shapes: { type: 'shapeList', values: ['circle', 'square', 'star'] },
    customShapes: { type: 'shapeList' },
    emoji: { type: 'emoji' }
};

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

// Keep only colours canvas-confetti can draw: #rgb is expanded to #rrggbb,
// #rrggbbaa loses its alpha, everything is lowercased, anything else is dropped
export function sanitizeHexColors(colors) {
    if (!Array.isArray(colors)) return [];
    const result = [];
    for (const color of colors) {
        if (typeof color !== 'string') continue;
        const value = color.trim();
        if (!HEX_COLOR.test(value)) continue;
        const hex = value.slice(1).toLowerCase();
        if (hex.length === 3) {
            result.push(`#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`);
        } else {
            result.push(`#${hex.slice(0, 6)}`);
        }
    }
    return result;
}

export const RANGE_KEYS =Object.keys(CONFETTI_SCHEMA).filter(key => CONFETTI_SCHEMA[key].type === 'range');

export const ARRAY_KEYS = ['colors', 'shapes', 'customShapes', ...RANGE_KEYS];

// Resolve a user-written preset name to its canonical key, or null.
// Own-property only, so 'toString' or '__proto__' never match.
export function resolvePresetName(name) {
    if (typeof name !== 'string') return null;
    const key = name.trim().toLowerCase();
    if (!key) return null;
    return Object.prototype.hasOwnProperty.call(CONFETTI_PRESETS, key) ? key : null;
}

const isBlank = (raw) => raw === undefined || raw === null || (typeof raw === 'string' && (raw.trim() === '' || raw.trim() === 'null'));

const toFiniteNumber = (raw) => {
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined;
    if (typeof raw !== 'string' || raw.trim() === '') return undefined;
    const num = Number(raw.trim());
    return Number.isFinite(num) ? num : undefined;
};

// Split a pipe list (or accept a real array) into trimmed, non-empty strings
const toStringList = (raw) => {
    const list = Array.isArray(raw) ? raw : String(raw).split('|');
    return list
        .filter(item => item !== null && item !== undefined)
        .map(item => String(item).trim())
        .filter(item => item !== '' && item !== 'null');
};

// Parse one raw value (string from the frontmatter string form, or a YAML
// scalar/array) into its schema type. Returns undefined when the value is
// cleared or unusable, so the preset default applies.
export function parseValue(key, raw) {
    if (isBlank(raw)) return undefined;

    const schema = Object.prototype.hasOwnProperty.call(CONFETTI_SCHEMA, key) ? CONFETTI_SCHEMA[key] : null;
    if (!schema) {
        // Unknown key: keep what the user wrote
        return typeof raw === 'string' ? raw.trim() : raw;
    }

    switch (schema.type) {
        case 'number':
        case 'integer':
            return toFiniteNumber(raw);

        case 'boolean':
            if (typeof raw === 'boolean') return raw;
            if (typeof raw === 'string') {
                const val = raw.trim().toLowerCase();
                if (val === 'true') return true;
                if (val === 'false') return false;
            }
            return undefined;

        case 'range': {
            const parts = Array.isArray(raw) ? raw : String(raw).split('|');
            if (parts.length !== 2) return undefined;
            const pair = parts.map(toFiniteNumber);
            return pair.every(v => v !== undefined) ? pair : undefined;
        }

        case 'colors':
        case 'shapeList': {
            let list = toStringList(raw);
            if (schema.values) {
                list = list.map(item => item.toLowerCase()).filter(item => schema.values.includes(item));
            }
            return list.length > 0 ? list : undefined;
        }

        case 'enum': {
            const val = String(raw).trim().toLowerCase();
            return schema.values.includes(val) ? val : undefined;
        }

        case 'emoji': {
            // Commas would split the frontmatter pair, and are never emoji
            const val = String(raw).replace(/,/g, '').trim();
            return val === '' ? undefined : val;
        }

        case 'string': {
            const val = String(raw).trim();
            return val === '' ? undefined : val;
        }

        default:
            return undefined;
    }
}

const SCHEMA_KEYS_LOWER = Object.keys(CONFETTI_SCHEMA).reduce((map, key) => {
    map[key.toLowerCase()] = key;
    return map;
}, {});

// Map a written key to its schema spelling ('Count' -> 'count'); unknown keys pass through
const canonicalKey = (key) => {
    if (Object.prototype.hasOwnProperty.call(CONFETTI_SCHEMA, key)) return key;
    const lower = key.toLowerCase();
    return Object.prototype.hasOwnProperty.call(SCHEMA_KEYS_LOWER, lower) ? SCHEMA_KEYS_LOWER[lower] : key;
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Pairs split only at a comma followed by `key:`, so emoji or other text
// containing commas stays inside its value.
const PAIR_BOUNDARY = /,\s*(?=[A-Za-z_][A-Za-z0-9_]*\s*:)/;
const PAIR = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:([\s\S]*)$/;

function buildResult(presetName, entries) {
    const resolved = resolvePresetName(presetName);
    if (!resolved) return null;

    const overrides = {};
    for (const [rawKey, raw] of entries) {
        const key = canonicalKey(String(rawKey).trim());
        if (key.toLowerCase() === 'type') continue;
        const value = parseValue(key, raw);
        if (value !== undefined) overrides[key] = value;
    }

    return { presetName: resolved, overrides: normalize(overrides) };
}

// Split the string form into the written preset name and its raw pairs
function splitString(value) {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const segments = trimmed.split(PAIR_BOUNDARY);
    let presetName = null;
    const entries = [];

    segments.forEach((segment, index) => {
        const match = segment.match(PAIR);
        if (match) {
            if (match[1].toLowerCase() === 'type') {
                presetName = match[2].trim();
            } else {
                entries.push([match[1], match[2]]);
            }
        } else if (index === 0) {
            // Leading bare preset: 'snow' or 'snow, count: 5'
            presetName = segment.split(',')[0].trim();
        }
    });

    return { presetName, entries };
}

function parseString(value) {
    const parts = splitString(value);
    return parts ? buildResult(parts.presetName, parts.entries) : null;
}

// The preset name as written in a banner-confetti value, whether or not it
// resolves, so callers can name an unknown preset. null when there is none.
export function readPresetName(value) {
    let name = null;
    if (typeof value === 'string') {
        name = splitString(value)?.presetName;
    } else if (Array.isArray(value)) {
        name = value[0];
    } else if (isPlainObject(value)) {
        const typeKey = Object.keys(value).find(key => key.toLowerCase() === 'type');
        name = typeKey ? value[typeKey] : null;
    }
    return typeof name === 'string' && name.trim() !== '' ? name.trim() : null;
}

// Parse a banner-confetti value into { presetName, overrides }, or null.
// Accepts the string form ('type: snow, count: 5', unspaced, bare preset),
// a YAML object ({ type: snow, count: 5 }) and the legacy array form
// (['snow', { count: 5 }]).
export function parse(value) {
    if (typeof value === 'string') {
        return parseString(value);
    }

    if (Array.isArray(value)) {
        if (value.length === 0 || typeof value[0] !== 'string') return null;
        const overrides = isPlainObject(value[1]) ? value[1] : {};
        return buildResult(value[0], Object.entries(overrides));
    }

    if (isPlainObject(value)) {
        const typeKey = Object.keys(value).find(key => key.toLowerCase() === 'type');
        if (!typeKey || typeof value[typeKey] !== 'string') return null;
        return buildResult(value[typeKey], Object.entries(value));
    }

    return null;
}

// Decimals a key is written with: the step's decimals, at least 2 so preset
// values such as size 0.85 or gravityRange -0.05 survive a round trip.
const decimalsFor = (schema) => {
    if (schema.type === 'integer') return 0;
    const step = String(schema.step ?? '');
    const dot = step.indexOf('.');
    return Math.max(dot === -1 ? 0 : step.length - dot - 1, 2);
};

// Round to the key's precision, removing binary noise such as 0.30000000000000004
export const roundForKey = (key, value) => {
    const schema = CONFETTI_SCHEMA[key];
    if (!schema || typeof value !== 'number' || !Number.isFinite(value)) return value;
    return Number(value.toFixed(decimalsFor(schema)));
};

// Coerce, clamp and round one number. Returns undefined for NaN or non-numbers.
const normalizeNumber = (key, raw) => {
    const schema = CONFETTI_SCHEMA[key];
    let num = typeof raw === 'string' && raw.trim() !== '' ? Number(raw.trim()) : raw;
    if (typeof num !== 'number' || Number.isNaN(num)) return undefined;
    if (num === Infinity) num = schema.max ?? undefined;
    if (num === -Infinity) num = schema.min ?? undefined;
    if (num === undefined) return undefined;
    if (schema.min !== undefined) num = Math.max(schema.min, num);
    if (schema.max !== undefined) num = Math.min(schema.max, num);
    return roundForKey(key, num);
};

// Coerce every known key to its schema type and bounds. Invalid values are
// removed so the preset (or canvas-confetti) default applies; null and
// undefined are kept as they are; unknown keys pass through. Never throws.
export function normalize(config) {
    if (!isPlainObject(config)) return {};

    const result = {};
    for (const key of Object.keys(config)) {
        const raw = config[key];
        const schema = Object.prototype.hasOwnProperty.call(CONFETTI_SCHEMA, key) ? CONFETTI_SCHEMA[key] : null;

        if (raw === null || raw === undefined || !schema) {
            result[key] = raw;
            continue;
        }

        let value;
        switch (schema.type) {
            case 'number':
            case 'integer':
                value = normalizeNumber(key, raw);
                break;

            case 'range': {
                const parts = Array.isArray(raw) ? raw : (typeof raw === 'string' ? raw.split('|') : []);
                if (parts.length !== 2) break;
                const pair = parts.map(part => normalizeNumber(key, part));
                if (pair.some(v => v === undefined)) break;
                value = pair[0] > pair[1] ? [pair[1], pair[0]] : pair;
                break;
            }

            case 'colors': {
                const list = sanitizeHexColors(parseValue(key, raw) || []);
                if (list.length > 0) value = list;
                break;
            }

            case 'shapeList':
            case 'boolean':
            case 'enum':
            case 'emoji':
            case 'string':
                value = parseValue(key, raw);
                break;
        }

        if (value !== undefined) result[key] = value;
    }

    return result;
}

const valuesEqual = (key, a, b) => {
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
        return a.every((item, i) => valuesEqual(key, item, b[i]));
    }
    if (typeof a === 'number' && typeof b === 'number') {
        return roundForKey(key, a) === roundForKey(key, b);
    }
    if (typeof a === 'string' && typeof b === 'string' && key === 'colors') {
        return a.toLowerCase() === b.toLowerCase();
    }
    return a === b;
};

// Return only the keys of config whose value really differs from the preset.
// Keys the preset does not define compare against the schema default (or
// undefined); null and undefined values are never overrides.
export function diffFromPreset(presetName, config) {
    const resolved = resolvePresetName(presetName);
    const presetCopy = resolved ? getPresetCopy(resolved) : null;
    if (!presetCopy) return {};

    // Both sides normalized, so a preset value outside the schema bounds
    // (sparkles' spread: 1000 renders as 360) still matches itself
    const preset = normalize(presetCopy);
    const normalized = normalize(config);
    const overrides = {};

    for (const key of Object.keys(normalized)) {
        if (key === 'type') continue;
        const value = normalized[key];
        if (value === null || value === undefined) continue;

        let presetValue = preset[key];
        if (presetValue === undefined || presetValue === null) {
            presetValue = CONFETTI_SCHEMA[key] ? CONFETTI_SCHEMA[key].default : undefined;
        }

        if (!valuesEqual(key, value, presetValue)) {
            overrides[key] = value;
        }
    }

    return overrides;
}

// Build the frontmatter string: 'type: snow, count: 5, colors: #fff|#000'.
// Returns null without a valid preset. Null, undefined and empty arrays are
// skipped, so the literal 'null' is never written.
export function serialize(presetName, overrides = {}) {
    const resolved = resolvePresetName(presetName);
    if (!resolved) return null;

    const parts = [`type: ${resolved}`];
    const normalized = normalize(overrides);

    for (const [key, value] of Object.entries(normalized)) {
        if (key.toLowerCase() === 'type' || value === null || value === undefined) continue;

        if (Array.isArray(value)) {
            if (value.length === 0) continue;
            parts.push(`${key}: ${value.map(item => roundForKey(key, item)).join('|')}`);
        } else if (typeof value === 'number') {
            parts.push(`${key}: ${roundForKey(key, value)}`);
        } else {
            const text = String(value).trim();
            if (text === '') continue;
            parts.push(`${key}: ${text}`);
        }
    }

    return parts.join(', ');
}

// Field aliases from settings.customBannerConfettiField, first one preferred
const confettiFieldAliases = (settings) => {
    const configured = settings && settings.customBannerConfettiField;
    const list = (Array.isArray(configured) ? configured : [configured])
        .filter(name => typeof name === 'string' && name.trim() !== '')
        .map(name => name.trim());
    return list.length > 0 ? list : ['banner-confetti'];
};

// Write the confetti value inside a processFrontMatter callback. Writes to the
// alias the note already uses (or the first alias) and removes every other
// alias, so exactly one confetti property remains. null removes them all.
export function writeConfettiField(frontmatter, settings, value) {
    if (!frontmatter || typeof frontmatter !== 'object') return;

    // The registry holds the write rule; the aliases keep the banner-confetti
    // fallback for callers without configured names
    const plugin = { settings: { customBannerConfettiField: confettiFieldAliases(settings) } };

    if (value === null || value === undefined) {
        clearField(frontmatter, plugin, 'confetti');
        return;
    }
    writeField(frontmatter, plugin, 'confetti', value);
}
