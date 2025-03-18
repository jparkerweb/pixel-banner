import { Modal, Setting, Notice } from 'obsidian';
import { PIXEL_BANNER_PLUS } from '../../resources/constants';
import { handlePinIconClick } from '../../utils/handlePinIconClick';
import { TargetPositionModal, EmojiSelectionModal } from '../modals';
import { flags } from '../../resources/flags.js';
import { SelectPixelBannerModal } from './selectPixelBannerModal';


// ------------------------------------
// -- Pixel Banner Store Modal Class --
// ------------------------------------
export class PixelBannerStoreModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.categories = [];
        this.selectedCategory = null;
        this.selectedCategoryIndex = 0;
        this.imageContainer = null;
        this.loadingEl = null;
        this.modalEl.addClass('pixel-banner-store-modal');
        this.isLoading = true; // Track loading state
    }

    // ----------------
    // -- Open Modal --
    // ----------------
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
                text: 'Failed to load store. Please try again later.',
                cls: 'pixel-banner-store-error'
            });
        });
    }
    
    // Show loading spinner
    showLoadingSpinner(container) {
        this.isLoading = true;
        this.loadingOverlay = container.createDiv({ 
            cls: 'pixel-banner-store-loading-overlay',
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
                `
            }
        });
        
        this.loadingOverlay.createDiv({
            cls: 'pixel-banner-store-spinner',
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
        const { contentEl } = this;
        
        contentEl.createEl('h3', { text: '🏪 Pixel Banner Plus Store', cls: 'margin-top-0' });
        contentEl.createEl('p', {
            text: `Browse the Pixel Banner Plus Store to find the perfect banner for your needs. Banner Token prices are displayed on each card below (FREE or 1 Banner Token). Previous purchases will be listed as FREE.`,
            attr: {
                'style': 'font-size: 12px; color: var(--text-muted);'
            }
        });
        
        // Create select container
        const selectContainer = contentEl.createDiv({ cls: 'pixel-banner-store-select-container' });
        
        // Create and populate select element
        this.categorySelect = selectContainer.createEl('select', { 
            cls: 'pixel-banner-store-select',
            attr: {
                style: `
                    display: ${this.plugin.pixelBannerPlusEnabled ? 'block' : 'none'};
                `
            }
        });

        // Add default option
        const defaultOption = this.categorySelect.createEl('option', {
            text: 'Select a category...',
            value: ''
        });
        defaultOption.disabled = true;
        defaultOption.selected = true;

        try {
            const response = await fetch(
                `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.STORE_CATEGORIES}`, 
                {
                    headers: {
                        'x-user-email': this.plugin.settings.pixelBannerPlusEmail,
                        'x-api-key': this.plugin.settings.pixelBannerPlusApiKey,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.categories = Array.isArray(data) ? data : data.categories || [];
            
            if (this.categories.length === 0) {
                throw new Error('No categories found');
            }

            // Populate select with categories
            this.categories.forEach(category => {
                this.categorySelect.createEl('option', {
                    value: category.id,
                    text: category.category
                });
            });

            // Add change event listener
            this.categorySelect.addEventListener('change', async (e) => {
                this.selectedCategory = e.target.value;
                this.selectedCategoryIndex = e.target.selectedIndex;
                await this.loadCategoryImages();
            });

        } catch (error) {
            console.error('Failed to fetch categories:', error);
            selectContainer.createEl('p', {
                text: 'Failed to load categories. Please try again later.',
                cls: 'pixel-banner-store-error',
                attr: {
                    style: `
                        display: ${this.plugin.pixelBannerPlusEnabled ? 'block' : 'none'};
                    `
                }
            });
        }

        // add "Next Category" button
        const nextCategoryButton = selectContainer.createEl('button', {
            text: 'Next Category',
            cls: 'pixel-banner-store-next-category',
            attr: {
                style: `
                    display: ${this.plugin.pixelBannerPlusEnabled ? 'inline-flex' : 'none'};
                `
            }
        });
        // on click of next category button, load the next category
        nextCategoryButton.addEventListener('click', async () => {
            // if already at the last category, loop back to the first category
            if (this.selectedCategoryIndex >= this.categories.length) {
                this.selectedCategoryIndex = 1;
            } else {
                this.selectedCategoryIndex++;
            }
            // update select box with the new category  
            this.categorySelect.selectedIndex = this.selectedCategoryIndex;
            this.selectedCategory = this.categorySelect.value;
            await this.loadCategoryImages();
        });

        // add "Back to Main Menu" button
        const backToMainButton = selectContainer.createEl('button', {
            text: '⇠ Main Menu',
            cls: 'pixel-banner-store-back-to-main'
        });
        
        // on click of back to main menu button, close this modal and open the Pixel Banner Menu modal
        backToMainButton.addEventListener('click', () => {
            this.close();
            new SelectPixelBannerModal(this.app, this.plugin).open();
        });

        // Create container for images
        if (this.plugin.pixelBannerPlusEnabled) {
            this.imageContainer = contentEl.createDiv({ cls: 'pixel-banner-store-image-grid -empty' });
            // add an async delay that will select the first option in the category select element
            setTimeout(async () => {
                // abort if the category select element no longer has the first option selected (the user may have changed the category)
                if (this.categorySelect.selectedIndex === 0) {
                    this.categorySelect.selectedIndex = 1;
                    this.selectedCategoryIndex = 1;
                    this.selectedCategory = this.categorySelect.value;
                    await this.loadCategoryImages();
                }
            }, 50);
        } else {
            this.imageContainer = contentEl.createDiv({ cls: 'pixel-banner-store-image-grid -not-connected' });
        }

        // Pixel Banner Plus Account Status Section
        const pixelBannerPlusAccountStatus = contentEl.createDiv({
            cls: 'pixel-banner-store-account-status',
            attr: {
                'style': `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    justify-content: flex-start;
                    margin-bottom: -10px;
                    margin-top: 5px;
                    font-size: .9em;
                `
            }
        });
        // Connection Status        
        const isConnected = this.plugin.pixelBannerPlusEnabled;
        const statusText = isConnected ? '✅ Connected' : '❌ Not Connected';
        const statusBorderColor = isConnected ? '#20bf6b' : '#FF0000';
        
        const connectionStatusEl = pixelBannerPlusAccountStatus.createEl('span', {
            text: statusText,
            cls: 'pixel-banner-status-value',
            attr: {
                style: `border: 1px dotted ${statusBorderColor};`
            }
        });
        
        // Available Tokens        
        const tokenCount = this.plugin.pixelBannerPlusBannerTokens !== undefined ? 
            `🪙 ${this.plugin.pixelBannerPlusBannerTokens.toString()} Tokens` : '❓ Unknown';
        
        const tokenCountEl = pixelBannerPlusAccountStatus.createEl('span', {
            text: tokenCount,
            cls: 'pixel-banner-status-value',
            attr: {
                style: `
                    border: 1px dotted #F3B93B;
                    display: ${this.plugin.pixelBannerPlusEnabled ? 'inline-flex' : 'none'};
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
        connectionStatusEl.addEventListener('click', openPlusSettings);
        tokenCountEl.addEventListener('click', openPlusSettings);            
        
        // Show Buy Tokens button if connected
        if (isConnected && this.plugin.pixelBannerPlusBannerTokens === 0) {
            const buyTokensButton = pixelBannerPlusAccountStatus.createEl('button', {
                cls: 'pixel-banner-account-button pixel-banner-buy-tokens-button',
                text: '💵 Buy More Tokens'
            });
            
            buyTokensButton.addEventListener('click', (event) => {
                event.preventDefault();
                window.open(PIXEL_BANNER_PLUS.SHOP_URL, '_blank');
            });
        } 
        // Show Signup button if not connected
        else if (!isConnected) {
            const signupButton = pixelBannerPlusAccountStatus.createEl('button', {
                cls: 'pixel-banner-account-button pixel-banner-signup-button',
                text: '🚩 Signup for Free!'
            });
            
            signupButton.addEventListener('click', (event) => {
                event.preventDefault();
                const signupUrl = PIXEL_BANNER_PLUS.API_URL + PIXEL_BANNER_PLUS.ENDPOINTS.SIGNUP;
                window.open(signupUrl, '_blank');
            });
        }

        this.addStyle();
        
        // Hide loading spinner when everything is loaded
        this.hideLoadingSpinner();
    }


    // --------------------------
    // -- Load Category Images --
    // --------------------------
    async loadCategoryImages() {
        if (!this.selectedCategory) return;

        // Clear previous images
        this.imageContainer.empty();

        // Show loading spinner
        this.loadingEl = this.imageContainer.createDiv({ cls: 'pixel-banner-store-loading' });
        this.loadingEl.innerHTML = `<div class="pixel-banner-store-spinner"></div>`;

        try {
            const response = await fetch(
                `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.STORE_CATEGORY_IMAGES}?categoryId=${this.selectedCategory}`, 
                {
                    headers: {
                        'x-user-email': this.plugin.settings.pixelBannerPlusEmail,
                        'x-api-key': this.plugin.settings.pixelBannerPlusApiKey,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const images = await response.json();
            this.displayImages(images);
        } catch (error) {
            console.error('Failed to fetch images:', error);
            this.imageContainer.empty();
            this.imageContainer.createEl('p', {
                text: 'Failed to load images. Please try again.',
                cls: 'pixel-banner-store-error'
            });
        }
    }


    // --------------------
    // -- Display Images --
    // --------------------
    displayImages(images) {
        // Remove loading spinner if it exists
        if (this.loadingEl) {
            this.loadingEl.remove();
            this.loadingEl = null;
        }
        
        if (images.length > 0) {
            this.imageContainer.removeClass('-empty');
            this.imageContainer.removeClass('-not-connected');
        }

        const container = this.imageContainer;
        container.empty();
        
        images.forEach(image => {
            const card = container.createEl('div', {
                cls: 'pixel-banner-store-image-card',
                attr: {
                    'data-image-id': image.id,
                    'data-image-cost': image.cost
                }
            });

            const imgEl = card.createEl('img', {
                attr: {
                    src: image.base64Image,
                    alt: image.prompt
                }
            });

            const details = card.createDiv({ cls: 'pixel-banner-store-image-details' });
            const truncatedPrompt = image.prompt.length > 85 ? image.prompt.slice(0, 85) + '...' : image.prompt;
            details.createEl('p', { text: truncatedPrompt, cls: 'pixel-banner-store-prompt' });
            const costText = image.cost === 0 ? 'FREE' : `🪙`;
            const costEl = details.createEl('p', { text: costText, cls: 'pixel-banner-store-cost' });
            if (image.cost === 0) {
                costEl.addClass('free');
            }

            // Add click handler
            card.addEventListener('click', async () => {
                const cost = parseInt(card.getAttribute('data-image-cost'));
                
                if (cost > 0) {
                    new ConfirmPurchaseModal(this.app, cost, image.prompt, image.base64Image, async () => {
                        try {
                            const response = await fetch(`${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.STORE_IMAGE_BY_ID}?bannerId=${image.id}`, {
                                headers: {
                                    'x-user-email': this.plugin.settings.pixelBannerPlusEmail,
                                    'x-api-key': this.plugin.settings.pixelBannerPlusApiKey,
                                    'Accept': 'application/json'
                                }
                            });

                            if (!response.ok) {
                                throw new Error('Failed to fetch image');
                            }

                            // verify account
                            await this.plugin.verifyPixelBannerPlusCredentials();

                            // update the image card with a cost of 0
                            card.setAttribute('data-image-cost', '0');
                            card.querySelector('.pixel-banner-store-cost').classList.add('free');
                            card.querySelector('.pixel-banner-store-cost').textContent = 'FREE';

                            const data = await response.json();
                            let filename = image.prompt?.toLowerCase().replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'banner';
                            filename = filename.replace(/\s+/g, '-').substring(0, 47);
                            await handlePinIconClick(data.base64Image, this.plugin, null, filename);
                            this.close();
                            
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
                                                frontmatter[iconField] = emoji;
                                            });
                                            
                                            // Check if we should open the targeting modal after setting the icon
                                            if (this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                                                // Add a small delay to ensure frontmatter is updated
                                                await new Promise(resolve => setTimeout(resolve, 200));
                                                new TargetPositionModal(this.app, this.plugin).open();
                                            }
                                        }
                                    },
                                    true // Skip the targeting modal in EmojiSelectionModal since we handle it in the callback
                                ).open();
                            } 
                            // If not opening the banner icon modal, check if we should open the targeting modal
                            else if (this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                                new TargetPositionModal(this.app, this.plugin).open();
                            }
                        } catch (error) {
                            console.error('Error purchasing image:', error);
                            new Notice('Failed to purchase image. Please try again.');
                        }
                    }, this.plugin).open();
                } else {
                    try {
                        const response = await fetch(`${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.STORE_IMAGE_BY_ID}?bannerId=${image.id}`, {
                            headers: {
                                'x-user-email': this.plugin.settings.pixelBannerPlusEmail,
                                'x-api-key': this.plugin.settings.pixelBannerPlusApiKey,
                                'Accept': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            throw new Error('Failed to fetch image');
                        }

                        const data = await response.json();
                        let filename = image.prompt?.toLowerCase().replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'banner';
                        filename = filename.replace(/\s+/g, '-').substring(0, 47);
                        await handlePinIconClick(data.base64Image, this.plugin, null, filename);
                        this.close();
                        
                        // Check if we should open the banner icon modal after selecting a banner
                        if (this.plugin.settings.openBannerIconModalAfterSelectingBanner) {
                            // Use the imported EmojiSelectionModal
                            new EmojiSelectionModal(
                                this.app, 
                                this.plugin,
                                async (emoji) => {
                                    const activeFile = this.app.workspace.getActiveFile();
                                    if (activeFile) {
                                        await this.plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                                            const iconField = this.plugin.settings.customBannerIconField[0];
                                            frontmatter[iconField] = emoji;
                                        });
                                        
                                        // Check if we should open the targeting modal after setting the icon
                                        if (this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                                            // Add a small delay to ensure frontmatter is updated
                                            await new Promise(resolve => setTimeout(resolve, 200));
                                            new TargetPositionModal(this.app, this.plugin).open();
                                        }
                                    }
                                },
                                true // Skip the targeting modal in EmojiSelectionModal since we handle it in the callback
                            ).open();
                        } 
                        // If not opening the banner icon modal, check if we should open the targeting modal
                        else if (this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                            new TargetPositionModal(this.app, this.plugin).open();
                        }
                        
                    } catch (error) {
                        console.error('Error fetching store image:', error);
                    }
                }
            });
        });
    }

    addStyle() {
        const style = document.createElement('style');
        style.textContent = `
            .pixel-banner-store-modal {
                top: unset !important;
                width: var(--dialog-max-width);
                max-width: 1100px;
                animation: pixel-banner-fade-in 1300ms ease-in-out;
            }

            .pixel-banner-store-select-container {
                display: flex;
                flex-direction: row;
                gap: 10px;
                align-items: center;
                justify-content: end;
            }
            
            .pixel-banner-store-select {
                width: max-content;
                font-size: 14px;
            }

            .pixel-banner-store-next-category {
                font-size: 14px;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                background-color: var(--interactive-accent) !important;
                color: var(--text-on-accent) !important;
                border: none;
            }
            .pixel-banner-store-next-category:hover {
                background-color: var(--interactive-accent-hover) !important;
            }
            
            .pixel-banner-store-back-to-main {
                font-size: 14px;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                border: none;
            }
            .pixel-banner-store-back-to-main:hover {
                background-color: var(--interactive-accent) !important;
            }
            
            .pixel-banner-store-error {
                color: var(--text-accent);
                margin-top: 8px;
            }

            .pixel-banner-store-image-grid {
                gap: 18px;
                padding: 22px;
                margin-top: 20px;
                display: flex;
                flex-direction: row;
                flex-wrap: wrap;
                align-items: normal;
                justify-content: center;
                height: 800px;
                max-height: 60vh;
                overflow-y: auto;
                overflow-x: hidden;
                border: 1px solid var(--table-border-color);
            }
            .pixel-banner-store-image-grid.-empty::after {
                display: none;
                // content: "🪄 Select a Category above, or click the Next Category button to cycle through them. A wonderful selection of banners awaits! The '❇️ Featured' category is updated often, and will be automatically displayed shortly if a selection is not made.";
                // position: relative;
                // top: 40%;
                // max-width: 380px;
                // font-size: 1.3em;
                // color: var(--text-muted);
                // max-height: 80px;
                // text-align: center;
                // opacity: 0.7;
            }
            .pixel-banner-store-image-grid.-not-connected::after {
                content: "⚡ Please connect your Pixel Banner Plus account to the plugin to access the store. If you don't have an account, you can sign up for free using the button below! No payment information is required, and you will get access to a wide range of FREE banners.";
                position: relative;
                top: 40%;
                max-width: 458px;
                font-size: 1.3em;
                color: var(--text-muted);
                max-height: 80px;
                text-align: center;
                opacity: 0.7;
            }

            .pixel-banner-store-image-card {
                border: 5px solid transparent;
                border-radius: 8px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px 12px 7px 12px;
                width: 324px;
                transition: transform 0.2s ease;
                cursor: pointer;
                height: max-content;
                animation: pixel-banner-fade-in 1300ms ease-in-out;
                background: var(--background-secondary);
            }
            .pixel-banner-store-image-card:hover {
                transform: scale(1.1);
                border-color: var(--modal-border-color);
                z-index: 2;
            }

            .pixel-banner-store-image-card img {
                max-width: 300px;
                max-height: 300px;
                object-fit: cover;
            }

            .pixel-banner-store-image-details {
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                padding: 8px 0;
                width: 100%;
            }

            .pixel-banner-store-prompt {
                font-size: 12px;
                margin: 0 0 4px;
                text-transform: lowercase;
                opacity: 0.8;
            }

            .pixel-banner-store-cost {
                font-size: 12px;
                color: var(--text-accent);
                margin: 0;
                text-align: right;
                white-space: nowrap;
                margin-left: 5px;
            }
            .pixel-banner-store-cost.free {
                color: var(--text-success);
                font-weight: bold;
            }

            .pixel-banner-store-loading {
                display: flex;
                justify-content: center;
                padding: 32px;
            }

            .pixel-banner-store-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid var(--background-modifier-border);
                border-top: 4px solid var(--text-accent);
                border-radius: 50%;
                animation: pixel-banner-spin 1s linear infinite;
            }

            .pixel-banner-store-loading-overlay {
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

            .pixel-banner-status-value {
                padding: 3px 7px;
                border-radius: 0px;
                font-size: .8em;
                letter-spacing: 1px;
                background-color: var(--background-primary);
                display: inline-flex;
                align-items: center;
                cursor: help;
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
        `;
        document.head.appendChild(style);
        this.style = style;
    }

    onClose() {
        this.contentEl.empty();
        if (this.style) {
            this.style.remove();
        }
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
        }
    }
}

