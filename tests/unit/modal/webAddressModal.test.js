import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebAddressModal } from '../../../src/modal/modals/webAddressModal.js';
import { mockApp, createMockPlugin } from '../../mocks/obsidian.js';

// The modals it can open next are not under test here
vi.mock('../../../src/modal/modals', () => ({
    SelectPixelBannerModal: class { open() {} },
    EmojiSelectionModal: class { open() {} },
    TargetPositionModal: class { open() {} }
}));

// happy-dom never loads images: report every URL as a valid image
class LoadingImage {
    set src(value) {
        this._src = value;
        setTimeout(() => this.onload?.(), 0);
    }
    get src() { return this._src; }
}

describe('WebAddressModal', () => {
    let modal;
    let plugin;
    let frontmatter;
    let originalImage;

    // Types the URL, presses Set Banner and waits for the frontmatter write
    const setBanner = async (url) => {
        await modal.onOpen();
        const input = modal.contentEl.querySelector('input');
        input.value = url;
        const button = [...modal.contentEl.querySelectorAll('button')].find(b => b.textContent === 'Set Banner');
        button.click();
        await vi.waitFor(() => expect(plugin.app.fileManager.processFrontMatter).toHaveBeenCalled());
        return frontmatter;
    };

    beforeEach(() => {
        originalImage = globalThis.Image;
        globalThis.Image = LoadingImage;

        const app = {
            ...mockApp,
            workspace: { getActiveFile: vi.fn().mockReturnValue({ path: 'test.md', name: 'test.md' }) },
            fileManager: {
                processFrontMatter: vi.fn(async (file, callback) => callback(frontmatter))
            }
        };

        plugin = createMockPlugin(app);
        plugin.settings = {
            customBannerField: ['banner'],
            openTargetingModalAfterSelectingBannerOrIcon: false
        };

        modal = new WebAddressModal(app, plugin);
        modal.close = vi.fn();
    });

    afterEach(() => {
        globalThis.Image = originalImage;
        modal.onClose();
    });

    it('writes the URL to the first comma-separated banner name', async () => {
        plugin.settings.customBannerField = ['banner, image'];
        frontmatter = { title: 'Test' };

        await setBanner('https://example.com/image.jpg');

        expect(frontmatter.banner).toBe('https://example.com/image.jpg');
        expect(frontmatter).not.toHaveProperty('banner, image');
        expect(frontmatter.title).toBe('Test');
    });

    it('writes under a second banner name the note already uses, and adds no primary name', async () => {
        plugin.settings.customBannerField = ['banner', 'image'];
        frontmatter = { title: 'Test', image: 'old.jpg' };

        await setBanner('https://example.com/image.jpg');

        expect(frontmatter.image).toBe('https://example.com/image.jpg');
        expect(frontmatter).not.toHaveProperty('banner');
        expect(frontmatter.title).toBe('Test');
    });
});
