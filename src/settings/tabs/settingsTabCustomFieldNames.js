import { Setting } from 'obsidian';
import { DEFAULT_SETTINGS } from '../settings';

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

export function createCustomFieldsSettings(containerEl, plugin) {
    // section callout
    const calloutEl = containerEl.createEl('div', { cls: 'tab-callout' });
    calloutEl.createEl('div', { text: '🗺️ Customize the frontmatter field names used for Pixel Banner. You can define multiple names for each field, separated by commas. Field names can only contain letters, numbers, dashes, and underscores. Example: "banner, pixel-banner, header_image" could all be used as the banner field name.' });

    const customFields = [
        {
            setting: 'customBannerField',
            name: 'Banner Field Names',
            desc: 'Set custom field names for the banner in frontmatter',
            values: '[[image.png]], "images/image.jpg"',
            placeholder: 'banner, pixel-banner, header-image'
        },
        {
            setting: 'customYPositionField',
            name: 'Y-Position Field Names',
            desc: 'Set custom field names for the Y-position in frontmatter',
            values: '5, 70, 100',
            placeholder: 'banner-y, y-position, banner-offset'
        },
        {
            setting: 'customXPositionField',
            name: 'X-Position Field Names',
            desc: 'Set custom field names for the X-position in frontmatter',
            values: '0, 30, 90',
            placeholder: 'banner-x, x-position, banner-offset-x'
        },
        {
            setting: 'customContentStartField',
            name: 'Content Start Position Field Names',
            desc: 'Set custom field names for the content start position in frontmatter',
            values: '75, 150, 450',
            placeholder: 'content-start, start-position, content-offset'
        },
        {
            setting: 'customImageDisplayField',
            name: 'Image Display Field Names',
            desc: 'Set custom field names for the image display in frontmatter',
            values: 'cover, contain, auto, 200%, 70%',
            placeholder: 'banner-display, image-display, display-mode'
        },
        {
            setting: 'customImageRepeatField',
            name: 'Image Repeat Field Names',
            desc: 'Set custom field names for the image repeat in frontmatter',
            values: 'true, false',
            placeholder: 'banner-repeat, image-repeat, repeat'
        },
        {
            setting: 'customBannerMaxWidthField',
            name: 'Banner Max Width Field Names',
            desc: 'Set custom field names for the banner maximum width in frontmatter',
            values: '800px, 100%, 1200px',
            placeholder: 'banner-max-width, max-width, banner-width'
        },
        {
            setting: 'customBannerAlignmentField',
            name: 'Banner Alignment Field Names',
            desc: 'Set custom field names for the banner alignment in frontmatter',
            values: 'left, center, right',
            placeholder: 'banner-alignment'
        },
        {
            setting: 'customBannerHeightField',
            name: 'Banner Height Field Names',
            desc: 'Set custom field names for the banner height in frontmatter',
            values: '150, 350, 500',
            placeholder: 'banner-height, height, banner-size'
        },
        {
            setting: 'customFadeField',
            name: 'Fade Field Names',
            desc: 'Set custom field names for the fade in frontmatter',
            values: '-300, -50, 0, 100',
            placeholder: 'banner-fade, fade, fade-amount'
        },
        {
            setting: 'customBorderRadiusField',
            name: 'Border Radius Field Names',
            desc: 'Set custom field names for the border radius in frontmatter',
            values: '0, 17, 25',
            placeholder: 'banner-radius, radius, border-radius'
        },
        {
            setting: 'customTitleColorField',
            name: 'Title Color Field Names',
            desc: 'Set custom field names for the title color in frontmatter',
            values: '#ffffff, white, var(--text-normal)',
            placeholder: 'banner-title-color, title-color, inline-title-color'
        },
        {
            setting: 'customBannerShuffleField',
            name: 'Banner Shuffle Field Names',
            desc: 'Set custom field names for the banner shuffle in frontmatter',
            values: 'true, false',
            placeholder: 'banner-shuffle, shuffle, random-banner'
        },
        {
            setting: 'customFlagColorField',
            name: 'Pixel Banner Flag Color Field Names',
            desc: 'Set custom field names for the pixel banner flag color in frontmatter',
            values: 'red, blue, green, orange, purple, yellow',
            placeholder: 'pixel-banner-flag-color, banner-flag-color, flag-color'
        },
        {
            setting: 'customBannerIconField',
            name: 'Banner Icon Field Names',
            desc: 'Set custom field names for the banner icon in frontmatter',
            values: '🌟, 🎨, 📝',
            placeholder: 'banner-icon, icon, header-icon'
        },
        {
            setting: 'customBannerIconImageField',
            name: 'Banner Icon Image Field Names',
            desc: 'Set custom field names for the banner icon image in frontmatter',
            values: '[[image.png]], "images/icon.jpg"',
            placeholder: 'banner-icon-image, icon-image'
        },
        {
            setting: 'customBannerIconSizeField',
            name: 'Banner Icon Size Field Names',
            desc: 'Set custom field names for the banner icon size in frontmatter',
            values: '50, 70, 100',
            placeholder: 'banner-icon-size, icon-size'
        },
        {
            setting: 'customBannerIconImageSizeMultiplierField',
            name: 'Banner Icon Image Size Multiplier Field Names',
            desc: 'Set custom field names for the banner icon image size multiplier in frontmatter',
            values: '.5, 1.5, 2',
            placeholder: 'banner-icon-image-size-multiplier, icon-image-size-multiplier'
        },
        {
            setting: 'customBannerIconTextVerticalOffsetField',
            name: 'Banner Icon Text Vertical Offset Field Names',
            desc: 'Set custom field names for the banner icon text vertical offset in frontmatter',
            values: '-10, 0, 10',
            placeholder: 'banner-icon-text-vertical-offset, icon-text-vertical-offset'
        },
        {
            setting: 'customBannerIconRotateField',
            name: 'Banner Icon Rotate Field Names',
            desc: 'Set custom field names for the banner icon rotate in frontmatter',
            values: '50, 70, 100',
            placeholder: 'banner-icon-rotate, icon-rotate'
        },
        {
            setting: 'customBannerIconXPositionField',
            name: 'Banner Icon X Position Field Names',
            desc: 'Set custom field names for the banner icon X position in frontmatter',
            values: '25, 50, 75',
            placeholder: 'banner-icon-x, icon-x'
        },
        {
            setting: 'customBannerIconOpacityField',
            name: 'Banner Icon Opacity Field Names',
            desc: 'Set custom field names for the banner icon opacity in frontmatter',
            values: '50, 75, 100',
            placeholder: 'banner-icon-opacity, icon-opacity'
        },
        {
            setting: 'customBannerIconColorField',
            name: 'Banner Icon Color Field Names',
            desc: 'Set custom field names for the banner icon color in frontmatter',
            values: '#ffffff, white, var(--text-normal)',
            placeholder: 'banner-icon-color, icon-color'
        },
        {
            setting: 'customBannerIconFontWeightField',
            name: 'Banner Icon Font Weight Field Names',
            desc: 'Set custom field names for the banner icon font weight in frontmatter',
            values: 'lighter, normal, bold',
            placeholder: 'banner-icon-font-weight, icon-font-weight'
        },
        {
            setting: 'customBannerIconBackgroundColorField',
            name: 'Banner Icon Background Color Field Names',
            desc: 'Set custom field names for the banner icon background color in frontmatter',
            values: '#000000, black, transparent',
            placeholder: 'banner-icon-bg-color, icon-bg-color'
        },
        {
            setting: 'customBannerIconPaddingXField',
            name: 'Banner Icon Padding X Field Names',
            desc: 'Set custom field names for the banner icon padding X in frontmatter',
            values: '0, 10, 20',
            placeholder: 'banner-icon-padding-x, icon-padding-x'
        },
        {
            setting: 'customBannerIconPaddingYField',
            name: 'Banner Icon Padding Y Field Names',
            desc: 'Set custom field names for the banner icon padding Y in frontmatter',
            values: '0, 10, 20',
            placeholder: 'banner-icon-padding-y, icon-padding-y'
        },
        {
            setting: 'customBannerIconBorderRadiusField',
            name: 'Banner Icon Border Radius Field Names',
            desc: 'Set custom field names for the banner icon border radius in frontmatter',
            values: '0, 17, 25',
            placeholder: 'banner-icon-border-radius, icon-border-radius'
        },
        {
            setting: 'customBannerIconVeritalOffsetField',
            name: 'Banner Icon Vertical Offset Field Names',
            desc: 'Set custom field names for the banner icon vertical offset in frontmatter',
            values: '-50, 0, 50',
            placeholder: 'banner-icon-y, icon-y'
        },
        {
            setting: 'customBannerIconImageAlignmentField',
            name: 'Banner Icon Image Alignment Field Names',
            desc: 'Set custom field names for the banner icon image alignment in frontmatter',
            values: 'left, right',
            placeholder: 'banner-icon-image-alignment, icon-image-alignment'
        }
    ];

    customFields.forEach(field => {
        new Setting(containerEl)
            .setName(field.name)
            .setDesc(createFragment(el => {
                el.createEl('div', { text: field.desc });
                el.createEl('div', { cls: 'setting-item-example' }).innerHTML = `Example frontmatter values: <code>${field.values}</code>`;
            }))
            .addText(text => {
                text
                    .setPlaceholder(field.placeholder)
                    .setValue(arrayToString(plugin.settings[field.setting]))
                    .onChange(async (value) => {
                        const newNames = stringToArray(value);
                        const allFields = customFields.map(f => f.setting);
                        const validation = validateFieldNames(plugin.settings, allFields, field.setting, newNames);
                        
                        if (!validation.isValid) {
                            text.inputEl.addClass('is-invalid');
                            text.inputEl.title = validation.message;
                            return;
                        }
                        
                        text.inputEl.removeClass('is-invalid');
                        text.inputEl.title = '';
                        plugin.settings[field.setting] = newNames;
                        await plugin.saveSettings();
                    });
                text.inputEl.style.width = '300px';
            })
            .addExtraButton(button => button
                .setIcon('reset')
                .setTooltip('Reset to default')
                .onClick(async () => {
                    plugin.settings[field.setting] = DEFAULT_SETTINGS[field.setting];
                    await plugin.saveSettings();
                    
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