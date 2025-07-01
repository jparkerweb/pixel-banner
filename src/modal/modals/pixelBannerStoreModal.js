import { Modal, Notice } from 'obsidian';
import { PIXEL_BANNER_PLUS } from '../../resources/constants';
import { handlePinIconClick } from '../../utils/handlePinIconClick';
import { decimalToFractionString } from '../../utils/fractionTextDisplay';
import { TargetPositionModal } from '../modals';
import { flags } from '../../resources/flags.js';
import { SelectPixelBannerModal } from './selectPixelBannerModal';


// ------------------------------------
// -- Pixel Banner Store Modal Class --
// ------------------------------------
export class PixelBannerStoreModal extends Modal {
    constructor(app, plugin) {
        super(app);
        this.plugin = plugin;
        this.categories = [];
        this.selectedCategory = null;
        this.selectedCategoryIndex = 0;
        this.imageContainer = null;
        this.loadingEl = null;
        this.modalEl.addClass('pixel-banner-store-modal');
        this.isLoading = true; // Track loading state
        this.currentPage = 1;
        this.totalPages = 1;
        this.searchTerm = '';
        this.isSearchMode = false;
        this.itemsPerPage = 18;
        this.voteStats = {}; // Store vote stats for each banner
        this.userVotes = {}; // Store user's votes for each banner
        this.storeVotingEnabled = this.plugin.settings.storeVotingEnabled !== false; // Default to true if not set
    }

    // ----------------
    // -- Open Modal --
    // ----------------
    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Show loading spinner immediately
        this.showLoadingSpinner(contentEl);
        
