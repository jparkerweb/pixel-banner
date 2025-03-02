import { Modal } from 'obsidian';


// ---------------------------
// -- target position modal --
// ---------------------------
export class TargetPositionModal extends Modal {
    constructor(app, plugin, onPositionChange) {
        super(app);
        this.plugin = plugin;
        this.onPositionChange = onPositionChange;
        this.isDragging = false;
        
        // Get current banner / icon values
        const activeFile = this.app.workspace.getActiveFile();
        const frontmatter = this.app.metadataCache.getFileCache(activeFile)?.frontmatter;

        // display field
        const displayField = Array.isArray(this.plugin.settings.customImageDisplayField) 
            ? this.plugin.settings.customImageDisplayField[0].split(',')[0].trim()
            : this.plugin.settings.customImageDisplayField;
        this.currentDisplay = frontmatter?.[displayField] || this.plugin.settings.imageDisplay;

        // x position field
        const xField = Array.isArray(this.plugin.settings.customXPositionField) 
            ? this.plugin.settings.customXPositionField[0].split(',')[0].trim()
            : this.plugin.settings.customXPositionField;
        this.currentX = frontmatter?.[xField] || this.plugin.settings.xPosition;

        // y position field
        const yField = Array.isArray(this.plugin.settings.customYPositionField) 
            ? this.plugin.settings.customYPositionField[0].split(',')[0].trim()
            : this.plugin.settings.customYPositionField;
        this.currentY = frontmatter?.[yField] || this.plugin.settings.yPosition;

        // height field
        const heightField = Array.isArray(this.plugin.settings.customBannerHeightField)
            ? this.plugin.settings.customBannerHeightField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerHeightField;
        this.currentHeight = frontmatter?.[heightField] || this.plugin.settings.bannerHeight;

        // content start position field
        const contentStartPositionField = Array.isArray(this.plugin.settings.customContentStartField)
            ? this.plugin.settings.customContentStartField[0].split(',')[0].trim()
            : this.plugin.settings.customContentStartField;
        this.currentContentStartPosition = frontmatter?.[contentStartPositionField] || this.plugin.settings.contentStartPosition;

        // banner icon x position field
        const bannerIconXPositionField = Array.isArray(this.plugin.settings.customBannerIconXPositionField)
            ? this.plugin.settings.customBannerIconXPositionField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconXPositionField;
        this.currentBannerIconXPosition = frontmatter?.[bannerIconXPositionField] || this.plugin.settings.bannerIconXPosition;

        // Add repeat field initialization
        const repeatField = Array.isArray(this.plugin.settings.customImageRepeatField)
            ? this.plugin.settings.customImageRepeatField[0].split(',')[0].trim()
            : this.plugin.settings.customImageRepeatField;
        this.currentRepeat = frontmatter?.[repeatField] ?? false;

        // Parse current display value for zoom percentage
        this.currentZoom = 100;
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

    updateBannerContentStartPosition(position) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const contentStartPositionField = Array.isArray(this.plugin.settings.customContentStartField)
            ? this.plugin.settings.customContentStartField[0].split(',')[0].trim()
            : this.plugin.settings.customContentStartField;

        this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            frontmatter[contentStartPositionField] = position;
        });
    }

    updateBannerIconXPosition(position) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const bannerIconXPositionField = Array.isArray(this.plugin.settings.customBannerIconXPositionField)
            ? this.plugin.settings.customBannerIconXPositionField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconXPositionField;

        this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            frontmatter[bannerIconXPositionField] = position;
        });
    }

    updateRepeatMode(repeat) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const repeatField = Array.isArray(this.plugin.settings.customImageRepeatField)
            ? this.plugin.settings.customImageRepeatField[0].split(',')[0].trim()
            : this.plugin.settings.customImageRepeatField;

        this.app.fileManager.processFrontMatter(activeFile, (fm) => {
            fm[repeatField] = repeat;
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
        modalEl.style.width = "max-content";
        modalEl.style.height = "max-content";
        bgEl.style.opacity = "0";

        // Create main container with flex layout
        const mainContainer = contentEl.createDiv({ cls: 'main-container' });
        mainContainer.style.display = 'flex';
        mainContainer.style.flexDirection = 'row';
        mainContainer.style.gap = '20px';
        mainContainer.style.alignItems = 'stretch';

        // add drag handle
        const dragHandle = mainContainer.createDiv({ cls: 'drag-handle' });
        dragHandle.style.backgroundColor = 'var(--background-modifier-border)';
        dragHandle.style.cursor = 'move';
        dragHandle.style.position = 'absolute';
        dragHandle.style.left = '50%';
        dragHandle.style.transform = 'translateX(-50%)';
        dragHandle.style.top = '3';
        dragHandle.setText('⋮⋮⋮⋮⋮⋮⋮⋮⋮⋮');

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

        
        // Content Start Position control container
        const contentStartPositionContainer = mainContainer.createDiv({ cls: 'content-start-position-container' });
        contentStartPositionContainer.style.display = 'flex';
        contentStartPositionContainer.style.flexDirection = 'column';
        contentStartPositionContainer.style.gap = '10px';
        contentStartPositionContainer.style.alignItems = 'center';
        contentStartPositionContainer.style.minWidth = '60px';
        contentStartPositionContainer.style.flex = '0 auto';

        // Content Start Position label
        const contentStartPositionLabel = contentStartPositionContainer.createEl('div', { 
            text: 'Content Start Position',
            cls: 'content-start-position-label',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                    text-align: center;
                    width: 60px;
                `
            }
        });

        // Content Start Position value display
        const contentStartPositionValue = contentStartPositionContainer.createDiv({ cls: 'content-start-position-value' });
        contentStartPositionValue.style.fontFamily = 'var(--font-monospace)';
        contentStartPositionValue.style.fontSize = '0.9em';
        contentStartPositionValue.setText(`${this.currentContentStartPosition}px`);

        // Content Start Position slider
        const contentStartPositionSlider = contentStartPositionContainer.createEl('input', {
            type: 'range',
            cls: 'content-start-position-slider',
            attr: {
                min: '1',
                max: '800',
                step: '5',
                value: this.currentContentStartPosition
            }
        });
        contentStartPositionSlider.style.flex = '1';
        contentStartPositionSlider.style.writingMode = 'vertical-lr';
        contentStartPositionSlider.style.direction = 'rtl';

        contentStartPositionSlider.addEventListener('input', () => {
            this.currentContentStartPosition = parseInt(contentStartPositionSlider.value);
            contentStartPositionValue.setText(`${this.currentContentStartPosition}px`);
            this.updateBannerContentStartPosition(this.currentContentStartPosition);
        });

        // banner icon controls container
        const bannerIconControlsContainer = contentEl.createDiv({
            cls: 'main-container',
            attr: {
                style: `
                    margin-top: 20px;
                    display: none;
                `
            }
        });

        // Check if note has banner icon
        const activeFile = this.app.workspace.getActiveFile();
        const frontmatter = this.app.metadataCache.getFileCache(activeFile)?.frontmatter;
        const bannerIconField = Array.isArray(this.plugin.settings.customBannerIconField)
            ? this.plugin.settings.customBannerIconField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconField;
        
        if (frontmatter?.[bannerIconField]) {
            bannerIconControlsContainer.style.display = 'block';
        }

        // Banner Icon X Position control container
        const bannerIconXPositionContainer = bannerIconControlsContainer.createDiv({ cls: 'banner-icon-x-position-container' });
        bannerIconXPositionContainer.style.display = 'flex';
        bannerIconXPositionContainer.style.flexDirection = 'row';
        bannerIconXPositionContainer.style.gap = '10px';
        bannerIconXPositionContainer.style.alignItems = 'center';
        bannerIconXPositionContainer.style.minWidth = '60px';
        bannerIconXPositionContainer.style.flex = '0 auto';

        // Banner Icon X Position label
        const bannerIconXPositionLabel = bannerIconXPositionContainer.createEl('div', { 
            text: 'Icon X Position',
            cls: 'banner-icon-x-position-label',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        // Banner Icon X Position slider
        const bannerIconXPositionSlider = bannerIconXPositionContainer.createEl('input', {
            type: 'range',
            cls: 'banner-icon-x-position-slider',
            attr: {
                min: '1',
                max: '99',
                step: '1',
                value: this.currentBannerIconXPosition
            }
        });
        bannerIconXPositionSlider.style.flex = '1';
        bannerIconXPositionSlider.style.writingMode = 'horizontal-tb';
        bannerIconXPositionSlider.style.direction = 'ltr';

        // Banner Icon X Position value display
        const bannerIconXPositionValue = bannerIconXPositionContainer.createDiv({ cls: 'banner-icon-x-position-value' });
        bannerIconXPositionValue.style.fontFamily = 'var(--font-monospace)';
        bannerIconXPositionValue.style.fontSize = '0.9em';
        bannerIconXPositionValue.setText(`${this.currentBannerIconXPosition}`);

        // Banner Icon X Position slider event listener
        bannerIconXPositionSlider.addEventListener('input', () => {
            this.currentBannerIconXPosition = parseInt(bannerIconXPositionSlider.value);
            bannerIconXPositionValue.setText(`${this.currentBannerIconXPosition}`);
            this.updateBannerIconXPosition(this.currentBannerIconXPosition);
        });
        
        // Create a container for buttons
        const buttonContainer = contentEl.createDiv({
            cls: 'button-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    justify-content: center;
                `
            }
        });

        // Reset to defaults button
        const resetButton = buttonContainer.createEl('button', {
            text: 'Reset to Defaults',
            cls: 'reset-button'
        });
        resetButton.style.flex = '1';
        
        // Close Settings button
        const closeSettingsButton = buttonContainer.createEl('button', {
            text: 'Close Settings',
            cls: 'mod-cta close-settings-button'
        });
        closeSettingsButton.style.flex = '1';

        // Add event listener to close the modal when the button is clicked
        closeSettingsButton.addEventListener('click', () => {
            this.close();
        });

        // Add event listener to reset the modal when the button is clicked
        resetButton.addEventListener('click', () => {
            // Reset UI elements
            displaySelect.value = 'cover';
            zoomContainer.style.display = 'none';
            repeatContainer.style.display = 'none';
            
            // Reset slider values for visual feedback
            zoomSlider.value = 100;
            heightSlider.value = this.plugin.settings.bannerHeight;
            contentStartPositionSlider.value = this.plugin.settings.contentStartPosition;
            bannerIconXPositionSlider.value = this.plugin.settings.bannerIconXPosition;
            
            // Reset value displays
            zoomValue.setText('100%');
            heightValue.setText(`${this.plugin.settings.bannerHeight}px`);
            contentStartPositionValue.setText(`${this.plugin.settings.contentStartPosition}px`);
            bannerIconXPositionValue.setText(`${this.plugin.settings.bannerIconXPosition}`);
            toggleInput.checked = false;

            // Reset crosshair position
            verticalLine.style.left = '50%';
            horizontalLine.style.top = '50%';
            updatePositionIndicator();

            // Remove frontmatter fields to allow inheritance from plugin settings
            const activeFile = this.app.workspace.getActiveFile();
            this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                // Get field names
                const displayField = Array.isArray(this.plugin.settings.customImageDisplayField) 
                    ? this.plugin.settings.customImageDisplayField[0].split(',')[0].trim()
                    : this.plugin.settings.customImageDisplayField;
                    
                const heightField = Array.isArray(this.plugin.settings.customBannerHeightField)
                    ? this.plugin.settings.customBannerHeightField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerHeightField;
                    
                const xField = Array.isArray(this.plugin.settings.customXPositionField) 
                    ? this.plugin.settings.customXPositionField[0].split(',')[0].trim()
                    : this.plugin.settings.customXPositionField;
                    
                const yField = Array.isArray(this.plugin.settings.customYPositionField) 
                    ? this.plugin.settings.customYPositionField[0].split(',')[0].trim()
                    : this.plugin.settings.customYPositionField;
                    
                const contentStartPositionField = Array.isArray(this.plugin.settings.customContentStartField)
                    ? this.plugin.settings.customContentStartField[0].split(',')[0].trim()
                    : this.plugin.settings.customContentStartField;
                    
                const bannerIconXPositionField = Array.isArray(this.plugin.settings.customBannerIconXPositionField)
                    ? this.plugin.settings.customBannerIconXPositionField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerIconXPositionField;
                    
                const repeatField = Array.isArray(this.plugin.settings.customImageRepeatField)
                    ? this.plugin.settings.customImageRepeatField[0].split(',')[0].trim()
                    : this.plugin.settings.customImageRepeatField;

                // Remove fields
                delete frontmatter[displayField];
                delete frontmatter[heightField];
                delete frontmatter[xField];
                delete frontmatter[yField];
                delete frontmatter[contentStartPositionField];
                delete frontmatter[bannerIconXPositionField];
                delete frontmatter[repeatField];
            });
        });

        // Create repeat toggle container (initially hidden)
        const repeatContainer = controlPanel.createDiv({ cls: 'repeat-container' });
        repeatContainer.style.display = this.currentDisplay === 'contain' ? 'flex' : 'none';
        repeatContainer.style.flexDirection = 'column';
        repeatContainer.style.gap = '5px';
        repeatContainer.style.alignItems = 'center';
        repeatContainer.style.justifyContent = 'flex-start';
        repeatContainer.style.marginTop = '10px';
        repeatContainer.style.maxWidth = '70px';
        repeatContainer.style.textAlign = 'center';

        // Repeat label
        const repeatLabel = repeatContainer.createEl('div', { 
            text: 'repeat banner image?',
            cls: 'repeat-label'
        });
        repeatLabel.style.color = 'var(--text-muted)';
        repeatLabel.style.fontSize = '0.9em';
        repeatLabel.style.marginBottom = '20px';

        // Repeat toggle
        const repeatToggle = repeatContainer.createEl('div', { cls: 'repeat-toggle' });
        repeatToggle.style.marginTop = '10px';

        const toggleInput = repeatToggle.createEl('input', {
            type: 'checkbox',
            cls: 'repeat-checkbox',
            attr: {
                checked: this.currentRepeat
            }
        });

        // Update display select event handler
        displaySelect.addEventListener('change', () => {
            const mode = displaySelect.value;
            zoomContainer.style.display = mode === 'cover-zoom' ? 'flex' : 'none';
            repeatContainer.style.display = mode === 'contain' ? 'flex' : 'none';
            this.updateDisplayMode(mode, mode === 'cover-zoom' ? this.currentZoom : null);
        });

        // Add repeat toggle event handler
        toggleInput.addEventListener('change', () => {
            this.currentRepeat = toggleInput.checked;
            this.updateRepeatMode(this.currentRepeat);
        });

        // Add drag-and-drop functionality
        let isDragging = false;
        let offsetX, offsetY;

        modalEl.addEventListener('mousedown', (e) => {
            // Prevent dragging if the target is a slider
            if (e.target === zoomSlider || e.target === heightSlider || e.target === contentStartPositionSlider || e.target === bannerIconXPositionSlider) return;
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
            .target-position-modal .repeat-container {
                min-height: 120px;
                display: flex;
                justify-content: center;
            }
            
            .target-position-modal .repeat-checkbox {
                transform: scale(1.2);
                cursor: pointer;
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