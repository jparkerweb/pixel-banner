import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PixelBannerPlugin } from '@/core/pixelBannerPlugin.js';
import { handleSetBannerIcon, handleSetBannerIconImage } from '@/core/bannerIconHelpers.js';
import { createMockApp, createMockManifest, TFile, MarkdownView } from 'obsidian';

// Record the position modals the commands open
const positionModal = vi.hoisted(() => ({ opened: 0 }));
vi.mock('@/modal/modals.js', async (importOriginal) => ({
    ...(await importOriginal()),
    TargetPositionModal: class {
        open() { positionModal.opened++; }
    }
}));

vi.mock('@/core/bannerIconHelpers.js', async (importOriginal) => ({
    ...(await importOriginal()),
    handleSetBannerIcon: vi.fn(),
    handleSetBannerIconImage: vi.fn()
}));

// The icon commands work on any note, so an icon can be added before a banner; the position
// command needs a banner or an icon to adjust
describe('icon and position commands', () => {
    let plugin;
    let commands;
    let file;
    let app;

    beforeEach(async () => {
        positionModal.opened = 0;
        handleSetBannerIcon.mockClear();
        handleSetBannerIconImage.mockClear();

        app = createMockApp();
        plugin = new PixelBannerPlugin(app, createMockManifest());
        vi.spyOn(plugin, 'loadData').mockResolvedValue({});
        const addCommand = vi.spyOn(plugin, 'addCommand');
        await plugin.onload();
        commands = Object.fromEntries(addCommand.mock.calls.map(([command]) => [command.id, command]));

        file = new TFile('note.md');
        const view = new MarkdownView();
        view.file = file;
        app.workspace.getActiveViewOfType = vi.fn(() => view);
        app.workspace.getActiveFile = vi.fn(() => file);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe.each([
        ['set-banner-icon-image', () => handleSetBannerIconImage],
        ['set-banner-icon', () => handleSetBannerIcon]
    ])('%s', (id, handler) => {
        it('is available on a note with no banner and no icon', () => {
            app.metadataCache.getFileCache = vi.fn(() => ({ frontmatter: {} }));

            expect(commands[id].checkCallback(true)).toBe(true);
        });

        it('runs its handler on a note with no banner', () => {
            app.metadataCache.getFileCache = vi.fn(() => ({ frontmatter: {} }));

            expect(commands[id].checkCallback(false)).toBe(true);
            expect(handler()).toHaveBeenCalledWith(plugin);
        });

        it('is unavailable when no note is open in a Markdown view', () => {
            app.workspace.getActiveViewOfType = vi.fn(() => null);

            expect(commands[id].checkCallback(true)).toBe(false);
            expect(handler()).not.toHaveBeenCalled();
        });
    });

    describe('set-banner-position', () => {
        it('is unavailable on a note with neither a banner nor an icon', () => {
            vi.spyOn(plugin, 'hasBannerOrIcon').mockReturnValue(false);

            expect(commands['set-banner-position'].checkCallback(true)).toBe(false);
            expect(commands['set-banner-position'].checkCallback(false)).toBe(false);
            expect(positionModal.opened).toBe(0);
        });

        it('opens the position modal on a note with a banner or an icon', () => {
            vi.spyOn(plugin, 'hasBannerOrIcon').mockReturnValue(true);

            expect(commands['set-banner-position'].checkCallback(true)).toBe(true);
            expect(positionModal.opened).toBe(0);
            expect(commands['set-banner-position'].checkCallback(false)).toBe(true);
            expect(positionModal.opened).toBe(1);
        });

        it('is available on a note that has only an icon', () => {
            app.metadataCache.getFileCache = vi.fn(() => ({ frontmatter: { icon: '🌟' } }));

            expect(commands['set-banner-position'].checkCallback(true)).toBe(true);
        });
    });
});
