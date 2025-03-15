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
            .inputEl.style = 'width: 100%; max-width: 275px; padding: 5px 10px;'
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
            .inputEl.style = 'width: 100%; max-width: 275px; padding: 5px 10px;'
        );

    // Test API Key button
    new Setting(pixelBannerPlusSettingsGroup)
        .setName('Test Connection')
        .setDesc('Verify your Pixel Banner Plus credentials')
        .addButton(button => {
            // Apply styles to the button element immediately
            const buttonEl = button.buttonEl;
            // buttonEl.style.backgroundColor = 'var(--button-background-color)';
            // buttonEl.style.color = 'var(--button-text-color)';
            buttonEl.style.textTransform = 'uppercase';
            buttonEl.style.letterSpacing = '1px';
            buttonEl.style.fontWeight = 'bold';
            buttonEl.style.borderRadius = '5px';
            buttonEl.style.padding = '5px 10px';
            buttonEl.style.fontSize = '.9em';
            
            // Set initial button HTML with emoji
            button.buttonEl.innerHTML = '⚡ Test Pixel Banner Plus API Key';
            button.setCta();
            button.onClick(async () => {
                const email = plugin.settings.pixelBannerPlusEmail;
                const apiKey = plugin.settings.pixelBannerPlusApiKey;
                
                if (!email || !apiKey) {
                    new Notice('Please enter both email and API key');
                    return;
                }

                button.buttonEl.innerHTML = 'Testing...';
                button.setDisabled(true);

                try {
                    const data = await plugin.verifyPixelBannerPlusCredentials();
                    if (data) {
                        if (data.verified) {
                            new Notice(`✅ Pixel Banner Plus connection successful\n🪙 Banner Tokens Remaining: ${data.bannerTokens}`);
                            // Update plugin state with new data
                            plugin.pixelBannerPlusEnabled = true;
                            plugin.pixelBannerPlusBannerTokens = data.bannerTokens;
                            
                            // Update the Account Status section to reflect new values
                            updateAccountStatusSection(accountStatusGroup, plugin);
                        } else {
                            new Notice('❌ Invalid credentials');
                            plugin.pixelBannerPlusEnabled = false;
                            
                            // Update the Account Status section to reflect new values
                            updateAccountStatusSection(accountStatusGroup, plugin);
                        }
                        // console.log(`data: ${JSON.stringify(data)}`);
                    } else {
                        new Notice('❌ Invalid credentials');
                        plugin.pixelBannerPlusEnabled = false;
                        
                        // Update the Account Status section to reflect new values
                        updateAccountStatusSection(accountStatusGroup, plugin);
                    }
                } catch (error) {
                    new Notice('❌ Connection failed. Please check the service URL.');
                    plugin.pixelBannerPlusEnabled = false;
                    
                    // Update the Account Status section to reflect new values
                    updateAccountStatusSection(accountStatusGroup, plugin);
                }

                button.buttonEl.innerHTML = '⚡ Test Pixel Banner Plus API Key';
                button.setDisabled(false);
            });
        });

    // Account Status Section
    const accountStatusGroup = containerEl.createDiv({ cls: 'setting-group' });
    accountStatusGroup.createEl('h3', { text: 'Account Status' });
    
    // Create the initial Account Status section
    updateAccountStatusSection(accountStatusGroup, plugin);
}

// Helper function to update the Account Status section
function updateAccountStatusSection(containerEl, plugin) {
    // Clear existing content
    containerEl.empty();
    containerEl.createEl('h3', { text: 'Account Status' });
    
    // Connection Status
    new Setting(containerEl)
        .setName('Connection Status')
        .setDesc('Current status of your Pixel Banner Plus account')
        .addText(text => {
            const statusText = plugin.pixelBannerPlusEnabled ? '✅ Connected' : '❌ Not Connected';
            
            // Check if Obsidian is in light mode
            const isLightMode = document.body.classList.contains('theme-light');
            
            // Invert colors based on theme
            const statusColor = isLightMode ? 'black' : 'white';
            const statusBGColor = isLightMode ? 'white' : 'black';
            const statusBorderColor = plugin.pixelBannerPlusEnabled ? '#20bf6b' : '#FF0000';
            
            const span = text.inputEl.parentElement.createSpan({
                text: statusText,
                attr: {
                    style: `
                        color: ${statusColor};
                        background-color: ${statusBGColor};
                        border: 1px solid ${statusBorderColor};
                        padding: 5px 10px;
                        border-radius: 0px;
                        text-transform: uppercase;
                        font-size: .9em;
                        letter-spacing: 1.5px;
                    `
                }
            });
            
            // Hide the input element
            text.inputEl.style.display = 'none';
        });
    
    // Available Tokens
    new Setting(containerEl)
        .setName('Available Tokens')
        .setDesc('Number of banner tokens available in your account')
        .addText(text => {
            const tokenCount = plugin.pixelBannerPlusBannerTokens !== undefined ? 
                `🪙 ${plugin.pixelBannerPlusBannerTokens.toString()}` : '❓ Unknown';
            
            // Check if Obsidian is in light mode
            const isLightMode = document.body.classList.contains('theme-light');
            
            // Invert colors based on theme
            const tokenColor = isLightMode ? 'black' : 'white';
            const tokenBGColor = isLightMode ? 'white' : 'black';
            
            const span = text.inputEl.parentElement.createSpan({
                text: tokenCount,
                attr: {
                    style: `
                        font-weight: bold; 
                        color: ${tokenColor}; 
                        background-color: ${tokenBGColor}; 
                        border: 1px solid #F3B93B; 
                        padding: 5px 10px; 
                        border-radius: 0px; 
                        text-transform: uppercase; 
                        font-size: .9em; 
                        letter-spacing: 1.5px;
                    `
                }
            });
            
            // Hide the input element
            text.inputEl.style.display = 'none';
        });
} 