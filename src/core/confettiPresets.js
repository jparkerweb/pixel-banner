// Confetti preset configurations for Pixel Banner
// Each preset defines default parameters for a specific visual effect

// Keys every preset must define, so the modal, diffFromPreset and the
// renderer always see the same baseline
export const REQUIRED_PRESET_KEYS = [
    'count', 'size', 'speed', 'gravity', 'spread', 'drift', 'duration', 'delay',
    'fadeIn', 'opacity', 'continuous', 'interval', 'position', 'colors', 'emoji',
    'originSpread', 'sizeRange', 'speedRange', 'gravityRange', 'driftRange'
];

export const CONFETTI_PRESETS = {
    snow: {
        count: 1,
        size: 0.7,
        speed: 0,
        gravity: 0.5,
        spread: 0,
        drift: 0,
        duration: 700,
        delay: 0,
        fadeIn: 500,
        opacity: 0.8,
        continuous: true,
        interval: 100,
        position: 'top',
        colors: ['#ffffff', '#b8cde0', '#9fb3c8'],
        shapes: ['circle'],
        flat: true,
        emoji: null,
        originSpread: 'random',
        sizeRange: [0.3, 0.8],
        speedRange: [0, 0],
        gravityRange: [0.4, 0.6],
        driftRange: [-0.4, 0.4]
    },
    snowflakes: {
        count: 1,
        size: 0.7,
        speed: 0,
        gravity: 0.1,
        spread: 1,
        drift: 0,
        duration: 1000,
        delay: 0,
        fadeIn: 500,
        opacity: 0.7,
        continuous: true,
        interval: 600,
        position: 'top',
        startY: -0.1,
        colors: ['#afc7d9', '#4cb3cd'],
        customShapes: ['snowflake'],
        emoji: null,
        originSpread: 'random',
        sizeRange: [1, 3],
        speedRange: [0, 0],
        gravityRange: [0.1, 0.4],
        driftRange: [-0.4, 0.4]
    },

    leaves: {
        count: 1,
        size: 2.0,
        speed: 0,
        gravity: 0.3,
        spread: 0,
        drift: 0,
        duration: 600,
        delay: 0,
        fadeIn: 500,
        opacity: 0.9,
        continuous: true,
        interval: 350,
        position: 'top',
        colors: ['#e74c3c', '#e67e22', '#f39c12', '#d35400', '#c0392b'],
        customShapes: ['leaf'],
        emoji: null,
        flat: false,
        originSpread: 'random',
        sizeRange: [1, 2],
        speedRange: [0, 0],
        gravityRange: [0.2, 0.4],
        driftRange: [-1.0, 1.0]
    },

    rain_light: {
        count: 4,
        size: 0.5,
        speed: 0,
        gravity: 2.0,
        spread: 0,
        drift: 0,
        duration: 200,
        delay: 0,
        fadeIn: 350,
        opacity: 0.6,
        continuous: true,
        interval: 400,
        position: 'top',
        startY: -0.1,
        colors: ['#2196f3', '#64b5f6'],
        customShapes: ['raindrop'],
        shapes: ['circle'],
        flat: true,
        emoji: null,
        originSpread: 'random',
        sizeRange: [0.6, 1.0],
        speedRange: [0, 0],
        gravityRange: [1.8, 2.2],
        driftRange: [0, 0]
    },
    rain_heavy: {
        count: 4,
        size: 0.5,
        speed: 0,
        gravity: 2.0,
        spread: 0,
        drift: 0,
        duration: 200,
        delay: 0,
        fadeIn: 300,
        opacity: 1,
        continuous: true,
        interval: 150,
        position: 'top',
        colors: ['#1b78d4', '#aaccee'],
        customShapes: ['raindrop'],
        flat: true,
        emoji: null,
        originSpread: 'random',
        sizeRange: [0.6, 1.0],
        speedRange: [0, 0],
        gravityRange: [1.8, 2.2],
        driftRange: [0, 0]
    },

    space: {
        count: 1,
        size: 0.4,
        speed: 0,
        gravity: 0,
        spread: 0,
        drift: 3.0,
        duration: 800,
        delay: 0,
        fadeIn: 1000,
        opacity: 0.7,
        continuous: true,
        interval: 124,
        position: 'left',
        startY: 0,
        colors: ['#ffffff', '#ffffcc', '#fffacd', '#b8cde0', '#9fb3c8'],
        shapes: ['circle'],
        emoji: null,
        originSpread: 'random',
        sizeRange: [0.2, 0.6],
        speedRange: [0, 0],
        gravityRange: [-0.05, 0.05],
        driftRange: [2.0, 4.0]
    },
    aliens: {
        count: 1,
        size: 0.4,
        speed: 0,
        gravity: 0,
        spread: 0,
        drift: 3.0,
        duration: 800,
        delay: 0,
        fadeIn: 1000,
        opacity: 0.7,
        continuous: true,
        interval: 700,
        position: 'left',
        startY: 0,
        colors: ['#ffffff', '#49c05d', '#9fb3c8'],
        customShapes: ['alien', 'ufo'],
        emoji: null,
        flat: true,
        originSpread: 'random',
        sizeRange: [1, 2.75],
        speedRange: [0, 0],
        gravityRange: [-0.05, 0.05],
        driftRange: [1.0, 4.0]
    },

    fireworks: {
        count: 30,
        size: 0.85,
        speed: 20,
        gravity: 0.2,
        spread: 360,
        drift: 0,
        duration: 90,
        delay: 0,
        fadeIn: 0,
        opacity: 0.7,
        continuous: true,
        interval: 2500,
        position: 'random',
        colors: ['#ff0000', '#3e8a3e', '#008cff', '#ffff00', '#ff6600', '#00ffff', '#ffa600', '#ffffff'],
        shapes: ['star'],
        emoji: null,
        originSpread: 'random',
        sizeRange: [0.85, 0.85],
        speedRange: [20, 20],
        gravityRange: [0.2, 0.2],
        driftRange: [-0.25, 0.25]
    },

    confetti: {
        count: 80,
        size: 1.0,
        speed: 55,
        gravity: 1.0,
        spread: 200,
        drift: 0,
        duration: 200,
        delay: 0,
        fadeIn: 0,
        opacity: 0.8,
        continuous: true,
        interval: 7000,
        position: 'center',
        colors: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'],
        emoji: null,
        originSpread: 'fixed',
        sizeRange: [1, 1],
        speedRange: [55, 55],
        gravityRange: [1, 1],
        driftRange: [0, 0]
    },

    hearts: {
        count: 10,
        size: 2.0,
        speed: 30,
        gravity: -0.5,
        spread: 280,
        drift: 0.8,
        duration: 500,
        delay: 0,
        fadeIn: 500,
        opacity: 0.9,
        continuous: true,
        interval: 5000,
        position: 'random',
        colors: ['#e74c3c'],
        emoji: '❤️💕💖',
        originSpread: 'random',
        sizeRange: [1.5, 3],
        speedRange: [30, 30],
        gravityRange: [-0.6, -0.3],
        driftRange: [-0.8, 0.8]
    },

    sparkles: {
        count: 1,
        size: 0.7,
        speed: 15,
        gravity: 0.1,
        spread: 360,
        drift: 0.1,
        duration: 400,
        delay: 0,
        fadeIn: 500,
        opacity: 0.75,
        continuous: true,
        interval: 400,
        position: 'random',
        colors: ['#ffd700', '#c0c0c0', '#ffffff'],
        emoji: '✨',
        originSpread: 'random',
        sizeRange: [1.2, 2.2],
        speedRange: [3, 11],
        gravityRange: [0.1, 0.1],
        driftRange: [-4, 4]
    },

    pop_rocks: {
        count: 1,
        size: 0.7,
        speed: 15,
        gravity: 0.1,
        spread: 360,
        drift: 0.1,
        duration: 400,
        delay: 0,
        fadeIn: 500,
        opacity: 0.75,
        continuous: true,
        interval: 400,
        position: 'random',
        colors: ['#ffd700', '#c0c0c0', '#ffffff'],
        emoji: '🔴🟠🟡🟢🔵🟣',
        originSpread: 'random',
        sizeRange: [1.2, 2.2],
        speedRange: [3, 11],
        gravityRange: [0.1, 0.1],
        driftRange: [-4, 4]
    },

    crystals: {
        count: 1,
        size: 1.2,
        speed: 0,
        gravity: 0.3,
        spread: 0,
        drift: 0,
        duration: 600,
        delay: 0,
        fadeIn: 500,
        opacity: 0.8,
        continuous: true,
        interval: 300,
        position: 'random',
        colors: ['#e0115f', '#36bbf8', '#50c878', '#9966cc', '#ffc30b'],
        customShapes: ['gem', 'gem2', 'gem3', 'gem4', 'gem5'],
        flat: true,
        emoji: null,
        originSpread: 'random',
        sizeRange: [0.8, 2.5],
        speedRange: [0, 0],
        gravityRange: [0.2, 0.4],
        driftRange: [-0.3, 0.3]
    },

    bubbles: {
        count: 35,
        size: 1.5,
        speed: 20,
        gravity: -0.8,
        spread: 180,
        drift: 0.5,
        duration: 500,
        delay: 0,
        fadeIn: 800,
        opacity: 0.7,
        continuous: true,
        interval: 1000,
        position: 'bottom',
        colors: ['#5dade2', '#87ceeb', '#7fb3d5'],
        shapes: ['circle'],
        flat: true,
        emoji: null,
        originSpread: 'random',
        sizeRange: [1.0, 2.0],
        speedRange: [20, 20],
        gravityRange: [-0.8, -0.8],
        driftRange: [0.25, 0.75]
    }
};

