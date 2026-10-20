import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { addPixelBanner } from '@/core/bannerManager.js';
import { DEFAULT_SETTINGS } from '@/settings/settings.js';
import { PixelBannerPlugin } from '@/core/pixelBannerPlugin.js';
import { createMockApp, createMockManifest, TFile } from 'obsidian';

// The embedded-note branch of addPixelBanner sets the banner CSS variables on the
// embed's .markdown-preview-view. It used to read a fade setting key that does
// not exist (customBannerFadeField) and fall back to -75, so embeds ignored
// banner-fade.
//
// addPixelBanner is exported throttled (debounceAndSwallow, 350 ms on Date.now()),
// so each render moves the faked clock past the window.
let clock = Date.now() + 60000;

function createEmbed() {
    const embed = document.createElement('div');
    embed.classList.add('internal-embed', 'markdown-embed');
    const content = document.createElement('div');
    content.classList.add('markdown-embed-content');
    const preview = document.createElement('div');
    preview.classList.add('markdown-preview-view');
    const sizer = document.createElement('div');
    sizer.classList.add('markdown-preview-sizer');
    preview.appendChild(sizer);
    content.appendChild(preview);
    embed.appendChild(content);
    document.body.appendChild(embed);
    return { embed, preview };
}

describe('addPixelBanner in an embedded note', () => {
    let plugin;
    let folderSpecific;

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        clock += 1000;
        vi.setSystemTime(clock);
        document.body.innerHTML = '';
        folderSpecific = null;
        plugin = {
            settings: { ...DEFAULT_SETTINGS },
            getFolderSpecificImage: () => folderSpecific,
            applyContentStartPosition: vi.fn(),
            updateEmbeddedBannersVisibility: vi.fn()
        };
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    async function render(frontmatter) {
        const { embed, preview } = createEmbed();
        await addPixelBanner(plugin, embed, { frontmatter, file: { path: 'embedded.md' } });
        return name => preview.style.getPropertyValue(name);
    }

    it('applies the note\'s banner-fade', async () => {
        const prop = await render({ 'banner-fade': -10 });

        expect(prop('--pixel-banner-fade')).toBe('-10%');
    });

    it('falls back to the fade setting default when no fade is set anywhere', async () => {
        const prop = await render({});

        expect(prop('--pixel-banner-fade')).toBe(`${DEFAULT_SETTINGS.fade}%`);
        expect(prop('--pixel-banner-fade')).toBe('-40%');
    });

    // The branch read folderSpecific.bannerYPosition and settings.bannerXPosition,
    // neither of which exists
    it('applies the folder y position and the x position setting', async () => {
        folderSpecific = { yPosition: 20 };

        const prop = await render({});

        expect(prop('--pixel-banner-y-position')).toBe('20%');
        expect(prop('--pixel-banner-x-position')).toBe(`${DEFAULT_SETTINGS.xPosition}%`);
    });

    it('applies a folder entry\'s icon settings', async () => {
        folderSpecific = { bannerIconPaddingX: 4 };

        const prop = await render({});

        expect(prop('--pixel-banner-icon-padding-x')).toBe('4px');
    });

    // Readable banner width (issue #267): the same value as the pane banner
    it('writes the readable width for banner-max-width: readable', async () => {
        const prop = await render({ 'banner-max-width': 'readable' });

        expect(prop('--pixel-banner-max-width')).toBe('var(--pixel-banner-readable-width, none)');
    });

    it('writes the readable width when the global toggle is on', async () => {
        plugin.settings.bannerMaxWidthReadable = true;

        const prop = await render({});

        expect(prop('--pixel-banner-max-width')).toBe('var(--pixel-banner-readable-width, none)');
    });

    it('writes a note pixel value, and unset, as before', async () => {
        plugin.settings.bannerMaxWidthReadable = true;
        expect((await render({ 'banner-max-width': 800 }))('--pixel-banner-max-width')).toBe('800px');

        clock += 1000;
        vi.setSystemTime(clock);
        expect((await render({ 'banner-max-width': 'unset' }))('--pixel-banner-max-width')).toBe('unset');
    });
});


