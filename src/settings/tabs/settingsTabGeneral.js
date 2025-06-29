import { Setting, MarkdownView } from 'obsidian';
import { DEFAULT_SETTINGS, FolderSuggestModal } from '../settings';
import { flags } from '../../resources/flags.js';

export function createGeneralSettings(containerEl, plugin) {
    // section callout
    const calloutEl = containerEl.createEl('div', { cls: 'tab-callout margin-bottom-0' });
    calloutEl.createEl('div', { text: '⚙️ Configure default settings for all notes.' });

    // Create a group for the select image icon settings
    const SelectImageSettingsGroup = containerEl.createDiv({ cls: 'setting-group' });

    // Add the showSelectImageIcon setting
    const showSelectImageIconSetting = new Setting(SelectImageSettingsGroup)
        .setName('Show Pixel Banner Flag')
        .setDesc('Show the banner selector icon in the top-left corner of notes')
        .addToggle(toggle => toggle
            .setValue(plugin.settings.showSelectImageIcon)
            .onChange(async (value) => {
                plugin.settings.showSelectImageIcon = value;
                await plugin.saveSettings();
                plugin.updateAllBanners();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.showSelectImageIcon = DEFAULT_SETTINGS.showSelectImageIcon;
                await plugin.saveSettings();
                
                const toggleComponent = showSelectImageIconSetting.components[0];
                if (toggleComponent) {
                    toggleComponent.setValue(DEFAULT_SETTINGS.showSelectImageIcon);
                }
                
                plugin.updateAllBanners();
            }));

    // Add the selectImageIconOpacity setting
    const selectImageIconOpacitySetting = new Setting(SelectImageSettingsGroup)
        .setName('Pixel Banner Flag Opacity')
        .setDesc('Set the opacity of the banner selector icon in the top-left corner (0-100)')
        .addSlider(slider => slider
            .setLimits(0, 100, 1)
            .setValue(plugin.settings.selectImageIconOpacity)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.selectImageIconOpacity = value;
                await plugin.saveSettings();
                plugin.updateAllBanners();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.selectImageIconOpacity = DEFAULT_SETTINGS.selectImageIconOpacity;
                await plugin.saveSettings();
                
                const sliderEl = button.extraSettingsEl.parentElement.querySelector('.slider');
                sliderEl.value = DEFAULT_SETTINGS.selectImageIconOpacity;
                sliderEl.dispatchEvent(new Event('input'));
                
                plugin.updateAllBanners();
            }));

    // Add the selectImageIconFlag setting
    const selectImageIconFlagSetting = new Setting(SelectImageSettingsGroup)
        .setName('Select Pixel Banner Flag Color')
        .setDesc('Choose which flag color to use for the banner selector');
        
    // Create a container for the radio buttons
    const flagRadioContainer = selectImageIconFlagSetting.controlEl.createDiv({
        cls: 'pixel-banner-flag-radio-container',
        attr: {
            style: `
                max-width: 600px;
            `
        }
    });
    
    // Add style for the radio container
    flagRadioContainer.style.display = 'flex';
    flagRadioContainer.style.flexWrap = 'wrap';
    flagRadioContainer.style.gap = '10px';
    
    // Create a radio button for each flag
    Object.keys(flags).forEach(color => {
        const radioContainer = flagRadioContainer.createDiv({
            cls: 'pixel-banner-flag-radio'
        });
        
        // Create the radio input
        const radio = radioContainer.createEl('input', {
            type: 'radio',
            attr: {
                id: `flag-${color}`,
                name: 'pixel-banner-flag',
                value: color
            }
        });
        
        // Set checked state based on current setting
        radio.checked = plugin.settings.selectImageIconFlag === color;
        
        // Add change event listener
        radio.addEventListener('change', async () => {
            if (radio.checked) {
                plugin.settings.selectImageIconFlag = color;
                await plugin.saveSettings();
                plugin.updateAllBanners();
            }
        });
        
        // Create the label with the flag image
        const label = radioContainer.createEl('label', {
            attr: {
                for: `flag-${color}`
            }
        });
        
        // Add the flag image to the label
        const img = label.createEl('img', {
            attr: {
                src: flags[color],
                alt: `${color} flag`
            }
        });
        
        // Style the image
        img.style.width = '20px';
        img.style.height = '25px';
        img.style.verticalAlign = 'middle';
        img.style.marginLeft = '5px';
        
        // Add the color name
        // label.append(` ${color}`);
    });
    
    // Add reset button
    selectImageIconFlagSetting.addExtraButton(button => button
        .setIcon('reset')
        .setTooltip('Reset to default')
        .onClick(async () => {
            plugin.settings.selectImageIconFlag = DEFAULT_SETTINGS.selectImageIconFlag;
            await plugin.saveSettings();
            
            // Update radio button selection
            const radios = flagRadioContainer.querySelectorAll('input[type="radio"]');
            radios.forEach(radio => {
                radio.checked = radio.value === DEFAULT_SETTINGS.selectImageIconFlag;
            });
            
            plugin.updateAllBanners();
        }));

    // Add the Default Saved Banners Folder setting
    const defaultSavedBannersFolderSetting = new Setting(SelectImageSettingsGroup)
        .setName('Default Saved Banners Folder')
        .setDesc('Default folder where Banners will be saved')
        .addText(text => {
            text.setPlaceholder('pixel-banner-images')
                .setValue(plugin.settings.pinnedImageFolder)
                .onChange(async (value) => {
                    plugin.settings.pinnedImageFolder = value;
                    await plugin.saveSettings();
                });

            // Add blur handler for validation
            text.inputEl.addEventListener('blur', async (event) => {
                let value = text.inputEl.value.trim();
                
                if (!value) {
                    value = 'pixel-banner-images';
                }

                text.setValue(value);
                plugin.settings.pinnedImageFolder = value;
                await plugin.saveSettings();
            });

            return text;
        })
        .addButton(button => button
            .setButtonText('Browse')
            .onClick(() => {
                new FolderSuggestModal(plugin.app, (chosenPath) => {
                    plugin.settings.pinnedImageFolder = chosenPath;
                    const textInput = defaultSavedBannersFolderSetting.components[0];
                    if (textInput) {
                        textInput.setValue(chosenPath);
                    }
                    plugin.saveSettings();
                }).open();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.pinnedImageFolder = DEFAULT_SETTINGS.pinnedImageFolder;
                await plugin.saveSettings();
                
                const textComponent = defaultSavedBannersFolderSetting.components[0];
                if (textComponent) {
                    textComponent.setValue(DEFAULT_SETTINGS.pinnedImageFolder);
                }
            }));

    // Add the defaultSelectImagePath setting
    const defaultSelectImagePathSetting = new Setting(SelectImageSettingsGroup)
        .setName('Default Select Image Path')
        .setDesc('Set a default folder path to filter images when opening the Select Image modal')
        .addText(text => {
            text.setPlaceholder('Example: Images/Banners')
                .setValue(plugin.settings.defaultSelectImagePath)
                .onChange(async (value) => {
                    plugin.settings.defaultSelectImagePath = value;
                    await plugin.saveSettings();
                });
            text.inputEl.style.width = '200px';
            return text;
        })
        .addButton(button => button
            .setButtonText('Browse')
            .onClick(() => {
                new FolderSuggestModal(plugin.app, (chosenPath) => {
                    plugin.settings.defaultSelectImagePath = chosenPath;
                    const textInput = defaultSelectImagePathSetting.components[0];
                    if (textInput) {
                        textInput.setValue(chosenPath);
                    }
                    plugin.saveSettings();
                }).open();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.defaultSelectImagePath = DEFAULT_SETTINGS.defaultSelectImagePath;
                await plugin.saveSettings();
                
                const textComponent = defaultSelectImagePathSetting.components[0];
                if (textComponent) {
                    textComponent.setValue(DEFAULT_SETTINGS.defaultSelectImagePath);
                }
            }));

    // Add the defaultSelectIconPath setting
    const defaultSelectIconPathSetting = new Setting(SelectImageSettingsGroup)
        .setName('Default Select Icon Path')
        .setDesc('Set a default folder path to filter images when selecting a banner icon image')
        .addText(text => {
            text.setPlaceholder('Example: Images/Icons')
                .setValue(plugin.settings.defaultSelectIconPath)
                .onChange(async (value) => {
                    plugin.settings.defaultSelectIconPath = value;
                    await plugin.saveSettings();
                });
            text.inputEl.style.width = '200px';
            return text;
        })
        .addButton(button => button
            .setButtonText('Browse')
            .onClick(() => {
                new FolderSuggestModal(plugin.app, (chosenPath) => {
                    plugin.settings.defaultSelectIconPath = chosenPath;
                    const textInput = defaultSelectIconPathSetting.components[0];
                    if (textInput) {
                        textInput.setValue(chosenPath);
                    }
                    plugin.saveSettings();
                }).open();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.defaultSelectIconPath = DEFAULT_SETTINGS.defaultSelectIconPath;
                await plugin.saveSettings();
                
                const textComponent = defaultSelectIconPathSetting.components[0];
                if (textComponent) {
                    textComponent.setValue(DEFAULT_SETTINGS.defaultSelectIconPath);
                }
            }));

    // Add the openTargetingModalAfterSelectingBannerOrIcon setting
    const openTargetingModalSetting = new Setting(SelectImageSettingsGroup)
        .setName('Open Targeting Modal after selecting a Banner or Icon')
        .setDesc('Automatically open the Targeting Modal after selecting a banner image or icon')
        .addToggle(toggle => toggle
            .setValue(plugin.settings.openTargetingModalAfterSelectingBannerOrIcon)
            .onChange(async (value) => {
                plugin.settings.openTargetingModalAfterSelectingBannerOrIcon = value;
                await plugin.saveSettings();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.openTargetingModalAfterSelectingBannerOrIcon = DEFAULT_SETTINGS.openTargetingModalAfterSelectingBannerOrIcon;
                await plugin.saveSettings();
                
                const toggleComponent = openTargetingModalSetting.components[0];
                if (toggleComponent) {
                    toggleComponent.setValue(DEFAULT_SETTINGS.openTargetingModalAfterSelectingBannerOrIcon);
                }
            }));

    // Banner Max Width
    new Setting(containerEl)
        .setName('Banner Max Width')
        .setDesc('Set the maximum width for banner images (100-2560 pixels)')
        .addSlider(slider => slider
            .setLimits(100, 2560, 10)
            .setValue(plugin.settings.bannerMaxWidth)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.bannerMaxWidth = value;
                await plugin.saveSettings();
                plugin.updateAllBanners();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.bannerMaxWidth = DEFAULT_SETTINGS.bannerMaxWidth;
                await plugin.saveSettings();
                const sliderInput = button.extraSettingsEl.parentElement.querySelector('input[type="range"]');
                sliderInput.value = DEFAULT_SETTINGS.bannerMaxWidth;
                const event = new Event('input', { bubbles: true, cancelable: true });
                sliderInput.dispatchEvent(event);
                plugin.updateAllBanners();
            }));

    // Image Horizontal Position setting
    new Setting(containerEl)
        .setName('Image Horizontal Position')
        .setDesc('Set the horizontal position of the image (0-100)')
        .addSlider(slider => slider
            .setLimits(0, 100, 1)
            .setValue(plugin.settings.xPosition)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.xPosition = value;
                await plugin.saveSettings();
                plugin.updateAllBanners();
            })
        )
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.xPosition = DEFAULT_SETTINGS.xPosition;
                await plugin.saveSettings();
                plugin.updateAllBanners();
                // Update the slider value
                const sliderEl = button.extraSettingsEl.parentElement.querySelector('.slider');
                sliderEl.value = DEFAULT_SETTINGS.xPosition;
                sliderEl.dispatchEvent(new Event('input'));
            }));

    // Image Vertical Position setting
    new Setting(containerEl)
        .setName('Image Vertical Position')
        .setDesc('Set the vertical position of the image (0-100)')
        .addSlider(slider => slider
            .setLimits(0, 100, 1)
            .setValue(plugin.settings.yPosition)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.yPosition = value;
                await plugin.saveSettings();
                plugin.updateAllBanners();
            })
        )
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.yPosition = DEFAULT_SETTINGS.yPosition;
                await plugin.saveSettings();
                plugin.updateAllBanners();
                // Update the slider value
                const sliderEl = button.extraSettingsEl.parentElement.querySelector('.slider');
                sliderEl.value = DEFAULT_SETTINGS.yPosition;
                sliderEl.dispatchEvent(new Event('input'));
            }));
    
    // Content Start Position setting
    new Setting(containerEl)
        .setName('Content Start Position')
        .setDesc('Set the default vertical position where the content starts (in pixels)')
        .addText(text => text
            .setPlaceholder('150')
            .setValue(String(plugin.settings.contentStartPosition))
            .onChange(async (value) => {
                const numValue = Number(value);
                if (!isNaN(numValue) && numValue >= 0) {
                plugin.settings.contentStartPosition = numValue;
                await plugin.saveSettings();
                plugin.updateAllBanners();
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
                plugin.settings.contentStartPosition = DEFAULT_SETTINGS.contentStartPosition;
                await plugin.saveSettings();
                plugin.updateAllBanners();
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
                .setValue(plugin.settings.imageDisplay || 'cover')
                .onChange(async (value) => {
                    plugin.settings.imageDisplay = value;
                    await plugin.saveSettings();
                    plugin.updateAllBanners();
                });
            return dropdown;
        })
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.imageDisplay = DEFAULT_SETTINGS.imageDisplay;
                await plugin.saveSettings();
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
                .setValue(plugin.settings.imageRepeat)
                .onChange(async (value) => {
                    plugin.settings.imageRepeat = value;
                    await plugin.saveSettings();
                    plugin.updateAllBanners();
                });
            return toggle;
        })
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.imageRepeat = DEFAULT_SETTINGS.imageRepeat;
                await plugin.saveSettings();
                plugin.updateAllBanners();

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
        .setDesc('Set the default height of the banner image (0-1280 pixels)')
        .addText(text => {
            text.setPlaceholder('350')
                .setValue(String(plugin.settings.bannerHeight))
                .onChange(async (value) => {
                    // Allow any input, including empty string
                    if (value === '' || !isNaN(Number(value))) {
                        await plugin.saveSettings();
                    }
                });
            
            // Add event listener for 'blur' event
            text.inputEl.addEventListener('blur', async (event) => {
                let numValue = Number(event.target.value);
                if (isNaN(numValue) || event.target.value === '') {
                    // If the value is not a number or is empty, set to default
                    numValue = 350;
                } else {
                    // Ensure value is between 0 and 1280
                    numValue = Math.max(0, Math.min(1280, numValue));
                }
                plugin.settings.bannerHeight = numValue;
                text.setValue(String(numValue));
                await plugin.saveSettings();
                plugin.updateAllBanners();
            });

            text.inputEl.type = 'number';
            text.inputEl.min = '0';
            text.inputEl.max = '1280';
            text.inputEl.style.width = '50px';
        })
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.bannerHeight = DEFAULT_SETTINGS.bannerHeight;
                await plugin.saveSettings();
                plugin.updateAllBanners();
                // Update the input value
                const inputEl = button.extraSettingsEl.parentElement.querySelector('input');
                inputEl.value = DEFAULT_SETTINGS.bannerHeight;
                inputEl.dispatchEvent(new Event('input'));
            }));

    // Banner Fade setting
    new Setting(containerEl)
        .setName('Banner Fade')
        .setDesc('Set the default fade effect for the banner image (-300 to 100)')
        .addSlider(slider => slider
            .setLimits(-300, 100, 5)
            .setValue(plugin.settings.fade)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.fade = value;
                await plugin.saveSettings();
                plugin.updateAllBanners();
            })
        )
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.fade = DEFAULT_SETTINGS.fade;
                await plugin.saveSettings();
                plugin.updateAllBanners();
                // Update the slider value
                const sliderEl = button.extraSettingsEl.parentElement.querySelector('.slider');
                sliderEl.value = DEFAULT_SETTINGS.fade;
                sliderEl.dispatchEvent(new Event('input'));
            }));

    // Banner Fade In Animation Duration setting
    new Setting(containerEl)
        .setName('Banner Fade In Animation Duration')
        .setDesc('Set the default fade in animation duration for the banner image (0-1000 milliseconds)')
        .addSlider(slider => slider
            .setLimits(0, 1000, 1)
            .setValue(plugin.settings.bannerFadeInAnimationDuration)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.bannerFadeInAnimationDuration = value;
                await plugin.saveSettings();
                plugin.updateAllBanners();
            })
        )
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.bannerFadeInAnimationDuration = DEFAULT_SETTINGS.bannerFadeInAnimationDuration;
                await plugin.saveSettings();
                plugin.updateAllBanners();
                // Update the slider value
                const sliderEl = button.extraSettingsEl.parentElement.querySelector('.slider');
                sliderEl.value = DEFAULT_SETTINGS.bannerFadeInAnimationDuration;
                sliderEl.dispatchEvent(new Event('input'));
            }));

    // Border Radius setting
    new Setting(containerEl)
        .setName('Border Radius')
        .setDesc('Set the default border radius of the banner image (0-50 pixels)')
        .addSlider(slider => slider
            .setLimits(0, 50, 1)
            .setValue(plugin.settings.borderRadius)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.borderRadius = value;
                await plugin.saveSettings();
                plugin.updateAllBanners();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.borderRadius = DEFAULT_SETTINGS.borderRadius;
                await plugin.saveSettings();
                plugin.updateAllBanners();
                // Update the slider value
                const sliderEl = button.extraSettingsEl.parentElement.querySelector('.slider');
                sliderEl.value = DEFAULT_SETTINGS.borderRadius;
                sliderEl.dispatchEvent(new Event('input'));
            }));

    // Banner Gap setting
    new Setting(containerEl)
        .setName('Banner Gap')
        .setDesc('Set the gap between the banner and the window edges (0-50 pixels)')
        .addSlider(slider => slider
            .setLimits(0, 50, 1)
            .setValue(plugin.settings.bannerGap)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.bannerGap = value;
                await plugin.saveSettings();
                plugin.updateAllBanners();
            })
        )
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.bannerGap = DEFAULT_SETTINGS.bannerGap;
                await plugin.saveSettings();
                plugin.updateAllBanners();
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
                const currentColor = plugin.settings.titleColor;
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
                plugin.settings.titleColor = value;
                await plugin.saveSettings();
                plugin.updateAllBanners();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.titleColor = DEFAULT_SETTINGS.titleColor;
                await plugin.saveSettings();
                
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
        .setDesc("Hide titles of embedded notes if Obsidian's \"Show inline title\" setting is enabled")
        .addToggle(toggle => toggle
            .setValue(plugin.settings.hideEmbeddedNoteTitles)
            .onChange(async (value) => {
                plugin.settings.hideEmbeddedNoteTitles = value;
                await plugin.saveSettings();
                plugin.updateEmbeddedTitlesVisibility();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.hideEmbeddedNoteTitles = DEFAULT_SETTINGS.hideEmbeddedNoteTitles;
                await plugin.saveSettings();
                
                const toggleComponent = hideEmbeddedNoteTitlesSetting.components[0];
                if (toggleComponent) {
                    toggleComponent.setValue(DEFAULT_SETTINGS.hideEmbeddedNoteTitles);
                }
                
                plugin.updateEmbeddedTitlesVisibility();
            }));

    // Add hide embedded note banners setting
    const hideEmbeddedNoteBannersSetting = new Setting(containerEl)
        .setName('Hide Embedded Note Banners')
        .setDesc('Hide banners of embedded notes')
        .addToggle(toggle => toggle
            .setValue(plugin.settings.hideEmbeddedNoteBanners)
            .onChange(async (value) => {
                plugin.settings.hideEmbeddedNoteBanners = value;
                await plugin.saveSettings();
                plugin.updateEmbeddedBannersVisibility();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.hideEmbeddedNoteBanners = DEFAULT_SETTINGS.hideEmbeddedNoteBanners;
                await plugin.saveSettings();
                
                const toggleComponent = hideEmbeddedNoteBannersSetting.components[0];
                if (toggleComponent) {
                    toggleComponent.setValue(DEFAULT_SETTINGS.hideEmbeddedNoteBanners);
                }
                
                plugin.updateEmbeddedBannersVisibility();
            }));

    // Show Banner in Popover Previews setting
    new Setting(containerEl)
        .setName('Show Banner in Popover Previews')
        .setDesc('Show banners in popover note previews')
        .addToggle(toggle => toggle
            .setValue(plugin.settings.showBannerInPopoverPreviews)
            .onChange(async (value) => {
                plugin.settings.showBannerInPopoverPreviews = value;
                await plugin.saveSettings();
                plugin.updateAllBanners();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.showBannerInPopoverPreviews = DEFAULT_SETTINGS.showBannerInPopoverPreviews;
                await plugin.saveSettings();
                plugin.updateAllBanners();
                
                const checkboxContainer = button.extraSettingsEl.parentElement.querySelector('.checkbox-container');
                const toggleEl = checkboxContainer.querySelector('input');
                if (toggleEl) {
                    toggleEl.checked = DEFAULT_SETTINGS.showBannerInPopoverPreviews;
                    checkboxContainer.classList.toggle('is-enabled', DEFAULT_SETTINGS.showBannerInPopoverPreviews);
                }
            }));

    // Add the showViewImageIcon setting
    const showViewImageIconSetting = new Setting(containerEl)
        .setName('Show View Image Icon')
        .setDesc('Show an icon to view the banner image in full screen')
        .addToggle(toggle => toggle
            .setValue(plugin.settings.showViewImageIcon)
            .onChange(async (value) => {
                plugin.settings.showViewImageIcon = value;
                await plugin.saveSettings();
                plugin.updateAllBanners();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.showViewImageIcon = DEFAULT_SETTINGS.showViewImageIcon;
                await plugin.saveSettings();
                
                const toggleComponent = showViewImageIconSetting.components[0];
                if (toggleComponent) {
                    toggleComponent.setValue(DEFAULT_SETTINGS.showViewImageIcon);
                }
                
                plugin.updateAllBanners();
            }));

    // Pinned Image Property Format
    new Setting(containerEl)
        .setName('Image Property Format')
        .setDesc('Set the format for the banner property value.')
        .addDropdown(dropdown => dropdown
            .addOption('![[image]]', '![[image]]')
            .addOption('[[image]]', '[[image]]')
            .setValue(plugin.settings.imagePropertyFormat)
            .onChange(async (value) => {
                plugin.settings.imagePropertyFormat = value;
                await plugin.saveSettings();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.imagePropertyFormat = DEFAULT_SETTINGS.imagePropertyFormat;
                await plugin.saveSettings();
                const dropdown = button.extraSettingsEl.parentElement.querySelector('select');
                dropdown.value = DEFAULT_SETTINGS.imagePropertyFormat;
            }));
    
    // Create a group for the hide settings
    const hideSettingsGroup = containerEl.createDiv({ cls: 'setting-group' });

    // For Hide Pixel Banner Fields
    const hidePixelBannerFieldsSetting = new Setting(hideSettingsGroup)
        .setName('Hide Pixel Banner Fields')
        .setDesc('Hide banner-related frontmatter fields in Reading mode')
        .addToggle(toggle => toggle
            .setValue(plugin.settings.hidePixelBannerFields)
            .onChange(async (value) => {
                plugin.settings.hidePixelBannerFields = value;
                if (!value) {
                    // Turn off the dependent setting
                    plugin.settings.hidePropertiesSectionIfOnlyBanner = false;
                    const dependentToggle = hidePropertiesSection.components[0];
                    if (dependentToggle) {
                        dependentToggle.setValue(false);
                        dependentToggle.setDisabled(true);
                    }
                    hidePropertiesSection.settingEl.addClass('is-disabled');
                    
                    // Remove the hidden class from all previously hidden fields
                    plugin.app.workspace.iterateAllLeaves(leaf => {
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
                await plugin.saveSettings();
                plugin.updateAllBanners();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                // Reset both settings to their defaults
                plugin.settings.hidePixelBannerFields = DEFAULT_SETTINGS.hidePixelBannerFields;
                plugin.settings.hidePropertiesSectionIfOnlyBanner = DEFAULT_SETTINGS.hidePropertiesSectionIfOnlyBanner;
                await plugin.saveSettings();
                
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
                
                plugin.updateAllBanners();
            }));

    // Then create Hide Properties Section setting
    const hidePropertiesSection = new Setting(hideSettingsGroup)
        .setName('Hide Properties Section')
        .setDesc('Hide the entire Properties section in Reading mode if it only contains Pixel Banner fields')
        .addToggle(toggle => toggle
            .setValue(plugin.settings.hidePropertiesSectionIfOnlyBanner)
            .setDisabled(!plugin.settings.hidePixelBannerFields)
            .onChange(async (value) => {
                plugin.settings.hidePropertiesSectionIfOnlyBanner = value;
                await plugin.saveSettings();
                plugin.updateAllBanners();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.hidePropertiesSectionIfOnlyBanner = DEFAULT_SETTINGS.hidePropertiesSectionIfOnlyBanner;
                await plugin.saveSettings();
                
                const toggle = hidePropertiesSection.components[0];
                if (toggle) {
                    toggle.setValue(DEFAULT_SETTINGS.hidePropertiesSectionIfOnlyBanner);
                }
                
                plugin.updateAllBanners();
            }));

    // Add dependent styling
    hidePropertiesSection.settingEl.addClass('setting-dependent');
    if (!plugin.settings.hidePixelBannerFields) {
        hidePropertiesSection.settingEl.addClass('is-disabled');
    }

    // Banner Icon settings
    new Setting(containerEl)
        .setName('Default Banner Icon Size')
        .setDesc('Set the default size for the banner icon')
        .addSlider(slider => slider
            .setLimits(10, 200, 1)
            .setValue(plugin.settings.bannerIconSize)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.bannerIconSize = value;
                await plugin.saveSettings();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.bannerIconSize = DEFAULT_SETTINGS.bannerIconSize;
                await plugin.saveSettings();
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
            .setValue(plugin.settings.bannerIconXPosition)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.bannerIconXPosition = value;
                await plugin.saveSettings();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.bannerIconXPosition = DEFAULT_SETTINGS.bannerIconXPosition;
                await plugin.saveSettings();
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
            .setValue(plugin.settings.bannerIconOpacity)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.bannerIconOpacity = value;
                await plugin.saveSettings();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.bannerIconOpacity = DEFAULT_SETTINGS.bannerIconOpacity;
                await plugin.saveSettings();
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
            .setValue(plugin.settings.bannerIconColor)
            .onChange(async (value) => {
                plugin.settings.bannerIconColor = value;
                await plugin.saveSettings();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.bannerIconColor = DEFAULT_SETTINGS.bannerIconColor;
                await plugin.saveSettings();
                const textInput = button.extraSettingsEl.parentElement.querySelector('input[type="text"]');
                textInput.value = DEFAULT_SETTINGS.bannerIconColor;
                const event = new Event('input', { bubbles: true, cancelable: true });
                textInput.dispatchEvent(event);
            }));

    // Banner Icon Font Weight
    new Setting(containerEl)
        .setName('Default Banner Icon Font Weight')
        .setDesc('Set the default font weight for the banner icon')
        .addDropdown(dropdown => {
            dropdown
                .addOption('lighter', 'Lighter')
                .addOption('normal', 'Normal')
                .addOption('bold', 'Bold')
                .setValue(plugin.settings.bannerIconFontWeight || 'normal')
                .onChange(async (value) => {
                    plugin.settings.bannerIconFontWeight = value;
                    await plugin.saveSettings();
                });
            return dropdown;
        })
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.bannerIconFontWeight = DEFAULT_SETTINGS.bannerIconFontWeight;
                await plugin.saveSettings();
                const dropdownEl = button.extraSettingsEl.parentElement.querySelector('select');
                dropdownEl.value = DEFAULT_SETTINGS.bannerIconFontWeight;
                dropdownEl.dispatchEvent(new Event('change'));
            }));

    // Banner Icon Background Color
    new Setting(containerEl)
        .setName('Default Banner Icon Background Color')
        .setDesc('Set the default background color for the banner icon')
        .addText(text => text
            .setPlaceholder('Enter color (e.g., #ffffff or transparent)')
            .setValue(plugin.settings.bannerIconBackgroundColor)
            .onChange(async (value) => {
                plugin.settings.bannerIconBackgroundColor = value;
                await plugin.saveSettings();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.bannerIconBackgroundColor = DEFAULT_SETTINGS.bannerIconBackgroundColor;
                await plugin.saveSettings();
                const textInput = button.extraSettingsEl.parentElement.querySelector('input[type="text"]');
                textInput.value = DEFAULT_SETTINGS.bannerIconBackgroundColor;
                const event = new Event('input', { bubbles: true, cancelable: true });
                textInput.dispatchEvent(event);
            }));

    // Banner Icon Padding X
    new Setting(containerEl)
        .setName('Default Banner Icon Padding X')
        .setDesc('Set the default padding X for the banner icon')
        .addSlider(slider => slider
            .setLimits(0, 100, 1)
            .setValue(plugin.settings.bannerIconPaddingX)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.bannerIconPaddingX = value;
                await plugin.saveSettings();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.bannerIconPaddingX = DEFAULT_SETTINGS.bannerIconPaddingX;
                await plugin.saveSettings();
                const sliderInput = button.extraSettingsEl.parentElement.querySelector('input[type="range"]');
                sliderInput.value = DEFAULT_SETTINGS.bannerIconPaddingX;
                const event = new Event('input', { bubbles: true, cancelable: true });
                sliderInput.dispatchEvent(event);
            }));

    // Banner Icon Padding Y
    new Setting(containerEl)
        .setName('Default Banner Icon Padding Y')
        .setDesc('Set the default padding Y for the banner icon')
        .addSlider(slider => slider
            .setLimits(0, 100, 1)
            .setValue(plugin.settings.bannerIconPaddingY)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.bannerIconPaddingY = value;
                await plugin.saveSettings();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.bannerIconPaddingY = DEFAULT_SETTINGS.bannerIconPaddingY;
                await plugin.saveSettings();
                const sliderInput = button.extraSettingsEl.parentElement.querySelector('input[type="range"]');
                sliderInput.value = DEFAULT_SETTINGS.bannerIconPaddingY;
                const event = new Event('input', { bubbles: true, cancelable: true });
                sliderInput.dispatchEvent(event);
            }));

    // Banner Icon Border Radius
    new Setting(containerEl)
        .setName('Default Banner Icon Border Radius')
        .setDesc('Set the default border radius for the banner icon')
        .addSlider(slider => slider
            .setLimits(0, 100, 1)
            .setValue(plugin.settings.bannerIconBorderRadius)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.bannerIconBorderRadius = value;
                await plugin.saveSettings();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.bannerIconBorderRadius = DEFAULT_SETTINGS.bannerIconBorderRadius;
                await plugin.saveSettings();
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
            .setValue(plugin.settings.bannerIconVeritalOffset)
            .setDynamicTooltip()
            .onChange(async (value) => {
                plugin.settings.bannerIconVeritalOffset = value;
                await plugin.saveSettings();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.bannerIconVeritalOffset = DEFAULT_SETTINGS.bannerIconVeritalOffset;
                await plugin.saveSettings();
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
            .setValue(plugin.settings.showReleaseNotes)
            .onChange(async (value) => {
                plugin.settings.showReleaseNotes = value;
                await plugin.saveSettings();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.showReleaseNotes = DEFAULT_SETTINGS.showReleaseNotes;
                await plugin.saveSettings();
                
                const toggleComponent = showReleaseNotesSetting.components[0];
                if (toggleComponent) {
                    toggleComponent.setValue(DEFAULT_SETTINGS.showReleaseNotes);
                }
            }));

    // Add promotional links at the bottom
    const promotionalLinks = containerEl.createDiv({
        cls: 'pixel-banner-promotional-links',
        attr: {
            style: `
                display: flex;
                gap: 10px;
                justify-content: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid var(--background-modifier-border);
            `
        }
    });

    const discordLink = promotionalLinks.createEl('a', {
        href: 'https://discord.gg/sp8AQQhMJ7',
        target: 'discord',
    });
    discordLink.createEl('img', {
        attr: {
            height: '36',
            src: 'https://raw.githubusercontent.com/jparkerweb/pixel-banner/refs/heads/main/img/discord.png?raw=true',
            alt: 'Discord'
        }
    });
    const kofiLink = promotionalLinks.createEl('a', {
        href: 'https://ko-fi.com/Z8Z212UMBI',
        target: 'kofi',
    });
    kofiLink.createEl('img', {
        attr: {
            height: '36',
            src: 'https://raw.githubusercontent.com/jparkerweb/pixel-banner/refs/heads/main/img/support.png?raw=true',
            alt: 'Buy Me a Coffee at ko-fi.com'
        }
    });
} 