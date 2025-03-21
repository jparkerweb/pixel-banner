import { Modal } from 'obsidian';
import getCurrentTheme from '../../utils/getCurrentTheme';
import { EmojiSelectionModal } from '../modals';
import { SelectPixelBannerModal } from './selectPixelBannerModal';
import { flags } from '../../resources/flags.js';
import { getFrontmatterValue } from '../../utils/frontmatterUtils.js';
import { MarkdownView } from 'obsidian';


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
        this.currentRepeat = frontmatter?.[repeatField] !== undefined ? frontmatter[repeatField] : this.plugin.settings.imageRepeat;

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
        
        const repeatField = Array.isArray(this.plugin.settings.customImageRepeatField)
            ? this.plugin.settings.customImageRepeatField[0].split(',')[0].trim()
            : this.plugin.settings.customImageRepeatField;

        let newValue = mode;
        if (mode === 'cover-zoom') {
            newValue = `${zoom}%`;
        }

        this.app.fileManager.processFrontMatter(activeFile, (fm) => {
            fm[displayField] = newValue;
            
            // When changing to "contain" or "auto", use the current toggle state
            // For other modes, remove the repeat field completely
            if (mode === 'contain' || mode === 'auto') {
                fm[repeatField] = this.currentRepeat;
            } else {
                // Remove the repeat field if it exists
                if (repeatField in fm) {
                    delete fm[repeatField];
                }
            }
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

    updateBannerIconSize(size) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const bannerIconSizeField = Array.isArray(this.plugin.settings.customBannerIconSizeField)
            ? this.plugin.settings.customBannerIconSizeField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconSizeField;

        this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            frontmatter[bannerIconSizeField] = size;
        });
    }

    updateBannerIconColor(color) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const bannerIconColorField = Array.isArray(this.plugin.settings.customBannerIconColorField)
            ? this.plugin.settings.customBannerIconColorField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconColorField;

        this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            frontmatter[bannerIconColorField] = color;
        });
    }

    updateBannerIconFontWeight(fontWeight) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const bannerIconFontWeightField = Array.isArray(this.plugin.settings.customBannerIconFontWeightField)
            ? this.plugin.settings.customBannerIconFontWeightField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconFontWeightField;

        this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            frontmatter[bannerIconFontWeightField] = fontWeight;
        });
    }

    updateBannerIconBgColor(color, alpha) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const bannerIconBgColorField = Array.isArray(this.plugin.settings.customBannerIconBackgroundColorField)
            ? this.plugin.settings.customBannerIconBackgroundColorField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconBackgroundColorField;

        // Convert hex to rgba if alpha is less than 100
        let finalColor = color;
        if (alpha < 100) {
            // If it's a hex color, convert to rgba
            if (color.startsWith('#')) {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                finalColor = `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
            }
            // If it's a named color, we need to get its RGB value
            else if (color && !color.startsWith('rgb')) {
                // Create a temporary element to get the computed RGB value
                const tempEl = document.createElement('div');
                tempEl.style.color = color;
                document.body.appendChild(tempEl);
                const computedColor = window.getComputedStyle(tempEl).color;
                document.body.removeChild(tempEl);
                
                // Parse the computed RGB value
                const rgbMatch = computedColor.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
                if (rgbMatch) {
                    const r = parseInt(rgbMatch[1]);
                    const g = parseInt(rgbMatch[2]);
                    const b = parseInt(rgbMatch[3]);
                    finalColor = `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
                }
            }
        }

        this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            frontmatter[bannerIconBgColorField] = finalColor;
        });
    }

    updateBannerIconPaddingX(paddingX) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const bannerIconPaddingXField = Array.isArray(this.plugin.settings.customBannerIconPaddingXField)
            ? this.plugin.settings.customBannerIconPaddingXField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconPaddingXField;

        this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            frontmatter[bannerIconPaddingXField] = paddingX;
        });
    }

    updateBannerIconPaddingY(paddingY) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const bannerIconPaddingYField = Array.isArray(this.plugin.settings.customBannerIconPaddingYField)
            ? this.plugin.settings.customBannerIconPaddingYField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconPaddingYField;

        this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            frontmatter[bannerIconPaddingYField] = paddingY;
        });
    }

    updateBannerIconBorderRadius(borderRadius) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const bannerIconBorderRadiusField = Array.isArray(this.plugin.settings.customBannerIconBorderRadiusField)
            ? this.plugin.settings.customBannerIconBorderRadiusField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconBorderRadiusField;

        this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            frontmatter[bannerIconBorderRadiusField] = borderRadius;
        });
    }

    updateBannerIconVerticalOffset(verticalOffset) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const bannerIconVerticalOffsetField = Array.isArray(this.plugin.settings.customBannerIconVeritalOffsetField)
            ? this.plugin.settings.customBannerIconVeritalOffsetField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconVeritalOffsetField;

        this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            frontmatter[bannerIconVerticalOffsetField] = verticalOffset;
        });
    }

    updateTitleColor(color) {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return;

        const titleColorField = Array.isArray(this.plugin.settings.customTitleColorField)
            ? this.plugin.settings.customTitleColorField[0].split(',')[0].trim()
            : this.plugin.settings.customTitleColorField;

        this.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
            frontmatter[titleColorField] = color;
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


        // add drag handle
        const dragHandle = contentEl.createDiv({
            cls: 'drag-handle',
            attr: {
                style: `
                    cursor: move;
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    top: 7px;
                    opacity: .8;
                `
            }
        });
        dragHandle.setText('⋮⋮⋮⋮⋮⋮⋮⋮⋮⋮');

        // Banner Image header
        const bannerImageHeader = contentEl.createEl('div', {
            text: '🖼️ Banner Image Settings',
            cls: 'banner-image-header',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    justify-content: space-between;
                    color: var(--text-accent);
                    font-size: 0.9em;
                    font-weight: 600;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    margin-bottom: 10px;
                `
            }
        });

        // add button to bannerImageHeader
        const bannerImageHeaderButton = bannerImageHeader.createEl('button', {
            text: '✏️ Change Image',
            cls: 'banner-image-header-button cursor-pointer',
            attr: {
                style: `
                    margin-top: 15px;
                    text-transform: uppercase;
                    font-size: .8em;
                `
            }
        });

        // on click of back to main menu button, close this modal and open the Pixel Banner Menu modal
        bannerImageHeaderButton.addEventListener('click', () => {
            this.close();
            new SelectPixelBannerModal(this.app, this.plugin).open();
        });

        // Create main container with flex layout
        const mainContainer = contentEl.createDiv({
            cls: 'main-container',
            attr: {
                style: `
                    position: relative;
                    display: flex;
                    flex-direction: row;
                    gap: 20px;
                    alignt-items: stretch;
                `
            }
        });

        // Create left panel for controls
        const controlPanel = mainContainer.createDiv({
            cls: 'control-panel',
            attr: {
                style: `
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    flex: 0 auto;
                `
            }
        });

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
        const zoomContainer = controlPanel.createDiv({
            cls: 'zoom-container',
            attr: {
                style: `
                    display: ${this.currentDisplay === 'cover-zoom' ? 'flex' : 'none'};
                    flex-direction: column;
                    gap: 5px;
                    align-items: center;
                    margin-top: 10px;
                    height: 100%;
                `
            }
        });

        // Zoom value display
        const zoomValue = zoomContainer.createDiv({
            cls: 'zoom-value',
            attr: {
                style: `
                    font-family: var(--font-monospace);
                    font-size: 0.9em;
                `
            }
        });
        zoomValue.setText(`${this.currentZoom}%`);

        // Zoom slider
        const zoomSlider = zoomContainer.createEl('input', {
            type: 'range',
            cls: 'zoom-slider',
            attr: {
                min: '0',
                max: '500',
                step: '10',
                value: this.currentZoom,
                style: `
                    flex: 1;
                    writing-mode: vertical-lr;
                    direction: rtl;
                `
            }
        });

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
        const heightContainer = mainContainer.createDiv({
            cls: 'height-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    align-items: center;
                    min-width: 60px;
                    flex: 0 auto;
                `
            }
        });

        // Height label
        const heightLabel = heightContainer.createEl('div', { 
            text: 'Height',
            cls: 'height-label',
            attr: {
                style: `
                    color: var(--text-muted);
                    font-size: 0.9em;
                `
            }
        });

        // Height value display
        const heightValue = heightContainer.createDiv({
            cls: 'height-value',
            attr: {
                style: `
                    font-family: var(--font-monospace);
                    font-size: 0.9em;
                `
            }
        });
        heightValue.setText(`${this.currentHeight}px`);

        // Height slider
        const heightSlider = heightContainer.createEl('input', {
            type: 'range',
            cls: 'height-slider',
            attr: {
                min: '0',
                max: '1280',
                step: '10',
                value: this.currentHeight,
                style: `
                    flex: 1;
                    writing-mode: vertical-lr;
                    direction: rtl;
                `
            }
        });

        heightSlider.addEventListener('input', () => {
            this.currentHeight = parseInt(heightSlider.value);
            heightValue.setText(`${this.currentHeight}px`);
            this.updateBannerHeight(this.currentHeight);
        });

        // Create target container
        const targetContainer = mainContainer.createDiv({
            cls: 'target-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    flex-grow: 1;
                `
            }
        });

        // Create container for the target area
        const targetArea = targetContainer.createDiv({
            cls: 'target-area',
            attr: {
                style: `
                    width: 200px;
                    height: 200px;
                    border: 2px solid var(--background-modifier-border);
                    position: relative;
                    background-color: var(--background-primary);
                    cursor: crosshair;
                    flex-grow: 1;
                `
            }
        });

        // Create crosshair lines
        const verticalLine = targetArea.createDiv({ cls: 'vertical-line' });
        const horizontalLine = targetArea.createDiv({ cls: 'horizontal-line' });

        // Position indicator
        const positionIndicator = targetContainer.createEl('div', { 
            cls: 'position-indicator',
            attr: {
                style: `
                    text-align: center;
                    font-family: var(--font-monospace);
                    font-size: 0.9em;
                    color: var(--text-muted);
                    width: 200px;
                `
            }
        });
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
        const contentStartPositionContainer = mainContainer.createDiv({
            cls: 'content-start-position-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    align-items: center;
                    min-width: 60px;
                    flex: 0 auto;
                `
            }
        });

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
        const contentStartPositionValue = contentStartPositionContainer.createDiv({
            cls: 'content-start-position-value',
            attr: {
                style: `
                    font-family: var(--font-monospace);
                    font-size: 0.9em;
                `
            }
        });
        contentStartPositionValue.setText(`${this.currentContentStartPosition}px`);

        // Content Start Position slider
        const contentStartPositionSlider = contentStartPositionContainer.createEl('input', {
            type: 'range',
            cls: 'content-start-position-slider',
            attr: {
                min: '1',
                max: '800',
                step: '5',
                value: this.currentContentStartPosition,
                style: `
                    flex: 1;
                    writing-mode: vertical-lr;
                    direction: rtl;
                `
            }
        });

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
        
        // check for banner icon in frontmatter
        const hasBannerIcon = frontmatter && frontmatter[bannerIconField] && frontmatter[bannerIconField].trim() !== '';
        
        if (hasBannerIcon) {
            bannerIconControlsContainer.style.display = 'block';
        } else {
            // no banner icon found, try one more time after a short delay
            setTimeout(() => {
                const refreshedFrontmatter = this.app.metadataCache.getFileCache(activeFile)?.frontmatter;
                if (refreshedFrontmatter && refreshedFrontmatter[bannerIconField] && refreshedFrontmatter[bannerIconField].trim() !== '') {
                    bannerIconControlsContainer.style.display = 'block';
                }
            }, 300);
        }

        // Banner Icon header
        const bannerIconHeader = bannerIconControlsContainer.createEl('div', {
            text: '⭐ Banner Icon Settings',
            cls: 'banner-icon-header',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    justify-content: space-between;
                    color: var(--text-accent);
                    font-size: 0.9em;
                    font-weight: 600;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    margin-bottom: 10px;
                `
            }
        });

        // add button to bannerIconHeader
        const bannerIconHeaderButton = bannerIconHeader.createEl('button', {
            text: '✏️ Edit Icon',
            cls: 'banner-icon-header-button cursor-pointer',
            attr: {
                style: `
                    margin-top: 15px;
                    text-transform: uppercase;
                    font-size: .8em;
                `
            }
        });
        // on click on emoji button, open emoji picker
        bannerIconHeaderButton.addEventListener('click', () => {
            this.close();
            new EmojiSelectionModal(
                this.app, 
                this.plugin,
                async (emoji) => {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) {
                        await this.plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                            const iconField = this.plugin.settings.customBannerIconField[0];
                            if (emoji) {
                                frontmatter[iconField] = emoji;
                            } else {
                                // If emoji is empty, remove the field from frontmatter
                                delete frontmatter[iconField];
                            }
                        });
                    }
                }
            ).open();
        });

        // Banner Icon X Position control container
        const bannerIconXPositionContainer = bannerIconControlsContainer.createDiv({
            cls: 'banner-icon-x-position-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    min-width: 60px;
                    flex: 0 auto;
                `
            }
        });

        // Banner Icon X Position label
        const bannerIconXPositionLabel = bannerIconXPositionContainer.createEl('div', { 
            text: 'X Position',
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
                value: this.currentBannerIconXPosition,
                style: `
                    flex: 1;
                    writing-mode: horizontal-tb;
                    direction: ltr;
                `
            }
        });

        // Banner Icon X Position value display
        const bannerIconXPositionValue = bannerIconXPositionContainer.createDiv({
            cls: 'banner-icon-x-position-value',
            attr: {
                style: `
                    font-family: var(--font-monospace);
                    font-size: 0.9em;
                `
            }
        });
        bannerIconXPositionValue.setText(`${this.currentBannerIconXPosition}`);

        // Banner Icon X Position slider event listener
        bannerIconXPositionSlider.addEventListener('input', () => {
            this.currentBannerIconXPosition = parseInt(bannerIconXPositionSlider.value);
            bannerIconXPositionValue.setText(`${this.currentBannerIconXPosition}`);
            this.updateBannerIconXPosition(this.currentBannerIconXPosition);
        });
        
        // Banner Icon Vertical Offset control container
        const bannerIconVerticalOffsetContainer = bannerIconControlsContainer.createDiv({
            cls: 'banner-icon-vertical-offset-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    min-width: 60px;
                    flex: 0 auto;
                    margin-top: 10px;
                `
            }
        });

        // Banner Icon Vertical Offset label
        const bannerIconVerticalOffsetLabel = bannerIconVerticalOffsetContainer.createEl('div', { 
            text: 'Y Position',
            cls: 'banner-icon-vertical-offset-label',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        // Get current banner icon vertical offset
        const iconVerticalOffsetField = Array.isArray(this.plugin.settings.customBannerIconVeritalOffsetField)
            ? this.plugin.settings.customBannerIconVeritalOffsetField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconVeritalOffsetField;
        this.currentBannerIconVerticalOffset = frontmatter?.[iconVerticalOffsetField] || this.plugin.settings.bannerIconVeritalOffset;

        // Banner Icon Vertical Offset slider
        const bannerIconVerticalOffsetSlider = bannerIconVerticalOffsetContainer.createEl('input', {
            type: 'range',
            cls: 'banner-icon-vertical-offset-slider',
            attr: {
                min: '-100',
                max: '100',
                step: '1',
                value: this.currentBannerIconVerticalOffset,
                style: `
                    flex: 1;
                    writing-mode: horizontal-tb;
                    direction: ltr;
                `
            }
        });

        // Banner Icon Vertical Offset value display
        const bannerIconVerticalOffsetValue = bannerIconVerticalOffsetContainer.createDiv({
            cls: 'banner-icon-vertical-offset-value',
            attr: {
                style: `
                    font-family: var(--font-monospace);
                    font-size: 0.9em;
                `
            }
        });
        bannerIconVerticalOffsetValue.setText(`${this.currentBannerIconVerticalOffset}`);

        // Banner Icon Vertical Offset slider event listener
        bannerIconVerticalOffsetSlider.addEventListener('input', () => {
            this.currentBannerIconVerticalOffset = parseInt(bannerIconVerticalOffsetSlider.value);
            bannerIconVerticalOffsetValue.setText(`${this.currentBannerIconVerticalOffset}`);
            this.updateBannerIconVerticalOffset(this.currentBannerIconVerticalOffset);
        });
        
        // Banner Icon Size control container
        const bannerIconSizeContainer = bannerIconControlsContainer.createDiv({
            cls: 'banner-icon-size-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    min-width: 60px;
                    flex: 0 auto;
                    margin-top: 10px;
                `
            }
        });

        // Banner Icon Size label
        const bannerIconSizeLabel = bannerIconSizeContainer.createEl('div', { 
            text: 'Size',
            cls: 'banner-icon-size-label',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        // Get current banner icon size
        const iconSizeField = Array.isArray(this.plugin.settings.customBannerIconSizeField)
            ? this.plugin.settings.customBannerIconSizeField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconSizeField;
        this.currentBannerIconSize = frontmatter?.[iconSizeField] || this.plugin.settings.bannerIconSize;

        // Banner Icon Size slider
        const bannerIconSizeSlider = bannerIconSizeContainer.createEl('input', {
            type: 'range',
            cls: 'banner-icon-size-slider',
            attr: {
                min: '10',
                max: '200',
                step: '1',
                value: this.currentBannerIconSize,
                style: `
                    flex: 1;
                    writing-mode: horizontal-tb;
                    direction: ltr;
                `
            }
        });

        // Banner Icon Size value display
        const bannerIconSizeValue = bannerIconSizeContainer.createDiv({
            cls: 'banner-icon-size-value',
            attr: {
                style: `
                    font-family: var(--font-monospace);
                    font-size: 0.9em;
                `
            }
        });
        bannerIconSizeValue.setText(`${this.currentBannerIconSize}`);

        // Banner Icon Size slider event listener
        bannerIconSizeSlider.addEventListener('input', () => {
            this.currentBannerIconSize = parseInt(bannerIconSizeSlider.value);
            bannerIconSizeValue.setText(`${this.currentBannerIconSize}`);
            this.updateBannerIconSize(this.currentBannerIconSize);
        });

        // Banner Icon Color control container
        const bannerIconColorContainer = bannerIconControlsContainer.createDiv({
            cls: 'banner-icon-color-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    flex: 0 auto;
                    margin-top: 10px;
                `
            }
        });

        // Banner Icon Color label
        const bannerIconColorLabel = bannerIconColorContainer.createEl('div', { 
            text: 'Color',
            cls: 'banner-icon-color-label',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        // Get current banner icon color
        const iconColorField = Array.isArray(this.plugin.settings.customBannerIconColorField)
            ? this.plugin.settings.customBannerIconColorField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconColorField;
        
        const currentTheme = getCurrentTheme();
        let defaultColor = currentTheme === 'dark' ? '#ffffff' : '#000000';

        // Parse the current color value
        let currentIconColor = defaultColor;
        if (frontmatter?.[iconColorField] || this.plugin.settings.bannerIconColor) {
            const colorValue = frontmatter?.[iconColorField] || this.plugin.settings.bannerIconColor;
            
            // Check if it's a hex color
            if (typeof colorValue === 'string' && colorValue.startsWith('#')) {
                currentIconColor = colorValue;
            }
            // Otherwise, if it's a string, use as is
            else if (typeof colorValue === 'string' && colorValue.trim() !== '') {
                currentIconColor = colorValue;
            }
        }
        
        this.currentBannerIconColor = currentIconColor;

        // Banner Icon Color input
        const bannerIconColorInput = bannerIconColorContainer.createEl('input', {
            type: 'text',
            cls: 'banner-icon-color-input',
            attr: {
                value: this.currentBannerIconColor || '',
                placeholder: '#RRGGBB or color name',
                style: `
                    flex: 1;
                    max-width: 120px;
                `
            }
        });

        // Banner Icon Color picker
        const bannerIconColorPicker = bannerIconColorContainer.createEl('input', {
            type: 'color',
            cls: 'banner-icon-color-picker',
            attr: {
                value: this.currentBannerIconColor && this.currentBannerIconColor.startsWith('#') ? 
                    this.currentBannerIconColor : ''
            }
        });

        // Banner Icon Color input event listener
        bannerIconColorInput.addEventListener('change', () => {
            this.currentBannerIconColor = bannerIconColorInput.value;
            if (this.currentBannerIconColor.startsWith('#')) {
                bannerIconColorPicker.value = this.currentBannerIconColor;
            }
            this.updateBannerIconColor(this.currentBannerIconColor);
        });

        // Banner Icon Color picker event listener
        bannerIconColorPicker.addEventListener('input', () => {
            this.currentBannerIconColor = bannerIconColorPicker.value;
            bannerIconColorInput.value = this.currentBannerIconColor;
            this.updateBannerIconColor(this.currentBannerIconColor);
        });

        // Banner Icon Font Weight control container
        const bannerIconFontWeightContainer = bannerIconControlsContainer.createDiv({
            cls: 'banner-icon-font-weight-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    min-width: 60px;
                    flex: 0 auto;
                    margin-top: 10px;
                `
            }
        });

        // Banner Icon Font Weight label
        const bannerIconFontWeightLabel = bannerIconFontWeightContainer.createEl('div', { 
            text: 'Font Weight',
            cls: 'banner-icon-font-weight-label',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        // Get current banner icon font weight
        const iconFontWeightField = Array.isArray(this.plugin.settings.customBannerIconFontWeightField)
            ? this.plugin.settings.customBannerIconFontWeightField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconFontWeightField;
        this.currentBannerIconFontWeight = frontmatter?.[iconFontWeightField] || this.plugin.settings.bannerIconFontWeight;

        // Banner Icon Font Weight select
        const bannerIconFontWeightSelect = bannerIconFontWeightContainer.createEl('select', {
            cls: 'banner-icon-font-weight-select'
        });
        
        ['lighter', 'normal', 'bold'].forEach(weight => {
            const option = bannerIconFontWeightSelect.createEl('option', {
                text: weight.charAt(0).toUpperCase() + weight.slice(1),
                value: weight
            });
            if (weight === this.currentBannerIconFontWeight) {
                option.selected = true;
            }
        });

        // Banner Icon Font Weight select event listener
        bannerIconFontWeightSelect.addEventListener('change', () => {
            this.currentBannerIconFontWeight = bannerIconFontWeightSelect.value;
            this.updateBannerIconFontWeight(this.currentBannerIconFontWeight);
        });

        // Banner Icon Background Color control container
        const bannerIconBgColorContainer = bannerIconControlsContainer.createDiv({
            cls: 'banner-icon-bg-color-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    min-width: 60px;
                    flex: 0 auto;
                    margin-top: 10px;
                `
            }
        });

        // Banner Icon Background Color label
        const bannerIconBgColorLabel = bannerIconBgColorContainer.createEl('div', { 
            text: 'Background Color',
            cls: 'banner-icon-bg-color-label',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        // Create color picker and alpha slider row
        const colorPickerAndAlphaSliderRow = bannerIconBgColorContainer.createDiv({
            cls: 'color-picker-and-alpha-slider-row',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    width: 100%;
                `
            }
        });

        // Create color picker row
        const colorPickerRow = colorPickerAndAlphaSliderRow.createDiv({
            cls: 'color-picker-row',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    width: 100%;
                `
            }
        });

        // Get current banner icon background color and opacity
        const iconBgColorField = Array.isArray(this.plugin.settings.customBannerIconBackgroundColorField)
            ? this.plugin.settings.customBannerIconBackgroundColorField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconBackgroundColorField;
        
        // Parse the current background color to extract color and alpha values
        let currentColor = defaultColor;
        let currentAlpha = 100;
        
        if (frontmatter?.[iconBgColorField] || this.plugin.settings.bannerIconBackgroundColor) {
            const colorValue = frontmatter?.[iconBgColorField] || this.plugin.settings.bannerIconBackgroundColor;
            
            // Check if it's an rgba color
            const rgbaMatch = colorValue?.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
            if (rgbaMatch) {
                // Convert RGB to hex
                const r = parseInt(rgbaMatch[1]);
                const g = parseInt(rgbaMatch[2]);
                const b = parseInt(rgbaMatch[3]);
                currentColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                currentAlpha = Math.round(parseFloat(rgbaMatch[4]) * 100);
            } 
            // Check if it's a hex color
            else if (colorValue?.startsWith('#')) {
                currentColor = colorValue;
            }
            // Otherwise, use as is
            else if (colorValue) {
                currentColor = colorValue;
            }
        }
        
        this.currentBannerIconBgColor = currentColor;
        this.currentBannerIconBgAlpha = currentAlpha;

        // Banner Icon Background Color input
        const bannerIconBgColorInput = colorPickerAndAlphaSliderRow.createEl('input', {
            type: 'text',
            cls: 'banner-icon-bg-color-input',
            attr: {
                value: this.currentBannerIconBgColor || '',
                placeholder: '#RRGGBB or color name',
                style: `
                    flex: 1;
                    max-width: 120px;
                `
            }
        });

        // Banner Icon Background Color picker
        const bannerIconBgColorPicker = colorPickerAndAlphaSliderRow.createEl('input', {
            type: 'color',
            cls: 'banner-icon-bg-color-picker',
            attr: {
                value: this.currentBannerIconBgColor && this.currentBannerIconBgColor.startsWith('#') ? 
                    this.currentBannerIconBgColor : defaultColor
            }
        });

        // Create alpha slider row
        const alphaSliderRow = colorPickerAndAlphaSliderRow.createDiv({
            cls: 'alpha-slider-row',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    width: 100%;
                    margin-top: 5px;
                `
            }
        });

        // Alpha slider label
        const alphaLabel = colorPickerAndAlphaSliderRow.createEl('div', {
            text: 'Opacity:',
            cls: 'alpha-label',
            attr: {
                style: `
                    color: var(--text-muted);
                    font-size: 0.9em;
                    min-width: 60px;
                `
            }
        });

        // Alpha slider
        const alphaSlider = colorPickerAndAlphaSliderRow.createEl('input', {
            type: 'range',
            cls: 'alpha-slider',
            attr: {
                min: '0',
                max: '100',
                step: '1',
                value: this.currentBannerIconBgAlpha,
                style: `
                    flex: 1;
                `
            }
        });

        // Alpha value display
        const alphaValue = colorPickerAndAlphaSliderRow.createDiv({
            cls: 'alpha-value',
            attr: {
                style: `
                    font-family: var(--font-monospace);
                    font-size: 0.9em;
                    min-width: 40px;
                    text-align: right;
                `
            }
        });
        alphaValue.setText(`${this.currentBannerIconBgAlpha}%`);

        // Color preview
        const colorPreview = colorPickerAndAlphaSliderRow.createDiv({
            cls: 'color-preview',
            attr: {
                style: `
                    width: 100%;
                    height: 20px;
                    border: 1px solid var(--background-modifier-border);
                    border-radius: 4px;
                    background-color: ${this.currentBannerIconBgColor};
                    opacity: ${this.currentBannerIconBgAlpha / 100};
                `
            }
        });

        // Helper function to update the color preview
        const updateColorPreview = () => {
            colorPreview.style.backgroundColor = this.currentBannerIconBgColor;
            colorPreview.style.opacity = this.currentBannerIconBgAlpha / 100;
            
            // Convert to rgba and update the frontmatter
            this.updateBannerIconBgColor(this.currentBannerIconBgColor, this.currentBannerIconBgAlpha);
        };

        // Banner Icon Background Color input event listener
        bannerIconBgColorInput.addEventListener('change', () => {
            this.currentBannerIconBgColor = bannerIconBgColorInput.value;
            if (this.currentBannerIconBgColor.startsWith('#')) {
                bannerIconBgColorPicker.value = this.currentBannerIconBgColor;
            }
            updateColorPreview();
        });

        // Banner Icon Background Color picker event listener
        bannerIconBgColorPicker.addEventListener('input', () => {
            this.currentBannerIconBgColor = bannerIconBgColorPicker.value;
            bannerIconBgColorInput.value = this.currentBannerIconBgColor;
            updateColorPreview();
        });

        // Alpha slider event listener
        alphaSlider.addEventListener('input', () => {
            this.currentBannerIconBgAlpha = parseInt(alphaSlider.value);
            alphaValue.setText(`${this.currentBannerIconBgAlpha}%`);
            updateColorPreview();
        });

        // Banner Icon Padding X control container
        const bannerIconPaddingXContainer = bannerIconControlsContainer.createDiv({
            cls: 'banner-icon-padding-x-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    min-width: 60px;
                    flex: 0 auto;
                    margin-top: 10px;
                `
            }
        });

        // Banner Icon Padding X label
        const bannerIconPaddingXLabel = bannerIconPaddingXContainer.createEl('div', { 
            text: 'Padding X',
            cls: 'banner-icon-padding-x-label',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        // Get current banner icon padding X
        const iconPaddingXField = Array.isArray(this.plugin.settings.customBannerIconPaddingXField)
            ? this.plugin.settings.customBannerIconPaddingXField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconPaddingXField;
        this.currentBannerIconPaddingX = frontmatter?.[iconPaddingXField] || this.plugin.settings.bannerIconPaddingX;

        // Banner Icon Padding X slider
        const bannerIconPaddingXSlider = bannerIconPaddingXContainer.createEl('input', {
            type: 'range',
            cls: 'banner-icon-padding-x-slider',
            attr: {
                min: '0',
                max: '100',
                step: '1',
                value: this.currentBannerIconPaddingX,
                style: `
                    flex: 1;
                    writing-mode: horizontal-tb;
                    direction: ltr;
                `
            }
        });

        // Banner Icon Padding X value display
        const bannerIconPaddingXValue = bannerIconPaddingXContainer.createDiv({
            cls: 'banner-icon-padding-x-value',
            attr: {
                style: `
                    font-family: var(--font-monospace);
                    font-size: 0.9em;
                `
            }
        });
        bannerIconPaddingXValue.setText(`${this.currentBannerIconPaddingX}`);

        // Banner Icon Padding X slider event listener
        bannerIconPaddingXSlider.addEventListener('input', () => {
            this.currentBannerIconPaddingX = parseInt(bannerIconPaddingXSlider.value);
            bannerIconPaddingXValue.setText(`${this.currentBannerIconPaddingX}`);
            this.updateBannerIconPaddingX(this.currentBannerIconPaddingX);
        });

        // Banner Icon Padding Y control container
        const bannerIconPaddingYContainer = bannerIconControlsContainer.createDiv({
            cls: 'banner-icon-padding-y-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    min-width: 60px;
                    flex: 0 auto;
                    margin-top: 10px;
                `
            }
        });

        // Banner Icon Padding Y label
        const bannerIconPaddingYLabel = bannerIconPaddingYContainer.createEl('div', { 
            text: 'Padding Y',
            cls: 'banner-icon-padding-y-label',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        // Get current banner icon padding Y
        const iconPaddingYField = Array.isArray(this.plugin.settings.customBannerIconPaddingYField)
            ? this.plugin.settings.customBannerIconPaddingYField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconPaddingYField;
        this.currentBannerIconPaddingY = frontmatter?.[iconPaddingYField] || this.plugin.settings.bannerIconPaddingY;

        // Banner Icon Padding Y slider
        const bannerIconPaddingYSlider = bannerIconPaddingYContainer.createEl('input', {
            type: 'range',
            cls: 'banner-icon-padding-y-slider',
            attr: {
                min: '0',
                max: '100',
                step: '1',
                value: this.currentBannerIconPaddingY,
                style: `
                    flex: 1;
                    writing-mode: horizontal-tb;
                    direction: ltr;
                `
            }
        });

        // Banner Icon Padding Y value display
        const bannerIconPaddingYValue = bannerIconPaddingYContainer.createDiv({
            cls: 'banner-icon-padding-y-value',
            attr: {
                style: `
                    font-family: var(--font-monospace);
                    font-size: 0.9em;
                `
            }
        });
        bannerIconPaddingYValue.setText(`${this.currentBannerIconPaddingY}`);

        // Banner Icon Padding Y slider event listener
        bannerIconPaddingYSlider.addEventListener('input', () => {
            this.currentBannerIconPaddingY = parseInt(bannerIconPaddingYSlider.value);
            bannerIconPaddingYValue.setText(`${this.currentBannerIconPaddingY}`);
            this.updateBannerIconPaddingY(this.currentBannerIconPaddingY);
        });

        // Banner Icon Border Radius control container
        const bannerIconBorderRadiusContainer = bannerIconControlsContainer.createDiv({
            cls: 'banner-icon-border-radius-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    min-width: 60px;
                    flex: 0 auto;
                    margin-top: 10px;
                `
            }
        });

        // Banner Icon Border Radius label
        const bannerIconBorderRadiusLabel = bannerIconBorderRadiusContainer.createEl('div', { 
            text: 'Border Radius',
            cls: 'banner-icon-border-radius-label',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        // Get current banner icon border radius
        const iconBorderRadiusField = Array.isArray(this.plugin.settings.customBannerIconBorderRadiusField)
            ? this.plugin.settings.customBannerIconBorderRadiusField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconBorderRadiusField;
        if (frontmatter?.[iconBorderRadiusField] === 0) {
            this.currentBannerIconBorderRadius = 0;
        } else if (this.plugin.settings.bannerIconBorderRadius === 0) {
            this.currentBannerIconBorderRadius = 0;
        } else {
            this.currentBannerIconBorderRadius = frontmatter?.[iconBorderRadiusField] || this.plugin.settings.bannerIconBorderRadius;
        }

        // Banner Icon Border Radius slider
        const bannerIconBorderRadiusSlider = bannerIconBorderRadiusContainer.createEl('input', {
            type: 'range',
            cls: 'banner-icon-border-radius-slider',
            attr: {
                min: '0',
                max: '100',
                step: '1',
                value: this.currentBannerIconBorderRadius,
                style: `
                    flex: 1;
                    writing-mode: horizontal-tb;
                    direction: ltr;
                `
            }
        });

        // Banner Icon Border Radius value display
        const bannerIconBorderRadiusValue = bannerIconBorderRadiusContainer.createDiv({
            cls: 'banner-icon-border-radius-value',
            attr: {
                style: `
                    font-family: var(--font-monospace);
                    font-size: 0.9em;
                `
            }
        });
        bannerIconBorderRadiusValue.setText(`${this.currentBannerIconBorderRadius}`);

        // Banner Icon Border Radius slider event listener
        bannerIconBorderRadiusSlider.addEventListener('input', () => {
            this.currentBannerIconBorderRadius = parseInt(bannerIconBorderRadiusSlider.value);
            bannerIconBorderRadiusValue.setText(`${this.currentBannerIconBorderRadius}`);
            this.updateBannerIconBorderRadius(this.currentBannerIconBorderRadius);
        });

        // Flag Color Selection Section
        const flagColorSection = contentEl.createDiv({
            cls: 'flag-color-section',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 5px;
                    margin-top: 20px;
                    padding: 15px;
                    border-radius: 5px;
                    background-color: var(--background-secondary);
                    max-width: 510px;
                `
            }
        });

        // Flag Color Section Title
        flagColorSection.createEl('span', {
            text: 'Flag Color',
            attr: {
                style: `
                    color: var(--text-muted);
                    font-size: 0.9em;
                `
            }
        });

        // Create a container for the radio buttons
        const flagRadioContainer = flagColorSection.createDiv({
            cls: 'pixel-banner-flag-radio-container',
            attr: {
                style: `
                    max-width: 600px;
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    gap: 10px;
                `
            }
        });
        
        // Get current flag color from frontmatter or default setting
        const currentFlagColor = getFrontmatterValue(frontmatter, this.plugin.settings.customFlagColorField) || this.plugin.settings.selectImageIconFlag;
        
        // Create a radio button for each flag
        Object.keys(flags).forEach(color => {
            const radioContainer = flagRadioContainer.createDiv({
                cls: 'pixel-banner-flag-radio',
                attr: {
                    style: `
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    `
                }
            });
            
            // Create the radio input
            const radio = radioContainer.createEl('input', {
                type: 'radio',
                attr: {
                    id: `flag-${color}`,
                    name: 'pixel-banner-flag',
                    value: color,
                    style: `
                        margin-right: 5px;
                        cursor: pointer;
                    `
                }
            });
            
            // Set checked state based on current setting
            radio.checked = currentFlagColor === color;
            
            // Create the label with flag image
            const label = radioContainer.createEl('label', {
                attr: {
                    for: `flag-${color}`,
                    style: `
                        display: flex;
                        align-items: center;
                        cursor: pointer;
                    `
                }
            });
            
            // Add the flag image to the label
            label.createEl('img', {
                attr: {
                    src: flags[color],
                    alt: color,
                    style: `
                        width: 15px;
                        height: 20px;
                        margin-right: 3px;
                    `
                }
            });
            
            // Add the color name to the label
            label.createEl('span', {
                text: color.charAt(0).toUpperCase() + color.slice(1),
                attr: {
                    style: `
                        display: none;
                        font-size: 12px;
                    `
                }
            });
            
            // Add change event listener
            radio.addEventListener('change', async () => {
                if (radio.checked) {
                    const activeFile = this.app.workspace.getActiveFile();
                    if (activeFile) {
                        await this.plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                            const flagColorField = this.plugin.settings.customFlagColorField[0];
                            frontmatter[flagColorField] = color;
                        });
                        
                        // Update the banner to reflect the changes
                        const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                        if (view) {
                            await this.plugin.updateBanner(view, true);
                        }
                    }
                }
            });
        });

        // Title Color Section - only show if inline title is enabled
        const inlineTitleEnabled = this.app.vault.config.showInlineTitle;
        const titleColorSection = contentEl.createDiv({
            cls: 'title-color-section',
            attr: {
                style: `
                    display: ${inlineTitleEnabled ? 'flex' : 'none'};
                    flex-direction: row;
                    gap: 10px;
                    margin-top: 20px;
                    padding: 15px;
                    border-radius: 5px;
                    background-color: var(--background-secondary);
                    max-width: 510px;
                    align-items: center;
                `
            }
        });

        // Title Color Section Label
        titleColorSection.createEl('span', {
            text: 'Inline Title Color',
            attr: {
                style: `
                    color: var(--text-muted);
                    font-size: 0.9em;
                    min-width: 120px;
                `
            }
        });

        // Get current title color from frontmatter or settings
        const titleColorField = Array.isArray(this.plugin.settings.customTitleColorField)
            ? this.plugin.settings.customTitleColorField[0].split(',')[0].trim()
            : this.plugin.settings.customTitleColorField;
        
        // Parse current title color
        let currentTitleColor = frontmatter?.[titleColorField] || this.plugin.settings.titleColor;
        
        // If the color is a CSS variable, try to compute its value
        if (currentTitleColor && currentTitleColor.startsWith('var(--')) {
            const tempEl = document.createElement('div');
            tempEl.style.color = currentTitleColor;
            document.body.appendChild(tempEl);
            const computedColor = window.getComputedStyle(tempEl).color;
            document.body.removeChild(tempEl);
            
            // Parse RGB values
            const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
                const [_, r, g, b] = rgbMatch;
                currentTitleColor = '#' + 
                    parseInt(r).toString(16).padStart(2, '0') +
                    parseInt(g).toString(16).padStart(2, '0') +
                    parseInt(b).toString(16).padStart(2, '0');
            }
        }
        
        this.currentTitleColor = currentTitleColor || (getCurrentTheme() === 'dark' ? '#ffffff' : '#000000');

        // Title color input
        const titleColorInput = titleColorSection.createEl('input', {
            type: 'text',
            cls: 'title-color-input',
            attr: {
                value: this.currentTitleColor || '',
                placeholder: '#RRGGBB or color name',
                style: `
                    flex: 1;
                    max-width: 120px;
                `
            }
        });

        // Title color picker
        const titleColorPicker = titleColorSection.createEl('input', {
            type: 'color',
            cls: 'title-color-picker',
            attr: {
                value: this.currentTitleColor && this.currentTitleColor.startsWith('#') ? 
                    this.currentTitleColor : (getCurrentTheme() === 'dark' ? '#ffffff' : '#000000')
            }
        });

        // Title color input event listener
        titleColorInput.addEventListener('change', () => {
            this.currentTitleColor = titleColorInput.value;
            if (this.currentTitleColor.startsWith('#')) {
                titleColorPicker.value = this.currentTitleColor;
            }
            this.updateTitleColor(this.currentTitleColor);
        });

        // Title color picker event listener
        titleColorPicker.addEventListener('input', () => {
            this.currentTitleColor = titleColorPicker.value;
            titleColorInput.value = this.currentTitleColor;
            this.updateTitleColor(this.currentTitleColor);
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
                    position: sticky;
                    bottom: -20px;
                    background: var(--modal-background);
                    padding: 20px 0;
                `
            }
        });

        // Reset to defaults button
        const resetButton = buttonContainer.createEl('button', {
            text: 'Reset to Defaults',
            cls: 'reset-button',
            attr: {
                style: `
                    flex: 1;
                `
            }
        });
        
        // Close Settings button
        const closeSettingsButton = buttonContainer.createEl('button', {
            text: 'Close Settings',
            cls: 'mod-cta close-settings-button',
            attr: {
                style: `
                    flex: 1;
                `
            }
        });

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
            
            const currentTheme = getCurrentTheme();
            let defaultColor = currentTheme === 'dark' ? '#ffffff' : '#000000';

            // Reset new banner icon controls
            if (bannerIconSizeSlider) bannerIconSizeSlider.value = this.plugin.settings.bannerIconSize;
            
            // Reset Banner Icon Color
            if (bannerIconColorInput) {
                const defaultIconColor = this.plugin.settings.bannerIconColor || defaultColor;
                bannerIconColorInput.value = defaultIconColor;
                if (bannerIconColorPicker) {
                    bannerIconColorPicker.value = defaultIconColor.startsWith('#') ? 
                        defaultIconColor : defaultColor;
                }
                // Update the frontmatter with the default color
                this.updateBannerIconColor(defaultIconColor);
            }
            
            if (bannerIconFontWeightSelect) bannerIconFontWeightSelect.value = this.plugin.settings.bannerIconFontWeight;
            if (bannerIconBgColorInput) {
                // Parse the default background color
                let defaultAlpha = 100;
                
                if (this.plugin.settings.bannerIconBackgroundColor) {
                    const colorValue = this.plugin.settings.bannerIconBackgroundColor;
                    
                    // Check if it's an rgba color
                    const rgbaMatch = colorValue.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
                    if (rgbaMatch) {
                        // Convert RGB to hex
                        const r = parseInt(rgbaMatch[1]);
                        const g = parseInt(rgbaMatch[2]);
                        const b = parseInt(rgbaMatch[3]);
                        defaultColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                        defaultAlpha = Math.round(parseFloat(rgbaMatch[4]) * 100);
                    } 
                    // Check if it's a hex color
                    else if (colorValue.startsWith('#')) {
                        defaultColor = colorValue;
                    }
                    // Otherwise, use as is
                    else if (colorValue) {
                        defaultColor = colorValue;
                    }
                }
                
                bannerIconBgColorInput.value = defaultColor;
                if (bannerIconBgColorPicker) bannerIconBgColorPicker.value = defaultColor.startsWith('#') ? defaultColor : '#ffffff';
                if (alphaSlider) alphaSlider.value = defaultAlpha;
                if (alphaValue) alphaValue.setText(`${defaultAlpha}%`);
                if (colorPreview) {
                    colorPreview.style.backgroundColor = defaultColor;
                    colorPreview.style.opacity = defaultAlpha / 100;
                }
                
                // Update the frontmatter with the default color and alpha
                this.updateBannerIconBgColor(defaultColor, defaultAlpha);
            }
            if (bannerIconPaddingXSlider) bannerIconPaddingXSlider.value = this.plugin.settings.bannerIconPaddingX;
            if (bannerIconPaddingYSlider) bannerIconPaddingYSlider.value = this.plugin.settings.bannerIconPaddingY;
            if (bannerIconBorderRadiusSlider) bannerIconBorderRadiusSlider.value = this.plugin.settings.bannerIconBorderRadius;
            if (bannerIconVerticalOffsetSlider) bannerIconVerticalOffsetSlider.value = this.plugin.settings.bannerIconVeritalOffset;
            
            // Reset value displays
            zoomValue.setText('100%');
            heightValue.setText(`${this.plugin.settings.bannerHeight}px`);
            contentStartPositionValue.setText(`${this.plugin.settings.contentStartPosition}px`);
            bannerIconXPositionValue.setText(`${this.plugin.settings.bannerIconXPosition}`);
            
            // Reset new banner icon value displays
            if (bannerIconSizeValue) bannerIconSizeValue.setText(`${this.plugin.settings.bannerIconSize}`);
            if (bannerIconPaddingXValue) bannerIconPaddingXValue.setText(`${this.plugin.settings.bannerIconPaddingX}`);
            if (bannerIconPaddingYValue) bannerIconPaddingYValue.setText(`${this.plugin.settings.bannerIconPaddingY}`);
            if (bannerIconBorderRadiusValue) bannerIconBorderRadiusValue.setText(`${this.plugin.settings.bannerIconBorderRadius}`);
            if (bannerIconVerticalOffsetValue) bannerIconVerticalOffsetValue.setText(`${this.plugin.settings.bannerIconVeritalOffset}`);
            
            toggleInput.checked = false;

            // Reset crosshair position to default plugin settings
            this.currentX = this.plugin.settings.xPosition;
            this.currentY = this.plugin.settings.yPosition;
            
            // Update crosshair position visually
            verticalLine.style.left = `${this.currentX}%`;
            horizontalLine.style.top = `${this.currentY}%`;
            
            // Update position indicator with default values
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

                // New banner icon fields
                const bannerIconSizeField = Array.isArray(this.plugin.settings.customBannerIconSizeField)
                    ? this.plugin.settings.customBannerIconSizeField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerIconSizeField;
                    
                const bannerIconColorField = Array.isArray(this.plugin.settings.customBannerIconColorField)
                    ? this.plugin.settings.customBannerIconColorField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerIconColorField;
                    
                const bannerIconFontWeightField = Array.isArray(this.plugin.settings.customBannerIconFontWeightField)
                    ? this.plugin.settings.customBannerIconFontWeightField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerIconFontWeightField;
                    
                const bannerIconBgColorField = Array.isArray(this.plugin.settings.customBannerIconBackgroundColorField)
                    ? this.plugin.settings.customBannerIconBackgroundColorField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerIconBackgroundColorField;
                    
                const bannerIconPaddingXField = Array.isArray(this.plugin.settings.customBannerIconPaddingXField)
                    ? this.plugin.settings.customBannerIconPaddingXField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerIconPaddingXField;
                    
                const bannerIconPaddingYField = Array.isArray(this.plugin.settings.customBannerIconPaddingYField)
                    ? this.plugin.settings.customBannerIconPaddingYField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerIconPaddingYField;
                    
                const bannerIconBorderRadiusField = Array.isArray(this.plugin.settings.customBannerIconBorderRadiusField)
                    ? this.plugin.settings.customBannerIconBorderRadiusField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerIconBorderRadiusField;
                    
                const bannerIconVerticalOffsetField = Array.isArray(this.plugin.settings.customBannerIconVeritalOffsetField)
                    ? this.plugin.settings.customBannerIconVeritalOffsetField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerIconVeritalOffsetField;

                // Remove benner image fields
                delete frontmatter[displayField];
                delete frontmatter[heightField];
                delete frontmatter[xField];
                delete frontmatter[yField];
                delete frontmatter[contentStartPositionField];
                delete frontmatter[repeatField];
                
                // Remove banner icon fields
                delete frontmatter[bannerIconXPositionField];
                delete frontmatter[bannerIconSizeField];
                delete frontmatter[bannerIconColorField];
                delete frontmatter[bannerIconFontWeightField];
                delete frontmatter[bannerIconBgColorField];
                delete frontmatter[bannerIconPaddingXField];
                delete frontmatter[bannerIconPaddingYField];
                delete frontmatter[bannerIconBorderRadiusField];
                delete frontmatter[bannerIconVerticalOffsetField];
                
                // Remove flag color field (this ensures the note uses the global default flag color)
                const flagColorField = Array.isArray(this.plugin.settings.customFlagColorField)
                    ? this.plugin.settings.customFlagColorField[0].split(',')[0].trim()
                    : this.plugin.settings.customFlagColorField;
                console.log('Removing flag color field:', flagColorField);
                delete frontmatter[flagColorField];
                
                // Update the flag color radio buttons to reflect the global default
                const defaultColor = this.plugin.settings.selectImageIconFlag;
                const radios = flagRadioContainer.querySelectorAll('input[type="radio"]');
                radios.forEach(radio => {
                    radio.checked = radio.value === defaultColor;
                });
            });
            
            // After processing frontmatter, update the flag color radio buttons
            if (flagRadioContainer) {
                console.log('Updating flag radio buttons after reset');
                const flagRadios = flagRadioContainer.querySelectorAll('input[type="radio"]');
                flagRadios.forEach(radio => {
                    radio.checked = radio.value === this.plugin.settings.selectImageIconFlag;
                });
            }

            // Reset title color if inline title is enabled
            if (inlineTitleEnabled && titleColorInput) {
                // Convert default title color if it's a CSS variable
                let defaultTitleColor = this.plugin.settings.titleColor;
                if (defaultTitleColor.startsWith('var(--')) {
                    const tempEl = document.createElement('div');
                    tempEl.style.color = defaultTitleColor;
                    document.body.appendChild(tempEl);
                    const computedColor = window.getComputedStyle(tempEl).color;
                    document.body.removeChild(tempEl);
                    
                    const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                    if (rgbMatch) {
                        const [_, r, g, b] = rgbMatch;
                        defaultTitleColor = '#' + 
                            parseInt(r).toString(16).padStart(2, '0') +
                            parseInt(g).toString(16).padStart(2, '0') +
                            parseInt(b).toString(16).padStart(2, '0');
                    }
                }
                
                titleColorInput.value = defaultTitleColor;
                if (titleColorPicker) {
                    titleColorPicker.value = defaultTitleColor.startsWith('#') ? 
                        defaultTitleColor : (getCurrentTheme() === 'dark' ? '#ffffff' : '#000000');
                }
                // Update the frontmatter with the default color
                this.updateTitleColor(defaultTitleColor);
            }
            
            // Reset the banner position
            this.currentX = this.plugin.settings.xPosition;
            this.currentY = this.plugin.settings.yPosition;
            
            // Update crosshair position visually
            verticalLine.style.left = `${this.currentX}%`;
            horizontalLine.style.top = `${this.currentY}%`;
            
            // Update position indicator with default values
            updatePositionIndicator();
        });

        // Create repeat toggle container (initially hidden)
        const repeatContainer = controlPanel.createDiv({
            cls: 'repeat-container',
            attr: {
                style: `
                    display: ${this.currentDisplay === 'contain' || this.currentDisplay === 'auto' ? 'flex' : 'none'};
                    flex-direction: column;
                    gap: 5px;
                    align-items: center;
                    justify-content: flex-start;
                    margin-top: 10px;
                    max-width: 70px;
                    text-align: center;
                `
            }
        });

        // Repeat label
        const repeatLabel = repeatContainer.createEl('div', { 
            text: 'repeat banner image?',
            cls: 'repeat-label',
            attr: {
                style: `
                    color: var(--text-muted);
                    font-size: 0.9em;
                    margin-bottom: 20px;
                `
            }
        });

        // Repeat toggle
        const repeatToggle = repeatContainer.createEl('div', {
            cls: 'repeat-toggle',
            attr: {
                style: `
                    margin-top: 10px;
                `
            }
        });

        const toggleInput = repeatToggle.createEl('input', {
            type: 'checkbox',
            cls: 'repeat-checkbox',
            attr: {
                checked: (this.currentDisplay === 'contain' || this.currentDisplay === 'auto') ? this.currentRepeat : this.plugin.settings.imageRepeat
            }
        });

        // Update display select event handler
        displaySelect.addEventListener('change', () => {
            const mode = displaySelect.value;
            zoomContainer.style.display = mode === 'cover-zoom' ? 'flex' : 'none';
            repeatContainer.style.display = (mode === 'contain' || mode === 'auto') ? 'flex' : 'none';
            
            // Update the checkbox state when switching modes
            if (mode === 'contain' || mode === 'auto') {
                toggleInput.checked = this.currentRepeat;
            } else {
                // For other modes, set checkbox to plugin default
                toggleInput.checked = this.plugin.settings.imageRepeat;
                this.currentRepeat = this.plugin.settings.imageRepeat;
            }
            
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
            if (e.target === zoomSlider || 
                e.target === heightSlider || 
                e.target === contentStartPositionSlider || 
                e.target === bannerIconXPositionSlider ||
                e.target === bannerIconSizeSlider ||
                e.target === bannerIconColorPicker ||
                e.target === bannerIconColorInput ||
                e.target === bannerIconPaddingXSlider ||
                e.target === bannerIconPaddingYSlider ||
                e.target === bannerIconBorderRadiusSlider ||
                e.target === bannerIconVerticalOffsetSlider ||
                e.target === alphaSlider ||
                e.target === bannerIconBgColorPicker ||
                e.target === bannerIconBgColorInput ||
                e.target === titleColorPicker ||
                e.target === titleColorInput) return;
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