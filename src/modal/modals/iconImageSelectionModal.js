import { Modal, Notice, Setting, MarkdownView } from "obsidian";
import { IconFolderSelectionModal } from './iconFolderSelectionModal.js';
import { SaveImageModal } from './saveImageModal.js';
import { TargetPositionModal } from "../modals";
import { PIXEL_BANNER_PLUS } from '../../resources/constants.js';


// ------------------------------
// -- Icon Image Selection Modal --
// ------------------------------
export class IconImageSelectionModal extends Modal {
    constructor(app, plugin, onChoose, defaultPath = '') {
        super(app);
        this.plugin = plugin;
        this.onChoose = onChoose;
        this.defaultPath = defaultPath || '';
        this.searchQuery = (defaultPath && typeof defaultPath === 'string') ? defaultPath.toLowerCase() : '';
        this.currentPage = 1;
        this.imagesPerPage = 20;
        this.sortOrder = 'name-asc';
        this.imageFiles = this.app.vault.getFiles()
            .filter(file => file && file.extension && file.extension.toLowerCase && file.extension.toLowerCase().match(/^(jpg|jpeg|png|gif|bmp|svg|webp|avif)$/));
        
        // Collections tab properties
        this.iconCategories = [];
        this.selectedIconCategory = null;
        this.selectedIconCategoryIndex = 0;
        this.iconsCurrentPage = 1;
        this.iconsTotalPages = 1;
        this.iconsSearchTerm = '';
        this.isIconsSearchMode = false;
        this.iconsPerPage = 10;
        this._isPaginating = false;
        
        // Flag to track if a targeting modal has been opened via the onChoose callback
        this.targetingModalOpened = false;
        
        // Wrap the original onChoose function to track when it's called
        const originalOnChoose = this.onChoose;
        this.onChoose = (file) => {
            // Set flag that we've called the callback which may open a targeting modal
            this.targetingModalOpened = true;
            originalOnChoose(file);
        };
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
                min-height: 50vh;
                max-height: 95vh;
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

            button.pixel-banner-pagination-button:not([disabled]),
            .pixel-banner-pagination-button:hover:not(.disabled) {
                background-color: var(--interactive-accent);
                color: var(--text-on-accent);
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
        const titleDescriptionRow = contentEl.createEl('div', {
            text: 'Select an image to use as a banner icon.',
            cls: 'pixel-banner-image-select-description',
            attr: {
                style: `
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                `
            }
        });

        // Remove Icon Image Button
        const removeIconImageButton = titleDescriptionRow.createEl('button', {
            text: '🗑️ Remove',
            cls: 'remove-icon-image-button cursor-pointer'
        });

        // Add event listener to remove icon image button
        removeIconImageButton.addEventListener('click', async () => {
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                await this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                    // Get frontmatter field names
                    const bannerIconField = Array.isArray(this.plugin.settings.customBannerIconField) 
                        ? this.plugin.settings.customBannerIconField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconField;

                    const bannerIconImageAlignmentField = Array.isArray(this.plugin.settings.customBannerIconImageAlignmentField) 
                        ? this.plugin.settings.customBannerIconImageAlignmentField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconImageAlignmentField;
                    
                    const iconSizeField = Array.isArray(this.plugin.settings.customBannerIconSizeField) 
                        ? this.plugin.settings.customBannerIconSizeField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconSizeField;

                    const iconImageSizeMultiplierField = Array.isArray(this.plugin.settings.customBannerIconImageSizeMultiplierField) 
                        ? this.plugin.settings.customBannerIconImageSizeMultiplierField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconImageSizeMultiplierField;

                    const iconRotateField = Array.isArray(this.plugin.settings.customBannerIconRotateField) 
                        ? this.plugin.settings.customBannerIconRotateField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconRotateField;
                    
                    const iconYPositionField = Array.isArray(this.plugin.settings.customBannerIconVeritalOffsetField) 
                        ? this.plugin.settings.customBannerIconVeritalOffsetField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconVeritalOffsetField;
                    
                    const iconXPositionField = Array.isArray(this.plugin.settings.customBannerIconXPositionField) 
                        ? this.plugin.settings.customBannerIconXPositionField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconXPositionField;
                    
                    const iconColorField = Array.isArray(this.plugin.settings.customBannerIconColorField) 
                        ? this.plugin.settings.customBannerIconColorField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconColorField;
                    
                    const iconBgColorField = Array.isArray(this.plugin.settings.customBannerIconBackgroundColorField) 
                        ? this.plugin.settings.customBannerIconBackgroundColorField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconBackgroundColorField;
                    
                    const iconXPaddingField = Array.isArray(this.plugin.settings.customBannerIconPaddingXField) 
                        ? this.plugin.settings.customBannerIconPaddingXField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconPaddingXField;
                    
                    const iconYPaddingField = Array.isArray(this.plugin.settings.customBannerIconPaddingYField) 
                        ? this.plugin.settings.customBannerIconPaddingYField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconPaddingYField;
                    
                    const iconBorderRadiusField = Array.isArray(this.plugin.settings.customBannerIconBorderRadiusField) 
                        ? this.plugin.settings.customBannerIconBorderRadiusField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconBorderRadiusField;
                    
                    // Get the banner icon image field name
                    const bannerIconImageField = Array.isArray(this.plugin.settings.customBannerIconImageField) 
                        ? this.plugin.settings.customBannerIconImageField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconImageField;
                    
                    // Check if there's a text/emoji icon set
                    const hasTextEmoji = frontmatter[bannerIconField] !== undefined && 
                                         frontmatter[bannerIconField] !== null && 
                                         frontmatter[bannerIconField] !== '';
                    
                    // Only remove all icon-related fields if there's no text/emoji
                    if (!hasTextEmoji) {
                        // Remove all banner icon related fields
                        delete frontmatter[bannerIconField];
                        delete frontmatter[bannerIconImageField];
                        delete frontmatter[bannerIconImageAlignmentField];
                        delete frontmatter[iconSizeField];
                        delete frontmatter[iconImageSizeMultiplierField];
                        delete frontmatter[iconRotateField];
                        delete frontmatter[iconYPositionField];
                        delete frontmatter[iconXPositionField];
                        delete frontmatter[iconColorField];
                        delete frontmatter[iconBgColorField];
                        delete frontmatter[iconXPaddingField];
                        delete frontmatter[iconYPaddingField];
                        delete frontmatter[iconBorderRadiusField];
                    } else {
                        // If there is text/emoji, only remove the icon image field
                        delete frontmatter[bannerIconImageField];
                        delete frontmatter[iconImageSizeMultiplierField];
                        delete frontmatter[bannerIconImageAlignmentField];
                    }
                });

                // Call onChoose with null to indicate removal
                this.onChoose(null);
                this.close();
            
                // Get the active file and view
                const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (activeView) {
                    // Clean up any existing banner icon overlays before updating
                    const contentEl = activeView.contentEl;
                    if (contentEl) {
                        const existingOverlays = contentEl.querySelectorAll('.banner-icon-overlay');
                        existingOverlays.forEach(overlay => {
                            this.plugin.returnIconOverlay(overlay);
                        });
                    }
                    
                    // Force a full banner update
                    await this.plugin.updateBanner(activeView, true, this.plugin.UPDATE_MODE.FULL_UPDATE);
                }
                
                // Only open the targeting modal if we're not skipping it
                // and the setting is enabled
                if (!this.skipTargetingModal && this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                    // Use metadataCache events instead of timeouts
                    // Create a promise that resolves when the metadata is updated
                    await new Promise(resolve => {
                        // Store the current frontmatter state
                        const initialFrontmatter = JSON.stringify(
                            this.app.metadataCache.getFileCache(activeFile)?.frontmatter || {}
                        );
                        
                        // Set up a one-time event listener for metadata changes
                        const eventRef = this.app.metadataCache.on('changed', (file) => {
                            // Only proceed if this is our active file
                            if (file.path !== activeFile.path) return;
                            
                            // Get the updated frontmatter
                            const updatedFrontmatter = JSON.stringify(
                                this.app.metadataCache.getFileCache(file)?.frontmatter || {}
                            );
                            
                            // If frontmatter has changed, we can proceed
                            if (updatedFrontmatter !== initialFrontmatter) {
                                // Remove the event listener
                                this.app.metadataCache.off('changed', eventRef);
                                
                                // Resolve the promise
                                resolve();
                            }
                        });
                        
                        // Set a timeout as a fallback in case the event doesn't fire
                        setTimeout(() => {
                            this.app.metadataCache.off('changed', eventRef);
                            resolve();
                        }, 500);
                    });
                    
                    // Open the targeting modal
                    new TargetPositionModal(this.app, this.plugin).open();
                }
            }
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
                    margin-right: 8px;
                    transition: all 0.2s ease;
                `
            }
        });

        // Collections tab - initially hidden
        this.collectionsTab = tabContainer.createDiv({
            cls: 'pixel-banner-tab',
            text: '📑 Collections',
            attr: {
                style: `
                    padding: 8px 16px;
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    transition: all 0.2s ease;
                    display: none; /* Initially hidden */
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

        this.collectionsContent = contentEl.createDiv({
            cls: 'pixel-banner-tab-content collections-content',
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
            
            if (this.collectionsTab) {
                this.collectionsTab.classList.remove('active');
            }
            
            targetTab.classList.add('active');

            // Show/hide content
            if (targetTab === localImageTab) {
                localImageContent.style.display = 'block';
                webContent.style.display = 'none';
                this.collectionsContent.style.display = 'none';
            } else if (targetTab === webTab) {
                localImageContent.style.display = 'none';
                webContent.style.display = 'block';
                this.collectionsContent.style.display = 'none';
            } else {
                localImageContent.style.display = 'none';
                webContent.style.display = 'none';
                this.collectionsContent.style.display = 'block';
            }
        };

        // Add click handlers to tabs
        localImageTab.addEventListener('click', () => switchTab(localImageTab));
        webTab.addEventListener('click', () => switchTab(webTab));
        this.collectionsTab.addEventListener('click', () => switchTab(this.collectionsTab));

        // Check if server is online
        this.checkServerStatus();

        // Add search container to local image content
        const searchContainer = localImageContent.createDiv({ cls: 'pixel-banner-search-container' });
        searchContainer.style.display = 'flex';
        searchContainer.style.gap = '8px';
        searchContainer.style.alignItems = 'center';
        searchContainer.style.marginBottom = '1em';

        // Create Collections tab content
        this.initializeCollectionsTab(this.collectionsContent);

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
            this.searchQuery = (searchInput && searchInput.value && typeof searchInput.value === 'string') ? searchInput.value.toLowerCase() : '';
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
                const extension = (url && url.split && url.split('.').pop()) ? url.split('.').pop().toLowerCase() : '';
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

    async checkServerStatus() {
        try {
            const pingUrl = `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.PING}`;
            const response = await fetch(pingUrl);
            const data = await response.json();
            
            if (response.ok && data.response === "pong") {
                this.collectionsTab.style.display = 'block';
            } else {
                console.log('Server response did not match expected format', data);
            }
        } catch (error) {
            console.error(`Failed to connect to server: ${error.message}`);
        }
    }

    async fetchIconCategories() {
        try {
            const url = `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.BANNER_ICON_CATEGORIES}?key=${PIXEL_BANNER_PLUS.BANNER_ICON_KEY}`;
            
            const headers = {
                'Accept': 'application/json'
            };
            
            const response = await fetch(url, {
                headers: headers
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch icon categories');
            }
            
            this.iconCategories = data.categories || [];
            
            if (this.iconCategories.length === 0) {
                throw new Error('No icon categories found');
            }
            
            return this.iconCategories;
        } catch (error) {
            console.error('Error fetching icon categories:', error);
            throw error;
        }
    }

    async fetchIconsByCategory() {
        // Show loading state
        this.showCollectionsLoading();
        
        try {
            // Build the URL - if selectedIconCategory is null or "all", don't include category_id param
            let url = `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.BANNER_ICONS}?page=${this.iconsCurrentPage}&limit=${this.iconsPerPage}&key=${PIXEL_BANNER_PLUS.BANNER_ICON_KEY}`;
            
            // Only add category_id if we're not showing all icons
            if (this.selectedIconCategory && this.selectedIconCategory !== 'all') {
                url += `&category_id=${this.selectedIconCategory}`;
            }
            
            const headers = {
                'Accept': 'application/json'
            };
            
            const response = await fetch(url, {
                headers: headers
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch icons');
            }
            
            // Store the current page from the response to ensure synchronization
            this.iconsCurrentPage = data.currentPage || this.iconsCurrentPage;
            
            this.renderIcons(data.bannerIcons, data.totalPages, data.totalCount);
        } catch (error) {
            console.error('Error fetching icons by category:', error);
            this.showCollectionsError(error.message);
        } finally {
            this.hideCollectionsLoading();
        }
    }

    initializeCollectionsTab(contentEl) {
        // Show loading spinner
        const loadingContainer = contentEl.createDiv({
            cls: 'pixel-banner-loading-container',
            attr: {
                style: `
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 200px;
                `
            }
        });

        const loadingSpinner = loadingContainer.createDiv({
            cls: 'pixel-banner-loading-spinner',
            attr: {
                style: `
                    width: 40px;
                    height: 40px;
                    border: 4px solid var(--background-modifier-border);
                    border-top: 4px solid var(--text-accent);
                    border-radius: 50%;
                    animation: pixel-banner-spin 1s linear infinite;
                `
            }
        });

        // Add animation for the spinner
        const spinnerStyle = document.createElement('style');
        spinnerStyle.textContent = `
            @keyframes pixel-banner-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(spinnerStyle);
        this.spinnerStyle = spinnerStyle;

        // Fetch categories
        this.fetchIconCategories().then(() => {
            // Remove loading spinner
            loadingContainer.remove();

            // Create categories dropdown container
            const categoriesContainer = contentEl.createDiv({
                cls: 'pixel-banner-categories-container',
                attr: {
                    style: `
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 16px;
                    `
                }
            });

            // Categories dropdown label
            categoriesContainer.createSpan({
                text: 'Icon Categories:',
                attr: {
                    style: `
                        font-size: 12px;
                        color: var(--text-muted);
                    `
                }
            });

            // Categories dropdown
            this.categoriesDropdown = categoriesContainer.createEl('select', {
                cls: 'pixel-banner-categories-dropdown',
                attr: {
                    style: `
                        border-radius: 4px;
                        border: 1px solid var(--background-modifier-border);
                        flex-grow: 1;
                    `
                }
            });

            // Add "ALL ICONS" option at the top
            const allIconsOption = this.categoriesDropdown.createEl('option', {
                text: '⭐ ALL ICONS',
                value: 'all'
            });
            allIconsOption.selected = true;

            // Populate categories dropdown with the rest of categories
            this.iconCategories.forEach((category, index) => {
                this.categoriesDropdown.createEl('option', {
                    text: category.category,
                    value: category.id
                });
            });

            this.categoriesDropdown.addEventListener('change', async () => {
                this.selectedIconCategory = this.categoriesDropdown.value;
                this.selectedIconCategoryIndex = this.categoriesDropdown.selectedIndex;
                this.iconsCurrentPage = 1;
                
                // Clear the search box when changing categories
                this.iconSearchInput.value = '';
                this.isIconsSearchMode = false;
                
                await this.fetchIconsByCategory();
            });

            // Add "Next Category" button
            const nextCategoryButton = categoriesContainer.createEl('button', {
                text: '▶️ Next Category',
                cls: 'pixel-banner-next-category-button',
                attr: {
                    style: `
                        padding: 8px 10px;
                        border-radius: 4px;
                        background-color: var(--interactive-accent);
                        color: var(--text-on-accent);
                        cursor: pointer;
                        transition: background-color 0.2s ease;
                    `
                }
            });

            nextCategoryButton.addEventListener('click', async () => {
                // Get the total number of options
                const optionsCount = this.categoriesDropdown.options.length;
                
                // Calculate next index (current + 1, loop back to 0 if at the end)
                let nextIndex = this.selectedIconCategoryIndex + 1;
                if (nextIndex >= optionsCount) {
                    nextIndex = 0;
                }
                
                // Update the dropdown selection
                this.categoriesDropdown.selectedIndex = nextIndex;
                this.selectedIconCategory = this.categoriesDropdown.value;
                this.selectedIconCategoryIndex = nextIndex;
                
                // Clear the search box when changing categories
                this.iconSearchInput.value = '';
                this.isIconsSearchMode = false;
                
                // Fetch icons for the new category
                this.iconsCurrentPage = 1;
                await this.fetchIconsByCategory();
            });

            // Create search container
            const searchContainer = contentEl.createDiv({
                cls: 'pixel-banner-search-container',
                attr: {
                    style: `
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 16px;
                    `
                }
            });

            // Create search input
            this.iconSearchInput = searchContainer.createEl('input', {
                type: 'text',
                placeholder: 'Search icons...',
                cls: 'pixel-banner-search-input',
                attr: {
                    style: `
                        padding: 8px;
                        border-radius: 4px;
                        border: 1px solid var(--background-modifier-border);
                        flex-grow: 1;
                    `
                }
            });

            // Create search button
            const searchButton = searchContainer.createEl('button', {
                text: 'Search',
                cls: 'pixel-banner-search-button',
                attr: {
                    style: `
                        padding: 8px 16px;
                        border-radius: 4px;
                        background-color: var(--interactive-accent);
                        color: var(--text-on-accent);
                    `
                }
            });

            searchButton.addEventListener('click', () => {
                this.searchIcons();
            });

            this.iconSearchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.searchIcons();
                }
            });

            // Create clear search button
            const clearSearchButton = searchContainer.createEl('button', {
                text: 'Clear',
                cls: 'pixel-banner-clear-search-button'
            });

            clearSearchButton.addEventListener('click', () => {
                this.iconSearchInput.value = '';
                this.isIconsSearchMode = false;
                if (this.selectedIconCategory) {
                    this.fetchIconsByCategory();
                }
            });

            // Create collections grid
            this.collectionsGridContainer = contentEl.createDiv({
                cls: 'pixel-banner-collections-grid',
                attr: {
                    style: `
                        position: relative;
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                        gap: 12px;
                        margin-top: 12px;
                        max-height: 400px;
                        overflow-y: auto;
                        padding: 8px;
                        min-height: 200px;
                    `
                }
            });

            // Create pagination container
            this.collectionsPaginationContainer = contentEl.createDiv({
                cls: 'pixel-banner-collections-pagination',
                attr: {
                    style: `
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-top: 12px;
                        padding-top: 8px;
                        border-top: 1px solid var(--background-modifier-border);
                    `
                }
            });

            // Start with "ALL ICONS" selected
            this.selectedIconCategory = 'all';
            this.selectedIconCategoryIndex = 0;
            this.fetchIconsByCategory();
            
        }).catch(err => {
            loadingContainer.remove();
            contentEl.createEl('div', {
                cls: 'pixel-banner-error',
                text: `😭 Failed to load icon categories. Please try again later.`,
                attr: {
                    style: `
                        color: var(--text-error);
                        padding: 16px;
                        border: 1px solid var(--background-modifier-error);
                        border-radius: 4px;
                        background-color: var(--background-modifier-error-rgb);
                        margin-bottom: 16px;
                    `
                }
            });
        });
    }

    async onChooseIcon(icon) {
        try {
            const url = `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.BANNER_ICONS_ID.replace(':id', icon.id)}?key=${PIXEL_BANNER_PLUS.BANNER_ICON_KEY}`;
            
            // Get the icon details from the API
            const response = await fetch(url, {
                headers: {
                    'x-user-email': this.plugin.settings.pixelBannerPlusEmail,
                    'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch icon details');
            }
            
            const iconData = data.bannerIcon;
            
            // Extract extension from the base64 image string's MIME type
            let extension = 'png'; // Default as fallback
            
            // Check if we have a base64 image with MIME type info
            if (iconData.base64Image) {
                
                // regex to handle MIME type formats
                const mimeTypeMatch = iconData.base64Image.match(/data:image\/([\w\+\-\.]+);base64/);
                
                if (mimeTypeMatch && mimeTypeMatch[1]) {
                    extension = mimeTypeMatch[1];
                    
                    if (extension === 'jpeg') extension = 'jpg';
                    if (extension === 'svg+xml') extension = 'svg';
                }
            }
            // Fallback: try to get extension from file_name
            else if (iconData.file_name) {
                const parts = iconData.file_name.split('.');
                if (parts.length > 1) {
                    extension = (parts && parts.length > 0 && parts[parts.length - 1]) ? parts[parts.length - 1].toLowerCase() : '';
                }
            }
            
            // Convert base64 to array buffer for saving to vault
            if (iconData.base64Image) {
                // Get the default folder from plugin settings
                const defaultFolder = this.plugin.settings.defaultSelectIconPath || '';
                
                // Show folder selection modal
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

                // Get a safe filename without extension - we'll add it later
                const suggestedName = `${iconData.description || 'icon'}`;
                const userFileName = await new Promise((resolve) => {
                    new SaveImageModal(this.app, suggestedName, (result) => {
                        resolve(result);
                    }).open();
                });

                if (!userFileName) {
                    new Notice('No file name provided');
                    return;
                }
                
                // Remove any extension the user might have added
                let baseName = userFileName;
                if (baseName.includes('.')) {
                    baseName = baseName.substring(0, baseName.lastIndexOf('.'));
                }
                
                // Add the correct extension from our MIME type detection
                const finalFileName = `${baseName}.${extension}`;
                
                // Convert base64 to binary
                const base64Parts = iconData.base64Image.split(',');
                const base64Data = base64Parts[1];
                const binaryString = window.atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                try {
                    // Create the file in the vault
                    const fullPath = `${folderPath}/${finalFileName}`.replace(/\/+/g, '/');
                    const newFile = await this.app.vault.createBinary(fullPath, bytes.buffer);
                    
                    // Call onChoose with the new file
                    this.onChoose(newFile);
                    this.close();
                } catch (error) {
                    new Notice(`Failed to save image: ${error.message}`);
                }
            }
        } catch (error) {
            console.error('Error selecting icon:', error);
            new Notice(`Failed to select icon: ${error.message}`);
        }
    }

    showCollectionsLoading() {
        if (this.collectionsGridContainer) {
            // this.collectionsGridContainer.empty();
            // this.collectionsPaginationContainer.empty();
            
            const loadingContainer = this.collectionsGridContainer.createDiv({
                cls: 'pixel-banner-loading-container',
                attr: {
                    style: `
                        position: absolute;
                        top: 0;
                        right: 0;
                        bottom: 0;
                        left: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        background-color: var(--background-secondary);
                        opacity: 0.7;
                    `
                }
            });
            
            loadingContainer.createDiv({
                cls: 'pixel-banner-loading-spinner',
                attr: {
                    style: `
                        width: 40px;
                        height: 40px;
                        border: 4px solid var(--background-modifier-border);
                        border-top: 4px solid var(--text-accent);
                        border-radius: 50%;
                        animation: pixel-banner-spin 1s linear infinite;
                    `
                }
            });
        }
    }

    hideCollectionsLoading() {
        // Loading spinner is removed when rendering new content
    }

    showCollectionsError(message) {
        if (this.collectionsGridContainer) {
            this.collectionsGridContainer.empty();
            
            this.collectionsGridContainer.createEl('div', {
                cls: 'pixel-banner-error',
                text: `Error: ${message}`,
                attr: {
                    style: `
                        color: var(--text-error);
                        padding: 16px;
                        border: 1px solid var(--background-modifier-error);
                        border-radius: 4px;
                        background-color: var(--background-modifier-error-rgb);
                        margin-bottom: 16px;
                        grid-column: 1 / -1;
                    `
                }
            });
        }
    }

    renderIcons(icons, totalPages, totalCount) {
        this.collectionsGridContainer.empty();
        this.collectionsPaginationContainer.empty();
        
        this.iconsTotalPages = totalPages || 1;
        
        if (!icons || icons.length === 0) {
            this.collectionsGridContainer.createEl('div', {
                cls: 'pixel-banner-no-icons',
                text: this.isIconsSearchMode ? 'No icons found matching your search.' : 'No icons found in this category.',
                attr: {
                    style: `
                        width: 100%;
                        padding: 32px;
                        text-align: center;
                        color: var(--text-muted);
                        background-color: var(--background-secondary);
                        border-radius: 4px;
                        grid-column: 1 / -1;
                    `
                }
            });
            return;
        }
        
        // Create icons grid
        icons.forEach(icon => {
            const iconContainer = this.collectionsGridContainer.createDiv({
                cls: 'pixel-banner-icon-item',
                attr: {
                    style: `
                        border: 1px solid var(--background-modifier-border);
                        border-radius: 4px;
                        overflow: hidden;
                        cursor: pointer;
                        transition: transform 0.2s ease, box-shadow 0.2s ease;
                    `
                }
            });
            
            iconContainer.addEventListener('mouseenter', () => {
                iconContainer.style.transform = 'translateY(-2px)';
                iconContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
            });
            
            iconContainer.addEventListener('mouseleave', () => {
                iconContainer.style.transform = 'none';
                iconContainer.style.boxShadow = 'none';
            });
            
            // Image container
            const imageContainer = iconContainer.createDiv({
                attr: {
                    style: `
                        height: 120px;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        background-color: var(--background-secondary);
                        padding: 8px;
                    `
                }
            });
            
            // Create image element
            const image = imageContainer.createEl('img', {
                attr: {
                    src: icon.base64Image,
                    alt: icon.description,
                    style: `
                        max-width: 100%;
                        max-height: 100%;
                        object-fit: contain;
                    `
                }
            });
            
            // Icon info
            const infoContainer = iconContainer.createDiv({
                attr: {
                    style: `
                        padding: 8px;
                        background-color: var(--background-primary);
                    `
                }
            });
            
            infoContainer.createEl('div', {
                text: icon.description,
                attr: {
                    style: `
                        font-size: 12px;
                        font-weight: 500;
                        margin-bottom: 4px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    `
                }
            });
            
            infoContainer.createEl('div', {
                text: icon.category,
                attr: {
                    style: `
                        font-size: 10px;
                        color: var(--text-muted);
                    `
                }
            });
            
            // Add click handler
            iconContainer.addEventListener('click', () => {
                this.onChooseIcon(icon);
            });
        });
        
        // Create pagination if needed
        if (totalPages > 1) {
            // Pagination info
            const paginationInfo = this.collectionsPaginationContainer.createEl('div', {
                text: `Page ${this.iconsCurrentPage} of ${totalPages} (${totalCount} icons)`,
                attr: {
                    style: `
                        font-size: 12px;
                        color: var(--text-muted);
                    `
                }
            });
            
            // Pagination controls
            const paginationControls = this.collectionsPaginationContainer.createDiv({
                attr: {
                    style: `
                        display: flex;
                        gap: 4px;
                    `
                }
            });
            
            // First page button
            const firstPageButton = paginationControls.createEl('button', {
                text: '«',
                cls: 'pixel-banner-pagination-button'
            });
            
            if (this.iconsCurrentPage === 1) {
                firstPageButton.disabled = true;
            }
            
            firstPageButton.addEventListener('click', () => {
                if (this.iconsCurrentPage !== 1) {
                    this.iconsCurrentPage = 1;
                    this._isPaginating = true;
                    this.isIconsSearchMode ? this.searchIcons() : this.fetchIconsByCategory();
                }
            });
            
            // Previous page button
            const prevPageButton = paginationControls.createEl('button', {
                text: '‹',
                cls: 'pixel-banner-pagination-button'
            });
            
            if (this.iconsCurrentPage === 1) {
                prevPageButton.disabled = true;
            }
            
            prevPageButton.addEventListener('click', () => {
                if (this.iconsCurrentPage > 1) {
                    this.iconsCurrentPage--;
                    this._isPaginating = true;
                    this.isIconsSearchMode ? this.searchIcons() : this.fetchIconsByCategory();
                }
            });
            
            // Page number
            const pageNumber = paginationControls.createEl('span', {
                text: this.iconsCurrentPage.toString(),
                attr: {
                    style: `
                        padding: 4px 8px;
                    `
                }
            });
            
            // Next page button
            const nextPageButton = paginationControls.createEl('button', {
                text: '›',
                cls: 'pixel-banner-pagination-button'
            });
            
            if (this.iconsCurrentPage === totalPages) {
                nextPageButton.disabled = true;
            }
            
            nextPageButton.addEventListener('click', () => {
                if (this.iconsCurrentPage < totalPages) {
                    this.iconsCurrentPage++;
                    this._isPaginating = true;
                    this.isIconsSearchMode ? this.searchIcons() : this.fetchIconsByCategory();
                }
            });
            
            // Last page button
            const lastPageButton = paginationControls.createEl('button', {
                text: '››',
                cls: 'pixel-banner-pagination-button'
            });
            
            if (this.iconsCurrentPage === totalPages) {
                lastPageButton.disabled = true;
            }
            
            lastPageButton.addEventListener('click', () => {
                if (this.iconsCurrentPage !== totalPages) {
                    this.iconsCurrentPage = totalPages;
                    this._isPaginating = true;
                    this.isIconsSearchMode ? this.searchIcons() : this.fetchIconsByCategory();
                }
            });
        }
    }

    async searchIcons() {
        const searchTerm = this.iconSearchInput.value.trim();
        if (!searchTerm) return;
        
        this.isIconsSearchMode = true;
        
        // Only reset to page 1 when initiating a new search, not when paginating
        if (!this._isPaginating) {
            this.iconsCurrentPage = 1;
        }
        
        // Show loading state
        this.showCollectionsLoading();
        
        try {
            const url = `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.BANNER_ICONS_SEARCH}?key=${PIXEL_BANNER_PLUS.BANNER_ICON_KEY}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    searchTerm,
                    page: this.iconsCurrentPage,
                    limit: this.iconsPerPage
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to search icons');
            }
            
            // Store the current page from the response to ensure synchronization
            this.iconsCurrentPage = data.currentPage || this.iconsCurrentPage;
            
            this.renderIcons(data.bannerIcons, data.totalPages, data.totalCount);
        } catch (error) {
            console.error('Error searching icons:', error);
            this.showCollectionsError(error.message);
        } finally {
            this.hideCollectionsLoading();
            this._isPaginating = false;
        }
    }

