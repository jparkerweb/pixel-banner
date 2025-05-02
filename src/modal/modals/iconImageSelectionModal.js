import { Modal, Notice, Setting } from "obsidian";
import { IconFolderSelectionModal } from './iconFolderSelectionModal.js';
import { SaveImageModal } from './saveImageModal.js';
import { SelectPixelBannerModal } from './selectPixelBannerModal.js';


// ------------------------------
// -- Icon Image Selection Modal --
// ------------------------------
export class IconImageSelectionModal extends Modal {
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
            .filter(file => file.extension.toLowerCase().match(/^(jpg|jpeg|png|gif|bmp|svg|webp|avif)$/));
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
                overflow: hidden;
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
                max-width: fit-content;
                height: auto;
                max-height: 150px;
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
        contentEl.createEl('h2', { text: '⭐ Select Banner Icon Image', cls: 'margin-top-0' });
        // Description
        contentEl.createEl('div', {
            text: 'Select an image to use as a banner icon.',
            cls: 'pixel-banner-image-select-description'
        });

        // Create tab container
        const tabContainer = contentEl.createDiv({
            cls: 'pixel-banner-tabs-container',
            attr: {
                style: `
                    display: flex;
                    margin-bottom: 16px;
                    border-bottom: 1px solid var(--background-modifier-border);
                `
            }
        });

        // Create tab buttons
        const localImageTab = tabContainer.createDiv({
            cls: 'pixel-banner-tab active',
            text: '💾 Local Image',
            attr: {
                style: `
                    padding: 8px 16px;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    margin-right: 8px;
                    transition: all 0.2s ease;
                `
            }
        });

        const webTab = tabContainer.createDiv({
            cls: 'pixel-banner-tab',
            text: '🌐 WEB',
            attr: {
                style: `
                    padding: 8px 16px;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s ease;
                `
            }
        });

        // Create content containers for each tab
        const localImageContent = contentEl.createDiv({
            cls: 'pixel-banner-tab-content local-image-content',
            attr: {
                style: `
                    display: block;
                `
            }
        });

        const webContent = contentEl.createDiv({
            cls: 'pixel-banner-tab-content web-content',
            attr: {
                style: `
                    display: none;
                `
            }
        });

        // Add styles for tabs
        const tabStyles = document.createElement('style');
        tabStyles.textContent = `
            .pixel-banner-tab.active {
                border-bottom: 2px solid var(--interactive-accent) !important;
                font-weight: bold;
            }
        `;
        document.head.appendChild(tabStyles);
        this.tabStyles = tabStyles;

        // Tab switching function
        const switchTab = (targetTab) => {
            // Update tab styles
            localImageTab.classList.remove('active');
            webTab.classList.remove('active');
            targetTab.classList.add('active');

            // Show/hide content
            if (targetTab === localImageTab) {
                localImageContent.style.display = 'block';
                webContent.style.display = 'none';
            } else {
                localImageContent.style.display = 'none';
                webContent.style.display = 'block';
            }
        };

        // Add click handlers to tabs
        localImageTab.addEventListener('click', () => switchTab(localImageTab));
        webTab.addEventListener('click', () => switchTab(webTab));

        // Add search container to local image content
        const searchContainer = localImageContent.createDiv({ cls: 'pixel-banner-search-container' });
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
        const controlsRow = searchContainer.createDiv({
            cls: 'controls-row',
            attr: {
                style: `
                    display: flex !important;
                    gap: 8px;
                    align-items: center;
                `
            }
        });

        // Upload button
        const uploadButton = controlsRow.createEl('button', {
            text: '📤 Upload'
        });
        uploadButton.addEventListener('click', () => {
            fileInput.click();
        });

        // Add the toggle container and switch
        const shorPathToggleContainer = controlsRow.createDiv({ 
            cls: 'pixel-banner-path-toggle',
            attr: {
                style: `
                    display: flex !important;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                `
            }
        });

        const shorPathToggleLabel = shorPathToggleContainer.createSpan({
            text: 'Use short path',
            attr: {
                style: `
                    font-size: 12px;
                    color: var(--text-muted);
                `
            }
        });

