import { CONFETTI_PRESETS, getPresetNames as getPresetNamesFromPresets, getPresetCopy } from '../core/confettiPresets';

// Parse a single value from a key:value pair string
function parseConfettiValue(val) {
    if (val === undefined || val === null || val === '') {
        return val;
    }

    // Boolean
    if (val === 'true') return true;
    if (val === 'false') return false;

    // Array (pipe-separated)
    if (typeof val === 'string' && val.includes('|')) {
        return val.split('|');
    }

    // Number
    const num = Number(val);
    if (!isNaN(num) && val !== '') return num;

    // String (default)
    return val;
}

// Parse frontmatter confetti value
// New format: "type:presetName, key:value, key:value"
// Backward compatible with: ["presetName"] or ["presetName", {overrides}]
export function parseConfettiConfig(value) {
    if (!value) {
        return null;
    }

    // Handle new string format: "type:presetName" or "type:presetName, key:value, ..."
    if (typeof value === 'string') {
        const trimmedValue = value.trim();

        // Check if it's the new key:value format (contains colon)
        if (trimmedValue.includes(':')) {
            // Split by ", " to get key:value pairs
            const pairs = trimmedValue.split(', ');
            const config = {};
            let presetName = null;

            for (const pair of pairs) {
                const colonIndex = pair.indexOf(':');
                if (colonIndex === -1) continue;

                const key = pair.substring(0, colonIndex).trim();
                const val = pair.substring(colonIndex + 1).trim();

                if (key === 'type') {
                    presetName = val;
                } else {
                    // Parse value type (boolean, number, array, string)
                    config[key] = parseConfettiValue(val);
                }
            }

            if (!presetName) {
                return null;
            }

            return {
                presetName,
                overrides: config
            };
        }

        // Backward compatibility: simple string preset name (old format)
        return {
            presetName: trimmedValue,
            overrides: {}
        };
    }

    // Backward compatibility: Handle array format: ["presetName"] or ["presetName", {overrides}]
    if (Array.isArray(value)) {
        if (value.length === 0) {
            return null;
        }

        const presetName = typeof value[0] === 'string' ? value[0].trim() : null;
        if (!presetName) {
            return null;
        }

        const overrides = value.length > 1 && typeof value[1] === 'object' && value[1] !== null
            ? value[1]
            : {};

        return {
            presetName,
            overrides
        };
    }

    return null;
}

// Build frontmatter value from config
// New format: "type:presetName, key:value, key:value"
export function buildConfettiFrontmatter(presetName, overrides = {}) {
    if (!presetName) {
        return null;
    }

    const parts = [`type:${presetName}`];

    // Add overrides as key:value pairs
    if (overrides && typeof overrides === 'object') {
        for (const [key, value] of Object.entries(overrides)) {
            if (Array.isArray(value)) {
                // Join array values with pipe separator
                parts.push(`${key}:${value.join('|')}`);
            } else {
                parts.push(`${key}:${value}`);
            }
        }
    }

    return parts.join(', ');
}

// Check if config has any overrides from preset defaults
export function hasOverrides(presetName, config) {
    if (!presetName || !config) {
        return false;
    }

    const preset = getPresetCopy(presetName);
    if (!preset) {
        return false;
    }

    // Compare each property
    for (const key in config) {
        if (!Object.prototype.hasOwnProperty.call(config, key)) {
            continue;
        }

        const presetValue = preset[key];
        const configValue = config[key];

        // Handle array comparison (colors)
        if (Array.isArray(presetValue) && Array.isArray(configValue)) {
            if (presetValue.length !== configValue.length) {
                return true;
            }
            for (let i = 0; i < presetValue.length; i++) {
                if (presetValue[i] !== configValue[i]) {
                    return true;
                }
            }
        } else if (presetValue !== configValue) {
            return true;
        }
    }

    return false;
}

// Get list of preset names (re-export for convenience)
export function getPresetNames() {
    return getPresetNamesFromPresets();
}

