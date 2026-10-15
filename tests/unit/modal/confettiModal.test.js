import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Notice } from 'obsidian';
import { ConfettiModal } from '../../../src/modal/modals/confettiModal.js';
import { confettiManager, shouldRunConfetti, getConfettiBlockReason } from '../../../src/core/confettiManager.js';
import { getPresetDefaults, getPresetNames, parseConfettiConfig } from '../../../src/utils/confettiUtils.js';
import { handleConfettiForNote } from '../../../src/core/eventHandler.js';
import { createMockPlugin } from '../../mocks/obsidian.js';

// Spy on Notice so tests can assert what the modal tells the user
vi.mock('obsidian', async (importOriginal) => ({
    ...(await importOriginal()),
    Notice: vi.fn()
}));

// Mock the confetti manager singleton so preview tests assert calls without
// rendering real canvases
vi.mock('../../../src/core/confettiManager.js', () => ({
    PREVIEW_EFFECT_ID: '<<confetti-modal-preview>>',
    shouldRunConfetti: vi.fn(() => true),
    getConfettiBlockReason: vi.fn(() => null),
    isLightTheme: vi.fn(() => document.body.classList.contains('theme-light')),
    confettiManager: {
        start: vi.fn(),
        stop: vi.fn(),
        update: vi.fn(),
        getEffect: vi.fn(),
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
        shouldRunConfetti.mockReturnValue(true);
        getConfettiBlockReason.mockReturnValue(null);

        app = {
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
        it('should start the preview on a fixed layer outside the scrolling modal', () => {
            const modal = createModal({ presetName: 'confetti', overrides: {} });

            modal.updatePreview();

            expect(confettiManager.start).toHaveBeenCalledTimes(1);
            const [noteId, element, presetName] = confettiManager.start.mock.calls[0];
            expect(noteId).toBe(PREVIEW_NOTE_ID);
            expect(element).toBe(modal.previewLayer);
            expect(element.parentNode).toBe(modal.containerEl);
            expect(modal.modalEl.contains(element)).toBe(false);
            expect(element.classList.contains('pixel-banner-confetti-preview-layer')).toBe(true);
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

        it('should use a preview ID that cannot collide with a vault file path', async () => {
            // Check the real constant, not the mocked copy above
            const { PREVIEW_EFFECT_ID } = await vi.importActual('../../../src/core/confettiManager.js');
            // < and > are invalid in file names on every platform Obsidian supports
            expect(PREVIEW_EFFECT_ID).toMatch(/[<>]/);
            // The mock and these tests must use the same id the modal really uses
            expect(PREVIEW_NOTE_ID).toBe(PREVIEW_EFFECT_ID);
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
            modal.modifiedIndicator = { toggleClass: vi.fn() };

            modal.checkIfModified();
            vi.advanceTimersByTime(100);

            expect(confettiManager.start).toHaveBeenCalledTimes(1);
        });

        it('should suppress the note\'s own active effect while previewing (no competing effects)', () => {
            const noteEl = document.createElement('div');
            document.body.appendChild(noteEl);
            app.workspace.getActiveViewOfType = vi.fn().mockReturnValue({
                file: { path: 'test.md' },
                contentEl: noteEl,
                leaf: { id: 'leaf-1' }
            });
            confettiManager.hasActiveEffect.mockReturnValue(true);

            const modal = createModal({ presetName: 'snow', overrides: {} });
            vi.spyOn(modal, 'buildUI').mockImplementation(() => {});
            modal.onOpen();

            expect(confettiManager.stop).toHaveBeenCalledWith('leaf-1', 0);
            noteEl.remove();
        });

        // A note pane whose effect is running, with the real note handler
        // wired up so Cancel goes through the same gates as opening the note
        function useRunningNoteEffect() {
            const noteEl = document.createElement('div');
            document.body.appendChild(noteEl);
            const leaf = { id: 'leaf-1' };
            const view = { file: { path: 'test.md' }, contentEl: noteEl, leaf };
            leaf.view = view;
            app.workspace.getActiveViewOfType = vi.fn().mockReturnValue(view);
            app.metadataCache = {
                getFileCache: vi.fn(() => ({ frontmatter: { 'banner-confetti': 'type: snow, count: 42' } }))
            };
            plugin.handleConfettiForNote = vi.fn((l, fm) => handleConfettiForNote.call(plugin, l, fm));
            confettiManager.hasActiveEffect.mockReturnValue(true);
            return { noteEl, leaf };
        }

        it('should restore the note\'s original effect on cancel', () => {
            const { noteEl, leaf } = useRunningNoteEffect();

            const modal = createModal({ presetName: 'snow', overrides: { count: 42 } });
            vi.spyOn(modal, 'buildUI').mockImplementation(() => {});
            modal.onOpen();
            confettiManager.start.mockClear();

            // Cancel (close without applying)
            modal.onClose();

            expect(plugin.handleConfettiForNote).toHaveBeenCalledWith(leaf, { 'banner-confetti': 'type: snow, count: 42' });
            expect(confettiManager.update).toHaveBeenCalledWith('leaf-1', noteEl, 'snow', { count: 42 }, { filePath: 'test.md' });
            noteEl.remove();
        });

        it('should not restart the note effect on cancel when the gates are closed (mobile or reduced motion)', () => {
            const { noteEl } = useRunningNoteEffect();

            const modal = createModal({ presetName: 'snow', overrides: { count: 42 } });
            vi.spyOn(modal, 'buildUI').mockImplementation(() => {});
            modal.onOpen();
            confettiManager.start.mockClear();
            shouldRunConfetti.mockReturnValue(false);

            modal.onClose();

            expect(plugin.handleConfettiForNote).toHaveBeenCalledTimes(1);
            expect(confettiManager.update).not.toHaveBeenCalled();
            expect(confettiManager.start).not.toHaveBeenCalled();
            noteEl.remove();
        });

        it('should not restore the effect on cancel when the pane now shows another note', () => {
            const { noteEl, leaf } = useRunningNoteEffect();

            const modal = createModal({ presetName: 'snow', overrides: { count: 42 } });
            vi.spyOn(modal, 'buildUI').mockImplementation(() => {});
            modal.onOpen();
            leaf.view.file = { path: 'other.md' };

            modal.onClose();

            expect(plugin.handleConfettiForNote).not.toHaveBeenCalled();
            noteEl.remove();
        });

        it('should NOT restore the old effect after Apply (new effect supersedes it)', () => {
            const noteEl = document.createElement('div');
            document.body.appendChild(noteEl);
            app.workspace.getActiveViewOfType = vi.fn().mockReturnValue({
                file: { path: 'test.md' },
                contentEl: noteEl,
                leaf: { id: 'leaf-1' }
            });
            confettiManager.hasActiveEffect.mockReturnValue(true);

            const modal = createModal({ presetName: 'snow', overrides: {} });
            vi.spyOn(modal, 'buildUI').mockImplementation(() => {});
            modal.onOpen();
            modal.applied = true; // applySettings sets this before closing
            confettiManager.start.mockClear();

            modal.onClose();

            expect(confettiManager.start).not.toHaveBeenCalled();
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
            modal.modifiedIndicator = { toggleClass: vi.fn() };
            modal.selectedPreset = 'none';

            modal.checkIfModified();
            vi.advanceTimersByTime(100);

            expect(confettiManager.start).not.toHaveBeenCalled();
            expect(confettiManager.stop).toHaveBeenCalledWith(PREVIEW_NOTE_ID, 0);
        });
    });

    describe('frontmatter write', () => {
        // Run processFrontMatter's callback against a real object so the test
        // sees what the note ends up holding
        function useFrontmatter(fm) {
            app.fileManager.processFrontMatter.mockImplementation(async (file, fn) => fn(fm));
            plugin.settings.customBannerConfettiField = ['banner-confetti', 'confetti'];
            return fm;
        }

        it('Apply replaces the alias the note already uses and leaves one property', async () => {
            const fm = useFrontmatter({ title: 'x', confetti: 'type: snow', 'banner-confetti': 'type: space' });
            const modal = createModal({ presetName: 'hearts', overrides: {} });
            modal.settings = { ...getPresetDefaults('hearts') };

            await modal.applySettings();

            expect(app.fileManager.processFrontMatter).toHaveBeenCalledTimes(1);
            expect(fm).toEqual({ title: 'x', 'banner-confetti': 'type: hearts' });
        });

        it('Apply writes the second alias when that is the one the note uses', async () => {
            const fm = useFrontmatter({ confetti: 'type: snow' });
            const modal = createModal({ presetName: 'hearts', overrides: {} });
            modal.settings = { ...getPresetDefaults('hearts') };

            await modal.applySettings();

            expect(fm).toEqual({ confetti: 'type: hearts' });
        });

        it('None removes every alias', async () => {
            const fm = useFrontmatter({ title: 'x', confetti: 'type: snow', 'banner-confetti': 'type: space' });
            const modal = createModal({ presetName: 'snow', overrides: {} });
            modal.selectedPreset = 'none';

            await modal.applySettings();

            expect(fm).toEqual({ title: 'x' });
        });

        // A failed write must not look like success: the modal stays open
        // with its edits, says so, and Cancel can still restore the note
        it.each([
            ['a preset', 'hearts'],
            ['None', 'none']
        ])('a failed Apply of %s keeps the modal open and tells the user', async (_label, preset) => {
            app.fileManager.processFrontMatter.mockRejectedValue(new Error('disk full'));
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const modal = createModal({ presetName: 'snow', overrides: {} });
            modal.selectedPreset = preset;
            modal.settings = preset === 'none' ? {} : { ...getPresetDefaults(preset) };
            const closeSpy = vi.spyOn(modal, 'close');

            await modal.applySettings();

            expect(closeSpy).not.toHaveBeenCalled();
            expect(modal.applied).toBe(false);
            expect(Notice).toHaveBeenCalledWith(expect.stringContaining('Could not save confetti settings'));
            errorSpy.mockRestore();
        });
    });

    describe('gates and Apply', () => {
        it('starts the preview as a preview effect', () => {
            const modal = createModal({ presetName: 'confetti', overrides: {} });

            modal.updatePreview();

            expect(confettiManager.start.mock.calls[0][4]).toEqual({ isPreview: true });
        });

        it('does not start the preview when the gates say no (mobile or reduced motion)', () => {
            shouldRunConfetti.mockReturnValue(false);
            const modal = createModal({ presetName: 'confetti', overrides: {} });

            modal.updatePreview();

            expect(shouldRunConfetti).toHaveBeenCalledWith(plugin, expect.objectContaining({ delay: 0 }));
            expect(confettiManager.start).not.toHaveBeenCalled();
            expect(confettiManager.stop).toHaveBeenCalledWith(PREVIEW_NOTE_ID, 0);
        });

        it('Apply stops the preview, then starts the note effect through handleConfettiForNote', async () => {
            const leaf = { id: 'leaf-1' };
            app.workspace.getActiveViewOfType = vi.fn().mockReturnValue({
                file: { path: 'test.md' },
                contentEl: document.createElement('div'),
                leaf
            });
            app.fileManager.processFrontMatter.mockImplementation(async (file, fn) => fn({}));
            plugin.handleConfettiForNote = vi.fn();

            const modal = createModal({ presetName: 'hearts', overrides: {} });
            modal.settings = { ...getPresetDefaults('hearts') };
            await modal.applySettings();

            expect(plugin.handleConfettiForNote).toHaveBeenCalledWith(leaf, { 'banner-confetti': 'type: hearts' });
            const previewStop = confettiManager.stop.mock.calls.findIndex(call => call[0] === PREVIEW_NOTE_ID);
            expect(previewStop).toBeGreaterThanOrEqual(0);
            expect(confettiManager.stop.mock.invocationCallOrder[previewStop])
                .toBeLessThan(plugin.handleConfettiForNote.mock.invocationCallOrder[0]);
            expect(confettiManager.start).not.toHaveBeenCalled();
        });

        it('None stops the note effect by leaf id', async () => {
            app.workspace.getActiveViewOfType = vi.fn().mockReturnValue({
                file: { path: 'test.md' },
                contentEl: document.createElement('div'),
                leaf: { id: 'leaf-1' }
            });
            app.fileManager.processFrontMatter.mockImplementation(async (file, fn) => fn({}));

            const modal = createModal({ presetName: 'snow', overrides: {} });
            modal.selectedPreset = 'none';
            await modal.applySettings();

            expect(confettiManager.stop).toHaveBeenCalledWith('leaf-1');
        });
    });

    describe('editing what it shows (opened with the real UI)', () => {
        let fm;

        beforeEach(() => {
            fm = {};
            app.fileManager.processFrontMatter.mockImplementation(async (file, fn) => fn(fm));
        });

        // Build the real controls, as Obsidian does on open
        function openModal(currentConfig = null) {
            const modal = createModal(currentConfig);
            modal.onOpen();
            return modal;
        }

        describe('light-theme colour hint', () => {
            afterEach(() => {
                document.body.classList.remove('theme-light');
            });

            it('says a white preset draws darker in the light theme', () => {
                document.body.classList.add('theme-light');
                const modal = openModal({ presetName: 'snow', overrides: {} });

                expect(modal.colorSetting.desc).toMatch(/darker colours/);
                modal.close();
            });

            it('says nothing extra in the dark theme', () => {
                const modal = openModal({ presetName: 'snow', overrides: {} });

                expect(modal.colorSetting.desc).not.toMatch(/darker colours/);
                modal.close();
            });

            it('follows the preset dropdown', () => {
                document.body.classList.add('theme-light');
                const modal = openModal({ presetName: 'confetti', overrides: {} });
                expect(modal.colorSetting.desc).not.toMatch(/darker colours/);

                modal.effectDropdown.selectEl.value = 'space';
                modal.effectDropdown.selectEl.dispatchEvent(new Event('change'));

                expect(modal.colorSetting.desc).toMatch(/darker colours/);
                modal.close();
            });
        });

        it('gives the range number boxes and colour inputs an accessible name', () => {
            const modal = openModal({ presetName: 'confetti', overrides: {} });

            const minInputs = [...modal.contentEl.querySelectorAll('input.range-min')];
            const maxInputs = [...modal.contentEl.querySelectorAll('input.range-max')];
            expect(minInputs.length).toBeGreaterThan(0);
            expect(minInputs.length).toBe(maxInputs.length);
            for (const input of minInputs) {
                expect(input.getAttribute('aria-label')).toMatch(/\S minimum$/);
            }
            for (const input of maxInputs) {
                expect(input.getAttribute('aria-label')).toMatch(/\S maximum$/);
            }
            // The label drops the trailing "Range" from the setting name
            expect(minInputs.some(input => /Range/.test(input.getAttribute('aria-label')))).toBe(false);

            const colorInputs = [...modal.colorContainer.querySelectorAll('input[type="color"]')];
            expect(colorInputs.length).toBe(modal.settings.colors.length);
            colorInputs.forEach((input, index) => {
                expect(input.getAttribute('aria-label')).toBe(`Colour ${index + 1}`);
            });
            modal.close();
        });

        const range = (modal, key) => modal.sliderInputRefs[key];

        function key(el, keyName) {
            el.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true }));
        }

        function pointer(el, type, clientX) {
            el.dispatchEvent(new PointerEvent(type, { pointerId: 1, clientX, bubbles: true }));
        }

        function typeInto(input, value, eventName = 'change') {
            input.value = value;
            input.dispatchEvent(new Event(eventName));
        }

        function selectPreset(modal, preset) {
            modal.effectDropdown.selectEl.value = preset;
            modal.effectDropdown.selectEl.dispatchEvent(new Event('change'));
        }

        it.each(getPresetNames())('Apply on an untouched %s preset writes exactly "type: <preset>"', async (preset) => {
            const modal = openModal({ presetName: preset, overrides: {} });

            await modal.applySettings();

            expect(fm).toEqual({ 'banner-confetti': `type: ${preset}` });
        });

        it('preset switch then range edits use the new preset values and never throw', () => {
            const modal = openModal({ presetName: 'snow', overrides: {} });
            selectPreset(modal, 'hearts');

            const hearts = getPresetDefaults('hearts');
            const size = range(modal, 'sizeRange');
            expect(Number(size.minInput.value)).toBeCloseTo(hearts.sizeRange[0]);
            expect(Number(size.maxInput.value)).toBeCloseTo(hearts.sizeRange[1]);

            expect(() => key(size.thumbs[1], 'ArrowRight')).not.toThrow();
            expect(modal.settings.sizeRange[1]).toBeCloseTo(hearts.sizeRange[1] + 0.1);

            // A drag on the new preset's thumb
            vi.spyOn(size.thumbs[0].parentNode, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 100, top: 0, height: 6 });
            expect(() => {
                pointer(size.thumbs[0], 'pointerdown', 0);
                pointer(size.thumbs[0], 'pointermove', 10);
                pointer(size.thumbs[0], 'pointerup', 10);
            }).not.toThrow();
            expect(modal.settings.sizeRange[0]).toBeCloseTo(0.6);
            modal.close();
        });

        it('a range the new preset lacks is reseeded instead of throwing on edit', () => {
            const modal = openModal({ presetName: 'snow', overrides: {} });
            selectPreset(modal, 'confetti');

            const speed = range(modal, 'speedRange');
            expect(Array.isArray(modal.settings.speedRange)).toBe(true);
            expect(() => key(speed.thumbs[1], 'ArrowUp')).not.toThrow();
            expect(modal.uiOnlyKeys.has('speedRange')).toBe(false);
            modal.close();
        });

        it('Reset then edit does not throw and edits the preset values', () => {
            const modal = openModal({ presetName: 'snow', overrides: { sizeRange: [1, 2] } });
            modal.resetToDefaults();

            const size = range(modal, 'sizeRange');
            expect(Number(size.minInput.value)).toBeCloseTo(getPresetDefaults('snow').sizeRange[0]);
            expect(() => key(size.thumbs[0], 'End')).not.toThrow();
            // The min thumb stops at the max thumb
            expect(modal.settings.sizeRange[0]).toBe(modal.settings.sizeRange[1]);
            modal.close();
        });

        it('reopening after Apply shows the same values, and Modified matches from the start', async () => {
            const first = openModal({ presetName: 'snow', overrides: {} });
            expect(first.modifiedIndicator.classList.contains('is-hidden')).toBe(true);
            typeInto(first.sliderInputRefs.count.text.inputEl, '12');
            key(range(first, 'gravityRange').thumbs[1], 'ArrowRight');
            await first.applySettings();

            const config = parseConfettiConfig(fm['banner-confetti']);
            expect(config.overrides.count).toBe(12);

            const second = openModal(config);
            expect(second.sliderInputRefs.count.text.inputEl.value).toBe('12');
            expect(range(second, 'gravityRange').maxInput.value).toBe(range(first, 'gravityRange').maxInput.value);
            expect(second.modifiedIndicator.classList.contains('is-hidden')).toBe(false);
            expect(second.getOverridesFromDefaults()).toEqual(config.overrides);
            second.close();
        });

        it('turning the reduced-motion toggle off writes respectReducedMotion: false', async () => {
            const modal = openModal({ presetName: 'confetti', overrides: {} });
            modal.reducedMotionToggle.toggleEl.checked = false;
            modal.reducedMotionToggle.toggleEl.dispatchEvent(new Event('change'));

            await modal.applySettings();

            expect(fm['banner-confetti']).toBe('type: confetti, respectReducedMotion: false');
        });

        it.each(['snowflakes', 'leaves'])('emoji is written for %s, without commas or spaces', async (preset) => {
            const modal = openModal({ presetName: preset, overrides: {} });
            typeInto(modal.emojiInput.inputEl, '🍂, 🍁');

            await modal.applySettings();

            expect(fm['banner-confetti']).toBe(`type: ${preset}, emoji: 🍂🍁`);
        });

        it('Shape "Default" removes the shape override instead of writing null', async () => {
            const modal = openModal({ presetName: 'snow', overrides: { shapes: ['star'] } });
            modal.shapeDropdown.selectEl.value = '';
            modal.shapeDropdown.selectEl.dispatchEvent(new Event('change'));

            await modal.applySettings();

            expect(fm['banner-confetti']).toBe('type: snow');
        });

        it('a built-in shape picked over a preset custom shape shows in the Shape dropdown', async () => {
            const modal = openModal({ presetName: 'leaves', overrides: { shapes: ['star'] } });

            // buildOptions draws stars, not leaves, for this config
            expect(modal.shapeDropdown.selectEl.value).toBe('star');
            expect(modal.settings.customShapes).toBeNull();

            // Going back to Leaf is a real change and writes it
            modal.shapeDropdown.selectEl.value = 'leaf';
            modal.shapeDropdown.selectEl.dispatchEvent(new Event('change'));
            await modal.applySettings();

            expect(fm['banner-confetti']).toBe('type: leaves');
        });

        it('a picked custom shape still wins over a built-in shape', () => {
            const modal = openModal({ presetName: 'snow', overrides: { customShapes: ['leaf'] } });

            expect(modal.shapeDropdown.selectEl.value).toBe('leaf');
        });

        it('says why the preview is hidden, and clears it once the preview can run', () => {
            shouldRunConfetti.mockReturnValue(false);
            getConfettiBlockReason.mockReturnValue('reduced-motion');
            const modal = openModal({ presetName: 'confetti', overrides: {} });

            expect(confettiManager.start).not.toHaveBeenCalled();
            expect(modal.previewNotice.textContent).toBe('Preview hidden: your system asks for reduced motion');
            expect(modal.previewNotice.classList.contains('is-hidden')).toBe(false);
            expect(modal.contentEl.contains(modal.previewNotice)).toBe(true);

            getConfettiBlockReason.mockReturnValue('mobile');
            modal.updatePreview();
            expect(modal.previewNotice.textContent).toBe('Preview hidden: confetti is turned off on mobile');

            shouldRunConfetti.mockReturnValue(true);
            getConfettiBlockReason.mockReturnValue(null);
            modal.updatePreview();
            expect(confettiManager.start).toHaveBeenCalledTimes(1);
            expect(modal.previewNotice.classList.contains('is-hidden')).toBe(true);
            expect(modal.previewNotice.textContent).toBe('');
            modal.onClose();
        });

        it('float drags and key steps write rounded values', async () => {
            const modal = openModal({ presetName: 'confetti', overrides: {} });
            const drift = range(modal, 'driftRange');
            vi.spyOn(drift.thumbs[1].parentNode, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 300, top: 0, height: 6 });
            pointer(drift.thumbs[1], 'pointerdown', 0);
            pointer(drift.thumbs[1], 'pointermove', 247);
            pointer(drift.thumbs[1], 'pointerup', 247);
            const gravity = range(modal, 'gravityRange');
            for (let i = 0; i < 3; i++) key(gravity.thumbs[1], 'ArrowRight');

            await modal.applySettings();

            // The modal stores step-grid values itself (0.1 steps: one decimal),
            // not only the codec on write
            const onGrid = (v) => expect(String(v)).toMatch(/^-?\d+(\.\d)?$/);
            modal.settings.driftRange.forEach(onGrid);
            modal.settings.gravityRange.forEach(onGrid);
            const value = fm['banner-confetti'];
            expect(value).toContain('driftRange:');
            expect(value).toContain('gravityRange:');
            expect(value).not.toMatch(/\d\.\d{3,}/);
        });

        it('equal range values open by dragging either way', () => {
            const modal = openModal({ presetName: 'confetti', overrides: {} });
            const speed = range(modal, 'speedRange');
            const [start] = modal.settings.speedRange;
            expect(modal.settings.speedRange).toEqual([start, start]);
            vi.spyOn(speed.thumbs[1].parentNode, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 100, top: 0, height: 6 });

            // The max thumb is on top; dragging it left moves the minimum
            pointer(speed.thumbs[1], 'pointerdown', start);
            pointer(speed.thumbs[1], 'pointermove', start - 20);
            pointer(speed.thumbs[1], 'pointerup', start - 20);

            expect(modal.settings.speedRange).toEqual([start - 20, start]);
            modal.close();
        });

        it('a seeded range put back to its start is not written', async () => {
            const modal = openModal({ presetName: 'confetti', overrides: {} });
            const size = range(modal, 'sizeRange');
            key(size.thumbs[1], 'ArrowRight');
            expect(modal.modifiedIndicator.classList.contains('is-hidden')).toBe(false);
            key(size.thumbs[1], 'ArrowLeft');
            expect(modal.modifiedIndicator.classList.contains('is-hidden')).toBe(true);

            await modal.applySettings();

            expect(fm['banner-confetti']).toBe('type: confetti');
        });

        it('emptying the emoji of an emoji preset shows the preset emoji again', () => {
            const presetEmoji = getPresetDefaults('hearts').emoji;
            expect(presetEmoji).toBeTruthy();
            const modal = openModal({ presetName: 'hearts', overrides: {} });
            const input = modal.emojiInput.inputEl;

            typeInto(input, '');
            input.dispatchEvent(new Event('blur'));

            expect(input.value).toBe(presetEmoji);
            expect(modal.getOverridesFromDefaults()).toEqual({});
            modal.close();
        });

        it('None does not stop another note\'s effect', async () => {
            app.workspace.getActiveViewOfType = vi.fn().mockReturnValue({
                file: { path: 'other.md' },
                contentEl: document.createElement('div'),
                leaf: { id: 'leaf-2' }
            });
            const modal = createModal({ presetName: 'snow', overrides: {} });
            modal.selectedPreset = 'none';

            await modal.applySettings();

            // The None write ran, so the negative check below means something
            expect(app.fileManager.processFrontMatter).toHaveBeenCalledTimes(1);
            expect(confettiManager.stop).not.toHaveBeenCalledWith('leaf-2');
        });

        it('out-of-range or non-numeric number boxes snap back to the stored value', () => {
            const modal = openModal({ presetName: 'confetti', overrides: {} });
            const count = modal.sliderInputRefs.count.text.inputEl;

            typeInto(count, '999');
            expect(count.value).toBe('150');
            expect(modal.settings.count).toBe(150);

            typeInto(count, 'abc', 'blur');
            expect(count.value).toBe('150');

            const size = range(modal, 'sizeRange');
            typeInto(size.minInput, '-4');
            expect(size.minInput.value).toBe('0.10');
            expect(modal.settings.sizeRange[0]).toBe(0.1);
            // A min above the max stops at the max
            typeInto(size.minInput, '4.9');
            expect(modal.settings.sizeRange[0]).toBe(modal.settings.sizeRange[1]);
            expect(Number(size.minInput.value)).toBe(modal.settings.sizeRange[0]);
            modal.close();
        });

        it('range thumbs are labelled sliders reachable by keyboard', () => {
            const modal = openModal({ presetName: 'confetti', overrides: {} });
            const [minThumb, maxThumb] = range(modal, 'sizeRange').thumbs;

            expect(minThumb.getAttribute('role')).toBe('slider');
            expect(minThumb.getAttribute('tabindex')).toBe('0');
            expect(minThumb.getAttribute('aria-label')).toBe('Size minimum');
            expect(maxThumb.getAttribute('aria-label')).toBe('Size maximum');
            expect(minThumb.getAttribute('aria-valuemin')).toBe('0.1');
            expect(maxThumb.getAttribute('aria-valuemax')).toBe('5');

            key(maxThumb, 'PageDown');
            expect(maxThumb.getAttribute('aria-valuenow')).toBe(modal.sliderInputRefs.sizeRange.maxInput.value);
            modal.close();
        });

        it('Burst Interval is really disabled unless the effect is continuous', () => {
            const modal = openModal({ presetName: 'confetti', overrides: {} });
            const interval = modal.sliderInputRefs.interval;
            modal.continuousToggle.toggleEl.checked = false;
            modal.continuousToggle.toggleEl.dispatchEvent(new Event('change'));

            expect(interval.slider.sliderEl.disabled).toBe(true);
            expect(interval.text.inputEl.disabled).toBe(true);

            modal.continuousToggle.toggleEl.checked = true;
            modal.continuousToggle.toggleEl.dispatchEvent(new Event('change'));

            expect(interval.slider.sliderEl.disabled).toBe(false);
            expect(interval.text.inputEl.disabled).toBe(false);
            modal.close();
        });

        it('colour add and remove are labelled buttons', () => {
            const modal = openModal({ presetName: 'confetti', overrides: {} });
            const add = modal.colorContainer.querySelector('.add-color');
            const remove = modal.colorContainer.querySelector('.remove-color');

            expect(add.tagName).toBe('BUTTON');
            expect(add.getAttribute('aria-label')).toBe('Add colour');
            expect(remove.tagName).toBe('BUTTON');
            expect(remove.getAttribute('aria-label')).toMatch(/^Remove colour #[0-9a-f]{6}$/i);
            modal.close();
        });

        it('Apply with no active file keeps the modal open with its edits and shows a Notice', async () => {
            app.workspace.getActiveFile.mockReturnValue(null);
            const modal = openModal({ presetName: 'snow', overrides: {} });
            const closeSpy = vi.spyOn(modal, 'close');
            typeInto(modal.sliderInputRefs.count.text.inputEl, '7');

            await modal.applySettings();

            expect(Notice).toHaveBeenCalledWith('Open a note to apply confetti');
            expect(app.fileManager.processFrontMatter).not.toHaveBeenCalled();
            expect(closeSpy).not.toHaveBeenCalled();
            expect(modal.settings.count).toBe(7);
            closeSpy.mockRestore();
            modal.close();
        });

        it('an unknown preset opens as None with a Notice', () => {
            const modal = openModal({ presetName: 'sparklez', overrides: {} });

            expect(modal.selectedPreset).toBe('none');
            expect(modal.unknownPresetName).toBe('sparklez');
            expect(modal.effectDropdown.selectEl.value).toBe('none');
            expect(Notice).toHaveBeenCalledWith('Unknown confetti preset "sparklez"; choose one to replace it');
            modal.close();
        });

        it('the preview layer is a child of containerEl and is removed on close', () => {
            const modal = openModal({ presetName: 'confetti', overrides: {} });
            const layer = modal.previewLayer;

            expect(layer.parentNode).toBe(modal.containerEl);
            expect(modal.modalEl.contains(layer)).toBe(false);

            modal.close();

            expect(layer.parentNode).toBe(null);
            expect(modal.previewLayer).toBe(null);
        });

        it('opening on a note with overrides shows Modified at once', () => {
            const modal = openModal({ presetName: 'snow', overrides: { count: 9 } });

            expect(modal.modifiedIndicator.classList.contains('is-hidden')).toBe(false);
            modal.close();
        });
    });
});