        const shorPathToggle = new Setting(shorPathToggleContainer)
            .addToggle(cb => {
                cb.setValue(this.plugin.settings.useShortPath)
                    .onChange(async (value) => {
                        this.plugin.settings.useShortPath = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Style the toggle container to be compact
        shorPathToggle.settingEl.style.border = 'none';
        shorPathToggle.settingEl.style.padding = '0';
        shorPathToggle.settingEl.style.margin = '0';
        shorPathToggle.infoEl.remove(); // Remove the empty info element

        // Create hidden file input
        const fileInput = searchContainer.createEl('input', {
            type: 'file',
            attr: {
                accept: 'image/*',
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
                    const defaultFolder = this.plugin.settings.defaultSelectIconPath || '';
                    const folderPath = await new Promise((resolve) => {
                        new IconFolderSelectionModal(this.app, defaultFolder, (result) => {
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
                        new Notice(`Failed to save image: ${error.message}`);
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

        // Create the web URL input in the web content tab
        const webUrlInputContainer = webContent.createDiv({
            cls: 'web-url-input-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 16px;
                `
            }
        });

        // URL input
        const urlInput = webUrlInputContainer.createEl('input', {
            type: 'text',
            placeholder: 'Enter image URL...',
            cls: 'web-url-input',
            attr: {
                style: `
                    flex: 1;
                    padding: 8px;
                    border-radius: 4px;
                    border: 1px solid var(--background-modifier-border);
                `
            }
        });

        // Use URL button
        const useUrlButton = webUrlInputContainer.createEl('button', {
            text: 'Use URL',
            cls: 'use-url-button',
            attr: {
                style: `
                    background-color: var(--interactive-accent);
                    color: var(--text-on-accent);
                `
            }
        });
        useUrlButton.addEventListener('click', () => {
            const url = urlInput.value.trim();
            if (validateUrl(url)) {
                this.onChoose({ 
                    path: url, 
                    name: url.split('/').pop() || 'image',
                    extension: url.split('.').pop() || 'jpg',
                    isWebUrl: true 
                });
                this.close();
            } else {
                new Notice('Please enter a valid image URL');
            }
        });

        // URL validation function
        const validateUrl = (url) => {
            try {
                new URL(url);
                // Basic check for image file extension
                const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'avif', 'bmp'];
                const extension = url.split('.').pop().toLowerCase();
                return imageExtensions.includes(extension);
            } catch (e) {
                return false;
            }
        };

        // Add hint text below the URL input
        webContent.createEl('div', {
            text: 'Enter a direct URL to an image file (jpg, png, gif, etc.).',
            attr: {
                style: `
                    font-size: 12px;
                    color: var(--text-muted);
                    margin-bottom: 16px;
                `
            }
        });

        // Add image preview area to web content
        const previewContainer = webContent.createDiv({
            cls: 'web-image-preview-container',
            attr: {
                style: `
                    display: none;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    margin-top: 16px;
                    padding: 16px;
                    border: 1px dashed var(--background-modifier-border);
                    border-radius: 4px;
                `
            }
        });

        const previewImage = previewContainer.createEl('img', {
            cls: 'web-image-preview',
            attr: {
                style: `
                    max-width: 100%;
                    max-height: 200px;
                    object-fit: contain;
                `
            }
        });

        const previewCaption = previewContainer.createEl('div', {
            cls: 'web-image-preview-caption',
            attr: {
                style: `
                    margin-top: 8px;
                    font-size: 12px;
                    color: var(--text-muted);
                `
            }
        });

        // Add preview functionality
        urlInput.addEventListener('input', this.debounce(() => {
            const url = urlInput.value.trim();
            if (validateUrl(url)) {
                previewImage.src = url;
                previewCaption.textContent = url.split('/').pop();
                previewContainer.style.display = 'flex';
                previewImage.onerror = () => {
                    previewContainer.style.display = 'none';
                    new Notice('Failed to load image preview');
                };
            } else {
                previewContainer.style.display = 'none';
            }
        }, 500));

        // Create grid container in local image content
        this.gridContainer = localImageContent.createDiv({ cls: 'pixel-banner-image-grid' });
        
        // Add pagination container
        this.paginationContainer = localImageContent.createDiv({
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
            const thumbnailContainer = imageContainer.createDiv({
                attr: {
                    style: `
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 150px;
                    `
                }
            });
            
            // Try to create thumbnail
            if (file.extension.toLowerCase() === 'svg') {
                // For SVG files, use img tag with source
                this.app.vault.readBinary(file).then(arrayBuffer => {
                    const blob = new Blob([arrayBuffer], { type: 'image/svg+xml' });
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
            
            // Create delete button
            const deleteButton = imageContainer.createDiv({ cls: 'pixel-banner-image-delete' });
            deleteButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent image selection
                this.deleteImage(file);
            });

            // Create info container
            const infoContainer = imageContainer.createDiv({ cls: 'pixel-banner-image-info' });
            const displayPath = this.plugin.settings.useShortPath 
                ? this.getShortPath(file.path) 
                : file.path;
            infoContainer.createDiv({ text: displayPath, cls: 'pixel-banner-image-path' });
            
            // Add click handler to select the image
            imageContainer.addEventListener('click', () => {
                this.onChoose(file);
                this.close();
            });
        });

        // Create pagination controls if there are multiple pages
        if (totalPages > 1) {
            // Left pagination controls
            const paginationInfo = this.paginationContainer.createDiv({
                cls: 'pixel-banner-pagination-info',
                text: `Showing ${startIndex + 1}-${endIndex} of ${totalImages} images | Page ${this.currentPage} of ${totalPages}`
            });

            // Right pagination controls
            const paginationControls = this.paginationContainer.createDiv({
                cls: 'pixel-banner-controls',
                attr: {
                    style: 'display: flex; gap: 5px; align-items: center;'
                }
            });

            // First page button
            const firstPageButton = paginationControls.createEl('button', {
                cls: `pixel-banner-pagination-button ${this.currentPage === 1 ? 'disabled' : ''}`,
                text: '<<'
            });
            firstPageButton.addEventListener('click', () => {
                if (this.currentPage !== 1) {
                    this.currentPage = 1;
                    this.updateImageGrid();
                }
            });

            // Previous page button
            const prevPageButton = paginationControls.createEl('button', {
                cls: `pixel-banner-pagination-button ${this.currentPage === 1 ? 'disabled' : ''}`,
                text: '<'
            });
            prevPageButton.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.updateImageGrid();
                }
            });

            // Next page button
            const nextPageButton = paginationControls.createEl('button', {
                cls: `pixel-banner-pagination-button ${this.currentPage === totalPages ? 'disabled' : ''}`,
                text: '>'
            });
            nextPageButton.addEventListener('click', () => {
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.updateImageGrid();
                }
            });

            // Last page button
            const lastPageButton = paginationControls.createEl('button', {
                cls: `pixel-banner-pagination-button ${this.currentPage === totalPages ? 'disabled' : ''}`,
                text: '>>'
            });
            lastPageButton.addEventListener('click', () => {
                if (this.currentPage !== totalPages) {
                    this.currentPage = totalPages;
                    this.updateImageGrid();
                }
            });
        }
    }

    sortFiles(files) {
        return files.sort((a, b) => {
            if (this.sortOrder === 'name-asc') {
                return a.name.localeCompare(b.name);
            } else if (this.sortOrder === 'name-desc') {
                return b.name.localeCompare(a.name);
            } else if (this.sortOrder === 'date-asc') {
                return a.stat.mtime - b.stat.mtime;
            } else if (this.sortOrder === 'date-desc') {
                return b.stat.mtime - a.stat.mtime;
            }
            return 0;
        });
    }

    getShortPath(path) {
        const parts = path.split('/');
        const fileName = parts.pop(); // Get the file name
        
        // If there are more than 2 parts, truncate the middle
        if (parts.length > 1) {
            return `${parts[0]}/.../${fileName}`;
        }
        
        return path; // Return the full path if it's already short
    }

    onClose() {
        if (this.style) {
            this.style.remove();
        }
        if (this.tabStyles) {
            this.tabStyles.remove();
        }
        const { contentEl } = this;
        contentEl.empty();
    }
}
