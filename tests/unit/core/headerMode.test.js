import { describe, it, expect, beforeEach } from 'vitest';
import {
    resolveHideEmbeddedBanners,
    resolveMaxWidth,
    maxWidthCssValue,
    getHeaderMode,
    getIconLayoutVars,
    getIconOnlyContentStart,
    ICON_ONLY_INSET_PX,
    ICON_ONLY_GAP_PX
} from '@/core/headerMode.js';
import { DEFAULT_SETTINGS } from '@/settings/settings.js';

// Banner max width (issue #267): a note's own value wins, then the global
// Match readable line length toggle, then the Banner Max Width slider

describe('resolveMaxWidth', () => {
    let plugin;

    beforeEach(() => {
        plugin = { settings: { ...DEFAULT_SETTINGS } };
    });

    // Uses the real DEFAULT_SETTINGS: users who never touch the option see no change
    it('is off by default, so the slider value applies', () => {
        expect(DEFAULT_SETTINGS.bannerMaxWidthReadable).toBe(false);

        expect(resolveMaxWidth(plugin, {})).toBe(DEFAULT_SETTINGS.bannerMaxWidth);
    });

    it('returns a note number', () => {
        plugin.settings.bannerMaxWidthReadable = true;

        expect(resolveMaxWidth(plugin, { 'banner-max-width': 800 })).toBe(800);
    });

    it('returns a note numeric string as a number', () => {
        expect(resolveMaxWidth(plugin, { 'banner-max-width': '640' })).toBe(640);
        expect(resolveMaxWidth(plugin, { 'banner-max-width': ' 720px' })).toBe(720);
    });

    it('returns readable for a note value in any case and with spaces', () => {
        plugin.settings.bannerMaxWidth = 900;

        expect(resolveMaxWidth(plugin, { 'banner-max-width': 'readable' })).toBe('readable');
        expect(resolveMaxWidth(plugin, { 'banner-max-width': 'Readable' })).toBe('readable');
        expect(resolveMaxWidth(plugin, { 'banner-max-width': '  READABLE ' })).toBe('readable');
    });

    it('returns unset for a note unset in any case, even with the toggle on', () => {
        plugin.settings.bannerMaxWidthReadable = true;

        expect(resolveMaxWidth(plugin, { 'banner-max-width': 'unset' })).toBe('unset');
        expect(resolveMaxWidth(plugin, { 'banner-max-width': 'UNSET' })).toBe('unset');
    });

    it('falls through a garbage note value to the settings', () => {
        plugin.settings.bannerMaxWidth = 1200;
        expect(resolveMaxWidth(plugin, { 'banner-max-width': 'wide' })).toBe(1200);
        expect(resolveMaxWidth(plugin, { 'banner-max-width': '' })).toBe(1200);
        expect(resolveMaxWidth(plugin, { 'banner-max-width': true })).toBe(1200);
        expect(resolveMaxWidth(plugin, { 'banner-max-width': null })).toBe(1200);

        plugin.settings.bannerMaxWidthReadable = true;
        expect(resolveMaxWidth(plugin, { 'banner-max-width': 'wide' })).toBe('readable');
    });

    it('reads the custom field names', () => {
        plugin.settings.customBannerMaxWidthField = ['width, banner-width'];

        expect(resolveMaxWidth(plugin, { 'banner-width': 'readable' })).toBe('readable');
        expect(resolveMaxWidth(plugin, { 'banner-max-width': 500 })).toBe(DEFAULT_SETTINGS.bannerMaxWidth);
    });

    it('returns readable when the global toggle is on and the note has no value', () => {
        plugin.settings.bannerMaxWidthReadable = true;

        expect(resolveMaxWidth(plugin, {})).toBe('readable');
        expect(resolveMaxWidth(plugin, null)).toBe('readable');
    });

    it('returns the global pixel value when the toggle is off', () => {
        plugin.settings.bannerMaxWidth = 1500;

        expect(resolveMaxWidth(plugin, {})).toBe(1500);
    });

    it('returns unset when the settings have no usable value', () => {
        expect(resolveMaxWidth({ settings: {} }, {})).toBe('unset');
        expect(resolveMaxWidth({ settings: { bannerMaxWidth: 'wide' } }, {})).toBe('unset');
        expect(resolveMaxWidth({}, {})).toBe('unset');
    });
});

