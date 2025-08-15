import { Modal, Notice } from 'obsidian';

// ----------------------
// -- pin choice modal --
// ----------------------
export class PinChoiceModal extends Modal {
    constructor(app, onChoice) {
        super(app);
        this.onChoice = onChoice;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Pin Image', cls: 'margin-top-0' });
        contentEl.createEl('p', { 
            text: 'How would you like to pin this image?',
            cls: 'setting-item-description'
        });

        // Option 1: Save locally
        const localOptionContainer = contentEl.createDiv({
            cls: 'pin-choice-option'
        });
        localOptionContainer.style.cssText = `
            border: 1px solid var(--background-modifier-border);
            border-radius: 6px;
            padding: 1em;
            margin: 0.5em 0;
            cursor: pointer;
            transition: background-color 0.2s ease;
        `;
        
        const localTitle = localOptionContainer.createEl('h3', { 
            text: '💾 Save Image Locally',
            cls: 'margin-top-0'
        });
        localTitle.style.marginBottom = '0.5em';
        
        localOptionContainer.createEl('p', { 
            text: 'Download and save the image to your vault. The image will be stored locally and referenced by file path.',
            cls: 'setting-item-description'
        });
        localOptionContainer.createEl('p', { 
            text: '✓ Image remains available even if original source is removed',
            cls: 'setting-item-description'
        });
        localOptionContainer.createEl('p', { 
            text: '✓ Works offline',
            cls: 'setting-item-description'
        });

        // Option 2: Pin URL
        const urlOptionContainer = contentEl.createDiv({
            cls: 'pin-choice-option'
        });
        urlOptionContainer.style.cssText = `
            border: 1px solid var(--background-modifier-border);
            border-radius: 6px;
            padding: 1em;
            margin: 0.5em 0;
            cursor: pointer;
            transition: background-color 0.2s ease;
        `;
        
        const urlTitle = urlOptionContainer.createEl('h3', { 
            text: '🔗 Pin Image URL',
            cls: 'margin-top-0'
        });
        urlTitle.style.marginBottom = '0.5em';
        
        urlOptionContainer.createEl('p', { 
            text: 'Save only the image URL to frontmatter. The image will be loaded from the original source each time.',
            cls: 'setting-item-description'
        });
        urlOptionContainer.createEl('p', { 
            text: '✓ No storage space used in vault',
            cls: 'setting-item-description'
        });
        urlOptionContainer.createEl('p', { 
            text: '⚠ Requires internet connection to display',
            cls: 'setting-item-description'
        });

        // Add hover effects
        const addHoverEffect = (element) => {
            element.addEventListener('mouseenter', () => {
                element.style.backgroundColor = 'var(--background-modifier-hover)';
            });
            element.addEventListener('mouseleave', () => {
                element.style.backgroundColor = '';
            });
        };

        addHoverEffect(localOptionContainer);
        addHoverEffect(urlOptionContainer);

        // Add click handlers
        localOptionContainer.addEventListener('click', () => {
            this.onChoice('local');
            this.close();
        });

        urlOptionContainer.addEventListener('click', () => {
            this.onChoice('url');
            this.close();
        });

        // Add cancel button
        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 1em;
        `;

        const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
        cancelButton.addEventListener('click', () => {
            this.onChoice(null);
            this.close();
        });

        // Set initial position of the modal
        const modalEl = this.modalEl;
        modalEl.style.position = 'absolute';
        modalEl.style.left = `${modalEl.getBoundingClientRect().left}px`;
        modalEl.style.top = `${modalEl.getBoundingClientRect().top}px`;
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}