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
            text: '⭐ Set Banner Icon',
            cls: 'banner-icon-title margin-top-0'
        });

        contentEl.createEl('p', {
            text: 'Use the form below to optionally set an emoji and/or text as this note\'s Banner Icon. Leave the value blank and click the "Update Banner Icon" button to clear any existing banner icon if it exists.',
            attr: {
                style: `
                    padding-top: 20px;
                    border-top: 1px solid var(--background-modifier-border);
                    font-size: 0.8em;
                    color: var(--text-muted);
                `
            }
        });

        // Create banner icon input container
        const bannerIconContainer = contentEl.createDiv({
            cls: 'banner-icon-input-container',
            attr: {
                style: `
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    margin-top: 1em;
                    padding: 8px;
                `
            }
        });

        this.bannerIconInput = bannerIconContainer.createEl('input', {
            type: 'text',
            placeholder: 'Enter an emoji and/or text...',
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
            text: 'Update Banner Icon',
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
            
            // If the value is empty, pass null to signal that the field should be removed
            // Otherwise pass the trimmed value as normal
            await this.onChoose(trimmedValue === '' ? null : trimmedValue);
            this.close();
            
            // Get the active file and view
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (activeView) {
                    // Clean up any existing banner icon overlays before updating
                    const contentEl = activeView.contentEl;
                    if (contentEl) {
                        const existingOverlays = contentEl.querySelectorAll('.banner-icon-overlay');
                        existingOverlays.forEach(overlay => {
                            this.plugin.returnIconOverlay(overlay);
                        });
                    }
                    
                    // Force a full banner update
                    await this.plugin.updateBanner(activeView, true, this.plugin.UPDATE_MODE.FULL_UPDATE);
                }
            }
            
            // Only open the targeting modal if we're not skipping it
            // and the setting is enabled
            if (!this.skipTargetingModal && this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                // Use metadataCache events instead of timeouts
                const activeFile = this.app.workspace.getActiveFile();
                if (activeFile) {
                    // Create a promise that resolves when the metadata is updated
                    await new Promise(resolve => {
                        // Store the current frontmatter state
                        const initialFrontmatter = JSON.stringify(
                            this.app.metadataCache.getFileCache(activeFile)?.frontmatter || {}
                        );
                        
                        // Set up a one-time event listener for metadata changes
                        const eventRef = this.app.metadataCache.on('changed', (file) => {
                            // Only proceed if this is our active file
                            if (file.path !== activeFile.path) return;
                            
                            // Get the updated frontmatter
                            const updatedFrontmatter = JSON.stringify(
                                this.app.metadataCache.getFileCache(file)?.frontmatter || {}
                            );
                            
                            // If frontmatter has changed, we can proceed
                            if (updatedFrontmatter !== initialFrontmatter) {
                                // Remove the event listener
                                this.app.metadataCache.off('changed', eventRef);
                                
                                // Resolve the promise
                                resolve();
                            }
                        });
                        
                        // Set a timeout as a fallback in case the event doesn't fire
                        setTimeout(() => {
                            this.app.metadataCache.off('changed', eventRef);
                            resolve();
                        }, 500); // Reduced timeout as a fallback
                    });
                    
                    // Open the targeting modal
                    new TargetPositionModal(this.app, this.plugin).open();
                }
            }
        });

        // button to clearn the banner icon
        const clearBannerIconButton = bannerIconContainer.createEl('button', {
            text: 'Clear Icon',
            cls: 'clear-banner-icon-button cursor-pointer'
        });
        clearBannerIconButton.addEventListener('click', () => {
            this.bannerIconInput.value = '';
            this.bannerIconInput.focus();
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

            /* ------------------- */
            /* -- mobile layout -- */
            /* ------------------- */
            @media screen and (max-width: 640px) {
                .banner-icon-input-container { flex-direction: column !important; }
                .banner-icon-input-container * { width: 100% !important; }
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
            const openTargetingModal = async () => {
                if (activeFile) {
                    // Create a promise that resolves when the metadata is updated or after a short timeout
                    await new Promise(resolve => {
                        // Store the current frontmatter state
                        const initialFrontmatter = JSON.stringify(
                            this.app.metadataCache.getFileCache(activeFile)?.frontmatter || {}
                        );
                        
                        // Set up a one-time event listener for metadata changes
                        const eventRef = this.app.metadataCache.on('changed', (file) => {
                            // Only proceed if this is our active file
                            if (file.path !== activeFile.path) return;
                            
                            // Get the updated frontmatter
                            const updatedFrontmatter = JSON.stringify(
                                this.app.metadataCache.getFileCache(file)?.frontmatter || {}
                            );
                            
                            // If frontmatter has changed, we can proceed
                            if (updatedFrontmatter !== initialFrontmatter) {
                                // Remove the event listener
                                this.app.metadataCache.off('changed', eventRef);
                                
                                // Resolve the promise
                                resolve();
                            }
                        });
                        
                        // Set a timeout as a fallback in case the event doesn't fire
                        setTimeout(() => {
                            this.app.metadataCache.off('changed', eventRef);
                            resolve();
                        }, 300); // Shorter timeout as a fallback
                    });
                    
                    // Open the targeting modal
                    new TargetPositionModal(this.app, this.plugin).open();
                }
            };
            
            // Add a minimal delay to ensure the current modal is fully closed
            setTimeout(openTargetingModal, 100);
        }
    }
}