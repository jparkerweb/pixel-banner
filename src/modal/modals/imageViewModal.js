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
        
        // Add CSS styles to document head
        this.addStyles();
        
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('pixel-banner-image-view-modal');

        // Handle both string and object types for imageUrl
        const actualUrl = this.getActualUrl(this.imageUrl);
        
        // Create media container
        const imageContainer = contentEl.createDiv('image-container');
        
        // Check if this is a video or image
        const isVideo = this.isVideoUrl(actualUrl);
        let mediaElement;
        
        if (isVideo) {
            mediaElement = imageContainer.createEl('video', {
                attr: {
                    src: actualUrl,
                    controls: true,
                    autoplay: false,
                    preload: 'metadata'
                }
            });
        } else {
            mediaElement = imageContainer.createEl('img', {
                attr: {
                    src: actualUrl,
                    alt: 'Banner Image'
                }
            });
        }

        // Add path display and copy button if bannerPath exists
        if (this.bannerPath) {
            const pathContainer = contentEl.createEl('div', { cls: 'path-container' });
            
            const pathDisplay = pathContainer.createEl('div', {
                text: this.bannerPath,
                cls: 'banner-path'
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
            cls: 'mod-cta close-button'
        });
        closeButton.addEventListener('click', () => this.close());

        // Add keyboard listener for Escape key
        this.scope.register([], 'Escape', () => this.close());

        // Set initial position of the modal
        const modalEl = this.modalEl;
        modalEl.style.position = 'absolute';
        modalEl.style.left = `${modalEl.getBoundingClientRect().left}px`;
        modalEl.style.top = `${modalEl.getBoundingClientRect().top}px`;
    }

    addStyles() {
        // Create a style element
        const styleEl = document.createElement('style');
        styleEl.id = 'pixel-banner-image-view-styles';

        // Remove any existing styles with this ID
        const existingStyle = document.getElementById(styleEl.id);
        if (existingStyle) {
            existingStyle.remove();
        }

        // Define the CSS
        styleEl.textContent = `
            .pixel-banner-image-modal {
                max-width: 80vw;
                max-height: 90vh;
                width: 100%;
                height: auto;
                top: 50% !important;
                left: 50% !important;
                transform: translate(-50%, -50%);
            }

            .pixel-banner-image-view-modal {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }

            .pixel-banner-image-view-modal img {
                max-width: 100%;
                max-height: 90vh;
                object-fit: contain;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .pixel-banner-image-view-modal button {
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s ease-in-out;
            }

            .pixel-banner-image-view-modal .image-container {
                display: flex;
                justify-content: center;
                align-items: center;
                margin-bottom: 10px;
            }

            .pixel-banner-image-view-modal .image-container img,
            .pixel-banner-image-view-modal .image-container video {
                display: flex;
                justify-content: center;
                align-items: center;
                width: 100%;
                height: 100%;
                max-width: 100%;
                max-height: 90vh;
                object-fit: contain;
            }

            .pixel-banner-image-view-modal .path-container {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 10px;
                margin-bottom: 10px;
            }

            .pixel-banner-image-view-modal .banner-path {
                flex-grow: 1;
                margin-right: 10px;
                font-family: var(--font-monospace);
                font-size: 0.9em;
                overflow-x: auto;
                padding: 4px;
                background-color: var(--background-secondary);
                border-radius: 4px;
                word-break: break-word;
            }

            .pixel-banner-image-view-modal .close-button {
                margin-top: 10px;
                width: 150px;
            }
        `;

        // Add the style element to the document head
        document.head.appendChild(styleEl);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Remove the styles when the modal is closed
        const styleEl = document.getElementById('pixel-banner-image-view-styles');
        if (styleEl) {
            styleEl.remove();
        }
    }

    isVideoUrl(url) {
        if (!url) return false;
        
        const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg'];
        const pathWithoutQuery = url.split('?')[0].toLowerCase();
        
        return videoExtensions.some(ext => pathWithoutQuery.endsWith(ext));
    }

    getActualUrl(imageUrl) {
        // Handle both string and object formats
        if (typeof imageUrl === 'object' && imageUrl !== null) {
            return imageUrl.url || imageUrl.src || '';
        }
        return imageUrl;
    }
}