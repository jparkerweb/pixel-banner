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
        // Own class, styled in styles.css; Obsidian's modal container centers it
        this.modalEl.addClass('pixel-banner-image-viewer');

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
    }


    onClose() {
        const { contentEl } = this;
        contentEl.empty();
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