import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IconImageSelectionModal } from '../../../src/modal/modals/iconImageSelectionModal.js';
import { mockApp, createMockPlugin } from '../../mocks/obsidian.js';

// The modals it can open next are not under test here
vi.mock('../../../src/modal/modals', () => ({
    TargetPositionModal: class { open() {} }
}));

// The icon fields of a note using the default (primary) names
const fullIconFrontmatter = () => ({
    title: 'Test',
    'icon': '',
    'icon-image': '[[icons/star.png]]',
    'banner-icon-image-alignment': 'left',
    'icon-size': 70,
    'icon-image-size-multiplier': 2,
    'icon-rotate': 45,
    'icon-y': 10,
    'icon-x': 25,
    'icon-color': 'red',
    'icon-bg-color': 'blue',
    'icon-padding-x': 4,
    'icon-padding-y': 6,
    'icon-border-radius': 8,
    'icon-opacity': 80,
    'icon-font-weight': 'bold',
    'icon-text-vertical-offset': 3
});

describe('IconImageSelectionModal', () => {
    let modal;
    let plugin;
    let frontmatter;
    let onChoose;
    let originalFetch;

    // Opens the modal, presses Remove and waits for the frontmatter edit
    const removeIcon = async () => {
        modal.onOpen();
        const button = modal.contentEl.querySelector('.remove-icon-image-button');
        button.click();
        await vi.waitFor(() => expect(onChoose).toHaveBeenCalledWith(null));
        return frontmatter;
    };

    beforeEach(() => {
        // Network calls (server ping, icon categories) always fail here
        originalFetch = globalThis.fetch;
        globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const app = {
            ...mockApp,
            vault: {
                getFiles: vi.fn().mockReturnValue([
                    { path: 'icons/star.png', name: 'star.png', extension: 'png', stat: { mtime: 0 } }
                ]),
                // Thumbnails never load
                readBinary: vi.fn(() => new Promise(() => {}))
            },
            workspace: {
                getActiveFile: vi.fn().mockReturnValue({ path: 'test.md', name: 'test.md' }),
                getActiveViewOfType: vi.fn().mockReturnValue(null)
            },
            fileManager: {
                processFrontMatter: vi.fn(async (file, callback) => callback(frontmatter))
            },
            metadataCache: { getFileCache: vi.fn().mockReturnValue(null) }
        };

        plugin = createMockPlugin(app);
        plugin.settings = {
            customBannerIconField: ['icon'],
            customBannerIconImageField: ['icon-image'],
            customBannerIconSizeField: ['icon-size'],
            customBannerIconImageSizeMultiplierField: ['icon-image-size-multiplier'],
            customBannerIconTextVerticalOffsetField: ['icon-text-vertical-offset'],
            customBannerIconRotateField: ['icon-rotate'],
            customBannerIconXPositionField: ['icon-x'],
            customBannerIconOpacityField: ['icon-opacity'],
            customBannerIconColorField: ['icon-color'],
            customBannerIconFontWeightField: ['icon-font-weight'],
            customBannerIconBackgroundColorField: ['icon-bg-color'],
            customBannerIconPaddingXField: ['icon-padding-x'],
            customBannerIconPaddingYField: ['icon-padding-y'],
            customBannerIconBorderRadiusField: ['icon-border-radius'],
            customBannerIconVerticalOffsetField: ['icon-y'],
            customBannerIconImageAlignmentField: ['banner-icon-image-alignment'],
            defaultSelectIconPath: '',
            useShortPath: false,
            openTargetingModalAfterSelectingBannerOrIcon: false
        };

        onChoose = vi.fn();
        modal = new IconImageSelectionModal(app, plugin, onChoose);
        modal.close = vi.fn();
    });

    afterEach(() => {
        modal.onClose();
        globalThis.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    describe('choosing an icon image', () => {
        it('hands a local image path to onChoose and writes no frontmatter itself', () => {
            frontmatter = { title: 'Test' };
            modal.onOpen();

            modal.contentEl.querySelector('.pixel-banner-image-container').click();

            expect(onChoose).toHaveBeenCalledWith('icons/star.png');
            expect(plugin.app.fileManager.processFrontMatter).not.toHaveBeenCalled();
            expect(frontmatter).toEqual({ title: 'Test' });
        });

        it('hands a web URL to onChoose and writes no frontmatter itself', () => {
            frontmatter = { title: 'Test' };
            modal.onOpen();

            modal.contentEl.querySelector('.web-url-input').value = 'https://example.com/star.png';
            modal.contentEl.querySelector('.use-url-button').click();

            expect(onChoose).toHaveBeenCalledWith({
                path: 'https://example.com/star.png',
                name: 'star.png',
                extension: 'png',
                isWebUrl: true
            });
            expect(plugin.app.fileManager.processFrontMatter).not.toHaveBeenCalled();
        });
    });

    describe('removing the icon', () => {
        it('without a text/emoji icon, removes the 13 icon fields and keeps the rest', async () => {
            frontmatter = fullIconFrontmatter();

            await removeIcon();

            expect(frontmatter).toEqual({
                title: 'Test',
                'icon-opacity': 80,
                'icon-font-weight': 'bold',
                'icon-text-vertical-offset': 3
            });
        });

        it('with a text/emoji icon, removes only the image, its size multiplier and its alignment', async () => {
            frontmatter = { ...fullIconFrontmatter(), 'icon': '⭐' };

            await removeIcon();

            const expected = { ...fullIconFrontmatter(), 'icon': '⭐' };
            delete expected['icon-image'];
            delete expected['icon-image-size-multiplier'];
            delete expected['banner-icon-image-alignment'];
            expect(frontmatter).toEqual(expected);
        });

        it('without a text/emoji icon, removes every configured name of each cleared field', async () => {
            plugin.settings.customBannerIconField = ['icon', 'emoji'];
            plugin.settings.customBannerIconImageField = ['icon-image, icon-img'];
            plugin.settings.customBannerIconSizeField = ['icon-size', 'icon-scale'];
            plugin.settings.customBannerIconOpacityField = ['icon-opacity', 'icon-alpha'];
            frontmatter = {
                ...fullIconFrontmatter(),
                'emoji': '',
                'icon-img': 'icons/other.png',
                'icon-scale': 90,
                'icon-alpha': 50
            };

            await removeIcon();

            expect(frontmatter).toEqual({
                title: 'Test',
                'icon-opacity': 80,
                'icon-alpha': 50,
                'icon-font-weight': 'bold',
                'icon-text-vertical-offset': 3
            });
        });

        it('with a text/emoji icon, removes every configured name of the image fields only', async () => {
            plugin.settings.customBannerIconImageField = ['icon-image', 'icon-img'];
            plugin.settings.customBannerIconImageSizeMultiplierField = ['icon-image-size-multiplier, icon-image-scale'];
            plugin.settings.customBannerIconImageAlignmentField = ['banner-icon-image-alignment', 'icon-image-align'];
            plugin.settings.customBannerIconSizeField = ['icon-size', 'icon-scale'];
            frontmatter = {
                ...fullIconFrontmatter(),
                'icon': '⭐',
                'icon-img': 'icons/other.png',
                'icon-image-scale': 3,
                'icon-image-align': 'right',
                'icon-scale': 90
            };

            await removeIcon();

            const expected = { ...fullIconFrontmatter(), 'icon': '⭐', 'icon-scale': 90 };
            delete expected['icon-image'];
            delete expected['icon-image-size-multiplier'];
            delete expected['banner-icon-image-alignment'];
            expect(frontmatter).toEqual(expected);
        });

        it('keeps a text/emoji icon set under a second configured icon name', async () => {
            plugin.settings.customBannerIconField = ['icon', 'emoji'];
            const { icon, ...withoutPrimaryIcon } = fullIconFrontmatter();
            frontmatter = { ...withoutPrimaryIcon, 'emoji': '⭐' };

            await removeIcon();

            const expected = { ...withoutPrimaryIcon, 'emoji': '⭐' };
            delete expected['icon-image'];
            delete expected['icon-image-size-multiplier'];
            delete expected['banner-icon-image-alignment'];
            expect(frontmatter).toEqual(expected);
        });
    });
});
