import { getFrontmatterValue } from '../utils/frontmatterUtils.js';

// One entry per frontmatter field the plugin reads. `namesKey` is the
// custom*Field setting holding the user's names for it, `settingKey` its global
// value, `folderKey` its key on a folderImages entry, `default` the last resort
// where no setting exists or the setting may be empty by design, and `group`
// decides which lists the field belongs to. The keys follow no single pattern,
// so this table is written by hand; a test checks it against DEFAULT_SETTINGS.
const entry = (fields) => Object.freeze(fields);

export const FIELDS = Object.freeze([
    entry({ id: 'banner', namesKey: 'customBannerField', group: 'banner' }),
    entry({ id: 'xPosition', namesKey: 'customXPositionField', settingKey: 'xPosition', folderKey: 'xPosition', group: 'banner' }),
    entry({ id: 'yPosition', namesKey: 'customYPositionField', settingKey: 'yPosition', folderKey: 'yPosition', group: 'banner' }),
    entry({ id: 'contentStart', namesKey: 'customContentStartField', settingKey: 'contentStartPosition', folderKey: 'contentStartPosition', group: 'banner' }),
    entry({ id: 'imageDisplay', namesKey: 'customImageDisplayField', settingKey: 'imageDisplay', folderKey: 'imageDisplay', group: 'banner' }),
    entry({ id: 'imageRepeat', namesKey: 'customImageRepeatField', settingKey: 'imageRepeat', folderKey: 'imageRepeat', group: 'banner' }),
    entry({ id: 'maxWidth', namesKey: 'customBannerMaxWidthField', settingKey: 'bannerMaxWidth', group: 'banner' }),
    entry({ id: 'alignment', namesKey: 'customBannerAlignmentField', default: 'center', group: 'banner' }),
    entry({ id: 'height', namesKey: 'customBannerHeightField', settingKey: 'bannerHeight', folderKey: 'bannerHeight', group: 'banner' }),
    entry({ id: 'fade', namesKey: 'customFadeField', settingKey: 'fade', folderKey: 'fade', group: 'banner' }),
    entry({ id: 'borderRadius', namesKey: 'customBorderRadiusField', settingKey: 'borderRadius', folderKey: 'borderRadius', group: 'banner' }),
    entry({ id: 'titleColor', namesKey: 'customTitleColorField', settingKey: 'titleColor', folderKey: 'titleColor', group: 'banner' }),
    entry({ id: 'shuffle', namesKey: 'customBannerShuffleField', group: 'banner' }),
    entry({ id: 'flagColor', namesKey: 'customFlagColorField', settingKey: 'selectImageIconFlag', group: 'banner' }),
    entry({ id: 'icon', namesKey: 'customBannerIconField', group: 'icon' }),
    entry({ id: 'iconImage', namesKey: 'customBannerIconImageField', group: 'icon' }),
    entry({ id: 'iconSize', namesKey: 'customBannerIconSizeField', settingKey: 'bannerIconSize', folderKey: 'bannerIconSize', group: 'icon' }),
    entry({ id: 'iconImageSizeMultiplier', namesKey: 'customBannerIconImageSizeMultiplierField', settingKey: 'bannerIconImageSizeMultiplier', group: 'icon' }),
    entry({ id: 'iconTextVerticalOffset', namesKey: 'customBannerIconTextVerticalOffsetField', settingKey: 'bannerIconTextVerticalOffset', group: 'icon' }),
    entry({ id: 'iconRotate', namesKey: 'customBannerIconRotateField', default: 0, group: 'icon' }),
    entry({ id: 'iconXPosition', namesKey: 'customBannerIconXPositionField', settingKey: 'bannerIconXPosition', folderKey: 'bannerIconXPosition', group: 'icon' }),
    entry({ id: 'iconOpacity', namesKey: 'customBannerIconOpacityField', settingKey: 'bannerIconOpacity', folderKey: 'bannerIconOpacity', group: 'icon' }),
    entry({ id: 'iconColor', namesKey: 'customBannerIconColorField', settingKey: 'bannerIconColor', folderKey: 'bannerIconColor', default: 'var(--text-normal)', group: 'icon' }),
    entry({ id: 'iconFontWeight', namesKey: 'customBannerIconFontWeightField', settingKey: 'bannerIconFontWeight', folderKey: 'bannerIconFontWeight', group: 'icon' }),
    entry({ id: 'iconBackgroundColor', namesKey: 'customBannerIconBackgroundColorField', settingKey: 'bannerIconBackgroundColor', folderKey: 'bannerIconBackgroundColor', group: 'icon' }),
    entry({ id: 'iconPaddingX', namesKey: 'customBannerIconPaddingXField', settingKey: 'bannerIconPaddingX', folderKey: 'bannerIconPaddingX', group: 'icon' }),
    entry({ id: 'iconPaddingY', namesKey: 'customBannerIconPaddingYField', settingKey: 'bannerIconPaddingY', folderKey: 'bannerIconPaddingY', group: 'icon' }),
    entry({ id: 'iconBorderRadius', namesKey: 'customBannerIconBorderRadiusField', settingKey: 'bannerIconBorderRadius', folderKey: 'bannerIconBorderRadius', group: 'icon' }),
    entry({ id: 'iconVerticalOffset', namesKey: 'customBannerIconVerticalOffsetField', settingKey: 'bannerIconVerticalOffset', folderKey: 'bannerIconVerticalOffset', group: 'icon' }),
    entry({ id: 'iconImageAlignment', namesKey: 'customBannerIconImageAlignmentField', settingKey: 'bannerIconImageAlignment', group: 'icon' }),
    entry({ id: 'confetti', namesKey: 'customBannerConfettiField', group: 'confetti' })
]);