// Validate emoji string (split into array of individual emoji)
// Handles multi-codepoint emoji properly using spread operator
export function parseEmojiString(emojiString) {
    if (!emojiString || typeof emojiString !== 'string') {
        return [];
    }

    // Use spread operator to properly split multi-codepoint emoji
    // This handles emoji with modifiers, ZWJ sequences, etc.
    const characters = [...emojiString];

    // Filter to keep only actual emoji characters (not spaces or other chars)
    const emojiArray = [];
    let i = 0;

    while (i < characters.length) {
        const char = characters[i];

        // Skip whitespace
        if (/\s/.test(char)) {
            i++;
            continue;
        }

        // Check if this starts an emoji sequence
        // Build up the full emoji by checking for ZWJ sequences and modifiers
        let emoji = char;
        let j = i + 1;

        // Look ahead for ZWJ sequences and variation selectors
        while (j < characters.length) {
            const nextChar = characters[j];
            const codePoint = nextChar.codePointAt(0);

            // Check for Zero Width Joiner (U+200D)
            if (codePoint === 0x200D) {
                emoji += nextChar;
                j++;
                // Include the character after ZWJ
                if (j < characters.length) {
                    emoji += characters[j];
                    j++;
                }
            }
            // Check for Variation Selectors (U+FE00 to U+FE0F)
            else if (codePoint >= 0xFE00 && codePoint <= 0xFE0F) {
                emoji += nextChar;
                j++;
            }
            // Check for Skin Tone Modifiers (U+1F3FB to U+1F3FF)
            else if (codePoint >= 0x1F3FB && codePoint <= 0x1F3FF) {
                emoji += nextChar;
                j++;
            }
            // Check for Regional Indicator continuation (for flags)
            else if (codePoint >= 0x1F1E6 && codePoint <= 0x1F1FF &&
                     char.codePointAt(0) >= 0x1F1E6 && char.codePointAt(0) <= 0x1F1FF) {
                emoji += nextChar;
                j++;
            }
            else {
                break;
            }
        }

        // Only add if it looks like an emoji (not just a regular character)
        const firstCodePoint = char.codePointAt(0);
        const isLikelyEmoji = (
            firstCodePoint > 255 && // Not basic ASCII
            (
                (firstCodePoint >= 0x1F000 && firstCodePoint <= 0x1FFFF) || // Emoticons and symbols
                (firstCodePoint >= 0x2600 && firstCodePoint <= 0x27BF) ||   // Misc symbols
                (firstCodePoint >= 0x2B00 && firstCodePoint <= 0x2BFF) ||   // Misc symbols and arrows
                (firstCodePoint >= 0xFE00 && firstCodePoint <= 0xFE0F) ||   // Variation selectors
                (firstCodePoint >= 0x1F1E6 && firstCodePoint <= 0x1F1FF) || // Regional indicators
                (firstCodePoint >= 0x2300 && firstCodePoint <= 0x23FF) ||   // Misc technical
                (firstCodePoint >= 0x2700 && firstCodePoint <= 0x27BF) ||   // Dingbats
                (firstCodePoint >= 0x231A && firstCodePoint <= 0x231B) ||   // Watch, hourglass
                (firstCodePoint >= 0x25AA && firstCodePoint <= 0x25AB) ||   // Squares
                (firstCodePoint >= 0x25B6 && firstCodePoint <= 0x25C0) ||   // Triangles
                (firstCodePoint >= 0x25FB && firstCodePoint <= 0x25FE) ||   // Squares
                (firstCodePoint >= 0x2614 && firstCodePoint <= 0x2615) ||   // Umbrella, coffee
                (firstCodePoint >= 0x2648 && firstCodePoint <= 0x2653) ||   // Zodiac
                (firstCodePoint >= 0x267F && firstCodePoint <= 0x267F) ||   // Wheelchair
                (firstCodePoint >= 0x2693 && firstCodePoint <= 0x2693) ||   // Anchor
                (firstCodePoint >= 0x26A1 && firstCodePoint <= 0x26A1) ||   // High voltage
                (firstCodePoint >= 0x26AA && firstCodePoint <= 0x26AB) ||   // Circles
                (firstCodePoint >= 0x26BD && firstCodePoint <= 0x26BE) ||   // Sports balls
                (firstCodePoint >= 0x26C4 && firstCodePoint <= 0x26C5) ||   // Snowman, sun
                (firstCodePoint >= 0x26CE && firstCodePoint <= 0x26CE) ||   // Ophiuchus
                (firstCodePoint >= 0x26D4 && firstCodePoint <= 0x26D4) ||   // No entry
                (firstCodePoint >= 0x26EA && firstCodePoint <= 0x26EA) ||   // Church
                (firstCodePoint >= 0x26F2 && firstCodePoint <= 0x26F3) ||   // Fountain, golf
                (firstCodePoint >= 0x26F5 && firstCodePoint <= 0x26F5) ||   // Sailboat
                (firstCodePoint >= 0x26FA && firstCodePoint <= 0x26FA) ||   // Tent
                (firstCodePoint >= 0x26FD && firstCodePoint <= 0x26FD) ||   // Fuel pump
                (firstCodePoint >= 0x2702 && firstCodePoint <= 0x2702) ||   // Scissors
                (firstCodePoint >= 0x2705 && firstCodePoint <= 0x2705) ||   // Check mark
                (firstCodePoint >= 0x2708 && firstCodePoint <= 0x270D) ||   // Airplane etc
                (firstCodePoint >= 0x270F && firstCodePoint <= 0x270F) ||   // Pencil
                (firstCodePoint >= 0x2712 && firstCodePoint <= 0x2712) ||   // Black nib
                (firstCodePoint >= 0x2714 && firstCodePoint <= 0x2714) ||   // Check mark
                (firstCodePoint >= 0x2716 && firstCodePoint <= 0x2716) ||   // X mark
                (firstCodePoint >= 0x271D && firstCodePoint <= 0x271D) ||   // Latin cross
                (firstCodePoint >= 0x2721 && firstCodePoint <= 0x2721) ||   // Star of David
                (firstCodePoint >= 0x2728 && firstCodePoint <= 0x2728) ||   // Sparkles
                (firstCodePoint >= 0x2733 && firstCodePoint <= 0x2734) ||   // Eight spoked
                (firstCodePoint >= 0x2744 && firstCodePoint <= 0x2744) ||   // Snowflake
                (firstCodePoint >= 0x2747 && firstCodePoint <= 0x2747) ||   // Sparkle
                (firstCodePoint >= 0x274C && firstCodePoint <= 0x274C) ||   // Cross mark
                (firstCodePoint >= 0x274E && firstCodePoint <= 0x274E) ||   // Cross mark
                (firstCodePoint >= 0x2753 && firstCodePoint <= 0x2755) ||   // Question marks
                (firstCodePoint >= 0x2757 && firstCodePoint <= 0x2757) ||   // Exclamation
                (firstCodePoint >= 0x2763 && firstCodePoint <= 0x2764) ||   // Heart exclamation
                (firstCodePoint >= 0x2795 && firstCodePoint <= 0x2797) ||   // Math symbols
                (firstCodePoint >= 0x27A1 && firstCodePoint <= 0x27A1) ||   // Right arrow
                (firstCodePoint >= 0x27B0 && firstCodePoint <= 0x27B0) ||   // Curly loop
                (firstCodePoint >= 0x27BF && firstCodePoint <= 0x27BF) ||   // Double curly
                (firstCodePoint >= 0x2934 && firstCodePoint <= 0x2935) ||   // Arrows
                (firstCodePoint >= 0x2B05 && firstCodePoint <= 0x2B07) ||   // Arrows
                (firstCodePoint >= 0x2B1B && firstCodePoint <= 0x2B1C) ||   // Squares
                (firstCodePoint >= 0x2B50 && firstCodePoint <= 0x2B50) ||   // Star
                (firstCodePoint >= 0x2B55 && firstCodePoint <= 0x2B55) ||   // Circle
                (firstCodePoint >= 0x3030 && firstCodePoint <= 0x3030) ||   // Wavy dash
                (firstCodePoint >= 0x303D && firstCodePoint <= 0x303D) ||   // Part alternation
                (firstCodePoint >= 0x3297 && firstCodePoint <= 0x3297) ||   // Circled ideograph
                (firstCodePoint >= 0x3299 && firstCodePoint <= 0x3299)      // Secret
            )
        );

        if (isLikelyEmoji) {
            emojiArray.push(emoji);
        }

        i = j;
    }

    return emojiArray;
}

