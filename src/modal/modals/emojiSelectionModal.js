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

        // Title
        contentEl.createEl('h2', { text: 'Select Banner Icon' });

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
                        this.onChoose(emoji);
                        this.close();
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
                max-height: 60vh;
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