import { Setting, Notice } from 'obsidian';
import { DEFAULT_SETTINGS } from '../settings';
import { PIXEL_BANNER_PLUS } from '../../resources/constants';

export function createPixelBannerPlusSettings(containerEl, plugin) {
    // Ensure plugin runtime state is synced with settings
    plugin.pixelBannerPlusEnabled = plugin.settings.pixelBannerPlusEnabled !== false;
    
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
    
    // Create a container for all settings that depend on Plus being enabled
    const plusDependentSettings = containerEl.createDiv({ cls: 'pixel-banner-plus-dependent-settings' });

    // Helper function to update visibility of dependent settings
    function updatePlusDependentSettingsVisibility(isEnabled) {
        if (isEnabled) {
            plusDependentSettings.style.display = 'block';
        } else {
            plusDependentSettings.style.display = 'none';
        }
    }

    // Pixel Banner Plus Enabled Toggle
    new Setting(pixelBannerPlusSettingsGroup)
        .setName('Pixel Banner Plus Enabled')
        .setDesc('Enable or disable Pixel Banner Plus features')
        .addToggle(toggle => toggle
            .setValue(plugin.settings.pixelBannerPlusEnabled !== false) // Use saved setting with proper default
            .onChange(async (value) => {
                plugin.pixelBannerPlusEnabled = value;
                plugin.settings.pixelBannerPlusEnabled = value;
                await plugin.saveSettings();
                updatePlusDependentSettingsVisibility(value);
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.pixelBannerPlusEnabled = DEFAULT_SETTINGS.pixelBannerPlusEnabled;
                plugin.pixelBannerPlusEnabled = plugin.settings.pixelBannerPlusEnabled;
                await plugin.saveSettings();
                
                const toggleComponent = button.extraSettingsEl.parentElement.querySelector('.checkbox-container input');
                if (toggleComponent) {
                    toggleComponent.checked = plugin.settings.pixelBannerPlusEnabled;
                    toggleComponent.parentElement.classList.toggle('is-enabled', plugin.settings.pixelBannerPlusEnabled);
                    toggleComponent.dispatchEvent(new Event('change'));
                }
                updatePlusDependentSettingsVisibility(plugin.settings.pixelBannerPlusEnabled);
            }))
        .then(setting => {
            // Set the HTML content for the name element
            const nameEl = setting.nameEl;
            if (nameEl) {
                nameEl.innerHTML = '<span class="pixel-banner-twinkle-animation">✨</span> Pixel Banner Plus Enabled';
            }
        });

    // Initialize visibility based on current state
    updatePlusDependentSettingsVisibility(plugin.settings.pixelBannerPlusEnabled !== false);

    const accountSettingsGroup = plusDependentSettings.createDiv({ cls: 'setting-group margin-top-0' });
    // Pixel Banner Plus Email Address
    new Setting(accountSettingsGroup)
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
                    plugin.settings.pixelBannerPlusEnabled = false;
                }
            })
            .inputEl.style = 'width: 100%; max-width: 275px; padding: 5px 10px;'
        );

    // Pixel Banner Plus API Key
    new Setting(accountSettingsGroup)
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
                    plugin.settings.pixelBannerPlusEnabled = false;
                }
            })
            .inputEl.style = 'width: 100%; max-width: 275px; padding: 5px 10px;'
        );

    // Test API Key button
    new Setting(accountSettingsGroup)
        .setName('Establish Connection')
        .setDesc('Establish a connection to your Pixel Banner Plus account')
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
            buttonEl.style.cursor = 'pointer';
            
            // Set initial button HTML with emoji
            button.buttonEl.innerHTML = '⚡ Refresh / Connect Account';
            button.setCta();
            button.onClick(async () => {
                const email = plugin.settings.pixelBannerPlusEmail;
                const apiKey = plugin.settings.pixelBannerPlusApiKey;
                
                if (!email || !apiKey) {
                    new Notice('Please enter both email and API key');
                    return;
                }

                button.buttonEl.innerHTML = 'Verifying Account...';
                button.setDisabled(true);

                try {
                    const data = await plugin.verifyPixelBannerPlusCredentials();
                    if (data) {
                        if (data.verified) {
                            new Notice(`✅ Pixel Banner Plus connection successful\n🪙 Banner Tokens Remaining: ${data.bannerTokens}`);
                            // Update plugin state with new data
                            plugin.pixelBannerPlusServerOnline = data.serverOnline;
                            plugin.pixelBannerPlusEnabled = true;
                            plugin.pixelBannerPlusBannerTokens = data.bannerTokens;
                            
                            // Update the Account Status section to reflect new values
                            updateAccountStatusSection(accountStatusGroup, plugin);
                            // Update the Signup section
                            updateSignupSection(pixelBannerPlusSettingsGroup, plugin);
                        } else {
                            if (data.serverOnline) {
                                new Notice('❌ Invalid credentials');
                            } else {
                                new Notice('❌ Cannot connect to Pixel Banner Plus servers. Please try again later.');
                            }
                            plugin.pixelBannerPlusServerOnline = data.serverOnline;
                            plugin.pixelBannerPlusEnabled = false;
                            plugin.pixelBannerPlusBannerTokens = 0;
                            
                            // Update the Account Status section to reflect new values
                            updateAccountStatusSection(accountStatusGroup, plugin);
                            // Update the Signup section
                            updateSignupSection(pixelBannerPlusSettingsGroup, plugin);
                        }
                        // console.log(`data: ${JSON.stringify(data)}`);
                    } else {
                        new Notice('❌ Cannot connect to Pixel Banner Plus servers. Please try again later.');
                        plugin.pixelBannerPlusServerOnline = false;
                        plugin.pixelBannerPlusEnabled = false;
                        plugin.pixelBannerPlusBannerTokens = 0;
                        
                        // Update the Account Status section to reflect new values
                        updateAccountStatusSection(accountStatusGroup, plugin);
                        // Update the Signup section
                        updateSignupSection(pixelBannerPlusSettingsGroup, plugin);
                    }
                } catch (error) {
                    new Notice('❌ Connection failed.');
                    plugin.pixelBannerPlusEnabled = false;
                    
                    // Update the Account Status section to reflect new values
                    updateAccountStatusSection(accountStatusGroup, plugin);
                    // Update the Signup section
                    updateSignupSection(pixelBannerPlusSettingsGroup, plugin);
                }

                button.buttonEl.innerHTML = '⚡ Refresh / Authorize Account';
                button.setDisabled(false);
            });
        });

    // Add the enableDailyGame setting
    new Setting(accountSettingsGroup)
        .setName('Show Daily Game')
        .setDesc('Enable the daily game feature in the banner selection modal for a chance to win the daily jackpot\'s Tokens')
        .addToggle(toggle => toggle
            .setValue(plugin.settings.enableDailyGame)
            .onChange(async (value) => {
                plugin.settings.enableDailyGame = value;
                await plugin.saveSettings();
            }))
        .addExtraButton(button => button
            .setIcon('reset')
            .setTooltip('Reset to default')
            .onClick(async () => {
                plugin.settings.enableDailyGame = DEFAULT_SETTINGS.enableDailyGame;
                await plugin.saveSettings();
                
                const toggleComponent = button.extraSettingsEl.parentElement.querySelector('.checkbox-container input');
                if (toggleComponent) {
                    toggleComponent.checked = DEFAULT_SETTINGS.enableDailyGame;
                    toggleComponent.parentElement.classList.toggle('is-enabled', DEFAULT_SETTINGS.enableDailyGame);
                    toggleComponent.dispatchEvent(new Event('change'));
                }
            }))
        .then(setting => {
            // Set the HTML content for the name element
            const nameEl = setting.nameEl;
            if (nameEl) {
                nameEl.innerHTML = '<span class="pixel-banner-twinkle-animation">🕹️</span> Show Daily Game';
            }
        });

    // Create the initial Signup section
    updateSignupSection(plusDependentSettings, plugin);

    // Account Status Section
    const accountStatusGroup = plusDependentSettings.createDiv({ cls: 'setting-group' });
    accountStatusGroup.createEl('h3', { text: 'Account Status' });
    
    // Create the initial Account Status section
    updateAccountStatusSection(accountStatusGroup, plugin);
}

