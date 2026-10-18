import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TargetPositionModal } from '@/modal/modals/targetPositionModal.js';
import { DEFAULT_SETTINGS } from '@/settings/settings.js';
import { createMockApp, createMockPlugin } from 'obsidian';

// The Target Position modal's confetti row: what it says for the note's
// banner-confetti value
describe('TargetPositionModal confetti status row', () => {
    let app;
    let plugin;
    let frontmatter;

    beforeEach(() => {
        frontmatter = {};
        app = createMockApp();
        app.workspace.getActiveFile = vi.fn(() => ({ path: 'note.md', basename: 'note' }));
        app.workspace.getActiveViewOfType = vi.fn(() => null);
        app.metadataCache.getFileCache = vi.fn(() => ({ frontmatter }));
        app.vault.config = { showInlineTitle: true };
        plugin = createMockPlugin(app);
        plugin.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    async function statusFor(value) {
        if (value !== undefined) {
            frontmatter['banner-confetti'] = value;
        }
        const modal = new TargetPositionModal(app, plugin, vi.fn());
        // setupUI looks for a banner icon again after 400 ms when the note has none
        const setup = modal.setupUI(modal.contentEl);
        await vi.advanceTimersByTimeAsync(400);
        await setup;
        const status = modal.contentEl.querySelector('.confetti-status');
        const button = modal.contentEl.querySelector('.confetti-settings-button');
        return { text: status.textContent, cls: status.className, button: button.textContent };
    }

    it('shows no effect when the note has none', async () => {
        const { text, cls, button } = await statusFor(undefined);

        expect(text).toBe('No effect');
        expect(cls).toContain('confetti-status-none');
        expect(button).toContain('Add Confetti');
    });

    it('shows a known preset as active', async () => {
        const { text, cls, button } = await statusFor('type: snow, count: 5');

        expect(text).toBe('Active: snow');
        expect(cls).toContain('confetti-status-active');
        expect(button).toContain('Edit Confetti');
    });

    it('shows an unknown preset by name, not as no effect', async () => {
        const { text, cls, button } = await statusFor('type: glitter, count: 5');

        expect(text).toBe('Unknown preset: glitter');
        expect(cls).toContain('confetti-status-unknown');
        expect(button).toContain('Edit Confetti');
    });

    it('names an unknown preset written in object form', async () => {
        const { text } = await statusFor({ type: 'glitter', count: 5 });

        expect(text).toBe('Unknown preset: glitter');
    });

    it.each([
        ['a number', 42],
        ['an object without a type', { count: 5 }],
        ['an array without a name', [{ count: 5 }]]
    ])('shows %s as an unknown preset without crashing', async (_label, value) => {
        const { text, cls } = await statusFor(value);

        expect(text).toMatch(/^Unknown preset: /);
        expect(cls).toContain('confetti-status-unknown');
    });
});

// Closing the modal removes its own <style> element, never someone else's
describe('TargetPositionModal style element', () => {
    let app;
    let plugin;
    let otherStyle;

    beforeEach(() => {
        app = createMockApp();
        app.workspace.getActiveFile = vi.fn(() => ({ path: 'note.md', basename: 'note' }));
        app.workspace.getActiveViewOfType = vi.fn(() => null);
        app.metadataCache.getFileCache = vi.fn(() => ({ frontmatter: {} }));
        app.vault.config = { showInlineTitle: true };
        plugin = createMockPlugin(app);
        plugin.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        vi.useFakeTimers();
    });

    afterEach(() => {
        otherStyle?.remove();
        otherStyle = null;
        vi.useRealTimers();
    });

    it('keeps a style element appended after its own when it closes', async () => {
        const stylesBefore = new Set(document.head.querySelectorAll('style'));
        const modal = new TargetPositionModal(app, plugin, vi.fn());
        const setup = modal.setupUI(modal.contentEl);
        await vi.advanceTimersByTimeAsync(400);
        await setup;
        const modalStyles = [...document.head.querySelectorAll('style')].filter(el => !stylesBefore.has(el));
        expect(modalStyles).toHaveLength(1);

        otherStyle = document.createElement('style');
        otherStyle.textContent = '.someone-else { color: red; }';
        document.head.appendChild(otherStyle);

        modal.onClose();

        expect(document.head.contains(otherStyle)).toBe(true);
        expect(document.head.contains(modalStyles[0])).toBe(false);
    });
});

// The sliders and the icon section start from the value the note has under
// any configured name, the same name the modal's writes keep
describe('TargetPositionModal start values', () => {
    let app;
    let plugin;
    let frontmatter;

    beforeEach(() => {
        frontmatter = {};
        app = createMockApp();
        app.workspace.getActiveFile = vi.fn(() => ({ path: 'note.md', basename: 'note' }));
        app.workspace.getActiveViewOfType = vi.fn(() => null);
        app.metadataCache.getFileCache = vi.fn(() => ({ frontmatter }));
        app.vault.config = { showInlineTitle: true };
        plugin = createMockPlugin(app);
        plugin.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    async function openModal() {
        const modal = new TargetPositionModal(app, plugin, vi.fn());
        const setup = modal.setupUI(modal.contentEl);
        await vi.advanceTimersByTimeAsync(400);
        await setup;
        return modal;
    }

    it('reads the height from a second configured name', async () => {
        plugin.settings.customBannerHeightField = ['banner-height', 'height'];
        frontmatter.height = 300;

        const modal = await openModal();

        expect(modal.currentHeight).toBe(300);
    });

    it('keeps a 0 from the note instead of the setting', async () => {
        plugin.settings.bannerIconVerticalOffset = 12;
        frontmatter['icon-y'] = 0;

        const modal = await openModal();

        expect(modal.currentBannerIconVerticalOffset).toBe(0);
    });

    it('sees an icon stored under a second configured name', async () => {
        plugin.settings.customBannerIconField = ['banner-icon, icon'];
        frontmatter.icon = '🚀';

        const modal = await openModal();
        const buttons = [...modal.contentEl.querySelectorAll('button')].map(button => button.textContent);

        expect(buttons).toContain('📝 Edit Icon Text & Emoji');
    });
});
