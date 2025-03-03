import { Modal } from 'obsidian';
import { ImageSelectionModal, GenerateAIBannerModal, PixelBannerStoreModal, EmojiSelectionModal, TargetPositionModal } from '../modals';
import { flags } from '../../resources/flags.js';

export class SelectPixelBannerModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        
        // Create title with the selected flag icon
        const titleContainer = contentEl.createEl('h2', { cls: 'margin-top-0 pixel-banner-selector-title' });
        
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
        titleContainer.appendChild(document.createTextNode('Pixel Banner Selector'));

        // Check if the current note has a banner
        const activeFile = this.app.workspace.getActiveFile();
        const hasBanner = activeFile ? this.plugin.hasBannerFrontmatter(activeFile) : false;

        // Create main container
        const mainContainer = contentEl.createDiv({ cls: 'pixel-banner-main-container' });
        
        // Create banner source section with heading
        const bannerSourceSection = mainContainer.createDiv({ cls: 'pixel-banner-section' });
        bannerSourceSection.createEl('h3', { text: 'Select Banner Source', cls: 'pixel-banner-section-title' });
        
        // Banner source buttons container
        const bannerSourceButtons = bannerSourceSection.createDiv({ cls: 'pixel-banner-source-buttons' });
        
        // AI Generation Button
        const aiButton = bannerSourceButtons.createEl('button', {
            cls: 'pixel-banner-source-button'
        });
        const aiButtonContent = aiButton.createDiv({ cls: 'pixel-banner-button-content' });
        aiButtonContent.createEl('span', { text: '✨', cls: 'pixel-banner-button-icon' });
        aiButtonContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'Generate with AI', 
            cls: 'pixel-banner-button-text' 
        });
        // AI Generation Button Click Event
        aiButton.addEventListener('click', () => {
            this.close();
            new GenerateAIBannerModal(this.app, this.plugin).open();
        });
        
        // Store Button
        const storeButton = bannerSourceButtons.createEl('button', {
            cls: 'pixel-banner-source-button'
        });
        const storeButtonContent = storeButton.createDiv({ cls: 'pixel-banner-button-content' });
        storeButtonContent.createEl('span', { text: '🏪', cls: 'pixel-banner-button-icon' });
        storeButtonContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'From Store', 
            cls: 'pixel-banner-button-text' 
        });
        // Store Button Click Event
        storeButton.addEventListener('click', () => {
            this.close();
            new PixelBannerStoreModal(this.app, this.plugin).open();
        });

        // Vault Selection Button
        const vaultButton = bannerSourceButtons.createEl('button', {
            cls: 'pixel-banner-source-button'
        });
        const vaultButtonContent = vaultButton.createDiv({ cls: 'pixel-banner-button-content' });
        vaultButtonContent.createEl('span', { text: '💾', cls: 'pixel-banner-button-icon' });
        vaultButtonContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'From Vault', 
            cls: 'pixel-banner-button-text' 
        });
        
        // Vault Selection Button Click Event
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
                                            if (emoji) {
                                                frontmatter[iconField] = emoji;
                                            } else {
                                                // If emoji is empty, remove the field from frontmatter
                                                delete frontmatter[iconField];
                                            }
                                        });
                                        
                                        // Ensure the banner is updated to reflect the changes
                                        const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                                        if (view) {
                                            await this.plugin.updateBanner(view, true);
                                        }
                                        
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
                    }
                }
            ).open();
        });

        // Divider
        mainContainer.createEl('hr', { cls: 'pixel-banner-divider' });
        
        // Customization section
        const customizationSection = mainContainer.createDiv({ cls: 'pixel-banner-section' });
        customizationSection.createEl('h3', { text: 'Customize Banner', cls: 'pixel-banner-section-title' });
        
        // Customization options container
        const customizationOptions = customizationSection.createDiv({ cls: 'pixel-banner-customization-options' });
        
        // Banner Icon Button
        const bannerIconButton = customizationOptions.createEl('button', {
            cls: 'pixel-banner-customize-button'
        });
        const bannerIconContent = bannerIconButton.createDiv({ cls: 'pixel-banner-button-content' });
        bannerIconContent.createEl('span', { text: '⭐', cls: 'pixel-banner-button-icon' });
        bannerIconContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'Select Banner Icon', 
            cls: 'pixel-banner-button-text' 
        });
        
        // Disable the button if no banner exists
        if (!hasBanner) {
            bannerIconButton.disabled = true;
            bannerIconButton.classList.add('pixel-banner-button-disabled');
            bannerIconButton.title = 'You need to add a banner first';
        }
        
        bannerIconButton.addEventListener('click', () => {
            if (!hasBanner) return; // Extra safety check
            
            this.close();
            new EmojiSelectionModal(
                this.app, 
                this.plugin,
                async (emoji) => {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) {
                        await this.plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                            const iconField = this.plugin.settings.customBannerIconField[0];
                            if (emoji) {
                                frontmatter[iconField] = emoji;
                            } else {
                                // If emoji is empty, remove the field from frontmatter
                                delete frontmatter[iconField];
                            }
                        });
                    }
                }
            ).open();
        });

        // Targeting Icon Button
        const targetingIconButton = customizationOptions.createEl('button', {
            cls: 'pixel-banner-customize-button'
        });
        const targetingIconContent = targetingIconButton.createDiv({ cls: 'pixel-banner-button-content' });
        targetingIconContent.createEl('span', { text: '🎯', cls: 'pixel-banner-button-icon' });
        targetingIconContent.createEl('div', { cls: 'pixel-banner-button-text-container' }).createEl('span', { 
            text: 'Adjust Position & Size', 
            cls: 'pixel-banner-button-text' 
        });

        // Disable the button if no banner exists
        if (!hasBanner) {
            targetingIconButton.disabled = true;
            targetingIconButton.classList.add('pixel-banner-button-disabled');
            targetingIconButton.title = 'You need to add a banner first';
        }

        targetingIconButton.addEventListener('click', () => {
            this.close();
            new TargetPositionModal(this.app, this.plugin).open();
        });
        
        // No Banner Message
        if (!hasBanner) {
            const noBannerMessage = customizationSection.createDiv({ cls: 'pixel-banner-no-banner-message' });
            noBannerMessage.createEl('p', { 
                text: 'No banner found for this note. Add a banner first to enable customization options.',
                cls: 'pixel-banner-message-text'
            });
        }

        // Add styles
        this.addStyle();
    }

    addStyle() {
        const style = document.createElement('style');
        style.textContent = `
            .pixel-banner-main-container {
                display: flex;
                flex-direction: column;
                gap: 24px;
                padding: 0 16px 16px;
                overflow-y: auto;
                max-height: 80vh;
                width: 100%;
                box-sizing: border-box;
            }
            
            .pixel-banner-section {
                display: flex;
                flex-direction: column;
                gap: 16px;
                width: 100%;
            }
            
            .pixel-banner-section-title {
                font-size: 16px;
                margin: 0;
                color: var(--text-normal);
                font-weight: 600;
            }
            
            .pixel-banner-source-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                width: 100%;
                justify-content: space-between;
            }
            
            .pixel-banner-source-button {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px 8px;
                border-radius: 8px;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-primary);
                cursor: pointer;
                transition: all 0.2s ease;
                flex: 1;
                min-width: 80px;
                min-height: 100px;
                height: 100%;
                box-sizing: border-box;
                overflow: hidden;
            }
            
            .pixel-banner-source-button:hover {
                background: var(--background-modifier-hover);
                transform: translateY(-2px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .pixel-banner-button-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 12px;
                width: 100%;
                height: 100%;
            }
            
            .pixel-banner-button-icon {
                font-size: 24px;
                line-height: 1;
                flex-shrink: 0;
            }
            
            .pixel-banner-button-text-container {
                text-align: center;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-grow: 1;
                overflow: hidden;
            }
            
            .pixel-banner-button-text {
                font-size: 13px;
                font-weight: 500;
                white-space: normal;
                word-break: break-word;
                line-height: 1.2;
                hyphens: auto;
                overflow-wrap: break-word;
                max-width: 100%;
            }
            
            .pixel-banner-divider {
                margin: 0;
                border: none;
                height: 1px;
                background-color: var(--background-modifier-border);
                width: 100%;
            }
            
            .pixel-banner-customization-options {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                width: 100%;
                justify-content: space-between;
            }
            
            .pixel-banner-customize-button {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px 8px;
                border-radius: 8px;
                border: 1px solid var(--background-modifier-border);
                background: var(--background-primary);
                cursor: pointer;
                transition: all 0.2s ease;
                flex: 1;
                min-width: 80px;
                min-height: 100px;
                height: 100%;
                box-sizing: border-box;
                overflow: hidden;
            }
            
            .pixel-banner-customize-button:hover {
                background: var(--background-modifier-hover);
                transform: translateY(-2px);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .pixel-banner-button-disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .pixel-banner-button-disabled:hover {
                background: var(--background-primary);
                transform: none;
                box-shadow: none;
            }
            
            .pixel-banner-no-banner-message {
                margin-top: 8px;
                padding: 12px;
                background: var(--background-modifier-error-rgb);
                border-radius: 8px;
                opacity: 0.7;
                width: 100%;
                box-sizing: border-box;
            }
            
            .pixel-banner-message-text {
                margin: 0;
                color: var(--text-error);
                font-size: 14px;
                text-align: center;
            }
            
            @media (min-width: 400px) {
                .pixel-banner-source-buttons,
                .pixel-banner-customization-options {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    grid-auto-rows: 1fr;
                }
                
                .pixel-banner-customization-options {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .pixel-banner-source-button,
                .pixel-banner-customize-button {
                    padding: 16px 8px;
                }
            }
            
            @media (max-width: 399px) {
                .pixel-banner-source-button,
                .pixel-banner-customize-button {
                    min-height: 90px;
                }
                
                .pixel-banner-button-icon {
                    font-size: 20px;
                }
                
                .pixel-banner-button-text {
                    font-size: 12px;
                }
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