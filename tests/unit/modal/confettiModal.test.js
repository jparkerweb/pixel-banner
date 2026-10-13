import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfettiModal } from '../../../src/modal/modals/confettiModal.js';
import { confettiManager } from '../../../src/core/confettiManager.js';
import { getPresetDefaults } from '../../../src/utils/confettiUtils.js';
import { mockApp, createMockPlugin } from '../../mocks/obsidian.js';

// Mock the confetti manager singleton so preview tests assert calls without
// rendering real canvases
vi.mock('../../../src/core/confettiManager.js', () => ({
    confettiManager: {
        start: vi.fn(),
        stop: vi.fn(),
        hasActiveEffect: vi.fn().mockReturnValue(false)
    }
}));

const PREVIEW_NOTE_ID = '<<confetti-modal-preview>>';

describe('ConfettiModal live preview', () => {
    let app;
    let plugin;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
        confettiManager.hasActiveEffect.mockReturnValue(false);

        app = {
            ...mockApp,
            workspace: {
                getActiveFile: vi.fn().mockReturnValue({ path: 'test.md', name: 'test.md' }),
                getActiveViewOfType: vi.fn().mockReturnValue(null)
            },
            fileManager: {
                processFrontMatter: vi.fn()
            }
        };
        plugin = createMockPlugin(app);
        plugin.settings = {
            customBannerConfettiField: ['banner-confetti']
        };
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function createModal(currentConfig = null) {
        return new ConfettiModal(app, plugin, currentConfig);
    }

    describe('updatePreview', () => {
        it('should start the preview on the modal element with the selected preset', () => {
            const modal = createModal({ presetName: 'confetti', overrides: {} });

            modal.updatePreview();

            expect(confettiManager.start).toHaveBeenCalledTimes(1);
            const [noteId, element, presetName] = confettiManager.start.mock.calls[0];
            expect(noteId).toBe(PREVIEW_NOTE_ID);
            expect(element).toBe(modal.modalEl);
            expect(presetName).toBe('confetti');
        });

        it('should force delay to 0 so the preview fires immediately', () => {
            const modal = createModal({ presetName: 'confetti', overrides: { delay: 3000 } });

            modal.updatePreview();

            const overrides = confettiManager.start.mock.calls[0][3];
            expect(overrides.delay).toBe(0);
        });

        it('should pass current overrides so the preview matches what Apply would save', () => {
            const defaults = getPresetDefaults('confetti');
            const modal = createModal({ presetName: 'confetti', overrides: {} });
            modal.settings.count = defaults.count + 5;

            modal.updatePreview();

            const overrides = confettiManager.start.mock.calls[0][3];
            expect(overrides.count).toBe(defaults.count + 5);
        });

        it('should clean up instead of starting when preset is none', () => {
            const modal = createModal();
            expect(modal.selectedPreset).toBe('none');

            modal.updatePreview();

            expect(confettiManager.start).not.toHaveBeenCalled();
            expect(confettiManager.stop).toHaveBeenCalledWith(PREVIEW_NOTE_ID, 0);
        });

        it('should use a preview ID that cannot collide with a vault file path', () => {
            // < and > are invalid in file names on every platform Obsidian supports
            expect(PREVIEW_NOTE_ID).toMatch(/[<>]/);
        });
    });

    describe('schedulePreviewUpdate (debounce)', () => {
        it('should debounce rapid updates into a single preview restart', () => {
            const modal = createModal({ presetName: 'confetti', overrides: {} });

            modal.schedulePreviewUpdate();
            modal.schedulePreviewUpdate();
            modal.schedulePreviewUpdate();

            expect(confettiManager.start).not.toHaveBeenCalled();

            vi.advanceTimersByTime(100);

            expect(confettiManager.start).toHaveBeenCalledTimes(1);
        });

        it('should reset the debounce window on each call', () => {
            const modal = createModal({ presetName: 'confetti', overrides: {} });

            modal.schedulePreviewUpdate();
            vi.advanceTimersByTime(60);
            modal.schedulePreviewUpdate();
            vi.advanceTimersByTime(60);

            // 120ms elapsed but only 60ms since the last call
            expect(confettiManager.start).not.toHaveBeenCalled();

            vi.advanceTimersByTime(40);
            expect(confettiManager.start).toHaveBeenCalledTimes(1);
        });
    });

    describe('cleanupPreview', () => {
        it('should stop the preview effect immediately (no fade)', () => {
            const modal = createModal({ presetName: 'confetti', overrides: {} });

            modal.cleanupPreview();

            expect(confettiManager.stop).toHaveBeenCalledWith(PREVIEW_NOTE_ID, 0);
        });

        it('should cancel a pending debounced update', () => {
            const modal = createModal({ presetName: 'confetti', overrides: {} });

            modal.schedulePreviewUpdate();
            modal.cleanupPreview();
            vi.advanceTimersByTime(200);

            expect(confettiManager.start).not.toHaveBeenCalled();
        });
    });

    describe('lifecycle wiring', () => {
        it('onOpen should render the preview after building the UI', () => {
            const modal = createModal({ presetName: 'confetti', overrides: {} });
            vi.spyOn(modal, 'buildUI').mockImplementation(() => {});
            const updateSpy = vi.spyOn(modal, 'updatePreview');

            modal.onOpen();

            expect(updateSpy).toHaveBeenCalledTimes(1);
        });

        it('onClose should clean up the preview', () => {
            const modal = createModal({ presetName: 'confetti', overrides: {} });
            const cleanupSpy = vi.spyOn(modal, 'cleanupPreview');

            modal.onClose();

            expect(cleanupSpy).toHaveBeenCalledTimes(1);
            expect(confettiManager.stop).toHaveBeenCalledWith(PREVIEW_NOTE_ID, 0);
        });

        it('checkIfModified should schedule a preview refresh (single hook for all controls)', () => {
            const modal = createModal({ presetName: 'confetti', overrides: {} });
            // modifiedIndicator is created in buildUI; stub it for the unit test
            modal.modifiedIndicator = { style: {} };

            modal.checkIfModified();
            vi.advanceTimersByTime(100);

            expect(confettiManager.start).toHaveBeenCalledTimes(1);
        });

        it('should suppress the note\'s own active effect while previewing (no competing effects)', () => {
            const noteEl = document.createElement('div');
            document.body.appendChild(noteEl);
            app.workspace.getActiveViewOfType = vi.fn().mockReturnValue({
                file: { path: 'test.md' },
                contentEl: noteEl
            });
            confettiManager.hasActiveEffect.mockReturnValue(true);

            const modal = createModal({ presetName: 'snow', overrides: {} });
            vi.spyOn(modal, 'buildUI').mockImplementation(() => {});
            modal.onOpen();

            expect(confettiManager.stop).toHaveBeenCalledWith('test.md', 0);
            noteEl.remove();
        });

        it('should restore the note\'s original effect on cancel', () => {
            const noteEl = document.createElement('div');
            document.body.appendChild(noteEl);
            app.workspace.getActiveViewOfType = vi.fn().mockReturnValue({
                file: { path: 'test.md' },
                contentEl: noteEl
            });
            confettiManager.hasActiveEffect.mockReturnValue(true);

            const modal = createModal({ presetName: 'snow', overrides: { count: 42 } });
            vi.spyOn(modal, 'buildUI').mockImplementation(() => {});
            modal.onOpen();
            confettiManager.start.mockClear();

            // Cancel (close without applying)
            modal.onClose();

            expect(confettiManager.start).toHaveBeenCalledWith('test.md', noteEl, 'snow', { count: 42 });
            noteEl.remove();
        });

        it('should NOT restore the old effect after Apply (new effect supersedes it)', () => {
            const noteEl = document.createElement('div');
            document.body.appendChild(noteEl);
            app.workspace.getActiveViewOfType = vi.fn().mockReturnValue({
                file: { path: 'test.md' },
                contentEl: noteEl
            });
            confettiManager.hasActiveEffect.mockReturnValue(true);

            const modal = createModal({ presetName: 'snow', overrides: {} });
            vi.spyOn(modal, 'buildUI').mockImplementation(() => {});
            modal.onOpen();
            modal.applied = true; // applySettings sets this before closing
            confettiManager.start.mockClear();

            modal.onClose();

            expect(confettiManager.start).not.toHaveBeenCalledWith(
                'test.md', expect.anything(), expect.anything(), expect.anything()
            );
            noteEl.remove();
        });

        it('should not restore anything when the note had no original effect', () => {
            const modal = createModal(); // no currentConfig
            confettiManager.start.mockClear();

            modal.onClose();

            expect(confettiManager.start).not.toHaveBeenCalled();
        });

        it('switching the preset to none should clear the preview via the debounced refresh', () => {
            const modal = createModal({ presetName: 'confetti', overrides: {} });
            modal.modifiedIndicator = { style: {} };
            modal.selectedPreset = 'none';

            modal.checkIfModified();
            vi.advanceTimersByTime(100);

            expect(confettiManager.start).not.toHaveBeenCalled();
            expect(confettiManager.stop).toHaveBeenCalledWith(PREVIEW_NOTE_ID, 0);
        });
    });
});
