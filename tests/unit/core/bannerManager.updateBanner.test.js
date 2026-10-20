import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PixelBannerPlugin } from '@/core/pixelBannerPlugin.js';
import { createMockApp, createMockManifest, MarkdownView, TFile } from 'obsidian';
import { DEFAULT_SETTINGS } from '@/settings/settings.js';
import { getVaultImageUrl, isVaultImageBlobUrl, releaseAllVaultImageUrls } from '@/core/bannerUtils.js';

// A pane can move to another note while updateBanner waits for the banner image.
// The superseded update must stop there: carrying on drew the old note's icon
// on the new note's banner.

function createBannerContainer() {
    const container = document.createElement('div');
    container.classList.add('view-content');
    const sourceView = document.createElement('div');
    sourceView.classList.add('markdown-source-view');
    const cmSizer = document.createElement('div');
    cmSizer.classList.add('cm-sizer');
    sourceView.appendChild(cmSizer);
    container.appendChild(sourceView);
    return container;
}

describe('updateBanner when the pane moves to another note', () => {
    let plugin;
    let mockApp;
    let view;
    let oldFile;
    let newFile;
    let frontmatters;

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});

        mockApp = createMockApp();
        plugin = new PixelBannerPlugin(mockApp, createMockManifest());
        vi.spyOn(plugin, 'loadData').mockResolvedValue({ ...DEFAULT_SETTINGS });
        await plugin.onload();

        oldFile = new TFile(`old-${Math.random()}.md`);
        newFile = new TFile(`new-${Math.random()}.md`);
        frontmatters = {
            [oldFile.path]: { banner: 'https://example.com/old.jpg', icon: '🌟' },
            [newFile.path]: {}
        };
        mockApp.metadataCache.getFileCache = vi.fn(file => ({ frontmatter: frontmatters[file.path] }));

        view = new MarkdownView();
        view.file = oldFile;
        view.contentEl = createBannerContainer();
        view.getMode = vi.fn(() => 'source');
        mockApp.workspace.activeLeaf = { id: 'leaf-1', view };

        vi.spyOn(plugin, 'getIconOverlay');
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    async function runUpdate() {
        const done = plugin.updateBanner(view, true);
        await vi.advanceTimersByTimeAsync(100);
        return done;
    }

    it('draws the icon when the pane still shows the note', async () => {
        vi.spyOn(plugin, 'getImageUrl').mockResolvedValue('https://example.com/old.jpg');

        await expect(runUpdate()).resolves.toBe(true);

        expect(plugin.getIconOverlay).toHaveBeenCalled();
    });

    it('stops without touching the new note once the pane has switched', async () => {
        vi.spyOn(plugin, 'getImageUrl').mockImplementation(async () => {
            // The pane opens another note while the old banner image loads
            view.file = newFile;
            return 'https://example.com/old.jpg';
        });

        await expect(runUpdate()).resolves.toBe(false);

        expect(plugin.getIconOverlay).not.toHaveBeenCalled();
        expect(view.contentEl.querySelector('.banner-icon-overlay')).toBeNull();
    });
});

describe('updateBanner banner shuffle', () => {
    let plugin;
    let mockApp;
    let view;
    let file;
    let frontmatter;

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});

        mockApp = createMockApp();
        plugin = new PixelBannerPlugin(mockApp, createMockManifest());
        vi.spyOn(plugin, 'loadData').mockResolvedValue({ ...DEFAULT_SETTINGS });
        await plugin.onload();

        file = new TFile(`shuffle-${Math.random()}.md`);
        frontmatter = {};
        mockApp.metadataCache.getFileCache = vi.fn(() => ({ frontmatter }));

        view = new MarkdownView();
        view.file = file;
        view.contentEl = createBannerContainer();
        view.getMode = vi.fn(() => 'source');
        mockApp.workspace.activeLeaf = { id: 'leaf-1', view };
        vi.spyOn(plugin, 'getImageUrl').mockResolvedValue('https://example.com/banner.jpg');
        vi.spyOn(plugin, 'getRandomImageFromFolder').mockReturnValue('shuffled/pick.jpg');
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    async function runUpdate() {
        const done = plugin.updateBanner(view, true);
        await vi.advanceTimersByTimeAsync(100);
        return done;
    }

    it('shuffles from the folder a note names', async () => {
        frontmatter = { 'banner-shuffle': 'shuffled' };

        await expect(runUpdate()).resolves.toBe(true);

        expect(plugin.getRandomImageFromFolder).toHaveBeenCalledWith('shuffled');
        expect(plugin.getImageUrl).toHaveBeenCalledWith(expect.anything(), 'shuffled/pick.jpg', file.path);
    });

    it('ignores banner-shuffle: true, which names no folder, and shows the banner', async () => {
        frontmatter = { banner: 'https://example.com/banner.jpg', 'banner-shuffle': true };

        await expect(runUpdate()).resolves.toBe(true);

        expect(plugin.getRandomImageFromFolder).not.toHaveBeenCalled();
        expect(plugin.getImageUrl).toHaveBeenCalledWith(expect.anything(), 'https://example.com/banner.jpg', file.path);
    });

    it('shuffles a folder group from its shuffle folder, not its enable flag', async () => {
        vi.spyOn(plugin, 'getFolderSpecificImage').mockReturnValue({
            image: 'group/default.jpg', enableImageShuffle: true, shuffleFolder: 'group-pics'
        });

        await expect(runUpdate()).resolves.toBe(true);

        expect(plugin.getRandomImageFromFolder).toHaveBeenCalledWith('group-pics');
        expect(plugin.getRandomImageFromFolder).not.toHaveBeenCalledWith(true);
    });
});

