import { Modal } from 'obsidian';
import { ImageSelectionModal, GenerateAIBannerModal, PixelBannerStoreModal, EmojiSelectionModal, TargetPositionModal } from '../modals';

export class SelectPixelBannerModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.createEl('h2', { text: '🚩 Pixel Banner Selector', cls: 'margin-top-0' });

        // Create button container
        const buttonContainer = contentEl.createDiv({ cls: 'pixel-banner-select-buttons' });

        // Vault Selection Button
        const vaultButton = buttonContainer.createEl('button', {
            text: '🏷️ Select a Banner from your Vault',
            cls: 'pixel-banner-select-button'
        });
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
                            frontmatter[bannerField] = `[[${file.path}]]`;
                        });
                    }
                }
            ).open();
        });

        // AI Generation Button
        const aiButton = buttonContainer.createEl('button', {
            text: '✨ Generate a Banner using AI',
            cls: 'pixel-banner-select-button'
        });
        aiButton.addEventListener('click', () => {
            this.close();
            new GenerateAIBannerModal(this.app, this.plugin).open();
        });
        
        // Store Button
        const storeButton = buttonContainer.createEl('button', {
            text: '🏪 Browse the Pixel Banner Plus store for a Banner',
            cls: 'pixel-banner-select-button'
        });
        storeButton.addEventListener('click', () => {
            // open the store modal
            this.close();
            new PixelBannerStoreModal(this.app, this.plugin).open();
        });

        // Banner Icon Button
        const bannerIconButton = buttonContainer.createEl('button', {
            text: '⭐ Select a Banner Icon',
            cls: 'pixel-banner-select-button'
        });
        bannerIconButton.addEventListener('click', () => {
            this.close();
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
                }
            ).open();
        });

        // Targeting Icon Button
        const targetingIconButton = buttonContainer.createEl('button', {
            text: '🎯 Define the Position and Size of the Banner and Banner Icon',
            cls: 'pixel-banner-select-button'
        });
        targetingIconButton.addEventListener('click', () => {
            this.close();
            new TargetPositionModal(this.app, this.plugin).open();
        });
        

        // Add styles
        this.addStyle();
    }

    addStyle() {
        const style = document.createElement('style');
        style.textContent = `
            .pixel-banner-select-buttons {
                display: flex;
                flex-direction: column;
                gap: 12px;
                padding: 16px;
            }
            
            .pixel-banner-select-button {
                padding: 16px;
                font-size: 16px;
                cursor: pointer;
                border-radius: 8px;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-primary);
                color: var(--text-normal);
                text-align: left;
                width: 100%;
            }
            
            .pixel-banner-select-button:hover {
                background: var(--background-modifier-hover);
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