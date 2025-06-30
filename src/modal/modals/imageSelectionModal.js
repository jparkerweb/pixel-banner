import { Modal, Notice, Setting } from "obsidian";
import { GenerateAIBannerModal } from './generateAIBannerModal.js'
import { FolderSelectionModal } from './folderSelectionModal.js';
import { SaveImageModal } from './saveImageModal.js';
import { SelectPixelBannerModal } from './selectPixelBannerModal';


// ---------------------------
// -- Image Selection Modal --
// ---------------------------
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
            .filter(file => file.extension.toLowerCase().match(/^(jpg|jpeg|png|gif|bmp|svg|webp|avif|mp4|mov)$/));
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    async confirmDelete(file) {
        return new Promise(resolve => {
            const modal = new Modal(this.app);
            modal.contentEl.createEl('h2', { text: 'Delete Image' });
            modal.contentEl.createEl('p', { text: `Are you sure you want to delete "${file.name}"?` });
            
            const buttonContainer = modal.contentEl.createDiv();
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'flex-end';
            buttonContainer.style.gap = '10px';
            
            const cancelButton = buttonContainer.createEl('button', { text: 'Cancel' });
            const deleteButton = buttonContainer.createEl('button', { 
                text: 'Delete',
                cls: 'mod-warning'
            });
            
            cancelButton.onclick = () => {
                modal.close();
                resolve(false);
            };
            deleteButton.onclick = () => {
                modal.close();
                resolve(true);
            };
            modal.open();
        });
    }

    async deleteImage(file) {
        const confirmed = await this.confirmDelete(file);
        if (!confirmed) return;

        try {
            await this.app.vault.delete(file);
            // Remove the image from our list and refresh the grid
            this.imageFiles = this.imageFiles.filter(f => f.path !== file.path);
            this.updateImageGrid();
        } catch (error) {
            new Notice(`Failed to delete image: ${error.message}`);
        }
    }

    onOpen() {
        // Add custom class to the modal element
        this.modalEl.addClass('pixel-banner-image-select-modal');

        const { contentEl } = this;
        contentEl.empty();

        // Add styles for pagination
        const style = document.createElement('style');
        style.textContent = `
            .pixel-banner-image-modal {
                width: var(--dialog-max-width);
                top: unset !important;
            }

            .pixel-banner-image-select-modal {
                top: unset !important;
                width: var(--dialog-max-width);
                max-width: 1100px;
            }

            .pixel-banner-image-select-modal .pixel-banner-image-delete {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 24px;
                height: 24px;
                background-color: var(--background-secondary);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: .5;
                transition: opacity 0.2s ease, background-color 0.2s ease;
                cursor: pointer;
                z-index: 2;
            }

            .pixel-banner-image-select-modal .pixel-banner-image-wrapper:hover .pixel-banner-image-delete {
                opacity: 1;
            }

            .pixel-banner-image-select-modal .pixel-banner-image-delete:hover {
                background-color: red;
                color: white;
                opacity: 1;
            }

            .pixel-banner-image-select-modal .pixel-banner-image-delete svg {
                width: 16px;
                height: 16px;
            }

            .pixel-banner-image-select-description {
                margin-top: -15px;
                font-size: 0.8em;
                word-break: break-all;
                color: var(--text-muted);
                margin-bottom: 15px;
            }

            .pixel-banner-search-container {
                margin-bottom: 1rem;
            }
            
            .pixel-banner-search-container input {
                width: 100%;
                padding: 8px;
                border-radius: 4px;
                border: 1px solid var(--background-modifier-border);
            }

            .pixel-banner-search-container .search-row {
                flex: 1;
                display: flex;
                gap: 8px;
                margin: 0;
            }

            .pixel-banner-search-container .controls-row {
                flex: 0 auto;
                display: flex;
                gap: 8px;
                margin: 0;
            }

            .pixel-banner-image-thumbnail {
                width: 100%;
                height: 150px;
                object-fit: cover;
                border-radius: 2px;
            }

            .pixel-banner-image-path {
                margin-top: 8px;
                font-size: 0.8em;
                word-break: break-all;
                color: var(--text-muted);
            }

            .pixel-banner-image-error {
                height: 150px;
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: var(--background-modifier-error);
                color: var(--text-error);
                border-radius: 2px;
            }

            .pixel-banner-image-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 1rem;
                padding: 0 1rem;
                overflow-y: auto;
                max-height: 60vh;
            }

            .pixel-banner-pagination-button {
                padding: 4px 8px;
                border-radius: 4px;
                background: var(--background-secondary);
                border: 1px solid var(--background-modifier-border);
                cursor: pointer;
                font-size: 14px;
                line-height: 1;
            }
            
            .pixel-banner-pagination-button:hover:not(.disabled) {
                background: var(--background-modifier-hover);
            }
            
            .pixel-banner-pagination-button.disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .pixel-banner-pagination-info {
                font-size: 14px;
                color: var(--text-muted);
            }
            
            .pixel-banner-image-container {
                cursor: pointer;
                border-radius: 6px;
                border: 1px solid var(--background-modifier-border);
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                position: relative;
            }
            
            .pixel-banner-image-container:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            
            .pixel-banner-image-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 15px;
                max-height: 60vh;
                overflow-y: auto;
                padding: 5px;
            }
            
            .pixel-banner-no-images {
                width: 100%;
                height: 200px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.2em;
                color: var(--text-muted);
                border: 1px dashed var(--background-modifier-border);
                border-radius: 8px;
                background-color: var(--background-secondary);
                grid-column: 1 / -1;
                text-align: center;
                padding: 20px;
            }
            
            .pixel-banner-image-thumbnail {
                width: 100%;
                height: 150px;
                object-fit: cover;
                display: block;
            }
            
            .pixel-banner-image-info {
                padding: 8px;
                font-size: 12px;
                background: var(--background-secondary);
            }
            
            .pixel-banner-image-path {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 4px;
            }
            
            .pixel-banner-image-delete {
                position: absolute;
                top: 5px;
                right: 5px;
                background: rgba(0, 0, 0, 0.5);
                border-radius: 50%;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .pixel-banner-image-container:hover .pixel-banner-image-delete {
                opacity: 1;
            }
            
            .pixel-banner-image-delete svg {
                width: 16px;
                height: 16px;
                color: white;
            }

            /* ------------------- */
            /* -- mobile layout -- */
            /* ------------------- */
            @media screen and (max-width: 550px) {
                .pixel-banner-pagination { flex-direction: column !important; }
                .pixel-banner-pagination .pixel-banner-controls { flex-direction: column !important; }
            }

            @media screen and (max-width: 775px) {
                .pixel-banner-search-container {
                    flex-direction: column !important;
                    gap: 8px !important;
                }

                .pixel-banner-search-container .search-row {
                    display: flex;
                    width: 100%;
                    gap: 8px;
                }

                .pixel-banner-search-container .controls-row {
                    display: flex;
                    width: 100%;
                    gap: 8px;
                    align-items: center;
                }

                .pixel-banner-search-container input[type="text"] {
                    flex: 1;
                }
            }
        `;
        document.head.appendChild(style);
        this.style = style;

        // Title
        contentEl.createEl('h2', { text: '💾 Select Banner Image', cls: 'margin-top-0' });
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

        // Generate with AI button
        if (this.plugin.pixelBannerPlusEnabled && this.plugin.pixelBannerPlusServerOnline) {
            const pixelBannerPlusGenAIButton = controlsRow.createEl('button');
            pixelBannerPlusGenAIButton.addClass('radial-pulse-animation');
            const sparkleSpan = pixelBannerPlusGenAIButton.createSpan({ cls: 'pixel-banner-twinkle-animation', text: '✨ ' });
            pixelBannerPlusGenAIButton.createSpan({ cls:'margin-left-5', text: 'AI' });
            pixelBannerPlusGenAIButton.addEventListener('click', () => {
                this.close();
                new GenerateAIBannerModal(this.app, this.plugin).open();
            });
        }

        // Upload button
        const uploadButton = controlsRow.createEl('button', {
            text: '📤 Upload'
        });
        uploadButton.addEventListener('click', () => {
            fileInput.click();
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
                accept: 'image/*,video/mp4,video/quicktime',
                style: 'display: none;'
            }
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
        this.paginationContainer = contentEl.createDiv({
            cls: 'pixel-banner-pagination',
            attr: {
                style: `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                    margin-top: 15px;
                `
            }
        });
        
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

        // Show message if no images found
        if (currentFiles.length === 0) {
            const noImagesMessage = this.gridContainer.createEl('div', {
                cls: 'pixel-banner-no-images',
                text: filteredFiles.length === 0 ? 
                    '🔍 No images found matching your search.' : 
                    'No images on this page.'
            });
        }

        // Create image grid
        currentFiles.forEach(file => {
            const imageContainer = this.gridContainer.createDiv({ cls: 'pixel-banner-image-container' });
            
            // Create thumbnail container
            const thumbnailContainer = imageContainer.createDiv();
            
            // Try to create thumbnail
            const fileExt = file.extension.toLowerCase();
        
            if (fileExt === 'svg') {
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
            } else if (fileExt === 'mp4' || fileExt === 'mov') {
                // For video files, create a video element for thumbnail
                const resourcePath = this.app.vault.getResourcePath(file);
                const video = thumbnailContainer.createEl('video', {
                    cls: 'pixel-banner-video-thumbnail',
                    attr: {
                        src: resourcePath,
                        preload: 'metadata',
                        muted: true
                    }
                });
                
                // Style the video thumbnail
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'cover';
                
                // Seek to a frame to show as thumbnail (1 second in)
                video.addEventListener('loadedmetadata', () => {
                    video.currentTime = Math.min(1, video.duration / 4);
                });
                
                // Add video icon overlay
                const videoOverlay = thumbnailContainer.createDiv({ cls: 'pixel-banner-video-overlay' });
                videoOverlay.innerHTML = '▶️';
                videoOverlay.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-size: 24px;
                    background: rgba(0, 0, 0, 0.7);
                    border-radius: 50%;
                    padding: 8px;
                    pointer-events: none;
                `;
                
            } else {
                // For image files, use the existing binary approach
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

            // Add delete button
            const deleteBtn = imageContainer.createDiv({ cls: 'pixel-banner-image-delete' });
            const trashIcon = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
            deleteBtn.innerHTML = trashIcon;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent image selection when clicking delete
                this.deleteImage(file);
            });
            
            // Add click handler for the image container
            imageContainer.addEventListener('click', () => {
                this.onChoose(file);
                this.close();
            });
        });

        // Create pagination buttons
        const paginationContainer = this.paginationContainer;
        paginationContainer.innerHTML = '';
        paginationContainer.style.display = 'flex';
        paginationContainer.style.alignItems = 'center';
        paginationContainer.style.justifyContent = 'center';
        paginationContainer.style.gap = '10px';
        paginationContainer.style.marginTop = '15px';
        
        // Create a flex container for sort and pagination
        const controlsContainer = paginationContainer.createDiv({
            cls: 'pixel-banner-controls',
            attr: {
                style: `
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    align-items: center;
                    margin-left: auto;
                    margin-right: auto;
                `
            }
        });
        
        // Add sort dropdown on the left
        const sortContainer = controlsContainer.createDiv({ cls: 'pixel-banner-sort-container' });
        sortContainer.style.display = 'flex';
        sortContainer.style.alignItems = 'center';
        sortContainer.style.gap = '5px';
        
        const sortLabel = sortContainer.createEl('span', { 
            text: 'Sort by:',
            attr: {
                style: 'font-size: 14px; color: var(--text-muted);'
            }
        });
        
        const sortSelect = sortContainer.createEl('select', { cls: 'dropdown' });
        
        const sortOptions = [
            { value: 'name-asc', label: 'Name (A-Z)' },
            { value: 'name-desc', label: 'Name (Z-A)' },
            { value: 'date-desc', label: 'Date (Newest)' },
            { value: 'date-asc', label: 'Date (Oldest)' },
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
        firstButton.disabled = this.currentPage === 1 || totalImages === 0;
        if (firstButton.disabled) {
            firstButton.addClass('disabled');
        }
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
        prevButton.disabled = this.currentPage === 1 || totalImages === 0;
        if (prevButton.disabled) {
            prevButton.addClass('disabled');
        }
        prevButton.onclick = () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.updateImageGrid();
            }
        };
        
        // Page info
        const pageInfo = paginationDiv.createEl('span', {
            text: `${this.currentPage} / ${totalPages}`,
            cls: 'pixel-banner-pagination-info',
            attr: {
                style: 'white-space: nowrap;'
            }
        });
        
        // Next page button
        const nextButton = paginationDiv.createEl('button', {
            text: '›',
            cls: 'pixel-banner-pagination-button',
            attr: {
                'aria-label': 'Next page'
            }
        });
        nextButton.disabled = this.currentPage === totalPages || totalImages === 0;
        if (nextButton.disabled) {
            nextButton.addClass('disabled');
        }
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
        lastButton.disabled = this.currentPage === totalPages || totalImages === 0;
        if (lastButton.disabled) {
            lastButton.addClass('disabled');
        }
        lastButton.onclick = () => {
            if (this.currentPage !== totalPages) {
                this.currentPage = totalPages;
                this.updateImageGrid();
            }
        };
        
        // Add "Back to Main Menu" button
        const backToMainButton = paginationContainer.createEl('button', {
            text: '⇠ Main Menu',
            cls: 'pixel-banner-image-select-back-to-main',
            attr: {
                style: `
                    margin-right: 20px;
                    cursor: pointer;
                `
            }
        });
                
        // On click of back to main menu button, close this modal and open the Pixel Banner Menu modal
        backToMainButton.addEventListener('click', () => {
            this.close();
            new SelectPixelBannerModal(this.app, this.plugin).open();
        });
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
        
        // Remove the style element
        if (this.style) {
            this.style.remove();
        }
    }
}