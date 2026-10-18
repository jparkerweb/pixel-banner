import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PixelBannerPlugin } from '@/core/pixelBannerPlugin.js';
import { createMockApp, createMockManifest, TFile, MarkdownView } from 'obsidian';
import { handleConfettiMetadataChange } from '@/core/eventHandler.js';

// Confetti restarts through its own path; spy on it while keeping its behaviour
vi.mock('@/core/eventHandler.js', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, handleConfettiMetadataChange: vi.fn(actual.handleConfettiMetadataChange) };
});

// The metadataCache 'changed' handler refreshes a banner only when a field in
// the registry's non-confetti list changed
describe('metadata change refresh check', () => {
    let plugin;
    let file;
    let changed;
    let frontmatter;
    let view;

    const previous = {
        banner: 'a.jpg',
        'banner-align': 'left',
        'banner-fade': -20,
        'banner-confetti': 'type: snow'
    };

    beforeEach(async () => {
        const app = createMockApp();
        plugin = new PixelBannerPlugin(app, createMockManifest());
        vi.spyOn(plugin, 'loadData').mockResolvedValue({});
        const onSpy = vi.spyOn(app.metadataCache, 'on');
        await plugin.onload();
        changed = onSpy.mock.calls.find(call => call[0] === 'changed')[1];

        file = new TFile('note.md');
        app.metadataCache.getFileCache = vi.fn(() => ({ frontmatter }));
        plugin.lastFrontmatter.set(file.path, { ...previous });
        vi.spyOn(plugin.loadedImages, 'delete');
        handleConfettiMetadataChange.mockClear();

        // One pane shows the note, so a refresh reaches updateBanner
        view = new MarkdownView();
        view.file = file;
        app.workspace.getLeavesOfType = vi.fn(() => [{ view }]);
        vi.spyOn(plugin, 'updateBanner').mockResolvedValue(true);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('refreshes the banner when only the alignment changed', async () => {
        frontmatter = { ...previous, 'banner-align': 'right' };

        await changed(file, '', { frontmatter });

        expect(plugin.loadedImages.delete).toHaveBeenCalledWith('note.md');
        expect(plugin.updateBanner).toHaveBeenCalledWith(view, true);
    });

    it('does not refresh the banner when only confetti changed, but still reaches confetti', async () => {
        frontmatter = { ...previous, 'banner-confetti': 'type: hearts' };

        await changed(file, '', { frontmatter });

        expect(plugin.loadedImages.delete).not.toHaveBeenCalled();
        expect(plugin.updateBanner).not.toHaveBeenCalled();
        expect(handleConfettiMetadataChange).toHaveBeenCalled();
    });

    it('sees a field configured as one comma-separated entry', async () => {
        plugin.settings.customFadeField = ['banner-fade, fade'];
        plugin.lastFrontmatter.set(file.path, { ...previous, fade: -20 });
        frontmatter = { ...previous, fade: -60 };

        await changed(file, '', { frontmatter });

        expect(plugin.loadedImages.delete).toHaveBeenCalledWith('note.md');
        expect(plugin.updateBanner).toHaveBeenCalledWith(view, true);
    });
});
