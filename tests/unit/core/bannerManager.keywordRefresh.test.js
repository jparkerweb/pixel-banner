import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { addPixelBanner } from '@/core/bannerManager.js';
import { DEFAULT_SETTINGS } from '@/settings/settings.js';

// The refresh icon of a keyword banner fetches a new image, and a video result
// replaces the banner's <video>. That builder hard-coded objectFit 'cover', so a
// refreshed video ignored Image Display (banner-display).
//
// addPixelBanner is exported throttled (debounceAndSwallow, 350 ms on Date.now()),
// so each render moves the faked clock past the window.
let clock = Date.now() + 60000;

function createView() {
    const view = document.createElement('div');
    view.classList.add('view-content');
    const source = document.createElement('div');
    source.classList.add('markdown-source-view');
    const sizer = document.createElement('div');
    sizer.classList.add('cm-sizer');
    source.appendChild(sizer);
    view.appendChild(source);
    document.body.appendChild(view);
    return { view, sizer };
}

describe('addPixelBanner keyword refresh', () => {
    let plugin;

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        clock += 1000;
        vi.setSystemTime(clock);
        vi.spyOn(console, 'log').mockImplementation(() => {});
        document.body.innerHTML = '';
        plugin = {
            settings: { ...DEFAULT_SETTINGS, showPinIcon: true, showRefreshIcon: true, showSelectImageIcon: false },
            app: { workspace: { getActiveFile: () => null } },
            UPDATE_MODE: { FULL_UPDATE: 'FULL_UPDATE', ENSURE_VISIBILITY: 'ENSURE_VISIBILITY' },
            loadedImages: new Map(),
            lastKeywords: new Map(),
            getFolderSpecificImage: () => null,
            getInputType: () => 'keyword',
            getImageUrl: vi.fn(),
            hasBannerFrontmatter: () => true,
            applyBannerSettings: vi.fn(),
            applyContentStartPosition: vi.fn(),
            applyBannerWidth: vi.fn(),
            setupResizeObserver: vi.fn(),
            updateEmbeddedBannersVisibility: vi.fn()
        };
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('fits a refreshed video with the note\'s banner-display', async () => {
        const frontmatter = { banner: 'mountains', 'banner-display': 'contain' };
        const { view, sizer } = createView();
        plugin.getImageUrl
            .mockResolvedValueOnce('https://example.com/first.jpg')
            .mockResolvedValueOnce({ url: 'https://example.com/clip.mp4', isVideo: true });

        await addPixelBanner(plugin, view, { frontmatter, file: { path: 'note.md' }, bannerImage: 'mountains' });

        const refreshIcon = sizer.querySelector(':scope > .refresh-icon');
        expect(refreshIcon).not.toBeNull();
        await refreshIcon.onclick();

        const video = sizer.querySelector(':scope > .pixel-banner-image video.pixel-banner-video');
        expect(video).not.toBeNull();
        expect(video.style.objectFit).toBe('contain');
    });
});
