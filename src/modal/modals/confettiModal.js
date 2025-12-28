import { Modal, Setting, MarkdownView } from 'obsidian';
import confetti from 'canvas-confetti';
import { CONFETTI_PRESETS } from '../../core/confettiPresets';
import { confettiManager } from '../../core/confettiManager';
import { getPresetNames, buildConfettiFrontmatter, hasOverrides, getFullConfig, getPresetDefaults, sanitizeConfig } from '../../utils/confettiUtils';

// ---------------------------
// -- Confetti Settings Modal --
// ---------------------------
export class ConfettiModal extends Modal {
    constructor(app, plugin, currentConfig = null) {
        super(app);
        this.plugin = plugin;
        this.currentConfig = currentConfig; // {presetName, overrides} or null
        this.selectedPreset = currentConfig?.presetName || 'none';
        this.settings = this.initializeSettings();
        this.isModified = false;
        this.sliderInputRefs = {};
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

        this.buildUI();
    }

    onClose() {
        if (this.styleEl && this.styleEl.parentNode) {
            this.styleEl.parentNode.removeChild(this.styleEl);
        }
        const { contentEl } = this;
        contentEl.empty();
    }

    buildUI() {
        const { contentEl } = this;

        // Add modal-specific styles
        this.addStyles();

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
        this.modifiedIndicator.style.display = 'none';

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
                    const displayName = preset.charAt(0).toUpperCase() + preset.slice(1);
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
                            this.updateAllControls();
                        }
                    }
                    this.toggleSettingsSections(value !== 'none');
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

        // Duration (ticks)
        this.createSliderWithInput(section, {
            name: 'Duration',
            desc: 'How long particles live (50-1000 ticks)',
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
            .setName('Colors')
            .setDesc('Click swatch to edit, + to add, X to remove');

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
                const customShapeNames = ['diamond', 'snowflake', 'triangle', 'heart', 'raindrop', 'alien', 'leaf'];
                customShapeNames.forEach(shape => {
                    const displayName = shape.charAt(0).toUpperCase() + shape.slice(1);
                    dropdown.addOption(shape, displayName);
                });
                // Get current shape value
                const currentShape = this.settings.customShapes?.[0] || this.settings.shapes?.[0] || '';
                dropdown.setValue(currentShape);
                dropdown.onChange(value => {
                    if (value === '') {
                        this.settings.customShapes = null;
                        this.settings.shapes = null;
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
                        this.settings.emoji = value || null;
                        this.checkIfModified();
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
                .setValue(this.settings[key])
                .setDynamicTooltip()
                .onChange(value => {
                    this.settings[key] = value;
                    if (textRef) {
                        textRef.setValue(isInteger ? String(Math.round(value)) : value.toFixed(2));
                    }
                    this.checkIfModified();
                });
            sliderRef = slider;
        });

        setting.addText(text => {
            text.setValue(isInteger ? String(Math.round(this.settings[key])) : this.settings[key].toFixed(2))
                .setPlaceholder(String(this.settings[key]));
            text.inputEl.style.width = '70px';
            text.inputEl.type = 'number';
            text.inputEl.step = String(step);
            text.inputEl.min = String(min);
            text.inputEl.max = String(max);
            text.onChange(value => {
                const num = isInteger ? parseInt(value) : parseFloat(value);
                if (!isNaN(num) && num >= min && num <= max) {
                    this.settings[key] = num;
                    if (sliderRef) {
                        sliderRef.setValue(num);
                    }
                    this.checkIfModified();
                }
            });
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

        // Initialize range if not set - use sensible defaults based on min/max
        if (!this.settings[key] || !Array.isArray(this.settings[key]) || this.settings[key].length < 2) {
            // Default to a reasonable range in the middle
            const defaultMin = min + (max - min) * 0.25;
            const defaultMax = min + (max - min) * 0.75;
            this.settings[key] = [defaultMin, defaultMax];
        }

        const rangeContainer = setting.controlEl.createDiv({ cls: 'range-slider-container' });

        // Min input
        const minInput = rangeContainer.createEl('input', {
            type: 'number',
            cls: 'range-input range-min',
            attr: {
                min: String(min),
                max: String(max),
                step: String(step),
                value: isInteger ? String(Math.round(this.settings[key][0])) : this.settings[key][0].toFixed(2)
            }
        });
        minInput.style.width = '70px';

        // Range slider track
        const sliderTrack = rangeContainer.createDiv({ cls: 'range-slider-track' });
        const sliderFill = sliderTrack.createDiv({ cls: 'range-slider-fill' });
        const minThumb = sliderTrack.createDiv({ cls: 'range-thumb range-thumb-min' });
        const maxThumb = sliderTrack.createDiv({ cls: 'range-thumb range-thumb-max' });

        // Max input
        const maxInput = rangeContainer.createEl('input', {
            type: 'number',
            cls: 'range-input range-max',
            attr: {
                min: String(min),
                max: String(max),
                step: String(step),
                value: isInteger ? String(Math.round(this.settings[key][1])) : this.settings[key][1].toFixed(2)
            }
        });
        maxInput.style.width = '70px';

        // Update visual position of thumbs
        const updateThumbPositions = () => {
            const minVal = this.settings[key][0];
            const maxVal = this.settings[key][1];
            const minPercent = ((minVal - min) / (max - min)) * 100;
            const maxPercent = ((maxVal - min) / (max - min)) * 100;
            minThumb.style.left = `${minPercent}%`;
            maxThumb.style.left = `${maxPercent}%`;
            sliderFill.style.left = `${minPercent}%`;
            sliderFill.style.width = `${maxPercent - minPercent}%`;
        };

        updateThumbPositions();

        // Drag handling
        const handleDrag = (thumb, isMin) => {
            let isDragging = false;

            thumb.addEventListener('mousedown', (e) => {
                isDragging = true;
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const rect = sliderTrack.getBoundingClientRect();
                let percent = (e.clientX - rect.left) / rect.width;
                percent = Math.max(0, Math.min(1, percent));

                let value = min + percent * (max - min);
                // Snap to step
                value = Math.round(value / step) * step;
                value = Math.max(min, Math.min(max, value));

                if (isMin) {
                    if (value <= this.settings[key][1]) {
                        this.settings[key][0] = value;
                        minInput.value = isInteger ? String(Math.round(value)) : value.toFixed(2);
                    }
                } else {
                    if (value >= this.settings[key][0]) {
                        this.settings[key][1] = value;
                        maxInput.value = isInteger ? String(Math.round(value)) : value.toFixed(2);
                    }
                }

                updateThumbPositions();
                this.checkIfModified();
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
        };

        handleDrag(minThumb, true);
        handleDrag(maxThumb, false);

        // Input change handlers
        minInput.addEventListener('change', () => {
            let value = isInteger ? parseInt(minInput.value) : parseFloat(minInput.value);
            if (!isNaN(value) && value >= min && value <= this.settings[key][1]) {
                this.settings[key][0] = value;
                updateThumbPositions();
                this.checkIfModified();
            } else {
                minInput.value = isInteger ? String(Math.round(this.settings[key][0])) : this.settings[key][0].toFixed(2);
            }
        });

        maxInput.addEventListener('change', () => {
            let value = isInteger ? parseInt(maxInput.value) : parseFloat(maxInput.value);
            if (!isNaN(value) && value <= max && value >= this.settings[key][0]) {
                this.settings[key][1] = value;
                updateThumbPositions();
                this.checkIfModified();
            } else {
                maxInput.value = isInteger ? String(Math.round(this.settings[key][1])) : this.settings[key][1].toFixed(2);
            }
        });

        // Store references for updating
        this.sliderInputRefs[key] = {
            type: 'range',
            minInput,
            maxInput,
            updateThumbPositions,
            isInteger
        };

        return setting;
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
            swatch.style.backgroundColor = color;

            // Color input (hidden)
            const colorInput = swatch.createEl('input', {
                type: 'color',
                value: color,
                cls: 'color-input-hidden'
            });
            colorInput.addEventListener('input', (e) => {
                this.settings.colors[index] = e.target.value;
                swatch.style.backgroundColor = e.target.value;
                this.checkIfModified();
            });

            // Click swatch to open color picker
            swatch.addEventListener('click', (e) => {
                if (!e.target.classList.contains('remove-color')) {
                    colorInput.click();
                }
            });

            // Remove button
            const removeBtn = swatch.createDiv({ cls: 'remove-color', text: 'X' });
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
        const addBtn = this.colorContainer.createDiv({ cls: 'add-color', text: '+' });
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
        this.settingsSectionsContainer.style.display = show ? 'block' : 'none';
    }

    toggleIntervalSlider(enabled) {
        if (this.intervalSettingEl) {
            const settingItem = this.intervalSettingEl.settingEl;
            if (settingItem) {
                settingItem.style.opacity = enabled ? '1' : '0.5';
                settingItem.style.pointerEvents = enabled ? 'auto' : 'none';
            }
        }
    }

    updateAllControls() {
        // Update all slider/input pairs
        for (const key in this.sliderInputRefs) {
            const ref = this.sliderInputRefs[key];
            if (ref && this.settings[key] !== undefined) {
                if (ref.type === 'range') {
                    // Range slider
                    if (Array.isArray(this.settings[key])) {
                        ref.minInput.value = ref.isInteger ? String(Math.round(this.settings[key][0])) : this.settings[key][0].toFixed(2);
                        ref.maxInput.value = ref.isInteger ? String(Math.round(this.settings[key][1])) : this.settings[key][1].toFixed(2);
                        ref.updateThumbPositions();
                    }
                } else {
                    // Regular slider
                    if (ref.slider) {
                        ref.slider.setValue(this.settings[key]);
                    }
                    if (ref.text) {
                        ref.text.setValue(ref.isInteger ? String(Math.round(this.settings[key])) : this.settings[key].toFixed(2));
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


    checkIfModified() {
        if (this.selectedPreset === 'none') {
            this.isModified = false;
            this.modifiedIndicator.style.display = 'none';
            return;
        }

        const defaults = getPresetDefaults(this.selectedPreset);
        if (!defaults) {
            this.isModified = false;
            this.modifiedIndicator.style.display = 'none';
            return;
        }

        // Compare current settings to defaults
        const overrides = this.getOverridesFromDefaults();
        this.isModified = Object.keys(overrides).length > 0;
        this.modifiedIndicator.style.display = this.isModified ? 'inline' : 'none';
    }

    getOverridesFromDefaults() {
        if (this.selectedPreset === 'none') return {};

        const defaults = getPresetDefaults(this.selectedPreset);
        if (!defaults) return {};

        const overrides = {};

        // Compare each setting to the preset default
        for (const key in this.settings) {
            if (!Object.prototype.hasOwnProperty.call(this.settings, key)) continue;

            // Skip properties not in defaults, but always check 'flat' since it defaults to false
            if (!Object.prototype.hasOwnProperty.call(defaults, key)) {
                // Include 'flat' if it's true (since default is false/tumble)
                if (key === 'flat' && this.settings[key] === true) {
                    overrides[key] = true;
                }
                continue;
            }

            const currentValue = this.settings[key];
            const defaultValue = defaults[key];

            // Handle array comparison (colors)
            if (Array.isArray(currentValue) && Array.isArray(defaultValue)) {
                if (currentValue.length !== defaultValue.length) {
                    overrides[key] = currentValue;
                } else {
                    for (let i = 0; i < currentValue.length; i++) {
                        if (currentValue[i] !== defaultValue[i]) {
                            overrides[key] = currentValue;
                            break;
                        }
                    }
                }
            } else if (currentValue !== defaultValue) {
                overrides[key] = currentValue;
            }
        }

        return overrides;
    }

    resetToDefaults() {
        if (this.selectedPreset === 'none') return;

        const defaults = getPresetDefaults(this.selectedPreset);
        if (defaults) {
            this.settings = { ...defaults };
            this.normalizeColors(this.settings);
            this.updateAllControls();
            this.checkIfModified();
        }
    }

    async applySettings() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            console.log('Pixel Banner: No active file to apply confetti settings');
            this.close();
            return;
        }

        if (this.selectedPreset === 'none') {
            // Remove confetti from frontmatter
            await this.removeConfettiFromFrontmatter(activeFile);
        } else {
            // Build frontmatter value
            const overrides = this.getOverridesFromDefaults();
            const frontmatterValue = buildConfettiFrontmatter(this.selectedPreset, overrides);

            // Update frontmatter
            const confettiFieldName = this.plugin.settings.customBannerConfettiField[0] || 'banner-confetti';
            await this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                fm[confettiFieldName] = frontmatterValue;
            });

            // Trigger confetti render on note
            setTimeout(() => {
                this.triggerConfettiOnNote();
            }, 100);
        }

        this.close();
    }

    async removeConfettiFromFrontmatter(file) {
        const confettiFieldNames = this.plugin.settings.customBannerConfettiField || ['banner-confetti'];
        await this.app.fileManager.processFrontMatter(file, (fm) => {
            // Remove all possible field name variants
            for (const fieldName of confettiFieldNames) {
                if (fieldName in fm) {
                    delete fm[fieldName];
                }
            }
        });

        // Stop any active confetti effect
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView && activeView.file) {
            confettiManager.stop(activeView.file.path);
        }
    }

    triggerConfettiOnNote() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView || !activeView.file) return;

        const noteElement = activeView.contentEl;
        if (!noteElement) return;

        // Start the confetti effect with current settings
        const overrides = this.getOverridesFromDefaults();
        confettiManager.start(activeView.file.path, noteElement, this.selectedPreset, overrides);
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .confetti-modal {
                max-width: 600px;
                padding: 16px;
            }

            .confetti-modal-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 20px;
                border-bottom: 1px solid var(--background-modifier-border);
                padding-bottom: 10px;
            }

            .confetti-modal-title {
                margin: 0;
            }

            .confetti-modal .modified-indicator {
                color: var(--text-warning);
                font-size: 0.9em;
            }

            .confetti-modal .section-header {
                margin-top: 20px;
                margin-bottom: 10px;
                font-weight: bold;
                color: var(--text-muted);
            }

            .confetti-modal .confetti-section {
                margin-bottom: 15px;
            }

            .confetti-modal .color-swatches {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                align-items: center;
            }

            .confetti-modal .color-swatch {
                width: 32px;
                height: 32px;
                border-radius: 4px;
                cursor: pointer;
                border: 2px solid var(--background-modifier-border);
                position: relative;
                transition: transform 0.1s ease;
            }

            .confetti-modal .color-swatch:hover {
                transform: scale(1.1);
            }

            .confetti-modal .color-swatch:hover .remove-color {
                display: flex;
            }

            .confetti-modal .color-input-hidden {
                position: absolute;
                opacity: 0;
                width: 100%;
                height: 100%;
                cursor: pointer;
            }

            .confetti-modal .remove-color {
                display: none;
                position: absolute;
                top: -8px;
                right: -8px;
                width: 18px;
                height: 18px;
                background-color: var(--text-error);
                color: white;
                border-radius: 50%;
                font-size: 10px;
                font-weight: bold;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                z-index: 10;
            }

            .confetti-modal .add-color {
                width: 32px;
                height: 32px;
                border-radius: 4px;
                cursor: pointer;
                border: 2px dashed var(--background-modifier-border);
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 20px;
                color: var(--text-muted);
                transition: all 0.2s ease;
            }

            .confetti-modal .add-color:hover {
                border-color: var(--interactive-accent);
                color: var(--interactive-accent);
                transform: scale(1.1);
            }

            .confetti-modal .confetti-actions {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid var(--background-modifier-border);
            }

            .confetti-modal .confetti-reset-button {
                background-color: var(--background-modifier-border);
                color: var(--text-normal);
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
                margin-right: auto;
            }

            .confetti-modal .confetti-reset-button:hover {
                background-color: var(--background-modifier-border-hover);
            }

            .confetti-modal .confetti-cancel-button {
                background-color: var(--background-modifier-border);
                color: var(--text-normal);
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
            }

            .confetti-modal .confetti-cancel-button:hover {
                background-color: var(--background-modifier-border-hover);
            }

            .confetti-modal .confetti-apply-button {
                background-color: var(--interactive-accent);
                color: var(--text-on-accent);
                padding: 8px 16px;
                border-radius: 4px;
                border: none;
                cursor: pointer;
                font-weight: 500;
            }

            .confetti-modal .confetti-apply-button:hover {
                background-color: var(--interactive-accent-hover);
            }

            /* Range slider styles */
            .confetti-modal .range-slider-container {
                display: flex;
                align-items: center;
                gap: 10px;
                width: 100%;
            }

            .confetti-modal .range-slider-track {
                position: relative;
                flex: 1;
                height: 6px;
                background-color: var(--background-modifier-border);
                border-radius: 3px;
                margin: 0 5px;
            }

            .confetti-modal .range-slider-fill {
                position: absolute;
                height: 100%;
                background-color: var(--interactive-accent);
                border-radius: 3px;
            }

            .confetti-modal .range-thumb {
                position: absolute;
                top: 50%;
                width: 16px;
                height: 16px;
                background-color: var(--interactive-accent);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                cursor: grab;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                transition: transform 0.1s ease;
            }

            .confetti-modal .range-thumb:hover {
                transform: translate(-50%, -50%) scale(1.2);
            }

            .confetti-modal .range-thumb:active {
                cursor: grabbing;
            }

            .confetti-modal .range-input {
                text-align: center;
            }

            /* Mobile responsive */
            @media screen and (max-width: 640px) {
                .confetti-modal .confetti-actions {
                    flex-direction: column;
                }
                .confetti-modal .confetti-reset-button {
                    margin-right: 0;
                }
                .confetti-modal .confetti-actions button {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
        this.styleEl = style;
    }
}
