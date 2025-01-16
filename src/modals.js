import { Modal, Setting, Notice, FuzzySuggestModal } from 'obsidian';

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
        this.emojis = this.getEmojis();
    }

    getEmojis() {
        // A comprehensive list of emojis with categories
        return [
            { category: "Smileys & Emotion", emojis: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕"] },
            { category: "People & Body", emojis: ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅", "👄", "💋", "🩸", "👶", "👧", "🧒", "👦", "👩", "🧑", "👨", "👩‍🦱", "🧑‍🦱", "👨‍🦱", "👩‍🦰", "🧑‍🦰", "👨‍🦰", "👱‍♀️", "👱", "👱‍♂️", "👩‍🦳", "🧑‍🦳", "👨‍🦳", "👩‍🦲", "🧑‍🦲", "👨‍🦲", "🧔", "👵", "🧓", "👴"] },
            { category: "Animals & Nature", emojis: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🪲", "🪳", "🦟", "🦗", "🕷️", "🕸️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🦣", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🦬", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🦮", "🐕‍🦺", "🐈", "🐈‍⬛", "🪶", "🐓", "🦃", "🦤", "🦚", "🦜", "🦢", "🦩", "🕊️", "🐇", "🦝", "🦨", "🦡", "🦫", "🦦", "🦥", "🐁", "🐀", "🐿️", "🦔"] },
            { category: "Food & Drink", emojis: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🫑", "🥕", "🧄", "🧅", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗", "🥘", "🫕", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "🫖", "☕", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🧉", "🍾", "🧊", "🥄", "🍴", "🍽️", "🥢", "🧂"] },
            { category: "Travel & Places", emojis: ["🌍", "🌎", "🌏", "🌐", "🗺️", "🗾", "🧭", "🏔️", "⛰️", "🌋", "🗻", "🏕️", "🏖️", "🏜️", "🏝️", "🏞️", "🏟️", "🏛️", "🏗️", "🧱", "🪨", "🪵", "🛖", "🏘️", "🏚️", "🏠", "🏡", "🏢", "🏣", "🏤", "🏥", "🏦", "🏨", "🏩", "🏪", "🏫", "🏬", "🏭", "🏯", "🏰", "💒", "🗼", "🗽", "⛪", "🕌", "🛕", "🕍", "⛩️", "🕋", "⛲", "⛺", "🌁", "🌃", "🏙️", "🌄", "🌅", "🌆", "🌇", "🌉", "♨️", "🎠", "🎡", "🎢", "💈", "🎪"] },
            { category: "Activities", emojis: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🪀", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🪃", "🥅", "⛳", "🪁", "🎣", "🤿", "🎽", "🎿", "🛷", "🥌", "🎯", "🪀", "🪁", "🎱", "🎮", "🎲", "🧩", "🎭", "🎨", "🎪", "🎤", "🎧", "🎼", "🎹", "🥁", "🪘", "🎷", "🎺", "🪗", "🎸", "🪕", "🎻", "🎬", "🏹"] },
            { category: "Objects", emojis: ["⌚", "📱", "📲", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "🖲️", "🕹️", "🗜️", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📽️", "🎞️", "📞", "☎️", "📟", "📠", "📺", "📻", "🎙️", "🎚️", "🎛️", "🧭", "⏱️", "⏲️", "⏰", "🕰️", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🕯️", "🪔", "🧯", "🛢️", "💸", "💵", "💴", "💶", "💷", "🪙", "💰", "💳", "💎", "⚖️", "🧰", "🪛", "🔧", "🔨", "⚒️", "🛠️", "⛏️", "🪚", "🔩", "⚙️", "🪜", "🧱", "⛓️", "🧲", "🔫", "💣", "🧨", "🪓", "🔪", "🗡️", "⚔️", "🛡️", "🚬", "⚰️", "🪦", "⚱️", "🏺", "🔮", "📿", "🧿", "💈", "⚗️", "🔭", "🔬", "🕳️", "🩹", "🩺", "💊", "💉", "🩸", "🧬", "🦠", "🧫", "🧪", "🌡️", "🧹", "🧺", "🧻", "🚽", "🚰", "🚿", "🛁", "🛀", "🧼", "🪥", "🪒", "🧽", "🪣", "🧴", "🛎️", "🔑", "🗝️", "🚪", "🪑", "🛋️", "🛏️", "🛌", "🧸", "🪆", "🖼️", "🪞", "🪟", "🛍️", "🛒", "🎁", "🎈", "🎏", "🎀", "🪄", "🪅", "🎊", "🎉", "🎎", "🏮", "🎐", "🧧", "✉️", "📩", "📨", "📧", "💌", "📥", "📤", "📦", "🏷️", "📪", "📫", "📬", "📭", "📮", "📯", "📜", "📃", "📄", "📑", "🧾", "📊", "📈", "📉", "🗒️", "🗓️", "📆", "📅", "🗑️", "📇", "🗃️", "🗳️", "🗄️", "📋", "📁", "📂", "🗂️", "🗞️", "📰", "📓", "📔", "📒", "📕", "📗", "📘", "📙", "📚", "📖", "🔖", "🧷", "🔗", "📎", "🖇️", "📐", "📏", "🧮", "📌", "📍", "✂️", "🖊️", "🖋️", "✒️", "🖌️", "🖍️", "📝", "✏️", "🔍", "🔎", "🔏", "🔐", "🔒", "🔓"] },
            { category: "Weather", emojis: ["☁️", "⛅", "⛈️", "🌤️", "🌥️", "🌦️", "🌧️", "🌨️", "🌩️", "🌪️", "🌫️", "🌝", "🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘", "🌙", "🌚", "🌛", "🌜", "☀️", "🌞", "⭐", "🌟", "🌠", "☄️", "🌡️", "🌬️", "🌀", "🌈", "🌂", "☂️", "☔", "⛱️", "⚡", "❄️", "☃️", "⛄", "🔥", "💧", "🌊"] },
            { category: "Symbols", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "⚛️", "🉑", "☢️", "☣️", "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷️", "✴️", "🆚", "💮", "🉐", "㊙️", "㊗️", "🈴", "🈵", "🈹", "🈲", "🅰️", "🅱️", "🆎", "🆑", "🅾️", "🆘", "❌", "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "♨️", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭", "❗", "❕", "❓", "❔", "‼️", "⁉️", "🔅", "🔆", "〽️", "⚠️", "🚸", "🔱", "⚜️", "🔰", "♻️", "✅", "🈯", "💹", "❇️", "✳️", "❎", "🌐", "💠", "Ⓜ️", "🌀", "💤", "🏧", "🚾", "♿", "🅿️", "🛗", "🈳", "🈂️", "🛂", "🛃", "🛄", "🛅", "🚹", "🚺", "🚼", "⚧", "🚻", "🚮", "🎦", "📶", "🈁", "🔣", "ℹ️", "🔤", "🔡", "🔠", "🆖", "🆗", "🆙", "🆒", "🆕", "🆓", "0️⃣", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "🔢", "#️⃣", "*️⃣", "⏏️", "▶️", "⏸️", "⏯️", "⏹️", "⏺️", "⏭️", "⏮️", "⏩", "⏪", "⏫", "⏬", "◀️", "🔼", "🔽", "➡️", "⬅️", "⬆️", "⬇️", "↗️", "↘️", "↙️", "↖️", "↕️", "↔️", "↪️", "↩️", "⤴️", "⤵️", "🔀", "🔁", "🔂", "🔄", "🔃", "🎵", "🎶", "➕", "➖", "➗", "✖️", "♾️", "💲", "💱", "™️", "©️", "®️", "〰️", "➰", "➿", "🔚", "🔙", "🔛", "🔝", "🔜", "✔️", "☑️", "🔘", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🔺", "🔻", "🔸", "🔹", "🔶", "🔷", "🔳", "🔲", "▪️", "▫️", "◾", "◽", "◼️", "◻️", "🟥", "🟧", "🟨", "🟩", "🟦", "🟪", "⬛", "⬜", "🟫", "🔈", "🔇", "🔉", "🔊", "🔔", "🔕", "📣", "📢", "👁️‍🗨️", "💬", "💭", "🗯️", "♠️", "♣️", "♥️", "♦️", "🃏", "🎴", "🀄"] },            
            { category: "Flags", emojis: ["🏳️", "🏴", "🏁", "🚩", "🏳️‍🌈", "🏳️‍⚧️", "🏴‍☠️", "🇦🇫", "🇦🇽", "🇦🇱", "🇩🇿", "🇦🇸", "🇦🇩", "🇦🇴", "🇦🇮", "🇦🇶", "🇦🇬", "🇦🇷", "🇦🇲", "🇦🇼", "🇦🇺", "🇦🇹", "🇦🇿", "🇧🇸", "🇧🇭", "🇧🇩", "🇧🇧", "🇧🇾", "🇧🇪", "🇧🇿", "🇧🇯", "🇧🇲", "🇧🇹", "🇧🇴", "🇧🇦", "🇧🇼", "🇧🇷", "🇮🇴", "🇻🇬", "🇧🇳", "🇧🇬", "🇧🇫", "🇧🇮", "🇰🇭", "🇨🇲", "🇨🇦", "🇮🇨", "🇨🇻", "🇧🇶", "🇰🇾", "🇨🇫", "🇹🇩", "🇨🇱", "🇨🇳", "🇨🇽", "🇨🇨", "🇨🇴", "🇰🇲", "🇨🇬", "🇨🇩", "🇨🇰", "🇨🇷", "🇨🇮", "🇭🇷", "🇨🇺", "🇨🇼", "🇨🇾", "🇨🇿", "🇩🇰", "🇩🇯", "🇩🇲", "🇩🇴", "🇪🇨", "🇪🇬", "🇸🇻", "🇬🇶", "🇪🇷", "🇪🇪", "🇪🇹", "🇪🇺", "🇫🇰", "🇫🇴", "🇫🇯", "🇫🇮", "🇫🇷", "🇬🇫", "🇵🇫", "🇹🇫", "🇬🇦", "🇬🇲", "🇬🇪", "🇩🇪", "🇬🇭", "🇬🇮", "🇬🇷", "🇬🇱", "🇬🇩", "🇬🇵", "🇬🇺", "🇬🇹", "🇬🇬", "🇬🇳", "🇬🇼", "🇬🇾", "🇭🇹", "🇭🇳", "🇭🇰", "🇭🇺", "🇮🇸", "🇮🇳", "🇮🇩", "🇮🇷", "🇮🇶", "🇮🇪", "🇮🇲", "🇮🇱", "🇮🇹", "🇯🇲", "🇯🇵", "🎌", "🇯🇪", "🇯🇴", "🇰🇿", "🇰🇪", "🇰🇮", "🇽🇰", "🇰🇼", "🇰🇬", "🇱🇦", "🇱🇻", "🇱🇧", "🇱🇸", "🇱🇷", "🇱🇾", "🇱🇮", "🇱🇹", "🇱🇺", "🇲🇴", "🇲🇰", "🇲🇬", "🇲🇼", "🇲🇾", "🇲🇻", "🇲🇱", "🇲🇹", "🇲🇭", "🇲🇶", "🇲🇷", "🇾🇹", "🇲🇽", "🇫🇲", "🇲🇩", "🇲🇨", "🇲🇳", "🇲🇪", "🇲🇸", "🇲🇦", "🇲🇿", "🇲🇲", "🇳🇦", "🇳🇷", "🇳🇵", "🇳🇱", "🇳🇨", "🇳🇿", "🇳🇮", "🇳🇪", "🇳🇬", "🇳🇺", "🇳🇫", "🇰🇵", "🇲🇵", "🇳🇴", "🇴🇲", "🇵🇰", "🇵🇼", "🇵🇸", "🇵🇦", "🇵🇬", "🇵🇾", "🇵🇪", "🇵🇭", "🇵🇳", "🇵🇱", "🇵🇹", "🇵🇷", "🇶🇦", "🇷🇪", "🇷🇴", "🇷🇺", "🇷🇼", "🇼🇸", "🇸🇲", "🇸🇦", "🇸🇳", "🇷🇸", "🇸🇨", "🇸🇱", "🇸🇬", "🇸🇽", "🇸🇰", "🇸🇮", "🇬🇸", "🇸🇧", "🇸🇴", "🇿🇦", "🇰🇷", "🇸🇸", "🇪🇸", "🇱🇰", "🇧🇱", "🇸🇭", "🇰🇳", "🇱🇨", "🇵🇲", "🇻🇨", "🇸🇩", "🇸🇷", "🇸🇿", "🇸🇪", "🇨🇭", "🇸🇾", "🇹🇼", "🇹🇯", "🇹🇿", "🇹🇭", "🇹🇱", "🇹🇬", "🇹🇰", "🇹🇴", "🇹🇹", "🇹🇳", "🇹🇷", "🇹🇲", "🇹🇨", "🇹🇻", "🇻🇮", "🇺🇬", "🇺🇦", "🇦🇪", "🇬🇧", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "🇺🇳", "🇺🇸", "🇺🇾", "🇺🇿", "🇻🇺", "🇻🇦", "🇻🇪", "🇻🇳", "🇼🇫", "🇪🇭", "🇾🇪", "🇿🇲", "🇿🇼"] }
        ];
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
        const emojiDescriptions = {
            // Smileys & Emotion
            '☹️': 'frowning face sad unhappy upset',
            '🤐': 'zipper-mouth face quiet silence secret mute',
            '🤒': 'face with thermometer sick ill fever temperature',
            '🤓': 'nerd face glasses smart geek studious',
            '🤔': 'thinking face thoughtful curious pondering',
            '🤕': 'face with head-bandage injury hurt bandaged',
            '🤗': 'hugging face hug comfort happy',
            '🤢': 'nauseated face sick vomit gross disgusted',
            '🤣': 'rolling on the floor laughing happy cry rofl lol',
            '🤤': 'drooling face food hungry desire want',
            '🤥': 'lying face liar nose growing pinocchio',
            '🤧': 'sneezing face sick cold allergy achoo',
            '🤨': 'face with raised eyebrow skeptical suspicious doubt',
            '🤩': 'star-struck excited amazed starry-eyed',
            '🤪': 'zany face crazy silly wild goofy',
            '🤫': 'shushing face quiet silence secret',
            '🤬': 'face with symbols on mouth swearing angry cursing',
            '🤭': 'face with hand over mouth giggling surprise',
            '🤮': 'face vomiting sick throw up gross ill',
            '🤯': 'exploding head mind blown shocked amazed',
            '🥰': 'smiling face with hearts love heart adore affection',
            '🥱': 'yawning face sleepy tired bored',
            '🥳': 'partying face celebration party festive',
            '🥴': 'woozy face drunk dizzy tipsy disoriented',
            '🥵': 'hot face heat sweating overheated',
            '🥶': 'cold face freezing ice frozen',
            '🥺': 'pleading face begging puppy eyes',
            '🧐': 'face with monocle smart sophisticated examine',
            '😀': 'grinning face smile happy joyful',
            '😁': 'beaming face with smiling eyes grin happy proud',
            '😂': 'face with tears of joy laughing crying happy lol',
            '😃': 'grinning face with big eyes smile happy excited',
            '😄': 'grinning face with smiling eyes happy joy laugh',
            '😅': 'grinning face with sweat happy relief nervous',
            '😇': 'smiling face with halo angel innocent blessed',
            '😉': 'winking face flirt playful joke',
            '😊': 'smiling face with smiling eyes happy sweet shy',
            '😋': 'face savoring food yummy delicious tasty',
            '😌': 'relieved face calm relaxed content',
            '😍': 'smiling face with heart-eyes love heart adore',
            '😎': 'smiling face with sunglasses cool confident',
            '😏': 'smirking face flirt smug suggestive',
            '😐': 'neutral face expressionless blank meh',
            '😑': 'expressionless face blank unimpressed',
            '😒': 'unamused face unhappy annoyed unimpressed',
            '😓': 'downcast face with sweat tired stressed',
            '😔': 'pensive face sad thoughtful reflective',
            '😕': 'confused face puzzled unsure',
            '😖': 'confounded face confused frustrated',
            '😗': 'kissing face love affection',
            '😘': 'face blowing a kiss love heart flirt',
            '😙': 'kissing face with smiling eyes love happy',
            '😚': 'kissing face with closed eyes love shy',
            '😛': 'face with tongue playful silly taste',
            '😜': 'winking face with tongue playful silly joke',
            '😝': 'squinting face with tongue playful silly ecstatic',
            '😞': 'disappointed face sad unhappy dejected',
            '😟': 'worried face concerned anxious nervous',
            '😠': 'angry face mad furious',
            '😡': 'pouting face angry rage mad',
            '😢': 'crying face sad tear unhappy',
            '😣': 'persevering face struggling frustrated',
            '😤': 'face with steam from nose angry frustrated proud',
            '😥': 'sad but relieved face disappointed relieved',
            '😦': 'frowning face with open mouth shock horror',
            '😧': 'anguished face shocked scared distressed',
            '😨': 'fearful face scared worried shocked',
            '😩': 'weary face tired frustrated exhausted',
            '😪': 'sleepy face tired drowsy rest',
            '😫': 'tired face exhausted weary',
            '😬': 'grimacing face awkward nervous uncomfortable',
            '😭': 'loudly crying face sad sobbing upset',
            '😮': 'face with open mouth surprise shock wow gasp',
            '😯': 'hushed face surprised shocked stunned',
            '😰': 'anxious face with sweat nervous worried',
            '😱': 'face screaming in fear scared shocked',
            '😲': 'astonished face shocked surprised amazed wow',
            '😳': 'flushed face blushing embarrassed surprised',
            '😴': 'sleeping face sleep zzz tired rest',
            '😵': 'dizzy face spiral confused disoriented',
            '😶': 'face without mouth speechless silent blank',
            '😷': 'face with medical mask sick ill covid virus',
            '🙁': 'slightly frowning face sad disappointed',
            '🙂': 'slightly smiling face happy content',
            '🙃': 'upside-down face silly playful ironic',
            '🙄': 'face with rolling eyes exasperated annoyed',

            // People & Body
            '☝️': 'index pointing up direction gesture',
            '✊': 'raised fist power solidarity strength',
            '✋': 'raised hand stop high five palm',
            '✌️': 'victory hand peace victory yeah',
            '✍️': 'writing hand write note signature',
            '👀': 'eyes look see watch',
            '👁️': 'eye look see watch',
            '👂': 'ear hear listen sound',
            '👃': 'nose smell sniff',
            '👄': 'mouth lips kiss speak',
            '👅': 'tongue taste lick',
            '👆': 'backhand index pointing up direction gesture',
            '👇': 'backhand index pointing down direction gesture',
            '👈': 'backhand index pointing left direction gesture',
            '👉': 'backhand index pointing right direction gesture',
            '👊': 'oncoming fist punch bro fist bump',
            '👋': 'waving hand hello goodbye wave greeting',
            '👌': 'ok hand perfect agree approval',
            '👍': 'thumbs up approve like yes good',
            '👎': 'thumbs down disapprove dislike no bad',
            '👏': 'clapping hands praise applause congratulations bravo',
            '👐': 'open hands hug welcome',
            '👦': 'boy child young male kid',
            '👧': 'girl child young female kid',
            '👨': 'man male adult person gender',
            '👨‍🦰': 'man red hair male person ginger hairstyle',
            '👨‍🦱': 'man curly hair male person hairstyle',
            '👨‍🦲': 'man bald male person no hair',
            '👨‍🦳': 'man white hair male person hairstyle',
            '👩': 'woman female adult person gender',
            '👩‍🦰': 'woman red hair female person ginger hairstyle',
            '👩‍🦱': 'woman curly hair female person hairstyle',
            '👩‍🦲': 'woman bald female person no hair',
            '👩‍🦳': 'woman white hair female person hairstyle',
            '👱': 'person blonde hair human hairstyle',
            '👱‍♀️': 'woman blonde hair female person hairstyle',
            '👱‍♂️': 'man blonde hair male person hairstyle',
            '👴': 'old man elderly male person senior',
            '👵': 'old woman elderly female person senior',
            '👶': 'baby child infant young newborn',
            '💅': 'nail polish beauty manicure cosmetics',
            '💋': 'kiss mark lips love romance',
            '💪': 'flexed biceps strong muscle flex',
            '🖐️': 'hand with fingers splayed stop halt palm',
            '🖕': 'middle finger rude offensive gesture',
            '🖖': 'vulcan salute star trek spock prosper',
            '🤌': 'pinched fingers italian what gesture',
            '🤏': 'pinching hand small tiny little',
            '🤘': 'sign of the horns rock metal music',
            '🤙': 'call me hand phone hang loose',
            '🤚': 'raised back of hand stop halt',
            '🤛': 'left-facing fist bump greeting',
            '🤜': 'right-facing fist bump greeting',
            '🤝': 'handshake deal agreement partnership',
            '🤞': 'crossed fingers luck hopeful wish',
            '🤟': 'love-you gesture rock love sign',
            '🤲': 'palms up together pray beg',
            '🤳': 'selfie camera phone photo',
            '🦴': 'bone skeleton body structure',
            '🦵': 'leg kick foot limb',
            '🦶': 'foot toe kick limb',
            '🦷': 'tooth teeth dental',
            '🦻': 'ear with hearing aid accessibility deaf',
            '🦾': 'mechanical arm robot prosthetic',
            '🦿': 'mechanical leg robot prosthetic',
            '🧑': 'person adult gender-neutral human',
            '🧑‍🦰': 'person red hair human ginger hairstyle',
            '🧑‍🦱': 'person curly hair human hairstyle',
            '🧑‍🦲': 'person bald human no hair',
            '🧑‍🦳': 'person white hair human hairstyle',
            '🧒': 'child young kid gender-neutral youth',
            '🧓': 'older person elderly human senior',
            '🧔': 'person beard facial hair face',
            '🧠': 'brain mind intellect thinking',
            '🩸': 'drop of blood injury period medical',
            '🫀': 'anatomical heart organ cardiac',
            '🫁': 'lungs breathing organ respiratory',
            '🙌': 'raising hands celebration praise hooray',
            '🙏': 'folded hands please thank you pray hope',

            // Food & Drink
            '☕': 'hot beverage coffee tea drink',
            '🌰': 'chestnut food nut seed',
            '🍘': 'rice cracker japanese food snack',
            '🍙': 'rice ball japanese food onigiri',
            '🍚': 'cooked rice food asian grain',
            '🍛': 'curry rice food indian spicy',
            '🍜': 'steaming bowl noodles ramen soup',
            '🍡': 'dango japanese food dessert sweet',
            '🍢': 'oden japanese food skewer',
            '🍣': 'sushi japanese food fish rice',
            '🍤': 'fried shrimp seafood tempura',
            '🍥': 'fish cake japanese food naruto',
            '🍦': 'soft ice cream dessert cold sweet',
            '🍧': 'shaved ice dessert cold sweet',
            '🍨': 'ice cream dessert cold sweet',
            '🍩': 'doughnut sweet dessert breakfast',
            '🍪': 'cookie sweet dessert biscuit',
            '🍫': 'chocolate bar candy sweet dessert',
            '🍬': 'candy sweet dessert sugar',
            '🍭': 'lollipop candy sweet dessert',
            '🍮': 'custard dessert sweet pudding',
            '🍯': 'honey pot sweet bee food',
            '🍰': 'shortcake dessert sweet slice',
            '🍱': 'bento box japanese food lunch',
            '🍲': 'pot of food stew soup cooking',
            '🍴': 'fork and knife cutlery silverware',
            '🍵': 'teacup without handle green tea drink',
            '🍶': 'sake japanese drink alcohol rice wine',
            '🍷': 'wine glass drink alcohol beverage',
            '🍸': 'cocktail glass drink alcohol martini',
            '🍹': 'tropical drink alcohol beverage cocktail',
            '🍺': 'beer mug drink alcohol beverage',
            '🍻': 'clinking beer mugs drink alcohol cheers',
            '🍼': 'baby bottle milk drink infant',
            '🍽️': 'fork knife plate cutlery dining',
            '🍾': 'bottle with popping cork celebration drink',
            '🍿': 'popcorn movie snack corn',
            '🎂': 'birthday cake celebration dessert',
            '🥂': 'clinking glasses drink alcohol champagne',
            '🥃': 'tumbler glass drink alcohol whiskey',
            '🥄': 'spoon cutlery silverware utensil',
            '🥗': 'green salad healthy food vegetables',
            '🥛': 'glass of milk drink dairy beverage',
            '🥜': 'peanuts food nuts legumes',
            '🥟': 'dumpling food asian chinese',
            '🥠': 'fortune cookie chinese food prediction',
            '🥢': 'chopsticks utensils asian eating',
            '🥤': 'cup with straw drink beverage soda',
            '🥧': 'pie dessert food baked',
            '🥮': 'moon cake chinese food festival',
            '🦪': 'oyster seafood shellfish pearl',
            '🧁': 'cupcake dessert sweet cake',
            '🧃': 'beverage box juice drink straw',
            '🧉': 'mate drink beverage tea south american',
            '🧊': 'ice cube cold frozen water',
            '🧋': 'bubble tea drink boba taiwanese',
            '🫐': 'blueberries fruit food berries',
            '🫑': 'bell pepper vegetable food',
            '🫒': 'olive fruit food mediterranean',
            '🫓': 'flatbread food pita naan',
            '🫔': 'tamale food mexican wrapped',
            '🫕': 'fondue food cheese melted',
            '🫖': 'teapot drink hot beverage',

            // Animals & Nature
            '🐅': 'tiger cat wild animal dangerous',
            '🐆': 'leopard cat wild animal spots',
            '🐈‍⬛': 'black cat feline animal pet',
            '🐊': 'crocodile alligator reptile dangerous',
            '🐋': 'whale sea creature marine mammal',
            '🐕‍🦺': 'service dog assistance animal',
            '🐙': 'octopus sea creature tentacles',
            '🐟': 'fish sea creature swimming',
            '🐠': 'tropical fish sea creature aquarium',
            '🐡': 'blowfish pufferfish sea creature',
            '🐬': 'dolphin sea creature marine mammal',
            '🐳': 'spouting whale sea creature marine mammal',
            '🐿️': 'chipmunk animal squirrel',
            '🕷️': 'spider arachnid bug insect',
            '🕸️': 'spider web cobweb arachnid',
            '🦀': 'crab seafood shellfish',
            '🦂': 'scorpion arachnid dangerous',
            '🦈': 'shark sea creature dangerous fish',
            '🦍': 'gorilla ape primate monkey',
            '🦐': 'shrimp seafood shellfish',
            '🦑': 'squid sea creature tentacles',
            '🦓': 'zebra stripes wild animal',
            '🦔': 'hedgehog animal spiky cute',
            '🦕': 'sauropod dinosaur extinct long-neck',
            '🦖': 'tyrannosaurus rex dinosaur extinct',
            '🦗': 'cricket insect chirping bug',
            '🦞': 'lobster seafood shellfish',
            '🦡': 'badger animal woodland',
            '🦣': 'mammoth extinct animal prehistoric',
            '🦤': 'dodo extinct bird animal',
            '🦥': 'sloth slow animal lazy',
            '🦦': 'otter swimming animal water',
            '🦧': 'orangutan ape primate monkey',
            '🦨': 'skunk animal smelly spray',
            '🦩': 'flamingo pink bird animal',
            '🦫': 'beaver animal dam builder',
            '🦬': 'bison buffalo animal wild',
            '🦮': 'guide dog service animal assistance',
            '🪶': 'feather bird plume light',

            // Travel & Places
            '♨️': 'hot springs steam bath spa onsen',
            '⛩️': 'shinto shrine building religious japanese',
            '⛪': 'church building religious christian worship',
            '⛰️': 'mountain nature landscape peak hill',
            '⛲': 'fountain water decoration park plaza',
            '⛺': 'tent camping outdoors shelter vacation',
            '🌁': 'foggy city weather mist urban',
            '🌃': 'night with stars city evening urban',
            '🌄': 'sunrise over mountains morning dawn nature',
            '🌅': 'sunrise morning dawn sun nature',
            '🌆': 'cityscape at dusk evening urban sunset',
            '🌇': 'sunset over buildings evening urban',
            '🌉': 'bridge at night city urban evening',
            '🌋': 'volcano mountain eruption nature disaster',
            '🌍': 'globe showing europe africa earth world planet',
            '🌎': 'globe showing americas earth world planet',
            '🌏': 'globe showing asia australia earth world planet',
            '🌐': 'globe with meridians earth world planet network',
            '🎠': 'carousel horse amusement park ride',
            '🎡': 'ferris wheel amusement park ride fair',
            '🎢': 'roller coaster amusement park ride thrill',
            '🎪': 'circus tent entertainment show performance',
            '🏔️': 'snow capped mountain peak nature landscape',
            '🏕️': 'camping tent outdoors nature vacation',
            '🏖️': 'beach with umbrella vacation summer sand sea',
            '🏗️': 'building construction site development crane',
            '🏘️': 'houses buildings residential neighborhood',
            '🏙️': 'cityscape urban buildings skyline',
            '🏚️': 'derelict house abandoned building old',
            '🏛️': 'classical building architecture historic landmark',
            '🏜️': 'desert hot dry sand nature landscape',
            '🏝️': 'desert island beach vacation tropical',
            '🏞️': 'national park nature landscape scenic',
            '🏟️': 'stadium sports arena event venue',
            '🏠': 'house building home residential dwelling',
            '🏡': 'house with garden home yard residential',
            '🏢': 'office building business work corporate',
            '🏣': 'japanese post office building mail service',
            '🏤': 'post office building mail service',
            '🏥': 'hospital building medical healthcare emergency',
            '🏦': 'bank building money finance business',
            '🏨': 'hotel building lodging accommodation travel',
            '🏩': 'love hotel building romance accommodation',
            '🏪': 'convenience store building shop retail',
            '🏫': 'school building education learning',
            '🏬': 'department store building shopping retail',
            '🏭': 'factory building industrial manufacturing',
            '🏯': 'japanese castle building landmark historic',
            '🏰': 'castle building landmark historic medieval',
            '💈': 'barber pole haircut salon shop',
            '💒': 'wedding chapel marriage ceremony church',
            '🕋': 'kaaba building religious islamic mecca',
            '🕌': 'mosque building religious islamic worship',
            '🕍': 'synagogue building religious jewish worship',
            '🗺️': 'world map geography atlas travel global',
            '🗻': 'mount fuji japan mountain landmark nature',
            '🗼': 'tokyo tower landmark japan building',
            '🗽': 'statue of liberty landmark usa freedom',
            '🗾': 'map of japan geography country asian',
            '🧭': 'compass navigation direction travel tool',
            '🧱': 'brick construction building material wall',
            '🪨': 'rock stone nature boulder mineral',
            '🪵': 'wood log nature lumber timber material',
            '🛕': 'hindu temple building religious worship',
            '🛖': 'hut house shelter primitive dwelling',

            // Activities
            '⚽': 'soccer ball football sport team game',
            '⚾': 'baseball sport team game ball bat',
            '⛳': 'flag in hole golf sport course game',
            '🎣': 'fishing pole rod sport hook line',
            '🎤': 'microphone karaoke sing music performance',
            '🎧': 'headphone music audio listen sound',
            '🎨': 'artist palette art painting creativity',
            '🎬': 'clapper board movie film director action',
            '🎭': 'performing arts theater drama masks',
            '🎮': 'video game controller gaming play',
            '🎯': 'direct hit target dart game sport',
            '🎱': 'pool 8 ball billiards game sport cue',
            '🎲': 'game die dice gambling play random',
            '🎷': 'saxophone jazz instrument music brass',
            '🎸': 'guitar instrument music strings rock',
            '🎹': 'musical keyboard piano instrument keys',
            '🎺': 'trumpet brass instrument music fanfare',
            '🎻': 'violin instrument music strings classical',
            '🎼': 'musical score notes sheet music',
            '🎽': 'running shirt athletics sport race',
            '🎾': 'tennis sport racket ball court game',
            '🎿': 'skis winter sport snow mountain',
            '🏀': 'basketball sport team game ball',
            '🏈': 'american football sport team game ball',
            '🏉': 'rugby football sport team game ball',
            '🏏': 'cricket sport team game bat ball',
            '🏐': 'volleyball sport team game ball net',
            '🏑': 'field hockey stick sport team game ball',
            '🏒': 'ice hockey stick sport team game puck',
            '🏓': 'ping pong table tennis sport game paddle',
            '🏸': 'badminton sport game racket shuttlecock',
            '🏹': 'bow and arrow archery sport target shoot',
            '🤿': 'diving mask snorkel underwater swim sport',
            '🥁': 'drum percussion instrument music rhythm',
            '🥅': 'goal net sports hockey soccer score',
            '🥌': 'curling stone winter sport ice game',
            '🥍': 'lacrosse sport team game stick ball',
            '🥎': 'softball sport team game ball bat',
            '🥏': 'flying disc frisbee sport game outdoor',
            '🧩': 'puzzle piece jigsaw game entertainment',
            '🪀': 'yo-yo toy game skill string',
            '🪁': 'kite flying outdoor toy wind sport',
            '🪃': 'boomerang sport throw return australian',
            '🪕': 'banjo instrument music strings folk',
            '🪗': 'accordion instrument music squeeze box',
            '🪘': 'long drum percussion instrument music',
            '🛷': 'sled winter sport snow ride',

            // Weather
            '☁️': 'cloud',
            '⛅': 'sun behind cloud',
            '⛈️': 'cloud with lightning and rain',
            '🌤️': 'sun behind one cloud',
            '🌥️': 'sun behind two clouds',
            '🌦️': 'sun behind three clouds',
            '🌧️': 'cloud with rain',
            '🌨️': 'cloud with snow',
            '🌩️': 'cloud with lightning',
            '🌪️': 'cloud with tornado',
            '🌫️': 'cloud with fog',
            '🌝': 'full moon',
            '🌑': 'new moon',
            '🌒': 'waxing crescent moon',
            '🌓': 'waxing gibbous moon',
            '🌔': 'full moon',
            '🌕': 'waning gibbous moon',
            '🌖': 'waning crescent moon',
            '🌗': 'last quarter moon',
            '🌘': 'first quarter moon',
            '🌙': 'crescent moon',
            '🌚': 'new moon face',
            '🌛': 'first quarter moon face',
            '🌜': 'last quarter moon face',
            '☀️': 'sun',
            '🌞': 'sun with face',
            '⭐': 'star',
            '🌟': 'shooting star',
            '🌠': 'milky way',
            '☄️': 'comet',
            '🌡️': 'thermometer',
            '🌬️': 'wind',
            '🌀': 'cyclone',
            '🌈': 'rainbow',
            '🌂': 'umbrella',
            '☂️': 'umbrella',
            '☔': 'umbrella with rain',
            '⛱️': 'umbrella on beach',
            '⚡': 'high voltage',
            '❄️': 'snowflake',
            '☃️': 'snowman',
            '⛄': 'snowman without snow',
            '🔥': 'fire',
            '💧': 'droplet',
            '🌊': 'wave',

            // Objects
            '⌚': 'watch timekeeping device',
            '⌛': 'hourglass timer device',
            '⌨️': 'keyboard input device',
            '⏰': 'alarm clock timekeeping device',
            '⏱️': 'stopwatch timer device',
            '⏲️': 'timer device',
            '⏳': 'stopwatch timer device',
            '☎️': 'telephone handset communication device',
            '⚒️': 'wrench and hammer tool fixing device',
            '⚔️': 'shield and sword defensive weapon',
            '⚖️': 'scale balance weight device',
            '⚙️': 'gear mechanical device',
            '⚰️': 'coffin casket burial container',
            '⚱️': 'hourglass memorial timer',
            '⛏️': 'pickaxe tool mining device',
            '⛓️': 'chain link security device',
            '✂️': 'scissors cutting tool',
            '✉️': 'envelope letter mail',
            '✏️': 'pencil writing tool',
            '✒️': 'pen writing tool',
            '🎀': 'bow ribbon decoration',
            '🎁': 'gift wrapped package',
            '🎈': 'balloon decoration',
            '🎉': 'party confetti decoration',
            '🎊': 'party popper decoration',
            '🎎': 'traditional japanese doll',
            '🎏': 'origami paper decoration',
            '🎐': 'envelope letter mail',
            '🎙️': 'microphone sound amplification device',
            '🎚️': 'headphones audio listening device',
            '🎛️': 'speaker sound amplification device',
            '🎞️': 'video cassette recording device',
            '🎥': 'video camera recording device',
            '🏮': 'lantern festival decoration',
            '🏷️': 'price tag label',
            '🏺': 'bell gong musical instrument',
            '💌': 'envelope letter mail',
            '💎': 'gemstone jewelry accessory',
            '💡': 'light bulb lighting device',
            '💣': 'bomb explosive weapon',
            '💰': 'money currency finance device',
            '💳': 'credit card finance device',
            '💴': 'money currency finance device',
            '💵': 'money currency finance device',
            '💶': 'money currency finance device',
            '💷': 'money currency finance device',
            '💸': 'money currency finance device',
            '💻': 'computer desktop',
            '💽': 'computer disk storage device',
            '💾': 'floppy disk storage device',
            '💿': 'compact disc storage device',
            '📀': 'dvd disc storage device',
            '📁': 'file folder storage',
            '📂': 'file folder storage',
            '📃': 'page of paper',
            '📄': 'page of paper',
            '📅': 'calendar date',
            '📆': 'calendar date',
            '📇': 'file folder storage',
            '📈': 'chart graph',
            '📉': 'chart graph',
            '📊': 'chart graph',
            '📋': 'clipboard storage container',
            '📌': 'pushpin sticky note marker',
            '📍': 'pin sticky note marker',
            '📎': 'paperclip attachment',
            '📏': 'ruler measuring tool',
            '📐': 'ruler measuring tool',
            '📑': 'page of paper',
            '📒': 'book book',
            '📓': 'book book',
            '📔': 'book book',
            '📕': 'book book',
            '📖': 'book book',
            '📗': 'book book',
            '📘': 'book book',
            '📙': 'book book',
            '📚': 'book book',
            '📜': 'scroll parchment paper',
            '📝': 'pencil writing tool',
            '📞': 'telephone handset communication device',
            '📟': 'pager pager device',
            '📠': 'television television device',
            '📡': 'satellite communication device',
            '📤': 'envelope letter mail',
            '📥': 'envelope letter mail',
            '📦': 'package shipping container',
            '📧': 'envelope letter mail',
            '📨': 'envelope letter mail',
            '📩': 'envelope letter mail',
            '📪': 'envelope letter mail',
            '📫': 'envelope letter mail',
            '📬': 'envelope letter mail',
            '📭': 'envelope letter mail',
            '📮': 'envelope letter mail',
            '📯': 'envelope letter mail',
            '📰': 'newspaper newspaper',
            '📱': 'smartphone mobile phone',
            '📲': 'smartphone mobile phone',
            '📷': 'camera photo imaging device',
            '📸': 'camera photo imaging device',
            '📹': 'video camera recording device',
            '📺': 'television television device',
            '📻': 'radio broadcasting device',
            '📼': 'vhs tape storage device',
            '📽️': 'video cassette recording device',
            '📿': 'prayer beads religious accessory',
            '🔋': 'battery power supply device',
            '🔌': 'battery power supply device',
            '🔍': 'magnifying glass search tool',
            '🔎': 'magnifying glass search tool',
            '🔏': 'lock security device',
            '🔐': 'lock security device',
            '🔑': 'key lock security device',
            '🔒': 'lock security device',
            '🔓': 'lock security device',
            '🔖': 'bookmark page marker',
            '🔗': 'link page marker',
            '🔦': 'flashlight flashlight device',
            '🔧': 'wrench tool fixing device',
            '🔨': 'hammer tool striking device',
            '🔩': 'gear mechanical device',
            '🔫': 'gun firearm weapon',
            '🔮': 'crystal ball fortune telling device',
            '🕯️': 'candle light source',
            '🕰️': 'hourglass timer device',
            '🕹️': 'joystick game controller',
            '🖇️': 'paperclip attachment',
            '🖊️': 'pen writing tool',
            '🖋️': 'pen writing tool',
            '🖌️': 'paintbrush painting tool',
            '🖍️': 'paintbrush painting tool',
            '🖥️': 'computer monitor screen',
            '🖨️': 'printer output device',
            '🖱️': 'computer mouse pointing device',
            '🖲️': 'touchscreen input device',
            '🖼️': 'picture frame photo display',
            '🗂️': 'file folder storage',
            '🗃️': 'file folder storage',
            '🗄️': 'file folder storage',
            '🗑️': 'trash can waste disposal',
            '🗒️': 'notebook paper',
            '🗓️': 'calendar paper',
            '🗜️': 'clamp tool mechanical device',
            '🗝️': 'lock and key security device',
            '🗞️': 'file folder storage',
            '🗡️': 'sword weapon',
            '🗳️': 'file folder storage',
            '🧧': 'red envelope money gift',
            '🧨': 'firecracker explosive weapon',
            '🧮': 'calculator arithmetic device',
            '🧯': 'fire extinguisher safety device',
            '🧰': 'toolbox tool storage device',
            '🧲': 'magnet magnetic field device',
            '🧴': 'lotion cosmetic product',
            '🧷': 'link page marker',
            '🧸': 'pillow cushion',
            '🧹': 'broom cleaning tool',
            '🧺': 'basket storage container',
            '🧼': 'soap dispenser',
            '🧽': 'washcloth cleaning tool',
            '🧾': 'receipt invoice',
            '🧿': 'magic wand wizard spell casting device',
            '🪄': 'magic wand wizard witch spell',
            '🪅': 'piñata party celebration mexican',
            '🪆': 'nesting dolls russian matryoshka toy',
            '🪑': 'bed bed',
            '🪒': 'razor shaving tool',
            '🪓': 'axe tool chopping device',
            '🪔': 'candle light source',
            '🪙': 'coin currency finance device',
            '🪚': 'saw tool woodworking device',
            '🪛': 'screwdriver tool fixing device',
            '🪜': 'lever mechanical device',
            '🪞': 'mirror reflection device',
            '🪟': 'curtain window covering',
            '🪡': 'sewing needle thread craft',
            '🪢': 'knot rope tied string',
            '🪣': 'bucket pail container water',
            '🪤': 'mouse trap rodent catch',
            '🪥': 'toothbrush dental hygiene tool',
            '🪦': 'headstone grave cemetery death',
            '🪧': 'placard sign protest announcement',
            '🪩': 'mirror ball disco party dance',
            '🪪': 'identification card id license',
            '🪫': 'low battery empty power dying',
            '🪬': 'hamsa amulet protection luck',
            '🪭': 'wireless speaker audio bluetooth',
            '🪮': 'folding hand fan cooling breeze',
            '🪯': 'khanda sikh religion symbol',
            '🪰': 'fly insect bug pest',
            '🪱': 'worm animal earth crawler',
            '🪲': 'beetle insect bug',
            '🪳': 'cockroach insect bug pest',
            '🪴': 'potted plant garden indoor nature',
            '🪷': 'lotus flower buddhism peace',
            '🪸': 'coral ocean sea marine',
            '🪹': 'empty nest bird home',
            '🪺': 'nest with eggs bird home',
            '🫧': 'bubbles soap water floating',
            '🫸': 'rightwards hand pushing right',
            '🚪': 'door door',
            '🚬': 'cigarette smoking device',
            '🚰': 'water closet flushing device',
            '🚽': 'toilet flushing device',
            '🚿': 'shower shower head',
            '🛀': 'bathroom bathtub',
            '🛁': 'bathroom bathtub',
            '🛋️': 'sofa couch seating',
            '🛌': 'bed and pillow sleeping arrangement',
            '🛍️': 'shopping bag retail shopping',
            '🛎️': 'bell doorbell communication device',
            '🛏️': 'bed bed',
            '🛒': 'shopping cart retail shopping',
            '🛠️': 'toolbox tool storage device',
            '🛢️': 'oil barrel petroleum product',
            '🫹': 'leftwards hand pushing left',
            '🫺': 'palm down hand below under',
        };
        return (emojiDescriptions[emoji] || '').toLowerCase();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 