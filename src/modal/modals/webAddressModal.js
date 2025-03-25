import { Modal, MarkdownView } from 'obsidian';
import { SelectPixelBannerModal, EmojiSelectionModal, TargetPositionModal } from '../modals';

export class WebAddressModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            /* ------------------- */
            /* -- mobile layout -- */
            /* ------------------- */
            @media screen and (max-width: 375px) {
                .pixel-banner-web-address-button-container { flex-direction: column !important; }
                .pixel-banner-web-address-button-container button { width: 100% !important; }
            }
        `;
        document.head.appendChild(style);
        this.style = style;

        // Main container
        const mainContainer = contentEl.createDiv({ cls: 'pixel-banner-web-address-modal' });

        // Title container
        const titleContainer = mainContainer.createEl('h2', {
            cls: 'pixel-banner-web-address-title',
            text: 'Enter Image URL',
            attr: {
                style: `
                    margin-top: 10px;
                    margin-bottom: 20px;
                    text-align: center;
                `
            }
        });

        // URL input container
        const inputContainer = mainContainer.createDiv({
            cls: 'pixel-banner-web-address-input-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-bottom: 20px;
                `
            }
        });

        // Label
        inputContainer.createEl('label', {
            text: 'Image URL (http/https)',
            attr: {
                for: 'pixel-banner-url-input',
                style: `
                    font-size: 14px;
                    font-weight: 500;
                `
            }
        });

        // URL input
        const urlInput = inputContainer.createEl('input', {
            cls: 'pixel-banner-url-input',
            attr: {
                id: 'pixel-banner-url-input',
                type: 'url',
                placeholder: 'https://example.com/image.jpg',
                style: `
                    width: 100%;
                    padding: 8px 12px;
                    border-radius: 4px;
                    border: 1px solid var(--background-modifier-border);
                    background-color: var(--background-primary);
                    font-size: 14px;
                `
            }
        });

        // Error message container (hidden by default)
        const errorContainer = inputContainer.createDiv({
            cls: 'pixel-banner-url-error',
            attr: {
                style: `
                    color: var(--text-error);
                    font-size: 12px;
                    margin-top: 5px;
                    display: none;
                `
            }
        });

        // Button container
        const buttonContainer = mainContainer.createDiv({
            cls: 'pixel-banner-web-address-button-container',
            attr: {
                style: `
                    display: flex;
                    justify-content: space-between;
                    gap: 10px;
                    margin-top: 20px;
                `
            }
        });

        // Set Banner button
        const setBannerButton = buttonContainer.createEl('button', {
            cls: 'pixel-banner-set-button',
            text: 'Set Banner',
            attr: {
                style: `
                    padding: 8px 16px;
                    border-radius: 4px;
                    background-color: var(--interactive-accent);
                    color: var(--text-on-accent);
                    font-weight: 500;
                    cursor: pointer;
                    border: none;
                    flex: 1;
                `
            }
        });

        // Back to Main Menu button
        const backToMenuButton = buttonContainer.createEl('button', {
            cls: 'pixel-banner-back-button',
            text: '⇠ Main Menu',
            attr: {
                style: `
                    padding: 8px 16px;
                    border-radius: 4px;
                    background-color: var(--background-modifier-border);
                    color: var(--text-normal);
                    font-weight: 500;
                    cursor: pointer;
                    border: none;
                `
            }
        });

        // Function to validate URL
        const validateImageUrl = async (url) => {
            try {
                // Check if URL is valid
                if (!url || !url.startsWith('http')) {
                    throw new Error('Please enter a valid http/https URL');
                }

                // Create a promise that resolves when the image loads or rejects on error
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => resolve(true);
                    img.onerror = () => reject(new Error('URL does not point to a valid image'));
                    img.src = url;
                    
                    // Timeout after 5 seconds
                    setTimeout(() => reject(new Error('Image loading timed out')), 5000);
                });
            } catch (error) {
                throw error;
            }
        };

        // Function to show error
        const showError = (message) => {
            errorContainer.setText(message);
            errorContainer.style.display = 'block';
            urlInput.addClass('pixel-banner-url-input-error');
        };

        // Function to clear error
        const clearError = () => {
            errorContainer.setText('');
            errorContainer.style.display = 'none';
            urlInput.removeClass('pixel-banner-url-input-error');
        };

        // Event listener for input to clear errors as user types
        urlInput.addEventListener('input', () => {
            clearError();
        });

        // Set Banner button click event
        setBannerButton.addEventListener('click', async () => {
            const url = urlInput.value.trim();
            clearError();
            
            try {
                // Disable button and show loading state
                setBannerButton.disabled = true;
                setBannerButton.setText('Validating...');
                
                // Validate the image URL
                await validateImageUrl(url);
                
                // Get active file
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    throw new Error('No active file to add banner to');
                }
                
                // Update frontmatter with URL
                await this.plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                    const bannerField = this.plugin.settings.customBannerField[0];
                    frontmatter[bannerField] = url;
                });
                
                // Check if we should open the banner icon modal after selecting a banner
                if (this.plugin.settings.openBannerIconModalAfterSelectingBanner) {
                    this.close();
                    new EmojiSelectionModal(
                        this.app, 
                        this.plugin,
                        async (emoji) => {
                            if (activeFile) {
                                await this.plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                                    const iconField = this.plugin.settings.customBannerIconField[0];
                                    if (emoji) {
                                        frontmatter[iconField] = emoji;
                                    } else {
                                        delete frontmatter[iconField];
                                    }
                                });
                                
                                // Ensure banner is updated
                                const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                                if (view) {
                                    const contentEl = view.contentEl;
                                    if (contentEl) {
                                        const existingOverlays = contentEl.querySelectorAll('.banner-icon-overlay');
                                        existingOverlays.forEach(overlay => {
                                            this.plugin.returnIconOverlay(overlay);
                                        });
                                    }
                                    
                                    await this.plugin.updateBanner(view, true);
                                }
                                
                                // Check if we should open targeting modal
                                if (this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                                    new TargetPositionModal(this.app, this.plugin).open();
                                }
                            }
                        },
                        this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon
                    ).open();
                } 
                // If not opening banner icon modal, check if we should open targeting modal
                else if (this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                    this.close();
                    new TargetPositionModal(this.app, this.plugin).open();
                } else {
                    // Just close if no additional modals needed
                    this.close();
                }
                
            } catch (error) {
                // Show error message
                showError(error.message);
                
                // Reset button state
                setBannerButton.disabled = false;
                setBannerButton.setText('Set Banner');
            }
        });

        // Back to Menu button click event
        backToMenuButton.addEventListener('click', () => {
            this.close();
            new SelectPixelBannerModal(this.app, this.plugin).open();
        });

        // Add styles
        this.addStyle();
        
        // Focus the input field
        urlInput.focus();
    }

    addStyle() {
        const style = document.createElement('style');
        style.textContent = `
            .pixel-banner-web-address-modal {
                padding: 16px;
                max-width: 500px;
                width: 100%;
            }
            
            .pixel-banner-url-input-error {
                border-color: var(--text-error) !important;
            }
            
            @keyframes pixel-banner-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
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