describe('maxWidthCssValue', () => {
    it('points readable at the readable width variable, falling back to none', () => {
        expect(maxWidthCssValue('readable')).toBe('var(--pixel-banner-readable-width, none)');
    });

    it('writes a number in pixels', () => {
        expect(maxWidthCssValue(800)).toBe('800px');
        expect(maxWidthCssValue(0)).toBe('0px');
    });

    it('writes unset for anything else', () => {
        expect(maxWidthCssValue('unset')).toBe('unset');
        expect(maxWidthCssValue(undefined)).toBe('unset');
        expect(maxWidthCssValue('wide')).toBe('unset');
    });
});

// Header mode (issues #322, #238): a banner shows whenever there is a banner source, unless
// the image failed and there is an icon to fall back to; otherwise an icon shows on its own.
// Whitespace-only icon text counts as no icon

describe('getHeaderMode', () => {
    const icons = {
        'no icon': { icon: undefined, iconImage: undefined },
        'an icon': { icon: '🌿', iconImage: undefined },
        'an icon image': { icon: undefined, iconImage: 'icons/leaf.png' },
        'both an icon and an icon image': { icon: '🌿', iconImage: 'icons/leaf.png' },
        'whitespace-only icon and icon image': { icon: '   ', iconImage: '\t\n' }
    };

    it.each([
        // banner source, image loaded: always the banner
        { hasBannerSource: true, imageFailed: false, iconCase: 'no icon', expected: 'banner' },
        { hasBannerSource: true, imageFailed: false, iconCase: 'an icon', expected: 'banner' },
        { hasBannerSource: true, imageFailed: false, iconCase: 'an icon image', expected: 'banner' },
        { hasBannerSource: true, imageFailed: false, iconCase: 'both an icon and an icon image', expected: 'banner' },
        { hasBannerSource: true, imageFailed: false, iconCase: 'whitespace-only icon and icon image', expected: 'banner' },
        // banner source, image failed: falls back to the icon when there is one
        { hasBannerSource: true, imageFailed: true, iconCase: 'no icon', expected: 'banner' },
        { hasBannerSource: true, imageFailed: true, iconCase: 'an icon', expected: 'icon-only' },
        { hasBannerSource: true, imageFailed: true, iconCase: 'an icon image', expected: 'icon-only' },
        { hasBannerSource: true, imageFailed: true, iconCase: 'both an icon and an icon image', expected: 'icon-only' },
        { hasBannerSource: true, imageFailed: true, iconCase: 'whitespace-only icon and icon image', expected: 'banner' },
        // no banner source: the icon alone, or nothing
        { hasBannerSource: false, imageFailed: false, iconCase: 'no icon', expected: 'none' },
        { hasBannerSource: false, imageFailed: false, iconCase: 'an icon', expected: 'icon-only' },
        { hasBannerSource: false, imageFailed: false, iconCase: 'an icon image', expected: 'icon-only' },
        { hasBannerSource: false, imageFailed: false, iconCase: 'both an icon and an icon image', expected: 'icon-only' },
        { hasBannerSource: false, imageFailed: false, iconCase: 'whitespace-only icon and icon image', expected: 'none' },
        { hasBannerSource: false, imageFailed: true, iconCase: 'no icon', expected: 'none' },
        { hasBannerSource: false, imageFailed: true, iconCase: 'an icon', expected: 'icon-only' },
        { hasBannerSource: false, imageFailed: true, iconCase: 'an icon image', expected: 'icon-only' },
        { hasBannerSource: false, imageFailed: true, iconCase: 'both an icon and an icon image', expected: 'icon-only' },
        { hasBannerSource: false, imageFailed: true, iconCase: 'whitespace-only icon and icon image', expected: 'none' }
    ])('banner source $hasBannerSource, image failed $imageFailed, $iconCase: $expected', ({ hasBannerSource, imageFailed, iconCase, expected }) => {
        expect(getHeaderMode({ hasBannerSource, imageFailed, ...icons[iconCase] })).toBe(expected);
    });

    it('treats empty strings and non-string values as no icon', () => {
        expect(getHeaderMode({ hasBannerSource: false, imageFailed: false, icon: '', iconImage: '' })).toBe('none');
        expect(getHeaderMode({ hasBannerSource: false, imageFailed: false, icon: null, iconImage: 42 })).toBe('none');
        expect(getHeaderMode({ hasBannerSource: true, imageFailed: true, icon: '', iconImage: null })).toBe('banner');
    });
});