        // Continue with initialization in the background
        this.initializeModal().catch(error => {
            console.error('Error initializing modal:', error);
            this.hideLoadingSpinner();
            contentEl.createEl('p', {
                text: 'Failed to load store. Please try again later.',
                cls: 'pixel-banner-store-error'
            });
        });
    }
    
    // Show loading spinner
    showLoadingSpinner(container) {
        this.isLoading = true;
        this.loadingOverlay = container.createDiv({ 
            cls: 'pixel-banner-store-loading-overlay',
            attr: {
                style: `
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: var(--background-primary);
                    z-index: 100;
                `
            }
        });
        
        this.loadingOverlay.createDiv({
            cls: 'pixel-banner-store-spinner',
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
    
    // Hide loading spinner
    hideLoadingSpinner() {
        this.isLoading = false;
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
            this.loadingOverlay = null;
        }
    }
    
    // Download and save banner (handles both images and videos)
    async downloadAndSaveBanner(data, filename) {
        try {
            if (data.fileType === 'video') {
                // Handle video file with user folder/filename selection
                await this.saveVideoFileWithPrompts(data.base64Image, filename);
            } else {
                // Handle image file (existing behavior)
                await handlePinIconClick(data.base64Image, this.plugin, null, filename.replace(/\.[^/.]+$/, ''));
            }
        } catch (error) {
            console.error('Error saving banner:', error);
            new Notice('Failed to save banner. Please try again.');
        }
    }
    
    // Save video file with user prompts (similar to handlePinIconClick flow)
    async saveVideoFileWithPrompts(base64Video, suggestedFilename) {
        try {
            // Convert base64 to ArrayBuffer
            const base64Data = base64Video.split(',')[1]; // Remove data:video/mp4;base64, prefix
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            
            const arrayBuffer = new Uint8Array(byteNumbers).buffer;
            
            // Use the same folder/filename selection flow as images
            const { file, useAsBanner } = await this.saveVideoLocally(arrayBuffer, suggestedFilename);
            const finalPath = await this.waitForFileRename(file);

            if (!finalPath) {
                console.error('❌ Failed to resolve valid file path');
                new Notice('Failed to save video - file not found');
                return null;
            }
            
            if (useAsBanner) {
                // Import updateNoteFrontmatter for video banners too
                const { updateNoteFrontmatter } = await import('../../utils/frontmatterUtils');
                await updateNoteFrontmatter(finalPath, this.plugin, null);
            }

            return finalPath;
        } catch (error) {
            console.error('Error saving video file:', error);
            throw error;
        }
    }
    
    // Save video locally with folder/filename prompts (adapted from handlePinIconClick)
    async saveVideoLocally(arrayBuffer, suggestedFilename) {
        const { FolderSelectionModal } = await import('../modals/folderSelectionModal');
        const { SaveImageModal } = await import('../modals/saveImageModal');
        
        const vault = this.plugin.app.vault;
        const defaultFolderPath = this.plugin.settings.pinnedImageFolder;

        // Prompt for folder selection
        const folderPath = await new Promise((resolve) => {
            const modal = new FolderSelectionModal(this.plugin.app, defaultFolderPath, (result) => {
                resolve(result);
            });
            modal.open();
        });

        if (!folderPath) {
            throw new Error('No folder selected');
        }

        if (!await vault.adapter.exists(folderPath)) {
            await vault.createFolder(folderPath);
        }

        // Extract base filename and extension from suggested filename
        const filenameParts = suggestedFilename.match(/^(.+)\.(\w+)$/);
        const baseName = filenameParts ? filenameParts[1] : suggestedFilename;
        const extension = filenameParts ? filenameParts[2] : 'mp4';

        // Prompt for filename (suggest base name without extension)
        const userInput = await new Promise((resolve) => {
            const modal = new SaveImageModal(this.plugin.app, baseName, (name, useAsBanner) => {
                resolve({ name, useAsBanner });
            });
            modal.open();
        });

        if (!userInput) {
            throw new Error('No filename provided');
        }

        let finalBaseName = userInput.name.replace(/[^a-zA-Z0-9-_ ]/g, '').trim();
        if (!finalBaseName) finalBaseName = 'banner';
        
        // Ensure proper extension
        if (!finalBaseName.toLowerCase().endsWith(`.${extension}`)) {
            finalBaseName += `.${extension}`;
        }

        let fileName = finalBaseName;
        let counter = 1;
        while (await vault.adapter.exists(`${folderPath}/${fileName}`)) {
            const nameWithoutExt = finalBaseName.slice(0, -(extension.length + 1));
            fileName = `${nameWithoutExt}-${counter}.${extension}`;
            counter++;
        }

        const filePath = `${folderPath}/${fileName}`;
        const savedFile = await vault.createBinary(filePath, arrayBuffer);

        return {
            initialPath: filePath,
            file: savedFile,
            useAsBanner: userInput.useAsBanner
        };
    }
    
    // Wait for potential file rename (adapted from handlePinIconClick)
    async waitForFileRename(file) {
        const maxWaitTime = 5000;
        const checkInterval = 100;
        let elapsedTime = 0;
        
        while (elapsedTime < maxWaitTime) {
            try {
                const currentFile = this.plugin.app.vault.getAbstractFileByPath(file.path);
                if (currentFile) {
                    return currentFile.path;
                }
            } catch (error) {
                // File might be in process of being renamed, continue waiting
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            elapsedTime += checkInterval;
        }
        
        // If we get here, return the original path
        return file.path;
    }
    
    // Initialize modal content
    async initializeModal() {
        await this.plugin.verifyPixelBannerPlusCredentials();
        const { contentEl } = this;
        
        contentEl.createEl('h3', { text: '🏪 Pixel Banner Plus Collection', cls: 'margin-top-0' });
        contentEl.createEl('p', {
            text: `Browse the Pixel Banner Plus Collection to find the perfect banner for your needs. Banner Token prices are displayed on each card below (FREE or 1 Banner Token). Previous purchases will be listed as FREE.`,
            attr: {
                'style': 'font-size: 12px; color: var(--text-muted);'
            }
        });
        
        // Create select container
        const selectContainer = contentEl.createDiv({ cls: 'pixel-banner-store-select-container' });
        
        // Create the search UI elements (initially hidden)
        if (this.plugin.pixelBannerPlusEnabled) {
            // Search input (initially hidden)
            this.searchContainer = selectContainer.createDiv({ 
                cls: 'pixel-banner-store-search-container',
                attr: {
                    style: `
                        display: none;
                        align-items: center;
                        gap: 5px;
                        margin: 0 0 0 auto;
                    `
                }
            });
            
            this.searchInput = this.searchContainer.createEl('input', {
                type: 'text',
                placeholder: 'Search banners...',
                cls: 'pixel-banner-store-search-input'
            });
            
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.searchBanners();
                }
            });
            
            // Search button (initially hidden)
            this.searchButton = this.searchContainer.createEl('button', {
                text: 'Search',
                cls: 'pixel-banner-store-search-button'
            });
            
            this.searchButton.addEventListener('click', () => {
                this.searchBanners();
            });
            
            // Stop searching button (initially hidden)
            this.stopSearchButton = this.searchContainer.createEl('button', {
                text: 'Back to Categories',
                cls: 'pixel-banner-store-stop-search-button'
            });
            
            this.stopSearchButton.addEventListener('click', () => {
                this.toggleSearchMode(false);
            });
        }
        
        // Create and populate select element
        this.categorySelect = selectContainer.createEl('select', { 
            cls: 'pixel-banner-store-select',
            attr: {
                style: `
                    display: ${this.plugin.pixelBannerPlusEnabled ? 'block' : 'none'};
                `
            }
        });

        // Add default option
        const defaultOption = this.categorySelect.createEl('option', {
            text: 'Select a category...',
            value: ''
        });
        defaultOption.disabled = true;
        defaultOption.selected = true;

        try {
            const response = await fetch(
                `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.STORE_CATEGORIES}`, 
                {
                    headers: {
                        'x-user-email': this.plugin.settings.pixelBannerPlusEmail,
                        'x-api-key': this.plugin.settings.pixelBannerPlusApiKey,
                        'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.categories = Array.isArray(data) ? data : data.categories || [];
            
            if (this.categories.length === 0) {
                throw new Error('No categories found');
            }

            // Populate select with categories
            this.categories.forEach(category => {
                this.categorySelect.createEl('option', {
                    value: category.id,
                    text: category.category
                });
            });

            // Add change event listener
            this.categorySelect.addEventListener('change', async (e) => {
                this.selectedCategory = e.target.value;
                this.selectedCategoryIndex = e.target.selectedIndex;
                await this.loadCategoryImages();
            });

        } catch (error) {
            console.error('Failed to fetch categories:', error);
            selectContainer.createEl('p', {
                text: 'Failed to load categories. Please try again later.',
                cls: 'pixel-banner-store-error',
                attr: {
                    style: `
                        display: ${this.plugin.pixelBannerPlusEnabled ? 'block' : 'none'};
                    `
                }
            });
        }

        // Create the category controls container for better grouping
        this.categoryControlsContainer = selectContainer.createDiv({
            cls: 'pixel-banner-store-category-controls',
            attr: {
                style: `
                    display: flex;
                    align-items: center;
                    gap: 10px;
                `
            }
        });

        // Next Category button
        this.nextCategoryButton = this.categoryControlsContainer.createEl('button', {
            text: '▶️ Next Category',
            cls: 'pixel-banner-store-next-category radial-pulse-animation',
            attr: {
                style: `
                    display: ${this.plugin.pixelBannerPlusEnabled ? 'inline-flex' : 'none'};
                `
            }
        });
        
        // On click of Next Category button, load the next category
        this.nextCategoryButton.addEventListener('click', async () => {
            // If already at the last category, loop back to the first category
            if (this.selectedCategoryIndex >= this.categories.length) {
                this.selectedCategoryIndex = 1;
            } else {
                this.selectedCategoryIndex++;
            }
            // Update select box with the new category  
            this.categorySelect.selectedIndex = this.selectedCategoryIndex;
            this.selectedCategory = this.categorySelect.value;
            await this.loadCategoryImages();
        });

        // Search All button (initially visible)
        if (this.plugin.pixelBannerPlusEnabled) {
            this.searchAllButton = this.categoryControlsContainer.createEl('button', {
                text: '🔍 Search All',
                cls: 'pixel-banner-store-search-all-button'
            });
            
            this.searchAllButton.addEventListener('click', () => {
                this.toggleSearchMode(true);
            });
        }

        // Back to Main Menu button
        const backToMainButton = selectContainer.createEl('button', {
            text: '⇠ Main Menu',
            cls: 'pixel-banner-store-back-to-main'
        });
        
        // On click of Back to Main Menu button, close this modal and open the Pixel Banner Menu modal
        backToMainButton.addEventListener('click', () => {
            this.close();
            new SelectPixelBannerModal(this.app, this.plugin).open();
        });

        // Create container for images
        if (this.plugin.pixelBannerPlusEnabled) {
            this.imageContainer = contentEl.createDiv({ cls: 'pixel-banner-store-image-grid -empty' });
            // Add store-voting-off class if store voting is disabled
            if (!this.storeVotingEnabled) {
                this.imageContainer.addClass('store-voting-off');
            }
            // Add an async delay that will select the first option in the category select element
            setTimeout(async () => {
                // Abort if the category select element no longer has the first option selected (the user may have changed the category)
                if (this.categorySelect.selectedIndex === 0) {
                    this.categorySelect.selectedIndex = 1;
                    this.selectedCategoryIndex = 1;
                    this.selectedCategory = this.categorySelect.value;
                    await this.loadCategoryImages();
                }
            }, 50);
        } else {
            this.imageContainer = contentEl.createDiv({ cls: 'pixel-banner-store-image-grid -not-connected' });
        }

        // Bottom controls container (for account status and pagination)
        const bottomControlsContainer = contentEl.createDiv({
            cls: 'pixel-banner-store-bottom-controls',
            attr: {
                'style': `
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: 15px;
                    border-top: 1px solid var(--background-modifier-border);
                    padding-top: 10px;
                `
            }
        });

        // Pixel Banner Plus Account Status Section
        const pixelBannerPlusAccountStatus = bottomControlsContainer.createDiv({
            cls: 'pixel-banner-store-account-status',
            attr: {
                'style': `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    justify-content: flex-start;
                    font-size: .9em;
                `
            }
        });
        
        // Create pagination container (initially empty)
        this.paginationContainer = bottomControlsContainer.createDiv({
            cls: 'pixel-banner-store-pagination-container',
            attr: {
                'style': `
                    display: flex;
                    align-items: center;
                    gap: 8px;
                `
            }
        });

        // Add Store Voting toggle
        const storeVotingContainer = bottomControlsContainer.createDiv({
            cls: 'pixel-banner-store-voting-container',
            attr: {
                'style': `
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-left: 16px;
                `
            }
        });
        
        // Store Voting Toggle
        const storeVotingToggle = storeVotingContainer.createEl('input', {
            type: 'checkbox',
            cls: 'pixel-banner-store-voting-toggle',
            attr: {
                id: 'store-voting-toggle',
                style: `
                    cursor: pointer;
                `
            }
        });
        storeVotingToggle.checked = this.storeVotingEnabled === true;

        storeVotingContainer.createEl('label', {
            text: 'Store Voting',
            cls: 'pixel-banner-store-voting-label',
            attr: {
                for: 'store-voting-toggle',
                style: `
                    font-size: 0.8em;
                    cursor: pointer;
                    color: var(--text-muted);
                    letter-spacing: 0.05em;
                `
            }
        });

        storeVotingToggle.addEventListener('change', (e) => {
            this.storeVotingEnabled = e.target.checked;
            // Save preference to plugin settings
            this.plugin.settings.storeVotingEnabled = this.storeVotingEnabled;
            this.plugin.saveSettings();
            
            // Toggle class on image grid
            if (this.storeVotingEnabled) {
                this.imageContainer.removeClass('store-voting-off');
            } else {
                this.imageContainer.addClass('store-voting-off');
            }
        });

        // Connection Status        
        const isConnected = this.plugin.pixelBannerPlusEnabled;
        const statusText = isConnected ? '✅ Connected' : '❌ Not Connected';
        const statusBorderColor = isConnected ? '#20bf6b' : '#FF0000';
        
        const connectionStatusEl = pixelBannerPlusAccountStatus.createEl('span', {
            text: statusText,
            cls: 'pixel-banner-status-value',
            attr: {
                style: `border: 1px dotted ${statusBorderColor};`
            }
        });
        
        // Available Tokens        
        const tokenCount = this.plugin.pixelBannerPlusBannerTokens !== undefined ? 
            `🪙 ${decimalToFractionString(this.plugin.pixelBannerPlusBannerTokens)} Tokens` : '❓ Unknown';
        
        const tokenCountEl = pixelBannerPlusAccountStatus.createEl('span', {
            text: tokenCount,
            cls: 'pixel-banner-status-value',
            attr: {
                style: `
                    border: 1px dotted #F3B93B;
                    display: ${this.plugin.pixelBannerPlusEnabled ? 'inline-flex' : 'none'};
                `
            }
        });

        // Open settings and navigate to Pixel Banner tab
        const openPlusSettings = async () => {
            this.close();
            await this.app.setting.open();
            await new Promise(resolve => setTimeout(resolve, 300)); // Wait for settings to load
            
            // Find and click the Pixel Banner item in the settings sidebar
            const settingsTabs = document.querySelectorAll('.vertical-tab-header-group .vertical-tab-nav-item');
            for (const tab of settingsTabs) {
                if (tab.textContent.includes('Pixel Banner')) {
                    tab.click();
                    break;
                }
            }
            
            // Find and click the Pixel Banner Plus item in the settings sidebar
            const pixelBannerSettingsTabs = document.querySelectorAll('.pixel-banner-settings-tabs > button.pixel-banner-settings-tab');
            for (const tab of pixelBannerSettingsTabs) {
                if (tab.textContent.includes('Plus')) {
                    tab.click();
                    break;
                }
            }

        };
        // Plus Settings Listener for `accountTitle` and `statusContainer`
        connectionStatusEl.addEventListener('click', openPlusSettings);
        tokenCountEl.addEventListener('click', openPlusSettings);            
        
        // Show Buy Tokens button if connected
        if (isConnected && this.plugin.pixelBannerPlusBannerTokens === 0) {
            const buyTokensButton = pixelBannerPlusAccountStatus.createEl('button', {
                cls: 'pixel-banner-account-button pixel-banner-buy-tokens-button',
                text: '💵 Buy More Tokens'
            });
            
            buyTokensButton.addEventListener('click', (event) => {
                event.preventDefault();
                window.open(PIXEL_BANNER_PLUS.SHOP_URL, '_blank');
            });
        } 
        // Show Signup button if not connected
        else if (!isConnected) {
            const signupButton = pixelBannerPlusAccountStatus.createEl('button', {
                cls: 'pixel-banner-account-button pixel-banner-signup-button',
                text: '🚩 Signup for Free!'
            });
            
            signupButton.addEventListener('click', (event) => {
                event.preventDefault();
                const signupUrl = PIXEL_BANNER_PLUS.API_URL + PIXEL_BANNER_PLUS.ENDPOINTS.SIGNUP;
                window.open(signupUrl, '_blank');
            });
        }

        this.addStyle();
        
        // Hide loading spinner when everything is loaded
        this.hideLoadingSpinner();
    }


    // --------------------------
    // -- Load Category Images --
    // --------------------------
    async loadCategoryImages(page = 1) {
        if (!this.selectedCategory) return;
        
        // Set category mode and current page
        this.isSearchMode = false;
        this.currentPage = page;

        // Clear previous votes data when loading new category (only on first page)
        if (page === 1) {
            this.userVotes = {};
            this.voteStats = {};
        }

        // Clear previous images
        this.imageContainer.empty();
        
        // Make sure the store-voting-off class is correctly applied based on the current setting
        if (this.storeVotingEnabled) {
            this.imageContainer.removeClass('store-voting-off');
        } else {
            this.imageContainer.addClass('store-voting-off');
        }

        // Show loading spinner
        this.loadingEl = this.imageContainer.createDiv({ cls: 'pixel-banner-store-loading' });
        this.loadingEl.innerHTML = `<div class="pixel-banner-store-spinner"></div>`;

        try {
            const response = await fetch(
                `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.STORE_CATEGORY_IMAGES}?categoryId=${this.selectedCategory}&page=${this.currentPage}&limit=${this.itemsPerPage}`, 
                {
                    headers: {
                        'x-user-email': this.plugin.settings.pixelBannerPlusEmail,
                        'x-api-key': this.plugin.settings.pixelBannerPlusApiKey,
                        'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            
            // Handle both array response (legacy) and object response (with pagination)
            let images, totalPages = 1, totalItems = 0;
            
            if (Array.isArray(data)) {
                // Legacy response format - all images in array
                images = data;
                totalPages = Math.ceil(images.length / this.itemsPerPage);
                totalItems = images.length;
                // Slice for client-side pagination if API doesn't support server-side paging yet
                const startIndex = (this.currentPage - 1) * this.itemsPerPage;
                const endIndex = startIndex + this.itemsPerPage;
                images = images.slice(startIndex, endIndex);
            } else {
                // New response format with pagination info
                images = data.images || data.banners || [];
                totalPages = data.totalPages || 1;
                totalItems = data.totalItems || data.totalCount || images.length;
            }
            
            this.totalPages = totalPages;
            this.displayImages(images, false, totalItems);
            
            // Show pagination controls for category browsing
            if (totalPages > 1) {
                this.addPaginationControls();
            } else {
                // Hide pagination if only one page
                this.paginationContainer.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Failed to fetch images:', error);
            this.imageContainer.empty();
            this.imageContainer.createEl('p', {
                text: 'Failed to load images. Please try again.',
                cls: 'pixel-banner-store-error'
            });
        }
    }
    
    // -----------------
    // -- Search Banners --
    // -----------------
    async searchBanners(page = 1) {
        this.searchTerm = this.searchInput.value.trim();
        
        if (!this.searchTerm) {
            new Notice('Please enter a search term');
            return;
        }
        
        // Set search mode active
        this.isSearchMode = true;
        this.currentPage = page;
        
        // Clear previous images
        this.imageContainer.empty();
        
        // Make sure the store-voting-off class is correctly applied based on the current setting
        if (this.storeVotingEnabled) {
            this.imageContainer.removeClass('store-voting-off');
        } else {
            this.imageContainer.addClass('store-voting-off');
        }
        
        // Show loading spinner
        this.loadingEl = this.imageContainer.createDiv({ cls: 'pixel-banner-store-loading' });
        this.loadingEl.innerHTML = `<div class="pixel-banner-store-spinner"></div>`;
        
        try {
            const response = await fetch(
                `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.STORE_IMAGE_SEARCH}`, 
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-email': this.plugin.settings.pixelBannerPlusEmail,
                        'x-api-key': this.plugin.settings.pixelBannerPlusApiKey,
                        'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        searchTerm: this.searchTerm,
                        page: this.currentPage,
                        limit: this.itemsPerPage,
                        sort: 'date_added',
                        order: 'desc'
                    })
                }
            );
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            
            // Update pagination info
            this.totalPages = data.totalPages || data.total_pages || 1;
            
            // Handle different response structures
            let imagesArray = [];
            
            if (data.images && Array.isArray(data.images)) {
                // Format: { images: [...] }
                imagesArray = data.images;
            } else if (data.banners && Array.isArray(data.banners)) {
                // Format: { banners: [...] }
                imagesArray = data.banners;
            } else if (data.results && Array.isArray(data.results)) {
                // Format: { results: [...] }
                imagesArray = data.results;
            } else if (Array.isArray(data)) {
                // Format: directly an array
                imagesArray = data;
            } else if (data.image) {
                // Single image response
                imagesArray = [data.image];
            } else if (data.banner) {
                // Single banner response
                imagesArray = [data.banner];
            } else if (typeof data === 'object' && data !== null) {
                // Might be a single result object
                imagesArray = [data];
            }
            
            // Check if we have a valid array now
            if (!Array.isArray(imagesArray)) {
                console.error('Failed to extract images array from response:', data);
                throw new Error('Invalid response format: could not extract images array');
            }
            
            if (imagesArray.length === 0) {
                this.imageContainer.empty();
                this.imageContainer.createEl('p', {
                    text: `No results found for "${this.searchTerm}"`,
                    cls: 'pixel-banner-store-no-results',
                    attr: {
                        style: `
                            text-align: center;
                            margin-top: 100px;
                            font-size: 16px;
                        `
                    }
                });
                return;
            }
            
            // Clear any previous vote data when loading new search results
            this.userVotes = {};
            this.voteStats = {};
            
            this.displayImages(imagesArray, true);
        } catch (error) {
            console.error('Failed to search images:', error);
            this.imageContainer.empty();
            this.imageContainer.createEl('p', {
                text: `Failed to search images: ${error.message}. Please try again.`,
                cls: 'pixel-banner-store-error'
            });
        }
    }


    // --------------------
    // -- Display Images --
    // --------------------
    displayImages(images, isSearchResult = false, totalItems = 0) {
        // Remove loading spinner if it exists
        if (this.loadingEl) {
            this.loadingEl.remove();
            this.loadingEl = null;
        }
        
        // Ensure we have an array to work with
        if (!Array.isArray(images)) {
            console.error('displayImages received non-array:', images);
            this.imageContainer.createEl('p', {
                text: 'Error displaying images: Invalid data format',
                cls: 'pixel-banner-store-error'
            });
            return;
        }
        
        if (images.length > 0) {
            this.imageContainer.removeClass('-empty');
            this.imageContainer.removeClass('-not-connected');
        }

        const container = this.imageContainer;
        container.empty();
        
        // Get all valid image IDs for the current view
        const imageIds = images.map(image => image.id || image.imageId || image.bannerId).filter(id => id && id !== 'unknown');
        
        // Store vote data from images array
        if (this.plugin.pixelBannerPlusEnabled && imageIds.length > 0) {
            images.forEach(image => {
                const id = image.id || image.imageId || image.bannerId;
                if (!id || id === 'unknown') return;

                // Store vote stats
                this.voteStats[id] = {
                    upvotes: image.upvotes || 0,
                    downvotes: image.downvotes || 0,
                    total: image.vote_score || 0
                };

                // Store user vote
                if (image.user_vote === 1 || image.user_vote === 'up') {
                    this.userVotes[id] = 'up';
                } else if (image.user_vote === -1 || image.user_vote === 'down') {
                    this.userVotes[id] = 'down';
                } else {
                    this.userVotes[id] = null;
                }

                // Update the display
                this.updateVoteDisplay(id);
            });
        }
        
        // Display images
        images.forEach(image => {
            try {
                // Skip invalid entries
                if (!image || typeof image !== 'object') {
                    console.warn('Skipping invalid image entry:', image);
                    return;
                }
                
                // Get image ID with fallbacks
                const imageId = image.id || image.imageId || image.bannerId || 'unknown';
                
                // Get image cost with fallbacks
                const imageCost = typeof image.cost !== 'undefined' ? image.cost : 
                                  (image.premium ? 1 : 0);
                
                const card = container.createEl('div', {
                    cls: 'pixel-banner-store-image-card',
                    attr: {
                        'data-image-id': imageId,
                        'data-image-cost': imageCost,
                        'data-image-new': true,
                        'data-image-hot': image.hot ? 'true' : 'false',
                        'style': 'position: relative;' // Ensure proper positioning for absolute children
                    }
                });

                // Get image source with fallbacks
                const imageSource = image.base64Image || image.base64 || image.url || image.src || '';
                
                // Check if this is a video banner
                const isVideo = image.fileType === 'video';
                
                if (isVideo) {
                    // For video banners, base64Image is a JPG thumbnail with play icon
                    const imgEl = card.createEl('img', {
                        attr: {
                            src: imageSource,
                            alt: image.prompt || image.description || 'Banner video thumbnail'
                        }
                    });
                    
                    // Add video badge
                    const videoBadge = card.createEl('div', {
                        text: 'VIDEO',
                        cls: 'pixel-banner-store-video-badge',
                        attr: {
                            style: `
                                position: absolute;
                                top: 8px;
                                right: 8px;
                                background: rgba(255, 255, 255, 0.9);
                                color: #333;
                                padding: 2px 6px;
                                border-radius: 3px;
                                font-size: 10px;
                                font-weight: bold;
                                z-index: 2;
                                pointer-events: none;
                            `
                        }
                    });
                } else {
                    // For image banners, display normally
                    const imgEl = card.createEl('img', {
                        attr: {
                            src: imageSource,
                            alt: image.prompt || image.description || 'Banner image'
                        }
                    });
                }

                const details = card.createDiv({ cls: 'pixel-banner-store-image-details' });
                
                // Create wrapper for prompt and filesize (left side)
                const promptWrapper = details.createDiv({ cls: 'pixel-banner-store-prompt-wrapper' });
                
                // Get prompt with fallbacks
                const promptText = image.prompt || image.description || image.title || 'No description';
                const truncatedPrompt = promptText.length > 85 ? promptText.slice(0, 85) + '...' : promptText;
                
                promptWrapper.createEl('p', { text: truncatedPrompt, cls: 'pixel-banner-store-prompt' });
                
                // Display filesize if available (under prompt)
                if (image.filesize) {
                    promptWrapper.createEl('div', {
                        text: image.filesize,
                        cls: 'pixel-banner-store-filesize',
                        attr: {
                            style: `
                                color: var(--text-muted);
                                font-size: 10px;
                                margin: 2px 0 0 0;
                                text-align: left;
                            `
                        }
                    });
                }
                
                const metaDetails = details.createEl('div', { cls: 'pixel-banner-store-meta-details' });
                
                const costText = imageCost === 0 ? 'FREE' : `🪙 ${decimalToFractionString(imageCost)}`;
                const costEl = metaDetails.createEl('div', {
                    text: costText,
                    cls: 'pixel-banner-store-cost',
                    attr: {
                        style: 'color: var(--text-normal);'
                    }
                });
                if (imageCost === 0) {
                    costEl.addClass('free');
                }

                // new
                if (image.new) {
                    metaDetails.createEl('div', {
                        text: 'NEW', 
                        attr: {
                            style: `
                                color: var(--interactive-accent);
                                font-weight: bold;
                                font-size: 11px;
                                margin: 0;
                                text-align: right;
                                white-space: nowrap;
                                margin-left: 5px;
                            `
                        }
                    });
                }

                // hot
                if (image.hot) {
                    metaDetails.createEl('div', {
                        text: '🔥HOT',
                        attr: {
                            style: `
                                color: var(--error-color);
                                font-weight: bold;
                                font-size: 11px;
                                margin: 0;
                                text-align: right;
                                white-space: nowrap;
                                margin-left: 5px;
                            `
                        }
                    });
                }

                // Add vote controls if Pixel Banner Plus is enabled
                if (this.plugin.pixelBannerPlusEnabled && imageId !== 'unknown') {
                    const voteControls = card.createDiv({ 
                        cls: 'pixel-banner-store-vote-controls',
                        attr: {
                            'data-banner-id': imageId
                        }
                    });
                    
                    // Upvote button
                    const upvoteButton = voteControls.createEl('button', {
                        cls: 'pixel-banner-store-vote-button upvote',
                        attr: {
                            'aria-label': 'Upvote Banner',
                            'data-banner-id': imageId
                        }
                    });
                    upvoteButton.innerHTML = '👍';
                    
                    // Vote count
                    const voteCount = voteControls.createEl('span', {
                        cls: 'pixel-banner-store-vote-count',
                        text: '0',
                        attr: {
                            'data-banner-id': imageId
                        }
                    });
                    
                    // Downvote button
                    const downvoteButton = voteControls.createEl('button', {
                        cls: 'pixel-banner-store-vote-button downvote',
                        attr: {
                            'aria-label': 'Downvote Banner',
                            'data-banner-id': imageId
                        }
                    });
                    downvoteButton.innerHTML = '👎';
                    
                    // Add click handlers for vote buttons
                    upvoteButton.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent opening the banner selection
                        this.upvoteBanner(imageId);
                    });
                    
                    downvoteButton.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent opening the banner selection
                        this.downvoteBanner(imageId);
                    });
                    
                    // Update vote display when stats are available
                    this.updateVoteDisplay(imageId);
                }

                // Add click handler
                card.addEventListener('click', async () => {
                    const cost = Number(card.getAttribute('data-image-cost'));
                    
                    if (cost > 0) {
                        new ConfirmPurchaseModal(this.app, cost, image.prompt, image.base64Image, async () => {
                            try {
                                const response = await fetch(`${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.STORE_IMAGE_BY_ID}?bannerId=${image.id}`, {
                                    headers: {
                                        'x-user-email': this.plugin.settings.pixelBannerPlusEmail,
                                        'x-api-key': this.plugin.settings.pixelBannerPlusApiKey,
                                        'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                                        'Accept': 'application/json'
                                    }
                                });

                                if (!response.ok) {
                                    throw new Error('Failed to fetch banner');
                                }

                                // verify account
                                await this.plugin.verifyPixelBannerPlusCredentials();

                                // update the image card with a cost of 0
                                card.setAttribute('data-image-cost', '0');
                                card.querySelector('.pixel-banner-store-cost').classList.add('free');
                                card.querySelector('.pixel-banner-store-cost').textContent = 'FREE';

                                const data = await response.json();
                                let filename = image.prompt?.toLowerCase().replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'banner';
                                filename = filename.replace(/\s+/g, '-').substring(0, 47);
                                
                                // Add file extension based on banner type
                                if (data.fileType === 'video') {
                                    filename += `.${data.fileExtension || 'mp4'}`;
                                } else {
                                    filename += `.${data.fileExtension || 'jpg'}`;
                                }
                                
                                await this.downloadAndSaveBanner(data, filename);
                                this.close();
                                
                                // Check if we should open the targeting modal
                                if (this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                                    new TargetPositionModal(this.app, this.plugin).open();
                                }
                            } catch (error) {
                                console.error('Error purchasing banner:', error);
                                new Notice('Failed to purchase banner. Please try again.');
                            }
                        }, this.plugin, isVideo, image.fileType, image.file_extension).open();
                    } else {
                        try {
                            const response = await fetch(`${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.STORE_IMAGE_BY_ID}?bannerId=${image.id}`, {
                                headers: {
                                    'x-user-email': this.plugin.settings.pixelBannerPlusEmail,
                                    'x-api-key': this.plugin.settings.pixelBannerPlusApiKey,
                                    'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                                    'Accept': 'application/json'
                                }
                            });

                            if (!response.ok) {
                                throw new Error('Failed to fetch banner');
                            }

                            const data = await response.json();
                            let filename = image.prompt?.toLowerCase().replace(/[^a-zA-Z0-9-_ ]/g, '').trim() || 'banner';
                            filename = filename.replace(/\s+/g, '-').substring(0, 47);
                            
                            // Add file extension based on banner type
                            if (data.fileType === 'video') {
                                filename += `.${data.fileExtension || 'mp4'}`;
                            } else {
                                filename += `.${data.fileExtension || 'jpg'}`;
                            }
                            
                            await this.downloadAndSaveBanner(data, filename);
                            this.close();
                            
                            // Check if we should open the targeting modal
                            if (this.plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                                new TargetPositionModal(this.app, this.plugin).open();
                            }
                            
                        } catch (error) {
                            console.error('Error fetching store banner:', error);
                        }
                    }
                });
            } catch (error) {
                console.error('Error rendering image card:', error, image);
            }
        });
        
        // Add pagination for search results if needed
        if (this.isSearchMode && this.totalPages > 1) {
            this.addPaginationControls();
        } else {
            // Hide pagination if not in search mode or only one page
            this.paginationContainer.style.display = 'none';
        }
    }

    // Update vote display for a specific banner
    updateVoteDisplay(bannerId) {
        if (!bannerId) return;
        
        const voteControls = document.querySelector(`.pixel-banner-store-vote-controls[data-banner-id="${bannerId}"]`);
        if (!voteControls) {
            return;
        }
        
        const voteCount = voteControls.querySelector('.pixel-banner-store-vote-count');
        const upvoteButton = voteControls.querySelector('.upvote');
        const downvoteButton = voteControls.querySelector('.downvote');
        
        if (!upvoteButton || !downvoteButton) {
            return;
        }
        
        // Update vote count
        if (voteCount && this.voteStats[bannerId]) {
            voteCount.textContent = this.voteStats[bannerId].total.toString();
            
            // Add positive/negative class based on total
            voteCount.removeClass('positive', 'negative', 'neutral');
            if (this.voteStats[bannerId].total > 0) {
                voteCount.addClass('positive');
            } else if (this.voteStats[bannerId].total < 0) {
                voteCount.addClass('negative');
            } else {
                voteCount.addClass('neutral');
            }
        }
        
        // Update vote buttons based on user's current vote
        if (upvoteButton && downvoteButton) {
            // Remove all classes first
            upvoteButton.removeClass('active');
            upvoteButton.removeClass('active-upvote');
            downvoteButton.removeClass('active');
            downvoteButton.removeClass('active-downvote');
            
            // Apply appropriate active class based on user's vote - handle both string and numeric values
            const userVote = this.userVotes[bannerId];
            
            if (userVote === 'up' || userVote === 1) {
                upvoteButton.addClass('active');
                upvoteButton.addClass('active-upvote');
            } else if (userVote === 'down' || userVote === -1) {
                downvoteButton.addClass('active');
                downvoteButton.addClass('active-downvote');
            }
        }
    }
    
    // Upvote a banner
    async upvoteBanner(bannerId) {
        if (!bannerId || !this.plugin.pixelBannerPlusEnabled) return;
        
        try {
            const endpoint = PIXEL_BANNER_PLUS.ENDPOINTS.BANNER_VOTES_UPVOTE.replace(':id', bannerId);
            const response = await fetch(`${PIXEL_BANNER_PLUS.API_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'x-user-email': this.plugin.settings.pixelBannerPlusEmail,
                    'x-api-key': this.plugin.settings.pixelBannerPlusApiKey,
                    'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Update local vote data
                this.voteStats[bannerId] = {
                    upvotes: data.votes.upvotes || 0,
                    downvotes: data.votes.downvotes || 0,
                    total: data.votes.total || 0
                };
                
                // Toggle user's vote - if they already upvoted, this sets it to null
                // otherwise it sets it to 'up'
                this.userVotes[bannerId] = this.userVotes[bannerId] === 'up' ? null : 'up';
                
                // Update UI
                this.updateVoteDisplay(bannerId);
            }
        } catch (error) {
            console.error('Error upvoting banner:', error);
            new Notice('Failed to upvote banner. Please try again.');
        }
    }
    
    // Downvote a banner
    async downvoteBanner(bannerId) {
        if (!bannerId || !this.plugin.pixelBannerPlusEnabled) return;
        
        try {
            const endpoint = PIXEL_BANNER_PLUS.ENDPOINTS.BANNER_VOTES_DOWNVOTE.replace(':id', bannerId);
            const response = await fetch(`${PIXEL_BANNER_PLUS.API_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'x-user-email': this.plugin.settings.pixelBannerPlusEmail,
                    'x-api-key': this.plugin.settings.pixelBannerPlusApiKey,
                    'X-Pixel-Banner-Version': this.plugin.settings.lastVersion,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                // Update local vote data
                this.voteStats[bannerId] = {
                    upvotes: data.votes.upvotes || 0,
                    downvotes: data.votes.downvotes || 0,
                    total: data.votes.total || 0
                };
                
                // Toggle user's vote - if they already downvoted, this sets it to null
                // otherwise it sets it to 'down'
                this.userVotes[bannerId] = this.userVotes[bannerId] === 'down' ? null : 'down';
                
                // Update UI
                this.updateVoteDisplay(bannerId);
            }
        } catch (error) {
            console.error('Error downvoting banner:', error);
            new Notice('Failed to downvote banner. Please try again.');
        }
    }

    // Toggle between search mode and category browsing mode
    toggleSearchMode(enableSearch) {
        if (enableSearch) {
            // Switch to search mode
            this.categorySelect.style.display = 'none';
            this.nextCategoryButton.style.display = 'none';
            this.searchAllButton.style.display = 'none';
            this.searchContainer.style.display = 'flex';
            this.searchInput.value = '';
            this.searchInput.focus();
            this.isSearchMode = true;
        } else {
            // Switch back to category mode
            this.searchContainer.style.display = 'none';
            this.categorySelect.style.display = 'block';
            this.nextCategoryButton.style.display = 'inline-flex';
            this.searchAllButton.style.display = 'inline-flex';
            this.isSearchMode = false;
            
            // Hide pagination when returning to category mode
            this.paginationContainer.style.display = 'none';
            
            // If a category was previously selected, reload its images
            if (this.selectedCategory) {
                this.loadCategoryImages();
            }
        }
    }
    
    // --------------------------
    // -- Add Pagination Controls --
    // --------------------------
    addPaginationControls() {
        // Clear the pagination container
        this.paginationContainer.empty();
        
        // Show the pagination container
        this.paginationContainer.style.display = 'flex';
        
        // Previous button
        const prevButton = this.paginationContainer.createEl('button', {
            text: '← Previous',
            cls: 'pixel-banner-store-pagination-button',
            attr: {
                disabled: this.currentPage === 1 ? 'disabled' : null
            }
        });
        
        prevButton.addEventListener('click', () => {
            if (this.currentPage > 1) {
                if (this.isSearchMode) {
                    this.searchBanners(this.currentPage - 1);
                } else {
                    this.loadCategoryImages(this.currentPage - 1);
                }
            }
        });
        
        // Page indicator
        this.paginationContainer.createEl('span', {
            text: `Page ${this.currentPage} of ${this.totalPages}`,
            cls: 'pixel-banner-store-pagination-info'
        });
        
        // Next button
        const nextButton = this.paginationContainer.createEl('button', {
            text: 'Next →',
            cls: 'pixel-banner-store-pagination-button',
            attr: {
                disabled: this.currentPage === this.totalPages ? 'disabled' : null
            }
        });
        
        nextButton.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                if (this.isSearchMode) {
                    this.searchBanners(this.currentPage + 1);
                } else {
                    this.loadCategoryImages(this.currentPage + 1);
                }
            }
        });
    }

    addStyle() {
        const style = document.createElement('style');
        style.textContent = `
            .pixel-banner-store-modal {
                top: unset !important;
                width: var(--dialog-max-width);
                max-width: 1100px;
                animation: pixel-banner-fade-in 1300ms ease-in-out;
            }

            .pixel-banner-store-select-container {
                display: flex;
                flex-direction: row;
                gap: 10px;
                align-items: center;
                justify-content: flex-end;
            }
            
            .pixel-banner-store-category-controls {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .pixel-banner-store-select {
                width: max-content;
                font-size: 14px;
            }
            
            /* Search Styles */
            .pixel-banner-store-search-container {
                display: flex;
                align-items: center;
                gap: 5px;
                margin: 0 0 0 auto;
            }
            
            .pixel-banner-store-search-input {
                width: 200px;
                font-size: 14px;
                padding: 5px 10px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
            }
            
            .pixel-banner-store-search-button,
            .pixel-banner-store-stop-search-button,
            .pixel-banner-store-search-all-button {
                font-size: 14px;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                border: none;
                white-space: nowrap;
            }
            
            .pixel-banner-store-search-button,
            .pixel-banner-store-stop-search-button {
                background-color: var(--interactive-accent) !important;
                color: var(--text-on-accent) !important;
            }
            
            .pixel-banner-store-search-button:hover,
            .pixel-banner-store-stop-search-button:hover,
            .pixel-banner-store-search-all-button:hover {
                background-color: var(--interactive-accent-hover) !important;
            }
            
            /* Pagination Styles */
            .pixel-banner-store-bottom-controls {
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                margin-top: 15px;
                border-top: 1px solid var(--background-modifier-border);
                padding-top: 10px;
            }
            
            .pixel-banner-store-pagination-container {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .pixel-banner-store-pagination-button {
                font-size: 12px;
                padding: 4px 10px;
                border-radius: 4px;
                cursor: pointer;
                background-color: var(--interactive-accent) !important;
                color: var(--text-on-accent) !important;
                border: none;
            }
            
            .pixel-banner-store-pagination-button:not([disabled]):hover {
                background-color: var(--interactive-accent-hover) !important;
            }
            
            .pixel-banner-store-pagination-button[disabled] {
                opacity: 0.5;
                cursor: not-allowed;
                color: var(--text-color);
                background-color: var(--interactive-normal);
            }
            
            .pixel-banner-store-pagination-info {
                font-size: 12px;
                color: var(--text-normal);
                white-space: nowrap;
            }

            .pixel-banner-store-next-category {
                font-size: 14px;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                background-color: var(--interactive-accent) !important;
                color: var(--text-on-accent) !important;
                border: none;
            }
            .pixel-banner-store-next-category:hover {
                background-color: var(--interactive-accent-hover) !important;
            }
            
            .pixel-banner-store-back-to-main {
                font-size: 14px;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                border: none;
            }
            .pixel-banner-store-back-to-main:hover {
                background-color: var(--interactive-accent) !important;
            }
            
            .pixel-banner-store-error {
                color: var(--text-accent);
                margin-top: 8px;
            }

            .pixel-banner-store-image-grid {
                gap: 18px;
                padding: 18px;
                margin-top: 20px;
                display: flex;
                flex-direction: row;
                flex-wrap: wrap;
                align-items: normal;
                justify-content: center;
                height: 800px;
                max-height: 60vh;
                overflow-y: auto;
                overflow-x: hidden;
                border: 1px solid var(--table-border-color);
                position: relative; /* For the sticky pagination */
            }
            .pixel-banner-store-image-grid.-empty::after {
                display: none;
                // content: "🪄 Select a Category above, or click the Next Category button to cycle through them. A wonderful selection of banners awaits! The '❇️ Featured' category is updated often, and will be automatically displayed shortly if a selection is not made.";
                // position: relative;
                // top: 40%;
                // max-width: 380px;
                // font-size: 1.3em;
                // color: var(--text-muted);
                // max-height: 80px;
                // text-align: center;
                // opacity: 0.7;
            }
            .pixel-banner-store-image-grid.-not-connected::after {
                content: "⚡ Please connect your Pixel Banner Plus account in Settings to access the store. If you don't have an account, you can sign up for FREE using the button below! No payment information is required, and you will get access to a wide range of FREE banners.";
                position: relative;
                top: 40%;
                max-width: 458px;
                font-size: 1.3em;
                color: var(--text-muted);
                max-height: 80px;
                text-align: center;
                opacity: 0.7;
            }

            .pixel-banner-store-image-card {
                border: 5px solid transparent;
                border-radius: 8px;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 12px 12px 7px 12px;
                width: 324px;
                transition: transform 0.2s ease;
                cursor: pointer;
                height: max-content;
                animation: pixel-banner-fade-in 1300ms ease-in-out;
                background: var(--background-secondary);
            }
            .pixel-banner-store-image-card:hover {
                transform: scale(1.1);
                border-color: var(--modal-border-color);
                z-index: 2;
            }

            .pixel-banner-store-image-card img {
                max-width: 300px;
                max-height: 300px;
                object-fit: cover;
            }

            .pixel-banner-store-image-details {
                display: flex;
                flex-direction: row;
                justify-content: space-between;
                padding: 8px 0;
                width: 100%;
            }

            .pixel-banner-store-prompt {
                font-size: 12px;
                margin: 0 0 4px;
                text-transform: lowercase;
                opacity: 0.8;
            }

            .pixel-banner-store-cost {
                font-size: 12px;
                color: var(--text-accent);
                margin: 0;
                text-align: right;
                white-space: nowrap;
                margin-left: 5px;
            }
            .pixel-banner-store-cost.free {
                color: var(--text-success) !important;
                font-weight: bold !important;
            }
            
            /* Vote Controls Styles */
            .pixel-banner-store-vote-controls {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                padding: 5px 0 0;
                gap: 7px;
            }
            
            .pixel-banner-store-vote-button {
                background: transparent;
                border: none;
                cursor: pointer;
                padding: 0;
                font-size: 14px;
                opacity: 0.4;
                transition: all 0.2s ease;
                width: 28px;
                height: 27px;
                line-height: 1.38;
                border-radius: 50%;
                border: 1px dashed transparent;
            }
            
            .pixel-banner-store-vote-button:hover {
                transform: scale(1.2);
                opacity: 1 !important;
            }
            
            .pixel-banner-store-vote-button.active {
                opacity: 0.7;
                transform: scale(1.1);
            }
            
            .pixel-banner-store-vote-button.active-upvote {
                border-color: var(--text-success);
            }
            
            .pixel-banner-store-vote-button.active-downvote {
                border-color: var(--text-error);
            }
            
            .pixel-banner-store-vote-button.disabled {
                opacity: 0.3;
                cursor: not-allowed;
                transform: none;
            }
            
            .pixel-banner-store-vote-button.disabled:hover {
                transform: none;
                opacity: 0.3;
            }
            
            .pixel-banner-store-vote-count {
                font-size: 14px;
                font-weight: bold;
                min-width: 30px;
                text-align: center;
            }
            
            .pixel-banner-store-vote-count.positive {
                color: var(--text-success);
            }
            
            .pixel-banner-store-vote-count.negative {
                color: var(--text-error);
            }
            
            .pixel-banner-store-vote-count.neutral {
                color: var(--text-muted);
            }

            .pixel-banner-store-loading {
                display: flex;
                justify-content: center;
                padding: 32px;
            }

            .pixel-banner-store-spinner {
                width: 40px;
                height: 40px;
                border: 4px solid var(--background-modifier-border);
                border-top: 4px solid var(--text-accent);
                border-radius: 50%;
                animation: pixel-banner-spin 1s linear infinite;
            }

            .pixel-banner-store-loading-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                background-color: var(--background-primary);
                z-index: 100;
                animation: pixel-banner-fade-in 0.3s ease-in-out;
            }

            .pixel-banner-store-status-value {
                padding: 3px 7px;
                border-radius: 0px;
                font-size: .8em;
                letter-spacing: 1px;
                background-color: var(--background-primary);
                display: inline-flex;
                align-items: center;
                cursor: help;
            }
            
            .pixel-banner-account-button {
                padding: 3px 7px;
                border-radius: 5px;
                cursor: pointer;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-size: .7em;
                transition: all 0.2s ease;
                border: 1px solid var(--background-modifier-border);
            }
            
            .pixel-banner-account-button:hover {
                opacity: 0.9;
                transform: translateY(-2px);
            }
            
            .pixel-banner-buy-tokens-button {
                background-color: darkgreen !important;
                color: papayawhip !important;
                opacity: 0.7;
            }
            
            .pixel-banner-signup-button {
                background-color: var(--interactive-accent) !important;
                color: var(--text-on-accent) !important;
            }

            .pixel-banner-store-image-grid.store-voting-off .pixel-banner-store-vote-controls {
                display: none;
            }


            /* ------------------- */
            /* -- mobile layout -- */
            /* ------------------- */
            @media screen and (max-width: 800px) {
                .pixel-banner-store-select-container { flex-direction: column !important; width: 100% !important; }
                .pixel-banner-store-select-container * { width: 100% !important; }
                .pixel-banner-store-search-container { flex-direction: column !important; width: 100% !important; }
                .pixel-banner-store-search-container * { width: 100% !important; }
            }
        `;
        document.head.appendChild(style);
        this.style = style;
    }

    onClose() {
        this.contentEl.empty();
        if (this.style) {
            this.style.remove();
        }
        if (this.loadingOverlay) {
            this.loadingOverlay.remove();
        }
    }
}

