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

            // Reset content start position
            this.currentContentStartPosition = this.plugin.settings.contentStartPosition;
            contentStartPositionSlider.value = this.currentContentStartPosition;
            contentStartPositionValue.setText(`${this.currentContentStartPosition}px`);
            this.updateBannerContentStartPosition(this.currentContentStartPosition);

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
            // Prevent dragging if the target is a slider
            if (e.target === zoomSlider || e.target === heightSlider || e.target === contentStartPositionSlider) return;
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