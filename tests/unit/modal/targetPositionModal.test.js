import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TargetPositionModal } from '@/modal/modals/targetPositionModal.js';
import { DEFAULT_SETTINGS } from '@/settings/settings.js';
import { getIconOnlyContentStart } from '@/core/headerMode.js';
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
        plugin.hasBannerSource = vi.fn(() => true);
        plugin.getFolderSpecificImage = vi.fn(() => null);
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
        plugin.hasBannerSource = vi.fn(() => true);
        plugin.getFolderSpecificImage = vi.fn(() => null);
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
        plugin.hasBannerSource = vi.fn(() => true);
        plugin.getFolderSpecificImage = vi.fn(() => null);
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

// The max width control's readable checkbox: it writes "readable", starts
// checked for a readable note, and never sits checked beside unset
describe('TargetPositionModal max width readable', () => {
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
        plugin.hasBannerSource = vi.fn(() => true);
        plugin.getFolderSpecificImage = vi.fn(() => null);
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
        const el = modal.contentEl;
        return {
            modal,
            unset: el.querySelector('.unset-checkbox'),
            readable: el.querySelector('.readable-checkbox'),
            slider: el.querySelector('.max-width-slider'),
            display: el.querySelector('.max-width-value')
        };
    }

    function toggle(checkbox, checked) {
        checkbox.checked = checked;
        checkbox.dispatchEvent(new Event('change'));
    }

    it('writes readable when the readable checkbox is checked', async () => {
        const { unset, readable, slider, display } = await openModal();
        expect(unset.checked).toBe(true);
        expect(readable.checked).toBe(false);

        toggle(readable, true);

        expect(frontmatter['banner-max-width']).toBe('readable');
        expect(unset.checked).toBe(false);
        expect(slider.disabled).toBe(true);
        expect(slider.style.opacity).toBe('0.5');
        expect(display.textContent).toBe('readable');
    });

    it('opens a readable note with readable checked and the slider disabled', async () => {
        frontmatter['banner-max-width'] = ' Readable ';

        const { modal, unset, readable, slider, display } = await openModal();

        expect(modal.isMaxWidthReadable).toBe(true);
        expect(modal.currentMaxWidth).toBe(1928);
        expect(readable.checked).toBe(true);
        expect(unset.checked).toBe(false);
        expect(slider.disabled).toBe(true);
        expect(display.textContent).toBe('readable');
    });

    it('unchecks readable when unset is checked, and the other way round', async () => {
        const { unset, readable, slider, display } = await openModal();

        toggle(readable, true);
        expect(unset.checked).toBe(false);

        toggle(unset, true);
        expect(readable.checked).toBe(false);
        expect('banner-max-width' in frontmatter).toBe(false);
        expect(display.textContent).toBe('unset');

        toggle(readable, true);
        expect(unset.checked).toBe(false);
        expect(frontmatter['banner-max-width']).toBe('readable');

        // Unchecking readable with unset also off goes back to the slider value
        toggle(readable, false);
        expect(slider.disabled).toBe(false);
        expect(frontmatter['banner-max-width']).toBe(1928);
        expect(display.textContent).toBe('1928px');
    });

    it('reset leaves readable unchecked and unset checked', async () => {
        frontmatter['banner-max-width'] = 'readable';
        const { modal, unset, readable, display } = await openModal();
        expect(readable.checked).toBe(true);

        modal.resetPixelBannerNoteSettings();

        expect(readable.checked).toBe(false);
        expect(unset.checked).toBe(true);
        expect(display.textContent).toBe('unset');
        expect('banner-max-width' in frontmatter).toBe(false);
    });
});

// A note with no banner source: the modal hides the banner-only controls and starts content
// start from the value the note uses
describe('TargetPositionModal icon-only mode', () => {
    let app;
    let plugin;
    let frontmatter;
    let hasSource;

    beforeEach(() => {
        frontmatter = { icon: '🌟' };
        hasSource = false;
        app = createMockApp();
        app.workspace.getActiveFile = vi.fn(() => ({ path: 'note.md', basename: 'note' }));
        app.workspace.getActiveViewOfType = vi.fn(() => null);
        app.metadataCache.getFileCache = vi.fn(() => ({ frontmatter }));
        app.vault.config = { showInlineTitle: true };
        plugin = createMockPlugin(app);
        plugin.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        plugin.hasBannerSource = vi.fn(() => hasSource);
        plugin.getFolderSpecificImage = vi.fn(() => null);
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

    const BANNER_ONLY = [
        '.banner-image-header',
        '.banner-image-header-buttons',
        '.control-panel',
        '.max-width-container',
        '.height-container',
        '.target-container'
    ];

    it('marks the modal and every banner-only control', async () => {
        const modal = await openModal();

        expect(modal.modalEl.classList.contains('pixel-banner-target-icon-only')).toBe(true);
        for (const selector of BANNER_ONLY) {
            expect(modal.contentEl.querySelector(selector).classList.contains('pixel-banner-banner-only'), selector).toBe(true);
        }
        const marked = [...modal.contentEl.querySelectorAll('.pixel-banner-banner-only')];
        expect(marked.some(el => el.textContent.includes('Banner Alignment'))).toBe(true);
        expect(marked).toHaveLength(BANNER_ONLY.length + 1);
    });

    it('leaves the content start and icon controls visible', async () => {
        const modal = await openModal();

        for (const selector of ['.content-start-position-container', '.main-container--banner-icon']) {
            expect(modal.contentEl.querySelectorAll(selector).length, selector).toBeGreaterThan(0);
            for (const el of modal.contentEl.querySelectorAll(selector)) {
                expect(el.classList.contains('pixel-banner-banner-only'), selector).toBe(false);
            }
        }
    });

    it('starts content start at the computed compact value, not the global setting', async () => {
        const expected = getIconOnlyContentStart(plugin, frontmatter, null);
        const modal = await openModal();

        expect(expected).not.toBe(plugin.settings.contentStartPosition);
        expect(modal.currentContentStartPosition).toBe(expected);
        expect(modal.contentEl.querySelector('.content-start-position-value').textContent).toBe(`${expected}px`);
    });

    it('starts content start at its own value when the note has one', async () => {
        frontmatter['content-start'] = 120;
        const modal = await openModal();

        expect(modal.contentEl.querySelector('.content-start-position-value').textContent).toBe('120px');
    });

    it('shows the computed value again after a reset', async () => {
        frontmatter['content-start'] = 120;
        const modal = await openModal();

        modal.resetPixelBannerNoteSettings();

        const expected = getIconOnlyContentStart(plugin, {}, null);
        expect(modal.contentEl.querySelector('.content-start-position-value').textContent).toBe(`${expected}px`);
        expect(modal.contentEl.querySelector('.content-start-position-slider').value).toBe(String(expected));
    });

    it('hides nothing on a note with a banner', async () => {
        hasSource = true;
        const modal = await openModal();

        expect(modal.modalEl.classList.contains('pixel-banner-target-icon-only')).toBe(false);
        expect(modal.contentEl.querySelectorAll('.pixel-banner-banner-only')).toHaveLength(0);
        expect(modal.contentEl.querySelector('.content-start-position-value').textContent)
            .toBe(`${plugin.settings.contentStartPosition}px`);
    });
});
