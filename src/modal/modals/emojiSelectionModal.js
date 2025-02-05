import { Modal } from "obsidian";
import { emojiList, emojiDescriptions } from `../../resources/emojis.js`;


// ---------------------------
// -- Emoji Selection Modal --
// ---------------------------
export class EmojiSelectionModal extends Modal {
    constructor(app, plugin, onChoose) {
        super(app);
        this.plugin = plugin;
        this.onChoose = onChoose;
        this.searchQuery = '';
        this.currentPage = 1;
        this.emojisPerPage = 100;
        this.emojis = emojiList;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('pixel-banner-emoji-select-modal');

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
            cls: 'banner-icon-title'
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

        setBannerButton.addEventListener('click', () => {
            this.onChoose(this.bannerIconInput.value);
            this.close();
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

        this.emojis.forEach(category => {
            const filteredEmojis = category.emojis.filter(emoji => {
                if (!this.searchQuery) return true;
                const emojiDescription = this.getEmojiDescription(emoji);
                // Only search the description text
                return emojiDescription.includes(this.searchQuery.toLowerCase());
            });

            if (filteredEmojis.length > 0) {
                // Create category section
                const categorySection = this.gridContainer.createDiv({ cls: 'emoji-category-section' });
                categorySection.createEl('h3', { text: category.category, cls: 'emoji-category-title' });

                // Create emoji grid for this category
                const emojiGrid = categorySection.createDiv({ cls: 'emoji-grid' });

                filteredEmojis.forEach(emoji => {
                    const emojiButton = emojiGrid.createEl('button', {
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
            }
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
                padding-right: 10px;
            }
            .emoji-category-section {
                margin-bottom: 1.5em;
            }
            .emoji-category-title {
                margin: 0.5em 0;
                color: var(--text-muted);
                font-size: 0.9em;
            }
            .emoji-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
                gap: 8px;
            }
            .emoji-button {
                font-size: 1.5em;
                padding: 8px;
                background: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s ease;
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
        return (emojiDescriptions[emoji] || '').toLowerCase();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}