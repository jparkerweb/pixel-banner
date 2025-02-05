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
    }

    async generateImage() {
        if (!this.imageContainer) return;
        
        // Show loading dots
        this.imageContainer.empty();
        const loadingContainer = this.imageContainer.createDiv({ cls: 'pixel-banner-loading' });
        loadingContainer.createDiv({ cls: 'dot-pulse' });
        
        try {
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
                        src: `data:image/png;base64,${response.json.image}`,
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
                    const imageUrl = `data:image/png;base64,${response.json.image}`;
                    let filename = this.prompt?.toLowerCase().replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'banner';
                    filename = filename.replace(/\s+/g, '-').substring(0, 47);
                    debugger;
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

        const inspirationButton = promptContainer.createEl('button', {
            cls: 'pixel-banner-inspiration-button',
            text: '💡'
        });
        inspirationButton.addEventListener('click', () => this.getPromptInspiration());

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
            text: 'Recently Generated',
            attr: {
                'style': 'margin-bottom: -20px;'
            }
        });
        const historyContainer = contentEl.createDiv({ cls: 'pixel-banner-history-container' });
        
        try {
            const historyUrl = new URL(PIXEL_BANNER_PLUS.ENDPOINTS.HISTORY, PIXEL_BANNER_PLUS.API_URL).toString() + '?limit=10';
            
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
        } catch (error) {
            console.error('Failed to fetch history:', error);
            const errorDiv = historyContainer.createDiv({ cls: 'pixel-banner-error' });
            errorDiv.setText('Failed to load history. Please try again later.');
        }
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

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}