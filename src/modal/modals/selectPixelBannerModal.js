import { Modal, MarkdownView } from 'obsidian';
import {
    ImageSelectionModal, GenerateAIBannerModal, PixelBannerStoreModal,
    EmojiSelectionModal, TargetPositionModal, WebAddressModal, DailyGameModal,
    IconImageSelectionModal
} from '../modals';
import { flags } from '../../resources/flags.js';
import { semver } from '../../utils/semver.js';
import { decimalToFractionString } from '../../utils/fractionTextDisplay';
import { PIXEL_BANNER_PLUS } from '../../resources/constants.js';

export class SelectPixelBannerModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.isLoading = false;
        this.isVerifyingAPI = true; // Track API verification state
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Initialize the basic modal UI immediately
        await this.initializeBasicUI();

        if (this.plugin.settings.pixelBannerPlusEnabled) {
            // Initialize the API-dependent parts in the background
            this.initializeAPIDependentSections().catch(error => {
                console.error('Error initializing API-dependent sections:', error);
                this.updateAPIStatusUI(false);
            });
        }
    }
    
    // Create a loading spinner element
    createLoadingSpinner() {
        const spinner = document.createElement('div');
        spinner.classList.add('pixel-banner-section-spinner');
        spinner.innerHTML = `
            <div class="pixel-banner-spinner" style="
                width: 20px;
                height: 20px;
                border: 2px solid var(--background-modifier-border);
                border-top: 2px solid var(--text-accent);
                border-radius: 50%;
                animation: pixel-banner-spin 1s linear infinite;
            "></div>
        `;
        return spinner;
    }
    
    // Initialize the basic UI (non-API dependent)
    async initializeBasicUI() {
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
                    // background: transparent;
                    border: none;
                    cursor: pointer;
                    font-size: 14px;
                    text-transform: uppercase;
                `
            }
        });
        settingsButton.innerHTML = '⚙️ Plugin Settings';
        settingsButton.title = 'Open Pixel Banner Plugin Settings';
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
            (this.plugin.app.metadataCache.getFileCache(activeFile)?.frontmatter && 
             this.plugin.settings.customBannerShuffleField.some(field => 
                this.plugin.app.metadataCache.getFileCache(activeFile)?.frontmatter?.[field]
             ))
        ) : false;

        // Create main container
        const mainContainer = contentEl.createDiv({ cls: 'pixel-banner-main-container' });
        
        // Create banner source section with heading
        const bannerSourceSection = mainContainer.createDiv({ cls: 'pixel-banner-section' });
        bannerSourceSection.createEl('h3', {
            text: 'Choose a Banner',
            cls: 'pixel-banner-section-title',
            attr: {
                style: `
                    margin: 0;
                `
            }
        });
        
        // Banner source buttons container
        const bannerSourceButtons = bannerSourceSection.createDiv({
            cls: 'pixel-banner-source-buttons',
        });

        // Vault Selection Button (immediately available)
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
                            const format = this.plugin.settings.imagePropertyFormat;
                            const bannerValue = format === '[[image]]' ? `[[${file.path}]]` : `![[${file.path}]]`;
                            frontmatter[bannerField] = bannerValue;
                        });
                        
                        // If not opening the banner icon modal, check if we should open the targeting modal
                        if (this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                            new TargetPositionModal(this.app, this.plugin).open();
                        }
                    }
                },
                this.plugin.settings.defaultSelectImagePath
            ).open();
        });

        // Web Address Button (immediately available)
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

        if (this.plugin.settings.pixelBannerPlusEnabled) {
            // AI Generation Button (with loading state initially)
            const aiButton = bannerSourceButtons.createEl('button', {
                cls: 'pixel-banner-source-button pixel-banner-api-dependent',
                attr: {
                    id: 'pixel-banner-plus-ai-button',
                    style: `
                        position: relative;
                    `
                }
            });
            const aiButtonContent = aiButton.createDiv({ cls: 'pixel-banner-button-content' });
            aiButtonContent.createEl('span', { text: '✨', cls: 'pixel-banner-button-icon' });
            aiButtonContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
                text: 'AI Banner', 
                cls: 'pixel-banner-button-text'
            });
            
            // Add loading overlay to AI button
            const aiLoadingOverlay = aiButton.createDiv({
                cls: 'pixel-banner-button-loading-overlay',
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
                        opacity: 0.8;
                        z-index: 10;
                    `
                }
            });
            aiLoadingOverlay.appendChild(this.createLoadingSpinner());
            
            // Store Button (with loading state initially)
            const storeButton = bannerSourceButtons.createEl('button', {
                cls: 'pixel-banner-source-button pixel-banner-api-dependent',
                attr: {
                    id: 'pixel-banner-plus-store-button',
                    style: `
                        position: relative;
                    `
                }
            });
            const storeButtonContent = storeButton.createDiv({ cls: 'pixel-banner-button-content' });
            storeButtonContent.createEl('span', { text: '🏪', cls: 'pixel-banner-button-icon' });
            storeButtonContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
                text: 'Plus Collection', 
                cls: 'pixel-banner-button-text' 
            });
            
            // Add loading overlay to Store button
            const storeLoadingOverlay = storeButton.createDiv({
                cls: 'pixel-banner-button-loading-overlay',
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
                        opacity: 0.8;
                        z-index: 10;
                    `
                }
            });
            storeLoadingOverlay.appendChild(this.createLoadingSpinner());
            
            // Add click handler for Store button
            storeButton.addEventListener('click', () => {
                this.close();
                new PixelBannerStoreModal(this.app, this.plugin).open();
            });
        }

        // Customization section
        const customizationSection = mainContainer.createDiv({ cls: 'pixel-banner-section' });
        customizationSection.createEl('h3', {
            text: 'Customize Banner',
            cls: 'pixel-banner-section-title',
            attr: {
                style: `
                    margin: 0;
                `
            }
        });
        
        // Customization options container
        const customizationOptions = customizationSection.createDiv({ cls: 'pixel-banner-customization-options' });
        
        // Banner Icon Image Button
        const bannerIconImageButton = customizationOptions.createEl('button', {
            cls: 'pixel-banner-customize-button'
        });
        const bannerIconImageContent = bannerIconImageButton.createDiv({ cls: 'pixel-banner-button-content' });
        bannerIconImageContent.createEl('span', { text: '⭐', cls: 'pixel-banner-button-icon' });
        bannerIconImageContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'Icon Image', 
            cls: 'pixel-banner-button-text' 
        });

        // Disable the Icon Image button if no banner exists
        if (!hasBanner) {
            bannerIconImageButton.disabled = true;
            bannerIconImageButton.classList.add('pixel-banner-button-disabled');
            bannerIconImageButton.title = 'You need to add a banner first';
        }

        // Add click handler for the Icon Image button
        bannerIconImageButton.addEventListener('click', () => {
            this.close();
            
            // Function to handle image selection
            const onChooseBannerIconImage = async (filePath) => {
                if (!filePath) {
                    return;
                }
                
                // Handle case where filePath might be a file object instead of string
                let pathString = filePath;
                if (typeof filePath === 'object' && filePath.path) {
                    pathString = filePath.path;
                } else if (typeof filePath !== 'string') {
                    return;
                }
                
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) return;
                
                // Get the file object from the vault using the path
                const file = this.app.vault.getAbstractFileByPath(pathString);
                
                // Check if this is a web URL or local file
                if (typeof pathString === 'string' && (pathString.startsWith('http://') || pathString.startsWith('https://'))) {
                    // For web URLs, use the URL directly
                    this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                        // Get the correct field name
                        const iconImageField = Array.isArray(this.plugin.settings.customBannerIconImageField) 
                            ? this.plugin.settings.customBannerIconImageField[0].split(',')[0].trim()
                            : this.plugin.settings.customBannerIconImageField;
                        
                        // Set the frontmatter value as direct URL
                        fm[iconImageField] = pathString;
                    });
                    
                    // Open the targeting modal after selecting an icon image
                    new TargetPositionModal(this.app, this.plugin).open();
                    return;
                }
                
                // For local files, preload the image into the cache
                const extensionPart = pathString.split('.').pop();
                const fileExtension = extensionPart ? extensionPart.toLowerCase() : '';
                if (fileExtension && fileExtension.match(/^(jpg|jpeg|png|gif|bmp|svg|webp|avif)$/)) {
                    try {
                        // Get the vault URL for the image and load it into the cache
                        const imageUrl = await this.plugin.getVaultImageUrl(pathString);
                        if (imageUrl) {
                            this.plugin.loadedImages.set(pathString, imageUrl);
                            
                            // Force a preload of the image to ensure it's in browser cache
                            const preloadImg = new Image();
                            preloadImg.src = imageUrl;
                        }
                    } catch (error) {
                        console.error("Error preloading icon image:", error);
                    }
                }
                
                // Update frontmatter with the image path
                this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                    // Get the correct field name
                    const iconImageField = Array.isArray(this.plugin.settings.customBannerIconImageField) 
                        ? this.plugin.settings.customBannerIconImageField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconImageField;
                    
                    // Set the frontmatter value
                    fm[iconImageField] = `![[${pathString}]]`;
                });
                
                // Open the targeting modal after selecting an icon image
                new TargetPositionModal(this.app, this.plugin).open();
            };
            
            // Open the Banner Image Selection modal with the default icon path
            new IconImageSelectionModal(
                this.app,
                this.plugin,
                onChooseBannerIconImage,
                this.plugin.settings.defaultSelectIconPath
            ).open();
        });

        // Banner Icon Button
        const bannerIconButton = customizationOptions.createEl('button', {
            cls: 'pixel-banner-customize-button'
        });
        const bannerIconContent = bannerIconButton.createDiv({ cls: 'pixel-banner-button-content' });
        bannerIconContent.createEl('span', { text: '📰', cls: 'pixel-banner-button-icon' });
        bannerIconContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'Icon Emoji & Text', 
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
            text: 'Position, Size, & Style', 
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
        
        // Set focus on the targeting icon button
        setTimeout(() => {
            if (hasBanner && targetingIconButton) {
                targetingIconButton.focus();
            }
        }, 1000);
        
        // No Banner Message
        if (!hasBanner) {
            const noBannerMessage = customizationSection.createDiv({ cls: 'pixel-banner-no-banner-message' });
            noBannerMessage.createEl('p', { 
                text: 'Add a banner first to enable customization options.',
                cls: 'pixel-banner-message-text'
            });
        }

        if (this.plugin.settings.pixelBannerPlusEnabled) {
            // Pixel Banner Plus Account section (with loading state initially)
            const accountSection = mainContainer.createDiv({
                cls: 'pixel-banner-section pixel-banner-api-dependent',
                attr: {
                    style: `
                        gap: 5px;
                        position: relative;
                        min-height: 97px;
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
            
            // Account info container (initially hidden)
            const accountInfo = accountSection.createDiv({ 
                cls: 'pixel-banner-account-info',
                attr: {
                    style: 'visibility: hidden;'
                }
            });

            // Add loading overlay to Account section
            const accountLoadingOverlay = accountSection.createDiv({
                cls: 'pixel-banner-section-loading-overlay',
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
                        opacity: 0.8;
                        z-index: 10;
                        min-height: 50px;
                    `
                }
            });
            accountLoadingOverlay.appendChild(this.createLoadingSpinner());
        }

        // Add styles
        this.addStyle();
    }

    // Initialize the API-dependent UI sections
    async initializeAPIDependentSections() {
        try {
            await this.plugin.verifyPixelBannerPlusCredentials();
            await this.plugin.getPixelBannerInfo();
            this.updateAPIStatusUI(true);
        } catch (error) {
            console.error('Error initializing API-dependent sections:', error);
            // Explicitly set server offline status
            this.plugin.pixelBannerPlusServerOnline = false;
            this.updateAPIStatusUI(false);
        }
    }
    
    // Update UI elements that depend on API status
    updateAPIStatusUI(isOnline) {
        this.isVerifyingAPI = false;
        const { contentEl } = this;
        
        // If API calls failed, ensure server status is set to offline
        if (!isOnline) {
            this.plugin.pixelBannerPlusServerOnline = false;
        }
        
        // Find all loading overlays
        const apiButtons = contentEl.querySelectorAll('.pixel-banner-api-dependent');
        
        // Remove loading overlays
        apiButtons.forEach(element => {
            const loadingOverlay = element.querySelector('.pixel-banner-button-loading-overlay, .pixel-banner-section-loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.remove();
            }
            
            // If element is a button, handle visibility/disabled state
            if (element.tagName === 'BUTTON') {
                if (isOnline && this.plugin.pixelBannerPlusServerOnline) {
                    element.style.display = 'flex';
                    element.classList.remove('pixel-banner-button-disabled');
                    element.disabled = false;
                    
                    // Add click handlers
                    if (element.textContent.includes('AI Banner')) {
                        element.addEventListener('click', () => {
                            this.close();
                            new GenerateAIBannerModal(this.app, this.plugin).open();
                        });
                    } else if (element.textContent.includes('Store')) {
                        element.addEventListener('click', () => {
                            this.close();
                            new PixelBannerStoreModal(this.app, this.plugin).open();
                        });
                    }
                } else {
                    element.style.display = 'none';
                }
            }
        });
        
        // Update account section
        if (this.plugin.settings.pixelBannerPlusEnabled) {
            const accountSection = contentEl.querySelector('.pixel-banner-section.pixel-banner-api-dependent');
            if (accountSection) {
                const accountInfo = accountSection.querySelector('.pixel-banner-account-info');
                if (accountInfo) {
                    accountInfo.style.visibility = 'visible';
                    
                    // Clear existing content
                    accountInfo.empty();
                    
                    // Rebuild account info
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

                    // function to open settings and navigate to Pixel Banner tab
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

                    // openPlusSettings click handler for account title
                    const accountTitle = accountSection.querySelector('.pixel-banner-section-title');
                    if (accountTitle) accountTitle.addEventListener('click', openPlusSettings);
                    
                    // Connection Status
                    const isConnected = this.plugin.pixelBannerPlusEnabled;
                    const pixelBannerPlusServerOnline = this.plugin.pixelBannerPlusServerOnline;

                    if (!isConnected) {
                        const aiButton = document.getElementById('pixel-banner-plus-ai-button');
                        const storeButton = document.getElementById('pixel-banner-plus-store-button');

                        aiButton.disabled = true;
                        aiButton.classList.add('pixel-banner-button-disabled');
                        aiButton.title = "You need an authorize Pixel Banner Plus account to use this feature";
                        
                        storeButton.disabled = true;
                        storeButton.classList.add('pixel-banner-button-disabled');
                        storeButton.title = "You need an authorize Pixel Banner Plus account to use this feature";
                    }
                    
                    // Always show server offline message if isOnline is false or server is actually offline
                    const statusText = (!isOnline || !pixelBannerPlusServerOnline) 
                        ? '🚨 Servers Offline 🚨' 
                        : (isConnected ? '✅ Authorized' : '❌ Not Authorized');
                    
                    const statusBorderColor = (!isOnline || !pixelBannerPlusServerOnline) 
                        ? '#FF6B6B' 
                        : (isConnected ? '#177d47' : '#FF0000');
                    
                    const statusEl = statusContainer.createEl('span', {
                        text: statusText,
                        cls: 'pixel-banner-status-value',
                        attr: {
                            style: `border: 1px dashed ${statusBorderColor};`
                        }
                    });
                    statusEl.addEventListener('click', openPlusSettings);

                    // isMobileDevice check
                    const isMobileDevice = window.navigator.userAgent.includes("Android") || 
                        window.navigator.userAgent.includes("iPhone") || 
                        window.navigator.userAgent.includes("iPad") || 
                        window.navigator.userAgent.includes("iPod");
                    
                    // Available Tokens - only show if server is online
                    if (isOnline && pixelBannerPlusServerOnline) {
                        const tokenCount = this.plugin.pixelBannerPlusBannerTokens !== undefined 
                            ? `🪙 ${decimalToFractionString(this.plugin.pixelBannerPlusBannerTokens)} Tokens` 
                            : '❓ Unknown';
                        
                        const tokenCountEl = statusContainer.createEl('span', {
                            text: tokenCount,
                            cls: 'pixel-banner-status-value',
                            attr: {
                                style: `
                                    border: 1px dashed #bba00f;
                                    display: ${pixelBannerPlusServerOnline && this.plugin.pixelBannerPlusEnabled ? 'inline-flex' : 'none'};
                                `
                            }
                        });
                        tokenCountEl.addEventListener('click', openPlusSettings);

                        if (!isMobileDevice && isConnected) {
                            // Add game button to the title container
                            const gameButton = statusContainer.createEl('button', {
                                cls: 'pixel-banner-game-button',
                                attr: {
                                    style: `
                                        margin-left: auto;
                                        margin-right: 10px;
                                        padding: 4px 10px;
                                        background: transparent;
                                        border: none;
                                        box-shadow: none;
                                        cursor: pointer;
                                        font-size: 14px;
                                        display: none;
                                        text-transform: uppercase;
                                    `
                                }
                            });
                            gameButton.innerHTML = '🕹️';
                            gameButton.title = 'Play Daily Game (optional)... chance to win Banner Tokens';
                            gameButton.addEventListener('click', () => {
                                this.close();
                                new DailyGameModal(this.app, this.plugin.settings.pixelBannerPlusEmail, this.plugin.settings.pixelBannerPlusApiKey, this.plugin).open();
                            });
                            
                            // Update the game button visibility
                            const showGameButton = isOnline && 
                                                this.plugin.pixelBannerPlusServerOnline && 
                                                this.plugin.pixelBannerPlusEnabled && 
                                                !this.plugin.settings.enableDailyGame;
                            
                            gameButton.style.display = showGameButton ? 'inline-block' : 'none';
                        }
                        
                        // Add daily game button in the account info section when API is online
                        // Only display the daily game container if not on mobile device AND the enableDailyGame setting is true
                        if (!isMobileDevice && this.plugin.settings.enableDailyGame && isConnected) {
                            const dailyGameContainer = accountInfo.createDiv({
                                cls: 'pixel-banner-daily-game-container',
                                attr: {
                                    style: `
                                        display: flex;
                                        flex-direction: row;
                                        align-items: center;
                                        gap: 10px;
                                        justify-content: space-between;
                                        width: 100%;
                                        border-top: 1px solid var(--modal-border-color);
                                        padding-top: 20px;
                                        margin-top: 10px;
                                    `
                                }
                            });

                            // Current Daily Game Info Block
                            const dailyGameInfoBlock = dailyGameContainer.createDiv({
                                attr: {
                                    style: `
                                        display: flex;
                                        flex-direction: column;
                                        align-items: flex-start;
                                        gap: 5px;
                                        width: 100%;
                                    `
                                }
                            });
                            const infoBlockRow1 = dailyGameInfoBlock.createEl('div');
                            infoBlockRow1.createEl('span', { text: '🎮 Daily Game ' });
                            infoBlockRow1.createEl('span', {
                                text: this.plugin.pixelBannerPlusDailyGameName,
                                attr: { 
                                    style: `
                                        font-style: italic;
                                        padding: 0px 8px;
                                        border-radius: 7px;
                                        line-height: 1.38;
                                        color: var(--text-color);
                                        background-color: var(--interactive-normal);
                                        box-shadow: var(--input-shadow);
                                    `
                                }
                            });

                            const infoBlockRow2 = dailyGameInfoBlock.createEl('div');
                            infoBlockRow2.createEl('span', { text: '🏆 High Score ' });
                            infoBlockRow2.createEl('span', {
                                text: this.plugin.pixelBannerPlusHighScore,
                                attr: { style: `
                                    font-style: italic;
                                    padding: 0px 8px;
                                    border-radius: 7px;
                                    line-height: 1.38;
                                    color: var(--text-color);
                                    background-color: var(--interactive-normal);
                                    box-shadow: var(--input-shadow);
                                `}
                            });
                            
                            const infoBlockRow3 = dailyGameInfoBlock.createEl('div');
                            infoBlockRow3.createEl('span', { text: '💰 Current Jackpot ' });
                            infoBlockRow3.createEl('span', {
                                text: `🪙 ${decimalToFractionString(this.plugin.pixelBannerPlusJackpot)} Tokens`,
                                attr: { style: `
                                    font-style: italic;
                                    padding: 0px 8px;
                                    border-radius: 7px;
                                    line-height: 1.38;
                                    color: var(--text-color);
                                    background-color: var(--interactive-normal);
                                    box-shadow: var(--input-shadow);
                                ` } });
                            
                            const infoBlockRow4 = dailyGameInfoBlock.createEl('div');
                            infoBlockRow4.createEl('span', { text: '⏰ Time Left ' });
                            infoBlockRow4.createEl('span', {
                                text: this.plugin.pixelBannerPlusTimeLeft,
                                attr: { style: `
                                    font-style: italic;
                                    padding: 0px 8px;
                                    border-radius: 7px;
                                    line-height: 1.38;
                                    color: var(--text-color);
                                    background-color: var(--interactive-normal);
                                    box-shadow: var(--input-shadow);
                                ` }
                            });

                            const infoBlockRow5 = dailyGameInfoBlock.createEl('div');
                            infoBlockRow5.createEl('span', {
                                text: '3 FREE',
                                attr: {
                                    style: `
                                        background: darkgreen;
                                        color: white;
                                        padding: 0px 4px;
                                        border-radius: 5px;
                                        letter-spacing: 1px;
                                    `
                                }
                            });
                            infoBlockRow5.createEl('span', { text: ' plays per day!' });

                            // Daily Game Button
                            const dailyGameButton = dailyGameContainer.createEl('button', {
                                cls: 'pixel-banner-account-button pixel-banner-daily-game-button',
                                attr: {
                                    style: `
                                        min-width: 110px;
                                    `
                                }
                            });
                            const dailyGameContent = dailyGameButton.createDiv({
                                cls: 'pixel-banner-button-content',
                                attr: {
                                    style: `
                                        display: flex;
                                        align-items: center;
                                        gap: 10px;
                                    `
                                }
                            });
                            dailyGameContent.createEl('span', { text: '🕹️', cls: 'pixel-banner-button-icon pixel-banner-twinkle-animation' });
                            dailyGameContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
                                text: 'Play Daily Game', 
                                cls: 'pixel-banner-button-text'
                            });
                            dailyGameButton.addEventListener('click', () => {
                                this.close();
                                new DailyGameModal(this.app, this.plugin.settings.pixelBannerPlusEmail, this.plugin.settings.pixelBannerPlusApiKey, this.plugin).open();
                            });
                        }
                    } else {
                        // If offline, show a reconnect button
                        const retryButton = statusContainer.createEl('button', {
                            text: '🔄 Try Again',
                            cls: 'pixel-banner-account-button pixel-banner-retry-button',
                            attr: {
                                style: `
                                    background-color: var(--background-accent) !important;
                                    color: var(--text-on-accent) !important;
                                    margin-left: 10px;
                                `
                            }
                        });
                        
                        retryButton.addEventListener('click', async () => {
                            // Clear status container and show loading again
                            statusContainer.empty();
                            statusContainer.createEl('span', {
                                text: 'Connecting...',
                                cls: 'pixel-banner-status-value'
                            });
                            
                            // Add temporary loading spinner
                            const tempSpinner = this.createLoadingSpinner();
                            statusContainer.appendChild(tempSpinner);
                            
                            try {
                                // Try to reconnect
                                await this.plugin.verifyPixelBannerPlusCredentials();
                                await this.plugin.getPixelBannerInfo();
                                this.updateAPIStatusUI(true);
                            } catch (error) {
                                console.error('Error reconnecting:', error);
                                this.plugin.pixelBannerPlusServerOnline = false;
                                this.updateAPIStatusUI(false);
                            }
                        });
                    }
                    
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
                }
            }
        }
    }

    addStyle() {
        const style = document.createElement('style');
        style.textContent = `            
            .pixel-banner-main-container {
                display: flex;
                flex-direction: column;
                gap: 15px;
                padding: 0 16px 16px;
                max-height: 80vh;
                width: 100%;
                box-sizing: border-box;
            }
            
            .pixel-banner-section {
                display: flex;
                flex-direction: column;
                gap: 16px;
                width: 100%;
                padding: 14px;
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
                background: var(--background-modifier-error-rgb);
                border-radius: 8px;
                width: 100%;
                box-sizing: border-box;
            }
            
            .pixel-banner-message-text {
                margin: 0;
                color: var(--text-accent-hover);
                font-size: 14px;
                text-align: center;
                text-transform: uppercase;
            }
            
            .pixel-banner-settings-button:hover {
                opacity: 0.8;
            }
            
            /* Pixel Banner Plus Account styles */
            .pixel-banner-account-info {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: flex-start;
                flex-wrap: wrap;
                gap: 10px;
                width: 100%;
            }
            
            .pixel-banner-status-value {
                padding: 3px 7px;
                border-radius: 15px;
                font-size: .8em;
                letter-spacing: 1px;
                background-color: var(--background-primary);
                display: inline-flex;
                align-items: center;
            }
            
            .pixel-banner-account-button {
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
                height: 100%;
                box-sizing: border-box;
                overflow: hidden;
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
            
            .pixel-banner-retry-button {
                background-color: var(--background-accent) !important;
                color: var(--text-on-accent) !important;
                font-size: 0.8em !important;
                padding: 4px 8px !important;
                animation: pixel-banner-pulse 2s infinite;
            }
            
            @keyframes pixel-banner-pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            /* Loading spinner styles */
            @keyframes pixel-banner-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes pixel-banner-fade-in {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }
            
            @keyframes pixel-banner-scale-up-down {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
            
            @media (min-width: 400px) {
                .pixel-banner-source-button,
                .pixel-banner-customize-button {
                    padding: 16px 8px;
                }
            }
            
            @media (max-width: 590px) {
                .pixel-banner-daily-game-container {
                    flex-direction: column !important;
                    align-items: flex-start !important;
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
    }
} 