import { Modal, Notice, requestUrl } from 'obsidian';
import { PIXEL_BANNER_PLUS } from '../../resources/constants';
import { handlePinIconClick } from '../../utils/handlePinIconClick';
import { DownloadHistory } from '../../utils/downloadHistory';

// --------------------------
// -- Generate Banner Modal --
// --------------------------
export class GenerateAIBannerModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.width = 1440;
        this.height = 480;
        this.prompt = '';
        this.imageContainer = null;
        this.modalEl.addClass('pixel-banner-ai-modal');
        this.downloadHistory = new DownloadHistory();
        
        // Add pagination state
        this.currentPage = 1;
        this.totalPages = 1;
        this.itemsPerPage = 10;
        this.totalItems = 0;

        // Add styles to document
        this.addStyles();
    }

    addStyles() {
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            .ai-banner-pagination {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 10px;
                margin-top: 10px;
            }

            .ai-banner-pagination button {
                padding: 4px 8px;
                border-radius: 4px;
            }

            .ai-banner-pagination button.disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .ai-banner-pagination span {
                color: var(--text-muted);
                font-size: 0.9em;
            }

            .pixel-banner-history-container {
                transition: min-height 0.3s ease-out;
            }

            .pixel-banner-history-container.loading {
                opacity: 0.7;
                position: relative;
            }

            .pixel-banner-history-container .pixel-banner-loading {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
        `;
        document.head.appendChild(styleEl);
        this.styleEl = styleEl;
    }

    async generateImage() {
        if (!this.imageContainer) return;
        
        // Store existing image data if present
        const existingImage = this.imageContainer.querySelector('.pixel-banner-generated-image');
        const existingImageData = existingImage ? {
            base64Image: existingImage.src,
            imageId: existingImage.getAttribute('imageId')
        } : null;
        
        // Show loading dots
        this.imageContainer.empty();
        const loadingContainer = this.imageContainer.createDiv({ cls: 'pixel-banner-loading' });
        loadingContainer.createDiv({ cls: 'dot-pulse' });
        
        try {
            // If we had a previous image, refresh history before generating new one
            if (existingImageData) {
                await this.refreshHistoryContainer();
            }

            const generateUrl = new URL(PIXEL_BANNER_PLUS.ENDPOINTS.GENERATE, PIXEL_BANNER_PLUS.API_URL).toString();
            const response = await requestUrl({
                url: generateUrl,
                method: 'POST',
                headers: {
                    'X-User-Email': this.plugin.settings.pixelBannerPlusEmail,
                    'X-API-Key': this.plugin.settings.pixelBannerPlusApiKey,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: this.prompt,
                    width: this.width,
                    height: this.height
                })
            });

            if (response.status === 200 && response.json.image) {
                // update Banner Token Balance
                this.plugin.pixelBannerPlusBannerTokens = response.json.balance;
                const pixelBannerPlusBalanceEl = document.querySelector('.modal.pixel-banner-ai-modal .pixel-banner-plus-token-balance');
                const tokenCountSpan = pixelBannerPlusBalanceEl.querySelector('span') || document.createElement('span');
                tokenCountSpan.style.color = 'var(--text-accent)';
                tokenCountSpan.innerText = this.plugin.pixelBannerPlusBannerTokens;
                if (!tokenCountSpan.parentElement) {
                    pixelBannerPlusBalanceEl.innerText = '🪙 Remaining Banner Tokens: ';
                    pixelBannerPlusBalanceEl.appendChild(tokenCountSpan);
                }
                tokenCountSpan.classList.remove('token-balance-animation');
                void tokenCountSpan.offsetWidth; // Force reflow
                tokenCountSpan.classList.add('token-balance-animation');
                
                // Clear loading spinner
                this.imageContainer.empty();
                
                // Create image container
                const imgWrapper = this.imageContainer.createDiv({ cls: 'pixel-banner-generated-image-wrapper' });
                const img = imgWrapper.createEl('img', {
                    cls: 'pixel-banner-generated-image',
                    attr: {
                        src: `data:image/jpeg;base64,${response.json.image}`,
                        'imageId': response.json.imageId
                    }
                });

                // Create controls
                const controls = this.imageContainer.createDiv({ cls: 'pixel-banner-image-controls' });
                const useAsButton = controls.createEl('button', {
                    cls: 'mod-cta',
                    text: 'Download and Use as Banner'
                });
                useAsButton.addEventListener('click', async () => {
                    const imageUrl = `data:image/jpeg;base64,${response.json.image}`;
                    let filename = this.prompt?.toLowerCase().replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'banner';
                    filename = filename.replace(/\s+/g, '-').substring(0, 47);
                    const didSave = await handlePinIconClick(imageUrl, this.plugin, null, filename);
                    if (didSave === "success") {
                        const imageId = response.json.imageId;
                        this.downloadHistory.addImage(imageId);
                    }
                    this.close();
                });
            } else {
                throw new Error('Failed to generate image');
            }
        } catch (error) {
            console.error('Failed to generate image:', error);
            this.imageContainer.empty();
            const errorDiv = this.imageContainer.createDiv({ cls: 'pixel-banner-error' });
            errorDiv.setText('Failed to generate image. Please try again.');
        }
    }

    async checkDownloadHistory(img) {
        const imageId = img.getAttribute('imageid');
        if (this.downloadHistory.hasImage(imageId)) {
            return new Promise(resolve => {
                const modal = new Modal(this.app);
                modal.contentEl.createEl('h2', { text: 'Image Already Downloaded' });
                modal.contentEl.createEl('p', { text: 'You have already downloaded this image. Do you want to download it again?' });
                
                const buttonContainer = modal.contentEl.createDiv();
                buttonContainer.style.display = 'flex';
                buttonContainer.style.justifyContent = 'flex-end';
                buttonContainer.style.gap = '10px';
                
                const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
                const confirmButton = buttonContainer.createEl('button', { text: 'Download Again', cls: 'mod-cta' });
                
                cancelButton.onclick = () => {
                    modal.close();
                    resolve(false);
                };
                confirmButton.onclick = () => {
                    modal.close();
                    resolve(true);
                };
                modal.open();
            });
        }
        return true;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Title
        contentEl.createEl('h2', { text: '✨ Generate Banner with AI' });

        // Prompt
        const promptContainer = contentEl.createDiv({
            cls: 'setting-item pixel-banner-ai-control-row',
            attr: {
                style: `
                    align-items: flex-start;
                `
            }
        });
        const promptInfo = promptContainer.createDiv({ cls: 'setting-item-info' });
        promptInfo.createDiv({ cls: 'setting-item-name', text: 'Prompt' });
        
        const promptControl = promptContainer.createDiv({ cls: 'setting-item-control' });
        const promptInput = promptControl.createEl('textarea', {
            cls: 'full-width-input',
            attr: {
                id: 'ai-banner-prompt',
                rows: 4
            }
        });
        promptInput.value = this.prompt;
        promptInput.addEventListener('input', (e) => {
            this.prompt = e.target.value;
        });

        // create a div to hold the prompt inspiration buttons
        const promptInspirationContainer = promptContainer.createDiv({ cls: 'pixel-banner-prompt-inspiration-container' });

        const inspirationButton = promptInspirationContainer.createEl('button', {
            cls: 'pixel-banner-inspiration-button',
            text: '💡'
        });
        inspirationButton.addEventListener('click', () => this.getPromptInspiration());
        const inspirationFromSeedButton = promptInspirationContainer.createEl('button', {
            cls: 'pixel-banner-inspiration-from-seed-button',
            text: '🌱'
        });
        inspirationFromSeedButton.addEventListener('click', () => this.getPromptInspirationFromSeed());

        // Width
        const widthContainer = contentEl.createDiv({ cls: 'setting-item pixel-banner-ai-control-row' });
        const widthInfo = widthContainer.createDiv({ cls: 'setting-item-info' });
        widthInfo.createDiv({ cls: 'setting-item-name', text: 'Width' });
        widthInfo.createDiv({ cls: 'setting-item-description', text: this.width });
        
        const widthControl = widthContainer.createDiv({ cls: 'setting-item-control' });
        const widthSlider = widthControl.createEl('input', { type: 'range' });
        widthSlider.setAttrs({
            min: 256,
            max: 1440,
            step: 32,
            value: this.width
        });
        widthSlider.addEventListener('input', (e) => {
            this.width = parseInt(e.target.value);
            widthInfo.querySelector('.setting-item-description').textContent = this.width;
        });

        // Height
        const heightContainer = contentEl.createDiv({ cls: 'setting-item pixel-banner-ai-control-row' });
        const heightInfo = heightContainer.createDiv({ cls: 'setting-item-info' });
        heightInfo.createDiv({ cls: 'setting-item-name', text: 'Height' });
        heightInfo.createDiv({ cls: 'setting-item-description', text: this.height });
        
        const heightControl = heightContainer.createDiv({ cls: 'setting-item-control' });
        const heightSlider = heightControl.createEl('input', { type: 'range' });
        heightSlider.setAttrs({
            min: 256,
            max: 1440,
            step: 32,
            value: this.height
        });
        heightSlider.addEventListener('input', (e) => {
            this.height = parseInt(e.target.value);
            heightInfo.querySelector('.setting-item-description').textContent = this.height;
        });

        // Generate Button and Token Balance
        const buttonContainer = contentEl.createDiv({ cls: 'setting-item pixel-banner-generate-btn-container pixel-banner-ai-control-row' });
        
        const tokenBalance = buttonContainer.createDiv({ cls: 'pixel-banner-plus-token-balance' });
        const tokenCountSpan = document.createElement('span');
        tokenCountSpan.style.color = 'var(--text-accent)';
        tokenCountSpan.style.fontWeight = 'bold';
        tokenCountSpan.style.letterSpacing = '1px';
        tokenCountSpan.innerText = this.plugin.pixelBannerPlusBannerTokens;
        tokenBalance.setText('🪙 Remaining Banner Tokens: ');
        tokenBalance.appendChild(tokenCountSpan);
        tokenCountSpan.classList.add('token-balance-animation');
        
        const generateButton = buttonContainer.createEl('button', {
            cls: 'mod-cta',
            text: 'Generate Image'
        });
        generateButton.addEventListener('click', async () => {
            if (!this.prompt) {
                new Notice('Please enter a prompt');
                return;
            }
            await this.generateImage();
        });

        // Image container
        this.imageContainer = contentEl.createDiv({ cls: 'pixel-banner-image-container' });

        // History container
        contentEl.createEl('h5', {
            text: '⏳ Previous AI Generated Banners',
            attr: {
                'style': 'margin-bottom: -20px;'
            }
        });
        // History Contianer Description
        contentEl.createEl('p', {
            text: 'Click an image to download and use as a banner. These downloads are always FREE as you have already paid to generate them.',
            cls: 'pixel-banner-history-description',
            attr: {
                'style': 'font-size: 12px; color: var(--text-muted); padding-top: 10px; margin-bottom: -10px;'
            }
        });


        const historyContainer = contentEl.createDiv({ cls: 'pixel-banner-history-container' });
        
        // Add pagination container after history container
        const paginationContainer = contentEl.createDiv({ cls: 'ai-banner-pagination' });
        
        // Initial load of history with pagination
        await this.refreshHistoryContainer();
    }

    async getPromptInspiration() {
        const inspirationButton = this.contentEl.querySelector('.pixel-banner-inspiration-button');
        const originalText = inspirationButton.textContent;
        const promptTextarea = this.contentEl.querySelector('#ai-banner-prompt');
        
        try {
            inspirationButton.textContent = '⏳';
            inspirationButton.disabled = true;
            
            const inspirationUrl = new URL(PIXEL_BANNER_PLUS.ENDPOINTS.GENERATE_BANNER_IDEA, PIXEL_BANNER_PLUS.API_URL).toString();
            const response = await requestUrl({
                url: inspirationUrl,
                method: 'GET',
                headers: {
                    'X-User-Email': this.plugin.settings.pixelBannerPlusEmail,
                    'X-API-Key': this.plugin.settings.pixelBannerPlusApiKey,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 200 && response.json.bannerIdea) {
                const promptInput = this.contentEl.querySelector('#ai-banner-prompt');
                if (promptInput) {
                let promptIdea = response.json.bannerIdea?.toLowerCase();
                promptIdea = promptIdea.replace(/[^a-zA-Z0-9\s]/g, '').trim();
                    promptInput.value = promptIdea;
                    this.prompt = promptIdea;
                }
            }
        } catch (error) {
            console.error('Failed to get prompt inspiration:', error);
            new Notice('Failed to get prompt inspiration. Please try again.');
        } finally {
            inspirationButton.textContent = originalText;
            inspirationButton.disabled = false;
        }
    }
    
    async getPromptInspirationFromSeed() {
        const inspirationFromSeedButton = this.contentEl.querySelector('.pixel-banner-inspiration-from-seed-button');
        const originalText = inspirationFromSeedButton.textContent;
        const promptTextarea = this.contentEl.querySelector('#ai-banner-prompt');

        let seed = promptTextarea.value.trim();
        if (seed.length === 0) {
            new Notice('Please enter at lease one word in the Prompt box to grow your banner idea from.');
            return;
        }
        
        try {
            inspirationFromSeedButton.textContent = '⏳';
            inspirationFromSeedButton.disabled = true;
            
            const inspirationUrl = new URL(PIXEL_BANNER_PLUS.ENDPOINTS.GENERATE_BANNER_IDEA_FROM_SEED, PIXEL_BANNER_PLUS.API_URL).toString();
            const response = await requestUrl({
                url: inspirationUrl + `/${seed}`,
                method: 'GET',
                headers: {
                    'X-User-Email': this.plugin.settings.pixelBannerPlusEmail,
                    'X-API-Key': this.plugin.settings.pixelBannerPlusApiKey,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 200 && response.json.bannerIdea) {
                const promptInput = this.contentEl.querySelector('#ai-banner-prompt');
                if (promptInput) {
                let promptIdea = response.json.bannerIdea?.toLowerCase();
                promptIdea = promptIdea.replace(/[^a-zA-Z0-9\s]/g, '').trim();
                    promptInput.value = promptIdea;
                    this.prompt = promptIdea;
                }
            }
        } catch (error) {
            console.error('Failed to get prompt inspiration:', error);
            new Notice('Failed to get prompt inspiration. Please try again.');
        } finally {
            inspirationFromSeedButton.textContent = originalText;
            inspirationFromSeedButton.disabled = false;
        }
    }

    async refreshHistoryContainer() {
        const historyContainer = this.contentEl.querySelector('.pixel-banner-history-container');
        if (!historyContainer) return;

        historyContainer.empty();
        
        try {
            // Fetch total count first
            const countUrl = new URL(PIXEL_BANNER_PLUS.ENDPOINTS.HISTORY_COUNT, PIXEL_BANNER_PLUS.API_URL).toString();
            console.log('Fetching count from:', countUrl);
            
            const countResponse = await requestUrl({
                url: countUrl,
                method: 'GET',
                headers: {
                    'X-User-Email': this.plugin.settings.pixelBannerPlusEmail,
                    'X-API-Key': this.plugin.settings.pixelBannerPlusApiKey,
                    'Accept': 'application/json'
                }
            });

            console.log('Count response:', countResponse);
            
            // Parse the response data
            const countData = JSON.parse(new TextDecoder().decode(countResponse.arrayBuffer));
            console.log('Parsed count data:', countData);

            if (countResponse.status === 200 && countData.count !== undefined) {
                this.totalItems = countData.count;
                this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
                console.log('Pagination state:', {
                    totalItems: this.totalItems,
                    itemsPerPage: this.itemsPerPage,
                    totalPages: this.totalPages,
                    currentPage: this.currentPage
                });
            }

            // Fetch paginated history
            const historyUrl = new URL(`${PIXEL_BANNER_PLUS.ENDPOINTS.HISTORY_PAGE}/${this.currentPage}?limit=${this.itemsPerPage}`, PIXEL_BANNER_PLUS.API_URL).toString();
            console.log('Fetching page from:', historyUrl);
            
            const response = await requestUrl({
                url: historyUrl,
                method: 'GET',
                headers: {
                    'X-User-Email': this.plugin.settings.pixelBannerPlusEmail,
                    'X-API-Key': this.plugin.settings.pixelBannerPlusApiKey,
                    'Accept': 'application/json'
                }
            });

            console.log('Page response:', response);

            if (response.status === 200 && response.json.images) {
                response.json.images.forEach(imageData => {
                    const imgWrapper = historyContainer.createDiv({ cls: 'pixel-banner-history-image-wrapper' });
                    const img = imgWrapper.createEl('img', {
                        cls: 'pixel-banner-history-image',
                        attr: {
                            src: imageData.base64Image,
                            'imageId': imageData.imageId,
                            'filename': imageData.prompt.trim().substr(0, 47).replace(/\s/g, '-').toLowerCase(),
                        }
                    });

                    // Add prompt as tooltip
                    imgWrapper.setAttribute('aria-label', imageData.prompt);
                    imgWrapper.addClass('has-tooltip');

                    // Add click handler to use this image
                    imgWrapper.addEventListener('click', async () => {
                        const shouldDownload = await this.checkDownloadHistory(img);
                        if (!shouldDownload) return;
                        
                        const filename = img.getAttribute('filename');
                        await handlePinIconClick(imageData.base64Image, this.plugin, null, filename);
                        this.downloadHistory.addImage(img.getAttribute('imageid'));
                        this.close();
                    });
                });

                // Update pagination UI
                this.updatePaginationUI();
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
            const errorDiv = historyContainer.createDiv({ cls: 'pixel-banner-error' });
            errorDiv.setText('Failed to load history. Please try again later.');
        }
    }

    async updateHistoryContent() {
        const historyContainer = this.contentEl.querySelector('.pixel-banner-history-container');
        if (!historyContainer) return;

        // Store scroll position and container height
        const scrollPos = this.contentEl.scrollTop;
        const containerHeight = historyContainer.offsetHeight;
        
        // Set minimum height during loading to prevent jumping
        historyContainer.style.minHeight = `${containerHeight}px`;
        
        // Add loading state
        historyContainer.addClass('loading');
        historyContainer.empty();
        
        // Add loading indicator
        const loadingDiv = historyContainer.createDiv({ cls: 'pixel-banner-loading' });
        loadingDiv.createDiv({ cls: 'dot-pulse' });
        
        try {
            const historyUrl = new URL(`${PIXEL_BANNER_PLUS.ENDPOINTS.HISTORY_PAGE}/${this.currentPage}?limit=${this.itemsPerPage}`, PIXEL_BANNER_PLUS.API_URL).toString();
            
            const response = await requestUrl({
                url: historyUrl,
                method: 'GET',
                headers: {
                    'X-User-Email': this.plugin.settings.pixelBannerPlusEmail,
                    'X-API-Key': this.plugin.settings.pixelBannerPlusApiKey,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 200 && response.json.images) {
                historyContainer.empty();
                response.json.images.forEach(imageData => {
                    const imgWrapper = historyContainer.createDiv({ cls: 'pixel-banner-history-image-wrapper' });
                    const img = imgWrapper.createEl('img', {
                        cls: 'pixel-banner-history-image',
                        attr: {
                            src: imageData.base64Image,
                            'imageId': imageData.imageId,
                            'filename': imageData.prompt.trim().substr(0, 47).replace(/\s/g, '-').toLowerCase(),
                        }
                    });

                    // Add prompt as tooltip
                    imgWrapper.setAttribute('aria-label', imageData.prompt);
                    imgWrapper.addClass('has-tooltip');

                    // Add click handler to use this image
                    imgWrapper.addEventListener('click', async () => {
                        const shouldDownload = await this.checkDownloadHistory(img);
                        if (!shouldDownload) return;
                        
                        const filename = img.getAttribute('filename');
                        await handlePinIconClick(imageData.base64Image, this.plugin, null, filename);
                        this.downloadHistory.addImage(img.getAttribute('imageid'));
                        this.close();
                    });
                });
            }
            
            // Update pagination UI without scrolling
            this.updatePaginationUI();
            
            // Restore scroll position
            this.contentEl.scrollTop = scrollPos;
        } catch (error) {
            console.error('Failed to fetch history:', error);
            const errorDiv = historyContainer.createDiv({ cls: 'pixel-banner-error' });
            errorDiv.setText('Failed to load history. Please try again later.');
        } finally {
            // Remove loading state and min-height after images are loaded
            historyContainer.removeClass('loading');
            // Use a small delay to ensure smooth transition
            setTimeout(() => {
                historyContainer.style.minHeight = '';
            }, 300);
        }
    }

    updatePaginationUI() {
        let paginationContainer = this.contentEl.querySelector('.ai-banner-pagination');
        if (!paginationContainer) {
            paginationContainer = this.contentEl.createDiv({ cls: 'ai-banner-pagination' });
        }
        paginationContainer.empty();

        // First page button
        const firstButton = paginationContainer.createEl('button', {
            text: '«'
        });
        firstButton.disabled = this.currentPage <= 1;
        if (firstButton.disabled) {
            firstButton.addClass('disabled');
        }

        // Previous page button
        const prevButton = paginationContainer.createEl('button', {
            text: '‹'
        });
        prevButton.disabled = this.currentPage <= 1;
        if (prevButton.disabled) {
            prevButton.addClass('disabled');
        }
        
        const pageInfo = paginationContainer.createSpan({
            text: `Page ${this.currentPage} of ${this.totalPages}`
        });
        
        // Next page button
        const nextButton = paginationContainer.createEl('button', {
            text: '›'
        });
        nextButton.disabled = this.currentPage >= this.totalPages;
        if (nextButton.disabled) {
            nextButton.addClass('disabled');
        }

        // Last page button
        const lastButton = paginationContainer.createEl('button', {
            text: '»'
        });
        lastButton.disabled = this.currentPage >= this.totalPages;
        if (lastButton.disabled) {
            lastButton.addClass('disabled');
        }

        firstButton.addEventListener('click', async (e) => {
            if (this.currentPage > 1) {
                this.currentPage = 1;
                await this.updateHistoryContent();
            }
        });

        prevButton.addEventListener('click', async (e) => {
            if (this.currentPage > 1) {
                this.currentPage--;
                await this.updateHistoryContent();
            }
        });

        nextButton.addEventListener('click', async (e) => {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
                await this.updateHistoryContent();
            }
        });

        lastButton.addEventListener('click', async (e) => {
            if (this.currentPage < this.totalPages) {
                this.currentPage = this.totalPages;
                await this.updateHistoryContent();
            }
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        // Remove styles when modal closes
        if (this.styleEl) {
            this.styleEl.remove();
        }
    }
}