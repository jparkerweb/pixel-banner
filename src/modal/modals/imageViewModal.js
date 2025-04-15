import { Modal } from 'obsidian';


// ----------------------
// -- Image View Modal --
// ----------------------
export class ImageViewModal extends Modal {
    constructor(app, imageUrl, bannerPath = '') {
        super(app);
        this.imageUrl = imageUrl;
        this.bannerPath = bannerPath;
    }

    onOpen() {
        // Add custom class to the modal element
        this.modalEl.addClass('pixel-banner-image-modal');
        
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('pixel-banner-image-view-modal');

        // Create image container
        const imageContainer = contentEl.createDiv('image-container');
        const img = imageContainer.createEl('img', {
            attr: {
                src: this.imageUrl,
                style: `
                    max-width: 100%;
                    max-height: 90vh;
                    object-fit: contain;
                `
            }
        });

        // Add path display and copy button if bannerPath exists
        if (this.bannerPath) {
            const pathContainer = contentEl.createEl('div', {
                cls: 'path-container',
                attr: {
                    style: `
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-top: 10px;
                        margin-bottom: 10px;
                    `
                }
            });
            
            const pathDisplay = pathContainer.createEl('div', {
                text: this.bannerPath,
                cls: 'banner-path',
                attr: {
                    style: `
                        flex-grow: 1;
                        margin-right: 10px;
                        font-family: var(--font-monospace);
                        font-size: 0.9em;
                        overflow-x: auto;
                    `
                }
            });
            
            const copyButton = pathContainer.createEl('button', {
                text: 'Copy Path',
                cls: 'mod-cta'
            });
            
            copyButton.addEventListener('click', () => {
                navigator.clipboard.writeText(this.bannerPath).then(() => {
                    const originalText = copyButton.textContent;
                    copyButton.textContent = 'Copied!';
                    setTimeout(() => {
                        copyButton.textContent = originalText;
                    }, 2000);
                });
            });
        }

        // Add close button
        const closeButton = contentEl.createEl('button', {
            text: 'Close',
            cls: 'mod-cta'
        });
        closeButton.style.marginTop = '10px';
        closeButton.addEventListener('click', () => this.close());

        // Add keyboard listener for Escape key
        this.scope.register([], 'Escape', () => this.close());

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