// Add this class inside the file but outside the PixelBannerStoreModal class
class ConfirmPurchaseModal extends Modal {
    constructor(app, cost, prompt, previewImage, onConfirm, plugin, isVideo = false, fileType = 'image', fileExtension = 'jpg') {
        super(app);
        this.cost = cost;
        this.prompt = prompt;
        this.previewImage = previewImage;
        this.onConfirm = onConfirm;
        this.plugin = plugin;
        this.isVideo = isVideo;
        this.fileType = fileType;
        this.fileExtension = fileExtension;
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.empty();
        
        // Add styles first
        this.addStyle();
        

        const titleContainer = contentEl.createEl('h3', {
            cls: 'margin-top-0 pixel-banner-selector-title'
        });

        // Add the flag image
        const flagImg = titleContainer.createEl('img', {
            attr: {
                src: flags[this.plugin.settings.selectImageIconFlag] || flags['red'],
                alt: 'Pixel Banner',
                style: `
                    width: 20px;
                    height: 25px;
                    vertical-align: middle;
                    margin: -5px 10px 0 20px;
                `
            }
        });

        // Add the text
        titleContainer.appendChild(document.createTextNode('Confirm Pixel Banner Purchase'));
        
        // Add preview media (image or video)
        const mediaContainer = contentEl.createDiv({ cls: 'pixel-banner-store-confirm-media' });
        
        if (this.isVideo) {
            // For video banners, the previewImage is actually a thumbnail
            // Show the thumbnail with a video indicator
            const videoPreview = mediaContainer.createDiv({ cls: 'pixel-banner-store-video-preview' });
            videoPreview.createEl('img', {
                attr: {
                    src: this.previewImage,
                    alt: 'Video Banner Thumbnail'
                }
            });
            
            // Add video play indicator overlay
            const playOverlay = videoPreview.createDiv({
                cls: 'pixel-banner-store-play-overlay',
                attr: {
                    style: `
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: rgba(0, 0, 0, 0.7);
                        border-radius: 50%;
                        width: 60px;
                        height: 60px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 24px;
                        pointer-events: none;
                    `
                }
            });
            playOverlay.innerHTML = '▶';
            
            // Add video type indicator
            const typeIndicator = mediaContainer.createDiv({
                text: `VIDEO (${this.fileExtension.toUpperCase()})`,
                cls: 'pixel-banner-store-type-indicator',
                attr: {
                    style: `
                        text-align: center;
                        margin-top: 8px;
                        font-size: 0.8em;
                        color: var(--text-muted);
                        font-weight: bold;
                    `
                }
            });
        } else {
            // For image banners, display normally
            mediaContainer.createEl('img', {
                attr: {
                    src: this.previewImage,
                    alt: 'Banner Preview'
                }
            });
        }

        contentEl.createEl('p', {
            text: `"${this.prompt?.toLowerCase().replace(/[^a-zA-Z0-9-_ ]/g, '').trim()}"`,
            cls: 'pixel-banner-store-confirm-prompt',
            attr: {
                'style': `
                    margin-top: -30px;
                    margin-bottom: 30px;
                    margin-left: auto;
                    margin-right: auto;
                    max-width: 320px;
                    text-align: center;
                    font-size: .9em;
                    font-style: italic;
                `
            }
        });

        // Button container
        const buttonContainer = contentEl.createDiv({
            cls: 'setting-item-control',
            attr: {
                style: `
                    display: flex; 
                    justify-content: flex-end; 
                    gap: 8px;
                    margin-top: 10px;
                    align-items: flex-start;
                `
            }
        });

        // Purchase explanation text
        const explanationText = buttonContainer.createEl('p', {
            text: `🪙 ${decimalToFractionString(this.cost)} Banner Token${this.cost > 1 ? 's' : ''} (this is not a monitary transaction). Once purchased, the banner will be added to your vault, and will be free to download while listed in the store.`,
            cls: 'setting-item-description',
            attr: {
                style: `
                    text-align: left;
                    margin: 0 20px 0 0;
                    opacity: .8;
                    font-size: .8em;
                `
            }
        });

        // Confirm button
        const confirmButton = buttonContainer.createEl('button', {
            text: `🪙 ${decimalToFractionString(this.cost)} Token${this.cost > 1 ? 's' : ''}`,
            cls: 'mod-cta radial-pulse-animation'
        });
        confirmButton.addEventListener('click', () => {
            this.close();
            this.onConfirm();
        });

        // Cancel button
        const cancelButton = buttonContainer.createEl('button', {
            text: 'Cancel'
        });
        cancelButton.addEventListener('click', () => this.close());
    }
        

    // Add styles for the preview media
    addStyle() {
        const style = document.createElement('style');
        style.textContent = `
            .pixel-banner-store-confirm-media {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin: 40px 10px;
            }
            
            .pixel-banner-store-confirm-media img {
                max-width: 100%;
                height: auto;
                border-radius: 4px;
            }
            
            .pixel-banner-store-video-preview {
                position: relative;
                display: inline-block;
            }
            
            .pixel-banner-store-video-preview img {
                display: block;
            }
            
            .pixel-banner-store-image-card {
                position: relative;
            }
        `;
        document.head.appendChild(style);
        this.style = style;
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
        if (this.style) {
            this.style.remove();
        }
    }
}