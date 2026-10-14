import { Modal, Setting, MarkdownView, Notice } from 'obsidian';
import { confettiManager, PREVIEW_EFFECT_ID, shouldRunConfetti, isLightTheme } from '../../core/confettiManager';
import { getPresetNames, getPresetDefaults } from '../../utils/confettiUtils';
import { writeConfettiField, diffFromPreset, serialize, resolvePresetName } from '../../utils/confettiConfig';
import { getCustomShapeNames } from '../../core/confettiShapes';
import { getLightThemeColors } from '../../core/confettiPresets';

// Effect id for the in-modal live preview, shared with confettiManager. Uses
// characters that never appear in a leaf id, so it can't collide with a note's
// effect.
const PREVIEW_NOTE_ID = PREVIEW_EFFECT_ID;

// Debounce for live preview refreshes so slider drags don't restart the
// effect on every mousemove (spec: 50-100ms).
const PREVIEW_DEBOUNCE_MS = 100;

// Decimals in a control step: 0.05 -> 2, 50 -> 0
const stepDecimals = (step) => {
    const text = String(step);
    const dot = text.indexOf('.');
    return dot === -1 ? 0 : text.length - dot - 1;
};

// Snap to the control step and drop binary noise (0.30000000000000004)
const roundToStep = (value, step) => Number((Math.round(value / step) * step).toFixed(stepDecimals(step)));

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Text shown in a number box; values loaded from frontmatter may be strings
const formatValue = (value, isInteger) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '';
    return isInteger ? String(Math.round(num)) : num.toFixed(2);
};

// ---------------------------
// -- Confetti Settings Modal --
// ---------------------------
export class ConfettiModal extends Modal {
    constructor(app, plugin, currentConfig = null) {
        super(app);
        this.plugin = plugin;
        this.targetFile = app.workspace.getActiveFile(); // the note Apply writes to

        // A preset name that doesn't resolve opens as None, so the controls
        // never edit a config that can't be saved
        this.unknownPresetName = null;
        const resolvedPreset = currentConfig?.presetName ? resolvePresetName(currentConfig.presetName) : null;
        if (currentConfig?.presetName && !resolvedPreset) {
            this.unknownPresetName = currentConfig.presetName;
            new Notice(`Unknown confetti preset "${currentConfig.presetName}"; choose one to replace it`);
            currentConfig = null;
        }

        this.currentConfig = currentConfig; // {presetName, overrides} or null
        this.selectedPreset = resolvedPreset || 'none';
        this.settings = this.initializeSettings(); // values shown in the controls
        this.uiOnlyKeys = new Set(); // keys the modal derived (seeded ranges), not chosen by the user
        this.seededRanges = {}; // range key -> the pair seedRange() derived
        this.rangeControls = {}; // range key -> { min, max } of its control
        this.isModified = false;
        this.sliderInputRefs = {};
        this.previewDebounceTimeout = null;
        this.previewLayer = null; // fixed layer the preview draws on
        this.onWindowResize = null;
        this.suppressedNote = null; // {leaf, path, element} of the note effect paused while previewing
        this.applied = false;
    }

    initializeSettings() {
        // If currentConfig exists, merge preset defaults with overrides
        if (this.currentConfig && this.currentConfig.presetName && this.currentConfig.presetName !== 'none') {
            const defaults = getPresetDefaults(this.currentConfig.presetName);
            if (defaults) {
                const settings = {
                    ...defaults,
                    ...(this.currentConfig.overrides || {})
                };
                this.normalizeColors(settings);
                return settings;
            }
        }
        // Otherwise return default state (will be updated when preset is selected)
        return {
            count: 100,
            size: 1.0,
            speed: 45,
            gravity: 1.0,
            spread: 70,
            drift: 0,
            duration: 200,
            delay: 0,
            fadeIn: 0,
            opacity: 1.0,
            continuous: false,
            interval: 1000,
            position: 'center',
            colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
            emoji: null,
            flat: false,
            respectReducedMotion: true
        };
    }

