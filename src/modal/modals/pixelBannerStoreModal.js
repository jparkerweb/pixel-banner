import { Modal, Setting } from 'obsidian';
import { PIXEL_BANNER_PLUS } from '../../resources/constants';
import { handlePinIconClick } from '../../utils/handlePinIconClick';


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
    }

    // ----------------
    // -- Open Modal --
    // ----------------
    async onOpen() {
        this.modalEl.addClass('pixel-banner-store-modal');

        const { contentEl } = this;
        contentEl.empty();
        
        contentEl.createEl('h2', { text: '🏪 Pixel Banner Plus Store' });
        
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

        // Create container for images
        this.imageContainer = contentEl.createDiv({ cls: 'pixel-banner-store-image-grid' });

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
            const costText = image.cost === 0 ? 'FREE' : `🪙 ${image.cost} Banner Token`;
            const costEl = details.createEl('p', { text: costText, cls: 'pixel-banner-store-cost' });
            if (image.cost === 0) {
                costEl.addClass('free');
            }

            // Add click handler
            card.addEventListener('click', async () => {
                const cost = parseInt(card.getAttribute('data-image-cost'));
                
                if (cost > 0) {
                    new ConfirmPurchaseModal(this.app, cost, image.base64Image, async () => {
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
                            
                        } catch (error) {
                            console.error('Error fetching store image:', error);
                        }
                    }).open();
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
            }

            .pixel-banner-store-select-container {
                padding: 16px;
            }
            
            .pixel-banner-store-select {
                width: 100%;
                font-size: 14px;
            }
            
            .pixel-banner-store-error {
                color: var(--text-error);
                margin-top: 8px;
            }

            .pixel-banner-store-image-grid {
                gap: 16px;
                padding: 16px;
                display: flex;
                flex-direction: row;
                flex-wrap: wrap;
                align-items: normal;
                justify-content: center;
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
                padding: 8px;
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
                color: var(--text-muted);
                margin: 0;
            }
            .pixel-banner-store-cost.free {
                color: var(--text-success);
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
    constructor(app, cost, previewImage, onConfirm) {
        super(app);
        this.cost = cost;
        this.previewImage = previewImage;
        this.onConfirm = onConfirm;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        
        // Add styles first
        this.addStyle();
        
        contentEl.createEl('h2', { text: '🪙 Confirm Pixel Banner Purchase' });
        
        // Add preview image
        const imageContainer = contentEl.createDiv({ cls: 'pixel-banner-store-confirm-image' });
        imageContainer.createEl('img', {
            attr: {
                src: this.previewImage,
                alt: 'Banner Preview'
            }
        });
        
        contentEl.createEl('p', {
            text: `This banner costs 🪙 ${this.cost} Banner Token${this.cost > 1 ? 's' : ''} and will be deducted from your balance (this is not a monitary transaction). Once purchased, the banner will be added to your vault.`,
            cls: 'pixel-banner-store-confirm-text'
        });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => this.close()))
            .addButton(btn => btn
                .setButtonText('🚩 Purchase Banner ')
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