const FIELDS_BY_ID = new Map(FIELDS.map(field => [field.id, field]));

function getEntry(id) {
    const field = FIELDS_BY_ID.get(id);
    if (!field) {
        throw new Error(`Pixel Banner: unknown banner field "${id}"`);
    }
    return field;
}

const isNotSet = (value) => value === null || value === undefined || value === '';


// ---------------------
// -- names and lists --
// ---------------------
// Every configured name of a field, read live from the settings: entries
// written as one comma-separated string are split, trimmed and kept in order
export function getFieldNames(plugin, id) {
    const configured = plugin?.settings?.[getEntry(id).namesKey];
    if (configured === null || configured === undefined) return [];

    const entries = Array.isArray(configured) ? configured : [configured];
    return entries.flatMap(name => {
        if (typeof name !== 'string') return [];
        return name.split(',').map(part => part.trim()).filter(part => part.length > 0);
    });
}

export function getPrimaryName(plugin, id) {
    return getFieldNames(plugin, id)[0];
}

export function getAllFieldNames(plugin, { excludeGroups = [] } = {}) {
    const names = FIELDS
        .filter(field => !excludeGroups.includes(field.group))
        .flatMap(field => getFieldNames(plugin, field.id));
    return [...new Set(names)];
}


// --------------------
// -- value resolver --
// --------------------
/**
 * Resolves a field's value: frontmatter, then the folder override, then the
 * setting, then the registry default.
 *
 * At every step but the default, null, undefined and '' mean "not set here,
 * try the next step"; 0 and false are real values. 'true'/'false' strings in
 * frontmatter become booleans (getFrontmatterValue); number strings pass
 * through for the caller to parse. Why '' counts as not set: see
 * specs--completed/codebase-health/pathfinder/questions/03-what-counts-as-not-set.md
 *
 * @param {Object} plugin - The plugin (reads plugin.settings)
 * @param {string} id - Registry field id, e.g. 'fade'
 * @param {Object} frontmatter - The note's frontmatter, or null
 * @param {Object} [folderSpecific] - The note's folderImages entry, or null
 * @returns {any} The resolved value, or undefined when nothing is set
 */
export function resolveField(plugin, id, frontmatter, folderSpecific = null) {
    const field = getEntry(id);

    const fromFrontmatter = getFrontmatterValue(frontmatter, getFieldNames(plugin, id));
    if (!isNotSet(fromFrontmatter)) return fromFrontmatter;

    if (field.folderKey && folderSpecific && typeof folderSpecific === 'object') {
        const fromFolder = folderSpecific[field.folderKey];
        if (!isNotSet(fromFolder)) return fromFolder;
    }

    if (field.settingKey) {
        const fromSetting = plugin?.settings?.[field.settingKey];
        if (!isNotSet(fromSetting)) return fromSetting;
    }

    return field.default;
}


// ---------------------
// -- write and clear --
// ---------------------
// Both edit the object a processFrontMatter callback received; they never save.
// A write goes to the name the note already uses (else the primary name) and
// removes the field's other names, so one property remains. Nothing else in
// the frontmatter is touched.
export function writeField(frontmatter, plugin, id, value) {
    if (!frontmatter || typeof frontmatter !== 'object') return;

    if (value === null || value === undefined) {
        clearField(frontmatter, plugin, id);
        return;
    }

    const names = getFieldNames(plugin, id);
    if (names.length === 0) return;

    const target = names.find(name => Object.prototype.hasOwnProperty.call(frontmatter, name)) || names[0];
    for (const name of names) {
        if (name !== target) delete frontmatter[name];
    }
    frontmatter[target] = value;
}

export function clearField(frontmatter, plugin, id) {
    if (!frontmatter || typeof frontmatter !== 'object') return;

    for (const name of getFieldNames(plugin, id)) {
        delete frontmatter[name];
    }
}
