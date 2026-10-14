import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    });

    async function statusFor(value) {
        if (value !== undefined) {
            frontmatter['banner-confetti'] = value;
        }
        const modal = new TargetPositionModal(app, plugin, vi.fn());
        await modal.setupUI(modal.contentEl);
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
