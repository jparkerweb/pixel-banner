import { Modal, Setting, Notice, FuzzySuggestModal } from 'obsidian';
import { emojiList, emojiDescriptions } from `./emojis.js`;

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

export class ImageSelectionModal extends Modal {
    constructor(app, plugin, onChoose, defaultPath = '') {
        super(app);
        this.plugin = plugin;
        this.onChoose = onChoose;
        this.defaultPath = defaultPath;
        this.searchQuery = defaultPath.toLowerCase();
        this.currentPage = 1;
        this.imagesPerPage = 20;
        this.sortOrder = 'name-asc';
        this.imageFiles = this.app.vault.getFiles()
            .filter(file => file.extension.toLowerCase().match(/^(jpg|jpeg|png|gif|bmp|svg|webp)$/));
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    onOpen() {
        // Add custom class to the modal element
        this.modalEl.addClass('pixel-banner-image-select-modal');

        const { contentEl } = this;
        contentEl.empty();

        // Title
        contentEl.createEl('h2', { text: 'Select Banner Image' });
        // Description
        contentEl.createEl('div', {
            text: 'Select an image from your vault or upload a new one.',
            cls: 'pixel-banner-image-select-description'
        });

        // Add search container
        const searchContainer = contentEl.createDiv({ cls: 'pixel-banner-search-container' });
        searchContainer.style.display = 'flex';
        searchContainer.style.gap = '8px';
        searchContainer.style.alignItems = 'center';
        searchContainer.style.marginBottom = '1em';

        // Create first row for search input and clear button
        const searchRow = searchContainer.createDiv({ cls: 'search-row' });

        const searchInput = searchRow.createEl('input', {
            type: 'text',
            placeholder: 'Search images...',
            value: this.defaultPath
        });
        searchInput.style.flex = '1';

        const clearButton = searchRow.createEl('button', {
            text: 'Clear'
        });

        // Create second row for upload button and path toggle
        const controlsRow = searchContainer.createDiv({ cls: 'controls-row' });

        const uploadButton = controlsRow.createEl('button', {
            text: '📤 Upload External Image'
        });

        // Add the toggle container and switch
        const toggleContainer = controlsRow.createDiv({ 
            cls: 'pixel-banner-path-toggle',
            attr: {
                style: 'display: flex; align-items: center; gap: 8px;'
            }
        });

        const toggleLabel = toggleContainer.createSpan({
            text: 'Use short path',
            attr: {
                style: 'font-size: 12px; color: var(--text-muted);'
            }
        });

        const toggle = new Setting(toggleContainer)
            .addToggle(cb => {
                cb.setValue(this.plugin.settings.useShortPath)
                    .onChange(async (value) => {
                        this.plugin.settings.useShortPath = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Style the toggle container to be compact
        toggle.settingEl.style.border = 'none';
        toggle.settingEl.style.padding = '0';
        toggle.settingEl.style.margin = '0';
        toggle.infoEl.remove(); // Remove the empty info element

        // Create hidden file input
        const fileInput = searchContainer.createEl('input', {
            type: 'file',
            attr: {
                accept: 'image/*',
                style: 'display: none;'
            }
        });

        // Handle upload button click
        uploadButton.addEventListener('click', () => {
            fileInput.click();
        });

        // Handle file selection
        fileInput.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async () => {
                    const arrayBuffer = reader.result;
                    
                    // First, show folder selection modal
                    // Get the default folder from plugin settings
                    const defaultFolder = this.plugin.settings.pinnedImageFolder || '';
                    const folderPath = await new Promise((resolve) => {
                        new FolderSelectionModal(this.app, defaultFolder, (result) => {
                            resolve(result);
                        }).open();
                    });

                    if (!folderPath) {
                        new Notice('No folder selected');
                        return;
                    }

                    // Ensure the folder exists
                    if (!await this.app.vault.adapter.exists(folderPath)) {
                        await this.app.vault.createFolder(folderPath);
                    }

                    // Then show file name modal
                    const suggestedName = file.name;
                    const fileName = await new Promise((resolve) => {
                        new SaveImageModal(this.app, suggestedName, (result) => {
                            resolve(result);
                        }).open();
                    });

                    if (!fileName) {
                        new Notice('No file name provided');
                        return;
                    }

                    try {
                        // Create the file in the vault
                        const fullPath = `${folderPath}/${fileName}`.replace(/\/+/g, '/');
                        const newFile = await this.app.vault.createBinary(fullPath, arrayBuffer);
                        
                        // Call onChoose with the new file
                        this.onChoose(newFile);
                        this.close();
                    } catch (error) {
                        new Notice('Failed to save image: ' + error.message);
                    }
                };
                reader.readAsArrayBuffer(file);
            }
        });

        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            this.searchQuery = '';
            this.updateImageGrid();
        });

        searchInput.addEventListener('input', this.debounce(() => {
            this.searchQuery = searchInput.value.toLowerCase();
            this.updateImageGrid();
        }, 500)); // 500ms debounce

        // Create grid container
        this.gridContainer = contentEl.createDiv({ cls: 'pixel-banner-image-grid' });
        
        // Add pagination container
        this.paginationContainer = contentEl.createDiv({ cls: 'pixel-banner-pagination' });
        this.paginationContainer.style.display = 'flex';
        this.paginationContainer.style.justifyContent = 'center';
        this.paginationContainer.style.alignItems = 'center';
        this.paginationContainer.style.marginTop = '1em';
        this.paginationContainer.style.gap = '10px';
        
        // Update grid with initial filter
        this.updateImageGrid();

        // Set initial position of the modal
        const modalEl = this.modalEl;
        modalEl.style.position = 'absolute';
        modalEl.style.left = `${modalEl.getBoundingClientRect().left}px`;
        modalEl.style.top = `${modalEl.getBoundingClientRect().top}px`;
    }

