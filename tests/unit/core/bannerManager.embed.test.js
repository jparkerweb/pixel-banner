import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { addPixelBanner } from '@/core/bannerManager.js';
import { DEFAULT_SETTINGS } from '@/settings/settings.js';

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
});