// Icon layout variables: banner mode straddles the icon across the banner's bottom edge,
// icon-only mode insets it from the top of the note. Each value comes from the note, then
// the folder, then the settings

describe('getIconLayoutVars', () => {
    let plugin;

    beforeEach(() => {
        plugin = { settings: { ...DEFAULT_SETTINGS } };
    });

    it('writes every variable from the defaults in banner mode', () => {
        expect(getIconLayoutVars(plugin, {}, null, { mode: 'banner', bannerHeight: 350 })).toEqual({
            '--pixel-banner-icon-size': '70px',
            '--pixel-banner-icon-start': `${350 - 70 / 2}px`,
            '--pixel-banner-icon-translate-y': '-15%',
            '--pixel-banner-icon-x': '75%',
            '--pixel-banner-icon-opacity': '100%',
            '--pixel-banner-icon-color': 'var(--text-normal)',
            '--pixel-banner-icon-font-weight': 'normal',
            '--pixel-banner-icon-background-color': 'transparent',
            '--pixel-banner-icon-padding-x': '10px',
            '--pixel-banner-icon-padding-y': '10px',
            '--pixel-banner-icon-border-radius': '17px',
            '--pixel-banner-icon-vertical-offset': '0px',
            '--pixel-banner-icon-rotate': '0deg',
            '--pixel-banner-icon-image-size-multiplier': '1em',
            '--pixel-banner-icon-text-vertical-offset': '0px'
        });
    });

    it('starts the icon half its size above the banner bottom in banner mode', () => {
        const vars = getIconLayoutVars(plugin, { 'icon-size': 100 }, null, { mode: 'banner', bannerHeight: 400 });

        expect(vars['--pixel-banner-icon-start']).toBe(`${400 - 100 / 2}px`);
        expect(vars['--pixel-banner-icon-translate-y']).toBe('-15%');
    });

    it('insets the icon from the top with no translate in icon-only mode', () => {
        const vars = getIconLayoutVars(plugin, { 'icon-size': 100 }, null, { mode: 'icon-only', bannerHeight: 400 });

        expect(ICON_ONLY_INSET_PX).toBe(16);
        expect(vars['--pixel-banner-icon-start']).toBe(`${ICON_ONLY_INSET_PX}px`);
        expect(vars['--pixel-banner-icon-start']).toBe('16px');
        expect(vars['--pixel-banner-icon-translate-y']).toBe('0%');
        expect(vars['--pixel-banner-icon-size']).toBe('100px');
    });

    it('formats every note value with its unit', () => {
        const frontmatter = {
            'icon-size': 48,
            'icon-x': 20,
            'icon-opacity': 60,
            'icon-color': '#ff0000',
            'icon-font-weight': 'bold',
            'icon-bg-color': 'rgba(0, 0, 0, 0.5)',
            'icon-padding-x': 6,
            'icon-padding-y': 4,
            'icon-border-radius': 8,
            'icon-y': -12,
            'icon-rotate': 15,
            'icon-image-size-multiplier': 1.5,
            'icon-text-vertical-offset': 3
        };

        const vars = getIconLayoutVars(plugin, frontmatter, null, { mode: 'icon-only', bannerHeight: 350 });

        expect(vars).toMatchObject({
            '--pixel-banner-icon-size': '48px',
            '--pixel-banner-icon-x': '20%',
            '--pixel-banner-icon-opacity': '60%',
            '--pixel-banner-icon-color': '#ff0000',
            '--pixel-banner-icon-font-weight': 'bold',
            '--pixel-banner-icon-background-color': 'rgba(0, 0, 0, 0.5)',
            '--pixel-banner-icon-padding-x': '6px',
            '--pixel-banner-icon-padding-y': '4px',
            '--pixel-banner-icon-border-radius': '8px',
            '--pixel-banner-icon-vertical-offset': '-12px',
            '--pixel-banner-icon-rotate': '15deg',
            '--pixel-banner-icon-image-size-multiplier': '1.5em',
            '--pixel-banner-icon-text-vertical-offset': '3px'
        });
    });

    it('writes transparent when no background color is set anywhere', () => {
        plugin.settings.bannerIconBackgroundColor = '';

        const vars = getIconLayoutVars(plugin, { 'icon-bg-color': '' }, { bannerIconBackgroundColor: null }, { mode: 'banner', bannerHeight: 350 });

        expect(vars['--pixel-banner-icon-background-color']).toBe('transparent');
    });

    it('uses folder values over the settings', () => {
        plugin.settings.bannerIconSize = 50;
        plugin.settings.bannerIconColor = 'blue';
        plugin.settings.bannerIconPaddingY = '2';

        const folder = {
            bannerIconSize: 80,
            bannerIconXPosition: 30,
            bannerIconOpacity: 90,
            bannerIconColor: 'green',
            bannerIconFontWeight: 'lighter',
            bannerIconBackgroundColor: 'black',
            bannerIconPaddingX: 7,
            bannerIconPaddingY: 9,
            bannerIconBorderRadius: 3,
            bannerIconVerticalOffset: 5
        };

        const vars = getIconLayoutVars(plugin, {}, folder, { mode: 'banner', bannerHeight: 300 });

        expect(vars).toMatchObject({
            '--pixel-banner-icon-size': '80px',
            '--pixel-banner-icon-start': `${300 - 80 / 2}px`,
            '--pixel-banner-icon-x': '30%',
            '--pixel-banner-icon-opacity': '90%',
            '--pixel-banner-icon-color': 'green',
            '--pixel-banner-icon-font-weight': 'lighter',
            '--pixel-banner-icon-background-color': 'black',
            '--pixel-banner-icon-padding-x': '7px',
            '--pixel-banner-icon-padding-y': '9px',
            '--pixel-banner-icon-border-radius': '3px',
            '--pixel-banner-icon-vertical-offset': '5px'
        });
    });

    it('uses note values over folder values', () => {
        const folder = {
            bannerIconSize: 80,
            bannerIconXPosition: 30,
            bannerIconColor: 'green',
            bannerIconBackgroundColor: 'black',
            bannerIconPaddingY: 9,
            bannerIconVerticalOffset: 5
        };
        const frontmatter = {
            'icon-size': 40,
            'icon-x': 10,
            'icon-color': 'red',
            'icon-bg-color': 'white',
            'icon-padding-y': 1,
            'icon-y': 2
        };

        const vars = getIconLayoutVars(plugin, frontmatter, folder, { mode: 'banner', bannerHeight: 300 });

        expect(vars).toMatchObject({
            '--pixel-banner-icon-size': '40px',
            '--pixel-banner-icon-start': `${300 - 40 / 2}px`,
            '--pixel-banner-icon-x': '10%',
            '--pixel-banner-icon-color': 'red',
            '--pixel-banner-icon-background-color': 'white',
            '--pixel-banner-icon-padding-y': '1px',
            '--pixel-banner-icon-vertical-offset': '2px'
        });
    });

    it('falls through empty note values to the folder value', () => {
        const vars = getIconLayoutVars(plugin, { 'icon-size': '', 'icon-color': null }, { bannerIconSize: 80, bannerIconColor: 'green' }, { mode: 'icon-only', bannerHeight: 300 });

        expect(vars['--pixel-banner-icon-size']).toBe('80px');
        expect(vars['--pixel-banner-icon-color']).toBe('green');
    });
});

