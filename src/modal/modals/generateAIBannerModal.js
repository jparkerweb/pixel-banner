import { Modal, Notice } from 'obsidian';
import { PIXEL_BANNER_PLUS } from '../../resources/constants';
import { handlePinIconClick } from '../../utils/handlePinIconClick';


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
    }

    async generateImage() {
        if (!this.imageContainer) return;
        
        // Show loading spinner
        this.imageContainer.empty();
        const loadingContainer = this.imageContainer.createDiv({ cls: 'pixel-banner-loading' });
        loadingContainer.createDiv({ cls: 'dot-pulse' });
        
        try {
            const response = await requestUrl({
                url: `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.GENERATE}`,
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
                pixelBannerPlusBalanceEl.innerText = `🪙 Remaining Banner Tokens: ${this.plugin.pixelBannerPlusBannerTokens}`;
                
                // Clear loading spinner
                this.imageContainer.empty();
                
                // Create image container
                const imgWrapper = this.imageContainer.createDiv({ cls: 'pixel-banner-generated-image-wrapper' });
                const img = imgWrapper.createEl('img', {
                    cls: 'pixel-banner-generated-image',
                    attr: {
                        src: `data:image/png;base64,${response.json.image}`
                    }
                });

                // Create controls
                const controls = this.imageContainer.createDiv({ cls: 'pixel-banner-image-controls' });
                const useAsButton = controls.createEl('button', {
                    cls: 'mod-cta',
                    text: 'Use as Banner'
                });
                useAsButton.addEventListener('click', async () => {
                    const imageUrl = `data:image/png;base64,${response.json.image}`;
                    await handlePinIconClick(imageUrl, this.plugin);
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

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Title
        contentEl.createEl('h2', { text: '✨ Generate Banner with AI' });

        // Prompt
        const promptContainer = contentEl.createDiv({ cls: 'setting-item pixel-banner-ai-control-row' });
        const promptInfo = promptContainer.createDiv({ cls: 'setting-item-info' });
        promptInfo.createDiv({ cls: 'setting-item-name', text: 'Prompt' });
        
        const promptControl = promptContainer.createDiv({ cls: 'setting-item-control' });
        const promptInput = promptControl.createEl('input', {
            type: 'text',
            cls: 'full-width-input'
        });
        promptInput.value = this.prompt;
        promptInput.addEventListener('input', (e) => {
            this.prompt = e.target.value;
        });

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
        tokenBalance.setText(`🪙 Remaining Banner Tokens: ${this.plugin.pixelBannerPlusBannerTokens}`);
        
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
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}