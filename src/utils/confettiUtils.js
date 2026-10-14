import { getPresetNames as getPresetNamesFromPresets, getPresetCopy } from '../core/confettiPresets';
import { resolvePresetName, parse, serialize, normalize, diffFromPreset } from './confettiConfig';

// Parse frontmatter confetti value into { presetName, overrides } or null.
// Accepts 'type: snow, count: 5', unspaced and bare-preset forms, YAML
// objects and the legacy ["presetName", {overrides}] array.
export function parseConfettiConfig(value) {
    return parse(value);
}

// Build frontmatter value from config: 'type: presetName, key: value'
export function buildConfettiFrontmatter(presetName, overrides = {}) {
    return serialize(presetName, overrides);
}

// Check if config has any overrides from preset defaults
export function hasOverrides(presetName, config) {
    if (!presetName || !config) {
        return false;
    }
    return Object.keys(diffFromPreset(presetName, config)).length > 0;
}

// Get list of preset names (re-export for convenience)
export function getPresetNames() {
    return getPresetNamesFromPresets();
}

// A grapheme counts as emoji if it holds a pictograph, a flag letter,
// a keycap combiner (U+20E3) or one of the (c)/(r)/TM symbols
const EMOJI_SEGMENT_REGEX = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣|[©®™]/u;

// Validate emoji string (split into array of individual emoji)
// Uses Intl.Segmenter grapheme clusters when available, so flags,
// keycaps, ZWJ and tag sequences stay whole
export function parseEmojiString(emojiString) {
    if (!emojiString || typeof emojiString !== 'string') {
        return [];
    }

    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        const emojiArray = [];
        for (const { segment } of segmenter.segment(emojiString)) {
            if (EMOJI_SEGMENT_REGEX.test(segment)) {
                emojiArray.push(segment);
            }
        }
        return emojiArray;
    }

    return parseEmojiStringFallback(emojiString);
}

// Fallback for runtimes without Intl.Segmenter: manual codepoint walk
function parseEmojiStringFallback(emojiString) {
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
    return resolvePresetName(presetName) !== null;
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

// Sanitize config values to be within valid ranges.
// Applied to every effect regardless of source (modal or hand-edited
// frontmatter) so out-of-range or malformed numbers can never reach
// canvas-confetti.
export function sanitizeConfig(config) {
    return normalize(config);
}