// Get list of all preset names
export function getPresetNames() {
    return Object.keys(CONFETTI_PRESETS);
}

// Get a specific preset configuration
// Own-property lookup, so 'toString' or '__proto__' return null
export function getPreset(name) {
    return Object.prototype.hasOwnProperty.call(CONFETTI_PRESETS, name) ? CONFETTI_PRESETS[name] : null;
}

// Light-theme palettes for presets drawn mostly in white, which wash out on a
// white page. Kept outside the presets so the modal and the codec never see
// them: the renderer swaps them in only when the note sets no colours.
const LIGHT_THEME_COLORS = {
    snow: ['#5c7d9e', '#7d9bb8', '#4a6a8a'],
    snowflakes: ['#4a7fa7', '#2f8fb0', '#6b93b5'],
    space: ['#4a5a8a', '#b8860b', '#6a5acd', '#5c7d9e'],
    aliens: ['#2e8b57', '#3f8f4f', '#5c7d9e']
};

// The preset's light-theme palette (a copy), or null when it has none
export function getLightThemeColors(name) {
    return Object.prototype.hasOwnProperty.call(LIGHT_THEME_COLORS, name) ? [...LIGHT_THEME_COLORS[name]] : null;
}

// Array-valued preset keys, deep-copied by getPresetCopy
const PRESET_ARRAY_KEYS = ['colors', 'shapes', 'customShapes', 'sizeRange', 'speedRange', 'gravityRange', 'driftRange'];

// Get a copy of preset with deep clone to avoid mutations
export function getPresetCopy(name) {
    const preset = getPreset(name);
    if (!preset) return null;

    // Arrays are copied only when the preset defines them, so the copy
    // never carries keys set to undefined
    const copy = { ...preset, emoji: preset.emoji ?? null };
    for (const key of PRESET_ARRAY_KEYS) {
        if (Array.isArray(preset[key])) {
            copy[key] = [...preset[key]];
        }
    }
    return copy;
}
