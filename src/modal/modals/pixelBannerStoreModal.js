import { Modal } from 'obsidian';
import { PIXEL_BANNER_PLUS } from '../../resources/constants';


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
        this.imageContainer.empty();
        
        images.forEach(img => {
            const imageCard = this.imageContainer.createDiv({ cls: 'pixel-banner-store-image-card' });
            
            const image = imageCard.createEl('img', {
                attr: {
                    src: img.base64Image,
                    alt: img.prompt
                }
            });

            const details = imageCard.createDiv({ cls: 'pixel-banner-store-image-details' });
            const truncatedPrompt = img.prompt.length > 85 ? img.prompt.slice(0, 85) + '...' : img.prompt;
            details.createEl('p', { text: truncatedPrompt, cls: 'pixel-banner-store-prompt' });
            const costText = img.cost === 0 ? 'FREE' : `🪙 ${img.cost} Banner Token`;
            const costEl = details.createEl('p', { text: costText, cls: 'pixel-banner-store-cost' });
            if (img.cost === 0) {
                costEl.addClass('free');
            }
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
            }

            .pixel-banner-store-image-card img {
                width: 200px;
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