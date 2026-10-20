// Pure decisions for banner and icon headers: each helper takes plain values
// (the plugin's settings, a note's frontmatter) and returns a value, with no DOM access
import { getFrontmatterValue } from '../utils/frontmatterUtils.js';
import { getFieldNames, resolveField } from './fieldRegistry.js';

// Icon-only headers sit this far below the top of the note, and the content starts this far
// below the icon. Numbers rather than Obsidian's --size-4-4 (16px) so the content start can be
// computed and shown as a number
export const ICON_ONLY_INSET_PX = 16;
export const ICON_ONLY_GAP_PX = 16;

function hasText(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function toNumber(value, fallback = 0) {
    const parsed = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

// -----------------
// -- header mode --
// -----------------
// What a note's header shows (issues #322, #238). hasIcon: icon or iconImage has non-whitespace text.
//
//   hasBannerSource | imageFailed | hasIcon | mode
//   ----------------+-------------+---------+-----------
//   yes             | no          | any     | banner
//   yes             | yes         | no      | banner     (a broken banner without an icon behaves as before)
//   yes             | yes         | yes     | icon-only  (a broken banner falls back to the icon)
//   no              | any         | yes     | icon-only
//   no              | any         | no      | none
export function getHeaderMode({ hasBannerSource, imageFailed, icon, iconImage }) {
    const hasIcon = hasText(icon) || hasText(iconImage);
    if (hasBannerSource && !(imageFailed && hasIcon)) return 'banner';
    if (hasIcon) return 'icon-only';
    return 'none';
}

// ----------------------
// -- icon layout vars --
// ----------------------
// The --pixel-banner-icon-* variables the overlay reads, formatted as applyBannerSettings() has
// always written them. Banner mode straddles the icon across the banner's bottom edge; icon-only
// mode puts it ICON_ONLY_INSET_PX below the top of the note
export function getIconLayoutVars(plugin, frontmatter, folderSpecific, { mode, bannerHeight } = {}) {
    const iconSize = resolveField(plugin, 'iconSize', frontmatter, folderSpecific);
    const isIconOnly = mode === 'icon-only';

    return {
        '--pixel-banner-icon-size': `${iconSize}px`,
        '--pixel-banner-icon-start': isIconOnly ? `${ICON_ONLY_INSET_PX}px` : `${(bannerHeight - (iconSize / 2))}px`,
        '--pixel-banner-icon-translate-y': isIconOnly ? '0%' : '-15%',
        '--pixel-banner-icon-x': `${resolveField(plugin, 'iconXPosition', frontmatter, folderSpecific)}%`,
        '--pixel-banner-icon-opacity': `${resolveField(plugin, 'iconOpacity', frontmatter, folderSpecific)}%`,
        '--pixel-banner-icon-color': resolveField(plugin, 'iconColor', frontmatter, folderSpecific),
        '--pixel-banner-icon-font-weight': resolveField(plugin, 'iconFontWeight', frontmatter, folderSpecific),
        '--pixel-banner-icon-background-color': resolveField(plugin, 'iconBackgroundColor', frontmatter, folderSpecific) ?? 'transparent',
        '--pixel-banner-icon-padding-x': `${resolveField(plugin, 'iconPaddingX', frontmatter, folderSpecific)}px`,
        '--pixel-banner-icon-padding-y': `${resolveField(plugin, 'iconPaddingY', frontmatter, folderSpecific)}px`,
        '--pixel-banner-icon-border-radius': `${resolveField(plugin, 'iconBorderRadius', frontmatter, folderSpecific)}px`,
        '--pixel-banner-icon-vertical-offset': `${resolveField(plugin, 'iconVerticalOffset', frontmatter, folderSpecific)}px`,
        '--pixel-banner-icon-rotate': `${resolveField(plugin, 'iconRotate', frontmatter, folderSpecific)}deg`,
        '--pixel-banner-icon-image-size-multiplier': `${resolveField(plugin, 'iconImageSizeMultiplier', frontmatter, folderSpecific)}em`,
        '--pixel-banner-icon-text-vertical-offset': `${resolveField(plugin, 'iconTextVerticalOffset', frontmatter, folderSpecific)}px`
    };
}

// -------------------------------
// -- icon-only content start --
// -------------------------------
// Where an icon-only note's content starts, in pixels. A note's own content start wins; the
// global Content Start setting is for banners and is not consulted. Otherwise the height of the
// overlay, which CSS fixes: text line-height equals the icon size, and an icon image is
// multiplier x 1em tall
export function getIconOnlyContentStart(plugin, frontmatter, folderSpecific) {
    const noteContentStart = toNumber(getFrontmatterValue(frontmatter, getFieldNames(plugin, 'contentStart')), NaN);
    if (Number.isFinite(noteContentStart)) return noteContentStart;

    const iconSize = toNumber(resolveField(plugin, 'iconSize', frontmatter, folderSpecific));
    const imageMultiplier = toNumber(resolveField(plugin, 'iconImageSizeMultiplier', frontmatter, folderSpecific), 1);
    const paddingY = toNumber(resolveField(plugin, 'iconPaddingY', frontmatter, folderSpecific));
    const verticalOffset = toNumber(resolveField(plugin, 'iconVerticalOffset', frontmatter, folderSpecific));
    const textVerticalOffset = toNumber(resolveField(plugin, 'iconTextVerticalOffset', frontmatter, folderSpecific));

    return ICON_ONLY_INSET_PX +
        iconSize * Math.max(1, imageMultiplier) +
        2 * paddingY +
        Math.max(0, verticalOffset) +
        Math.max(0, textVerticalOffset) +
        ICON_ONLY_GAP_PX;
}

// ----------------------------------
// -- hide embedded note banners --
// ----------------------------------
// Whether embedded notes drop their banner and icon header: a note's own value, the folder entry's,
// then the global setting
export function resolveHideEmbeddedBanners(plugin, frontmatter, folderSpecific) {
    return getFrontmatterValue(frontmatter, plugin?.settings?.customHideEmbeddedNoteBannersField) ||
        folderSpecific?.hideEmbeddedNoteBanners ||
        plugin?.settings?.hideEmbeddedNoteBanners || false;
}

// ----------------------
// -- banner max width --
// ----------------------
// A note's own value wins: 'readable', 'unset' or a pixel number. With none usable,
// the global Match readable line length toggle, then the Banner Max Width slider (issue #267).
// The maxWidth registry entry has no folderKey, so there is no folder value to read
export function resolveMaxWidth(plugin, frontmatter) {
    const noteValue = getFrontmatterValue(frontmatter, getFieldNames(plugin, 'maxWidth'));

    if (typeof noteValue === 'string') {
        const keyword = noteValue.trim().toLowerCase();
        if (keyword === 'readable') return 'readable';
        if (keyword === 'unset') return 'unset';

        const parsed = parseInt(noteValue, 10);
        if (Number.isFinite(parsed)) return parsed;
    } else if (typeof noteValue === 'number' && Number.isFinite(noteValue)) {
        return noteValue;
    }

    const settings = plugin?.settings;
    if (settings?.bannerMaxWidthReadable === true) return 'readable';
    if (Number.isFinite(settings?.bannerMaxWidth)) return settings.bannerMaxWidth;
    return 'unset';
}

// The --pixel-banner-max-width value for a resolveMaxWidth() result. The readable width
// variable exists only while Obsidian's Readable line length is on (styles.css), so
// 'readable' falls back to none, full width, when it is off
export function maxWidthCssValue(resolved) {
    if (resolved === 'readable') return 'var(--pixel-banner-readable-width, none)';
    if (typeof resolved === 'number') return `${resolved}px`;
    return 'unset';
}
