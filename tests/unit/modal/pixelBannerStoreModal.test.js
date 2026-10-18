import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PixelBannerStoreModal } from '../../../src/modal/modals/pixelBannerStoreModal.js';
import { mockApp, createMockPlugin } from '../../mocks/obsidian.js';

// The modals it can open next are not under test here
vi.mock('../../../src/modal/modals', () => ({
    SelectPixelBannerModal: class { open() {} },
    TargetPositionModal: class { open() {} }
}));

// Saving asks for a folder and a file name: accept the defaults, and answer
// the "use as banner" toggle from the test
const saveChoice = vi.hoisted(() => ({ useAsBanner: true }));
vi.mock('../../../src/modal/modals/folderSelectionModal', () => ({
    FolderSelectionModal: class {
        constructor(app, defaultFolder, onChoose) { this.defaultFolder = defaultFolder; this.onChoose = onChoose; }
        open() { this.onChoose(this.defaultFolder); }
    }
}));
vi.mock('../../../src/modal/modals/saveImageModal', () => ({
    SaveImageModal: class {
        constructor(app, suggestedName, onSubmit) { this.suggestedName = suggestedName; this.onSubmit = onSubmit; }
        open() { this.onSubmit(this.suggestedName, saveChoice.useAsBanner); }
    }
}));

describe('PixelBannerStoreModal banner writes', () => {
    let modal;
    let plugin;
    let frontmatter;
    let savedFiles;
    let originalFetch;

    const saveImage = () => modal.downloadAndSaveBanner(
        { base64Image: 'data:image/jpeg;base64,AAAA', fileType: 'image' },
        'mountain-lake.jpg'
    );
    const saveVideo = () => modal.downloadAndSaveBanner(
        { base64Image: 'data:video/mp4;base64,AAAA', fileType: 'video' },
        'ocean-waves.mp4'
    );

    beforeEach(() => {
        saveChoice.useAsBanner = true;
        savedFiles = new Set();

        originalFetch = globalThis.fetch;
        globalThis.fetch = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }));

        const app = {
            ...mockApp,
            workspace: { getActiveFile: vi.fn().mockReturnValue({ path: 'test.md', name: 'test.md', basename: 'test' }) },
            vault: {
                adapter: { exists: vi.fn(async (path) => savedFiles.has(path)) },
                createFolder: vi.fn(async (path) => { savedFiles.add(path); }),
                createBinary: vi.fn(async (path) => { savedFiles.add(path); return { path }; }),
                getAbstractFileByPath: vi.fn((path) => (savedFiles.has(path) ? { path } : null)),
                on: vi.fn(),
                off: vi.fn()
            },
            fileManager: {
                processFrontMatter: vi.fn(async (file, callback) => callback(frontmatter))
            }
        };

        plugin = createMockPlugin(app);
        plugin.settings = {
            customBannerField: ['banner'],
            imagePropertyFormat: '[[image]]',
            pinnedImageFolder: 'pixel-banner-images',
            pinnedImageFilename: 'pexels-banner',
            useShortPath: false,
            useNoteFilenameForBanner: false,
            openTargetingModalAfterSelectingBannerOrIcon: false
        };

        modal = new PixelBannerStoreModal(app, plugin);
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    describe.each([
        ['image', saveImage, 'pixel-banner-images/mountain-lake.jpg'],
        ['video', saveVideo, 'pixel-banner-images/ocean-waves.mp4']
    ])('%s', (kind, save, savedPath) => {
        it.each([
            ['image', savedPath],
            ['[[image]]', `[[${savedPath}]]`],
            ['![[image]]', `![[${savedPath}]]`]
        ])('writes the saved path in the %s format', async (format, expected) => {
            plugin.settings.imagePropertyFormat = format;
            frontmatter = { title: 'Test' };

            await save();

            expect(frontmatter.banner).toBe(expected);
            expect(frontmatter.title).toBe('Test');
        });

        it('writes nothing when the save dialog does not set the banner', async () => {
            saveChoice.useAsBanner = false;
            frontmatter = { title: 'Test' };

            await save();

            expect(plugin.app.fileManager.processFrontMatter).not.toHaveBeenCalled();
            expect(frontmatter).toEqual({ title: 'Test' });
        });

        it('writes to the first comma-separated banner name', async () => {
            plugin.settings.customBannerField = ['banner, image'];
            frontmatter = { title: 'Test' };

            await save();

            expect(frontmatter.banner).toBe(`[[${savedPath}]]`);
            expect(frontmatter).not.toHaveProperty('banner, image');
            expect(frontmatter).not.toHaveProperty('image');
        });

        it('writes under a second banner name the note already uses, and adds no primary name', async () => {
            plugin.settings.customBannerField = ['banner', 'image'];
            frontmatter = { title: 'Test', image: 'old.jpg' };

            await save();

            expect(frontmatter.image).toBe(`[[${savedPath}]]`);
            expect(frontmatter).not.toHaveProperty('banner');
            expect(frontmatter.title).toBe('Test');
        });

        it('keeps one banner name when the note carries two', async () => {
            plugin.settings.customBannerField = ['banner, image'];
            frontmatter = { title: 'Test', banner: 'old.jpg', image: 'older.jpg' };

            await save();

            expect(frontmatter.banner).toBe(`[[${savedPath}]]`);
            expect(frontmatter).not.toHaveProperty('image');
        });
    });
});