    updateImageGrid() {
        this.gridContainer.empty();
        this.paginationContainer.empty();

        let filteredFiles = this.imageFiles.filter(file => {
            const filePath = file.path.toLowerCase();
            const fileName = file.name.toLowerCase();
            return filePath.includes(this.searchQuery) || fileName.includes(this.searchQuery);
        });

        // Sort files
        filteredFiles = this.sortFiles(filteredFiles);

        // Calculate pagination
        const totalImages = filteredFiles.length;
        const totalPages = Math.ceil(totalImages / this.imagesPerPage);
        const startIndex = (this.currentPage - 1) * this.imagesPerPage;
        const endIndex = Math.min(startIndex + this.imagesPerPage, totalImages);

        // Get current page's files
        const currentFiles = filteredFiles.slice(startIndex, endIndex);

        // Create image grid
        currentFiles.forEach(file => {
            const imageContainer = this.gridContainer.createDiv({ cls: 'pixel-banner-image-container' });
            
            // Create thumbnail container
            const thumbnailContainer = imageContainer.createDiv();
            
            // Try to create thumbnail
            if (file.extension.toLowerCase() === 'svg') {
                // For SVG files, read as text and create inline SVG
                this.app.vault.read(file).then(content => {
                    const parser = new DOMParser();
                    const svgDoc = parser.parseFromString(content, 'image/svg+xml');
                    const svgElement = svgDoc.documentElement;
                    
                    // Add necessary classes and styles
                    svgElement.classList.add('pixel-banner-image-thumbnail');
                    svgElement.style.width = '100%';
                    svgElement.style.height = '100%';
                    
                    // Replace any existing content
                    thumbnailContainer.empty();
                    thumbnailContainer.appendChild(svgElement);
                }).catch(() => {
                    thumbnailContainer.createEl('div', {
                        cls: 'pixel-banner-image-error',
                        text: 'Error loading SVG'
                    });
                });
            } else {
                // For non-SVG files, use the existing binary approach
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
            }

            // Add file info
            const infoContainer = imageContainer.createDiv('pixel-banner-image-info');
            infoContainer.createEl('div', {
                cls: 'pixel-banner-image-path',
                text: file.path
            });
            
            // Add file size and date
            const statsContainer = infoContainer.createDiv('pixel-banner-image-stats');
            statsContainer.style.fontSize = '0.8em';
            statsContainer.style.color = 'var(--text-muted)';
            
            const fileSize = this.formatFileSize(file.stat.size);
            const modifiedDate = this.formatDate(file.stat.mtime);
            
            statsContainer.createEl('span', {
                text: `${fileSize} • ${modifiedDate}`
            });

            // Add click handler
            imageContainer.addEventListener('click', () => {
                this.onChoose(file);
                this.close();
            });
        });

        // Always show controls if we have any images in the vault
        if (this.imageFiles.length > 0) {
            // Create a flex container for sort and pagination
            const controlsContainer = this.paginationContainer.createDiv({ cls: 'pixel-banner-controls' });
            controlsContainer.style.display = 'flex';
            controlsContainer.style.justifyContent = 'center';
            controlsContainer.style.gap = '50px';
            controlsContainer.style.alignItems = 'center';
            controlsContainer.style.width = '100%';

            // Add sort select on the left
            const sortContainer = controlsContainer.createDiv({ cls: 'pixel-banner-sort-container' });
            const sortSelect = sortContainer.createEl('select', { cls: 'dropdown' });
            
            const sortOptions = [
                { value: 'name-asc', label: 'Name (A-Z)' },
                { value: 'name-desc', label: 'Name (Z-A)' },
                { value: 'date-desc', label: 'Date Modified (Newest)' },
                { value: 'date-asc', label: 'Date Modified (Oldest)' },
                { value: 'size-desc', label: 'Size (Largest)' },
                { value: 'size-asc', label: 'Size (Smallest)' }
            ];

            sortOptions.forEach(option => {
                const optionEl = sortSelect.createEl('option', {
                    value: option.value,
                    text: option.label
                });
                if (option.value === this.sortOrder) {
                    optionEl.selected = true;
                }
            });

            sortSelect.addEventListener('change', () => {
                this.sortOrder = sortSelect.value;
                this.currentPage = 1; // Reset to first page when sorting changes
                this.updateImageGrid();
            });

            // Create pagination container on the right
            const paginationDiv = controlsContainer.createDiv({ cls: 'pixel-banner-pagination-buttons' });
            paginationDiv.style.display = 'flex';
            paginationDiv.style.gap = '10px';
            paginationDiv.style.alignItems = 'center';

            // First page button
            const firstButton = paginationDiv.createEl('button', {
                text: '«',
                cls: 'pixel-banner-pagination-button',
                attr: {
                    'aria-label': 'First page'
                }
            });
            firstButton.disabled = this.currentPage === 1;
            firstButton.onclick = () => {
                if (this.currentPage !== 1) {
                    this.currentPage = 1;
                    this.updateImageGrid();
                }
            };

            // Previous page button
            const prevButton = paginationDiv.createEl('button', {
                text: '‹',
                cls: 'pixel-banner-pagination-button',
                attr: {
                    'aria-label': 'Previous page'
                }
            });
            prevButton.disabled = this.currentPage === 1;
            prevButton.onclick = () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.updateImageGrid();
                }
            };

