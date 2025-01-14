import { PluginSettingTab, Setting, FuzzySuggestModal, MarkdownView } from 'obsidian';
import { createExampleSettings } from './settingsTabExample';
import { createAPISettings } from './settingsTabAPISettings';
import { createFolderSettings } from './settingsTabFolderImages';
import { createCustomFieldsSettings } from './settingsTabCustomFieldNames';

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
        createCustomFieldsSettings(customFieldsTab, this.plugin);

        // API Settings tab content
        const apiTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': 'API Settings' } });
        createAPISettings(apiTab, this.plugin);

        // Folder Images tab content
        const foldersTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': 'Folder Images' } });
        createFolderSettings(foldersTab, this.plugin);

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

export { DEFAULT_SETTINGS, FolderSuggestModal, PixelBannerSettingTab, debounce };
