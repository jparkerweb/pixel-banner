import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handlePinIconClick, sanitizeImageFileName } from '@/utils/handlePinIconClick.js';
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

    function savedPath() {
        return plugin.app.vault.createBinary.mock.calls[0][0];
    }

    it.each([
        ['日記', 'Images/日記.png'],
        ['Café', 'Images/café.png']
    ])('keeps non-ASCII characters of the note name "%s" in the saved file', async (basename, expected) => {
        await pinFor(basename);
        expect(savedPath()).toBe(expected);
    });

    it('strips characters a file name or link cannot hold from the saved file', async () => {
        await pinFor('a/b\\c:d*e?f"g<h>i|j#k^l[m]n');
        expect(savedPath()).toBe('Images/abcdefghijklmn.png');
    });
});

describe('sanitizeImageFileName', () => {
    it('keeps letters from any script, spaces, dots and dashes', () => {
        expect(sanitizeImageFileName('日記 Café-notes_v1.2')).toBe('日記 Café-notes_v1.2');
    });

    it('strips path separators, Windows-forbidden and link characters and control characters', () => {
        expect(sanitizeImageFileName(' a/b\\c:d*e?f"g<h>i|j#k^l[m]n\u0000\u001f ')).toBe('abcdefghijklmn');
    });

    it('falls back to "banner" when nothing is left', () => {
        expect(sanitizeImageFileName('  #^[]  ')).toBe('banner');
        expect(sanitizeImageFileName('')).toBe('banner');
    });
});