// Helper function to update the Signup section
function updateSignupSection(containerEl, plugin) {
    // Find and remove existing signup setting if it exists
    containerEl.querySelectorAll('.setting-item').forEach(el => {
        if (el.querySelector('.setting-item-name')?.textContent === 'Signup') {
            el.remove();
        }
    });
    
    // Only show signup button when not connected
    if (!plugin.pixelBannerPlusEnabled && plugin.pixelBannerPlusServerOnline) {
        new Setting(containerEl)
            .setName('Signup')
            .setDesc('Create a FREE Pixel Banner Plus account to get started. You will receive 🪙 5 FREE banner tokens at signup (no payment info required). This form can also be use to recover your account if you forget your API Key.')
            .addButton(button => {
                const buttonEl = button.buttonEl;
                buttonEl.style.textTransform = 'uppercase';
                buttonEl.style.letterSpacing = '1px';
                buttonEl.style.fontWeight = 'bold';
                buttonEl.style.borderRadius = '5px';
                buttonEl.style.padding = '5px 10px';
                buttonEl.style.fontSize = '.9em';
                buttonEl.style.cursor = 'pointer';
                buttonEl.classList.add('scale-up-down-animation');
                button.buttonEl.innerHTML = '🚩 Signup for Free!';
                button.setCta();
                button.onClick(() => {
                    const signupUrl = PIXEL_BANNER_PLUS.API_URL + PIXEL_BANNER_PLUS.ENDPOINTS.SIGNUP;
                    window.open(signupUrl, '_blank');
                });
            });
    }
}

