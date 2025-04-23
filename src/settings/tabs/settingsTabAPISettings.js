import { Setting, Notice } from 'obsidian';
import { DEFAULT_SETTINGS } from '../settings';

// API test functions
async function testPexelsApi(apiKey) {
    try {
        const response = await fetch(`https://api.pexels.com/v1/search?query=${random20characters()}&per_page=3`, {
            headers: {
                'Authorization': apiKey
            }
        });
        
        if (!response.ok) {
            throw new Error('❌ Invalid Pexels API key');
        }
        
        const data = await response.json();
        return data.photos;
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

function random20characters() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 20; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export function createAPISettings(containerEl, plugin) {
    // section callout
    const calloutEl = containerEl.createEl('div', { cls: 'tab-callout' });
    calloutEl.createEl('div', { text: '🌐 Optionally select which 3rd party API provider to use for displaying random images.' });

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
            .setValue(plugin.settings.apiProvider)
            .onChange(async (value) => {
                plugin.settings.apiProvider = value;
                await plugin.saveSettings();
                // Refresh the settings tab to update API key fields
                plugin.settingTab.display();
            }));

    // Pexels API key
    new Setting(containerEl)
        .setName('Pexels API Key');
    containerEl.createEl('span', { text: 'Enter your Pexels API key. Get your API key from ', cls: 'setting-item-description' })
        .createEl('a', { href: 'https://www.pexels.com/api/', text: 'Pexels API' });
    
    // Pexels API key setting
    const pexelsApiKeySetting = new Setting(containerEl)
        .setClass('full-width-control')
        .addText(text => {
            text
                .setPlaceholder('Pexels API key')
                .setValue(plugin.settings.pexelsApiKey)
                .onChange(async (value) => {
                    plugin.settings.pexelsApiKey = value;
                    await plugin.saveSettings();
                });
            text.inputEl.style.width = 'calc(100% - 100px)';  // Make room for the Test button
        })
        .addButton(button => button
            .setButtonText('Test API')
            .onClick(async () => {
                const apiKey = plugin.settings.pexelsApiKey;
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
    
    // Pixabay API key description
    containerEl.createEl('span', { text: 'Enter your Pixabay API key. Get your API key from ', cls: 'setting-item-description' })
        .createEl('a', { href: 'https://pixabay.com/api/docs/', text: 'Pixabay API' });
    
    // Pixabay API key setting
    const pixabayApiKeySetting = new Setting(containerEl)
        .setClass('full-width-control')
        .addText(text => {
            text
                .setPlaceholder('Pixabay API key')
                .setValue(plugin.settings.pixabayApiKey)
                .onChange(async (value) => {
                    plugin.settings.pixabayApiKey = value;
                    await plugin.saveSettings();
                });
            text.inputEl.style.width = 'calc(100% - 100px)';  // Make room for the Test button
        })
        .addButton(button => button
            .setButtonText('Test API')
            .onClick(async () => {
                const apiKey = plugin.settings.pixabayApiKey;
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

    // Flickr API key
    new Setting(containerEl)
        .setName('Flickr API Key');
    
    // Flickr API key description
    containerEl.createEl('span', { text: 'Enter your Flickr API key. Get your API key from ', cls: 'setting-item-description' })
        .createEl('a', { href: 'https://www.flickr.com/services/api/', text: 'Flickr API' });
    
    // Flickr API key setting
    const flickrApiKeySetting = new Setting(containerEl)
        .setClass('full-width-control')
        .addText(text => {
            text
                .setPlaceholder('Flickr API key')
                .setValue(plugin.settings.flickrApiKey)
                .onChange(async (value) => {
                    plugin.settings.flickrApiKey = value;
                    await plugin.saveSettings();
                });
            text.inputEl.style.width = 'calc(100% - 100px)';
        })
        .addButton(button => button
            .setButtonText('Test API')
            .onClick(async () => {
                const apiKey = plugin.settings.flickrApiKey;
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

    // Unsplash API key
    new Setting(containerEl)
        .setName('Unsplash API Key');
    
    // Unsplash API key description
    containerEl.createEl('span', { text: 'Enter your Unsplash API key (Access Key). Get your API key from ', cls: 'setting-item-description' })
        .createEl('a', { href: 'https://unsplash.com/oauth/applications', text: 'Unsplash API' });
    
    // Unsplash API key setting
    const unsplashApiKeySetting = new Setting(containerEl)
        .setClass('full-width-control')
        .addText(text => {
            text
                .setPlaceholder('Unsplash API key')
                .setValue(plugin.settings.unsplashApiKey)
                .onChange(async (value) => {
                    plugin.settings.unsplashApiKey = value;
                    await plugin.saveSettings();
                });
            text.inputEl.style.width = 'calc(100% - 100px)';
        })
        .addButton(button => button
            .setButtonText('Test API')
            .onClick(async () => {
                const apiKey = plugin.settings.unsplashApiKey;
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


    // Usage Example
    const exampleContainer = containerEl.createEl('div', {
        attr: {
            style: `
                margin: 20px 0;
                padding: 20px;
                border: 1px solid var(--modal-border-color);
                border-radius: 7px;
            `
        }
    })

    exampleContainer.createEl('div', { text: 'Usage Example',
        attr: {
            style: `
                font-weight: bold;
                font-size: 1.1rem;
                color: var(--color-accent);
            `
        }
    });

    exampleContainer.createEl('div', { text: 'Add keyword(s) to the banner frontmatter to display random API images matching the keywords.',
        attr: {
            style: `
                margin: 10px 0;
            `
        }
    });

    exampleContainer.createEl('img', {
        attr: {
            src: 'https://raw.githubusercontent.com/jparkerweb/pixel-banner/refs/heads/main/img/3rd-party-apis-example.jpg',
            style: `
                width: auto;
                max-width: 100%;
            `
        }
    });
    
    // Images section
    new Setting(containerEl)
        .setName('Images')
        .setDesc('Configure settings for images fetched from API. These settings apply when using keywords to fetch random images.')
        .setHeading();

    // Show Pin Icon setting
    new Setting(containerEl)
        .setName('Show Pin Icon')
        .setDesc('Show a pin icon on random banner images that allows saving them to your vault. Once pinned, your frontmatter will be updated to use the local image instead of the API image.')
        .addToggle(toggle => toggle
            .setValue(plugin.settings.showPinIcon)
            .onChange(async (value) => {
                plugin.settings.showPinIcon = value;
                // Show/hide dependent settings based on the toggle
                folderInputSetting.settingEl.style.display = value ? 'flex' : 'none';
                refreshIconSetting.settingEl.style.display = value ? 'flex' : 'none';
                await plugin.saveSettings();
            }));

    // Folder input setting
    const folderInputSetting = new Setting(containerEl)
        .setName('Pinned Images Folder')
        .setDesc('Default folder where pinned banner images will be saved')
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
        });

    // Show Refresh Icon setting
    const refreshIconSetting = new Setting(containerEl)
        .setName('Show Refresh Icon')
        .setDesc('Show a refresh icon on random banner images that allows fetching a new random image.')
        .addToggle(toggle => toggle
            .setValue(plugin.settings.showRefreshIcon)
            .onChange(async (value) => {
                plugin.settings.showRefreshIcon = value;
                await plugin.saveSettings();
            }));

    // Set initial visibility of dependent settings
    folderInputSetting.settingEl.style.display = plugin.settings.showPinIcon ? 'flex' : 'none';
    refreshIconSetting.settingEl.style.display = plugin.settings.showPinIcon ? 'flex' : 'none';

    // Size setting
    new Setting(containerEl)
        .setName('Size')
        .setDesc('Select the size of the image - (API only)')
        .addDropdown(dropdown => dropdown
            .addOption('small', 'Small')
            .addOption('medium', 'Medium')
            .addOption('large', 'Large')
            .setValue(plugin.settings.imageSize)
            .onChange(async (value) => {
                plugin.settings.imageSize = value;
                await plugin.saveSettings();
            }));

    // Orientation setting
    new Setting(containerEl)
        .setName('Orientation')
        .setDesc('Select the orientation of the image - (API only)')
        .addDropdown(dropdown => dropdown
            .addOption('landscape', 'Landscape')
            .addOption('portrait', 'Portrait')
            .addOption('square', 'Square')
            .setValue(plugin.settings.imageOrientation)
            .onChange(async (value) => {
                plugin.settings.imageOrientation = value;
                await plugin.saveSettings();
            }));

    // Number of images setting
    new Setting(containerEl)
        .setName('Number of images')
        .setDesc('Enter the number of random images to fetch (3-50) - (API only)')
        .addText(text => text
            .setPlaceholder('10')
            .setValue(String(plugin.settings.numberOfImages || 10))
            .onChange(async (value) => {
                let numValue = Number(value);
                if (!isNaN(numValue)) {
                    numValue = Math.max(3, Math.min(numValue, 50)); // Ensure value is between 3 and 50
                    plugin.settings.numberOfImages = numValue;
                    await plugin.saveSettings();
                }
            }))
        .then(setting => {
            const inputEl = setting.controlEl.querySelector('input');
            inputEl.type = 'number';
            inputEl.min = '3'; // Set minimum to 3
            inputEl.max = '50';
            inputEl.style.width = '50px';
        });

    // Default keywords setting
    const defaultKeywordsSetting = new Setting(containerEl)
        .setName('Default keywords')
        .setDesc('Enter a comma-separated list of default keywords to be used when no keyword is provided in the frontmatter, or when the provided keyword does not return any results. - (API only)')
        .addTextArea(text => {
            text
                .setPlaceholder('Enter keywords, separated by commas')
                .setValue(plugin.settings.defaultKeywords)
                .onChange(async (value) => {
                    plugin.settings.defaultKeywords = value;
                    await plugin.saveSettings();
                });
            text.inputEl.style.width = '100%';
            text.inputEl.style.marginTop = '15px';
            text.inputEl.style.height = '90px';
        })
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.defaultKeywords = DEFAULT_SETTINGS.defaultKeywords;
                await plugin.saveSettings();
                plugin.settingTab.display();
            }));

    defaultKeywordsSetting.settingEl.dataset.id = 'defaultKeywords';
    defaultKeywordsSetting.settingEl.style.display = 'flex';
    defaultKeywordsSetting.settingEl.style.flexDirection = 'column';
} 