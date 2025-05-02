import { Modal, Notice, requestUrl, MarkdownView } from 'obsidian';
import { PIXEL_BANNER_PLUS } from '../../resources/constants';
import { handlePinIconClick } from '../../utils/handlePinIconClick';
import { DownloadHistory } from '../../utils/downloadHistory';
import { TargetPositionModal, EmojiSelectionModal } from '../modals';
import { SelectPixelBannerModal } from './selectPixelBannerModal';

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
        this.isLoading = true; // Track loading state
        this.provider = 'TOGETHER'; // Default provider
        this.resolution = '1360 × 768 (Landscape)'; // Default resolution
        
        // Add pagination state
        this.currentPage = 1;
        this.totalPages = 1;
        this.itemsPerPage = 9;
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
                position: sticky;
                bottom: -20px;
                background-color: var(--modal-background);
                padding: 10px 20px;
                border-radius: 7px;
                z-index: 2;
            }

            .ai-banner-pagination button {
                padding: 4px 8px;
                border-radius: 4px;
            }

            .ai-banner-pagination button:hover:not(.disabled) {
                background-color: var(--interactive-accent-hover);
                cursor: pointer;
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
            
            .pixel-banner-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid var(--background-modifier-border);
                border-top: 4px solid var(--text-accent);
                border-radius: 50%;
                animation: pixel-banner-spin 1s linear infinite;
            }
        `;
        document.head.appendChild(styleEl);
        this.styleEl = styleEl;
    }
    
    // Show loading spinner
    showLoadingSpinner(container) {
        this.isLoading = true;
        this.loadingOverlay = container.createDiv({ 
            cls: 'pixel-banner-loading-overlay'
        });
        
        this.loadingOverlay.createDiv({
            cls: 'pixel-banner-spinner'
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
                    'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: this.prompt,
                    width: this.width,
                    height: this.height,
                    provider: this.provider,
                    resolution: this.resolution
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
                    pixelBannerPlusBalanceEl.innerText = '🪙 Remaining Tokens: ';
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
                    cls: 'mod-cta cursor-pointer',
                    text: '🏷️ Download and Use as Banner'
                });
                // Add click handler to both the image and the use button
                const handleUseImage = async () => {
                    const imageUrl = `data:image/jpeg;base64,${response.json.image}`;
                    let filename = this.prompt?.toLowerCase().replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'banner';
                    filename = filename.replace(/\s+/g, '-').substring(0, 47);
                    const savedPath = await handlePinIconClick(imageUrl, this.plugin, null, filename);
                    this.downloadHistory.addImage(response.json.imageId);
                    this.close();
                    
                    // Get the active file
                    const activeFile = this.plugin.app.workspace.getActiveFile();
                    if (!activeFile || !savedPath) return;
                    
                    // Open the target position modal after setting the banner
                    await this.plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                        const bannerField = this.plugin.settings.customBannerField[0];
                        frontmatter[bannerField] = `[[${savedPath}]]`;
                    });

                    // Check if we should open the targeting modal
                    if (this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                        new TargetPositionModal(this.app, this.plugin).open();
                    }
                };

                img.addEventListener('click', handleUseImage);
                useAsButton.addEventListener('click', handleUseImage);
            } else {
                throw new Error('Failed to generate image');
            }
        } catch (error) {
            console.error('Failed to generate image:', error);
            this.imageContainer.empty();
            const errorDiv = this.imageContainer.createDiv({ cls: 'pixel-banner-error' });
            errorDiv.innerHTML = `
                <p>😭 Failed to generate image, please try again.</p>
                <p style="font-size: 0.8em; color: var(--text-muted);">Note that NSFW images are not allowed. You were not charged for this request.</p>
            `;
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

    async confirmDelete(prompt) {
        return new Promise(resolve => {
            let imgDescription = prompt;
            imgDescription = imgDescription.replace(/\s/g, '-').toLowerCase();
            imgDescription = imgDescription.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
            if (imgDescription.length > 47) {
                imgDescription = imgDescription.substring(0, 47);
                imgDescription = imgDescription + '...';
            }

            const modal = new Modal(this.app);
            modal.contentEl.createEl('h2', { text: 'Delete Image', cls: 'margin-top-0' });
            const deletePrompt = modal.contentEl.createEl('p', { text: `Please confirm you want to delete "IMGDESCRIPTION" from your AI Generated Banner History. This will not delete any images you have previously downloaded to your vault.` });
            deletePrompt.innerHTML = deletePrompt.innerHTML.replace('IMGDESCRIPTION', `<span style="color: var(--text-accent);">${imgDescription}</span>`);
            
            const buttonContainer = modal.contentEl.createDiv();
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'flex-end';
            buttonContainer.style.gap = '10px';
            
            const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
            const deleteButton = buttonContainer.createEl('button', { 
                text: 'Delete',
                cls: 'mod-warning'
            });
            
            cancelButton.onclick = () => {
                modal.close();
                resolve(false);
            };
            deleteButton.onclick = () => {
                modal.close();
                resolve(true);
            };
            modal.open();
        });
    }

    async deleteImage(imageId, imgDescription) {
        const confirmed = await this.confirmDelete(imgDescription);
        if (!confirmed) return;

        const deleteUrl = new URL(PIXEL_BANNER_PLUS.ENDPOINTS.HISTORY_DELETE, PIXEL_BANNER_PLUS.API_URL).toString();
        const response = await requestUrl({
            url: `${deleteUrl}/${imageId}`,
            method: 'DELETE',
            headers: {
                'X-User-Email': this.plugin.settings.pixelBannerPlusEmail,
                'X-API-Key': this.plugin.settings.pixelBannerPlusApiKey,
                'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                'Accept': 'application/json'
            }
        });
        if (response.status === 200) {
            new Notice('Image deleted successfully');
            this.refreshHistoryContainer();
        } else {
            new Notice('Failed to delete image');
        }
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
                text: 'Failed to load AI banner generator. Please try again later.',
                cls: 'pixel-banner-error'
            });
        });
    }
    
    // Initialize modal content
    async initializeModal() {
        await this.plugin.verifyPixelBannerPlusCredentials();
        const { contentEl } = this;

        // add style tag
        const styleTag = contentEl.createEl('style', {
            text: `
                /* AI Banner Generation Modal */
                .pixel-banner-ai-modal {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    padding: 20px;
                    width: var(--dialog-max-width);
                    top: unset !important;
                    overflow-x: hidden;
                }

                .pixel-banner-ai-modal .modal-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .pixel-banner-ai-modal .setting-item {
                    border: none;
                    padding: 0.75rem 0;
                }

                .pixel-banner-ai-modal .full-width-input {
                    width: 100%;
                }

                .pixel-banner-ai-modal input[type="range"] {
                    width: 100%;
                }

                .pixel-banner-ai-modal .pixel-banner-ai-control-row {
                    display: flex;
                    flex-direction: row;
                    gap: 5px;
                    justify-content: space-between;
                    max-width: 500px;
                    width: 100%;
                }

                .pixel-banner-generate-btn-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-top: 1rem;
                    gap: 1rem;
                }

                .pixel-banner-token-balance {
                    color: var(--text-muted);
                    font-size: 0.9em;
                }

                .pixel-banner-generate-btn-container button {
                    min-width: 150px;
                }

                .pixel-banner-image-controls {
                    margin-top: 10px;
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                }

                .pixel-banner-generated-image-wrapper {
                    width: 100%;
                    border-radius: 8px;
                    overflow: hidden;
                    background: var(--background-secondary);

                }

                .pixel-banner-generated-image {
                    width: inherit;
                    height: auto;
                    display: block;
                    animation: pixel-banner-fade-in 1300ms ease-in-out;
                    margin: 0 auto;
                }

                /* History container styles */
                .pixel-banner-history-container {
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    justify-content: center;
                    gap: 1rem;
                    margin-top: 2rem;
                    padding: 1rem;
                    border-top: 1px solid var(--background-modifier-border);
                    place-items: start center; /* Ensures the grid is centered while items align naturally */
                }

                /* Image wrapper with masonry alignment */
                .pixel-banner-history-image-wrapper {
                    position: relative;
                    cursor: pointer;
                    border-radius: 8px;
                    border: 5px solid transparent;
                    overflow: hidden;
                    transition: transform 0.2s ease;
                    display: flex;
                    justify-content: center; /* Centers image inside the wrapper */
                    align-items: center;
                    max-width: 300px;
                    max-height: 300px;
                    animation: pixel-banner-fade-in 1300ms ease-in-out;
                }

                /* Hover effect */
                .pixel-banner-history-image-wrapper:hover {
                    transform: scale(1.25);
                    z-index: 2;
                    border-color: var(--modal-border-color) !important;
                }

                /* Ensuring images keep aspect ratio */
                .pixel-banner-history-image {
                    width: 100%;
                    height: auto; /* Maintain height for masonry */
                    object-fit: cover;
                    border-radius: 8px;
                }

                /* Tooltip styles */
                .pixel-banner-history-image-wrapper.has-tooltip {
                    position: relative;
                }

                /* Tooltip on hover */
                .pixel-banner-history-image-wrapper.has-tooltip:hover::after {
                    content: attr(aria-label);
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--background-primary);
                    color: var(--text-normal);
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    white-space: nowrap;
                    z-index: 100;
                    box-shadow: var(--shadow-s);
                    margin-bottom: 4px;
                }

                /* Error message styling */
                .pixel-banner-history-container .pixel-banner-error {
                    color: var(--text-accent);
                    font-size: 12px;
                    text-align: center;
                    padding: 8px;
                }

                .pixel-banner-input-container {
                    display: flex;
                    gap: 8px;
                    width: 100%;
                }

                .pixel-banner-input-container input {
                    flex: 1;
                }

                .pixel-banner-prompt-inspiration-container {
                    display: flex;
                    flex-direction: row;
                    gap: 5px;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                }
                .pixel-banner-prompt-inspiration-container > button {
                    margin: 0;
                    flex: 1;
                    border: 1px solid var(--modal-border-color);
                    text-transform: uppercase;
                    font-size: 0.8em;
                    letter-spacing: 1px;
                }
                .pixel-banner-inspiration-button,
                .pixel-banner-inspiration-from-seed-button,
                .pixel-banner-rewrite-button {
                    padding: 4px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    background-color: var(--interactive-accent);
                    color: var(--text-on-accent);
                    border: none;
                    font-size: 16px;
                    margin-left: 10px;
                }
                .pixel-banner-inspiration-button:hover,
                .pixel-banner-inspiration-from-seed-button:hover,
                .pixel-banner-rewrite-button:hover {
                    background-color: var(--interactive-accent-hover);
                }
                .pixel-banner-inspiration-button:disabled,
                .pixel-banner-inspiration-from-seed-button:disabled,
                .pixel-banner-rewrite-button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    background-color: var(--interactive-accent);
                }

                /* ------------------- */
                /* -- mobile layout -- */
                /* ------------------- */
                @media screen and (max-width: 550px) {
                    .pixel-banner-prompt-description { display: none; }
                    .setting-item.pixel-banner-ai-prompt-container {
                        max-width: var(--dialog-max-width) !important;
                        padding-left: 20px;
                        padding-right: 20px;
                    }
                    .pixel-banner-prompt-inspiration-container { flex-direction: column !important; }
                    .pixel-banner-prompt-inspiration-container button { width: 100% !important; }
                    .pixel-banner-generate-btn-container { flex-direction: column !important; }
                    .pixel-banner-generate-btn-container button { width: 100% !important; }
                }
                
                .pixel-banner-ai-modal .setting-item-control select.dropdown {
                    width: 100%;
                    height: auto;
                    border-radius: 4px;
                    padding: 8px;
                    background-color: var(--background-secondary);
                    color: var(--text-normal);
                    border: 1px solid var(--background-modifier-border);
                }
                
                .pixel-banner-ai-modal .setting-item-control select.dropdown:focus {
                    border-color: var(--interactive-accent);
                    outline: none;
                }
                
                /* ------------------- */
            `
        });
        // Title
        contentEl.createEl('h2', {
            text: '✨ Generate a Banner with AI',
            cls: 'margin-top-0',
            attr: { 
                'style': `
                    margin-bottom: 0px;
                    text-align: center;
                `
            }
        });
        const promptAllowedSection = contentEl.createDiv({
            cls: 'prompt-allowed-section',
            attr: {
                'style': `
                    display: ${this.plugin.pixelBannerPlusBannerTokens === 0 ? 'none' : 'block'};
                `
            }
        });
        const promptDescription = promptAllowedSection.createEl('p', {
            text: 'Simply enter a prompt, optionally adjust the width and height, and let AI generate a banner for you. Dont have any prompt ideas? Use the "💡 INSPIRATION" button to get started, or grow a basic prompt into something special with the "🌱 GROW IDEA" button. You can also use the "✏️ REWRITE PROMPT" button to improve your existing prompt.',
            cls: 'pixel-banner-prompt-description',
            attr: {
                'style': `
                    color: var(--text-muted); 
                    max-width: 500px; 
                    font-size: .9em;
                    margin-bottom: 20px;
                `
            }
        });

        // Prompt
        const promptContainer = promptAllowedSection.createDiv({
            cls: 'setting-item pixel-banner-ai-prompt-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    max-width: 500px;
                    width: 100%;
                `
            }
        });

        promptContainer.createDiv({ cls: 'setting-item-name', text: '🖋️ Creative Banner Prompt' });
        promptContainer.createDiv({ 
            cls: 'setting-item-description', 
            text: 'TIP ⇢ Type a few words and then press the "🌱 GROW IDEA" button to transform your basic idea into something special!',
            attr: {
                'style': `
                    color: var(--text-muted); 
                    font-size: .8em;
                `
            }
        });
        
        const promptControl = promptContainer.createDiv({
            cls: 'setting-item-control',
            attr: {
                'style': `
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    margin-top: 10px !important;
                    width: 100% !important;
                `
            }
        });
        const promptInput = promptControl.createEl('textarea', {
            cls: 'full-width-input',
            attr: {
                id: 'ai-banner-prompt',
                rows: 7
            }
        });
        promptInput.value = this.prompt;
        promptInput.addEventListener('input', (e) => {
            this.prompt = e.target.value;
        });

        // create a div to hold the prompt inspiration, grow idea, and rewrite buttons
        const promptInspirationContainer = promptControl.createDiv({ cls: 'pixel-banner-prompt-inspiration-container' });

        const inspirationButton = promptInspirationContainer.createEl('button', {
            cls: 'pixel-banner-inspiration-button',
            text: '💡 INSPIRATION'
        });
        inspirationButton.addEventListener('click', () => this.getPromptInspiration());
        
        const inspirationFromSeedButton = promptInspirationContainer.createEl('button', {
            cls: 'pixel-banner-inspiration-from-seed-button',
            text: '🌱 GROW IDEA',
            attr: {
                style: `
                    border-bottom: 1px solid var(--interactive-accent-hover);
                `
            }
        });
        inspirationFromSeedButton.addEventListener('click', () => this.getPromptInspirationFromSeed());
        
        const rewritePromptButton = promptInspirationContainer.createEl('button', {
            cls: 'pixel-banner-rewrite-button',
            text: '✏️ REWRITE PROMPT',
            attr: {
                style: `
                    border-bottom: 1px solid var(--interactive-accent-hover);
                `
            }
        });
        rewritePromptButton.addEventListener('click', () => this.rewritePrompt());
        
        const inspirationClearButton = promptInspirationContainer.createEl('button', {
            cls: 'pixel-banner-inspiration-clear-button',
            text: '🗑️ CLEAR'
        });
        inspirationClearButton.addEventListener('click', () => this.clearPromptInspiration());

        // AI Model Selection
        const modelContainer = promptAllowedSection.createDiv({ 
            cls: 'setting-item pixel-banner-ai-control-row',
            attr: { style: 'padding-bottom: 0;' } 
        });
        
        const modelInfo = modelContainer.createDiv({ cls: 'setting-item-info' });
        modelInfo.createDiv({ cls: 'setting-item-name', text: 'AI Model' });
        modelInfo.createDiv({ 
            cls: 'setting-item-description', 
            text: 'Select AI model for image generation',
            attr: { style: 'font-size: 0.8em;' }
        });
        
        const modelControl = modelContainer.createDiv({ 
            cls: 'setting-item-control',
            attr: { style: 'display: flex; gap: 15px;' }
        });
        
        // FLUX Radio Button
        const fluxContainer = modelControl.createDiv({ attr: { style: 'display: flex; align-items: center; gap: 5px;' } });
        const fluxRadio = fluxContainer.createEl('input', { 
            type: 'radio',
            attr: {
                id: 'flux-model',
                name: 'provider',
                value: 'TOGETHER',
                checked: true, // Always set FLUX as default
                style: `
                    cursor: pointer;
                `
            }
        });
        fluxContainer.createEl('label', { 
            attr: {
                for: 'flux-model',
                style: `
                    cursor: pointer;
                `
            }
        }).innerHTML = 'FLUX <span style="font-size: 0.77em; color: var(--text-muted); letter-spacing: 0.5px;"> ⋅ DEFAULT</span>';
        
        // HiDream Radio Button
        const hidreamContainer = modelControl.createDiv({ attr: { style: 'display: flex; align-items: center; gap: 5px;' } });
        const hidreamRadio = hidreamContainer.createEl('input', { 
            type: 'radio',
            attr: {
                id: 'hidream-model',
                name: 'provider',
                value: 'REPLICATE',
                checked: false,
                style: `
                    cursor: pointer;
                `
            }
        });
        hidreamContainer.createEl('label', { 
            text: 'HiDream',
            attr: {
                for: 'hidream-model',
                style: `
                    cursor: pointer;
                `
            }
        });
        
        // Add event listeners for the radio buttons
        fluxRadio.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.provider = 'TOGETHER';
                this.updateInputVisibility();
            }
        });
        
        hidreamRadio.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.provider = 'REPLICATE';
                this.updateInputVisibility();
            }
        });

        // Width (visible for FLUX)
        const widthContainer = promptAllowedSection.createDiv({ 
            cls: 'setting-item pixel-banner-ai-control-row flux-control', 
            attr: { style: 'padding-bottom: 0;' } 
        });
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
        const heightContainer = promptAllowedSection.createDiv({ 
            cls: 'setting-item pixel-banner-ai-control-row flux-control'
        });
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

        // Resolution (visible for HiDream)
        const resolutionContainer = promptAllowedSection.createDiv({ 
            cls: 'setting-item pixel-banner-ai-control-row hidream-control',
            attr: { style: 'display: none;' } // Hidden by default
        });
        
        const resolutionInfo = resolutionContainer.createDiv({ cls: 'setting-item-info' });
        resolutionInfo.createDiv({ cls: 'setting-item-name', text: 'Resolution' });
        resolutionInfo.createDiv({ 
            cls: 'setting-item-description', 
            text: 'Select image resolution and orientation',
            attr: { style: 'font-size: 0.8em;' }
        });
        
        const resolutionControl = resolutionContainer.createDiv({ cls: 'setting-item-control' });
        const resolutionSelect = resolutionControl.createEl('select', { 
            cls: 'dropdown',
            attr: { id: 'resolution' }
        });
        
        // Add resolution options
        const resolutionOptions = [
            { value: '1360 × 768 (Landscape)', text: '1360 × 768 (Landscape)' },
            { value: '1248 × 832 (Landscape)', text: '1248 × 832 (Landscape)' },
            { value: '1168 × 880 (Landscape)', text: '1168 × 880 (Landscape)' },
            { value: '1024 × 1024 (Square)', text: '1024 × 1024 (Square)' },
            { value: '880 × 1168 (Portrait)', text: '880 × 1168 (Portrait)' },
            { value: '832 × 1248 (Portrait)', text: '832 × 1248 (Portrait)' },
            { value: '768 × 1360 (Portrait)', text: '768 × 1360 (Portrait)' }
        ];
        
        resolutionOptions.forEach((option, index) => {
            const optionEl = resolutionSelect.createEl('option', {
                text: option.text,
                attr: {
                    value: option.value,
                    selected: index === 0 // Select first option by default
                }
            });
        });
        
        resolutionSelect.addEventListener('change', (e) => {
            this.resolution = e.target.value;
            // We don't need to parse width and height here since the resolution is sent directly to API
        });

        // prompt disallowed section
        const promptDisallowedSection = contentEl.createDiv({
            cls: 'prompt-disallowed-section',
            attr: {
                'style': `
                    display: ${(this.plugin.pixelBannerPlusBannerTokens === 0 || !this.plugin.pixelBannerPlusEnabled) ? 'block' : 'none'};
                    max-width: 500px;
                    margin-top: 20px;
                `
            }
        });
        promptDisallowedSection.createEl('p', {
            text: 'You have no remaining banner tokens 😭. Please purchase more tokens to generate a banner. Your previous banners (if any) will still be available for download below.',
            attr: {
                'style': `
                    display: ${this.plugin.pixelBannerPlusEnabled ? 'block' : 'none'};
                    color: var(--text-muted);
                    font-size: 1.1em;
                    text-align: center;
                `
            }
        });
        promptDisallowedSection.createEl('p', {
            attr: {
                'style': `
                    display: ${!this.plugin.pixelBannerPlusEnabled ? 'block' : 'none'};
                    color: var(--text-muted);
                    font-size: 1.1em;
                    text-align: center;
                `
            }
        }).innerHTML = 'You do not have an active <span style="color: var(--text-accent); font-weight: bold;">Pixel Banner Plus</span> account. Please <span style="color: var(--text-accent); font-weight: bold;">Signup for Free</span> or connect to your account in Settings to generate awesome banners with AI 🤖.';

        // Generate Button and Token Balance
        const buttonContainer = contentEl.createDiv({
            cls: 'setting-item pixel-banner-generate-btn-container pixel-banner-ai-control-row',
            attr: {
                'style': `
                    justify-content: ${!this.plugin.pixelBannerPlusEnabled ? 'center !important' : 'space-between'};
                `
            }
        });
        
        const tokenBalance = buttonContainer.createDiv({ cls: 'pixel-banner-plus-token-balance' });
        tokenBalance.style.display = `${this.plugin.pixelBannerPlusEnabled ? 'inline-block' : 'none'}`;
        const tokenCountSpan = document.createElement('span');
        tokenCountSpan.style.color = 'var(--text-accent)';
        tokenCountSpan.style.fontWeight = 'bold';
        tokenCountSpan.style.letterSpacing = '1px';
        tokenCountSpan.innerText = this.plugin.pixelBannerPlusBannerTokens;
        tokenBalance.setText('🪙 Remaining Tokens: ');
        tokenBalance.appendChild(tokenCountSpan);
        tokenCountSpan.classList.add('token-balance-animation');
        
        // Generate Button
        const generateButton = buttonContainer.createEl('button', {
            cls: 'mod-cta cursor-pointer radial-pulse-animation',
            text: '✨ Generate Image',
            attr: {
                'style': `
                    display: ${this.plugin.pixelBannerPlusEnabled && this.plugin.pixelBannerPlusBannerTokens > 0 ? 'block' : 'none'};
                `
            }
        });
        generateButton.addEventListener('click', async () => {
            if (!this.prompt) {
                new Notice('Please enter a prompt');
                return;
            }
            await this.generateImage();
        });

        // Buy Tokens Button
        const buyTokensButton = buttonContainer.createEl('button', {
            cls: 'mod-cta cursor-pointer radial-pulse-animation',
            text: '💵 Buy More Tokens',
            attr: {
                'style': `
                    display: ${(this.plugin.pixelBannerPlusEnabled && this.plugin.pixelBannerPlusBannerTokens === 0) ? 'block' : 'none'};
                `
            }
        });
        buyTokensButton.addEventListener('click', (event) => {
            event.preventDefault();
            window.open(PIXEL_BANNER_PLUS.SHOP_URL, '_blank');
        });
        // Signup Button
        const signupButton = buttonContainer.createEl('button', {
            cls: 'mod-cta cursor-pointer radial-pulse-animation',
            text: '🚩 Signup for Free!',
            attr: {
                'style': `
                    display: ${!this.plugin.pixelBannerPlusEnabled ? 'block' : 'none'};
                `
            }
        });
        signupButton.addEventListener('click', (event) => {
            event.preventDefault();
            const signupUrl = PIXEL_BANNER_PLUS.API_URL + PIXEL_BANNER_PLUS.ENDPOINTS.SIGNUP;
            window.open(signupUrl, '_blank');
        });

        // add "Back to Main Menu" button
        const backToMainButton = buttonContainer.createEl('button', {
            text: '⇠ Main Menu',
            cls: 'cursor-pointer',
            attr: {
                style: `
                    width: max-content;
                    min-width: auto;
                `
            }
        });
        // on click of back to main menu button, close this modal and open the Pixel Banner Menu modal
        backToMainButton.addEventListener('click', () => {
            this.close();
            new SelectPixelBannerModal(this.app, this.plugin).open();
        });

        // Image container
        this.imageContainer = contentEl.createDiv({
            cls: 'pixel-banner-image-container',
            attr: {
                'style': `
                    display: ${this.plugin.pixelBannerPlusEnabled && this.plugin.pixelBannerPlusBannerTokens > 0 ? 'block' : 'none'};
                `
            }
        });

        // History container
        contentEl.createEl('h5', {
            text: '⏳ Previous AI Generated Banners',
            attr: {
                'style': `
                    margin-bottom: -20px;
                    display: ${this.plugin.pixelBannerPlusEnabled ? 'block' : 'none'};
                `
            }
        });
        // History Contianer Description
        const historyContainerDescription = contentEl.createEl('p', {
            text: `Click an image to download and use as a banner. These downloads are always FREE as you have already paid to generate them.`,
            cls: 'pixel-banner-history-description',
            attr: {
                style: `
                    font-size: 12px; 
                    color: var(--text-muted); 
                    padding-top: 10px; 
                    margin-bottom: -10px;
                    display: ${this.plugin.pixelBannerPlusEnabled ? 'block' : 'none'};
                `
            }
        });
        historyContainerDescription.innerHTML = historyContainerDescription.innerHTML.replace(/FREE/g, '<span style="color: var(--color-green); font-weight: bold;">FREE</span>');


        const historyContainer = contentEl.createDiv({
            cls: 'pixel-banner-history-container',
            attr: {
                'style': `
                    display: ${this.plugin.pixelBannerPlusEnabled ? 'flex' : 'none'};
                `
            }
        });
        
        // Add pagination container after history container
        const paginationContainer = contentEl.createDiv({
            cls: 'ai-banner-pagination',
            attr: {
                'style': `
                    display: ${this.plugin.pixelBannerPlusEnabled ? 'flex' : 'none'};
                `
            }
        });
        
        // Initial load of history with pagination
        if (this.plugin.pixelBannerPlusEnabled) {
            await this.refreshHistoryContainer();
        }
        
        // Hide loading spinner when everything is loaded
        this.hideLoadingSpinner();
        
        // Set focus on the prompt textarea
        if (promptInput) {
            setTimeout(() => {
                promptInput.focus();
            }, 100);
        }
        
        // Initialize the visibility of the inputs based on the default provider
        this.updateInputVisibility();
        
        // Ensure radio buttons show correct visual state
        setTimeout(() => {
            // Force model selection with a delay to ensure DOM is ready
            const fluxModelInput = document.getElementById('flux-model');
            if (fluxModelInput) {
                fluxModelInput.checked = true;
                const event = new Event('change', { bubbles: true });
                fluxModelInput.dispatchEvent(event);
            }
        }, 50);

        // Set default resolution
        setTimeout(() => {
            const resolutionSelect = this.contentEl.querySelector('#resolution');
            if (resolutionSelect) {
                resolutionSelect.value = this.resolution;
            }
        }, 50);
        
        // Hide loading spinner after initialization
        this.hideLoadingSpinner();
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
                    'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 200 && response.json.bannerIdea) {
                const promptInput = this.contentEl.querySelector('#ai-banner-prompt');
                if (promptInput) {
                    let promptIdea = response.json.bannerIdea?.toLowerCase();
                    promptIdea = promptIdea.trim();
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
                    'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 200 && response.json.bannerIdea) {
                const promptInput = this.contentEl.querySelector('#ai-banner-prompt');
                if (promptInput) {
                    let promptIdea = response.json.bannerIdea?.toLowerCase();
                    promptIdea = promptIdea.trim();
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

    async rewritePrompt() {
        const rewritePromptButton = this.contentEl.querySelector('.pixel-banner-rewrite-button');
        const originalText = rewritePromptButton.textContent;
        const promptTextarea = this.contentEl.querySelector('#ai-banner-prompt');

        let seed = promptTextarea.value.trim();
        if (seed.length === 0) {
            new Notice('Please enter at lease one word in the Prompt box to generate a rewritten prompt.');
            return;
        }
        
        try {
            rewritePromptButton.textContent = '⏳';
            rewritePromptButton.disabled = true;
            
            const inspirationUrl = new URL(PIXEL_BANNER_PLUS.ENDPOINTS.REWRITE_BANNER_IDEA, PIXEL_BANNER_PLUS.API_URL).toString();
            const response = await requestUrl({
                url: inspirationUrl + `/${seed}`,
                method: 'GET',
                headers: {
                    'X-User-Email': this.plugin.settings.pixelBannerPlusEmail,
                    'X-API-Key': this.plugin.settings.pixelBannerPlusApiKey,
                    'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 200 && response.json.bannerIdea) {
                const promptInput = this.contentEl.querySelector('#ai-banner-prompt');
                if (promptInput) {
                    let promptIdea = response.json.bannerIdea?.toLowerCase();
                    promptIdea = promptIdea.trim();
                    promptInput.value = promptIdea;
                    this.prompt = promptIdea;
                }
            }
        } catch (error) {
            console.error('Failed to rewrite prompt:', error);
            new Notice('Failed to rewrite prompt. Please try again.');
        } finally {
            rewritePromptButton.textContent = originalText;
            rewritePromptButton.disabled = false;
        }
    }

    async clearPromptInspiration() {
        const promptTextarea = this.contentEl.querySelector('#ai-banner-prompt');
        if (promptTextarea) {
            promptTextarea.value = '';
            promptTextarea.focus();
        }
    }
    
    async refreshHistoryContainer() {
        // add style tag to the contentEl
        const styleTag = this.contentEl.createEl('style', {
            text: `
                /* Delete icon for history images */
                .pixel-banner-history-container .pixel-banner-image-delete {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 24px;
                    height: 24px;
                    background-color: var(--background-secondary);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: .5;
                    transition: opacity 0.2s ease, background-color 0.2s ease;
                    cursor: pointer;
                    z-index: 2;
                }

                .pixel-banner-history-container pixel-banner-history-image-wrapper:hover .pixel-banner-image-delete {
                    opacity: 1;
                }

                .pixel-banner-history-container .pixel-banner-image-delete:hover {
                    background-color: red;
                    color: white;
                    opacity: 1;
                }

                .pixel-banner-history-container .pixel-banner-image-delete svg {
                    width: 16px;
                    height: 16px;
                }
            `
        });
        this.contentEl.appendChild(styleTag);

        const historyContainer = this.contentEl.querySelector('.pixel-banner-history-container');
        if (!historyContainer) return;

        historyContainer.empty();
        
        try {
            // Fetch total count first
            const countUrl = new URL(PIXEL_BANNER_PLUS.ENDPOINTS.HISTORY_COUNT, PIXEL_BANNER_PLUS.API_URL).toString();
            const countResponse = await requestUrl({
                url: countUrl,
                method: 'GET',
                headers: {
                    'X-User-Email': this.plugin.settings.pixelBannerPlusEmail,
                    'X-API-Key': this.plugin.settings.pixelBannerPlusApiKey,
                    'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                    'Accept': 'application/json'
                }
            });

            // Parse the response data
            const countData = JSON.parse(new TextDecoder().decode(countResponse.arrayBuffer));

            if (countResponse.status === 200 && countData.count !== undefined) {
                this.totalItems = countData.count;
                this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
            }

            // Fetch paginated history
            const historyUrl = new URL(`${PIXEL_BANNER_PLUS.ENDPOINTS.HISTORY_PAGE}/${this.currentPage}?limit=${this.itemsPerPage}`, PIXEL_BANNER_PLUS.API_URL).toString();
            
            const response = await requestUrl({
                url: historyUrl,
                method: 'GET',
                headers: {
                    'X-User-Email': this.plugin.settings.pixelBannerPlusEmail,
                    'X-API-Key': this.plugin.settings.pixelBannerPlusApiKey,
                    'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 200 && response.json.images) {
                response.json.images.forEach(imageData => {
                    const imgWrapper = this.renderImageItem(imageData, historyContainer);
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

    renderImageItem(imageData, container) {
        const imgWrapper = container.createDiv({ cls: 'pixel-banner-history-image-wrapper' });
        const img = imgWrapper.createEl('img', {
            cls: 'pixel-banner-history-image',
            attr: {
                src: imageData.base64Image,
                'imageId': imageData.imageId,
                'filename': imageData.prompt.trim().substr(0, 47).replace(/\s/g, '-').toLowerCase(),
            }
        });

        // Add delete button
        const deleteBtn = imgWrapper.createDiv({ cls: 'pixel-banner-image-delete' });
        const trashIcon = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
        deleteBtn.innerHTML = trashIcon;

        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            await this.deleteImage(imageData.imageId, imageData.prompt);
        });

        // Add prompt as tooltip
        let promptText = imageData.prompt;
        if (promptText.length > 70) {
            promptText = promptText.substring(0, 70) + '...';
        }
        imgWrapper.setAttribute('aria-label', `Download ⇢ ${promptText}`);
        imgWrapper.addClass('has-tooltip');

        // Add click handler to use this image
        imgWrapper.addEventListener('click', async () => {
            const shouldDownload = await this.checkDownloadHistory(img);
            if (!shouldDownload) return;
            
            const filename = img.getAttribute('filename');
            const savedPath = await handlePinIconClick(imageData.base64Image, this.plugin, null, filename);
            this.downloadHistory.addImage(img.getAttribute('imageid'));
            this.close();
            
            // Get the active file
            const activeFile = this.plugin.app.workspace.getActiveFile();
            if (!activeFile || !savedPath) return;
            
            // Open the target position modal after setting the banner
            await this.plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                const bannerField = this.plugin.settings.customBannerField[0];
                frontmatter[bannerField] = `[[${savedPath}]]`;
            });

            // Check if we should open the targeting modal
            if (this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                new TargetPositionModal(this.app, this.plugin).open();
            }
        });

        return imgWrapper;
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
                    'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                    'Accept': 'application/json'
                }
            });

            if (response.status === 200 && response.json.images) {
                historyContainer.empty();
                response.json.images.forEach(imageData => {
                    const imgWrapper = this.renderImageItem(imageData, historyContainer);
                });
            }
            
            // Update pagination UI without scrolling
            this.updatePaginationUI();
            
            // Add smooth scroll to bottom
            this.contentEl.scrollTo({
                top: this.contentEl.scrollHeight,
                behavior: 'smooth'
            });
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
            text: `${this.currentPage} of ${this.totalPages}`
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
        // Remove loading overlay if it exists
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
        }
    }
    
    // Method to update visibility of inputs based on selected provider
    updateInputVisibility() {
        const fluxControls = document.querySelectorAll('.flux-control');
        const hidreamControls = document.querySelectorAll('.hidream-control');
        
        if (this.provider === 'REPLICATE') {
            fluxControls.forEach(el => el.style.display = 'none');
            hidreamControls.forEach(el => el.style.display = 'flex');
        } else {
            fluxControls.forEach(el => el.style.display = 'flex');
            hidreamControls.forEach(el => el.style.display = 'none');
        }
    }
}