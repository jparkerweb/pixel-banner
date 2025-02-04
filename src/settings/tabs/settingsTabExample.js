import { Setting } from 'obsidian';

// Helper function to get a random item from an array
const getRandomFieldName = (fieldNames) => {
    const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
    return names[Math.floor(Math.random() * names.length)];
};

export function createExampleSettings(containerEl, plugin) {
    new Setting(containerEl)
        .setName('How to use')
        .setHeading()
        .settingEl.querySelector('.setting-item-name').style.cssText = 'color: var(--text-accent-hover); font-size: var(--font-ui-large);';

    const instructionsEl = containerEl.createEl('div', { cls: 'pixel-banner-section' });
    instructionsEl.createEl('p', { text: 'Add the following fields to your note\'s frontmatter to customize the banner:' });
    const codeEl = instructionsEl.createEl('pre');
    codeEl.createEl('code', { text: 
`---
${getRandomFieldName(plugin.settings.customBannerField)}: blue turtle
${getRandomFieldName(plugin.settings.customYPositionField)}: 30
${getRandomFieldName(plugin.settings.customXPositionField)}: 30
${getRandomFieldName(plugin.settings.customContentStartField)}: 200
${getRandomFieldName(plugin.settings.customImageDisplayField)}: contain
${getRandomFieldName(plugin.settings.customImageRepeatField)}: true
${getRandomFieldName(plugin.settings.customBannerHeightField)}: 400
${getRandomFieldName(plugin.settings.customFadeField)}: -75
${getRandomFieldName(plugin.settings.customBorderRadiusField)}: 25
${getRandomFieldName(plugin.settings.customTitleColorField)}: #ff0000
---

# Or use a direct URL:
---
${getRandomFieldName(plugin.settings.customBannerField)}: https://example.com/image.jpg
${getRandomFieldName(plugin.settings.customYPositionField)}: 70
${getRandomFieldName(plugin.settings.customXPositionField)}: 70
${getRandomFieldName(plugin.settings.customContentStartField)}: 180
${getRandomFieldName(plugin.settings.customImageDisplayField)}: 200%
${getRandomFieldName(plugin.settings.customBannerHeightField)}: 300
${getRandomFieldName(plugin.settings.customFadeField)}: -75
${getRandomFieldName(plugin.settings.customBorderRadiusField)}: 0
${getRandomFieldName(plugin.settings.customTitleColorField)}: #00ff00
---

# Or use a path to an image in the vault:
---
${getRandomFieldName(plugin.settings.customBannerField)}: Assets/my-image.png
${getRandomFieldName(plugin.settings.customYPositionField)}: 0
${getRandomFieldName(plugin.settings.customXPositionField)}: 0
${getRandomFieldName(plugin.settings.customContentStartField)}: 100
${getRandomFieldName(plugin.settings.customImageDisplayField)}: auto
${getRandomFieldName(plugin.settings.customBannerHeightField)}: 250
${getRandomFieldName(plugin.settings.customFadeField)}: -75
${getRandomFieldName(plugin.settings.customBorderRadiusField)}: 50
${getRandomFieldName(plugin.settings.customTitleColorField)}: #0000ff
---

# Or use an Obsidian internal link:
---
${getRandomFieldName(plugin.settings.customBannerField)}: [[example-image.png]]
${getRandomFieldName(plugin.settings.customYPositionField)}: 100
${getRandomFieldName(plugin.settings.customXPositionField)}: 100
${getRandomFieldName(plugin.settings.customContentStartField)}: 50
${getRandomFieldName(plugin.settings.customImageDisplayField)}: contain
${getRandomFieldName(plugin.settings.customImageRepeatField)}: false
${getRandomFieldName(plugin.settings.customBannerHeightField)}: 500
${getRandomFieldName(plugin.settings.customFadeField)}: -75
${getRandomFieldName(plugin.settings.customBorderRadiusField)}: 17
${getRandomFieldName(plugin.settings.customTitleColorField)}: #ff00ff
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