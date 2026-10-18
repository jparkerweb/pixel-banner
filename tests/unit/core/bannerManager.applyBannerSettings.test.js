import { describe, it, expect, beforeEach } from 'vitest';
import { applyBannerSettings } from '@/core/bannerManager.js';
import { DEFAULT_SETTINGS } from '@/settings/settings.js';

// The markdown post-processors (reading view, hover popovers) call addPixelBanner
// without bannerHeight, fade or borderRadius. applyBannerSettings resolves them
// itself instead of writing "undefinedpx", which is invalid at computed-value time
// and drops the CSS fallbacks.

describe('applyBannerSettings', () => {
    let plugin;
    let banner;
    let folderSpecific;

    beforeEach(() => {
        folderSpecific = null;
        plugin = {
            settings: { ...DEFAULT_SETTINGS },
            getFolderSpecificImage: () => folderSpecific
        };
        banner = document.createElement('div');
    });

    const prop = name => banner.style.getPropertyValue(name);

    it('falls back to the global settings when the context has no height, fade or radius', () => {
        applyBannerSettings(plugin, banner, { frontmatter: {}, file: { path: 'a.md' } }, false);

        expect(prop('--pixel-banner-height')).toBe(`${DEFAULT_SETTINGS.bannerHeight}px`);
        expect(prop('--pixel-banner-fade')).toBe(`${DEFAULT_SETTINGS.fade}%`);
        expect(prop('--pixel-banner-radius')).toBe(`${DEFAULT_SETTINGS.borderRadius}px`);
        expect(prop('--pixel-banner-icon-start')).not.toContain('NaN');
    });

    it('prefers frontmatter, then folder settings, over the global settings', () => {
        folderSpecific = { fade: -10, borderRadius: 4 };
        const frontmatter = { 'banner-height': 220 };

        applyBannerSettings(plugin, banner, { frontmatter, file: { path: 'a.md' } }, false);

        expect(prop('--pixel-banner-height')).toBe('220px');
        expect(prop('--pixel-banner-fade')).toBe('-10%');
        expect(prop('--pixel-banner-radius')).toBe('4px');
    });

    it('keeps values the caller resolved, including zero', () => {
        const ctx = { frontmatter: { 'banner-height': 220 }, file: { path: 'a.md' }, bannerHeight: 120, fade: 0, borderRadius: 0 };

        applyBannerSettings(plugin, banner, ctx, false);

        expect(prop('--pixel-banner-height')).toBe('120px');
        expect(prop('--pixel-banner-fade')).toBe('0%');
        expect(prop('--pixel-banner-radius')).toBe('0px');
    });

    // Field values come from resolveField: 0 is a real value, while null,
    // undefined and '' fall through to the next step
    it('keeps a frontmatter icon-opacity of 0 instead of the setting', () => {
        plugin.settings.bannerIconOpacity = 80;

        applyBannerSettings(plugin, banner, { frontmatter: { 'icon-opacity': 0 }, file: { path: 'a.md' } }, false);

        expect(prop('--pixel-banner-icon-opacity')).toBe('0%');
    });

    it('falls through an empty banner-fade to the folder fade', () => {
        folderSpecific = { fade: -15 };

        applyBannerSettings(plugin, banner, { frontmatter: { 'banner-fade': '' }, file: { path: 'a.md' } }, false);

        expect(prop('--pixel-banner-fade')).toBe('-15%');
    });

    it('applies a folder entry\'s icon settings', () => {
        folderSpecific = { bannerIconPaddingX: 4, bannerIconSize: 40 };

        applyBannerSettings(plugin, banner, { frontmatter: {}, file: { path: 'a.md' } }, false);

        expect(prop('--pixel-banner-icon-padding-x')).toBe('4px');
        expect(prop('--pixel-banner-icon-size')).toBe('40px');
    });

    it('uses the theme text colour when the icon colour setting is empty', () => {
        plugin.settings.bannerIconColor = '';

        applyBannerSettings(plugin, banner, { frontmatter: {}, file: { path: 'a.md' } }, false);

        expect(prop('--pixel-banner-icon-color')).toBe('var(--text-normal)');
    });

    // Popover Banner Max Height (issue #342): a cap on hover popovers only
    describe('in a hover popover', () => {
        let popover;

        beforeEach(() => {
            popover = document.createElement('div');
            popover.className = 'popover hover-popover';
            popover.appendChild(banner);
        });

        it('caps a taller banner at the popover max height', () => {
            applyBannerSettings(plugin, banner, { frontmatter: {}, file: { path: 'a.md' } }, false);

            expect(prop('--pixel-banner-height')).toBe(`${DEFAULT_SETTINGS.popoverBannerMaxHeight}px`);
            expect(prop('--pixel-banner-icon-start')).not.toContain('NaN');
        });

        it('leaves a banner shorter than the cap alone', () => {
            applyBannerSettings(plugin, banner, { frontmatter: { 'banner-height': 90 }, file: { path: 'a.md' } }, false);

            expect(prop('--pixel-banner-height')).toBe('90px');
        });

        it('follows the setting, and a cap of 0 collapses the banner', () => {
            plugin.settings.popoverBannerMaxHeight = 0;

            applyBannerSettings(plugin, banner, { frontmatter: {}, file: { path: 'a.md' } }, false);

            expect(prop('--pixel-banner-height')).toBe('0px');
        });

        it('does not cap a banner outside a popover', () => {
            popover.removeChild(banner);

            applyBannerSettings(plugin, banner, { frontmatter: {}, file: { path: 'a.md' } }, false);

            expect(prop('--pixel-banner-height')).toBe(`${DEFAULT_SETTINGS.bannerHeight}px`);
        });
    });
});