// Add this class inside the file but outside the PixelBannerStoreModal class
class ConfirmPurchaseModal extends Modal {
    constructor(app, cost, prompt, previewImage, onConfirm, plugin) {
        super(app);
        this.cost = cost;
        this.prompt = prompt;
        this.previewImage = previewImage;
        this.onConfirm = onConfirm;
        this.plugin = plugin;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        
        // Add styles first
        this.addStyle();
        

        const titleContainer = contentEl.createEl('h3', {
            cls: 'margin-top-0 pixel-banner-selector-title'
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
        titleContainer.appendChild(document.createTextNode('Confirm Pixel Banner Purchase'));
        
        // Add preview image
        const imageContainer = contentEl.createDiv({ cls: 'pixel-banner-store-confirm-image' });
        imageContainer.createEl('img', {
            attr: {
                src: this.previewImage,
                alt: 'Banner Preview'
            }
        });

        contentEl.createEl('p', {
            text: `"${this.prompt?.toLowerCase().replace(/[^a-zA-Z0-9-_ ]/g, '').trim()}"`,
            cls: 'pixel-banner-store-confirm-prompt',
            attr: {
                'style': `
                    margin-top: -30px;
                    margin-bottom: 30px;
                    margin-left: auto;
                    margin-right: auto;
                    max-width: 320px;
                    text-align: center;
                    font-size: .9em;
                    font-style: italic;
                `
            }
        });

        // Button container
        const buttonContainer = contentEl.createDiv({
            cls: 'setting-item-control',
            attr: {
                style: `
                    display: flex; 
                    justify-content: flex-end; 
                    gap: 8px;
                    margin-top: 10px;
                    align-items: flex-start;
                `
            }
        });

        // Purchase explanation text
        const explanationText = buttonContainer.createEl('p', {
            text: `🪙 ${this.cost} Banner Token${this.cost > 1 ? 's' : ''} (this is not a monitary transaction). Once purchased, the banner will be added to your vault, and will be free to download while listed in the store.`,
            cls: 'setting-item-description',
            attr: {
                style: `
                    text-align: left;
                    margin: 0 20px 0 0;
                    opacity: .8;
                    font-size: .8em;
                `
            }
        });

        // Confirm button
        const confirmButton = buttonContainer.createEl('button', {
            text: '🪙 Purchase',
            cls: 'mod-cta radial-pulse-animation'
        });
        confirmButton.addEventListener('click', () => {
            this.close();
            this.onConfirm();
        });

        // Cancel button
        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        cancelButton.addEventListener('click', () => this.close());
    }
        

    // Add styles for the preview image
    addStyle() {
        const style = document.createElement('style');
        style.textContent = `
            .pixel-banner-store-confirm-image {
                display: flex;
                justify-content: center;
                margin: 40px 10px;
            }
            
            .pixel-banner-store-confirm-image img {
                max-width: 100%;
                height: auto;
                border-radius: 4px;
            }
        `;
        document.head.appendChild(style);
        this.style = style;
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
        if (this.style) {
            this.style.remove();
        }
    }
}