    updateImageGrid() {
        this.gridContainer.empty();
        this.paginationContainer.empty();

        let filteredFiles = this.imageFiles.filter(file => {
            const filePath = (file && file.path) ? file.path.toLowerCase() : '';
            const fileName = (file && file.name) ? file.name.toLowerCase() : '';
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
                    'No images on this page.',
                attr: {
                    style: `
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
                    `
                }
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
            if (file && file.extension && file.extension.toLowerCase() === 'svg') {
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
                // Add defensive check for file.path
                if (!file || !file.path) {
                    console.error('🔧 ERROR: file or file.path is undefined during selection');
                    return;
                }
                
                this.onChoose(file.path);
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
                text: '««'
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
                text: '‹'
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
                text: '›'
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
                text: '››'
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
        if (this.spinnerStyle) {
            this.spinnerStyle.remove();
        }
        
        // Only open targeting modal if:
        // 1. The setting is enabled
        // 2. A targeting modal hasn't already been opened via the onChoose callback
        if (this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon && !this.targetingModalOpened) {
            // Only open if there's an active file
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                // Import dynamically to avoid circular dependencies
                const { TargetPositionModal } = require('./targetPositionModal');
                new TargetPositionModal(this.app, this.plugin).open();
            }
        }
        
        const { contentEl } = this;
        contentEl.empty();
    }
}
