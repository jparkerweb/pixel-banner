import { Setting } from 'obsidian';
import { FolderSuggestModal } from '../settings';

export function createFolderSettings(containerEl, plugin) {
    // section callout
    const calloutEl = containerEl.createEl('div', { cls: 'tab-callout' });
    calloutEl.createEl('div', { text: 'Configure banner settings for specific folders. These settings will override the default settings for all notes in the specified folder.' });

    // Add folder images container
    const folderImagesContainer = containerEl.createEl('div', { cls: 'folder-images-container' });

    // Add existing folder images
    plugin.settings.folderImages.forEach((folderImage, index) => {
        new FolderImageSetting(
            folderImagesContainer,
            plugin,
            folderImage,
            index,
            () => updateFolderSettings(containerEl, plugin)
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
                plugin.settings.folderImages.push(newFolderImage);
                await plugin.saveSettings();
                updateFolderSettings(containerEl, plugin);
            }));
}

function updateFolderSettings(containerEl, plugin) {
    // Clear the container
    containerEl.empty();
    // Recreate the settings
    createFolderSettings(containerEl, plugin);
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
                min: '0',
                max: '1280'
            }
        });
        heightInput.style.width = '50px';
        heightInput.style.marginLeft = '10px';
        heightInput.value = this.folderImage.bannerHeight || "";
        heightInput.placeholder = String(this.plugin.settings.bannerHeight || 350);
        heightInput.addEventListener('change', async () => {
            let value = heightInput.value ? parseInt(heightInput.value) : null;
            if (value !== null) {
                value = Math.max(0, Math.min(1280, value));
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

        // Banner Icon Font Weight
        new Setting(controlEl3)
            .setName("Icon Font Weight")
            .addDropdown(dropdown => {
                dropdown
                    .addOption('lighter', 'Lighter')
                    .addOption('normal', 'Normal')
                    .addOption('bold', 'Bold')
                    .setValue(this.folderImage.bannerIconFontWeight || this.plugin.settings.bannerIconFontWeight)
                    .onChange(async (value) => {
                        this.folderImage.bannerIconFontWeight = value;
                        await this.plugin.saveSettings();
                    });
            });

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

        const controlEl4 = this.settingEl.createDiv("setting-item-control full-width-control");

        // Banner Icon Padding X
        new Setting(controlEl4)
            .setName("Icon Padding X")
            .addSlider(slider => slider
                .setLimits(0, 100, 1)
                .setValue(this.folderImage.bannerIconPaddingX || this.plugin.settings.bannerIconPaddingX)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.folderImage.bannerIconPaddingX = value;
                    await this.plugin.saveSettings();
                }));

        // Banner Icon Padding Y
        new Setting(controlEl4)
            .setName("Icon Padding Y")
            .addSlider(slider => slider
                .setLimits(0, 100, 1)
                .setValue(this.folderImage.bannerIconPaddingY || this.plugin.settings.bannerIconPaddingY)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.folderImage.bannerIconPaddingY = value;
                    await this.plugin.saveSettings();
                }));

        const controlEl5 = this.settingEl.createDiv("setting-item-control full-width-control");

        // Banner Icon Border Radius
        new Setting(controlEl5)
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
        new Setting(controlEl5)
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