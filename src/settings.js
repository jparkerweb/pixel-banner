import { PluginSettingTab, Setting, FuzzySuggestModal, MarkdownView } from 'obsidian';
import { createExampleSettings } from './settingsTabExample';
import { createAPISettings } from './settingsTabAPISettings';

const DEFAULT_SETTINGS = {
    apiProvider: 'all',
    pexelsApiKey: '',
    pixabayApiKey: '',
    flickrApiKey: '',
    unsplashApiKey: '',
    imageSize: 'medium',
    imageOrientation: 'landscape',
    numberOfImages: 10,
    defaultKeywords: 'nature, abstract, landscape, technology, art, cityscape, wildlife, ocean, mountains, forest, space, architecture, food, travel, science, music, sports, fashion, business, education, health, culture, history, weather, transportation, industry, people, animals, plants, patterns',
    yPosition: 50,
    xPosition: 50,
    customBannerField: ['banner'],
    customYPositionField: ['banner-y, y'],
    customXPositionField: ['banner-x, x'],
    customContentStartField: ['content-start'],
    customImageDisplayField: ['banner-display'],
    customImageRepeatField: ['banner-repeat'],
    customBannerHeightField: ['banner-height'],
    customFadeField: ['banner-fade'],
    customBorderRadiusField: ['banner-radius'],
    customTitleColorField: ['banner-inline-title-color'],
    customBannerShuffleField: ['banner-shuffle'],
    customBannerIconField: ['icon'],
    customBannerIconSizeField: ['icon-size'],
    customBannerIconXPositionField: ['icon-x'],
    customBannerIconOpacityField: ['icon-opacity'],
    customBannerIconColorField: ['icon-color'],
    customBannerIconBackgroundColorField: ['icon-bg-color'],
    customBannerIconPaddingField: ['icon-padding'],
    customBannerIconBorderRadiusField: ['icon-border-radius'],
    customBannerIconVeritalOffsetField: ['icon-y'],
    folderImages: [],
    contentStartPosition: 150,
    imageDisplay: 'cover',
    imageRepeat: false,
    bannerHeight: 350,
    fade: -75,
    borderRadius: 17,
    showPinIcon: true,
    pinnedImageFolder: 'pixel-banner-images',
    showReleaseNotes: true,
    lastVersion: null,
    showRefreshIcon: true,
    showViewImageIcon: false,
    hidePixelBannerFields: false,
    hidePropertiesSectionIfOnlyBanner: false,
    titleColor: 'var(--inline-title-color)',
    enableImageShuffle: false,
    hideEmbeddedNoteTitles: false,
    hideEmbeddedNoteBanners: false,
    showSelectImageIcon: true,
    defaultSelectImagePath: '',
    useShortPath: true,
    bannerGap: 12,
    bannerIconSize: 70,
    bannerIconXPosition: 25,
    bannerIconOpacity: 100,
    bannerIconColor: '',
    bannerIconBackgroundColor: '',
    bannerIconPadding: '0',
    bannerIconBorderRadius: '17',
    bannerIconVeritalOffset: '0',
};

class FolderSuggestModal extends FuzzySuggestModal {
    constructor(app, onChoose) {
        super(app);
        this.onChoose = onChoose;
    }

    getItems() {
        return this.app.vault.getAllLoadedFiles()
            .filter(file => file.children)
            .map(folder => folder.path);
    }

    getItemText(item) {
        return item;
    }

    onChooseItem(item) {
        this.onChoose(item);
    }
}

class FolderImageSetting extends Setting {
    constructor(containerEl, plugin, folderImage, index, onDelete) {
        super(containerEl);
        this.plugin = plugin;
        this.folderImage = folderImage;
        this.index = index;
        this.onDelete = onDelete;

        this.setClass("folder-image-setting");

        this.settingEl.empty();

        const folderImageDeleteContainer = this.settingEl.createDiv('folder-image-delete-container');
        this.addDeleteButton(folderImageDeleteContainer);

        const infoEl = this.settingEl.createDiv("setting-item-info");
        infoEl.createDiv("setting-item-name");
        infoEl.createDiv("setting-item-description");

        this.addFolderInput();
        this.addImageInput();
        this.addImageDisplaySettings();
        this.addYPostionAndContentStart();
        this.addFadeAndBannerHeight();

        const controlEl = this.settingEl.createDiv("setting-item-control full-width-control");
        this.addContentStartInput(controlEl);
        this.addBorderRadiusInput(controlEl);

        const controlEl2 = this.settingEl.createDiv("setting-item-control full-width-control");
        this.addColorSettings(controlEl2);

        // Add banner icon settings
        this.addBannerIconSettings();

        this.addDirectChildrenOnlyToggle();
    }

    addDeleteButton(containerEl) {
        const deleteButton = containerEl.createEl('button', { cls: 'pixel-banner-setting--delete-button' });
        deleteButton.style.marginLeft = '20px';
        deleteButton.style.width = '30px';
        deleteButton.style.height = '30px';
        deleteButton.style.padding = '0';
        deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-trash-2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
        deleteButton.addEventListener('click', async () => {
            this.plugin.settings.folderImages.splice(this.index, 1);
            await this.plugin.saveSettings();
            this.settingEl.remove();
            if (this.onDelete) {
                this.onDelete();
            }
        });
    }