// Icon-only headers in embedded notes (issues #322, #238): the host's updateBanner() recurses into
// each embed with the embed element as the stand-in view's contentEl
describe('updateBanner for an embedded icon-only note', () => {
    let plugin;
    let mockApp;
    let embed;
    let previewView;
    let embedSizer;
    let frontmatter;
    let view;

    // 16 inset + 70 icon + 2 x 10 padding + 16 gap
    const ICON_ONLY_CONTENT_START = `${16 + 70 + 2 * 10 + 16}px`;

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});

        mockApp = createMockApp();
        plugin = new PixelBannerPlugin(mockApp, createMockManifest());
        vi.spyOn(plugin, 'loadData').mockResolvedValue({ ...DEFAULT_SETTINGS });
        await plugin.onload();

        frontmatter = {};
        mockApp.metadataCache.getFileCache = vi.fn(() => ({ frontmatter }));

        document.body.innerHTML = '';
        ({ embed, preview: previewView } = createEmbed());
        embedSizer = previewView.querySelector('.markdown-preview-sizer');
        view = { file: new TFile(`embedded-${Math.random()}.md`), contentEl: embed, getMode: () => 'preview' };
        mockApp.workspace.activeLeaf = { id: 'leaf-1', view };
        vi.spyOn(plugin, 'getImageUrl').mockResolvedValue(null);
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    async function runUpdate() {
        const done = plugin.updateBanner(view, true);
        await vi.advanceTimersByTimeAsync(300);
        return done;
    }

    const overlays = () => embedSizer.querySelectorAll(':scope > .banner-icon-overlay');

    it('gets the icon-only class, the icon variables, the content start and an overlay in its sizer', async () => {
        frontmatter = { icon: '🌟' };

        await runUpdate();

        expect(embed.classList.contains('pixel-banner-icon-only')).toBe(true);
        expect(embed.classList.contains('pixel-banner')).toBe(false);
        expect(previewView.style.getPropertyValue('--pixel-banner-icon-start')).toBe('16px');
        expect(previewView.style.getPropertyValue('--pixel-banner-icon-translate-y')).toBe('0%');
        expect(previewView.style.getPropertyValue('--pixel-banner-icon-size')).toBe('70px');
        expect(embed.style.getPropertyValue('--pixel-banner-content-start')).toBe(ICON_ONLY_CONTENT_START);
        expect(embed.style.getPropertyValue('--pixel-banner-embed-min-height')).toBe(ICON_ONLY_CONTENT_START);
        expect(overlays()).toHaveLength(1);
        expect(overlays()[0].textContent).toBe('🌟');
        expect(overlays()[0].hasAttribute('style')).toBe(false);
    });

    it('uses the note\'s own content start for the content start and the min height', async () => {
        frontmatter = { icon: '🌟', 'content-start': 90 };

        await runUpdate();

        expect(embed.style.getPropertyValue('--pixel-banner-content-start')).toBe('90px');
        expect(embed.style.getPropertyValue('--pixel-banner-embed-min-height')).toBe('90px');
    });

    it('falls back to the icon-only header when the banner path gives no image', async () => {
        frontmatter = { banner: 'missing/nowhere.png', icon: '🌟' };

        await runUpdate();

        expect(embed.classList.contains('pixel-banner-icon-only')).toBe(true);
        expect(embed.classList.contains('pixel-banner')).toBe(false);
        expect(embed.style.getPropertyValue('--pixel-banner-content-start')).toBe(ICON_ONLY_CONTENT_START);
        expect(overlays()).toHaveLength(1);
        embedSizer.querySelectorAll('.pixel-banner-image').forEach(banner => {
            expect(banner.style.display).toBe('none');
        });
    });

    it('keeps the 1% / 0 values and draws nothing when Hide embedded note banners is on', async () => {
        plugin.settings.hideEmbeddedNoteBanners = true;
        frontmatter = { icon: '🌟' };

        await runUpdate();

        expect(embed.classList.contains('pixel-banner-icon-only')).toBe(false);
        expect(embed.style.getPropertyValue('--pixel-banner-embed-min-height')).toBe('1%');
        expect(embed.style.getPropertyValue('--pixel-banner-content-start')).toBe('0');
        expect(overlays()).toHaveLength(0);
    });

    it('honours a folder entry\'s Hide embedded note banners', async () => {
        vi.spyOn(plugin, 'getFolderSpecificImage').mockReturnValue({ hideEmbeddedNoteBanners: true });
        frontmatter = { icon: '🌟' };

        await runUpdate();

        expect(embed.classList.contains('pixel-banner-icon-only')).toBe(false);
        expect(embed.style.getPropertyValue('--pixel-banner-embed-min-height')).toBe('1%');
        expect(overlays()).toHaveLength(0);
    });

    it('leaves an embedded note with neither banner nor icon unchanged', async () => {
        await runUpdate();

        expect(embed.classList.contains('pixel-banner-icon-only')).toBe(false);
        expect(embed.classList.contains('pixel-banner')).toBe(false);
        expect(embed.style.getPropertyValue('--pixel-banner-embed-min-height')).toBe('1%');
        expect(embed.style.getPropertyValue('--pixel-banner-content-start')).toBe('0');
        expect(previewView.style.getPropertyValue('--pixel-banner-icon-translate-y')).toBe('');
        expect(overlays()).toHaveLength(0);
    });

    // A banner render writes the content start and min height on the preview view as well
    it('replaces the spacing of a removed banner on the preview view with the icon-only height', async () => {
        vi.mocked(plugin.getImageUrl).mockResolvedValue('https://example.com/banner.jpg');
        frontmatter = { banner: 'https://example.com/banner.jpg', icon: '🌟' };
        await runUpdate();
        expect(previewView.style.getPropertyValue('--pixel-banner-embed-min-height')).not.toBe(ICON_ONLY_CONTENT_START);

        frontmatter = { icon: '🌟' };
        await runUpdate();

        expect(embed.classList.contains('pixel-banner-icon-only')).toBe(true);
        expect(previewView.style.getPropertyValue('--pixel-banner-content-start')).toBe(ICON_ONLY_CONTENT_START);
        expect(previewView.style.getPropertyValue('--pixel-banner-embed-min-height')).toBe(ICON_ONLY_CONTENT_START);
    });

    it('uses the icon-only height on the preview view when the banner path gives no image', async () => {
        frontmatter = { banner: 'missing/nowhere.png', icon: '🌟' };

        await runUpdate();

        expect(previewView.style.getPropertyValue('--pixel-banner-content-start')).toBe(ICON_ONLY_CONTENT_START);
        expect(previewView.style.getPropertyValue('--pixel-banner-embed-min-height')).toBe(ICON_ONLY_CONTENT_START);
    });

    it('drops the icon-only header when the icon is removed', async () => {
        frontmatter = { icon: '🌟' };
        await runUpdate();
        expect(embed.classList.contains('pixel-banner-icon-only')).toBe(true);

        frontmatter = {};
        await runUpdate();

        expect(embed.classList.contains('pixel-banner-icon-only')).toBe(false);
        expect(embed.style.getPropertyValue('--pixel-banner-embed-min-height')).toBe('1%');
        expect(overlays()).toHaveLength(0);
    });
});