// Icon-only headers (issues #322, #238): a note with an icon and no banner, or with a
// banner path that gives no image, shows the icon as a compact header
describe('updateBanner header modes', () => {
    let plugin;
    let mockApp;
    let view;
    let frontmatter;

    // A pane with both views, as Obsidian builds it
    function createPane() {
        const container = document.createElement('div');
        container.classList.add('view-content');
        const readingView = document.createElement('div');
        readingView.classList.add('markdown-reading-view');
        const previewView = document.createElement('div');
        previewView.classList.add('markdown-preview-view');
        const previewSizer = document.createElement('div');
        previewSizer.classList.add('markdown-preview-sizer');
        previewView.appendChild(previewSizer);
        readingView.appendChild(previewView);
        const sourceView = document.createElement('div');
        sourceView.classList.add('markdown-source-view');
        const cmSizer = document.createElement('div');
        cmSizer.classList.add('cm-sizer');
        sourceView.appendChild(cmSizer);
        container.appendChild(readingView);
        container.appendChild(sourceView);
        return container;
    }

    const sizers = () => [
        view.contentEl.querySelector('.markdown-preview-sizer'),
        view.contentEl.querySelector('.cm-sizer')
    ];
    const overlaysIn = sizer => sizer.querySelectorAll(':scope > .banner-icon-overlay');
    const iconVars = el => Array.from(el.style).filter(name => name.startsWith('--pixel-banner-icon-'));

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});

        mockApp = createMockApp();
        plugin = new PixelBannerPlugin(mockApp, createMockManifest());
        vi.spyOn(plugin, 'loadData').mockResolvedValue({ ...DEFAULT_SETTINGS });
        await plugin.onload();

        frontmatter = {};
        mockApp.metadataCache.getFileCache = vi.fn(() => ({ frontmatter }));

        view = new MarkdownView();
        view.file = new TFile(`header-${Math.random()}.md`);
        view.contentEl = createPane();
        view.getMode = vi.fn(() => 'source');
        mockApp.workspace.activeLeaf = { id: 'leaf-1', view };
        vi.spyOn(plugin, 'getImageUrl').mockResolvedValue(null);
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    // Past updateBanner's 250 ms repeat window, so a second update of the same note runs
    async function runUpdate() {
        const done = plugin.updateBanner(view, true);
        await vi.advanceTimersByTimeAsync(300);
        return done;
    }

    function expectIconOnly() {
        const contentEl = view.contentEl;
        expect(contentEl.classList.contains('pixel-banner-icon-only')).toBe(true);
        expect(contentEl.classList.contains('pixel-banner')).toBe(false);
        // On the pane and on both views, where a banner's values would otherwise shadow them
        [contentEl, contentEl.querySelector('.markdown-preview-view'), contentEl.querySelector('.markdown-source-view')].forEach(el => {
            expect(el.style.getPropertyValue('--pixel-banner-icon-start')).toBe('16px');
            expect(el.style.getPropertyValue('--pixel-banner-icon-translate-y')).toBe('0%');
            // 16 inset + 70 icon + 2 x 10 padding + 16 gap
            expect(el.style.getPropertyValue('--pixel-banner-content-start')).toBe(`${16 + 70 + 2 * 10 + 16}px`);
        });
        sizers().forEach(sizer => {
            const overlays = overlaysIn(sizer);
            expect(overlays).toHaveLength(1);
            expect(overlays[0].hasAttribute('style')).toBe(false);
        });
    }

    it('gives an icon-only note the icon-only layout and one unstyled overlay per sizer', async () => {
        frontmatter = { icon: '🌟' };

        await expect(runUpdate()).resolves.toBe(true);

        expectIconOnly();
        expect(view.contentEl.querySelector('.pixel-banner-image')).toBeNull();
        sizers().forEach(sizer => expect(overlaysIn(sizer)[0].textContent).toBe('🌟'));
    });

    it('gives an icon-image-only note the same layout', async () => {
        frontmatter = { 'icon-image': 'https://example.com/icon.png' };

        await expect(runUpdate()).resolves.toBe(true);

        expectIconOnly();
        expect(view.contentEl.querySelector('.pixel-banner-image')).toBeNull();
        sizers().forEach(sizer => {
            expect(overlaysIn(sizer)[0].querySelector('img.banner-icon-image').getAttribute('src')).toBe('https://example.com/icon.png');
        });
    });

    it('falls back to the icon-only header when the banner path gives no image', async () => {
        frontmatter = { banner: 'missing/nowhere.png', icon: '🌟' };

        await expect(runUpdate()).resolves.toBe(true);

        expectIconOnly();
        const banner = view.contentEl.querySelector('.pixel-banner-image');
        expect(banner.style.display).toBe('none');
        // The banner's inline sizer padding gives way to the icon-only rule
        sizers().forEach(sizer => expect(sizer.style.paddingTop).toBe(''));
    });

    it('keeps today\'s result for a banner path that gives no image and no icon', async () => {
        frontmatter = { banner: 'missing/nowhere.png' };

        await expect(runUpdate()).resolves.toBe(true);

        const contentEl = view.contentEl;
        expect(contentEl.classList.contains('pixel-banner')).toBe(false);
        expect(contentEl.classList.contains('pixel-banner-icon-only')).toBe(false);
        expect(contentEl.querySelector('.pixel-banner-image').style.display).toBe('none');
        expect(contentEl.querySelector('.banner-icon-overlay')).toBeNull();
        expect(iconVars(contentEl)).toEqual([]);
    });

    it('removes the header when the icon is removed', async () => {
        frontmatter = { icon: '🌟' };
        await runUpdate();
        expectIconOnly();

        frontmatter = {};
        await expect(runUpdate()).resolves.toBe(true);

        const contentEl = view.contentEl;
        expect(contentEl.classList.contains('pixel-banner-icon-only')).toBe(false);
        expect(contentEl.classList.contains('pixel-banner')).toBe(false);
        expect(contentEl.querySelector('.banner-icon-overlay')).toBeNull();
        [contentEl, contentEl.querySelector('.markdown-preview-view'), contentEl.querySelector('.markdown-source-view')].forEach(el => {
            expect(iconVars(el)).toEqual([]);
            expect(el.style.getPropertyValue('--pixel-banner-content-start')).toBe('');
        });
    });

    // Replacing an unchanged overlay would re-trigger the observer's icon-only re-ensure
    // (the pool can hand a replaced overlay back, so count the rebuilds, not node identity)
    it('keeps the overlay for an unchanged note and rebuilds it when the icon changes', async () => {
        const getIconOverlay = vi.spyOn(plugin, 'getIconOverlay');
        frontmatter = { icon: '🌟' };
        await runUpdate();
        const [previewSizer, sourceSizer] = sizers();
        const first = [overlaysIn(previewSizer)[0], overlaysIn(sourceSizer)[0]];
        expect(getIconOverlay).toHaveBeenCalledTimes(2);

        await runUpdate();
        expect(getIconOverlay).toHaveBeenCalledTimes(2);
        expect(overlaysIn(previewSizer)[0]).toBe(first[0]);
        expect(overlaysIn(sourceSizer)[0]).toBe(first[1]);

        frontmatter = { icon: '🌟', 'icon-size': 50 };
        await runUpdate();
        expect(getIconOverlay).toHaveBeenCalledTimes(4);
        sizers().forEach(sizer => {
            expect(overlaysIn(sizer)).toHaveLength(1);
            expect(overlaysIn(sizer)[0]._pixelBannerIconState.size).toBe(50);
        });
    });

    it('keeps an icon-only overlay in a fresh pane through Obsidian\'s child reconciliation', async () => {
        // Obsidian's own setChildrenInPlace, on both sizers of a pane no banner was ever drawn in
        sizers().forEach(sizer => {
            sizer.setChildrenInPlace = function(children) { this.replaceChildren(...children); };
        });
        frontmatter = { icon: '🌟' };
        await runUpdate();

        sizers().forEach(sizer => {
            const section = document.createElement('div');
            section.className = 'markdown-preview-section';
            sizer.setChildrenInPlace([section]);

            expect(overlaysIn(sizer)).toHaveLength(1);
            expect(sizer.firstElementChild.classList.contains('banner-icon-overlay')).toBe(true);
        });
    });

    it('draws a banner note\'s icon only next to its banner and drops an icon-only overlay elsewhere', async () => {
        vi.mocked(plugin.getImageUrl).mockResolvedValue('https://example.com/banner.jpg');
        const [previewSizer, sourceSizer] = sizers();
        frontmatter = { icon: '🦊' };
        await runUpdate();
        expect(overlaysIn(previewSizer)).toHaveLength(1);

        frontmatter = { banner: 'https://example.com/banner.jpg', icon: '🌟' };
        await runUpdate();

        // Editing view: the banner and its icon are in the source sizer only
        expect(sourceSizer.querySelector(':scope > .pixel-banner-image')).not.toBeNull();
        expect(overlaysIn(sourceSizer)).toHaveLength(1);
        expect(overlaysIn(sourceSizer)[0].textContent).toBe('🌟');
        expect(previewSizer.querySelector(':scope > .pixel-banner-image')).toBeNull();
        expect(overlaysIn(previewSizer)).toHaveLength(0);
        expect(view.contentEl.classList.contains('pixel-banner-icon-only')).toBe(false);
    });

    // plugin.applyBannerWidth is one 350 ms throttle shared by every element
    it('sets the width the overlay is capped at even right after another pane set its own', async () => {
        const otherPane = document.createElement('div');
        otherPane.classList.add('view-content');
        plugin.applyBannerWidth(otherPane);
        frontmatter = { icon: '🌟' };

        await runUpdate();

        expect(view.contentEl.style.getPropertyValue('--pixel-banner-width')).not.toBe('');
    });

    // In editing view the source view comes first, and live preview renders an embedded
    // note with its own .markdown-preview-sizer
    it('ignores a live preview embed\'s sizer and leaves the embedded note\'s banner alone', async () => {
        const cmSizer = view.contentEl.querySelector('.cm-sizer');
        const embed = document.createElement('div');
        embed.className = 'internal-embed markdown-embed';
        const embedSizer = document.createElement('div');
        embedSizer.className = 'markdown-preview-sizer';
        const embedBanner = document.createElement('div');
        embedBanner.className = 'pixel-banner-image';
        embedBanner.style.display = 'block';
        embedSizer.appendChild(embedBanner);
        embed.appendChild(embedSizer);
        cmSizer.appendChild(embed);
        view.contentEl.insertBefore(view.contentEl.querySelector('.markdown-source-view'), view.contentEl.firstChild);

        frontmatter = { icon: '🌟' };
        await runUpdate();

        expect(overlaysIn(embedSizer)).toHaveLength(0);
        expect(embedBanner.style.display).toBe('block');
        expect(overlaysIn(view.contentEl.querySelector(':scope > .markdown-reading-view .markdown-preview-sizer'))).toHaveLength(1);
        expect(overlaysIn(cmSizer)).toHaveLength(1);
    });

    // The reading-view post processor passes a stand-in view for an embed: its contentEl is
    // the embed's .markdown-preview-view. Embeds get icon-only headers in a later phase
    describe('for an embed stand-in view', () => {
        let standIn;
        let previewView;
        let embedSizer;

        beforeEach(() => {
            const embed = document.createElement('div');
            embed.className = 'internal-embed markdown-embed';
            const embedContent = document.createElement('div');
            embedContent.className = 'markdown-embed-content';
            previewView = document.createElement('div');
            previewView.className = 'markdown-preview-view';
            embedSizer = document.createElement('div');
            embedSizer.className = 'markdown-preview-sizer';
            previewView.appendChild(embedSizer);
            embedContent.appendChild(previewView);
            embed.appendChild(embedContent);
            document.body.appendChild(embed);
            standIn = { file: new TFile(`embedded-${Math.random()}.md`), contentEl: previewView, getMode: () => 'preview' };
        });

        afterEach(() => {
            document.body.innerHTML = '';
        });

        async function runStandIn() {
            const done = plugin.updateBanner(standIn, true);
            await vi.advanceTimersByTimeAsync(300);
            return done;
        }

        // Obsidian puts the stand-in's banner in the preview view; happy-dom does not apply the
        // :not(.internal-embed ...) in addPixelBanner's container lookup and puts it in the sizer.
        // Either way the sizer gets an overlay only next to a banner, as before
        const expectOverlayOnlyNextToBanner = () => {
            const hasBanner = !!embedSizer.querySelector(':scope > .pixel-banner-image');
            expect(overlaysIn(embedSizer)).toHaveLength(hasBanner ? 1 : 0);
        };

        it('keeps the banner icon variables applyBannerSettings wrote', async () => {
            vi.mocked(plugin.getImageUrl).mockResolvedValue('https://example.com/banner.jpg');
            frontmatter = { banner: 'https://example.com/banner.jpg', icon: '🌟' };

            await runStandIn();

            expect(previewView.style.getPropertyValue('--pixel-banner-icon-start')).toBe('315px');
            expect(previewView.style.getPropertyValue('--pixel-banner-icon-size')).toBe('70px');
            expectOverlayOnlyNextToBanner();
        });

        it('gets no icon-only header for a broken banner with an icon', async () => {
            frontmatter = { banner: 'missing/nowhere.png', icon: '🌟' };

            await runStandIn();

            expect(previewView.classList.contains('pixel-banner-icon-only')).toBe(false);
            expect(previewView.style.getPropertyValue('--pixel-banner-icon-translate-y')).toBe('');
            expect(previewView.style.getPropertyValue('--pixel-banner-content-start')).not.toBe(`${16 + 70 + 2 * 10 + 16}px`);
            expectOverlayOnlyNextToBanner();
        });

        it('gets no icon-only header for an icon without a banner', async () => {
            frontmatter = { icon: '🌟' };

            await runStandIn();

            expect(previewView.classList.contains('pixel-banner-icon-only')).toBe(false);
            expect(overlaysIn(embedSizer)).toHaveLength(0);
        });
    });
});

