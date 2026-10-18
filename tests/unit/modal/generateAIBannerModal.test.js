import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { requestUrl } from 'obsidian';
import { GenerateAIBannerModal } from '../../../src/modal/modals/generateAIBannerModal.js';
import { mockApp, createMockPlugin } from '../../mocks/obsidian.js';

// The modals it can open next are not under test here
vi.mock('../../../src/modal/modals', () => ({
    SelectPixelBannerModal: class { open() {} },
    EmojiSelectionModal: class { open() {} },
    TargetPositionModal: class { open() {} }
}));

// handlePinIconClick asks for a folder and a file name: accept the defaults,
// and answer the "use as banner" toggle from the test
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

describe('GenerateAIBannerModal banner writes', () => {
    let modal;
    let plugin;
    let frontmatter;
    let savedFiles;
    let originalFetch;

    // Clicks a history image and waits until the modal has closed and written
    const useHistoryImage = async () => {
        const container = modal.contentEl.createDiv();
        const wrapper = modal.renderImageItem({
            base64Image: 'data:image/jpeg;base64,AAAA',
            imageId: 'history-1',
            prompt: 'A Red Fox'
        }, container);
        wrapper.click();
        await vi.waitFor(() => expect(modal.close).toHaveBeenCalled());
        await vi.waitFor(() => expect(plugin.app.fileManager.processFrontMatter).toHaveBeenCalledTimes(saveChoice.useAsBanner ? 2 : 1));
        return frontmatter;
    };

    // Generates an image (API stubbed) and clicks it
    const useGeneratedImage = async () => {
        requestUrl.mockResolvedValueOnce({
            status: 200,
            json: { image: 'AAAA', imageId: 'generated-1', balance: 3 }
        });
        modal.prompt = 'A Red Fox';
        modal.availableModels = { model: { controls: {} } };
        modal.selectedModelId = 'model';
        modal.imageContainer = modal.contentEl.createDiv();
        await modal.generateImage();
        modal.imageContainer.querySelector('.pixel-banner-generated-image').click();
        await vi.waitFor(() => expect(modal.close).toHaveBeenCalled());
        await vi.waitFor(() => expect(plugin.app.fileManager.processFrontMatter).toHaveBeenCalledTimes(saveChoice.useAsBanner ? 2 : 1));
        return frontmatter;
    };

    beforeEach(() => {
        saveChoice.useAsBanner = true;
        savedFiles = new Set();
        localStorage.removeItem('pixel-banner-download-history');

        originalFetch = globalThis.fetch;
        globalThis.fetch = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }));

        const app = {
            ...mockApp,
            workspace: { getActiveFile: vi.fn().mockReturnValue({ path: 'test.md', name: 'test.md', basename: 'test' }) },
            vault: {
                adapter: { exists: vi.fn(async (path) => savedFiles.has(path)) },
                createFolder: vi.fn(async (path) => { savedFiles.add(path); }),
                createBinary: vi.fn(async (path) => { savedFiles.add(path); return { path }; }),
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

        modal = new GenerateAIBannerModal(app, plugin);
        modal.close = vi.fn();
        document.body.appendChild(modal.containerEl);
        modal.modalEl.createDiv({ cls: 'pixel-banner-plus-token-balance' });
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        modal.onClose();
        modal.containerEl.remove();
    });

    describe('history image', () => {
        it.each([
            ['image', 'pixel-banner-images/a-red-fox.jpg'],
            ['[[image]]', '[[pixel-banner-images/a-red-fox.jpg]]'],
            ['![[image]]', '![[pixel-banner-images/a-red-fox.jpg]]']
        ])('writes the saved path in the %s format', async (format, expected) => {
            plugin.settings.imagePropertyFormat = format;
            frontmatter = { title: 'Test' };

            await useHistoryImage();

            expect(frontmatter.banner).toBe(expected);
            expect(frontmatter.title).toBe('Test');
        });

        it('writes the banner itself when the save dialog does not set it', async () => {
            saveChoice.useAsBanner = false;
            frontmatter = { title: 'Test' };

            await useHistoryImage();

            expect(frontmatter.banner).toBe('[[pixel-banner-images/a-red-fox.jpg]]');
        });

        it('writes to the first comma-separated banner name', async () => {
            plugin.settings.customBannerField = ['banner, image'];
            frontmatter = { title: 'Test' };

            await useHistoryImage();

            expect(frontmatter.banner).toBe('[[pixel-banner-images/a-red-fox.jpg]]');
            expect(frontmatter).not.toHaveProperty('banner, image');
            expect(frontmatter).not.toHaveProperty('image');
        });

        it('writes under a second banner name the note already uses, and adds no primary name', async () => {
            plugin.settings.customBannerField = ['banner', 'image'];
            frontmatter = { title: 'Test', image: 'old.jpg' };

            await useHistoryImage();

            expect(frontmatter.image).toBe('[[pixel-banner-images/a-red-fox.jpg]]');
            expect(frontmatter).not.toHaveProperty('banner');
            expect(frontmatter.title).toBe('Test');
        });

        it('keeps a second banner name in use when the save dialog does not set it', async () => {
            saveChoice.useAsBanner = false;
            plugin.settings.customBannerField = ['banner, image'];
            frontmatter = { title: 'Test', image: 'old.jpg' };

            await useHistoryImage();

            expect(frontmatter.image).toBe('[[pixel-banner-images/a-red-fox.jpg]]');
            expect(frontmatter).not.toHaveProperty('banner');
        });
    });

    describe('generated image', () => {
        it.each([
            ['image', 'pixel-banner-images/a-red-fox.jpg'],
            ['[[image]]', '[[pixel-banner-images/a-red-fox.jpg]]'],
            ['![[image]]', '![[pixel-banner-images/a-red-fox.jpg]]']
        ])('writes the saved path in the %s format', async (format, expected) => {
            plugin.settings.imagePropertyFormat = format;
            frontmatter = { title: 'Test' };

            await useGeneratedImage();

            expect(frontmatter.banner).toBe(expected);
            expect(frontmatter.title).toBe('Test');
        });

        it('writes the banner itself when the save dialog does not set it', async () => {
            saveChoice.useAsBanner = false;
            frontmatter = { title: 'Test' };

            await useGeneratedImage();

            expect(frontmatter.banner).toBe('[[pixel-banner-images/a-red-fox.jpg]]');
        });

        it('writes to the first comma-separated banner name', async () => {
            plugin.settings.customBannerField = ['banner, image'];
            frontmatter = { title: 'Test' };

            await useGeneratedImage();

            expect(frontmatter.banner).toBe('[[pixel-banner-images/a-red-fox.jpg]]');
            expect(frontmatter).not.toHaveProperty('banner, image');
            expect(frontmatter).not.toHaveProperty('image');
        });

        it('writes under a second banner name the note already uses, and adds no primary name', async () => {
            plugin.settings.customBannerField = ['banner', 'image'];
            frontmatter = { title: 'Test', image: 'old.jpg' };

            await useGeneratedImage();

            expect(frontmatter.image).toBe('[[pixel-banner-images/a-red-fox.jpg]]');
            expect(frontmatter).not.toHaveProperty('banner');
            expect(frontmatter.title).toBe('Test');
        });

        it('keeps a second banner name in use when the save dialog does not set it', async () => {
            saveChoice.useAsBanner = false;
            plugin.settings.customBannerField = ['banner, image'];
            frontmatter = { title: 'Test', image: 'old.jpg' };

            await useGeneratedImage();

            expect(frontmatter.image).toBe('[[pixel-banner-images/a-red-fox.jpg]]');
            expect(frontmatter).not.toHaveProperty('banner');
        });
    });
});
