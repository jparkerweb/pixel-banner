import { Modal, Setting } from 'obsidian';

export class ReleaseNotesModal extends Modal {
    constructor(app, version, releaseNotes) {
        super(app);
        this.version = version;
        this.releaseNotes = releaseNotes;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Header
        contentEl.createEl('h2', { text: `Welcome to 🚩 Pixel Banner v${this.version}` });

        // Message
        contentEl.createEl('p', { 
            text: 'After each update you\'ll be prompted with the release notes. You can disable this in the plugin settings General tab.',
            cls: 'release-notes-instructions'
        });

        const promotionalLinks = contentEl.createEl('div');
        promotionalLinks.style.display = 'flex';
        promotionalLinks.style.flexDirection = 'row';
        promotionalLinks.style.justifyContent = 'space-around';

        const equilllabsLink = promotionalLinks.createEl('a', {
            href: 'https://www.equilllabs.com',
            target: 'equilllabs',
        });
        equilllabsLink.createEl('img', {
            attr: {
                height: '36',
                style: 'border:0px;height:36px;',
                src: 'https://raw.githubusercontent.com/jparkerweb/pixel-banner/refs/heads/main/img/equilllabs.png?raw=true',
                border: '0',
                alt: 'eQuill Labs'
            }
        });
        const discordLink = promotionalLinks.createEl('a', {
            href: 'https://discord.gg/sp8AQQhMJ7',
            target: 'discord',
        });
        discordLink.createEl('img', {
            attr: {
                height: '36',
                style: 'border:0px;height:36px;',
                src: 'https://raw.githubusercontent.com/jparkerweb/pixel-banner/refs/heads/main/img/discord.png?raw=true',
                border: '0',
                alt: 'Discord'
            }
        });
        const kofiLink = promotionalLinks.createEl('a', {
            href: 'https://ko-fi.com/Z8Z212UMBI',
            target: 'kofi',
        });
        kofiLink.createEl('img', {
            attr: {
                height: '36',
                style: 'border:0px;height:36px;',
                src: 'https://raw.githubusercontent.com/jparkerweb/pixel-banner/refs/heads/main/img/support.png?raw=true',
                border: '0',
                alt: 'Buy Me a Coffee at ko-fi.com'
            }
        });

        // Release notes content
        const notesContainer = contentEl.createDiv('release-notes-container');
        notesContainer.innerHTML = this.releaseNotes;

        // Add some spacing
        contentEl.createEl('div', { cls: 'release-notes-spacer' }).style.height = '20px';

        // Close button
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Close')
                .onClick(() => this.close()));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class ImageViewModal extends Modal {
    constructor(app, imageUrl) {
        super(app);
        this.imageUrl = imageUrl;
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
                style: 'max-width: 100%; max-height: 90vh; object-fit: contain;'
            }
        });

        // Add close button
        const closeButton = contentEl.createEl('button', {
            text: 'Close',
            cls: 'mod-cta'
        });
        closeButton.style.marginTop = '10px';
        closeButton.addEventListener('click', () => this.close());

        // Add keyboard listener for Escape key
        this.scope.register([], 'Escape', () => this.close());
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class ImageSelectionModal extends Modal {
    constructor(app, onChoose, defaultPath = '') {
        super(app);
        this.onChoose = onChoose;
        this.defaultPath = defaultPath;
        this.searchQuery = defaultPath.toLowerCase();
        this.imageFiles = this.app.vault.getFiles()
            .filter(file => file.extension.toLowerCase().match(/^(jpg|jpeg|png|gif|bmp|svg|webp)$/));
    }

    onOpen() {
        // Add custom class to the modal element
        this.modalEl.addClass('pixel-banner-image-select-modal');

        const { contentEl } = this;
        contentEl.empty();

        // Add title
        contentEl.createEl('h2', { text: 'Select Banner Image' });

        // Add search input
        const searchContainer = contentEl.createDiv({ cls: 'pixel-banner-search-container' });
        searchContainer.style.display = 'flex';
        searchContainer.style.gap = '8px';
        searchContainer.style.alignItems = 'center';
        searchContainer.style.marginBottom = '1em';

        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: 'Search images...',
            value: this.defaultPath
        });
        searchInput.style.flex = '1';

        const clearButton = searchContainer.createEl('button', {
            text: 'Clear'
        });

        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            this.searchQuery = '';
            this.updateImageGrid();
        });

        searchInput.addEventListener('input', () => {
            this.searchQuery = searchInput.value.toLowerCase();
            this.updateImageGrid();
        });

        // Create grid container
        this.gridContainer = contentEl.createDiv({ cls: 'pixel-banner-image-grid' });
        
        // Update grid with initial filter
        this.updateImageGrid();
    }

    updateImageGrid() {
        this.gridContainer.empty();

        const filteredFiles = this.imageFiles.filter(file => {
            const filePath = file.path.toLowerCase();
            const fileName = file.name.toLowerCase();
            return filePath.includes(this.searchQuery) || fileName.includes(this.searchQuery);
        });

        filteredFiles.forEach(file => {
            const imageContainer = this.gridContainer.createDiv({ cls: 'pixel-banner-image-container' });
            
            // Create thumbnail container
            const thumbnailContainer = imageContainer.createDiv();
            
            // Try to create thumbnail
            this.app.vault.readBinary(file).then(arrayBuffer => {
                const blob = new Blob([arrayBuffer]);
                const url = URL.createObjectURL(blob);
                const img = thumbnailContainer.createEl('img', {
                    cls: 'pixel-banner-image-thumbnail',
                    attr: { src: url }
                });
                
                // Clean up blob URL when image loads or errors
                const cleanup = () => URL.revokeObjectURL(url);
                img.addEventListener('load', cleanup);
                img.addEventListener('error', cleanup);
            }).catch(() => {
                thumbnailContainer.createEl('div', {
                    cls: 'pixel-banner-image-error',
                    text: 'Error loading image'
                });
            });

            // Add file path
            imageContainer.createEl('div', {
                cls: 'pixel-banner-image-path',
                text: file.path
            });

            // Add click handler
            imageContainer.addEventListener('click', () => {
                this.onChoose(file);
                this.close();
            });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 