// Validate that a preset name exists
export function isValidPreset(presetName) {
    return CONFETTI_PRESETS.hasOwnProperty(presetName);
}

// Get default configuration for a preset (for display in UI)
export function getPresetDefaults(presetName) {
    return getPresetCopy(presetName);
}

// Merge overrides with preset defaults to get full config
export function getFullConfig(presetName, overrides = {}) {
    const preset = getPresetCopy(presetName);
    if (!preset) {
        return null;
    }
    return { ...preset, ...overrides };
}

// Sanitize config values to be within valid ranges
export function sanitizeConfig(config) {
    const sanitized = { ...config };

    // Clamp numeric values to valid ranges
    if (sanitized.count !== undefined) {
        sanitized.count = Math.max(10, Math.min(500, sanitized.count));
    }
    if (sanitized.size !== undefined) {
        sanitized.size = Math.max(0.1, Math.min(5.0, sanitized.size));
    }
    if (sanitized.speed !== undefined) {
        sanitized.speed = Math.max(1, Math.min(100, sanitized.speed));
    }
    if (sanitized.gravity !== undefined) {
        sanitized.gravity = Math.max(-3, Math.min(3, sanitized.gravity));
    }
    if (sanitized.spread !== undefined) {
        sanitized.spread = Math.max(0, Math.min(360, sanitized.spread));
    }
    if (sanitized.drift !== undefined) {
        sanitized.drift = Math.max(-5, Math.min(5, sanitized.drift));
    }
    if (sanitized.duration !== undefined) {
        sanitized.duration = Math.max(50, Math.min(1000, sanitized.duration));
    }
    if (sanitized.delay !== undefined) {
        sanitized.delay = Math.max(0, Math.min(5000, sanitized.delay));
    }
    if (sanitized.fadeIn !== undefined) {
        sanitized.fadeIn = Math.max(0, Math.min(2000, sanitized.fadeIn));
    }
    if (sanitized.opacity !== undefined) {
        sanitized.opacity = Math.max(0.1, Math.min(1.0, sanitized.opacity));
    }
    if (sanitized.interval !== undefined) {
        sanitized.interval = Math.max(50, Math.min(5000, sanitized.interval));
    }

    return sanitized;
}
