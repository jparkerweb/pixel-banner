import { Modal, MarkdownView } from 'obsidian';
import {
    ImageSelectionModal, GenerateAIBannerModal, PixelBannerStoreModal,
    EmojiSelectionModal, TargetPositionModal, WebAddressModal, DailyGameModal
} from '../modals';
import { flags } from '../../resources/flags.js';
import { semver } from '../../utils/semver.js';
import { PIXEL_BANNER_PLUS } from '../../resources/constants.js';

export class SelectPixelBannerModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.isLoading = true; // Track loading state
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Show loading spinner immediately
        this.showLoadingSpinner(contentEl);
        
        // Continue with initialization in the background
        this.initializeModal().catch(error => {
            console.error('Error initializing modal:', error);
            this.hideLoadingSpinner();
            contentEl.createEl('p', {
                text: 'Failed to load Pixel Banner Menu. Please try again later.',
                cls: 'pixel-banner-error'
            });
        });
    }
    
    // Show loading spinner
    showLoadingSpinner(container) {
        this.isLoading = true;
        this.loadingOverlay = container.createDiv({ 
            cls: 'pixel-banner-loading-overlay',
            attr: {
                style: `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: var(--background-primary);
                    z-index: 100;
                    animation: pixel-banner-fade-in 0.3s ease-in-out;
                `
            }
        });
        
        this.loadingOverlay.createDiv({
            cls: 'pixel-banner-spinner',
            attr: {
                style: `
                width: 40px;
                    height: 40px;
                    border: 4px solid var(--background-modifier-border);
                    border-top: 4px solid var(--text-accent);
                    border-radius: 50%;
                    animation: pixel-banner-spin 1s linear infinite;
                `
            }
        });
    }
    
    // Hide loading spinner
    hideLoadingSpinner() {
        this.isLoading = false;
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
            this.loadingOverlay = null;
        }
    }
    
    // Initialize modal content
    async initializeModal() {
        await this.plugin.verifyPixelBannerPlusCredentials();
        await this.plugin.getPixelBannerInfo();
        const { contentEl } = this;
        
        // Create title with the selected flag icon
        const titleContainer = contentEl.createEl('h2', {
            cls: 'pixel-banner-selector-title',
            attr: {
                style: `
                    display: flex;
                    align-items: center;
                    justify-content: flex-start;
                    margin-top: 5px;
                `
            }
        });
        
        // Add the flag image
        const flagImg = titleContainer.createEl('img', {
            attr: {
                src: flags[this.plugin.settings.selectImageIconFlag] || flags['red'],
                alt: 'Pixel Banner',
                style: `
                    width: 20px;
                    height: 25px;
                    vertical-align: middle;
                    margin: -5px 10px 0 20px;
                `
            }
        });
        
        // Add the text
        titleContainer.appendChild(document.createTextNode('Pixel Banner'));

        // Add settings button to the title container
        const settingsButton = titleContainer.createEl('button', {
            cls: 'pixel-banner-settings-button',
            attr: {
                style: `
                    margin-left: auto;
                    margin-right: 20px;
                    padding: 4px 10px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    font-size: 14px;
                    text-transform: uppercase;
                `
            }
        });
        settingsButton.innerHTML = '⚙️ Settings';
        settingsButton.title = 'Open Pixel Banner Settings';
        settingsButton.addEventListener('click', () => {
            this.close();
            
            // Open settings and navigate to Pixel Banner tab
            const openSettings = async () => {
                await this.app.setting.open();
                await new Promise(resolve => setTimeout(resolve, 300)); // Wait for settings to load
                
                // Find and click the Pixel Banner item in the settings sidebar
                const settingsTabs = document.querySelectorAll('.vertical-tab-header-group .vertical-tab-nav-item');
                for (const tab of settingsTabs) {
                    if (tab.textContent.includes('Pixel Banner')) {
                        tab.click();
                        break;
                    }
                }
            };
            
            openSettings();
        });

        // Check if the current note has a banner
        const activeFile = this.app.workspace.getActiveFile();
        const hasBanner = activeFile ? (
            this.plugin.hasBannerFrontmatter(activeFile) || 
            this.plugin.app.metadataCache.getFileCache(activeFile)?.frontmatter?.[this.plugin.settings.customBannerShuffleField[0]]
        ) : false;

        // Create main container
        const mainContainer = contentEl.createDiv({ cls: 'pixel-banner-main-container' });
        
        // Create banner source section with heading
        const bannerSourceSection = mainContainer.createDiv({ cls: 'pixel-banner-section' });
        bannerSourceSection.createEl('h3', { text: 'Select Banner Source', cls: 'pixel-banner-section-title' });
        
        // Banner source buttons container
        const bannerSourceButtons = bannerSourceSection.createDiv({
            cls: 'pixel-banner-source-buttons',
            attr: {
                style: `
                    display: ${this.plugin.pixelBannerPlusServerOnline ? 'flex !important' : 'flex'};
                `
            }
        });
        
        // AI Generation Button
        const aiButton = bannerSourceButtons.createEl('button', {
            cls: 'pixel-banner-source-button',
            attr: {
                style: `
                    display: ${this.plugin.pixelBannerPlusServerOnline ? 'flex' : 'none'};
                `
            }
        });
        const aiButtonContent = aiButton.createDiv({ cls: 'pixel-banner-button-content' });
        aiButtonContent.createEl('span', { text: '✨', cls: 'pixel-banner-button-icon' });
        aiButtonContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'AI Banner', 
            cls: 'pixel-banner-button-text'
        });
        // AI Generation Button Click Event
        aiButton.addEventListener('click', () => {
            this.close();
            new GenerateAIBannerModal(this.app, this.plugin).open();
        });
        
        // Store Button
        const storeButton = bannerSourceButtons.createEl('button', {
            cls: 'pixel-banner-source-button',
            attr: {
                style: `
                    display: ${this.plugin.pixelBannerPlusServerOnline ? 'flex' : 'none'};
                `
            }
        });
        const storeButtonContent = storeButton.createDiv({ cls: 'pixel-banner-button-content' });
        storeButtonContent.createEl('span', { text: '🏪', cls: 'pixel-banner-button-icon' });
        storeButtonContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'Store', 
            cls: 'pixel-banner-button-text' 
        });
        // Store Button Click Event
        storeButton.addEventListener('click', () => {
            this.close();
            new PixelBannerStoreModal(this.app, this.plugin).open();
        });

        // Vault Selection Button
        const vaultButton = bannerSourceButtons.createEl('button', {
            cls: 'pixel-banner-source-button'
        });
        const vaultButtonContent = vaultButton.createDiv({ cls: 'pixel-banner-button-content' });
        vaultButtonContent.createEl('span', { text: '💾', cls: 'pixel-banner-button-icon' });
        vaultButtonContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'Your Vault', 
            cls: 'pixel-banner-button-text' 
        });
        
        // Vault Selection Button Click Event
        vaultButton.addEventListener('click', () => {
            this.close();
            new ImageSelectionModal(
                this.app, 
                this.plugin,
                async (file) => {
                    // This is the onChoose callback that will be used when an image is selected
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) {
                        await this.plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                            const bannerField = this.plugin.settings.customBannerField[0];
                            frontmatter[bannerField] = `[[${file.path}]]`;
                        });
                        
                        // Check if we should open the banner icon modal after selecting a banner
                        if (this.plugin.settings.openBannerIconModalAfterSelectingBanner) {
                            new EmojiSelectionModal(
                                this.app, 
                                this.plugin,
                                async (emoji) => {
                                    const activeFile = this.app.workspace.getActiveFile();
                                    if (activeFile) {
                                        await this.plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                                            const iconField = this.plugin.settings.customBannerIconField[0];
                                            if (emoji) {
                                                frontmatter[iconField] = emoji;
                                            } else {
                                                // If emoji is empty, remove the field from frontmatter
                                                delete frontmatter[iconField];
                                            }
                                        });
                                        
                                        // Ensure the banner is updated to reflect the changes
                                        const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                                        if (view) {
                                            // Clean up any existing banner icon overlays before updating
                                            const contentEl = view.contentEl;
                                            if (contentEl) {
                                                const existingOverlays = contentEl.querySelectorAll('.banner-icon-overlay');
                                                existingOverlays.forEach(overlay => {
                                                    this.plugin.returnIconOverlay(overlay);
                                                });
                                            }
                                            
                                            await this.plugin.updateBanner(view, true);
                                        }
                                        
                                        // Check if we should open the targeting modal after setting the icon
                                        if (this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                                            new TargetPositionModal(this.app, this.plugin).open();
                                        }
                                    }
                                },
                                // Skip the targeting modal in the EmojiSelectionModal if we're going to open it here
                                this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon
                            ).open();
                        } 
                        // If not opening the banner icon modal, check if we should open the targeting modal
                        else if (this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                            new TargetPositionModal(this.app, this.plugin).open();
                        }
                    }
                },
                this.plugin.settings.defaultSelectImagePath
            ).open();
        });

        // Web Address Button
        const webAddressButton = bannerSourceButtons.createEl('button', {
            cls: 'pixel-banner-source-button'
        });
        const webAddressButtonContent = webAddressButton.createDiv({ cls: 'pixel-banner-button-content' });
        webAddressButtonContent.createEl('span', { text: '🌐', cls: 'pixel-banner-button-icon' });
        webAddressButtonContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'URL', 
            cls: 'pixel-banner-button-text' 
        });

        // Web Address Button Click Event
        webAddressButton.addEventListener('click', () => {
            this.close();
            new WebAddressModal(this.app, this.plugin).open();
        });

        // Customization section
        const customizationSection = mainContainer.createDiv({ cls: 'pixel-banner-section' });
        customizationSection.createEl('h3', { text: 'Customize Banner', cls: 'pixel-banner-section-title' });
        
        // Customization options container
        const customizationOptions = customizationSection.createDiv({ cls: 'pixel-banner-customization-options' });
        
        // Banner Icon Button
        const bannerIconButton = customizationOptions.createEl('button', {
            cls: 'pixel-banner-customize-button'
        });
        const bannerIconContent = bannerIconButton.createDiv({ cls: 'pixel-banner-button-content' });
        bannerIconContent.createEl('span', { text: '⭐', cls: 'pixel-banner-button-icon' });
        bannerIconContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'Set Banner Icon', 
            cls: 'pixel-banner-button-text' 
        });
        
        // Disable the button if no banner exists
        if (!hasBanner) {
            bannerIconButton.disabled = true;
            bannerIconButton.classList.add('pixel-banner-button-disabled');
            bannerIconButton.title = 'You need to add a banner first';
        }
        
        bannerIconButton.addEventListener('click', () => {
            if (!hasBanner) return; // Extra safety check
            
            this.close();
            new EmojiSelectionModal(
                this.app, 
                this.plugin,
                async (emoji) => {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) {
                        await this.plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                            const iconField = this.plugin.settings.customBannerIconField[0];
                            if (emoji) {
                                frontmatter[iconField] = emoji;
                            } else {
                                // If emoji is empty, remove the field from frontmatter
                                delete frontmatter[iconField];
                            }
                        });
                    }
                }
            ).open();
        });

        // Targeting Icon Button
        const targetingIconButton = customizationOptions.createEl('button', {
            cls: 'pixel-banner-customize-button'
        });
        const targetingIconContent = targetingIconButton.createDiv({ cls: 'pixel-banner-button-content' });
        targetingIconContent.createEl('span', { text: '🎯', cls: 'pixel-banner-button-icon' });
        targetingIconContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'Adjust Position, Size, & Style', 
            cls: 'pixel-banner-button-text' 
        });

        // Disable the button if no banner exists
        if (!hasBanner) {
            targetingIconButton.disabled = true;
            targetingIconButton.classList.add('pixel-banner-button-disabled');
            targetingIconButton.title = 'You need to add a banner first';
        }

        targetingIconButton.addEventListener('click', () => {
            this.close();
            new TargetPositionModal(this.app, this.plugin).open();
        });
        
        // No Banner Message
        if (!hasBanner) {
            const noBannerMessage = customizationSection.createDiv({ cls: 'pixel-banner-no-banner-message' });
            noBannerMessage.createEl('p', { 
                text: 'No banner found for this note. Add a banner first to enable customization options.',
                cls: 'pixel-banner-message-text'
            });
        }

        // Pixel Banner Plus Account section
        const accountSection = mainContainer.createDiv({
            cls: 'pixel-banner-section',
            attr: {
                style: `
                    font-size: .9em;
                    margin-top: 10px;
                    gap: 5px;
                `
            }
        });
        const accountTitle = accountSection.createEl('h3', {
            text: 'Pixel Banner Plus Account',
            cls: 'pixel-banner-section-title',
            attr: {
                style: `
                    margin: 0;
                    cursor: help;
                    width: max-content;
                `
            }
        });
        
        // Account info container
        const accountInfo = accountSection.createDiv({ cls: 'pixel-banner-account-info' });

        const statusContainer = accountInfo.createDiv({
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    cursor: help;
                `
            }
        });
        
        // Connection Status        
        const isConnected = this.plugin.pixelBannerPlusEnabled;
        const pixelBannerPlusServerOnline = this.plugin.pixelBannerPlusServerOnline;
        const statusText = pixelBannerPlusServerOnline ? (isConnected ? '✅ Authorized' : '❌ Not Authorized') : '🚨 Servers Offline 🚨';
        const statusBorderColor = isConnected ? '#20bf6b' : '#FF0000';
        
        statusContainer.createEl('span', {
            text: statusText,
            cls: 'pixel-banner-status-value',
            attr: {
                style: `border: 1px dotted ${statusBorderColor};`
            }
        });
        
        // Available Tokens        
        const tokenCount = this.plugin.pixelBannerPlusBannerTokens !== undefined ? 
            `🪙 ${this.plugin.pixelBannerPlusBannerTokens.toString()} Tokens` : '❓ Unknown';
        
        statusContainer.createEl('span', {
            text: tokenCount,
            cls: 'pixel-banner-status-value',
            attr: {
                style: `
                    border: 1px dotted #F3B93B;
                    display: ${pixelBannerPlusServerOnline && this.plugin.pixelBannerPlusEnabled ? 'inline-flex' : 'none'};
                `
            }
        });

        // Open settings and navigate to Pixel Banner tab
        const openPlusSettings = async () => {
            this.close();
            await this.app.setting.open();
            await new Promise(resolve => setTimeout(resolve, 300)); // Wait for settings to load
            
            // Find and click the Pixel Banner item in the settings sidebar
            const settingsTabs = document.querySelectorAll('.vertical-tab-header-group .vertical-tab-nav-item');
            for (const tab of settingsTabs) {
                if (tab.textContent.includes('Pixel Banner')) {
                    tab.click();
                    break;
                }
            }
            
            // Find and click the Pixel Banner Plus item in the settings sidebar
            const pixelBannerSettingsTabs = document.querySelectorAll('.pixel-banner-settings-tabs > button.pixel-banner-settings-tab');
            for (const tab of pixelBannerSettingsTabs) {
                if (tab.textContent.includes('Plus')) {
                    tab.click();
                    break;
                }
            }
        };
        // Plus Settings Listener for `accountTitle` and `statusContainer`
        accountTitle.addEventListener('click', openPlusSettings);
        statusContainer.addEventListener('click', openPlusSettings);            
        
        // Show Buy Tokens button if connected
        if (pixelBannerPlusServerOnline && isConnected && this.plugin.pixelBannerPlusBannerTokens === 0) {
            const buyTokensButton = accountInfo.createEl('button', {
                cls: 'pixel-banner-account-button pixel-banner-buy-tokens-button',
                text: '💵 Buy More Tokens'
            });            
            buyTokensButton.addEventListener('click', (event) => {
                event.preventDefault();
                window.open(PIXEL_BANNER_PLUS.SHOP_URL, '_blank');
            });
        } 
        // Show Signup button if not connected
        else if (pixelBannerPlusServerOnline && !isConnected) {
            const signupButton = accountInfo.createEl('button', {
                cls: 'pixel-banner-account-button pixel-banner-signup-button',
                text: '🚩 Signup for Free!'
            });            
            signupButton.addEventListener('click', (event) => {
                event.preventDefault();
                const signupUrl = PIXEL_BANNER_PLUS.API_URL + PIXEL_BANNER_PLUS.ENDPOINTS.SIGNUP;
                window.open(signupUrl, '_blank');
            });
        }

        // Version Info
        const cloudVersion = this.plugin.pixelBannerVersion;
        const currentVersion = this.plugin.settings.lastVersion;
        
        // check if cloudVersion is greater than currentVersion (these are semver versions, eg: 1.0.0)
        const isCloudVersionGreater = semver.gt(cloudVersion, currentVersion);
        let versionText, cursor;
        if (isCloudVersionGreater) {
            versionText = `🔄 Update Available!`;
            cursor = 'pointer';
        } else {
            versionText = ``;
            // versionText = `✅ Up to Date`;
            cursor = 'default';
        }
        const versionInfo = accountInfo.createDiv({
            text: versionText,
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    cursor: ${cursor};
                    margin-left: auto;
                    animation: pixel-banner-scale-up-down 3s ease-in-out infinite;
                `
            }
        });

        if (isCloudVersionGreater) {
            // Obsidian API call to update the plugin: plugin-id is "pexels-banner"
            const openCommunityPlugins = async () => {
                this.close();
                await this.app.setting.open();
                await new Promise(resolve => setTimeout(resolve, 300)); // Wait for settings to load
                
                // Find and click the Community Plugins item in the settings sidebar
                const settingsTabs = document.querySelectorAll('.vertical-tab-header-group .vertical-tab-nav-item');
                for (const tab of settingsTabs) {
                    if (tab.textContent.includes('Community plugins')) {
                        tab.click();
                        break;
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 500)); // Wait for settings to load
                
                // Find the "Check for updates" button
                const allTheButtons = document.querySelectorAll('button.mod-cta');
                for (const button of allTheButtons) {
                    if (button.textContent.includes('Check for updates')) {
                        button.click();
                        break;
                    }
                }
            };
            versionInfo.addEventListener('click', openCommunityPlugins);
        }


        if (pixelBannerPlusServerOnline) {
            // add button to open daily game modal
            const isMobileDevice = window.navigator.userAgent.includes("Android") || 
                                   window.navigator.userAgent.includes("iPhone") || 
                                   window.navigator.userAgent.includes("iPad") || 
                                   window.navigator.userAgent.includes("iPod");
                                
            if (!isMobileDevice) {
                const dailyGameButtonContainer = accountInfo.createDiv({
                    attr: {
                        style: `
                            display: flex;
                            flex-direction: row;
                            align-items: center;
                            gap: 10px;
                        `
                    }
                });
                const dailyGameButton = dailyGameButtonContainer.createEl('button', {
                    cls: 'pixel-banner-account-button pixel-banner-daily-game-button',
                    text: '🎮 Play Daily Game'
                });
                dailyGameButton.addEventListener('click', () => {
                    this.close();
                    new DailyGameModal(this.app, this.plugin.settings.pixelBannerPlusEmail, this.plugin.settings.pixelBannerPlusApiKey, this.plugin).open();
                });

                // show jackpot amount
                const jackpotAmount = this.plugin.pixelBannerPlusJackpot;
                const jackpotAmountElement = dailyGameButtonContainer.createEl('span', {
                    text: `💰 Jackpot: ${jackpotAmount}`,
                    cls: 'pixel-banner-jackpot-amount'
                });
            }
        }
        
        // Add styles
        this.addStyle();
        
        // Hide loading spinner when everything is loaded
        this.hideLoadingSpinner();
    }

    addStyle() {
        const style = document.createElement('style');
        style.textContent = `            
            .pixel-banner-main-container {
                display: flex;
                flex-direction: column;
                gap: 24px;
                padding: 0 16px 16px;
                overflow-y: auto;
                max-height: 80vh;
                width: 100%;
                box-sizing: border-box;
            }
            
            .pixel-banner-section {
                display: flex;
                flex-direction: column;
                gap: 16px;
                width: 100%;
            }
            
            .pixel-banner-section-title {
                font-size: 16px;
                margin: 0;
                color: var(--text-normal);
                font-weight: 600;
            }
            
            .pixel-banner-source-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                width: 100%;
                justify-content: space-between;
            }
            
            .pixel-banner-source-button {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px 8px;
                border-radius: 8px;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-primary);
                cursor: pointer;
                transition: all 0.2s ease;
                flex: 1;
                min-width: 80px;
                min-height: 100px;
                height: 100%;
                box-sizing: border-box;
                overflow: hidden;
            }
            
            .pixel-banner-source-button:hover {
                background: var(--background-modifier-hover);
                transform: translateY(-2px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .pixel-banner-button-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
                width: 100%;
                height: 100%;
            }
            
            .pixel-banner-button-icon {
                font-size: 24px;
                line-height: 1;
                flex-shrink: 0;
            }
            
            .pixel-banner-button-text-container {
                text-align: center;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-grow: 1;
                overflow: hidden;
            }
            
            .pixel-banner-button-text {
                font-size: 13px;
                font-weight: 500;
                white-space: normal;
                word-break: break-word;
                line-height: 1.2;
                hyphens: auto;
                overflow-wrap: break-word;
                max-width: 100%;
            }
            
            .pixel-banner-customization-options {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                width: 100%;
                justify-content: space-between;
            }
            
            .pixel-banner-customize-button {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px 8px;
                border-radius: 8px;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-primary);
                cursor: pointer;
                transition: all 0.2s ease;
                flex: 1;
                min-width: 80px;
                min-height: 100px;
                height: 100%;
                box-sizing: border-box;
                overflow: hidden;
            }
            
            .pixel-banner-customize-button:hover {
                background: var(--background-modifier-hover);
                transform: translateY(-2px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .pixel-banner-button-disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .pixel-banner-button-disabled:hover {
                background: var(--background-primary);
                transform: none;
                box-shadow: none;
            }
            
            .pixel-banner-no-banner-message {
                margin-top: 8px;
                padding: 12px;
                background: var(--background-modifier-error-rgb);
                border-radius: 8px;
                opacity: 0.7;
                width: 100%;
                box-sizing: border-box;
            }
            
            .pixel-banner-message-text {
                margin: 0;
                color: var(--text-error);
                font-size: 14px;
                text-align: center;
            }
            
            .pixel-banner-settings-button:hover {
                opacity: 0.8;
            }
            
            /* Pixel Banner Plus Account styles */
            .pixel-banner-account-info {
                display: flex;
                flex-direction: row;
                justify-content: flex-start;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
                width: 100%;
            }
            
            .pixel-banner-status-value {
                padding: 3px 7px;
                border-radius: 0px;
                font-size: .8em;
                letter-spacing: 1px;
                background-color: var(--background-primary);
                display: inline-flex;
                align-items: center;
            }
            
            .pixel-banner-account-button {
                padding: 3px 7px;
                border-radius: 5px;
                cursor: pointer;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-size: .7em;
                transition: all 0.2s ease;
                border: 1px solid var(--background-modifier-border);
            }
            
            .pixel-banner-account-button:hover {
                opacity: 0.9;
                transform: translateY(-2px);
            }
            
            .pixel-banner-buy-tokens-button {
                background-color: darkgreen !important;
                color: papayawhip !important;
                opacity: 0.7;
            }
            
            .pixel-banner-signup-button {
                background-color: var(--interactive-accent) !important;
                color: var(--text-on-accent) !important;
            }
            
            /* Loading spinner styles */
            .pixel-banner-loading-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                background-color: var(--background-primary);
                z-index: 100;
                animation: pixel-banner-fade-in 0.3s ease-in-out;
            }
            
            @media (min-width: 400px) {
                .pixel-banner-source-buttons,
                .pixel-banner-customization-options {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    grid-auto-rows: 1fr;
                }
                
                .pixel-banner-customization-options {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .pixel-banner-source-button,
                .pixel-banner-customize-button {
                    padding: 16px 8px;
                }
            }
            
            @media (max-width: 399px) {
                .pixel-banner-source-button,
                .pixel-banner-customize-button {
                    min-height: 90px;
                }
                
                .pixel-banner-button-icon {
                    font-size: 20px;
                }
                
                .pixel-banner-button-text {
                    font-size: 12px;
                }
            }
        `;
        document.head.appendChild(style);
        this.style = style;
    }

    onClose() {
        this.contentEl.empty();
        if (this.style) {
            this.style.remove();
        }
        // Remove loading overlay if it exists
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
        }
    }
} 