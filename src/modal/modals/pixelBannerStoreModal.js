import { Modal, Setting } from 'obsidian';
import { PIXEL_BANNER_PLUS } from '../../resources/constants';
import { handlePinIconClick } from '../../utils/handlePinIconClick';
import { TargetPositionModal } from '../modals';
import { flags } from '../../resources/flags.js';


// ------------------------------------
// -- Pixel Banner Store Modal Class --
// ------------------------------------
export class PixelBannerStoreModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.categories = [];
        this.selectedCategory = null;
        this.imageContainer = null;
        this.loadingEl = null;
        this.modalEl.addClass('pixel-banner-store-modal');
    }

    // ----------------
    // -- Open Modal --
    // ----------------
    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
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
                await this.loadCategoryImages();
            });

        } catch (error) {
            console.error('Failed to fetch categories:', error);
            selectContainer.createEl('p', {
                text: 'Failed to load categories. Please try again later.',
                cls: 'pixel-banner-store-error'
            });
        }

        // add "Next Category" button
        const nextCategoryButton = selectContainer.createEl('button', {
            text: 'Next Category',
            cls: 'pixel-banner-store-next-category'
        });
        // on click of next category button, load the next category
        nextCategoryButton.addEventListener('click', async () => {
            // debugger;
            // if already at the last category, loop back to the first category
            if (this.selectedCategoryIndex === this.categories.length) {
                this.selectedCategoryIndex = 1;
            } else {
                this.selectedCategoryIndex++;
            }
            // if this.selectedCategoryIndex is undefined or NaN, set it to 0
            if (isNaN(this.selectedCategoryIndex)) {
                this.selectedCategoryIndex = 1;
            }
            // update select box with the new category  
            this.categorySelect.selectedIndex = this.selectedCategoryIndex;
            this.selectedCategory = this.categorySelect.value;
            await this.loadCategoryImages();
        });

        // Create container for images
        this.imageContainer = contentEl.createDiv({ cls: 'pixel-banner-store-image-grid -empty' });

        this.addStyle();
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
        if (images.length > 0) {
            this.imageContainer.removeClass('-empty');
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
                            // Import and use EmojiSelectionModal here
                            const { EmojiSelectionModal } = require('../modals');
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
                                    }
                                },
                                this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon
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
                animation: pixel-banner--fade-in 1300ms ease-in-out;
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
            
            .pixel-banner-store-error {
                color: var(--text-error);
                margin-top: 8px;
            }

            .pixel-banner-store-image-grid {
                gap: 16px;
                padding: 16px;
                margin-top: 20px;
                display: flex;
                flex-direction: row;
                flex-wrap: wrap;
                align-items: normal;
                justify-content: center;
                height: 800px;
                max-height: 60vh;
                overflow-y: auto;
                border: 1px solid var(--table-border-color);
            }
            .pixel-banner-store-image-grid.-empty::after {
                content: "🪄 Select a Category above, or click the Next Category button to cycle through them. A wonderful selection of banners awaits!";
                position: relative;
                top: 40%;
                max-width: 380px;
                font-size: 1.3em;
                color: var(--text-muted);
                max-height: 80px;
                text-align: center;
                opacity: 0.7;
            }

            .pixel-banner-store-image-card {
                border: 1px solid var(--background-modifier-border);
                border-radius: 8px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px 12px 7px 12px;
                width: 224px;
                transition: transform 0.2s ease;
                cursor: pointer;
                height: max-content;
                animation: pixel-banner--fade-in 1300ms ease-in-out;
            }
            .pixel-banner-store-image-card:hover {
                transform: scale(1.05);
            }

            .pixel-banner-store-image-card img {
                max-width: 200px;
                max-height: 200px;
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
                animation: pixel-banner-store-spin 1s linear infinite;
            }

            @keyframes pixel-banner-store-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
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
            text: `${this.prompt?.toLowerCase().replace(/[^a-zA-Z0-9-_ ]/g, '').trim()}`,
            cls: 'pixel-banner-store-confirm-prompt',
            attr: {
                'style': `
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-top: -30px;
                    margin-bottom: 30px;
                    margin-left: auto;
                    margin-right: auto;
                    max-width: 450px;
                    text-align: center;
                `
            }
        });

        new Setting(contentEl)
            .setDesc(`🪙 ${this.cost} Banner Token${this.cost > 1 ? 's' : ''} (this is not a monitary transaction). Once purchased, the banner will be added to your vault.`)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText('🎉 Purchase Banner ')
                .setCta()
                .onClick(() => {
                    this.close();
                    this.onConfirm();
                }));
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