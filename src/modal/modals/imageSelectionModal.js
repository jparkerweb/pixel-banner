import { Modal, Notice, Setting } from "obsidian";
import { GenerateAIBannerModal } from './generateAIBannerModal.js'
import { FolderSelectionModal } from './folderSelectionModal.js';
import { SaveImageModal } from './saveImageModal.js';


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
            .filter(file => file.extension.toLowerCase().match(/^(jpg|jpeg|png|gif|bmp|svg|webp)$/));
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

        // Title
        contentEl.createEl('h2', { text: '🏷️ Select Banner Image', cls: 'margin-top-0' });
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
        const pixelBannerPlusGenAIButton = controlsRow.createEl('button');
        pixelBannerPlusGenAIButton.addClass('radial-pulse-animation');
        const sparkleSpan = pixelBannerPlusGenAIButton.createSpan({ cls: 'twinkle-animation', text: '✨ ' });
        pixelBannerPlusGenAIButton.createSpan({ cls:'margin-left-5', text: 'AI Banners' });
        pixelBannerPlusGenAIButton.addEventListener('click', () => {
            this.close();
            new GenerateAIBannerModal(this.app, this.plugin).open();
        });

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

            // Add delete button
            const deleteBtn = imageContainer.createDiv({ cls: 'pixel-banner-image-delete' });
            const trashIcon = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
            deleteBtn.innerHTML = trashIcon;
            
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent image selection when clicking delete
                await this.deleteImage(file);
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