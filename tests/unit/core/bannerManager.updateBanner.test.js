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