describe('updateBanner with a shared vault image blob URL that fails to load', () => {
    let plugin;
    let mockApp;
    let view;
    const realFetch = global.fetch;
    const realCreateObjectURL = URL.createObjectURL;
    const realRevokeObjectURL = URL.revokeObjectURL;

    beforeEach(async () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        releaseAllVaultImageUrls();
        URL.createObjectURL = vi.fn(() => 'blob:shared-vault-image');
        URL.revokeObjectURL = vi.fn();

        mockApp = createMockApp();
        plugin = new PixelBannerPlugin(mockApp, createMockManifest());
        vi.spyOn(plugin, 'loadData').mockResolvedValue({ ...DEFAULT_SETTINGS });
        await plugin.onload();

        const note = new TFile(`note-${Math.random()}.md`);
        mockApp.metadataCache.getFileCache = vi.fn(() => ({ frontmatter: { banner: 'https://example.com/banner.jpg' } }));
        view = new MarkdownView();
        view.file = note;
        view.contentEl = createBannerContainer();
        view.getMode = vi.fn(() => 'source');
        mockApp.workspace.activeLeaf = { id: 'leaf-1', view };
    });

    afterEach(() => {
        releaseAllVaultImageUrls();
        global.fetch = realFetch;
        URL.createObjectURL = realCreateObjectURL;
        URL.revokeObjectURL = realRevokeObjectURL;
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('drops the URL from the shared cache so the retry reads the file again', async () => {
        const imageFile = new TFile('shared.png');
        imageFile.extension = 'png';
        const vaultContext = { app: createMockApp() };
        vaultContext.app.vault.getAbstractFileByPath = vi.fn(() => imageFile);
        vaultContext.app.vault.readBinary = vi.fn().mockResolvedValue(new ArrayBuffer(4));
        const shared = await getVaultImageUrl.call(vaultContext, 'shared.png');
        expect(isVaultImageBlobUrl(shared.url)).toBe(true);

        global.fetch = vi.fn().mockRejectedValue(new Error('revoked'));
        const getImageUrl = vi.spyOn(plugin, 'getImageUrl')
            .mockResolvedValueOnce(shared)
            .mockResolvedValueOnce('https://example.com/fresh.jpg');

        const done = plugin.updateBanner(view, true);
        await vi.advanceTimersByTimeAsync(100);
        await done;

        expect(getImageUrl).toHaveBeenCalledTimes(2);
        expect(isVaultImageBlobUrl(shared.url)).toBe(false);
        expect(URL.revokeObjectURL).toHaveBeenCalledWith(shared.url);
    });
});