// Helper function to update the Account Status section
function updateAccountStatusSection(containerEl, plugin) {
    // Clear existing content
    containerEl.empty();
    containerEl.createEl('h3', {
        text: 'Account Status',
        attr: {
            style: `
                margin-top: 0;
                margin-bottom: 0;
            `
        }
    });
    
    // Connection Status
    new Setting(containerEl)
        .setName('Connection Status')
        .setDesc('Current status of your Pixel Banner Plus account')
        .addText(text => {
            const statusText = plugin.pixelBannerPlusServerOnline ? (plugin.pixelBannerPlusEnabled ? '✅ Authorized' : '❌ Not Authorized') : '🚨 Servers Offline 🚨';
            
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
                        border: 1px dotted ${statusBorderColor};
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
                        border: 1px dotted #F3B93B; 
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
    
    // Buy Tokens button (only shown when connected)
    if (plugin.pixelBannerPlusServerOnline && plugin.pixelBannerPlusEnabled) {
        new Setting(containerEl)
            .setName('Buy Tokens')
            .setDesc(createFragment(el => {
                el.createEl('div', { text: 'Purchase tokens to download Banners from the Store or Generate them with AI ✨' });
                el.createEl('div').innerHTML = 'This greatly helps support the development of this plugin and keep the AI Servers running 🤗. In addition to buying tokens directly, any donation on our <a href="https://ko-fi.com/jparkerweb" target="_blank" style="text-transform: uppercase;background: white;border: 1px solid green;color: black;font-size: 0.9em;font-weight: bold;padding: 0 3px;cursor: pointer;text-decoration: none;border-radius: 5px;">Ko-fi page</a> will also add tokens to your account 💖';
            }))
            .addButton(button => {
                const buttonEl = button.buttonEl;
                buttonEl.style.textTransform = 'uppercase';
                buttonEl.style.letterSpacing = '1px';
                buttonEl.style.borderRadius = '5px';
                buttonEl.style.border = '1px solid papayawhip';
                buttonEl.style.padding = '5px 10px';
                buttonEl.style.fontSize = '.9em';
                buttonEl.style.lineHeight = '1';
                buttonEl.style.backgroundColor = 'darkgreen';
                buttonEl.style.color = 'papayawhip';
                buttonEl.style.cursor = 'pointer';
                buttonEl.classList.add('scale-up-down-animation');

                button.buttonEl.innerHTML = '💵 Buy More Tokens';
                button.onClick(() => {
                    window.open(PIXEL_BANNER_PLUS.SHOP_URL, '_blank');
                });
            });
    }
} 