import { PluginSettingTab, Setting, FuzzySuggestModal, MarkdownView } from 'obsidian';

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
    // Update these fields to be arrays
    customBannerField: ['banner'],
    customYPositionField: ['banner-y'],
    customContentStartField: ['content-start'],
    customImageDisplayField: ['banner-display'],
    customImageRepeatField: ['banner-repeat'],
    folderImages: [],
    contentStartPosition: 150,
    imageDisplay: 'cover',
    imageRepeat: false,
    bannerHeight: 350,
    customBannerHeightField: ['banner-height'],
    fade: -75,
    customFadeField: ['banner-fade'],
    borderRadius: 17,
    customBorderRadiusField: ['banner-radius'],
    showPinIcon: true,
    pinnedImageFolder: 'pixel-banner-images',
    showReleaseNotes: true,
    lastVersion: null,
    showRefreshIcon: true,
    hidePixelBannerFields: false,
    hidePropertiesSectionIfOnlyBanner: false,
    titleColor: 'var(--inline-title-color)',
    customTitleColorField: ['banner-inline-title-color'],
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
        this.addBorderRadiusInput(controlEl);
        this.addColorSettings(controlEl);
        
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
            .setName("folder path")
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
    }

    addImageInput() {
        const folderInputContainer = this.settingEl.createDiv('folder-input-container');
        
        const imageInput = new Setting(folderInputContainer)
            .setName("image url or keyword")
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
            .setName("image display")
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
        this.addContentStartInput(controlEl);
    }
    addFadeAndBannerHeight() {
        const controlEl = this.settingEl.createDiv("setting-item-control full-width-control");
        this.addFadeInput(controlEl);
        this.addBannerHeightInput(controlEl);
    }

    addYPositionInput(containerEl) {
        const label = containerEl.createEl('label', { text: 'y-position', cls: 'setting-item-name__label' });
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

    addContentStartInput(containerEl) {
        const label = containerEl.createEl('label', { text: 'content start', cls: 'setting-item-name__label' });
        label.style.marginLeft = '20px';

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

    addBannerHeightInput(containerEl) {
        const label = containerEl.createEl('label', { text: 'banner height', cls: 'setting-item-name__label' });
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
        const label = containerEl.createEl('label', { text: 'fade', cls: 'setting-item-name__label' });
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
            .setName("inline title color")
            .addColorPicker(color => color
                .setValue((() => {
                    const currentColor = this.folderImage.titleColor || this.plugin.settings.titleColor;
                    console.log('Current color:', currentColor);
                    
                    if (currentColor.startsWith('var(--')) {
                        console.log('Processing CSS variable');
                        const temp = document.createElement('div');
                        temp.style.color = currentColor;
                        document.body.appendChild(temp);
                        const computedColor = getComputedStyle(temp).color;
                        console.log('Computed color:', computedColor);
                        document.body.removeChild(temp);
                        
                        // Parse RGB values
                        const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                        console.log('RGB match:', rgbMatch);
                        if (rgbMatch) {
                            const [_, r, g, b] = rgbMatch;
                            const hexColor = '#' + 
                                parseInt(r).toString(16).padStart(2, '0') +
                                parseInt(g).toString(16).padStart(2, '0') +
                                parseInt(b).toString(16).padStart(2, '0');
                            console.log('Final hex color:', hexColor);
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

    addBorderRadiusInput(containerEl) {
        const label = containerEl.createEl('label', { text: 'border radius', cls: 'setting-item-name__label' });
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
    // ... rest of the plugin class
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
            'API Settings',
            'Folder Images',
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
        this.createAPISettings(apiTab);

        // Folder Images tab content
        const foldersTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': 'Folder Images' } });
        this.createFolderSettings(foldersTab);

        // Examples tab content
        const examplesTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': 'Examples' } });
        this.createExampleSettings(examplesTab);

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

    createAPISettings(containerEl) {
        // section callout
        const calloutEl = containerEl.createEl('div', { cls: 'tab-callout' });
        calloutEl.createEl('div', { text: 'Optionally select which API provider to use for fetching images. See the Examples tab for more information on referencing images by URL or local image. You can use any combination of API keyword, URL, or local image between notes.' });

        // Add API provider radio buttons
        new Setting(containerEl)
            .setName('API Provider')
            .setDesc('Select the API provider for fetching images')
            .addDropdown(dropdown => dropdown
                .addOption('all', 'All (Random)')
                .addOption('pexels', 'Pexels')
                .addOption('pixabay', 'Pixabay')
                .addOption('flickr', 'Flickr')
                .addOption('unsplash', 'Unsplash')
                .setValue(this.plugin.settings.apiProvider)
                .onChange(async (value) => {
                    this.plugin.settings.apiProvider = value;
                    await this.plugin.saveSettings();
                    this.display(); // Refresh the settings tab to update API key fields
                }));

        // Pexels API key
        new Setting(containerEl)
            .setName('Pexels API Key');
        containerEl.createEl('span', { text: 'Enter your Pexels API key. Get your API key from ', cls: 'setting-item-description' })
            .createEl('a', { href: 'https://www.pexels.com/api/', text: 'Pexels API' });
        const pexelsApiKeySetting = new Setting(containerEl)
            .setClass('full-width-control')
            .addText(text => {
                text
                    .setPlaceholder('Pexels API key')
                    .setValue(this.plugin.settings.pexelsApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.pexelsApiKey = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.style.width = 'calc(100% - 100px)';  // Make room for the Test button
            })
            .addButton(button => button
                .setButtonText('Test API')
                .onClick(async () => {
                    const apiKey = this.plugin.settings.pexelsApiKey;
                    if (!apiKey) {
                        new Notice('Please enter an API key first');
                        return;
                    }
                    
                    button.setButtonText('Testing...');
                    button.setDisabled(true);
                    
                    const isValid = await testPexelsApi(apiKey);
                    
                    button.setButtonText('Test API');
                    button.setDisabled(false);
                    
                    new Notice(isValid ? '✅ Pexels API key is valid!' : '❌ Invalid Pexels API key');
                }));
        pexelsApiKeySetting.settingEl.style.width = '100%';

        // Pixabay API key
        new Setting(containerEl)
            .setName('Pixabay API Key');
        containerEl.createEl('span', { text: 'Enter your Pixabay API key. Get your API key from ', cls: 'setting-item-description' })
            .createEl('a', { href: 'https://pixabay.com/api/docs/', text: 'Pixabay API' });
        const pixabayApiKeySetting = new Setting(containerEl)
            .setClass('full-width-control')
            .addText(text => {
                text
                    .setPlaceholder('Pixabay API key')
                    .setValue(this.plugin.settings.pixabayApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.pixabayApiKey = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.style.width = 'calc(100% - 100px)';  // Make room for the Test button
            })
            .addButton(button => button
                .setButtonText('Test API')
                .onClick(async () => {
                    const apiKey = this.plugin.settings.pixabayApiKey;
                    if (!apiKey) {
                        new Notice('Please enter an API key first');
                        return;
                    }
                    
                    button.setButtonText('Testing...');
                    button.setDisabled(true);
                    
                    const isValid = await testPixabayApi(apiKey);
                    
                    button.setButtonText('Test API');
                    button.setDisabled(false);
                    
                    new Notice(isValid ? '✅ Pixabay API key is valid!' : '❌ Invalid Pixabay API key');
                }));
        pixabayApiKeySetting.settingEl.style.width = '100%';

        // Add Flickr API key setting
        new Setting(containerEl)
            .setName('Flickr API Key');
        containerEl.createEl('span', { text: 'Enter your Flickr API key. Get your API key from ', cls: 'setting-item-description' })
            .createEl('a', { href: 'https://www.flickr.com/services/api/', text: 'Flickr API' });
        const flickrApiKeySetting = new Setting(containerEl)
            .setClass('full-width-control')
            .addText(text => {
                text
                    .setPlaceholder('Flickr API key')
                    .setValue(this.plugin.settings.flickrApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.flickrApiKey = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.style.width = 'calc(100% - 100px)';
            })
            .addButton(button => button
                .setButtonText('Test API')
                .onClick(async () => {
                    const apiKey = this.plugin.settings.flickrApiKey;
                    if (!apiKey) {
                        new Notice('Please enter an API key first');
                        return;
                    }
                    
                    button.setButtonText('Testing...');
                    button.setDisabled(true);
                    
                    const isValid = await testFlickrApi(apiKey);
                    
                    button.setButtonText('Test API');
                    button.setDisabled(false);
                    
                    new Notice(isValid ? '✅ Flickr API key is valid!' : '❌ Invalid Flickr API key');
                }));

        new Setting(containerEl)
            .setName('Unsplash API Key');
        containerEl.createEl('span', { text: 'Enter your Unsplash API key (Access Key). Get your API key from ', cls: 'setting-item-description' })
            .createEl('a', { href: 'https://unsplash.com/oauth/applications', text: 'Unsplash API' });
        const unsplashApiKeySetting = new Setting(containerEl)
            .setClass('full-width-control')
            .addText(text => {
                text
                    .setPlaceholder('Unsplash API key')
                    .setValue(this.plugin.settings.unsplashApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.unsplashApiKey = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.style.width = 'calc(100% - 100px)';
            })
            .addButton(button => button
                .setButtonText('Test API')
                .onClick(async () => {
                    const apiKey = this.plugin.settings.unsplashApiKey;
                    if (!apiKey) {
                        new Notice('Please enter an API key first');
                        return;
                    }
                    
                    button.setButtonText('Testing...');
                    button.setDisabled(true);
                    
                    const isValid = await testUnsplashApi(apiKey);
                    
                    button.setButtonText('Test API');
                    button.setDisabled(false);
                    
                    new Notice(isValid ? '✅ Unsplash API key is valid!' : '❌ Invalid Unsplash API key');
                }));

        new Setting(containerEl)
            .setName('Images')
            .setDesc('Configure settings for images fetched from API. These settings apply when using keywords to fetch random images.')
            .setHeading();

        new Setting(containerEl)
            .setName('Show Pin Icon')
            .setDesc('Show a pin icon on random banner images that allows saving them to your vault. Once pinned, your frontmatter will be updated to use the local image instead of the API image.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showPinIcon)
                .onChange(async (value) => {
                    this.plugin.settings.showPinIcon = value;
                    // Show/hide dependent settings based on the toggle
                    folderInputSetting.settingEl.style.display = value ? 'flex' : 'none';
                    refreshIconSetting.settingEl.style.display = value ? 'flex' : 'none';
                    await this.plugin.saveSettings();
                }));

        // Add the folder input setting
        const folderInputSetting = new Setting(containerEl)
            .setName('Pinned Images Folder')
            .setDesc('Default folder where pinned banner images will be saved')
            .addText(text => {
                text.setPlaceholder('pixel-banner-images')
                    .setValue(this.plugin.settings.pinnedImageFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.pinnedImageFolder = value;
                        await this.plugin.saveSettings();
                    });

                // Add blur handler for validation
                text.inputEl.addEventListener('blur', async () => {
                    let value = text.inputEl.value.trim();
                    
                    if (!value) {
                        value = 'pixel-banner-images';
                    }

                    text.setValue(value);
                    this.plugin.settings.pinnedImageFolder = value;
                    await this.plugin.saveSettings();
                });

                return text;
            })
            .addButton(button => button
                .setButtonText('Clean Orphaned Pins')
                .setTooltip('Remove pinned images from the default folder that are no longer referenced in Notes')
                .onClick(async () => {
                    button.setButtonText('🫧 Cleaning...');
                    button.setDisabled(true);
                    
                    try {
                        const result = await this.plugin.cleanOrphanedPins();
                        new Notice(`🧼 Cleaned ${result.cleaned} orphaned pinned images`);
                    } catch (error) {
                        console.error('Error cleaning orphaned pins:', error);
                        new Notice('Failed to clean orphaned pins');
                    } finally {
                        button.setButtonText('Clean Orphaned Pins');
                        button.setDisabled(false);
                    }
                }));

        // Add the refresh icon setting
        const refreshIconSetting = new Setting(containerEl)
            .setName('Show Refresh Icon')
            .setDesc('Show a refresh icon next to the pin icon to get a new random image')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showRefreshIcon)
                .onChange(async (value) => {
                    this.plugin.settings.showRefreshIcon = value;
                    await this.plugin.saveSettings();
                }));

        // Set initial visibility of dependent settings
        folderInputSetting.settingEl.style.display = this.plugin.settings.showPinIcon ? 'flex' : 'none';
        refreshIconSetting.settingEl.style.display = this.plugin.settings.showPinIcon ? 'flex' : 'none';

        new Setting(containerEl)
            .setName('Size')
            .setDesc('Select the size of the image - (API only)')
            .addDropdown(dropdown => dropdown
                .addOption('small', 'Small')
                .addOption('medium', 'Medium')
                .addOption('large', 'Large')
                .setValue(this.plugin.settings.imageSize)
                .onChange(async (value) => {
                    this.plugin.settings.imageSize = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Orientation')
            .setDesc('Select the orientation of the image - (API only)')
            .addDropdown(dropdown => dropdown
                .addOption('landscape', 'Landscape')
                .addOption('portrait', 'Portrait')
                .addOption('square', 'Square')
                .setValue(this.plugin.settings.imageOrientation)
                .onChange(async (value) => {
                    this.plugin.settings.imageOrientation = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Number of images')
            .setDesc('Enter the number of random images to fetch (3-50) - (API only)')
            .addText(text => text
                .setPlaceholder('10')
                .setValue(String(this.plugin.settings.numberOfImages || 10))
                .onChange(async (value) => {
                    let numValue = Number(value);
                    if (!isNaN(numValue)) {
                        numValue = Math.max(3, Math.min(numValue, 50)); // Ensure value is between 3 and 50
                        this.plugin.settings.numberOfImages = numValue;
                        await this.plugin.saveSettings();
                    }
                }))
            .then(setting => {
                const inputEl = setting.controlEl.querySelector('input');
                inputEl.type = 'number';
                inputEl.min = '3'; // Set minimum to 3
                inputEl.max = '50';
                inputEl.style.width = '50px';
            });

        const defaultKeywordsSetting = new Setting(containerEl)
            .setName('Default keywords')
            .setDesc('Enter a comma-separated list of default keywords to be used when no keyword is provided in the frontmatter, or when the provided keyword does not return any results. - (API only)')
            .addTextArea(text => {
                text
                    .setPlaceholder('Enter keywords, separated by commas')
                    .setValue(this.plugin.settings.defaultKeywords)
                    .onChange(async (value) => {
                        this.plugin.settings.defaultKeywords = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.style.width = '100%';
                text.inputEl.style.marginTop = '15px';
                text.inputEl.style.height = '90px';
            })
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.defaultKeywords = DEFAULT_SETTINGS.defaultKeywords;
                    await this.plugin.saveSettings();
                    this.display();
                })
            );

        defaultKeywordsSetting.settingEl.dataset.id = 'defaultKeywords';
        defaultKeywordsSetting.settingEl.style.display = 'flex';
        defaultKeywordsSetting.settingEl.style.flexDirection = 'column';
    }

    createGeneralSettings(containerEl) {
        // section callout
        const calloutEl = containerEl.createEl('div', { cls: 'tab-callout' });
        calloutEl.createEl('div', { text: 'Configure default settings for all notes. These can be overridden per folder or per note.' });

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

            new Setting(containerEl)
                .setName('Inline Title Color')
                .setDesc('Set the default inline title color for all banners')
                .addColorPicker(color => color
                    .setValue((() => {
                        const currentColor = this.plugin.settings.titleColor;
                        console.log('General tab - Current color:', currentColor);
                        
                        if (currentColor.startsWith('var(--')) {
                            console.log('General tab - Processing CSS variable');
                            const temp = document.createElement('div');
                            temp.style.color = currentColor;
                            document.body.appendChild(temp);
                            const computedColor = getComputedStyle(temp).color;
                            console.log('General tab - Computed color:', computedColor);
                            document.body.removeChild(temp);
                            
                            // Parse RGB values
                            const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                            console.log('General tab - RGB match:', rgbMatch);
                            if (rgbMatch) {
                                const [_, r, g, b] = rgbMatch;
                                const hexColor = '#' + 
                                    parseInt(r).toString(16).padStart(2, '0') +
                                    parseInt(g).toString(16).padStart(2, '0') +
                                    parseInt(b).toString(16).padStart(2, '0');
                                console.log('General tab - Final hex color:', hexColor);
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
                        this.plugin.updateAllBanners();
                        
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
        
        new Setting(containerEl)
            .setName('Hide Pixel Banner Fields')
            .setDesc('Hide banner-related frontmatter fields in Reading mode')
            .addToggle(toggle => {
                toggle
                    .setValue(this.plugin.settings.hidePixelBannerFields)
                    .onChange(async (value) => {
                        this.plugin.settings.hidePixelBannerFields = value;
                        if (!value) {
                            // Turn off the dependent setting
                            this.plugin.settings.hidePropertiesSectionIfOnlyBanner = false;
                            const dependentToggle = hidePropertiesSection.components[0]; // Get the toggle component
                            if (dependentToggle) {
                                dependentToggle.setValue(false);
                                dependentToggle.setDisabled(true);
                            }
                            
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
                        }
                        await this.plugin.saveSettings();
                        this.plugin.updateAllBanners();
                    });
                return toggle;
            })
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

                    // Update the UI
                    this.plugin.updateAllBanners();
                }));

        // Then create Hide Properties Section setting
        const hidePropertiesSection = new Setting(containerEl)
            .setName('Hide Properties Section')
            .setDesc('Hide the entire Properties section in Reading mode if it only contains Pixel Banner fields')
            .addToggle(toggle => {
                toggle
                    .setValue(this.plugin.settings.hidePropertiesSectionIfOnlyBanner)
                    .setDisabled(!this.plugin.settings.hidePixelBannerFields)
                    .onChange(async (value) => {
                        this.plugin.settings.hidePropertiesSectionIfOnlyBanner = value;
                        await this.plugin.saveSettings();
                        this.plugin.updateAllBanners();
                    });
                return toggle;
            })
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    this.plugin.settings.hidePropertiesSectionIfOnlyBanner = DEFAULT_SETTINGS.hidePropertiesSectionIfOnlyBanner;
                    await this.plugin.saveSettings();
                    
                    // Update the toggle state using the component directly
                    const toggle = hidePropertiesSection.components[0];
                    if (toggle) {
                        toggle.setValue(DEFAULT_SETTINGS.hidePropertiesSectionIfOnlyBanner);
                    }
                    
                    this.plugin.updateAllBanners();
                }));

        // Add back the Show Release Notes setting
        new Setting(containerEl)
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
                    // Update the toggle state
                    const toggleEl = button.extraSettingsEl.parentElement.querySelector('.checkbox-container input');
                    if (toggleEl) {
                        toggleEl.checked = DEFAULT_SETTINGS.showReleaseNotes;
                        toggleEl.dispatchEvent(new Event('change'));
                    }
                }));

        // Remove the old event listener setup since we're handling it in the onChange now
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
                placeholder: 'banner, pixel-banner, header-image'
            },
            {
                setting: 'customYPositionField',
                name: 'Y-Position Field Names',
                desc: 'Set custom field names for the Y-position in frontmatter (comma-separated)',
                placeholder: 'banner-y, y-position, banner-offset'
            },
            {
                setting: 'customContentStartField',
                name: 'Content Start Position Field Names',
                desc: 'Set custom field names for the content start position in frontmatter (comma-separated)',
                placeholder: 'content-start, start-position, content-offset'
            },
            {
                setting: 'customImageDisplayField',
                name: 'Image Display Field Names',
                desc: 'Set custom field names for the image display in frontmatter (comma-separated)',
                placeholder: 'banner-display, image-display, display-mode'
            },
            {
                setting: 'customImageRepeatField',
                name: 'Image Repeat Field Names',
                desc: 'Set custom field names for the image repeat in frontmatter (comma-separated)',
                placeholder: 'banner-repeat, image-repeat, repeat-image'
            },
            {
                setting: 'customBannerHeightField',
                name: 'Banner Height Field Names',
                desc: 'Set custom field names for the banner height in frontmatter (comma-separated)',
                placeholder: 'banner-height, image-height, header-height'
            },
            {
                setting: 'customFadeField',
                name: 'Fade Field Names',
                desc: 'Set custom field names for the fade effect in frontmatter (comma-separated)',
                placeholder: 'banner-fade, fade-effect, image-fade'
            },
            {
                setting: 'customBorderRadiusField',
                name: 'Border Radius Field Names',
                desc: 'Set custom field names for the border radius in frontmatter (comma-separated)',
                placeholder: 'banner-radius, border-radius, banner-corner-radius'
            },
            {
                setting: 'customTitleColorField',
                name: 'Inline Title Color Field Names',
                desc: 'Set custom field names for the inline title color in frontmatter (comma-separated)',
                placeholder: 'banner-title-color, title-color, header-color'
            },
        ];

        customFields.forEach(field => {
            new Setting(containerEl)
                .setName(field.name)
                .setDesc(field.desc)
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
        calloutEl.createEl('div', { text: 'Set default banner images for specific folders. These will apply to all notes in the folder unless overridden by note-specific settings. To get started, add a folder image setting and click the "+ Add Folder Image Setting" button below.' });

        const folderImagesContainer = containerEl.createDiv('folder-images-container');

        const updateFolderSettings = () => {
            folderImagesContainer.empty();
            
            // Sort the folder images by folder path
            const sortedFolderImages = [...this.plugin.settings.folderImages].sort((a, b) => {
                const folderA = (a.folder || '').toLowerCase();
                const folderB = (b.folder || '').toLowerCase();
                return folderA.localeCompare(folderB);
            });

            // Update the original array to maintain the sorted order
            this.plugin.settings.folderImages = sortedFolderImages;
            
            // Create all folder image settings
            const folderSettings = sortedFolderImages.map((folderImage, index) => 
                new FolderImageSetting(folderImagesContainer, this.plugin, folderImage, index, updateFolderSettings)
            );

            // If this update was triggered by adding a new setting, focus its input
            if (this.shouldFocusNewFolder) {
                // Focus the first folder setting's input since it's the newly added one
                folderSettings[0]?.folderInputEl?.focus();
                this.shouldFocusNewFolder = false;
            }
        };

        updateFolderSettings();

        const addFolderContainer = containerEl.createDiv('add-folder-image-setting');
        new Setting(addFolderContainer)
            .addButton(button => button
                .setButtonText("+ Add Folder Image Setting")
                .onClick(async () => {
                    this.plugin.settings.folderImages.push({ folder: "", image: "", yPosition: 50, contentStartPosition: 150 });
                    await this.plugin.saveSettings();
                    this.shouldFocusNewFolder = true;
                    updateFolderSettings();
                }));
    }

    createExampleSettings(containerEl) {
        new Setting(containerEl)
            .setName('How to use')
            .setHeading()
            .settingEl.querySelector('.setting-item-name').style.cssText = 'color: var(--text-accent-hover); font-size: var(--font-ui-large);';

        // Helper function to get a random item from an array
        const getRandomFieldName = (fieldNames) => {
            const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
            return names[Math.floor(Math.random() * names.length)];
        };

        const instructionsEl = containerEl.createEl('div', { cls: 'pixel-banner-section' });
        instructionsEl.createEl('p', { text: 'Add the following fields to your note\'s frontmatter to customize the banner:' });
        const codeEl = instructionsEl.createEl('pre');
        codeEl.createEl('code', { text: 
`---
${getRandomFieldName(this.plugin.settings.customBannerField)}: blue turtle
${getRandomFieldName(this.plugin.settings.customYPositionField)}: 30
${getRandomFieldName(this.plugin.settings.customContentStartField)}: 200
${getRandomFieldName(this.plugin.settings.customImageDisplayField)}: contain
${getRandomFieldName(this.plugin.settings.customImageRepeatField)}: true
${getRandomFieldName(this.plugin.settings.customBannerHeightField)}: 400
${getRandomFieldName(this.plugin.settings.customFadeField)}: -75
${getRandomFieldName(this.plugin.settings.customBorderRadiusField)}: 25
${getRandomFieldName(this.plugin.settings.customTitleColorField)}: #ff0000
---

# Or use a direct URL:
---
${getRandomFieldName(this.plugin.settings.customBannerField)}: https://example.com/image.jpg
${getRandomFieldName(this.plugin.settings.customYPositionField)}: 70
${getRandomFieldName(this.plugin.settings.customContentStartField)}: 180
${getRandomFieldName(this.plugin.settings.customImageDisplayField)}: cover
${getRandomFieldName(this.plugin.settings.customBannerHeightField)}: 300
${getRandomFieldName(this.plugin.settings.customFadeField)}: -75
${getRandomFieldName(this.plugin.settings.customBorderRadiusField)}: 0
${getRandomFieldName(this.plugin.settings.customTitleColorField)}: #00ff00
---

# Or use a path to an image in the vault:
---
${getRandomFieldName(this.plugin.settings.customBannerField)}: Assets/my-image.png
${getRandomFieldName(this.plugin.settings.customYPositionField)}: 0
${getRandomFieldName(this.plugin.settings.customContentStartField)}: 100
${getRandomFieldName(this.plugin.settings.customImageDisplayField)}: auto
${getRandomFieldName(this.plugin.settings.customBannerHeightField)}: 250
${getRandomFieldName(this.plugin.settings.customFadeField)}: -75
${getRandomFieldName(this.plugin.settings.customBorderRadiusField)}: 50
${getRandomFieldName(this.plugin.settings.customTitleColorField)}: #0000ff
---

# Or use an Obsidian internal link:
---
${getRandomFieldName(this.plugin.settings.customBannerField)}: [[example-image.png]]
${getRandomFieldName(this.plugin.settings.customYPositionField)}: 100
${getRandomFieldName(this.plugin.settings.customContentStartField)}: 50
${getRandomFieldName(this.plugin.settings.customImageDisplayField)}: contain
${getRandomFieldName(this.plugin.settings.customImageRepeatField)}: false
${getRandomFieldName(this.plugin.settings.customBannerHeightField)}: 500
${getRandomFieldName(this.plugin.settings.customFadeField)}: -75
${getRandomFieldName(this.plugin.settings.customBorderRadiusField)}: 17
${getRandomFieldName(this.plugin.settings.customTitleColorField)}: #ff00ff
---`
        });

        instructionsEl.createEl('p', { text: 'Note: The image display options are "auto", "cover", or "contain". The image repeat option is only applicable when the display is set to "contain".' });

        // Add example image
        containerEl.createEl('img', {
            attr: {
                src: 'https://raw.githubusercontent.com/jparkerweb/pixel-banner/main/example.jpg',
                alt: 'Example of a Pixel banner',
                style: 'max-width: 100%; height: auto; margin-top: 10px; border-radius: 5px;'
            }
        });
    }

    validateFieldName(value, otherFieldName) {
        if (value === otherFieldName) {
            new Notice("Field names must be unique!");
            return false;
        }
        return true;
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

// API test functions
async function testPexelsApi(apiKey) {
    try {
        const response = await fetch('https://api.pexels.com/v1/search?query=dog&per_page=3', {
            headers: {
                'Authorization': apiKey
            }
        });
        
        if (!response.ok) {
            throw new Error('❌ Invalid Pexels API key');
        }
        
        const data = await response.json();
        return data.photos && data.photos.length > 0; // Ensure photos are present
    } catch (error) {
        return false;
    }
}

async function testPixabayApi(apiKey) {
    try {
        const response = await fetch(`https://pixabay.com/api/?key=${apiKey}&q=test&per_page=3`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        return true;
    } catch (error) {
        return false;
    }
}

async function testFlickrApi(apiKey) {
    try {
        const response = await fetch(`https://www.flickr.com/services/rest/?method=flickr.test.echo&api_key=${apiKey}&format=json&nojsoncallback=1`);
        const data = await response.json();
        return data.stat === 'ok';
    } catch (error) {
        return false;
    }
}

async function testUnsplashApi(apiKey) {
    try {
        const response = await fetch('https://api.unsplash.com/photos/random', {
            headers: {
                'Authorization': `Client-ID ${apiKey}`
            }
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

export { DEFAULT_SETTINGS, FolderSuggestModal, FolderImageSetting, PixelBannerSettingTab, debounce };
