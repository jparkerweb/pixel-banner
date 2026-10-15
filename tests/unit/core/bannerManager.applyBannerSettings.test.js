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
});
