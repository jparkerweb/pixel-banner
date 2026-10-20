import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
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

    // The icon variables as applyBannerSettings wrote them before they moved to
    // getIconLayoutVars (issues #322, #238): banner notes with icons must look the same
    describe('icon variables', () => {
        const iconProps = el => Object.fromEntries(
            Array.from(el.style)
                .filter(name => name.startsWith('--pixel-banner-icon-') && name !== '--pixel-banner-icon-translate-y')
                .map(name => [name, el.style.getPropertyValue(name)])
        );
        const render = frontmatter => applyBannerSettings(plugin, banner, { frontmatter, file: { path: 'a.md' } }, false);

        it('writes a full set of note icon fields', () => {
            render({
                'banner-height': 300,
                'icon-size': 50,
                'icon-x': 20,
                'icon-opacity': 80,
                'icon-color': '#ff0000',
                'icon-font-weight': 'bold',
                'icon-bg-color': 'rgba(0, 0, 0, 0.5)',
                'icon-padding-x': 6,
                'icon-padding-y': 4,
                'icon-border-radius': 8,
                'icon-y': 12,
                'icon-rotate': 15,
                'icon-image-size-multiplier': 1.5,
                'icon-text-vertical-offset': -3
            });

            expect(iconProps(banner)).toEqual({
                '--pixel-banner-icon-size': '50px',
                '--pixel-banner-icon-start': '275px',
                '--pixel-banner-icon-x': '20%',
                '--pixel-banner-icon-opacity': '80%',
                '--pixel-banner-icon-color': '#ff0000',
                '--pixel-banner-icon-font-weight': 'bold',
                '--pixel-banner-icon-background-color': 'rgba(0, 0, 0, 0.5)',
                '--pixel-banner-icon-padding-x': '6px',
                '--pixel-banner-icon-padding-y': '4px',
                '--pixel-banner-icon-border-radius': '8px',
                '--pixel-banner-icon-vertical-offset': '12px',
                '--pixel-banner-icon-rotate': '15deg',
                '--pixel-banner-icon-image-size-multiplier': '1.5em',
                '--pixel-banner-icon-text-vertical-offset': '-3px'
            });
        });

        it('writes the defaults for a note with no icon fields', () => {
            render({});

            expect(iconProps(banner)).toEqual({
                '--pixel-banner-icon-size': '70px',
                '--pixel-banner-icon-start': '315px',
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

        it('writes the folder icon size, colour and padding', () => {
            folderSpecific = { bannerIconSize: 40, bannerIconColor: '#00ff00', bannerIconPaddingX: 4, bannerIconPaddingY: 2 };

            render({});

            expect(iconProps(banner)).toEqual({
                '--pixel-banner-icon-size': '40px',
                '--pixel-banner-icon-start': '330px',
                '--pixel-banner-icon-x': '75%',
                '--pixel-banner-icon-opacity': '100%',
                '--pixel-banner-icon-color': '#00ff00',
                '--pixel-banner-icon-font-weight': 'normal',
                '--pixel-banner-icon-background-color': 'transparent',
                '--pixel-banner-icon-padding-x': '4px',
                '--pixel-banner-icon-padding-y': '2px',
                '--pixel-banner-icon-border-radius': '17px',
                '--pixel-banner-icon-vertical-offset': '0px',
                '--pixel-banner-icon-rotate': '0deg',
                '--pixel-banner-icon-image-size-multiplier': '1em',
                '--pixel-banner-icon-text-vertical-offset': '0px'
            });
        });

        it('lifts the icon by 15% of its height, as the overlay rule always did', () => {
            render({});

            expect(prop('--pixel-banner-icon-translate-y')).toBe('-15%');
        });

        it('writes the same values on the banner and its view', () => {
            const view = document.createElement('div');
            view.className = 'markdown-preview-view';
            view.appendChild(banner);

            render({ 'icon-size': 50 });

            expect(iconProps(view)).toEqual(iconProps(banner));
        });
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

    // Readable banner width (issue #267)
    describe('max width', () => {
        const READABLE = 'var(--pixel-banner-readable-width, none)';
        const render = frontmatter => applyBannerSettings(plugin, banner, { frontmatter, file: { path: 'a.md' } }, false);

        it('writes the readable width for banner-max-width: readable', () => {
            plugin.settings.bannerMaxWidth = 900;

            render({ 'banner-max-width': 'readable' });

            expect(prop('--pixel-banner-max-width')).toBe(READABLE);
        });

        it('writes the readable width when the global toggle is on', () => {
            plugin.settings.bannerMaxWidthReadable = true;

            render({});

            expect(prop('--pixel-banner-max-width')).toBe(READABLE);
        });

        it('writes numbers in pixels, a note value winning over the toggle', () => {
            render({});
            expect(prop('--pixel-banner-max-width')).toBe(`${DEFAULT_SETTINGS.bannerMaxWidth}px`);

            plugin.settings.bannerMaxWidthReadable = true;
            render({ 'banner-max-width': 800 });
            expect(prop('--pixel-banner-max-width')).toBe('800px');
        });

        it('writes unset for banner-max-width: unset', () => {
            plugin.settings.bannerMaxWidthReadable = true;

            render({ 'banner-max-width': 'unset' });

            expect(prop('--pixel-banner-max-width')).toBe('unset');
        });

        // happy-dom applies no stylesheet, so this is the only automated check of the CSS half
        it('has the CSS rule that defines the readable width', () => {
            const css = fs.readFileSync(path.resolve(process.cwd(), 'styles.css'), 'utf-8');

            expect(css).toMatch(/\.markdown-preview-view\.is-readable-line-width,\s*\.markdown-source-view\.is-readable-line-width\s*\{\s*--pixel-banner-readable-width:\s*var\(--file-line-width\);\s*\}/);
        });
    });

    // Animate banner position changes (issue #226)
    describe('position animation switch', () => {
        const ctx = { frontmatter: {}, file: { path: 'a.md' } };
        const NO_TRANSITION = 'pixel-banner-no-position-transition';

        // Uses the real DEFAULT_SETTINGS: existing users must see the slide on
        it('slides by default', () => {
            expect(DEFAULT_SETTINGS.bannerPositionTransition).toBe(true);

            applyBannerSettings(plugin, banner, ctx, false);

            expect(banner.classList.contains(NO_TRANSITION)).toBe(false);
        });

        it('adds the no-transition class when the setting is off', () => {
            plugin.settings.bannerPositionTransition = false;

            applyBannerSettings(plugin, banner, ctx, false);

            expect(banner.classList.contains(NO_TRANSITION)).toBe(true);
        });

        it('leaves the class off when the setting is on', () => {
            plugin.settings.bannerPositionTransition = true;

            applyBannerSettings(plugin, banner, ctx, false);

            expect(banner.classList.contains(NO_TRANSITION)).toBe(false);
        });

        it('leaves the class off for old settings without the key', () => {
            delete plugin.settings.bannerPositionTransition;

            applyBannerSettings(plugin, banner, ctx, false);

            expect(banner.classList.contains(NO_TRANSITION)).toBe(false);
        });

        it('removes the class when the setting is turned back on', () => {
            plugin.settings.bannerPositionTransition = false;
            applyBannerSettings(plugin, banner, ctx, false);

            plugin.settings.bannerPositionTransition = true;
            applyBannerSettings(plugin, banner, ctx, false);

            expect(banner.classList.contains(NO_TRANSITION)).toBe(false);
        });

        // happy-dom applies no stylesheet, so this is the only automated check of the CSS half
        it('has the CSS rules that switch the slide off', () => {
            const css = fs.readFileSync(path.resolve(process.cwd(), 'styles.css'), 'utf-8');

            expect(css).toMatch(/\.pixel-banner-image\.pixel-banner-no-position-transition\s*\{\s*transition:\s*none;\s*\}/);
            expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.pixel-banner-image\s*\{\s*transition:\s*none;\s*\}\s*\}/);
        });
    });
});