    addFolderInput() {
        const folderInputContainer = this.settingEl.createDiv('folder-input-container');
        
        const folderInput = new Setting(folderInputContainer)
            .setName("Folder Path")
            .addText(text => {
                text.setValue(this.folderImage.folder || "")
                    .onChange(async (value) => {
                        this.folderImage.folder = value;
                        await this.plugin.saveSettings();
                    });
                this.folderInputEl = text.inputEl;
                this.folderInputEl.style.width = '300px';
            });

        folderInput.addButton(button => button
            .setButtonText("Browse")
            .onClick(() => {
                new FolderSuggestModal(this.plugin.app, (chosenPath) => {
                    this.folderImage.folder = chosenPath;
                    this.folderInputEl.value = chosenPath;
                    this.plugin.saveSettings();
                }).open();
            }));

        // Add shuffle toggle and folder input
        const shuffleContainer = this.settingEl.createDiv('shuffle-container');
        const shuffleToggle = new Setting(shuffleContainer)
            .setName("Enable Image Shuffle")
            .setDesc("Randomly select an image from a specified folder each time the note loads")
            .addToggle(toggle => {
                toggle
                    .setValue(this.folderImage.enableImageShuffle || false)
                    .onChange(async (value) => {
                        this.folderImage.enableImageShuffle = value;
                        // Show/hide shuffle folder input based on toggle
                        if (value) {
                            shuffleFolderInput.settingEl.style.display = 'flex';
                            this.imageInputContainer.style.display = 'none';
                        } else {
                            shuffleFolderInput.settingEl.style.display = 'none';
                            this.imageInputContainer.style.display = 'block';
                        }
                        await this.plugin.saveSettings();
                    });
            });

        // Add shuffle folder input
        const shuffleFolderInput = new Setting(shuffleContainer)
            .setName("Image Shuffle Folder")
            .setDesc("Folder containing images to randomly select from")
            .addText(text => {
                text.setValue(this.folderImage.shuffleFolder || "")
                    .onChange(async (value) => {
                        this.folderImage.shuffleFolder = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.style.width = '300px';
            });

        shuffleFolderInput.addButton(button => button
            .setButtonText("Browse")
            .onClick(() => {
                new FolderSuggestModal(this.plugin.app, (chosenPath) => {
                    this.folderImage.shuffleFolder = chosenPath;
                    shuffleFolderInput.controlEl.querySelector('input').value = chosenPath;
                    this.plugin.saveSettings();
                }).open();
            }));

        // Initially hide shuffle folder input if shuffle is disabled
        if (!this.folderImage.enableImageShuffle) {
            shuffleFolderInput.settingEl.style.display = 'none';
        }
    }

    addImageInput() {
        this.imageInputContainer = this.settingEl.createDiv('folder-input-container');
        
        // Hide container if shuffle is enabled
        if (this.folderImage.enableImageShuffle) {
            this.imageInputContainer.style.display = 'none';
        }
        
        const imageInput = new Setting(this.imageInputContainer)
            .setName("Image URL or Keyword")
            .addText(text => {
                text.setValue(this.folderImage.image || "")
                    .onChange(async (value) => {
                        this.folderImage.image = value;
                        await this.plugin.saveSettings();
                    });
                this.imageInputEl = text.inputEl;
                this.imageInputEl.style.width = '306px';
            });
    }

    addImageDisplaySettings(containerEl) {
        const displayContainer = this.settingEl.createDiv('display-and-repeat-container');
        
        const displaySetting = new Setting(displayContainer)
            .setName("Image Display")
            .addDropdown(dropdown => {
                dropdown
                    .addOption('auto', 'Auto')
                    .addOption('cover', 'Cover')
                    .addOption('contain', 'Contain')
                    .setValue(this.folderImage.imageDisplay || 'cover')
                    .onChange(async (value) => {
                        this.folderImage.imageDisplay = value;
                        await this.plugin.saveSettings();
                    });
                dropdown.selectEl.style.marginRight = '20px';
            });

        const repeatSetting = new Setting(displayContainer)
            .setName("repeat")
            .addToggle(toggle => {
                toggle
                    .setValue(this.folderImage.imageRepeat || false)
                    .onChange(async (value) => {
                        this.folderImage.imageRepeat = value;
                        await this.plugin.saveSettings();
                    });
            });

        const toggleEl = repeatSetting.controlEl.querySelector('.checkbox-container');
        if (toggleEl) toggleEl.style.justifyContent = 'flex-start';
    }

    addYPostionAndContentStart() {
        const controlEl = this.settingEl.createDiv("setting-item-control full-width-control");
        this.addYPositionInput(controlEl);
        this.addXPositionInput(controlEl);
    }
    addFadeAndBannerHeight() {
        const controlEl = this.settingEl.createDiv("setting-item-control full-width-control");
        this.addFadeInput(controlEl);
        this.addBannerHeightInput(controlEl);
    }

    addYPositionInput(containerEl) {
        const label = containerEl.createEl('label', { text: 'Y-Position', cls: 'setting-item-name__label' });
        const sliderContainer = containerEl.createEl('div', { cls: 'slider-container' });
        const slider = sliderContainer.createEl('input', {
            type: 'range',
            cls: 'slider',
            attr: {
                min: '0',
                max: '100',
                step: '1'
            }
        });
        slider.value = this.folderImage.yPosition || "50";
        slider.style.width = '100px';
        slider.style.marginLeft = '10px';
        
        const valueDisplay = sliderContainer.createEl('div', { cls: 'slider-value' });
        valueDisplay.style.marginLeft = '10px';
        
        const updateValueDisplay = (value) => {
            valueDisplay.textContent = value;
        };
        
        updateValueDisplay(slider.value);
        
        slider.addEventListener('input', (event) => {
            updateValueDisplay(event.target.value);
        });

        slider.addEventListener('change', async () => {
            this.folderImage.yPosition = parseInt(slider.value);
            await this.plugin.saveSettings();
        });
        
        label.appendChild(sliderContainer);
        containerEl.appendChild(label);
    }

    addXPositionInput(containerEl) {
        const label = containerEl.createEl('label', { text: 'X-Position', cls: 'setting-item-name__label' });
        label.style.marginLeft = '20px';
        const sliderContainer = containerEl.createEl('div', { cls: 'slider-container' });
        const slider = sliderContainer.createEl('input', {
            type: 'range',
            cls: 'slider',
            attr: {
                min: '0',
                max: '100',
                step: '1'
            }
        });
        slider.value = this.folderImage.xPosition || "50";
        slider.style.width = '100px';
        slider.style.marginLeft = '10px';
        
        const valueDisplay = sliderContainer.createEl('div', { cls: 'slider-value' });
        valueDisplay.style.marginLeft = '10px';
        
        const updateValueDisplay = (value) => {
            valueDisplay.textContent = value;
        };
        
        updateValueDisplay(slider.value);
        
        slider.addEventListener('input', (event) => {
            updateValueDisplay(event.target.value);
        });

        slider.addEventListener('change', async () => {
            this.folderImage.xPosition = parseInt(slider.value);
            await this.plugin.saveSettings();
        });
        
        label.appendChild(sliderContainer);
        containerEl.appendChild(label);
    }

    addBannerHeightInput(containerEl) {
        const label = containerEl.createEl('label', { text: 'Banner Height', cls: 'setting-item-name__label' });
        label.style.marginLeft = '20px';
        const heightInput = containerEl.createEl('input', {
            type: 'number',
            attr: {
                min: '100',
                max: '2500'
            }
        });
        heightInput.style.width = '50px';
        heightInput.style.marginLeft = '10px';
        heightInput.value = this.folderImage.bannerHeight || "";
        heightInput.placeholder = String(this.plugin.settings.bannerHeight || 350);
        heightInput.addEventListener('change', async () => {
            let value = heightInput.value ? parseInt(heightInput.value) : null;
            if (value !== null) {
                value = Math.max(100, Math.min(2500, value));
                this.folderImage.bannerHeight = value;
                heightInput.value = value;
            } else {
                delete this.folderImage.bannerHeight;
                heightInput.value = "";
            }
            await this.plugin.saveSettings();
        });

        label.appendChild(heightInput);
        containerEl.appendChild(label);
    }

    addFadeInput(containerEl) {
        const label = containerEl.createEl('label', { text: 'Fade', cls: 'setting-item-name__label' });
        const sliderContainer = containerEl.createEl('div', { cls: 'slider-container' });
        const slider = sliderContainer.createEl('input', {
            type: 'range',
            cls: 'slider',
            attr: {
                min: '-1500',
                max: '100',
                step: '5'
            }
        });
        slider.value = this.folderImage.fade !== undefined ? this.folderImage.fade : "-75";
        slider.style.width = '100px';
        slider.style.marginLeft = '10px';
        
        const valueDisplay = sliderContainer.createEl('div', { cls: 'slider-value' });
        valueDisplay.style.marginLeft = '10px';
        
        const updateValueDisplay = (value) => {
            valueDisplay.textContent = value;
        };
        
        updateValueDisplay(slider.value);
        
        slider.addEventListener('input', (event) => {
            updateValueDisplay(event.target.value);
        });

        slider.addEventListener('change', async () => {
            this.folderImage.fade = parseInt(slider.value);
            await this.plugin.saveSettings();
        });
        
        label.appendChild(sliderContainer);
        containerEl.appendChild(label);
    }

    addColorSettings(containerEl) {
        const colorContainer = containerEl.createDiv('color-settings-container');
        
        // Inline Title Color
        new Setting(colorContainer)
            .setName("Inline Title Color")
            .addColorPicker(color => color
                .setValue((() => {
                    const currentColor = this.folderImage.titleColor || this.plugin.settings.titleColor;
                    
                    if (currentColor.startsWith('var(--')) {
                        const temp = document.createElement('div');
                        temp.style.color = currentColor;
                        document.body.appendChild(temp);
                        const computedColor = getComputedStyle(temp).color;
                        document.body.removeChild(temp);
                        
                        // Parse RGB values
                        const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                        if (rgbMatch) {
                            const [_, r, g, b] = rgbMatch;
                            const hexColor = '#' + 
                                parseInt(r).toString(16).padStart(2, '0') +
                                parseInt(g).toString(16).padStart(2, '0') +
                                parseInt(b).toString(16).padStart(2, '0');
                            return hexColor;
                        }
                        return '#000000';
                    }
                    return currentColor;
                })())
                .onChange(async (value) => {
                    this.folderImage.titleColor = value;
                    await this.plugin.saveSettings();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    // Reset to the general settings color
                    this.folderImage.titleColor = this.plugin.settings.titleColor;
                    await this.plugin.saveSettings();
                    
                    // Update color picker to show computed value
                    const colorPickerEl = button.extraSettingsEl.parentElement.querySelector('input[type="color"]');
                    if (colorPickerEl) {
                        const currentColor = this.plugin.settings.titleColor;
                        if (currentColor.startsWith('var(--')) {
                            const temp = document.createElement('div');
                            temp.style.color = currentColor;
                            document.body.appendChild(temp);
                            const computedColor = getComputedStyle(temp).color;
                            document.body.removeChild(temp);
                            
                            const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                            if (rgbMatch) {
                                const [_, r, g, b] = rgbMatch;
                                const hexColor = '#' + 
                                    parseInt(r).toString(16).padStart(2, '0') +
                                    parseInt(g).toString(16).padStart(2, '0') +
                                    parseInt(b).toString(16).padStart(2, '0');
                                colorPickerEl.value = hexColor;
                            }
                        } else {
                            colorPickerEl.value = currentColor;
                        }
                    }
                }));
    }

    addDirectChildrenOnlyToggle() {
        new Setting(this.settingEl)
            .setName("Direct Children Only")
            .setDesc("Apply banner only to direct children of the folder")
            .addToggle(toggle => {
                toggle
                    .setValue(this.folderImage.directChildrenOnly || false)
                    .onChange(async (value) => {
                        this.folderImage.directChildrenOnly = value;
                        await this.plugin.saveSettings();
                    });
            });
    }

    addContentStartInput(containerEl) {
        const label = containerEl.createEl('label', { text: 'Content Start', cls: 'setting-item-name__label' });
        label.style.marginRight = '20px';

        const contentStartInput = containerEl.createEl('input', {
            type: 'number',
            attr: {
                min: '0'
            }
        });
        contentStartInput.style.width = '50px';
        contentStartInput.style.marginLeft = '10px';
        contentStartInput.value = this.folderImage.contentStartPosition || "150";
        contentStartInput.addEventListener('change', async () => {
            this.folderImage.contentStartPosition = parseInt(contentStartInput.value);
            await this.plugin.saveSettings();
        });

        label.appendChild(contentStartInput);
        containerEl.appendChild(label);
    }

    addBorderRadiusInput(containerEl) {
        const label = containerEl.createEl('label', { text: 'Border Radius', cls: 'setting-item-name__label' });
        const radiusInput = containerEl.createEl('input', {
            type: 'number',
            attr: {
                min: '0',
                max: '50'
            }
        });
        radiusInput.style.width = '50px';
        radiusInput.style.marginLeft = '10px';
        // Use nullish coalescing to properly handle 0
        radiusInput.value = this.folderImage.borderRadius ?? "";
        radiusInput.placeholder = String(this.plugin.settings.borderRadius || 17);
        radiusInput.addEventListener('change', async () => {
            let value = radiusInput.value ? parseInt(radiusInput.value) : null;
            if (value !== null) {
                value = Math.max(0, Math.min(50, value));
                this.folderImage.borderRadius = value;
                radiusInput.value = String(value);
            } else {
                delete this.folderImage.borderRadius;
                radiusInput.value = "";
            }
            await this.plugin.saveSettings();
        });

        label.appendChild(radiusInput);
        containerEl.appendChild(label);
    }

    addBannerIconSettings() {
        const controlEl1 = this.settingEl.createDiv("setting-item-control full-width-control");

        // Banner Icon Size
        new Setting(controlEl1)
            .setName("Icon Size")
            .addSlider(slider => slider
                .setLimits(10, 200, 1)
                .setValue(this.folderImage.bannerIconSize || this.plugin.settings.bannerIconSize)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.folderImage.bannerIconSize = value;
                    await this.plugin.saveSettings();
                }));

        // Banner Icon X Position
        new Setting(controlEl1)
            .setName("Icon X Position")
            .addSlider(slider => slider
                .setLimits(0, 100, 1)
                .setValue(this.folderImage.bannerIconXPosition || this.plugin.settings.bannerIconXPosition)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.folderImage.bannerIconXPosition = value;
                    await this.plugin.saveSettings();
                }));

        const controlEl2 = this.settingEl.createDiv("setting-item-control full-width-control");

        // Banner Icon Opacity
        new Setting(controlEl2)
            .setName("Icon Opacity")
            .addSlider(slider => slider
                .setLimits(0, 100, 1)
                .setValue(this.folderImage.bannerIconOpacity || this.plugin.settings.bannerIconOpacity)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.folderImage.bannerIconOpacity = value;
                    await this.plugin.saveSettings();
                }));

        // Banner Icon Color
        new Setting(controlEl2)
            .setName("Icon Color")
            .addText(text => {
                text
                    .setPlaceholder('(e.g., #ffffff or white)')
                    .setValue(this.folderImage.bannerIconColor || this.plugin.settings.bannerIconColor)
                    .onChange(async (value) => {
                        this.folderImage.bannerIconColor = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.style.width = '160px';
            });

        const controlEl3 = this.settingEl.createDiv("setting-item-control full-width-control");

        // Banner Icon Background Color
        new Setting(controlEl3)
            .setName("Icon BG Color")
            .addText(text => {
                text
                    .setPlaceholder('(e.g., #ffffff or transparent)')
                    .setValue(this.folderImage.bannerIconBackgroundColor || this.plugin.settings.bannerIconBackgroundColor)
                    .onChange(async (value) => {
                        this.folderImage.bannerIconBackgroundColor = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.style.width = '160px';
            });

        // Banner Icon Padding
        new Setting(controlEl3)
            .setName("Icon Padding")
            .addSlider(slider => slider
                .setLimits(0, 100, 1)
                .setValue(this.folderImage.bannerIconPadding || this.plugin.settings.bannerIconPadding)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.folderImage.bannerIconPadding = value;
                    await this.plugin.saveSettings();
                }));

        const controlEl4 = this.settingEl.createDiv("setting-item-control full-width-control");

        // Banner Icon Border Radius
        new Setting(controlEl4)
            .setName("Icon Border Radius")
            .addSlider(slider => slider
                .setLimits(0, 50, 1)
                .setValue(this.folderImage.bannerIconBorderRadius || this.plugin.settings.bannerIconBorderRadius)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.folderImage.bannerIconBorderRadius = value;
                    await this.plugin.saveSettings();
                }));

        // Banner Icon Vertical Offset
        new Setting(controlEl4)
            .setName("Icon Vertical Offset")
            .addSlider(slider => slider
                .setLimits(-100, 100, 1)
                .setValue(this.folderImage.bannerIconVeritalOffset || this.plugin.settings.bannerIconVeritalOffset)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.folderImage.bannerIconVeritalOffset = value;
                    await this.plugin.saveSettings();
                }));
    }
}

