import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handlePinIconClick } from '@/utils/handlePinIconClick.js';
import { createMockApp } from 'obsidian';

// The folder and filename prompts answer straight away; the filename prompt
// records the name it was offered
const offeredNames = [];

vi.mock('@/modal/modals/folderSelectionModal', () => ({
    FolderSelectionModal: vi.fn(function(app, defaultFolder, onChoose) {
        this.open = () => onChoose('Images');
    })
}));

vi.mock('@/modal/modals/saveImageModal', () => ({
    SaveImageModal: vi.fn(function(app, suggestedName, onSubmit) {
        offeredNames.push(suggestedName);
        this.open = () => onSubmit(suggestedName, false);
    })
}));

vi.mock('@/modal/modals/pinChoiceModal', () => ({
    PinChoiceModal: vi.fn()
}));

describe('handlePinIconClick', () => {
    let plugin;

    beforeEach(() => {
        offeredNames.length = 0;
        vi.useFakeTimers();
        global.fetch = vi.fn(() => Promise.resolve({
            ok: true,
            arrayBuffer: () => Promise.resolve(new Uint8Array([0x89, 0x50, 0x4E, 0x47]).buffer)
        }));

        // Only files the test saved exist
        const saved = new Set();
        const app = createMockApp();
        app.vault.adapter = { exists: vi.fn((path) => Promise.resolve(saved.has(path))) };
        app.vault.createFolder = vi.fn(() => Promise.resolve());
        app.vault.createBinary = vi.fn((path) => {
            saved.add(path);
            return Promise.resolve({ path });
        });
        app.vault.on = vi.fn();
        app.vault.off = vi.fn();

        plugin = {
            app,
            settings: {
                useNoteFilenameForBanner: true,
                pinnedImageFolder: 'Images',
                pinnedImageFilename: 'pixel-banner-image'
            }
        };
    });

    afterEach(() => {
        vi.useRealTimers();
        delete global.fetch;
    });

    async function pinFor(basename) {
        const pending = handlePinIconClick('https://example.com/a.png', plugin, null, null, false, { basename });
        await vi.runAllTimersAsync();
        await pending;
        return offeredNames[0];
    }

    it.each([
        ['Untitled'],
        ['Untitled 2'],
        ['Untitled 15']
    ])('falls back to the default filename for Obsidian\'s default note name "%s"', async (basename) => {
        expect(await pinFor(basename)).toBe('pixel-banner-image');
    });

    it.each([
        ['Untitled Project Ideas', 'untitled project ideas'],
        ['Untitled2', 'untitled2'],
        ['My Untitled Note', 'my untitled note'],
        ['Garden Plan', 'garden plan']
    ])('offers the note name for a real note called "%s"', async (basename, expected) => {
        expect(await pinFor(basename)).toBe(expected);
    });
});