            // Page info
            paginationDiv.createEl('span', {
                text: `${this.currentPage} / ${totalPages}`,
                cls: 'pixel-banner-pagination-info'
            });

            // Next page button
            const nextButton = paginationDiv.createEl('button', {
                text: '›',
                cls: 'pixel-banner-pagination-button',
                attr: {
                    'aria-label': 'Next page'
                }
            });
            nextButton.disabled = this.currentPage === totalPages;
            nextButton.onclick = () => {
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.updateImageGrid();
                }
            };

            // Last page button
            const lastButton = paginationDiv.createEl('button', {
                text: '»',
                cls: 'pixel-banner-pagination-button',
                attr: {
                    'aria-label': 'Last page'
                }
            });
            lastButton.disabled = this.currentPage === totalPages;
            lastButton.onclick = () => {
                if (this.currentPage !== totalPages) {
                    this.currentPage = totalPages;
                    this.updateImageGrid();
                }
            };

            // Update page info and button states based on filtered results
            const pageInfo = paginationDiv.querySelector('.pixel-banner-pagination-info');
            if (pageInfo) {
                pageInfo.textContent = filteredFiles.length > 0 ? 
                    `${this.currentPage} / ${totalPages}` : 
                    'No results';
            }

            // Update button states
            const buttons = paginationDiv.querySelectorAll('button');
            buttons.forEach(button => {
                button.disabled = filteredFiles.length === 0 || 
                                (this.currentPage === 1 && ['«', '‹'].includes(button.textContent)) ||
                                (this.currentPage === totalPages && ['›', '»'].includes(button.textContent));
            });
        }
    }

    sortFiles(files) {
        return files.sort((a, b) => {
            switch (this.sortOrder) {
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'date-desc':
                    return b.stat.mtime - a.stat.mtime;
                case 'date-asc':
                    return a.stat.mtime - b.stat.mtime;
                case 'size-desc':
                    return b.stat.size - a.stat.size;
                case 'size-asc':
                    return a.stat.size - b.stat.size;
                default:
                    return 0;
            }
        });
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export class FolderSelectionModal extends FuzzySuggestModal {
    constructor(app, defaultFolder, onChoose) {
        super(app);
        this.defaultFolder = defaultFolder;
        this.onChoose = onChoose;
        
        // Set custom placeholder text
        this.setPlaceholder("Select or type folder path to save Banner Image");
        
        // Set modal title
        this.titleEl.setText("Choose Folder to save Banner Image");
    }

    getItems() {
        return [this.defaultFolder, ...this.app.vault.getAllLoadedFiles()
            .filter(file => file.children)
            .map(folder => folder.path)];
    }

    getItemText(item) {
        return item;
    }

    onChooseItem(item) {
        this.onChoose(item);
    }

    onOpen() {
        super.onOpen();
        // Pre-populate the search with the default folder
        const inputEl = this.inputEl;
        inputEl.value = this.defaultFolder;
        inputEl.select();
        // Trigger the search to show matching results
        this.updateSuggestions();

        // Set initial position of the modal
        const modalEl = this.modalEl;
        modalEl.style.position = 'absolute';
        modalEl.style.left = `${modalEl.getBoundingClientRect().left}px`;
        modalEl.style.top = `${modalEl.getBoundingClientRect().top}px`;
    }
}

export class SaveImageModal extends Modal {
    constructor(app, suggestedName, onSubmit) {
        super(app);
        this.suggestedName = suggestedName;
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Save Image' });
        contentEl.createEl('p', { text: 'Enter a name for the image file.' });

        const fileNameSetting = new Setting(contentEl)
            .setName('File name')
            .addText(text => text
                .setValue(this.suggestedName)
                .onChange(value => {
                    this.suggestedName = value;
                }));

        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'flex-end';
        buttonContainer.style.gap = '8px';
        buttonContainer.style.marginTop = '1em';

        const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
        const saveButton = buttonContainer.createEl('button', {
            text: 'Save',
            cls: 'mod-cta'
        });

        cancelButton.addEventListener('click', () => this.close());
        saveButton.addEventListener('click', () => {
            if (this.suggestedName) {
                this.onSubmit(this.suggestedName);
                this.close();
            } else {
                new Notice('Please enter a file name');
            }
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

// --------------------------
// -- target position modal --
// --------------------------
export class TargetPositionModal extends Modal {
    constructor(app, plugin, onPositionChange) {
        super(app);
        this.plugin = plugin;
        this.onPositionChange = onPositionChange;
        this.isDragging = false;
        
        // Get current display mode, zoom, postion, and banner height
        const activeFile = this.app.workspace.getActiveFile();
        const frontmatter = this.app.metadataCache.getFileCache(activeFile)?.frontmatter;
        const displayField = Array.isArray(this.plugin.settings.customImageDisplayField) 
            ? this.plugin.settings.customImageDisplayField[0].split(',')[0].trim()
            : this.plugin.settings.customImageDisplayField;

        const xField = Array.isArray(this.plugin.settings.customXPositionField) 
            ? this.plugin.settings.customXPositionField[0].split(',')[0].trim()
            : this.plugin.settings.customXPositionField;

        const yField = Array.isArray(this.plugin.settings.customYPositionField) 
            ? this.plugin.settings.customYPositionField[0].split(',')[0].trim()
            : this.plugin.settings.customYPositionField;

        const heightField = Array.isArray(this.plugin.settings.customBannerHeightField)
            ? this.plugin.settings.customBannerHeightField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerHeightField;

        this.currentX = frontmatter?.[xField] || this.plugin.settings.xPosition;
        this.currentY = frontmatter?.[yField] || this.plugin.settings.yPosition;
        this.currentHeight = frontmatter?.[heightField] || this.plugin.settings.bannerHeight;
        this.currentDisplay = frontmatter?.[displayField] || this.plugin.settings.imageDisplay;
        this.currentZoom = 100;
        
        // Parse current display value for zoom percentage
        if (this.currentDisplay && this.currentDisplay.endsWith('%')) {
            this.currentZoom = parseInt(this.currentDisplay) || 100;
            this.currentDisplay = 'cover-zoom';
        }
    }

    // Helper to update frontmatter with new display value
    updateDisplayMode(mode, zoom = null) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const displayField = Array.isArray(this.plugin.settings.customImageDisplayField) 
            ? this.plugin.settings.customImageDisplayField[0].split(',')[0].trim()
            : this.plugin.settings.customImageDisplayField;

        let newValue = mode;
        if (mode === 'cover-zoom') {
            newValue = `${zoom}%`;
        }

        this.app.fileManager.processFrontMatter(activeFile, (fm) => {
            fm[displayField] = newValue;
        });
    }

    updateBannerHeight(height) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const heightField = Array.isArray(this.plugin.settings.customBannerHeightField)
            ? this.plugin.settings.customBannerHeightField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerHeightField;

        this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            frontmatter[heightField] = height;
        });
    }

    onPositionChange(x, y) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            frontmatter.bannerTargetX = x;
            frontmatter.bannerTargetY = y;
        });
    }

    onOpen() {
        const { contentEl, modalEl, bgEl } = this;
        contentEl.empty();
        contentEl.addClass('target-position-modal');
        modalEl.style.opacity = "0.8";
        bgEl.style.opacity = "0";

        // Create main container with flex layout
        const mainContainer = contentEl.createDiv({ cls: 'main-container' });
        mainContainer.style.display = 'flex';
        mainContainer.style.flexDirection = 'row';
        mainContainer.style.gap = '20px';
        mainContainer.style.alignItems = 'stretch';

        // Create left panel for controls
        const controlPanel = mainContainer.createDiv({ cls: 'control-panel' });
        controlPanel.style.display = 'flex';
        controlPanel.style.flexDirection = 'column';
        controlPanel.style.gap = '10px';
        controlPanel.style.flex = '0 auto';

        // Display mode dropdown
        const displaySelect = controlPanel.createEl('select', { cls: 'display-mode-select' });
        ['cover', 'auto', 'contain', 'cover-zoom'].forEach(mode => {
            const option = displaySelect.createEl('option', {
                text: mode.replace('-', ' '),
                value: mode
            });
            if (mode === this.currentDisplay) {
                option.selected = true;
            }
        });

        // Zoom slider container (initially hidden)
        const zoomContainer = controlPanel.createDiv({ cls: 'zoom-container' });
        zoomContainer.style.display = this.currentDisplay === 'cover-zoom' ? 'flex' : 'none';
        zoomContainer.style.flexDirection = 'column';
        zoomContainer.style.gap = '5px';
        zoomContainer.style.alignItems = 'center';
        zoomContainer.style.marginTop = '10px';
        zoomContainer.style.height = '100%';

        // Zoom value display
        const zoomValue = zoomContainer.createDiv({ cls: 'zoom-value' });
        zoomValue.style.fontFamily = 'var(--font-monospace)';
        zoomValue.style.fontSize = '0.9em';
        zoomValue.setText(`${this.currentZoom}%`);

        // Zoom slider
        const zoomSlider = zoomContainer.createEl('input', {
            type: 'range',
            cls: 'zoom-slider',
            attr: {
                min: '0',
                max: '500',
                step: '10',
                value: this.currentZoom
            }
        });
        zoomSlider.style.flex = '1';
        zoomSlider.style.writingMode = 'vertical-lr';
        zoomSlider.style.direction = 'rtl';

        // Event handlers for display mode and zoom
        displaySelect.addEventListener('change', () => {
            const mode = displaySelect.value;
            zoomContainer.style.display = mode === 'cover-zoom' ? 'flex' : 'none';
            this.updateDisplayMode(mode, mode === 'cover-zoom' ? this.currentZoom : null);
        });

        zoomSlider.addEventListener('input', () => {
            this.currentZoom = parseInt(zoomSlider.value);
            zoomValue.setText(`${this.currentZoom}%`);
            this.updateDisplayMode('cover-zoom', this.currentZoom);
        });

        // Height control container
        const heightContainer = mainContainer.createDiv({ cls: 'height-container' });
        heightContainer.style.display = 'flex';
        heightContainer.style.flexDirection = 'column';
        heightContainer.style.gap = '10px';
        heightContainer.style.alignItems = 'center';
        heightContainer.style.minWidth = '60px';
        heightContainer.style.flex = '0 auto';

        // Height label
        const heightLabel = heightContainer.createEl('div', { 
            text: 'Height',
            cls: 'height-label' 
        });
        heightLabel.style.color = 'var(--text-muted)';
        heightLabel.style.fontSize = '0.9em';

        // Height value display
        const heightValue = heightContainer.createDiv({ cls: 'height-value' });
        heightValue.style.fontFamily = 'var(--font-monospace)';
        heightValue.style.fontSize = '0.9em';
        heightValue.setText(`${this.currentHeight}px`);

        // Height slider
        const heightSlider = heightContainer.createEl('input', {
            type: 'range',
            cls: 'height-slider',
            attr: {
                min: '0',
                max: '1280',
                step: '10',
                value: this.currentHeight
            }
        });
        heightSlider.style.flex = '1';
        heightSlider.style.writingMode = 'vertical-lr';
        heightSlider.style.direction = 'rtl';

        heightSlider.addEventListener('input', () => {
            this.currentHeight = parseInt(heightSlider.value);
            heightValue.setText(`${this.currentHeight}px`);
            this.updateBannerHeight(this.currentHeight);
        });

        // Create target container
        const targetContainer = mainContainer.createDiv({ cls: 'target-container' });
        targetContainer.style.display = 'flex';
        targetContainer.style.flexDirection = 'column';
        targetContainer.style.gap = '10px';
        targetContainer.style.flexGrow = '1';

        // Create container for the target area
        const targetArea = targetContainer.createDiv({ cls: 'target-area' });
        targetArea.style.width = '300px';
        targetArea.style.height = '300px';
        targetArea.style.border = '2px solid var(--background-modifier-border)';
        targetArea.style.position = 'relative';
        targetArea.style.backgroundColor = 'var(--background-primary)';
        targetArea.style.cursor = 'crosshair';
        targetArea.style.flexGrow = '1';

        // Create crosshair lines
        const verticalLine = targetArea.createDiv({ cls: 'vertical-line' });
        const horizontalLine = targetArea.createDiv({ cls: 'horizontal-line' });

        // Position indicator
        const positionIndicator = targetContainer.createEl('div', { 
            cls: 'position-indicator'
        });
        positionIndicator.style.textAlign = 'center';
        positionIndicator.style.fontFamily = 'var(--font-monospace)';
        positionIndicator.style.fontSize = '0.9em';
        positionIndicator.style.color = 'var(--text-muted)';
        positionIndicator.style.width = '300px';
        positionIndicator.setText(`X: ${this.currentX}%, Y: ${this.currentY}%`);

        const updatePositionIndicator = () => {
            positionIndicator.setText(`X: ${this.currentX}%, Y: ${this.currentY}%`);
        }

        // Add styles
        this.addStyle();

        // Update crosshair position
        const updatePosition = (e) => {
            const rect = targetArea.getBoundingClientRect();
            const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
            const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
            
            verticalLine.style.left = `${x}%`;
            horizontalLine.style.top = `${y}%`;

            this.currentX = Math.round(x);
            this.currentY = Math.round(y);

            const xField = Array.isArray(this.plugin.settings.customXPositionField) 
                ? this.plugin.settings.customXPositionField[0].split(',')[0].trim()
                : this.plugin.settings.customXPositionField;

            const yField = Array.isArray(this.plugin.settings.customYPositionField) 
                ? this.plugin.settings.customYPositionField[0].split(',')[0].trim()
                : this.plugin.settings.customYPositionField;

            this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
                frontmatter[xField] = this.currentX;
                frontmatter[yField] = this.currentY;
            });

            updatePositionIndicator();
        };

        // Only update position on click
        targetArea.addEventListener('click', updatePosition);

        // Set initial crosshair position
        verticalLine.style.left = `${this.currentX}%`;
        horizontalLine.style.top = `${this.currentY}%`;

        // Reset to defaults button
        const resetButton = contentEl.createEl('button', {
            text: 'Reset to Defaults',
            cls: 'mod-cta reset-button'
        });
        resetButton.style.marginTop = '20px';
        resetButton.style.width = '100%';

        resetButton.addEventListener('click', () => {
            // Reset display mode
            displaySelect.value = 'cover';
            zoomContainer.style.display = 'none';
            this.currentDisplay = 'cover';
            this.updateDisplayMode('cover', null);

            // Reset zoom
            this.currentZoom = 100;
            zoomSlider.value = this.currentZoom;
            zoomValue.setText(`${this.currentZoom}%`);

            // Reset height
            this.currentHeight = this.plugin.settings.bannerHeight;
            heightSlider.value = this.currentHeight;
            heightValue.setText(`${this.currentHeight}px`);
            this.updateBannerHeight(this.currentHeight);

            // Reset position
            this.currentX = 50;
            this.currentY = 50;
            verticalLine.style.left = `${this.currentX}%`;
            horizontalLine.style.top = `${this.currentY}%`;
            updatePositionIndicator();

            const xField = Array.isArray(this.plugin.settings.customXPositionField) 
                ? this.plugin.settings.customXPositionField[0].split(',')[0].trim()
                : this.plugin.settings.customXPositionField;

            const yField = Array.isArray(this.plugin.settings.customYPositionField) 
                ? this.plugin.settings.customYPositionField[0].split(',')[0].trim()
                : this.plugin.settings.customYPositionField;

            this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
                frontmatter[xField] = this.currentX;
                frontmatter[yField] = this.currentY;
            });
        });

        // Add drag-and-drop functionality
        let isDragging = false;
        let offsetX, offsetY;

        modalEl.addEventListener('mousedown', (e) => {
            isDragging = true;
            offsetX = e.clientX - modalEl.getBoundingClientRect().left;
            offsetY = e.clientY - modalEl.getBoundingClientRect().top;
            modalEl.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                modalEl.style.left = `${e.clientX - offsetX}px`;
                modalEl.style.top = `${e.clientY - offsetY}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            modalEl.style.cursor = 'default';
        });

        // Set initial position of the modal
        modalEl.style.position = 'absolute';
        modalEl.style.left = `${modalEl.getBoundingClientRect().left}px`;
        modalEl.style.top = `${modalEl.getBoundingClientRect().top}px`;
    }

    addStyle() {
        const style = document.createElement('style');
        style.textContent = `
            .target-position-modal .target-area {
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .target-position-modal .vertical-line {
                position: absolute;
                background-color: var(--text-accent);
                pointer-events: none;
                width: 1px;
                height: 100%;
                left: ${this.currentX}%;
            }
            .target-position-modal .horizontal-line {
                position: absolute;
                background-color: var(--text-accent);
                pointer-events: none;
                width: 100%;
                height: 1px;
                top: ${this.currentY}%;
            }
            .target-position-modal .position-indicator {
                text-align: center;
                margin-top: 10px;
                font-family: var(--font-monospace);
            }
        `;
        document.head.appendChild(style);
    }

    onClose() {
        const style = document.head.querySelector('style:last-child');
        if (style) {
            style.remove();
        }
    }
}