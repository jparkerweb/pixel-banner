import { Modal, MarkdownView } from "obsidian";
import { emojiData } from "../../resources/emojis.js";
import { TargetPositionModal } from "../modals";


// ---------------------------
// -- Emoji Selection Modal --
// ---------------------------
export class EmojiSelectionModal extends Modal {
    constructor(app, plugin, onChoose, skipTargetingModal = false) {
        super(app);
        this.plugin = plugin;
        this.onChoose = onChoose;
        this.searchQuery = '';
        // If true, this modal will NOT open the targeting modal automatically
        // This is useful when the caller wants to handle opening the targeting modal itself
        this.skipTargetingModal = skipTargetingModal;
        this.closedByButton = false;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('pixel-banner-emoji-select-modal');

        console.log(`this.skipTargetingModal: ${this.skipTargetingModal}`)
        
        // Reset the closedByButton flag when the modal opens
        this.closedByButton = false;

        // get the current banner icon
        const activeFile = this.app.workspace.getActiveFile();
        const frontmatter = this.app.metadataCache.getFileCache(activeFile)?.frontmatter;
        const bannerIconField = Array.isArray(this.plugin.settings.customBannerIconField) 
            ? this.plugin.settings.customBannerIconField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconField;

        this.currentBannerIconField = frontmatter?.[bannerIconField] || "";

        // Title
        contentEl.createEl('h3', {
            text: 'Set Banner Icon',
            cls: 'banner-icon-title margin-top-0'
        });

        // Create banner icon input container
        const bannerIconContainer = contentEl.createDiv({ cls: 'banner-icon-container' });
        this.bannerIconInput = bannerIconContainer.createEl('input', {
            type: 'text',
            placeholder: 'Banner icon value...',
            cls: 'banner-icon-input',
            attr: {
                style: `
                    font-size: 1.2em;
                    padding: 15px 10px;
                `
            },
            value: this.currentBannerIconField || ''
        });

        const setBannerButton = bannerIconContainer.createEl('button', {
            text: 'Set the Banner Icon',
            cls: 'set-banner-button',
            attr: {
                style: `
                    background-color: var(--interactive-accent);
                    --text-color: var(--text-on-accent);
                `
            }
        });

        setBannerButton.addEventListener('click', async () => {
            this.closedByButton = true;
            // Trim the input value before using it
            const trimmedValue = this.bannerIconInput.value.trim();
            await this.onChoose(trimmedValue);
            this.close();
            
            // Refresh the banner to show the new icon
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (activeView) {
                    // Add a small delay to ensure frontmatter is updated
                    setTimeout(async () => {
                        await this.plugin.updateBanner(activeView, true);
                    }, 100);
                }
            }
            
            // Only open the targeting modal if we're not skipping it
            // and the setting is enabled
            if (!this.skipTargetingModal && this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                // Add delay to ensure frontmatter is fully updated
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Get the active file and verify the banner icon is set in frontmatter
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    // Wait a bit more for the cache to update
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    // Get the updated frontmatter
                    const frontmatter = this.app.metadataCache.getFileCache(activeFile)?.frontmatter;
                    const bannerIconField = Array.isArray(this.plugin.settings.customBannerIconField) 
                        ? this.plugin.settings.customBannerIconField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconField;
                    
                    // Open the targeting modal
                    new TargetPositionModal(this.app, this.plugin).open();
                }
            }
        });

        // Title
        contentEl.createEl('h5', { text: 'Emoji Selector' });

        // Search container
        const searchContainer = contentEl.createDiv({ cls: 'emoji-search-container' });
        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: 'Search emojis...',
            cls: 'emoji-search-input'
        });

        // Create emoji grid container
        this.gridContainer = contentEl.createDiv({ cls: 'emoji-grid-container' });

        // Add search handler
        searchInput.addEventListener('input', () => {
            this.searchQuery = searchInput.value.toLowerCase();
            this.updateEmojiGrid();
        });

        // Initial grid update
        this.updateEmojiGrid();

        // Set initial position of the modal
        const modalEl = this.modalEl;
        modalEl.style.position = 'absolute';
        modalEl.style.left = `${modalEl.getBoundingClientRect().left}px`;
        modalEl.style.top = `${modalEl.getBoundingClientRect().top}px`;
    }

    updateEmojiGrid() {
        this.gridContainer.empty();

        const filteredEmojis = emojiData.filter(({ emoji, keywords }) => {
            if (!this.searchQuery) return true;
            return keywords.toLowerCase().includes(this.searchQuery);
        });

        filteredEmojis.forEach(({ emoji }) => {
            const emojiButton = this.gridContainer.createEl('button', {
                text: emoji,
                cls: 'emoji-button',
                attr: {
                    'aria-label': this.getEmojiDescription(emoji)
                }
            });

            emojiButton.addEventListener('click', () => {
                this.bannerIconInput.value += emoji;
            });
        });

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .pixel-banner-emoji-select-modal {
                max-width: 600px;
                max-height: 80vh;
            }
            .emoji-search-container {
                margin-bottom: 1em;
            }
            .emoji-search-input {
                width: 100%;
                padding: 8px;
                margin-bottom: 1em;
            }
            .emoji-grid-container {
                overflow-y: auto;
                max-height: 400px !important;
            }
            .emoji-button {
                font-size: 1.5em;
                padding: 8px;
                background: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s ease;
                margin: 4px;
            }
            .emoji-button:hover {
                background: var(--background-modifier-hover);
            }
            .banner-icon-container {
                display: flex;
                gap: 8px;
                align-items: center;
                margin-top: 1em;
                padding: 8px;
                border-top: 1px solid var(--background-modifier-border);
            }
            .banner-icon-input {
                flex: 1;
                padding: 8px;
            }
            .set-banner-button {
                padding: 8px 16px;
                background: var(--interactive-accent);
                color: var(--text-on-accent);
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            .set-banner-button:hover {
                background: var(--interactive-accent-hover);
            }
        `;
        document.head.appendChild(style);
    }

    getEmojiDescription(emoji) {
        const emojiItem = emojiData.find(item => item.emoji === emoji);
        return emojiItem ? emojiItem.keywords : '';
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Get the active file and check if it has a banner
        const activeFile = this.app.workspace.getActiveFile();
        const hasBanner = activeFile ? this.plugin.hasBannerFrontmatter(activeFile) : false;
        
        // Only open the targeting modal if:
        // 1. The modal wasn't closed by clicking the button (which already handles opening the targeting modal)
        // 2. The setting is enabled
        // 3. The note has a banner
        if (!this.closedByButton && this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon && hasBanner) {
            // Add a small delay to ensure the current modal is fully closed
            setTimeout(() => {
                new TargetPositionModal(this.app, this.plugin).open();
            }, 500);
        }
    }
}