// Helper functions
function arrayToString(arr) {
    return Array.isArray(arr) ? arr.join(', ') : arr;
}

function stringToArray(str) {
    return str.split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

function validateFieldNames(settings, allFields, currentField, newNames) {
    // Check for valid characters in field names (alphanumeric, dashes, underscores only)
    const validNamePattern = /^[a-zA-Z0-9_-]+$/;
    const invalidNames = newNames.filter(name => !validNamePattern.test(name));
    if (invalidNames.length > 0) {
        return {
            isValid: false,
            message: `Invalid characters in field names (only letters, numbers, dashes, and underscores allowed): ${invalidNames.join(', ')}`
        };
    }

    // Then check for duplicates
    const otherFields = allFields.filter(f => f !== currentField);
    const otherFieldNames = otherFields.flatMap(f => settings[f]);
    const duplicates = newNames.filter(name => otherFieldNames.includes(name));
    
    if (duplicates.length > 0) {
        return {
            isValid: false,
            message: `Duplicate field names found: ${duplicates.join(', ')}`
        };
    }
    
    return { isValid: true };
}

function migrateSettings(settings) {
    const fieldsToMigrate = [
        'customBannerField',
        'customYPositionField',
        'customXPositionField',
        'customContentStartField',
        'customImageDisplayField',
        'customImageRepeatField'
    ];

    fieldsToMigrate.forEach(field => {
        if (typeof settings[field] === 'string') {
            settings[field] = [settings[field]];
        }
    });

    return settings;
}

class PixelBannerPlugin extends Plugin {
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.settings = migrateSettings(this.settings);
        
        if (!Array.isArray(this.settings.folderImages)) {
            this.settings.folderImages = [];
        }

        if (this.settings.folderImages) {
            this.settings.folderImages.forEach(folderImage => {
                folderImage.imageDisplay = folderImage.imageDisplay || 'cover';
                folderImage.imageRepeat = folderImage.imageRepeat || false;
            });
        }
    }
}

class PixelBannerSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('pixel-banner-settings');

        const mainContent = containerEl.createEl('div', { cls: 'pixel-banner-main-content' });

        // Create tabs in the desired order
        const { tabsEl, tabContentContainer } = this.createTabs(mainContent, [
            'General',
            'Custom Field Names',
            'Folder Images',
            'API Settings',
            'Examples'
        ]);

        // General tab content
        const generalTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': 'General' } });
        this.createGeneralSettings(generalTab);

        // Custom Fields tab content
        const customFieldsTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': 'Custom Field Names' } });
        this.createCustomFieldsSettings(customFieldsTab);

        // API Settings tab content
        const apiTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': 'API Settings' } });
        createAPISettings(apiTab, this.plugin);

        // Folder Images tab content
        const foldersTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': 'Folder Images' } });
        this.createFolderSettings(foldersTab);

        // Examples tab content
        const examplesTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': 'Examples' } });
        createExampleSettings(examplesTab, this.plugin);

        // Activate the General tab by default
        tabsEl.firstChild.click();
    }

    createTabs(containerEl, tabNames) {
        const tabsEl = containerEl.createEl('div', { cls: 'pixel-banner-settings-tabs' });
        const tabContentContainer = containerEl.createEl('div', { cls: 'pixel-banner-settings-tab-content-container' });

        tabNames.forEach(tabName => {
            const tabEl = tabsEl.createEl('button', { cls: 'pixel-banner-settings-tab', text: tabName });
            tabEl.addEventListener('click', () => {
                // Deactivate all tabs
                tabsEl.querySelectorAll('.pixel-banner-settings-tab').forEach(tab => tab.removeClass('active'));
                tabContentContainer.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');

                // Activate clicked tab
                tabEl.addClass('active');
                tabContentContainer.querySelector(`.tab-content[data-tab="${tabName}"]`).style.display = 'flex';
            });
        });

        return { tabsEl, tabContentContainer };
    }

    createGeneralSettings(containerEl) {
        // section callout
        const calloutEl = containerEl.createEl('div', { cls: 'tab-callout' });
        calloutEl.createEl('div', { text: 'Configure default settings for all notes. These can be overridden per folder or per note.' });

        // Image Vertical Position setting
        new Setting(containerEl)
            .setName('Image Vertical Position')
            .setDesc('Set the vertical position of the image (0-100)')
            .addSlider(slider => slider
                .setLimits(0, 100, 1)
                .setValue(this.plugin.settings.yPosition)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.yPosition = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                })
            )
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.yPosition = DEFAULT_SETTINGS.yPosition;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                    // Update the slider value
                    const sliderEl = button.extraSettingsEl.parentElement.querySelector('.slider');
                    sliderEl.value = DEFAULT_SETTINGS.yPosition;
                    sliderEl.dispatchEvent(new Event('input'));
                }));

        // Image Horizontal Position setting
        new Setting(containerEl)
            .setName('Image Horizontal Position')
            .setDesc('Set the horizontal position of the image (0-100)')
            .addSlider(slider => slider
                .setLimits(0, 100, 1)
                .setValue(this.plugin.settings.xPosition)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.xPosition = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                })
            )
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.xPosition = DEFAULT_SETTINGS.xPosition;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                    // Update the slider value
                    const sliderEl = button.extraSettingsEl.parentElement.querySelector('.slider');
                    sliderEl.value = DEFAULT_SETTINGS.xPosition;
                    sliderEl.dispatchEvent(new Event('input'));
                }));

        // Content Start Position setting
        new Setting(containerEl)
            .setName('Content Start Position')
            .setDesc('Set the default vertical position where the content starts (in pixels)')
            .addText(text => text
                .setPlaceholder('150')
                .setValue(String(this.plugin.settings.contentStartPosition))
                .onChange(async (value) => {
                    const numValue = Number(value);
                    if (!isNaN(numValue) && numValue >= 0) {
                        this.plugin.settings.contentStartPosition = numValue;
                        await this.plugin.saveSettings();
                        this.plugin.updateAllBanners();
                    }
                }))
            .then(setting => {
                const inputEl = setting.controlEl.querySelector('input');
                inputEl.type = 'number';
                inputEl.min = '0';
                inputEl.style.width = '60px';
            })
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.contentStartPosition = DEFAULT_SETTINGS.contentStartPosition;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                    // Update the input value
                    const inputEl = button.extraSettingsEl.parentElement.querySelector('input');
                    inputEl.value = DEFAULT_SETTINGS.contentStartPosition;
                    inputEl.dispatchEvent(new Event('input'));
                }));

        // Image Display setting
        new Setting(containerEl)
            .setName('Image Display')
            .setDesc('Set how the banner image should be displayed')
            .addDropdown(dropdown => {
                dropdown
                    .addOption('auto', 'Auto')
                    .addOption('cover', 'Cover')
                    .addOption('contain', 'Contain')
                    .setValue(this.plugin.settings.imageDisplay || 'cover')
                    .onChange(async (value) => {
                        this.plugin.settings.imageDisplay = value;
                        await this.plugin.saveSettings();
                        this.plugin.updateAllBanners();
                    });
                return dropdown;
            })
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.imageDisplay = DEFAULT_SETTINGS.imageDisplay;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                    const dropdownEl = button.extraSettingsEl.parentElement.querySelector('select');
                    dropdownEl.value = DEFAULT_SETTINGS.imageDisplay;
                    dropdownEl.dispatchEvent(new Event('change'));
                }));

        // Image Repeat setting
        new Setting(containerEl)
            .setName('Image Repeat')
            .setDesc('Enable image repetition when "Contain" is selected')
            .addToggle(toggle => {
                toggle
                    .setValue(this.plugin.settings.imageRepeat)
                    .onChange(async (value) => {
                        this.plugin.settings.imageRepeat = value;
                        await this.plugin.saveSettings();
                        this.plugin.updateAllBanners();
                    });
                return toggle;
            })
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.imageRepeat = DEFAULT_SETTINGS.imageRepeat;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();

                    const checkboxContainer = button.extraSettingsEl.parentElement.querySelector('.checkbox-container');
                    const toggleEl = checkboxContainer.querySelector('input');
                    if (toggleEl) {
                        toggleEl.checked = DEFAULT_SETTINGS.imageRepeat;
                        checkboxContainer.classList.toggle('is-enabled', DEFAULT_SETTINGS.imageRepeat);
                        const event = new Event('change', { bubbles: true });
                        toggleEl.dispatchEvent(event);
                    }
                }));

        // Banner Height setting
        new Setting(containerEl)
            .setName('Banner Height')
            .setDesc('Set the default height of the banner image (100-2500 pixels)')
            .addText(text => {
                text.setPlaceholder('350')
                    .setValue(String(this.plugin.settings.bannerHeight))
                    .onChange(async (value) => {
                        // Allow any input, including empty string
                        if (value === '' || !isNaN(Number(value))) {
                            await this.plugin.saveSettings();
                        }
                    });
                
                // Add event listener for 'blur' event
                text.inputEl.addEventListener('blur', async (event) => {
                    let numValue = Number(event.target.value);
                    if (isNaN(numValue) || event.target.value === '') {
                        // If the value is not a number or is empty, set to default
                        numValue = 350;
                    } else {
                        // Ensure value is between 100 and 2500
                        numValue = Math.max(100, Math.min(2500, numValue));
                    }
                    this.plugin.settings.bannerHeight = numValue;
                    text.setValue(String(numValue));
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                });

                text.inputEl.type = 'number';
                text.inputEl.min = '100';
                text.inputEl.max = '2500';
                text.inputEl.style.width = '50px';
            })
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.bannerHeight = DEFAULT_SETTINGS.bannerHeight;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                    // Update the input value
                    const inputEl = button.extraSettingsEl.parentElement.querySelector('input');
                    inputEl.value = DEFAULT_SETTINGS.bannerHeight;
                    inputEl.dispatchEvent(new Event('input'));
                }));

        // Banner Fade setting
        new Setting(containerEl)
            .setName('Banner Fade')
            .setDesc('Set the default fade effect for the banner image (-1500 to 100)')
            .addSlider(slider => slider
                .setLimits(-1500, 100, 5)
                .setValue(this.plugin.settings.fade)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.fade = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                })
            )
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.fade = DEFAULT_SETTINGS.fade;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                    // Update the slider value
                    const sliderEl = button.extraSettingsEl.parentElement.querySelector('.slider');
                    sliderEl.value = DEFAULT_SETTINGS.fade;
                    sliderEl.dispatchEvent(new Event('input'));
                }));

        // Border Radius setting
        new Setting(containerEl)
            .setName('Border Radius')
            .setDesc('Set the default border radius of the banner image (0-50 pixels)')
            .addText(text => {
                text.setPlaceholder('17')
                    .setValue(String(this.plugin.settings.borderRadius))
                    .onChange(async (value) => {
                        const numValue = Number(value);
                        if (!isNaN(numValue)) {
                            this.plugin.settings.borderRadius = Math.max(0, Math.min(50, numValue));
                            await this.plugin.saveSettings();
                            this.plugin.updateAllBanners();
                        }
                    });
                text.inputEl.type = 'number';
                text.inputEl.min = '0';
                text.inputEl.max = '50';
                text.inputEl.style.width = '50px';
            })
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.borderRadius = DEFAULT_SETTINGS.borderRadius;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                    // Update the input value
                    const inputEl = button.extraSettingsEl.parentElement.querySelector('input');
                    inputEl.value = DEFAULT_SETTINGS.borderRadius;
                    inputEl.dispatchEvent(new Event('input'));
                }));

        // Banner Gap setting
        new Setting(containerEl)
            .setName('Banner Gap')
            .setDesc('Set the gap between the banner and the window edges (0-50 pixels)')
            .addSlider(slider => slider
                .setLimits(0, 50, 1)
                .setValue(this.plugin.settings.bannerGap)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.bannerGap = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                })
            )
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.bannerGap = DEFAULT_SETTINGS.bannerGap;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                    // Update the slider value
                    const sliderEl = button.extraSettingsEl.parentElement.querySelector('.slider');
                    sliderEl.value = DEFAULT_SETTINGS.bannerGap;
                    sliderEl.dispatchEvent(new Event('input'));
                }));

        // Inline Title Color setting
        new Setting(containerEl)
            .setName('Inline Title Color')
            .setDesc('Set the default inline title color for all banners')
            .addColorPicker(color => color
                .setValue((() => {
                    const currentColor = this.plugin.settings.titleColor;
                    if (currentColor.startsWith('var(--')) {
                        const temp = document.createElement('div');
                        temp.style.color = currentColor;
                        document.body.appendChild(temp);
                        const computedColor = getComputedStyle(temp).color;
                        document.body.removeChild(temp);
                        
                        // Parse RGB values
                        const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                        if (rgbMatch) {
                            const [_, r, g, b] = rgbMatch;
                            const hexColor = '#' + 
                                parseInt(r).toString(16).padStart(2, '0') +
                                parseInt(g).toString(16).padStart(2, '0') +
                                parseInt(b).toString(16).padStart(2, '0');
                            return hexColor;
                        }
                        return '#000000';
                    }
                    return currentColor;
                })())
                .onChange(async (value) => {
                    this.plugin.settings.titleColor = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.titleColor = DEFAULT_SETTINGS.titleColor;
                    await this.plugin.saveSettings();
                    
                    // Update color picker to show computed value
                    const colorPickerEl = button.extraSettingsEl.parentElement.querySelector('input[type="color"]');
                    if (colorPickerEl) {
                        const temp = document.createElement('div');
                        temp.style.color = DEFAULT_SETTINGS.titleColor;
                        document.body.appendChild(temp);
                        const computedColor = getComputedStyle(temp).color;
                        document.body.removeChild(temp);
                        
                        const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                        if (rgbMatch) {
                            const [_, r, g, b] = rgbMatch;
                            const hexColor = '#' + 
                                parseInt(r).toString(16).padStart(2, '0') +
                                parseInt(g).toString(16).padStart(2, '0') +
                                parseInt(b).toString(16).padStart(2, '0');
                            colorPickerEl.value = hexColor;
                        }
                    }
                }));
        
        // Add hide embedded note titles setting
        const hideEmbeddedNoteTitlesSetting = new Setting(containerEl)
            .setName('Hide Embedded Note Titles')
            .setDesc('Hide titles of embedded notes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.hideEmbeddedNoteTitles)
                .onChange(async (value) => {
                    this.plugin.settings.hideEmbeddedNoteTitles = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateEmbeddedTitlesVisibility();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.hideEmbeddedNoteTitles = DEFAULT_SETTINGS.hideEmbeddedNoteTitles;
                    await this.plugin.saveSettings();
                    
                    const toggleComponent = hideEmbeddedNoteTitlesSetting.components[0];
                    if (toggleComponent) {
                        toggleComponent.setValue(DEFAULT_SETTINGS.hideEmbeddedNoteTitles);
                    }
                    
                    this.plugin.updateEmbeddedTitlesVisibility();
                }));

        // Add hide embedded note banners setting
        const hideEmbeddedNoteBannersSetting = new Setting(containerEl)
            .setName('Hide Embedded Note Banners')
            .setDesc('Hide banners of embedded notes')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.hideEmbeddedNoteBanners)
                .onChange(async (value) => {
                    this.plugin.settings.hideEmbeddedNoteBanners = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateEmbeddedBannersVisibility();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.hideEmbeddedNoteBanners = DEFAULT_SETTINGS.hideEmbeddedNoteBanners;
                    await this.plugin.saveSettings();
                    
                    const toggleComponent = hideEmbeddedNoteBannersSetting.components[0];
                    if (toggleComponent) {
                        toggleComponent.setValue(DEFAULT_SETTINGS.hideEmbeddedNoteBanners);
                    }
                    
                    this.plugin.updateEmbeddedBannersVisibility();
                }));

        // Create a group for the hide settings
        const SelectImageSettingsGroup = containerEl.createDiv({ cls: 'setting-group' });

        // Add the showSelectImageIcon setting
        const showSelectImageIconSetting = new Setting(SelectImageSettingsGroup)
            .setName('Show Select Image Icon')
            .setDesc('Show an icon to select banner image in the top-left corner')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showSelectImageIcon)
                .onChange(async (value) => {
                    this.plugin.settings.showSelectImageIcon = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.showSelectImageIcon = DEFAULT_SETTINGS.showSelectImageIcon;
                    await this.plugin.saveSettings();
                    
                    const toggleComponent = showSelectImageIconSetting.components[0];
                    if (toggleComponent) {
                        toggleComponent.setValue(DEFAULT_SETTINGS.showSelectImageIcon);
                    }
                    
                    this.plugin.updateAllBanners();
                }));

        // Add the defaultSelectImagePath setting
        const defaultSelectImagePathSetting = new Setting(SelectImageSettingsGroup)
            .setName('Default Select Image Path')
            .setDesc('Set a default folder path to filter images when opening the Select Image modal')
            .addText(text => {
                text.setPlaceholder('Example: Images/Banners')
                    .setValue(this.plugin.settings.defaultSelectImagePath)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultSelectImagePath = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.style.width = '200px';
                return text;
            })
            .addButton(button => button
                .setButtonText('Browse')
                .onClick(() => {
                    new FolderSuggestModal(this.plugin.app, (chosenPath) => {
                        this.plugin.settings.defaultSelectImagePath = chosenPath;
                        const textInput = defaultSelectImagePathSetting.components[0];
                        if (textInput) {
                            textInput.setValue(chosenPath);
                        }
                        this.plugin.saveSettings();
                    }).open();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.defaultSelectImagePath = DEFAULT_SETTINGS.defaultSelectImagePath;
                    await this.plugin.saveSettings();
                    
                    const textComponent = defaultSelectImagePathSetting.components[0];
                    if (textComponent) {
                        textComponent.setValue(DEFAULT_SETTINGS.defaultSelectImagePath);
                    }
                }));

        // Add the showViewImageIcon setting
        const showViewImageIconSetting = new Setting(containerEl)
            .setName('Show View Image Icon')
            .setDesc('Show an icon to view the banner image in full screen')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showViewImageIcon)
                .onChange(async (value) => {
                    this.plugin.settings.showViewImageIcon = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.showViewImageIcon = DEFAULT_SETTINGS.showViewImageIcon;
                    await this.plugin.saveSettings();
                    
                    const toggleComponent = showViewImageIconSetting.components[0];
                    if (toggleComponent) {
                        toggleComponent.setValue(DEFAULT_SETTINGS.showViewImageIcon);
                    }
                    
                    this.plugin.updateAllBanners();
                }));
        
        // Create a group for the hide settings
        const hideSettingsGroup = containerEl.createDiv({ cls: 'setting-group' });

        // For Hide Pixel Banner Fields
        const hidePixelBannerFieldsSetting = new Setting(hideSettingsGroup)
            .setName('Hide Pixel Banner Fields')
            .setDesc('Hide banner-related frontmatter fields in Reading mode')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.hidePixelBannerFields)
                .onChange(async (value) => {
                    this.plugin.settings.hidePixelBannerFields = value;
                    if (!value) {
                        // Turn off the dependent setting
                        this.plugin.settings.hidePropertiesSectionIfOnlyBanner = false;
                        const dependentToggle = hidePropertiesSection.components[0];
                        if (dependentToggle) {
                            dependentToggle.setValue(false);
                            dependentToggle.setDisabled(true);
                        }
                        hidePropertiesSection.settingEl.addClass('is-disabled');
                        
                        // Remove the hidden class from all previously hidden fields
                        this.app.workspace.iterateAllLeaves(leaf => {
                            if (leaf.view instanceof MarkdownView && leaf.view.contentEl) {
                                const propertiesContainer = leaf.view.contentEl.querySelector('.metadata-container');
                                if (propertiesContainer) {
                                    propertiesContainer.classList.remove('pixel-banner-hidden-section');
                                    const hiddenFields = propertiesContainer.querySelectorAll('.pixel-banner-hidden-field');
                                    hiddenFields.forEach(field => {
                                        field.classList.remove('pixel-banner-hidden-field');
                                    });
                                }
                            }
                        });
                    } else {
                        // Enable the dependent toggle when this is turned on
                        const dependentToggle = hidePropertiesSection.components[0];
                        if (dependentToggle) {
                            dependentToggle.setDisabled(false);
                        }
                        hidePropertiesSection.settingEl.removeClass('is-disabled');
                    }
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    // Reset both settings to their defaults
                    this.plugin.settings.hidePixelBannerFields = DEFAULT_SETTINGS.hidePixelBannerFields;
                    this.plugin.settings.hidePropertiesSectionIfOnlyBanner = DEFAULT_SETTINGS.hidePropertiesSectionIfOnlyBanner;
                    await this.plugin.saveSettings();
                    
                    // Update the main toggle state
                    const mainToggle = hidePixelBannerFieldsSetting.components[0];
                    if (mainToggle) {
                        mainToggle.setValue(DEFAULT_SETTINGS.hidePixelBannerFields);
                    }

                    // Update the dependent toggle state
                    const dependentToggle = hidePropertiesSection.components[0];
                    if (dependentToggle) {
                        dependentToggle.setValue(DEFAULT_SETTINGS.hidePropertiesSectionIfOnlyBanner);
                        dependentToggle.setDisabled(!DEFAULT_SETTINGS.hidePixelBannerFields);
                    }
                    hidePropertiesSection.settingEl.toggleClass('is-disabled', !DEFAULT_SETTINGS.hidePixelBannerFields);
                    
                    this.plugin.updateAllBanners();
                }));

        // Then create Hide Properties Section setting
        const hidePropertiesSection = new Setting(hideSettingsGroup)
            .setName('Hide Properties Section')
            .setDesc('Hide the entire Properties section in Reading mode if it only contains Pixel Banner fields')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.hidePropertiesSectionIfOnlyBanner)
                .setDisabled(!this.plugin.settings.hidePixelBannerFields)
                .onChange(async (value) => {
                    this.plugin.settings.hidePropertiesSectionIfOnlyBanner = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateAllBanners();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.hidePropertiesSectionIfOnlyBanner = DEFAULT_SETTINGS.hidePropertiesSectionIfOnlyBanner;
                    await this.plugin.saveSettings();
                    
                    const toggle = hidePropertiesSection.components[0];
                    if (toggle) {
                        toggle.setValue(DEFAULT_SETTINGS.hidePropertiesSectionIfOnlyBanner);
                    }
                    
                    this.plugin.updateAllBanners();
                }));

        // Add dependent styling
        hidePropertiesSection.settingEl.addClass('setting-dependent');
        if (!this.plugin.settings.hidePixelBannerFields) {
            hidePropertiesSection.settingEl.addClass('is-disabled');
        }

        // Banner Icon General Settings
        new Setting(containerEl)
            .setName('Default Banner Icon Size')
            .setDesc('Set the default size for the banner icon')
            .addSlider(slider => slider
                .setLimits(10, 200, 1)
                .setValue(this.plugin.settings.bannerIconSize)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.bannerIconSize = value;
                    await this.plugin.saveSettings();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.bannerIconSize = DEFAULT_SETTINGS.bannerIconSize;
                    await this.plugin.saveSettings();
                    const sliderInput = button.extraSettingsEl.parentElement.querySelector('input[type="range"]');
                    sliderInput.value = DEFAULT_SETTINGS.bannerIconSize;
                    const event = new Event('input', { bubbles: true, cancelable: true });
                    sliderInput.dispatchEvent(event);
                }));

        // Banner Icon X Position
        new Setting(containerEl)
            .setName('Default Banner Icon X Position')
            .setDesc('Set the default X position for the banner icon (0-100)')
            .addSlider(slider => slider
                .setLimits(0, 100, 1)
                .setValue(this.plugin.settings.bannerIconXPosition)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.bannerIconXPosition = value;
                    await this.plugin.saveSettings();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.bannerIconXPosition = DEFAULT_SETTINGS.bannerIconXPosition;
                    await this.plugin.saveSettings();
                    const sliderInput = button.extraSettingsEl.parentElement.querySelector('input[type="range"]');
                    sliderInput.value = DEFAULT_SETTINGS.bannerIconXPosition;
                    const event = new Event('input', { bubbles: true, cancelable: true });
                    sliderInput.dispatchEvent(event);
                }));

        // Banner Icon Opacity
        new Setting(containerEl)
            .setName('Default Banner Icon Opacity')
            .setDesc('Set the default opacity for the banner icon (0-100)')
            .addSlider(slider => slider
                .setLimits(0, 100, 1)
                .setValue(this.plugin.settings.bannerIconOpacity)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.bannerIconOpacity = value;
                    await this.plugin.saveSettings();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.bannerIconOpacity = DEFAULT_SETTINGS.bannerIconOpacity;
                    await this.plugin.saveSettings();
                    const sliderInput = button.extraSettingsEl.parentElement.querySelector('input[type="range"]');
                    sliderInput.value = DEFAULT_SETTINGS.bannerIconOpacity;
                    const event = new Event('input', { bubbles: true, cancelable: true });
                    sliderInput.dispatchEvent(event);
                }));

        // Banner Icon Text Color
        new Setting(containerEl)
            .setName('Default Banner Icon Text Color')
            .setDesc('Set the default text color for the banner icon')
            .addText(text => text
                .setPlaceholder('Enter color (e.g., #ffffff or white)')
                .setValue(this.plugin.settings.bannerIconColor)
                .onChange(async (value) => {
                    this.plugin.settings.bannerIconColor = value;
                    await this.plugin.saveSettings();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.bannerIconColor = DEFAULT_SETTINGS.bannerIconColor;
                    await this.plugin.saveSettings();
                    const textInput = button.extraSettingsEl.parentElement.querySelector('input[type="text"]');
                    textInput.value = DEFAULT_SETTINGS.bannerIconColor;
                    const event = new Event('input', { bubbles: true, cancelable: true });
                    textInput.dispatchEvent(event);
                }));

        // Banner Icon Background Color
        new Setting(containerEl)
            .setName('Default Banner Icon Background Color')
            .setDesc('Set the default background color for the banner icon')
            .addText(text => text
                .setPlaceholder('Enter color (e.g., #ffffff or transparent)')
                .setValue(this.plugin.settings.bannerIconBackgroundColor)
                .onChange(async (value) => {
                    this.plugin.settings.bannerIconBackgroundColor = value;
                    await this.plugin.saveSettings();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.bannerIconBackgroundColor = DEFAULT_SETTINGS.bannerIconBackgroundColor;
                    await this.plugin.saveSettings();
                    const textInput = button.extraSettingsEl.parentElement.querySelector('input[type="text"]');
                    textInput.value = DEFAULT_SETTINGS.bannerIconBackgroundColor;
                    const event = new Event('input', { bubbles: true, cancelable: true });
                    textInput.dispatchEvent(event);
                }));

        // Banner Icon Padding
        new Setting(containerEl)
            .setName('Default Banner Icon Padding')
            .setDesc('Set the default padding for the banner icon')
            .addSlider(slider => slider
                .setLimits(0, 100, 1)
                .setValue(this.plugin.settings.bannerIconPadding)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.bannerIconPadding = value;
                    await this.plugin.saveSettings();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.bannerIconPadding = DEFAULT_SETTINGS.bannerIconPadding;
                    await this.plugin.saveSettings();
                    const sliderInput = button.extraSettingsEl.parentElement.querySelector('input[type="range"]');
                    sliderInput.value = DEFAULT_SETTINGS.bannerIconPadding;
                    const event = new Event('input', { bubbles: true, cancelable: true });
                    sliderInput.dispatchEvent(event);
                }));

        // Banner Icon Border Radius
        new Setting(containerEl)
            .setName('Default Banner Icon Border Radius')
            .setDesc('Set the default border radius for the banner icon')
            .addSlider(slider => slider
                .setLimits(0, 50, 1)
                .setValue(this.plugin.settings.bannerIconBorderRadius)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.bannerIconBorderRadius = value;
                    await this.plugin.saveSettings();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.bannerIconBorderRadius = DEFAULT_SETTINGS.bannerIconBorderRadius;
                    await this.plugin.saveSettings();
                    const sliderInput = button.extraSettingsEl.parentElement.querySelector('input[type="range"]');
                    sliderInput.value = DEFAULT_SETTINGS.bannerIconBorderRadius;
                    const event = new Event('input', { bubbles: true, cancelable: true });
                    sliderInput.dispatchEvent(event);
                }));

        // Banner Icon Vertical Offset
        new Setting(containerEl)
            .setName('Default Banner Icon Vertical Offset')
            .setDesc('Set the default vertical offset for the banner icon')
            .addSlider(slider => slider
                .setLimits(-100, 100, 1)
                .setValue(this.plugin.settings.bannerIconVeritalOffset)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.bannerIconVeritalOffset = value;
                    await this.plugin.saveSettings();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.bannerIconVeritalOffset = DEFAULT_SETTINGS.bannerIconVeritalOffset;
                    await this.plugin.saveSettings();
                    const sliderInput = button.extraSettingsEl.parentElement.querySelector('input[type="range"]');
                    sliderInput.value = DEFAULT_SETTINGS.bannerIconVeritalOffset;
                    const event = new Event('input', { bubbles: true, cancelable: true });
                    sliderInput.dispatchEvent(event);
                }));

        // Add back the Show Release Notes setting
        const showReleaseNotesSetting = new Setting(containerEl)
            .setName('Show Release Notes')
            .setDesc('Show release notes after plugin updates')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showReleaseNotes)
                .onChange(async (value) => {
                    this.plugin.settings.showReleaseNotes = value;
                    await this.plugin.saveSettings();
                }))
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.showReleaseNotes = DEFAULT_SETTINGS.showReleaseNotes;
                    await this.plugin.saveSettings();
                    
                    const toggleComponent = showReleaseNotesSetting.components[0];
                    if (toggleComponent) {
                        toggleComponent.setValue(DEFAULT_SETTINGS.showReleaseNotes);
                    }
                }));
    }

    createCustomFieldsSettings(containerEl) {
        // section callout
        const calloutEl = containerEl.createEl('div', { cls: 'tab-callout' });
        calloutEl.createEl('div', { text: 'Customize the frontmatter field names used for the banner and Y-position. You can define multiple names for each field, separated by commas. Field names can only contain letters, numbers, dashes, and underscores. Example: "banner, pixel-banner, header_image" could all be used as the banner field name.' });

        const customFields = [
            {
                setting: 'customBannerField',
                name: 'Banner Field Names',
                desc: 'Set custom field names for the banner in frontmatter (comma-separated)',
                values: '[[image.png]], "images/image.jpg"',
                placeholder: 'banner, pixel-banner, header-image'
            },
            {
                setting: 'customYPositionField',
                name: 'Y-Position Field Names',
                desc: 'Set custom field names for the Y-position in frontmatter (comma-separated)',
                values: '5, 70, 100',
                placeholder: 'banner-y, y-position, banner-offset'
            },
            {
                setting: 'customXPositionField',
                name: 'X-Position Field Names',
                desc: 'Set custom field names for the X-position in frontmatter (comma-separated)',
                values: '0, 30, 90',
                placeholder: 'banner-x, x-position, banner-offset-x'
            },
            {
                setting: 'customContentStartField',
                name: 'Content Start Position Field Names',
                desc: 'Set custom field names for the content start position in frontmatter (comma-separated)',
                values: '75, 150, 450',
                placeholder: 'content-start, start-position, content-offset'
            },
            {
                setting: 'customImageDisplayField',
                name: 'Image Display Field Names',
                desc: 'Set custom field names for the image display in frontmatter (comma-separated)',
                values: 'cover, contain, auto, 200%, 70%',
                placeholder: 'banner-display, image-display, display-mode'
            },
            {
                setting: 'customImageRepeatField',
                name: 'Image Repeat Field Names',
                desc: 'Set custom field names for the image repeat in frontmatter (comma-separated)',
                values: 'true, false',
                placeholder: 'banner-repeat, image-repeat, repeat-image'
            },
            {
                setting: 'customBannerHeightField',
                name: 'Banner Height Field Names',
                desc: 'Set custom field names for the banner height in frontmatter (comma-separated)',
                values: '100, 300, 700',
                placeholder: 'banner-height, image-height, header-height'
            },
            {
                setting: 'customFadeField',
                name: 'Fade Field Names',
                desc: 'Set custom field names for the fade effect in frontmatter (comma-separated)',
                values: '-1000, -100, 100',
                placeholder: 'banner-fade, fade-effect, image-fade'
            },
            {
                setting: 'customBorderRadiusField',
                name: 'Border Radius Field Names',
                desc: 'Set custom field names for the border radius in frontmatter (comma-separated)',
                values: '0, 17, 30, 50',
                placeholder: 'banner-radius, border-radius, banner-corner-radius'
            },
            {
                setting: 'customTitleColorField',
                name: 'Inline Title Color Field Names',
                desc: 'Set custom field names for the inline title color in frontmatter (comma-separated)',
                values: 'red, papayawhip, "#7f6df2", "#ffa500"',
                placeholder: 'banner-title-color, title-color, header-color'
            },
            {
                setting: 'customBannerShuffleField',
                name: 'Banner Shuffle Field Names',
                desc: 'Set custom field names for the banner shuffle in frontmatter (comma-separated)',
                values: '"pixel-banner-images", "images/llamas"',
                placeholder: 'banner-shuffle, shuffle-folder, random-image-folder'
            },
            {
                setting: 'customBannerIconField',
                name: 'Banner Icon Field Names',
                desc: 'Set custom field names for the banner icon in frontmatter (comma-separated)',
                values: '🤣, 💥, ✨',
                placeholder: 'banner-icon, pixel-icon, header-icon'
            },
            {
                setting: 'customBannerIconSizeField',
                name: 'Banner Icon Size Field Names',
                desc: 'Set custom field names for the banner icon size in frontmatter (comma-separated)',
                values: '70, 100, 150',
                placeholder: 'banner-icon-size, icon-size, header-icon-size'
            },
            {
                setting: 'customBannerIconXPositionField',
                name: 'Banner Icon X Position Field Names',
                desc: 'Set custom field names for the banner icon x position in frontmatter (comma-separated)',
                values: '25, 50, 75 (value between 0 and 100)',
                placeholder: 'banner-icon-x, icon-x, header-icon-x'
            },
            {
                setting: 'customBannerIconOpacityField',
                name: 'Banner Icon Opacity Field Names',
                desc: 'Set custom field names for the banner icon opacity in frontmatter (comma-separated)',
                values: '100, 75, 50 (value between 0 and 100)',
                placeholder: 'banner-icon-opacity, icon-opacity, header-icon-opacity'
            },
            {
                setting: 'customBannerIconColorField',
                name: 'Banner Icon Text Color Field Names',
                desc: 'Set custom field names for the banner icon text color in frontmatter (comma-separated)',
                values: 'white, papayawhip, "#7f6df2", "#ffa500"',
                placeholder: 'banner-icon-color, icon-color, header-icon-color'
            },
            {
                setting: 'customBannerIconBackgroundColorField',
                name: 'Banner Icon Background Color Field Names',
                desc: 'Set custom field names for the banner icon background color in frontmatter (comma-separated)',
                values: 'transparent, papayawhip, "#7f6df2", "#ffa500"',
                placeholder: 'banner-icon-background-color, icon-background-color, header-icon-background-color'
            },
            {
                setting: 'customBannerIconPaddingField',
                name: 'Banner Icon Padding Field Names',
                desc: 'Set custom field names for the banner icon padding in frontmatter (comma-separated)',
                values: '0, 10, 20',
                placeholder: 'banner-icon-padding, icon-padding, header-icon-padding'
            },
            {
                setting: 'customBannerIconBorderRadiusField',
                name: 'Banner Icon Border Radius Field Names',
                desc: 'Set custom field names for the banner icon border radius in frontmatter (comma-separated)',
                values: '0, 17, 30, 50',
                placeholder: 'banner-icon-border-radius, icon-border-radius, header-icon-border-radius'
            },
            {
                setting: 'customBannerIconVeritalOffsetField',
                name: 'Banner Icon Vertical Offset Field Names',
                desc: 'Set custom field names for the banner icon vertical offset in frontmatter (comma-separated)',
                values: '0, 10, 20',
                placeholder: 'banner-icon-vertical-offset, icon-vertical-offset, header-icon-vertical-offset'
            },
        ];

        customFields.forEach(field => {
            const settingContainer = new Setting(containerEl)
                .setName(field.name)
                .setDesc(field.desc);

            // Add example values if they exist
            if (field.values) {
                settingContainer.descEl.createEl('div', {
                    text: `example frontmatter values: ${field.values}`,
                    cls: 'setting-item-description pixel-banner-example-values'
                });
            }

            settingContainer
                .addText(text => {
                    text
                        .setPlaceholder(field.placeholder)
                        .setValue(arrayToString(this.plugin.settings[field.setting]))
                        .onChange(async (value) => {
                            const newNames = stringToArray(value);
                            const validation = validateFieldNames(
                                this.plugin.settings,
                                customFields.map(f => f.setting),
                                field.setting,
                                newNames
                            );

                            if (validation.isValid) {
                                this.plugin.settings[field.setting] = newNames;
                                await this.plugin.saveSettings();
                            } else {
                                new Notice(validation.message);
                                text.setValue(arrayToString(this.plugin.settings[field.setting]));
                            }
                        });
                    text.inputEl.style.width = '220px';
                })
                .addExtraButton(button => button
                    .setIcon('reset')
                    .setTooltip('Reset to default')
                    .onClick(async () => {
                        this.plugin.settings[field.setting] = DEFAULT_SETTINGS[field.setting];
                        await this.plugin.saveSettings();
                        
                        // Update only this specific setting
                        const settingEl = button.extraSettingsEl.parentElement;
                        const textInput = settingEl.querySelector('input[type="text"]');
                        textInput.value = arrayToString(DEFAULT_SETTINGS[field.setting]);
                        
                        // Trigger the change event to update the plugin's state
                        const event = new Event('input', { bubbles: true, cancelable: true });
                        textInput.dispatchEvent(event);
                    }));
        });
    }

    createFolderSettings(containerEl) {
        // section callout
        const calloutEl = containerEl.createEl('div', { cls: 'tab-callout' });
        calloutEl.createEl('div', { text: 'Configure banner settings for specific folders. These settings will override the default settings for all notes in the specified folder.' });

        // Add folder images container
        const folderImagesContainer = containerEl.createEl('div', { cls: 'folder-images-container' });

        // Add existing folder images
        this.plugin.settings.folderImages.forEach((folderImage, index) => {
            new FolderImageSetting(
                folderImagesContainer,
                this.plugin,
                folderImage,
                index,
                () => this.updateFolderSettings()
            );
        });

        // Add button to add new folder image
        const addFolderImageSetting = new Setting(containerEl)
            .setClass('add-folder-image-setting')
            .addButton(button => button
                .setButtonText('Add Folder Image')
                .onClick(async () => {
                    const newFolderImage = {
                        folder: '',
                        image: '',
                        imageDisplay: 'cover',
                        imageRepeat: false,
                        yPosition: 50,
                        xPosition: 50,
                        contentStartPosition: 150,
                        bannerHeight: 350,
                        fade: -75,
                        borderRadius: 17,
                        titleColor: 'var(--inline-title-color)',
                        directChildrenOnly: false,
                        enableImageShuffle: false,
                        shuffleFolder: ''
                    };
                    this.plugin.settings.folderImages.push(newFolderImage);
                    await this.plugin.saveSettings();
                    this.updateFolderSettings();
                }));
    }

    validateFieldName(value, otherFieldName) {
        if (value === otherFieldName) {
            new Notice("Field names must be unique!");
            return false;
        }
        return true;
    }

    createFolderImageSettings(folderImage) {
        const settings = { ...folderImage };

        // If image shuffle is enabled and shuffle folder is specified, get a random image
        if (folderImage.enableImageShuffle && folderImage.shuffleFolder) {
            const randomImagePath = this.getRandomImageFromFolder(folderImage.shuffleFolder);
            if (randomImagePath) {
                // Format as internal link for Obsidian
                settings.image = randomImagePath;
            }
        }

        // Add default banner icon settings if not present
        if (!settings.bannerIconSize) settings.bannerIconSize = this.settings.bannerIconSize;
        if (!settings.bannerIconXPosition) settings.bannerIconXPosition = this.settings.bannerIconXPosition;
        if (!settings.bannerIconOpacity) settings.bannerIconOpacity = this.settings.bannerIconOpacity;
        if (!settings.bannerIconColor) settings.bannerIconColor = this.settings.bannerIconColor;
        if (!settings.bannerIconBackgroundColor) settings.bannerIconBackgroundColor = this.settings.bannerIconBackgroundColor;
        if (!settings.bannerIconPadding) settings.bannerIconPadding = this.settings.bannerIconPadding;
        if (!settings.bannerIconBorderRadius) settings.bannerIconBorderRadius = this.settings.bannerIconBorderRadius;
        if (!settings.bannerIconVeritalOffset) settings.bannerIconVeritalOffset = this.settings.bannerIconVeritalOffset;

        return settings;
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function random20characters() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 20; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export { DEFAULT_SETTINGS, FolderSuggestModal, FolderImageSetting, PixelBannerSettingTab, debounce };