// Icon-only content start: a note's own content-start wins outright; otherwise the inset,
// the overlay's height (icon size times the image multiplier when larger than 1, plus
// vertical padding and any downward offsets) and the gap below the icon

describe('getIconOnlyContentStart', () => {
    let plugin;

    beforeEach(() => {
        plugin = { settings: { ...DEFAULT_SETTINGS } };
    });

    it('uses an inset and gap of 16px', () => {
        expect(ICON_ONLY_INSET_PX).toBe(16);
        expect(ICON_ONLY_GAP_PX).toBe(16);
    });

    it('fits an emoji icon with the default settings', () => {
        expect(getIconOnlyContentStart(plugin, { icon: '🌿' }, null)).toBe(16 + 70 + 2 * 10 + 16);
    });

    it('scales the icon by an image multiplier of 1.5', () => {
        expect(getIconOnlyContentStart(plugin, { 'icon-image-size-multiplier': 1.5 }, null)).toBe(16 + 70 * 1.5 + 2 * 10 + 16);
    });

    it('never shrinks below the icon size for a multiplier under 1', () => {
        expect(getIconOnlyContentStart(plugin, { 'icon-image-size-multiplier': 0.5 }, null)).toBe(16 + 70 + 2 * 10 + 16);
    });

    it('adds the vertical padding on both sides', () => {
        expect(getIconOnlyContentStart(plugin, { 'icon-padding-y': 4 }, null)).toBe(16 + 70 + 2 * 4 + 16);
        expect(getIconOnlyContentStart(plugin, { 'icon-padding-y': '0' }, null)).toBe(16 + 70 + 2 * 0 + 16);
    });

    it('ignores negative offsets', () => {
        expect(getIconOnlyContentStart(plugin, { 'icon-y': -20, 'icon-text-vertical-offset': -5 }, null)).toBe(16 + 70 + 2 * 10 + 16);
    });

    it('adds positive offsets', () => {
        expect(getIconOnlyContentStart(plugin, { 'icon-y': 12, 'icon-text-vertical-offset': 6 }, null)).toBe(16 + 70 + 2 * 10 + 12 + 6 + 16);
        expect(getIconOnlyContentStart(plugin, { 'icon-y': '8' }, null)).toBe(16 + 70 + 2 * 10 + 8 + 16);
    });

    it('uses folder values over the settings', () => {
        const folder = { bannerIconSize: 90, bannerIconPaddingY: 5, bannerIconVerticalOffset: 8 };

        expect(getIconOnlyContentStart(plugin, {}, folder)).toBe(16 + 90 + 2 * 5 + 8 + 16);
    });

    it('uses note values over folder values', () => {
        const folder = { bannerIconSize: 90, bannerIconPaddingY: 5, bannerIconVerticalOffset: 8 };

        expect(getIconOnlyContentStart(plugin, { 'icon-size': 50, 'icon-padding-y': 2, 'icon-y': 0 }, folder)).toBe(16 + 50 + 2 * 2 + 0 + 16);
    });

    it('returns a note content-start outright', () => {
        const frontmatter = { 'content-start': 200, 'icon-size': 120, 'icon-padding-y': 30 };

        expect(getIconOnlyContentStart(plugin, frontmatter, { bannerIconSize: 90 })).toBe(200);
        expect(getIconOnlyContentStart(plugin, { 'content-start': '120' }, null)).toBe(120);
        expect(getIconOnlyContentStart(plugin, { 'content-start': 0 }, null)).toBe(0);
    });

    it('falls back to the overlay height for an unusable note content-start', () => {
        expect(getIconOnlyContentStart(plugin, { 'content-start': 'high' }, null)).toBe(16 + 70 + 2 * 10 + 16);
        expect(getIconOnlyContentStart(plugin, { 'content-start': '' }, null)).toBe(16 + 70 + 2 * 10 + 16);
    });

    it('does not consult the global or folder Content Start', () => {
        plugin.settings.contentStartPosition = 500;

        expect(getIconOnlyContentStart(plugin, {}, { contentStartPosition: 400 })).toBe(16 + 70 + 2 * 10 + 16);
    });

    it('reads custom content-start field names', () => {
        plugin.settings.customContentStartField = ['start, content-top'];

        expect(getIconOnlyContentStart(plugin, { 'content-top': 150 }, null)).toBe(150);
    });
});

describe('resolveHideEmbeddedBanners', () => {
    const plugin = hide => ({ settings: { ...DEFAULT_SETTINGS, hideEmbeddedNoteBanners: hide } });

    it('follows the global setting', () => {
        expect(resolveHideEmbeddedBanners(plugin(true), {}, null)).toBe(true);
        expect(resolveHideEmbeddedBanners(plugin(false), {}, null)).toBe(false);
    });

    it('lets a folder entry turn it on', () => {
        expect(resolveHideEmbeddedBanners(plugin(false), {}, { hideEmbeddedNoteBanners: true })).toBe(true);
    });

    it('reads a note value when the setting names a field', () => {
        const p = plugin(false);
        p.settings.customHideEmbeddedNoteBannersField = ['hide-embeds'];
        expect(resolveHideEmbeddedBanners(p, { 'hide-embeds': true }, null)).toBe(true);
    });
});
