import { Setting, Notice } from 'obsidian';
import { DEFAULT_SETTINGS } from '../settings';

export function createPixelBannerPlusSettings(containerEl, plugin) {
    // section callout
    const calloutElPixelBannerPlus = containerEl.createEl('div', { cls: 'tab-callout margin-bottom-0' });
    calloutElPixelBannerPlus.createEl('h4', { 
        text: '✨ Pixel Banner Plus ✨',
        attr: {
            style: 'margin-top: 5px;'
        }
    });
    calloutElPixelBannerPlus.createEl('div', { text: 'Pixel Banner Plus enhances your notes with AI-generated, high-quality banners. Using a token-based system, you can instantly create stunning, customized visuals—no design skills needed. Sign up for free to access the banner store, which includes a selection of zero-token banners at no cost. No subscription required—simply purchase tokens whenever you need AI-generated designs. Transform your Obsidian workspace with professional banners, starting for free and only adding tokens as needed.' });

    // Create a group for the Pixel Banner Plus Settings
    const pixelBannerPlusSettingsGroup = containerEl.createDiv({ cls: 'setting-group' });

    // Pixel Banner Plus Email Address
    new Setting(pixelBannerPlusSettingsGroup)
        .setName('Pixel Banner Plus Email Address')
        .setDesc('Your email address for Pixel Banner Plus authentication')
        .addText(text => text
            .setPlaceholder('Enter your email address')
            .setValue(plugin.settings.pixelBannerPlusEmail)
            .onChange(async (value) => {
                plugin.settings.pixelBannerPlusEmail = value;
                await plugin.saveSettings();
                if (!value) {
                    plugin.pixelBannerPlusEnabled = false;
                }
            })
            .inputEl.style = 'width: 100%; max-width: 275px;'
        );

    // Pixel Banner Plus API Key
    new Setting(pixelBannerPlusSettingsGroup)
        .setName('Pixel Banner Plus API Key')
        .setDesc('Your API key for Pixel Banner Plus authentication')
        .addText(text => text
            .setPlaceholder('Enter your API key')
            .setValue(plugin.settings.pixelBannerPlusApiKey)
            .onChange(async (value) => {
                plugin.settings.pixelBannerPlusApiKey = value;
                await plugin.saveSettings();
                if (!value) {
                    plugin.pixelBannerPlusEnabled = false;
                }
            })
            .inputEl.style = 'width: 100%; max-width: 275px;'
        );

    // Test API Key button
    new Setting(pixelBannerPlusSettingsGroup)
        .setName('Test Connection')
        .setDesc('Verify your Pixel Banner Plus credentials')
        .addButton(button => button
            .setButtonText('Test Pixel Banner Plus API Key')
            .onClick(async () => {
                const email = plugin.settings.pixelBannerPlusEmail;
                const apiKey = plugin.settings.pixelBannerPlusApiKey;
                
                if (!email || !apiKey) {
                    new Notice('Please enter both email and API key');
                    return;
                }

                button.setButtonText('Testing...');
                button.setDisabled(true);

                try {
                    const data = await plugin.verifyPixelBannerPlusCredentials();
                    if (data) {
                        new Notice(`✅ Pixel Banner Plus connection successful\n🪙 Banner Tokens Remaining: ${data.bannerTokens}`);
                        console.log(`data: ${JSON.stringify(data)}`);
                    } else {
                        new Notice('❌ Invalid credentials');
                        plugin.pixelBannerPlusEnabled = false;
                    }
                } catch (error) {
                    new Notice('❌ Connection failed. Please check the service URL.');
                    plugin.pixelBannerPlusEnabled = false;
                }

                button.setButtonText('Test Pixel Banner Plus API Key');
                button.setDisabled(false);
            }));
} 