    // Normalize colors to 6-character hex format (strip alpha channel if present)
    normalizeColors(settings) {
        if (settings.colors && Array.isArray(settings.colors)) {
            settings.colors = settings.colors.map(color => {
                if (typeof color !== 'string') return '#ffffff';

                // If it's a hex color with alpha (8 chars + #), strip the alpha
                if (color.match(/^#[0-9a-fA-F]{8}$/)) {
                    return color.substring(0, 7);
                }
                // If it's a valid 6-char hex, keep it
                if (color.match(/^#[0-9a-fA-F]{6}$/)) {
                    return color;
                }
                // If it's a 3-char hex, expand it
                if (color.match(/^#[0-9a-fA-F]{3}$/)) {
                    const r = color[1];
                    const g = color[2];
                    const b = color[3];
                    return `#${r}${r}${g}${g}${b}${b}`;
                }
                // Default fallback
                return '#ffffff';
            });
        }
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('confetti-modal');

        this.suppressNoteEffect();
        this.buildUI();
        this.onWindowResize = () => this.positionPreviewLayer();
        window.addEventListener('resize', this.onWindowResize);
        this.updatePreview();
        // A note that already has overrides opens as modified
        this.updateModifiedIndicator();
    }

    onClose() {
        this.cleanupPreview();
        this.restoreNoteEffect();
        if (this.onWindowResize) {
            window.removeEventListener('resize', this.onWindowResize);
            this.onWindowResize = null;
        }
        const { contentEl } = this;
        contentEl.empty();
    }

    buildUI() {
        const { contentEl } = this;

        // Header section
        const headerContainer = contentEl.createDiv({ cls: 'confetti-modal-header' });
        headerContainer.createEl('h2', {
            text: 'Confetti Effect Settings',
            cls: 'confetti-modal-title'
        });

        // Modified indicator
        this.modifiedIndicator = headerContainer.createSpan({
            cls: 'modified-indicator',
            text: '(modified)'
        });
        this.modifiedIndicator.addClass('is-hidden');

        // Effect Selection
        const effectContainer = contentEl.createDiv({ cls: 'confetti-section' });
        effectContainer.createEl('h4', { text: 'Effect Selection', cls: 'section-header' });

        new Setting(effectContainer)
            .setName('Effect Type')
            .setDesc('Choose a confetti effect preset')
            .addDropdown(dropdown => {
                dropdown.addOption('none', 'None');
                const presets = getPresetNames();
                presets.forEach(preset => {
                    const displayName = preset.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    dropdown.addOption(preset, displayName);
                });
                dropdown.setValue(this.selectedPreset);
                dropdown.onChange(value => {
                    this.selectedPreset = value;
                    if (value !== 'none') {
                        const defaults = getPresetDefaults(value);
                        if (defaults) {
                            this.settings = { ...defaults };
                            this.normalizeColors(this.settings);
                            this.uiOnlyKeys = new Set();
                            this.seededRanges = {};
                            this.seedRangeDefaults();
                            this.updateAllControls();
                        }
                    }
                    this.toggleSettingsSections(value !== 'none');
                    this.updateColorHint();
                    this.checkIfModified();
                });
                this.effectDropdown = dropdown;
            });

        // Settings sections container (hidden when "None" is selected)
        this.settingsSectionsContainer = contentEl.createDiv({ cls: 'confetti-settings-sections' });

        // Build all settings sections
        this.buildParticleSection();
        this.buildAppearanceSection();
        this.buildTimingSection();
        this.buildAccessibilitySection();

        // Toggle visibility based on initial selection
        this.toggleSettingsSections(this.selectedPreset !== 'none');

        // Action buttons
        const actionsContainer = contentEl.createDiv({ cls: 'confetti-actions' });

        const resetButton = actionsContainer.createEl('button', {
            text: 'Reset to Preset Defaults',
            cls: 'confetti-reset-button'
        });
        resetButton.addEventListener('click', () => this.resetToDefaults());

        const cancelButton = actionsContainer.createEl('button', {
            text: 'Cancel',
            cls: 'confetti-cancel-button'
        });
        cancelButton.addEventListener('click', () => this.close());

        const applyButton = actionsContainer.createEl('button', {
            text: 'Apply',
            cls: 'confetti-apply-button'
        });
        applyButton.addEventListener('click', () => this.applySettings());
    }

    buildParticleSection() {
        const section = this.settingsSectionsContainer.createDiv({ cls: 'confetti-section' });
        section.createEl('h4', { text: 'Particle Settings', cls: 'section-header' });

        // Particle Count
        this.createSliderWithInput(section, {
            name: 'Particle Count',
            desc: 'Number of particles per burst (1-150)',
            key: 'count',
            min: 1,
            max: 150,
            step: 1,
            isInteger: true
        });

        // Size Range
        this.createRangeSlider(section, {
            name: 'Size Range',
            desc: 'Min and max size of particles (0.1-5.0)',
            key: 'sizeRange',
            min: 0.1,
            max: 5.0,
            step: 0.1,
            isInteger: false
        });

        // Speed Range
        this.createRangeSlider(section, {
            name: 'Speed Range',
            desc: 'Min and max initial velocity (0-100)',
            key: 'speedRange',
            min: 0,
            max: 100,
            step: 1,
            isInteger: true
        });

        // Gravity Range
        this.createRangeSlider(section, {
            name: 'Gravity Range',
            desc: 'Min and max gravity (-3.0 to 3.0, negative floats up)',
            key: 'gravityRange',
            min: -3.0,
            max: 3.0,
            step: 0.1,
            isInteger: false
        });

        // Drift Range
        this.createRangeSlider(section, {
            name: 'Drift Range',
            desc: 'Min and max horizontal drift (-5.0 to 5.0)',
            key: 'driftRange',
            min: -5.0,
            max: 5.0,
            step: 0.1,
            isInteger: false
        });

        // Duration
        this.createSliderWithInput(section, {
            name: 'Duration',
            desc: 'How long particles stay visible (higher = longer)',
            key: 'duration',
            min: 50,
            max: 1000,
            step: 10,
            isInteger: true
        });

        // Canvas Opacity
        this.createSliderWithInput(section, {
            name: 'Canvas Opacity',
            desc: 'Opacity of the effect (0.1-1.0)',
            key: 'opacity',
            min: 0.1,
            max: 1.0,
            step: 0.05,
            isInteger: false
        });
    }

    buildAppearanceSection() {
        const section = this.settingsSectionsContainer.createDiv({ cls: 'confetti-section' });
        section.createEl('h4', { text: 'Appearance', cls: 'section-header' });

        // Spawn Position
        new Setting(section)
            .setName('Spawn Position')
            .setDesc('Where particles originate from')
            .addDropdown(dropdown => {
                const positions = [
                    'top', 'bottom', 'left', 'right', 'center',
                    'top-left', 'top-right', 'bottom-left', 'bottom-right', 'random'
                ];
                positions.forEach(pos => {
                    const displayName = pos.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                    dropdown.addOption(pos, displayName);
                });
                dropdown.setValue(this.settings.position);
                dropdown.onChange(value => {
                    this.settings.position = value;
                    this.checkIfModified();
                });
                this.positionDropdown = dropdown;
            });

        // Colors
        const colorSetting = new Setting(section)
            .setName('Colors');
        this.colorSetting = colorSetting;
        this.updateColorHint();

        const colorContainer = colorSetting.controlEl.createDiv({ cls: 'color-swatches' });
        this.colorContainer = colorContainer;
        this.renderColorSwatches();

        // Shape
        new Setting(section)
            .setName('Shape')
            .setDesc('Custom shape for particles')
            .addDropdown(dropdown => {
                dropdown.addOption('', 'Default');
                dropdown.addOption('circle', 'Circle');
                dropdown.addOption('square', 'Square');
                dropdown.addOption('star', 'Star');
                // Add custom shapes from confettiShapes
                const customShapeNames = getCustomShapeNames();
                customShapeNames.forEach(shape => {
                    const base = shape.replace(/(\d+)$/, ' $1');
                    const displayName = base.charAt(0).toUpperCase() + base.slice(1);
                    dropdown.addOption(shape, displayName);
                });
                // Get current shape value
                const currentShape = this.settings.customShapes?.[0] || this.settings.shapes?.[0] || '';
                dropdown.selectEl.classList.add('confetti-select');
                dropdown.setValue(currentShape);
                dropdown.onChange(value => {
                    if (value === '') {
                        // Default: drop the override so the preset's own shape applies
                        delete this.settings.customShapes;
                        delete this.settings.shapes;
                    } else if (['circle', 'square', 'star'].includes(value)) {
                        this.settings.shapes = [value];
                        this.settings.customShapes = null;
                    } else {
                        this.settings.customShapes = [value];
                        this.settings.shapes = null;
                    }
                    this.checkIfModified();
                });
                this.shapeDropdown = dropdown;
            });

        // Custom Emoji
        new Setting(section)
            .setName('Custom Emoji')
            .setDesc('Use emoji as particles (overrides shape selection)')
            .addText(text => {
                text.setPlaceholder('e.g., 🍂🍁🍃')
                    .setValue(this.settings.emoji || '')
                    .onChange(value => {
                        // Commas would split the frontmatter pair; whitespace is never an emoji
                        const emoji = (value || '').replace(/[,\s]/g, '');
                        this.settings.emoji = emoji || null;
                        this.checkIfModified();
                    });
                // An emptied field can't remove a preset's own emoji (null is
                // never written), so show the emoji that will still apply
                text.inputEl.addEventListener('blur', () => {
                    const presetEmoji = this.selectedPreset !== 'none' ? getPresetDefaults(this.selectedPreset)?.emoji : null;
                    if (!this.settings.emoji && presetEmoji) {
                        this.settings.emoji = presetEmoji;
                        text.setValue(presetEmoji);
                        this.checkIfModified();
                    }
                });
                this.emojiInput = text;
            });

        // 3D Wobble (flat vs tumble)
        new Setting(section)
            .setName('3D Wobble')
            .setDesc('How particles rotate (only applies to shapes, not emoji)')
            .addDropdown(dropdown => {
                dropdown.addOption('tumble', 'Tumble (3D rotation)');
                dropdown.addOption('flat', 'Flat (no rotation)');
                dropdown.selectEl.classList.add('confetti-select');
                dropdown.setValue(this.settings.flat ? 'flat' : 'tumble');
                dropdown.onChange(value => {
                    this.settings.flat = value === 'flat';
                    this.checkIfModified();
                });
                this.flatDropdown = dropdown;
            });
    }

    buildTimingSection() {
        const section = this.settingsSectionsContainer.createDiv({ cls: 'confetti-section' });
        section.createEl('h4', { text: 'Timing', cls: 'section-header' });

        // Continuous Effect
        new Setting(section)
            .setName('Continuous Effect')
            .setDesc('Keep spawning particles at intervals')
            .addToggle(toggle => {
                toggle.setValue(this.settings.continuous);
                toggle.onChange(value => {
                    this.settings.continuous = value;
                    this.toggleIntervalSlider(value);
                    this.checkIfModified();
                });
                this.continuousToggle = toggle;
            });

        // Burst Interval
        const intervalSetting = this.createSliderWithInput(section, {
            name: 'Burst Interval',
            desc: 'Time between bursts when continuous (50-10000ms)',
            key: 'interval',
            min: 50,
            max: 10000,
            step: 50,
            isInteger: true
        });
        this.intervalSettingEl = intervalSetting;
        this.toggleIntervalSlider(this.settings.continuous);
    }

    buildAccessibilitySection() {
        const section = this.settingsSectionsContainer.createDiv({ cls: 'confetti-section' });
        section.createEl('h4', { text: 'Accessibility', cls: 'section-header' });

        new Setting(section)
            .setName('Disable for reduced motion')
            .setDesc('Respects user preference for reduced motion')
            .addToggle(toggle => {
                toggle.setValue(this.settings.respectReducedMotion !== false);
                toggle.onChange(value => {
                    this.settings.respectReducedMotion = value;
                    this.checkIfModified();
                });
                this.reducedMotionToggle = toggle;
            });
    }

    createSliderWithInput(container, { name, desc, key, min, max, step, isInteger }) {
        const setting = new Setting(container)
            .setName(name)
            .setDesc(desc);

        let sliderRef = null;
        let textRef = null;

        setting.addSlider(slider => {
            slider.setLimits(min, max, step)
                .setValue(Number(this.settings[key]))
                .setDynamicTooltip()
                .onChange(value => {
                    const rounded = roundToStep(Number(value), step);
                    this.settings[key] = rounded;
                    if (textRef) {
                        textRef.setValue(formatValue(rounded, isInteger));
                    }
                    this.checkIfModified();
                });
            sliderRef = slider;
        });

        setting.addText(text => {
            text.setValue(formatValue(this.settings[key], isInteger))
                .setPlaceholder(String(this.settings[key]));
            text.inputEl.addClass('confetti-number-input');
            text.inputEl.type = 'number';
            text.inputEl.step = String(step);
            text.inputEl.min = String(min);
            text.inputEl.max = String(max);
            // Clamp and snap on change or blur, then show exactly what is
            // stored; anything that is not a number reverts to the stored value
            const commit = () => {
                const raw = text.inputEl.value.trim();
                const num = raw === '' ? NaN : parseFloat(raw);
                const stored = Number(this.settings[key]);
                if (!Number.isFinite(num) || num === stored) {
                    text.setValue(formatValue(this.settings[key], isInteger));
                    return;
                }
                const value = clamp(roundToStep(clamp(num, min, max), step), min, max);
                text.setValue(formatValue(value, isInteger));
                if (sliderRef) {
                    sliderRef.setValue(value);
                }
                if (value !== stored) {
                    this.settings[key] = value;
                    this.checkIfModified();
                }
            };
            text.inputEl.addEventListener('change', commit);
            text.inputEl.addEventListener('blur', commit);
            textRef = text;
        });

        // Store references for updating controls
        this.sliderInputRefs[key] = { slider: sliderRef, text: textRef, isInteger };

        return setting;
    }

    createRangeSlider(container, { name, desc, key, min, max, step, isInteger }) {
        const setting = new Setting(container)
            .setName(name)
            .setDesc(desc);

        this.rangeControls[key] = { min, max };
        this.seedRange(key);

        // Number boxes sit beside the label; the track gets its own full-width row
        setting.settingEl.addClass('confetti-range-setting');
        const rangeContainer = setting.controlEl.createDiv({ cls: 'range-slider-container' });
        const label = name.replace(/\s*Range$/, '');
        const inputAttrs = { min: String(min), max: String(max), step: String(step) };
        const minInput = rangeContainer.createEl('input', { type: 'number', cls: 'range-input range-min confetti-number-input', attr: { ...inputAttrs, 'aria-label': `${label} minimum` } });
        const maxInput = rangeContainer.createEl('input', { type: 'number', cls: 'range-input range-max confetti-number-input', attr: { ...inputAttrs, 'aria-label': `${label} maximum` } });

        const trackRow = setting.settingEl.createDiv({ cls: 'range-slider-row' });
        const sliderTrack = trackRow.createDiv({ cls: 'range-slider-track' });
        const sliderFill = sliderTrack.createDiv({ cls: 'range-slider-fill' });
        const createThumb = (cls, ariaLabel) => sliderTrack.createDiv({
            cls: `range-thumb ${cls}`,
            attr: {
                role: 'slider',
                tabindex: '0',
                'aria-label': ariaLabel,
                'aria-valuemin': String(min),
                'aria-valuemax': String(max)
            }
        });
        const thumbs = [
            createThumb('range-thumb-min', `${label} minimum`),
            createThumb('range-thumb-max', `${label} maximum`)
        ];
        const inputs = [minInput, maxInput];

        // The stored pair as numbers; reseeds when a preset switch left no pair
        const currentPair = () => {
            if (!Array.isArray(this.settings[key]) || this.settings[key].length < 2) {
                this.seedRange(key);
            }
            return [Number(this.settings[key][0]), Number(this.settings[key][1])];
        };

        // Show the stored pair in the number boxes, thumbs, fill and ARIA values
        const updateThumbPositions = () => {
            const pair = currentPair();
            const percents = pair.map(value => clamp(((value - min) / (max - min)) * 100, 0, 100));
            pair.forEach((value, index) => {
                inputs[index].value = formatValue(value, isInteger);
                thumbs[index].setCssProps({ '--confetti-thumb-left': `${percents[index]}%` });
                thumbs[index].setAttribute('aria-valuenow', formatValue(value, isInteger));
            });
            sliderFill.setCssProps({
                '--confetti-fill-left': `${percents[0]}%`,
                '--confetti-fill-width': `${percents[1] - percents[0]}%`
            });
        };

        // Clamp to the bounds, snap to the step and stop the thumbs passing
        // each other. Stores a new array so preset and saved override arrays
        // are never mutated.
        const setValue = (index, raw) => {
            const pair = currentPair();
            let value = Number(raw);
            if (!Number.isFinite(value) || value === pair[index]) {
                updateThumbPositions();
                return;
            }
            value = clamp(roundToStep(clamp(value, min, max), step), min, max);
            value = index === 0 ? Math.min(value, pair[1]) : Math.max(value, pair[0]);
            if (value === pair[index]) {
                updateThumbPositions();
                return;
            }
            pair[index] = value;
            this.settings[key] = pair;
            // Back on the seeded pair means back to "not chosen by the user"
            const seed = this.seededRanges[key];
            if (seed && seed[0] === pair[0] && seed[1] === pair[1]) {
                this.uiOnlyKeys.add(key);
            } else {
                this.uiOnlyKeys.delete(key);
            }
            updateThumbPositions();
            this.checkIfModified();
        };

        thumbs.forEach((thumb, index) => {
            // Pointer events cover mouse, touch and pen; capture keeps the drag
            // on this thumb when the pointer leaves it
            let activePointer = null;
            let dragIndex = index;
            const valueAt = (clientX) => {
                const rect = sliderTrack.getBoundingClientRect();
                if (!rect.width) return NaN;
                return min + clamp((clientX - rect.left) / rect.width, 0, 1) * (max - min);
            };
            thumb.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                activePointer = e.pointerId;
                dragIndex = index;
                try {
                    thumb.setPointerCapture(e.pointerId);
                } catch (error) {
                    // Capture is best effort; moves over the thumb still drag it
                }
                thumb.focus();
            });
            thumb.addEventListener('pointermove', (e) => {
                if (activePointer === null || e.pointerId !== activePointer) return;
                const value = valueAt(e.clientX);
                // Equal values stack the thumbs, so the max thumb is the one
                // grabbed; the drag direction decides which value moves
                const pair = currentPair();
                if (pair[0] === pair[1] && Number.isFinite(value)) {
                    if (value < pair[0]) dragIndex = 0;
                    else if (value > pair[1]) dragIndex = 1;
                }
                setValue(dragIndex, value);
            });
            const endDrag = (e) => {
                if (e.pointerId === activePointer) activePointer = null;
            };
            thumb.addEventListener('pointerup', endDrag);
            thumb.addEventListener('pointercancel', endDrag);
            thumb.addEventListener('lostpointercapture', endDrag);

            thumb.addEventListener('keydown', (e) => {
                const value = currentPair()[index];
                const keySteps = {
                    ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step,
                    PageDown: -step * 10, PageUp: step * 10
                };
                let next;
                if (Object.prototype.hasOwnProperty.call(keySteps, e.key)) {
                    next = value + keySteps[e.key];
                } else if (e.key === 'Home') {
                    next = min;
                } else if (e.key === 'End') {
                    next = max;
                } else {
                    return;
                }
                e.preventDefault();
                setValue(index, next);
            });
        });

        // Number boxes: clamp and snap on change or blur; anything that is not
        // a number reverts to the stored value
        inputs.forEach((input, index) => {
            const commit = () => {
                const text = input.value.trim();
                setValue(index, text === '' ? NaN : parseFloat(text));
            };
            input.addEventListener('change', commit);
            input.addEventListener('blur', commit);
        });

        updateThumbPositions();

        // Store references for updating
        this.sliderInputRefs[key] = {
            type: 'range',
            minInput,
            maxInput,
            thumbs,
            updateThumbPositions,
            isInteger
        };

        return setting;
    }

    // Seed a range the preset doesn't define from its singular value
    // (sizeRange from size) so the control has something to show. Seeded
    // ranges are UI-only: they are never written unless the user edits them.
    seedRange(key) {
        const current = this.settings[key];
        if (Array.isArray(current) && current.length >= 2) return;

        const { min, max } = this.rangeControls[key];
        const singularValue = this.settings[key.replace('Range', '')];
        if (typeof singularValue === 'number' && Number.isFinite(singularValue)) {
            this.settings[key] = [singularValue, singularValue];
        } else {
            this.settings[key] = [min + (max - min) * 0.25, min + (max - min) * 0.75];
        }
        this.seededRanges[key] = [...this.settings[key]];
        this.uiOnlyKeys.add(key);
    }

    seedRangeDefaults() {
        for (const key of Object.keys(this.rangeControls)) {
            this.seedRange(key);
        }
    }

    // In the light theme, presets drawn in white use a darker palette while
    // the note sets no colours: say so, since the swatches show the preset's own
    updateColorHint() {
        if (!this.colorSetting) return;
        const usesLightPalette = isLightTheme() && this.selectedPreset !== 'none'
            && !!getLightThemeColors(this.selectedPreset);
        this.colorSetting.setDesc(usesLightPalette
            ? 'Click swatch to edit, + to add, X to remove. In light themes this preset draws in darker colours until you change one.'
            : 'Click swatch to edit, + to add, X to remove');
    }

    renderColorSwatches() {
        this.colorContainer.empty();

        // Ensure colors is an array
        if (!this.settings.colors || !Array.isArray(this.settings.colors)) {
            this.settings.colors = ['#ff0000', '#00ff00', '#0000ff'];
        }

        const colors = this.settings.colors;
        colors.forEach((color, index) => {
            const swatch = this.colorContainer.createDiv({ cls: 'color-swatch' });
            swatch.setCssProps({ '--confetti-swatch-color': color });

            // Color input (transparent, covering exactly this swatch)
            const colorInput = swatch.createEl('input', {
                type: 'color',
                value: color,
                cls: 'color-input-hidden',
                attr: { 'aria-label': `Colour ${index + 1}` }
            });
            colorInput.addEventListener('input', (e) => {
                this.settings.colors[index] = e.target.value;
                swatch.setCssProps({ '--confetti-swatch-color': e.target.value });
                removeBtn.setAttribute('aria-label', `Remove colour ${e.target.value}`);
                this.checkIfModified();
            });

            // The input covers the swatch and opens its own picker; only a
            // click on the swatch's border needs forwarding
            swatch.addEventListener('click', (e) => {
                if (e.target === swatch) {
                    colorInput.click();
                }
            });

            // Remove button
            const removeBtn = swatch.createEl('button', {
                cls: 'remove-color',
                text: 'X',
                attr: { type: 'button', 'aria-label': `Remove colour ${color}` }
            });
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.settings.colors.length > 1) {
                    this.settings.colors.splice(index, 1);
                    this.renderColorSwatches();
                    this.checkIfModified();
                }
            });
        });

        // Add color button
        const addBtn = this.colorContainer.createEl('button', {
            cls: 'add-color',
            text: '+',
            attr: { type: 'button', 'aria-label': 'Add colour' }
        });
        addBtn.addEventListener('click', () => {
            if (!this.settings.colors) {
                this.settings.colors = [];
            }
            this.settings.colors.push('#ffffff');
            this.renderColorSwatches();
            this.checkIfModified();
        });
    }

    toggleSettingsSections(show) {
        this.settingsSectionsContainer.toggleClass('is-hidden', !show);
    }

    toggleIntervalSlider(enabled) {
        if (this.intervalSettingEl) {
            const settingItem = this.intervalSettingEl.settingEl;
            if (settingItem) {
                settingItem.toggleClass('confetti-setting-disabled', !enabled);
            }
        }
        // Really disable the controls, so the keyboard can't change them either
        const ref = this.sliderInputRefs.interval;
        if (ref) {
            if (ref.slider) ref.slider.setDisabled(!enabled);
            if (ref.text) ref.text.setDisabled(!enabled);
        }
    }

    updateAllControls() {
        // Ranges the new settings lack get seeded before the controls read them
        this.seedRangeDefaults();

        // Update all slider/input pairs
        for (const key in this.sliderInputRefs) {
            const ref = this.sliderInputRefs[key];
            if (ref && this.settings[key] !== undefined) {
                if (ref.type === 'range') {
                    // Range slider: number boxes, thumbs and ARIA values
                    ref.updateThumbPositions();
                } else {
                    // Regular slider
                    if (ref.slider) {
                        ref.slider.setValue(this.settings[key]);
                    }
                    if (ref.text) {
                        ref.text.setValue(formatValue(this.settings[key], ref.isInteger));
                    }
                }
            }
        }

        // Update dropdowns
        if (this.positionDropdown) {
            this.positionDropdown.setValue(this.settings.position);
        }

        // Update shape dropdown
        if (this.shapeDropdown) {
            const currentShape = this.settings.customShapes?.[0] || this.settings.shapes?.[0] || '';
            this.shapeDropdown.setValue(currentShape);
        }

        // Update emoji input
        if (this.emojiInput) {
            this.emojiInput.setValue(this.settings.emoji || '');
        }

        // Update toggles
        if (this.continuousToggle) {
            this.continuousToggle.setValue(this.settings.continuous);
            this.toggleIntervalSlider(this.settings.continuous);
        }
        if (this.reducedMotionToggle) {
            this.reducedMotionToggle.setValue(this.settings.respectReducedMotion !== false);
        }

        // Update flat/tumble dropdown
        if (this.flatDropdown) {
            this.flatDropdown.setValue(this.settings.flat ? 'flat' : 'tumble');
        }

        // Re-render color swatches
        this.renderColorSwatches();
    }


    // ----------------------------------------------------------------------
    // Live preview — renders the effect over the modal itself so users can
    // see the result before applying. Reuses confettiManager (under a
    // synthetic note ID) so the preview goes through the exact same code path
    // as the real on-note effect: presets, overrides, sanitizeConfig, shapes,
    // emoji, continuous intervals, and visibility pausing all behave
    // identically.
    // ----------------------------------------------------------------------

    updatePreview() {
        if (this.selectedPreset === 'none') {
            this.cleanupPreview();
            return;
        }
        if (!this.modalEl) return;

        // Same config the Apply button would write, but fire immediately —
        // a preview that honors a long start delay would just look broken.
        const overrides = { ...this.getOverridesFromDefaults(), delay: 0 };
        if (!shouldRunConfetti(this.plugin, overrides)) {
            this.cleanupPreview();
            return;
        }
        confettiManager.start(PREVIEW_NOTE_ID, this.ensurePreviewLayer(), this.selectedPreset, overrides, { isPreview: true });
    }

    // The preview draws on a fixed layer over the modal, outside modalEl
    // (the scroll container), so it stays on screen while the modal scrolls.
    ensurePreviewLayer() {
        if (!this.previewLayer || this.previewLayer.parentNode !== this.containerEl) {
            this.previewLayer = this.containerEl.createDiv({ cls: 'pixel-banner-confetti-preview-layer' });
        }
        // The modal's height changes with the preset (None hides the
        // sections), so match its bounds on every preview start
        this.positionPreviewLayer();
        return this.previewLayer;
    }

    positionPreviewLayer() {
        if (!this.previewLayer || !this.modalEl) return;
        const rect = this.modalEl.getBoundingClientRect();
        this.previewLayer.setCssProps({
            '--confetti-preview-top': `${rect.top}px`,
            '--confetti-preview-left': `${rect.left}px`,
            '--confetti-preview-width': `${rect.width}px`,
            '--confetti-preview-height': `${rect.height}px`
        });
    }

    // Debounced preview refresh; slider drags call this on every change and
    // the preview restarts once the user pauses.
    schedulePreviewUpdate() {
        if (this.previewDebounceTimeout) {
            clearTimeout(this.previewDebounceTimeout);
        }
        this.previewDebounceTimeout = setTimeout(() => {
            this.previewDebounceTimeout = null;
            this.updatePreview();
        }, PREVIEW_DEBOUNCE_MS);
    }

    cleanupPreview() {
        if (this.previewDebounceTimeout) {
            clearTimeout(this.previewDebounceTimeout);
            this.previewDebounceTimeout = null;
        }
        // Immediate stop (no fade) — the modal is closing or the effect was
        // set to None; clears intervals/observers and removes the canvas.
        confettiManager.stop(PREVIEW_NOTE_ID, 0);
        if (this.previewLayer) {
            this.previewLayer.remove();
            this.previewLayer = null;
        }
    }

    // Pause the note's own active effect while the modal is open so the live
    // preview is the only confetti on screen — otherwise the note's applied
    // effect and the preview run side by side and compete visually.
    suppressNoteEffect() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        const leafId = activeView?.leaf?.id;
        if (activeView?.file && leafId && confettiManager.hasActiveEffect(leafId)) {
            this.suppressedNote = { leaf: activeView.leaf, path: activeView.file.path, element: activeView.contentEl };
            confettiManager.stop(leafId, 0);
        }
    }

    // On Cancel, resume the note's original effect that suppressNoteEffect()
    // paused. On Apply this is a no-op: applySettings already started the
    // new effect (or removed it).
    restoreNoteEffect() {
        if (this.applied || !this.suppressedNote) return;
        const { leaf, path, element } = this.suppressedNote;
        this.suppressedNote = null;
        if (!this.currentConfig?.presetName || this.currentConfig.presetName === 'none') return;
        // Guard against the note element having been torn down, or the pane
        // showing another note, while the modal was open
        if (!element || element.isConnected === false) return;
        if (leaf?.view?.file?.path !== path) return;
        if (typeof this.plugin.handleConfettiForNote !== 'function') return;
        // Restart through handleConfettiForNote with the note's own
        // frontmatter so the mobile and reduced-motion gates apply
        const frontmatter = this.app.metadataCache?.getFileCache(leaf.view.file)?.frontmatter;
        this.plugin.handleConfettiForNote(leaf, frontmatter);
    }

    checkIfModified() {
        // Every control change handler funnels through here, so this is the
        // single hook point for live preview refreshes (covers sliders, range
        // thumbs, colors, emoji, dropdowns, toggles, and reset).
        this.schedulePreviewUpdate();
        this.updateModifiedIndicator();
    }

    // Show "(modified)" when the shown values differ from the preset. Split
    // from checkIfModified so onOpen can set it without a second preview start.
    updateModifiedIndicator() {
        const hasPreset = this.selectedPreset !== 'none' && !!getPresetDefaults(this.selectedPreset);
        this.isModified = hasPreset && Object.keys(this.getOverridesFromDefaults()).length > 0;
        if (this.modifiedIndicator) {
            this.modifiedIndicator.toggleClass('is-hidden', !this.isModified);
        }
    }

    getOverridesFromDefaults() {
        if (this.selectedPreset === 'none') return {};

        // The shown values minus the ones the modal derived itself, diffed
        // against the preset: an untouched preset gives {} (writes 'type: x'
        // only). Keys the preset lacks compare against the schema default, so
        // respectReducedMotion: false and emoji are kept for every preset.
        const config = {};
        for (const key of Object.keys(this.settings)) {
            if (this.uiOnlyKeys.has(key)) continue;
            config[key] = this.settings[key];
        }
        return diffFromPreset(this.selectedPreset, config);
    }

    resetToDefaults() {
        if (this.selectedPreset === 'none') return;

        const defaults = getPresetDefaults(this.selectedPreset);
        if (defaults) {
            this.settings = { ...defaults };
            this.normalizeColors(this.settings);
            this.uiOnlyKeys = new Set();
            this.seededRanges = {};
            this.seedRangeDefaults();
            this.updateAllControls();
            this.checkIfModified();
        }
    }

    async applySettings() {
        // The note the modal was opened on; without one, keep the modal and
        // its edits open rather than closing and losing them
        const targetFile = this.targetFile;
        if (!targetFile) {
            new Notice('Open a note to apply confetti');
            return;
        }

        try {
            // Once the write succeeds, either branch supersedes the suppressed
            // note effect, so restoreNoteEffect() must not resurrect the old
            // config on close. A failed write leaves it false.
            if (this.selectedPreset === 'none') {
                // Remove confetti from frontmatter
                await this.removeConfettiFromFrontmatter(targetFile);
                this.applied = true;
            } else {
                // Build frontmatter value
                const overrides = this.getOverridesFromDefaults();
                const frontmatterValue = serialize(this.selectedPreset, overrides);

                // Update frontmatter, replacing whichever alias the note already uses
                await this.app.fileManager.processFrontMatter(targetFile, (fm) => {
                    writeConfettiField(fm, this.plugin.settings, frontmatterValue);
                });
                this.applied = true;

                // Stop the preview before the note effect starts, then trigger
                // confetti on the note through the same gates as opening it
                this.cleanupPreview();
                this.triggerConfettiOnNote(frontmatterValue);
            }
        } catch (error) {
            console.error('Pixel Banner: Error applying confetti settings:', error);
            // Keep the modal and its edits open so the user can retry
            if (!this.applied) {
                new Notice('Could not save confetti settings to the note; your edits are kept, try Apply again');
                return;
            }
        }

        this.close();
    }

    async removeConfettiFromFrontmatter(file) {
        await this.app.fileManager.processFrontMatter(file, (fm) => {
            // Remove all possible field name variants
            writeConfettiField(fm, this.plugin.settings, null);
        });

        // Stop the effect of the pane showing this note; another note's pane
        // is left alone (the metadata change stops any other pane on this file)
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.leaf && activeView.file?.path === file.path) {
            confettiManager.stop(activeView.leaf.id);
        }
    }

    // Start the note's effect from the value just written, through
    // handleConfettiForNote so the mobile and reduced-motion gates apply.
    // The metadata change that follows finds the same config and leaves it.
    triggerConfettiOnNote(frontmatterValue) {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView || !activeView.file || !activeView.leaf) return;
        // Another note took focus behind the modal: the metadata change on the
        // target file starts its effect instead
        if (this.targetFile && activeView.file.path !== this.targetFile.path) return;
        if (typeof this.plugin.handleConfettiForNote !== 'function') return;

        const frontmatter = {};
        writeConfettiField(frontmatter, this.plugin.settings, frontmatterValue);
        this.plugin.handleConfettiForNote(activeView.leaf, frontmatter);
    }
}
