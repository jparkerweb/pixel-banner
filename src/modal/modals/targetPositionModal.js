import { Modal, MarkdownView } from 'obsidian';
import getCurrentTheme from '../../utils/getCurrentTheme';
import { EmojiSelectionModal, IconImageSelectionModal } from '../modals';
import { SelectPixelBannerModal } from './selectPixelBannerModal';
import { flags } from '../../resources/flags.js';
import { getFrontmatterValue, getValueWithZeroCheck } from '../../utils/frontmatterUtils.js';


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

        // alignment field
        const alignmentField = Array.isArray(this.plugin.settings.customBannerAlignmentField) 
            ? this.plugin.settings.customBannerAlignmentField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerAlignmentField;
        this.currentAlignment = frontmatter?.[alignmentField] || 'center';

        // display field
        const displayField = Array.isArray(this.plugin.settings.customImageDisplayField) 
            ? this.plugin.settings.customImageDisplayField[0].split(',')[0].trim()
            : this.plugin.settings.customImageDisplayField;
        this.currentDisplay = frontmatter?.[displayField] || this.plugin.settings.imageDisplay;

        // x position field
        const xField = Array.isArray(this.plugin.settings.customXPositionField) 
            ? this.plugin.settings.customXPositionField[0].split(',')[0].trim()
            : this.plugin.settings.customXPositionField;
        this.currentX = getValueWithZeroCheck([
            frontmatter?.[xField],
            this.plugin.settings.xPosition
        ]);

        // y position field
        const yField = Array.isArray(this.plugin.settings.customYPositionField) 
            ? this.plugin.settings.customYPositionField[0].split(',')[0].trim()
            : this.plugin.settings.customYPositionField;
        this.currentY = getValueWithZeroCheck([
            frontmatter?.[yField],
            this.plugin.settings.yPosition
        ]);

        // height field
        const heightField = Array.isArray(this.plugin.settings.customBannerHeightField)
            ? this.plugin.settings.customBannerHeightField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerHeightField;
        this.currentHeight = frontmatter?.[heightField] || this.plugin.settings.bannerHeight;

        // max-width field
        const maxWidthField = Array.isArray(this.plugin.settings.customBannerMaxWidthField)
            ? this.plugin.settings.customBannerMaxWidthField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerMaxWidthField;
        
        // Check if there's a value in frontmatter for the max width field
        const maxWidthValue = frontmatter?.[maxWidthField];
        
        // Try a direct lookup too
        const directMaxWidth = frontmatter?.["banner-max-width"];
        
        // Fix isMaxWidthUnset to ensure it's false when a value exists
        // Checking for max-width in two different ways
        const maxWidthExists = (maxWidthValue !== undefined && maxWidthValue !== null) || 
                               (directMaxWidth !== undefined && directMaxWidth !== null);
        const isMaxWidthUnset = !maxWidthExists;
        
        // Get the current value, or use default if unset
        this.currentMaxWidth = isMaxWidthUnset ? 1928 : (parseInt(maxWidthValue || directMaxWidth) || 1928);

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

        // banner icon image alignment field
        const bannerIconImageAlignmentField = Array.isArray(this.plugin.settings.customBannerIconImageAlignmentField)
            ? this.plugin.settings.customBannerIconImageAlignmentField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconImageAlignmentField;

        // banner icon rotate field
        const bannerIconRotateField = Array.isArray(this.plugin.settings.customBannerIconRotateField)
            ? this.plugin.settings.customBannerIconRotateField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconRotateField;
        this.currentBannerIconRotate = getValueWithZeroCheck([
            frontmatter?.[bannerIconRotateField],
            0
        ]);
        
        const frontmatterValue = frontmatter?.[bannerIconImageAlignmentField];
        const defaultValue = this.plugin.settings.bannerIconImageAlignment;
        
        // Explicitly check for the "right" value to ensure proper initialization
        this.currentBannerIconImageAlignment = (frontmatterValue === 'right') ? 'right' : 'left';

        // Add repeat field initialization
        const repeatField = Array.isArray(this.plugin.settings.customImageRepeatField)
            ? this.plugin.settings.customImageRepeatField[0].split(',')[0].trim()
            : this.plugin.settings.customImageRepeatField;
        this.currentRepeat = frontmatter?.[repeatField] !== undefined ? frontmatter[repeatField] : this.plugin.settings.imageRepeat;

        // fade field
        const fadeField = Array.isArray(this.plugin.settings.customFadeField)
            ? this.plugin.settings.customFadeField[0].split(',')[0].trim()
            : this.plugin.settings.customFadeField;
        this.currentFade = frontmatter?.[fadeField] !== undefined ? frontmatter[fadeField] : this.plugin.settings.fade;

        // border radius field
        const borderRadiusField = Array.isArray(this.plugin.settings.customBorderRadiusField)
            ? this.plugin.settings.customBorderRadiusField[0].split(',')[0].trim()
            : this.plugin.settings.customBorderRadiusField;
        this.currentBorderRadius = frontmatter?.[borderRadiusField] !== undefined ? frontmatter[borderRadiusField] : (this.plugin.settings.borderRadius || 0);

        // Parse current display value for zoom percentage
        this.currentZoom = 100;
        if (this.currentDisplay && this.currentDisplay.endsWith('%')) {
            this.currentZoom = parseInt(this.currentDisplay) || 100;
            this.currentDisplay = 'cover-zoom';
        }
    }

    // Helper to update frontmatter with new display value
    updateDisplayMode(mode, zoom = null) {
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

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (fm) => {
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

    updateBannerMaxWidth(maxWidth) {
        const maxWidthField = Array.isArray(this.plugin.settings.customBannerMaxWidthField)
            ? this.plugin.settings.customBannerMaxWidthField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerMaxWidthField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            if (maxWidth === 'unset') {
                // Remove the max width field if it exists
                if (maxWidthField in frontmatter) {
                    delete frontmatter[maxWidthField];
                }
            } else {
                frontmatter[maxWidthField] = maxWidth;
            }
        });

        // Update the banner to ensure the note is re-rendered properly
        setTimeout(() => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                this.plugin.updateBanner(view, true);
            }
        }, 350);
    }

    updateBannerHeight(height) {
        const heightField = Array.isArray(this.plugin.settings.customBannerHeightField)
            ? this.plugin.settings.customBannerHeightField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerHeightField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[heightField] = height;
        });
    }

    updateBannerContentStartPosition(position) {
        const contentStartPositionField = Array.isArray(this.plugin.settings.customContentStartField)
            ? this.plugin.settings.customContentStartField[0].split(',')[0].trim()
            : this.plugin.settings.customContentStartField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[contentStartPositionField] = position;
        });
    }

    updateBannerIconXPosition(position) {
        const bannerIconXPositionField = Array.isArray(this.plugin.settings.customBannerIconXPositionField)
            ? this.plugin.settings.customBannerIconXPositionField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconXPositionField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[bannerIconXPositionField] = position;
        });
    }

    updateBannerIconSize(size) {
        const bannerIconSizeField = Array.isArray(this.plugin.settings.customBannerIconSizeField)
            ? this.plugin.settings.customBannerIconSizeField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconSizeField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[bannerIconSizeField] = size;
        });
    }

    updateBannerIconImageSizeMultiplier(sizeMultiplier) {
        const bannerIconImageSizeMultiplierField = Array.isArray(this.plugin.settings.customBannerIconImageSizeMultiplierField)
            ? this.plugin.settings.customBannerIconImageSizeMultiplierField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconImageSizeMultiplierField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[bannerIconImageSizeMultiplierField] = sizeMultiplier;
        });
    }

    updateBannerIconRotate(rotate) {
        const bannerIconRotateField = Array.isArray(this.plugin.settings.customBannerIconRotateField)
            ? this.plugin.settings.customBannerIconRotateField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconRotateField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[bannerIconRotateField] = rotate;
        });
    }

    updateBannerIconColor(color) {
        const bannerIconColorField = Array.isArray(this.plugin.settings.customBannerIconColorField)
            ? this.plugin.settings.customBannerIconColorField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconColorField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[bannerIconColorField] = color;
        });
    }

    updateBannerIconFontWeight(fontWeight) {
        const bannerIconFontWeightField = Array.isArray(this.plugin.settings.customBannerIconFontWeightField)
            ? this.plugin.settings.customBannerIconFontWeightField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconFontWeightField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[bannerIconFontWeightField] = fontWeight;
        });
    }

    updateBannerIconBgColor(color, alpha) {
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

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[bannerIconBgColorField] = finalColor;
        });
    }

    updateBannerIconPaddingX(paddingX) {
        const bannerIconPaddingXField = Array.isArray(this.plugin.settings.customBannerIconPaddingXField)
            ? this.plugin.settings.customBannerIconPaddingXField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconPaddingXField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[bannerIconPaddingXField] = paddingX;
        });
    }

    updateBannerIconPaddingY(paddingY) {
        const bannerIconPaddingYField = Array.isArray(this.plugin.settings.customBannerIconPaddingYField)
            ? this.plugin.settings.customBannerIconPaddingYField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconPaddingYField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[bannerIconPaddingYField] = paddingY;
        });
    }

    updateBannerIconBorderRadius(borderRadius) {
        const bannerIconBorderRadiusField = Array.isArray(this.plugin.settings.customBannerIconBorderRadiusField)
            ? this.plugin.settings.customBannerIconBorderRadiusField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconBorderRadiusField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[bannerIconBorderRadiusField] = borderRadius;
        });
    }

    updateBannerIconVerticalOffset(verticalOffset) {
        const bannerIconVerticalOffsetField = Array.isArray(this.plugin.settings.customBannerIconVeritalOffsetField)
            ? this.plugin.settings.customBannerIconVeritalOffsetField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconVeritalOffsetField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[bannerIconVerticalOffsetField] = verticalOffset;
        });
    }

    updateBannerIconTextVerticalOffset(textVerticalOffset) {
        const bannerIconTextVerticalOffsetField = Array.isArray(this.plugin.settings.customBannerIconTextVerticalOffsetField)
            ? this.plugin.settings.customBannerIconTextVerticalOffsetField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconTextVerticalOffsetField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[bannerIconTextVerticalOffsetField] = textVerticalOffset;
        });
    }

    updateBannerIconImageAlignment(alignment) {
        const bannerIconImageAlignmentField = Array.isArray(this.plugin.settings.customBannerIconImageAlignmentField)
            ? this.plugin.settings.customBannerIconImageAlignmentField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconImageAlignmentField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[bannerIconImageAlignmentField] = alignment;
        });

        // Update the banner to ensure the note is re-rendered properly
        setTimeout(() => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                this.plugin.updateBanner(view, true);
            }
        }, 350);
    }

    updateTitleColor(color) {
        const titleColorField = Array.isArray(this.plugin.settings.customTitleColorField)
            ? this.plugin.settings.customTitleColorField[0].split(',')[0].trim()
            : this.plugin.settings.customTitleColorField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[titleColorField] = color;
        });
    }

    updateRepeatMode(repeat) {
        const repeatField = Array.isArray(this.plugin.settings.customImageRepeatField)
            ? this.plugin.settings.customImageRepeatField[0].split(',')[0].trim()
            : this.plugin.settings.customImageRepeatField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (fm) => {
            fm[repeatField] = repeat;
        });
    }

    updateBannerAlignment(alignment) {
        const alignmentField = Array.isArray(this.plugin.settings.customBannerAlignmentField)
            ? this.plugin.settings.customBannerAlignmentField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerAlignmentField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (fm) => {
            fm[alignmentField] = alignment;
        });
    }

    updateBannerFade(fade) {
        const fadeField = Array.isArray(this.plugin.settings.customFadeField)
            ? this.plugin.settings.customFadeField[0].split(',')[0].trim()
            : this.plugin.settings.customFadeField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[fadeField] = fade;
        });
    }

    updateBannerBorderRadius(borderRadius) {
        const borderRadiusField = Array.isArray(this.plugin.settings.customBorderRadiusField)
            ? this.plugin.settings.customBorderRadiusField[0].split(',')[0].trim()
            : this.plugin.settings.customBorderRadiusField;

        this.app.fileManager.processFrontMatter(this.app.workspace.getActiveFile(), (frontmatter) => {
            frontmatter[borderRadiusField] = borderRadius;
        });
        
        // Update the banner to ensure the note is re-rendered properly
        setTimeout(() => {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                this.plugin.updateBanner(view, true);
            }
        }, 350);
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
        const { contentEl } = this;
        contentEl.empty();

        this.setupUI(contentEl);
    }

    async setupUI(contentEl) {
        const { modalEl, bgEl } = this;
        contentEl.empty();
        contentEl.addClass('target-position-modal');
        modalEl.style.opacity = "0.8";
        modalEl.style.width = "max-content";
        modalEl.style.height = "max-content";
        bgEl.style.opacity = "0";

        // Get current frontmatter
        const activeFile = this.app.workspace.getActiveFile();
        const frontmatter = activeFile ? this.app.metadataCache.getFileCache(activeFile)?.frontmatter || {} : {};

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
                    margin-top: 15px;
                    margin-bottom: 10px;
                `
            }
        });

        // banner image header buttons container
        const bannerImageHeaderButtons = bannerImageHeader.createEl('div', {
            cls: 'banner-image-header-buttons',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    flex-wrap: wrap;
                    gap: 5px;
                `
            }
        });

        // add Change Image button to bannerImageHeader
        const bannerImageHeaderChangeButton = bannerImageHeaderButtons.createEl('button', {
            text: '✏️ Change Banner',
            cls: 'banner-image-header-button cursor-pointer',
            attr: {
                style: `
                    text-transform: uppercase;
                    font-size: .8em;
                `
            }
        });
        // on click of back to main menu button, close this modal and open the Pixel Banner Menu modal
        bannerImageHeaderChangeButton.addEventListener('click', () => {
            this.close();
            new SelectPixelBannerModal(this.app, this.plugin).open();
        });

        // add Remove Image button to bannerImageHeader
        const bannerImageHeaderRemoveButton = bannerImageHeaderButtons.createEl('button', {
            text: '🗑️ Remove Banner',
            cls: 'banner-image-header-button cursor-pointer',
            attr: {
                style: `
                    text-transform: uppercase;
                    font-size: .8em;
                `
            }
        });
        // on click of remove banner button, remove the banner from the frontmatter
        bannerImageHeaderRemoveButton.addEventListener('click', () => {
            this.resetPixelBannerNoteSettings(true);
        });

        // Create main container with flex layout
        const mainContainer = contentEl.createDiv({
            cls: 'main-container--banner-image',
            attr: {
                style: `
                    position: relative;
                    display: flex;
                    flex-direction: row;
                    gap: 20px;
                    align-items: stretch;
                    justify-content: space-between;
                `
            }
        });

        // Check if current banner is a video file
        let isVideoFile = false;
        const bannerField = Array.isArray(this.plugin.settings.customBannerField)
            ? this.plugin.settings.customBannerField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerField;
        const bannerValue = frontmatter?.[bannerField];
        
        if (bannerValue) {
            // Check if it's a direct path to mp4/mov file
            if (typeof bannerValue === 'string') {
                const lowerBanner = bannerValue.toLowerCase();
                isVideoFile = lowerBanner.endsWith('.mp4') || lowerBanner.endsWith('.mov');
            }
            // If it's an obsidian link like ![[video.mp4]] or [[video.mov]]
            if (!isVideoFile && (bannerValue.includes('[[') || bannerValue.includes('![[') )) {
                const linkMatch = bannerValue.match(/\[\[(.*?)\]\]/) || bannerValue.match(/!\[\[(.*?)\]\]/);
                if (linkMatch && linkMatch[1]) {
                    const linkPath = linkMatch[1].toLowerCase();
                    isVideoFile = linkPath.endsWith('.mp4') || linkPath.endsWith('.mov');
                }
            }
        }
        
        // Create left panel for controls - hide for video files
        const controlPanel = mainContainer.createDiv({
            cls: 'control-panel',
            id: 'display-mode-panel',
            attr: {
                style: `
                    display: ${isVideoFile ? 'none' : 'flex'};
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

        // Max Width control container
        const maxWidthContainer = mainContainer.createDiv({
            cls: 'max-width-container',
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

        // Max Width label
        const maxWidthLabel = maxWidthContainer.createEl('div', { 
            text: 'Max Width',
            cls: 'max-width-label',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        // Get current max width from frontmatter or set to default
        const maxWidthField = Array.isArray(this.plugin.settings.customBannerMaxWidthField)
            ? this.plugin.settings.customBannerMaxWidthField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerMaxWidthField;
        
        // Check if there's a value in frontmatter for the max width field
        const maxWidthValue = frontmatter?.[maxWidthField];
        
        // Try a direct lookup too
        const directMaxWidth = frontmatter?.["banner-max-width"];
        
        // Fix isMaxWidthUnset to ensure it's false when a value exists
        // Checking for max-width in two different ways
        const maxWidthExists = (maxWidthValue !== undefined && maxWidthValue !== null) || 
                               (directMaxWidth !== undefined && directMaxWidth !== null);
        const isMaxWidthUnset = !maxWidthExists;
        
        // Get the current value, or use default if unset
        this.currentMaxWidth = isMaxWidthUnset ? 1928 : (parseInt(maxWidthValue || directMaxWidth) || 1928);

        // Unset checkbox container
        const unsetContainer = maxWidthContainer.createDiv({
            cls: 'unset-container',
            attr: {
                style: `
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    margin-bottom: 5px;
                `
            }
        });

        // Unset checkbox
        const unsetCheckbox = unsetContainer.createEl('input', {
            type: 'checkbox',
            cls: 'unset-checkbox',
        });
        
        // IMPORTANT - Set the checked state directly and correctly
        const shouldBeChecked = isMaxWidthUnset;
        unsetCheckbox.checked = shouldBeChecked;
        
        unsetContainer.createEl('span', {
            text: 'unset'
        });

        // Max Width value display
        const maxWidthValueDisplay = maxWidthContainer.createDiv({
            cls: 'max-width-value',
            attr: {
                style: `
                    font-family: var(--font-monospace);
                    font-size: 0.9em;
                    ${isMaxWidthUnset ? 'color: var(--text-muted);' : ''}
                `
            }
        });
        maxWidthValueDisplay.setText(isMaxWidthUnset ? 'unset' : `${this.currentMaxWidth}px`);

        // Max Width slider
        const maxWidthSlider = maxWidthContainer.createEl('input', {
            type: 'range',
            cls: 'max-width-slider',
            attr: {
                min: '100',
                max: '2560',
                step: '10',
                value: this.currentMaxWidth,
                disabled: isMaxWidthUnset,
                draggable: false,
                style: `
                    width: 15px;
                    height: 30px;
                    flex: 1;
                    writing-mode: vertical-lr;
                    direction: rtl;
                    ${isMaxWidthUnset ? 'opacity: 0.5;' : ''}
                `
            }
        });
        
        // Ensure the slider is enabled if max-width is set
        if (!isMaxWidthUnset) {
            maxWidthSlider.disabled = false;
            maxWidthSlider.style.opacity = '1';
        }

        // Toggle max width unset/set
        unsetCheckbox.addEventListener('change', () => {
            const isUnset = unsetCheckbox.checked;
            maxWidthSlider.disabled = isUnset;
            maxWidthSlider.style.opacity = isUnset ? '0.5' : '1';
            maxWidthValueDisplay.style.color = isUnset ? 'var(--text-muted)' : '';
            maxWidthValueDisplay.setText(isUnset ? 'unset' : `${this.currentMaxWidth}px`);
            
            if (isUnset) {
                this.updateBannerMaxWidth('unset');
            } else {
                this.updateBannerMaxWidth(this.currentMaxWidth);
            }
        });

        // Update max width on slider input
        maxWidthSlider.addEventListener('input', () => {
            this.currentMaxWidth = parseInt(maxWidthSlider.value);
            maxWidthValueDisplay.setText(`${this.currentMaxWidth}px`);
            this.updateBannerMaxWidth(this.currentMaxWidth);
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
        const verticalLine = targetArea.createDiv({ cls: 'crosshair-line vertical' });
        const horizontalLine = targetArea.createDiv({ cls: 'crosshair-line horizontal' });

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


        const bannerSettingsRow2 = contentEl.createDiv({
            attr: {
                style: `
                display: flex;
                flex-direction: row;
                flex-wrap: wrap;
                gap: 10px;
                align-items: center;
                flex: 0 auto;
                margin-top: 10px;
                `
            }
        });
        
        // Banner alignment select
        // Alignment label
        bannerSettingsRow2.createEl('div', {
            text: 'Banner Alignment',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        // Alignment select
        const alignmentSelect = bannerSettingsRow2.createEl('select', { cls: 'alignment-select' });
        [
            { value: 'left', text: 'Left' },
            { value: 'center', text: 'Center' },
            { value: 'right', text: 'Right' }
        ].forEach(option => {
            const optionEl = alignmentSelect.createEl('option', {
                text: option.text,
                value: option.value
            });
            if (option.value === this.currentAlignment) {
                optionEl.selected = true;
            }
        });

        // Event handler for alignment select
        alignmentSelect.addEventListener('change', () => {
            this.currentAlignment = alignmentSelect.value;
            this.updateBannerAlignment(this.currentAlignment);
        });

        // Add banner fade slider
        const bannerFadeContainer = bannerSettingsRow2.createDiv({
            cls: 'setting-item',
            attr: {
                style: `
                    flex: 1;
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                `
            }
        });
        const bannerFadeHeader = bannerFadeContainer.createDiv({
            text: 'Banner Fade',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        const bannerFadeSliderContainer = bannerFadeContainer.createDiv({
            attr: {
                style: `
                    flex: 1;
                    display: flex;
                    gap: 10px;
                    align-items: center;
                `
            }
        });

        const bannerFadeSlider = bannerFadeSliderContainer.createEl('input', {
            type: 'range',
            cls: 'slider',
            attr: {
                min: '-300',
                max: '100',
                step: '5',
                value: this.currentFade,
                style: `
                    flex: 1;
                `
            }
        });

        const bannerFadeValue = bannerFadeSliderContainer.createDiv({
            text: this.currentFade,
            attr: {
                style: `
                    color: var(--text-muted);
                    font-size: 0.9em;
                    min-width: 45px;
                    text-align: right;
                `
            }
        });

        bannerFadeSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.updateBannerFade(value);
            bannerFadeValue.setText(value.toString());
        });

        // border radius slider
        const borderRadiusContainer = bannerSettingsRow2.createDiv({
            cls: 'setting-item',
            attr: {
                style: `
                    flex: 1;
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                `
            }
        });
        const borderRadiusHeader = borderRadiusContainer.createDiv({
            text: 'Border Radius',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        const borderRadiusSliderContainer = borderRadiusContainer.createDiv({
            attr: {
                style: `
                    flex: 1;
                    display: flex;
                    gap: 10px;
                    align-items: center;
                `
            }
        });

        const borderRadiusSlider = borderRadiusSliderContainer.createEl('input', {
            type: 'range',
            cls: 'slider',
            attr: {
                min: '0',
                max: '50',
                step: '1',
                value: this.currentBorderRadius,
                style: `
                    flex: 1;
                `
            }
        });

        const borderRadiusValue = borderRadiusSliderContainer.createDiv({
            text: this.currentBorderRadius.toString(),
            attr: {
                style: `
                    color: var(--text-muted);
                    font-size: 0.9em;
                    min-width: 45px;
                    text-align: right;
                `
            }
        });

        borderRadiusSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.updateBannerBorderRadius(value);
            borderRadiusValue.setText(`${value}`);
        });


        // -----------------------
        // -- banner icon stuff --
        // -----------------------

        // Function to open emoji picker
        const openEmojiPicker = () => {
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
        };

        // Function to open image picker
        const openIconImagePicker = () => {
            const defaultIconImageFolder = this.plugin.settings.defaultSelectIconPath || ''
            this.close();
            new IconImageSelectionModal(
                this.app, 
                this.plugin,
                async (file) => {
                    if (!file) return;
                    
                    // Get active file
                    const activeFile = this.app.workspace.getActiveFile();
                    if (!activeFile) return;
                    
                    // Check if this is a web URL or local file
                    if (file.isWebUrl) {
                        // For web URLs, use the URL directly
                        this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                            // Get the correct field name
                            const iconImageField = Array.isArray(this.plugin.settings.customBannerIconImageField) 
                                ? this.plugin.settings.customBannerIconImageField[0].split(',')[0].trim()
                                : this.plugin.settings.customBannerIconImageField;
                            
                            // Set the frontmatter value as direct URL
                            fm[iconImageField] = file.path;
                        });
                        
                        // Reopen this modal
                        new TargetPositionModal(this.app, this.plugin).open();
                        return;
                    }
                    
                    // For local files, preload the image into the cache
                    // Handle both file objects and string paths
                    let fileExtension = '';
                    let filePath = '';
                    
                    if (typeof file === 'string') {
                        // If file is a string path, extract extension manually
                        filePath = file;
                        const extensionPart = file.split('.').pop();
                        fileExtension = extensionPart ? extensionPart.toLowerCase() : '';
                    } else if (file && file.extension) {
                        // If file is an object with extension property
                        filePath = file.path;
                        fileExtension = file.extension.toLowerCase();
                    }
                    
                    if (fileExtension && fileExtension.match(/^(jpg|jpeg|png|gif|bmp|svg|webp|avif)$/)) {
                        try {
                            // Get the vault URL for the image and load it into the cache
                            const imageUrl = await this.plugin.getVaultImageUrl(filePath);
                            if (imageUrl) {
                                this.plugin.loadedImages.set(filePath, imageUrl);
                                
                                // Force a preload of the image to ensure it's in browser cache
                                const preloadImg = new Image();
                                preloadImg.src = imageUrl;
                            }
                        } catch (error) {
                            console.error("Error preloading icon image:", error);
                        }
                    }
                    
                    // Update frontmatter with the image path
                    this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                        // Get the correct field name
                        const iconImageField = Array.isArray(this.plugin.settings.customBannerIconImageField) 
                            ? this.plugin.settings.customBannerIconImageField[0].split(',')[0].trim()
                            : this.plugin.settings.customBannerIconImageField;
                        
                        // Set the frontmatter value with proper Obsidian image link syntax
                        fm[iconImageField] = `![[${filePath}]]`;
                    });
                    
                    // Reopen this modal
                    new TargetPositionModal(this.app, this.plugin).open();
                },
                defaultIconImageFolder
            ).open();
        };

        // Check if note has banner icon
        const bannerIconField = Array.isArray(this.plugin.settings.customBannerIconField)
            ? this.plugin.settings.customBannerIconField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconField;
        
        const bannerIconImageField = Array.isArray(this.plugin.settings.customBannerIconImageField)
            ? this.plugin.settings.customBannerIconImageField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconImageField;
        
        // check for banner icon or banner icon image in frontmatter
        let hasBannerIcon = frontmatter && (
            (frontmatter[bannerIconField] && frontmatter[bannerIconField].trim() !== '') ||
            (frontmatter[bannerIconImageField] && frontmatter[bannerIconImageField].trim() !== '')
        );

        // Banner Icon Image check
        const hasBannerIconImage = frontmatter && 
            frontmatter[bannerIconImageField] && 
            frontmatter[bannerIconImageField].trim() !== '';

        if (!hasBannerIcon) {
            // no banner icon found, try one more time after a short delay
            await new Promise(resolve => {
                setTimeout(async () => {
                    const refreshedFrontmatter = this.app.metadataCache.getFileCache(activeFile)?.frontmatter;
                    if (refreshedFrontmatter && (
                        (refreshedFrontmatter[bannerIconField] && refreshedFrontmatter[bannerIconField].trim() !== '') ||
                        (refreshedFrontmatter[bannerIconImageField] && refreshedFrontmatter[bannerIconImageField].trim() !== '')
                    )) {
                        hasBannerIcon = true;
                    }
                    resolve();
                }, 400);
            });
        }

        // banner icon controls container
        const addBannerIconContainer = contentEl.createDiv({
            cls: 'main-container--banner-icon',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    margin-top: 30px;
                    margin-bottom: 10px;
                    justify-content: space-between;
                    align-items: center;
                `
            }
        });

        // Banner Icon header
        const bannerIconHeader = addBannerIconContainer.createEl('div', {
            text: hasBannerIcon ? '⭐ Banner Icon Settings' : '',
            cls: 'banner-icon-header',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                    color: var(--text-accent);
                    font-size: 0.9em;
                    font-weight: 600;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                `
            }
        });

        const bannerIconHeaderButtons = addBannerIconContainer.createDiv({
            cls: 'banner-icon-header-buttons',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    justify-content: flex-end;
                `
            }
        });

        // add button to bannerIconHeader
        const bannerIconHeaderButtonIcon = bannerIconHeaderButtons.createEl('button', {
            text: hasBannerIconImage ? '✏️ Edit Icon Image' : '⭐ Add Icon Image',
            cls: 'banner-icon-header-button cursor-pointer',
            attr: {
                style: `
                    text-transform: uppercase;
                    font-size: .8em;
                `
            }
        });
        bannerIconHeaderButtonIcon.addEventListener('click', openIconImagePicker);

        // Banner Icon Text / Emoji check
        const hasBannerIconText = frontmatter && 
            frontmatter[bannerIconField] && 
            frontmatter[bannerIconField].trim() !== '';
            
        // add button to bannerIconHeader
        const bannerIconHeaderButtonText = bannerIconHeaderButtons.createEl('button', {
            text: hasBannerIconText ? '📝 Edit Icon Text & Emoji' : '📰 Add Icon Text & Emoji',
            cls: 'banner-icon-header-button cursor-pointer',
            attr: {
                style: `
                    text-transform: uppercase;
                    font-size: .8em;
                `
            }
        });
        bannerIconHeaderButtonText.addEventListener('click', openEmojiPicker);

        // banner icon controls container
        const bannerIconControlsContainer = contentEl.createDiv({
            cls: 'main-container--banner-icon',
            attr: {
                style: `
                    margin-top: 20px;
                    display: ${hasBannerIcon ? 'block' : 'none'};
                `
            }
        });

        // Banner Icon Image Alignment radio control container
        const bannerIconImageAlignmentContainer = bannerIconControlsContainer.createDiv({
            cls: 'banner-icon-image-alignment-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    min-width: 60px;
                    flex: 0 auto;
                    margin-bottom: 15px;
                `
            }
        });

        // Banner Icon Image Alignment label
        const bannerIconImageAlignmentLabel = bannerIconImageAlignmentContainer.createEl('div', { 
            text: 'Icon Image Alignment',
            cls: 'banner-icon-image-alignment-label',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                    min-width: 120px;
                `
            }
        });

        // Create radio options container
        const bannerIconImageAlignmentRadioContainer = bannerIconImageAlignmentContainer.createDiv({
            cls: 'banner-icon-image-alignment-radio-container',
            attr: {
                style: `
                    display: flex;
                    flex-direction: row;
                    gap: 20px;
                    align-items: center;
                `
            }
        });

        // Create left radio option
        const leftRadioContainer = bannerIconImageAlignmentRadioContainer.createDiv({
            cls: 'radio-container',
            attr: {
                style: `
                    display: flex;
                    align-items: center;
                    gap: 5px;
                `
            }
        });

        // Determine which option should be checked
        const isRightAlignment = this.currentBannerIconImageAlignment === 'right';
        const isLeftAlignment = !isRightAlignment;

        const leftRadio = leftRadioContainer.createEl('input', {
            type: 'radio',
            attr: {
                id: 'icon-placement-left',
                name: 'icon-image-placement',
                value: 'left',
                style: `cursor: pointer;`
            }
        });

        leftRadioContainer.createEl('label', {
            text: 'Left',
            attr: {
                for: 'icon-placement-left',
                style: `
                    cursor: pointer;
                    font-size: 0.9em;
                `
            }
        });

        // Create right radio option
        const rightRadioContainer = bannerIconImageAlignmentRadioContainer.createDiv({
            cls: 'radio-container',
            attr: {
                style: `
                    display: flex;
                    align-items: center;
                    gap: 5px;
                `
            }
        });

        const rightRadio = rightRadioContainer.createEl('input', {
            type: 'radio',
            attr: {
                id: 'icon-placement-right',
                name: 'icon-image-placement',
                value: 'right',
                style: `cursor: pointer;`
            }
        });

        rightRadioContainer.createEl('label', {
            text: 'Right',
            attr: {
                for: 'icon-placement-right',
                style: `
                    cursor: pointer;
                    font-size: 0.9em;
                `
            }
        });

        // Set the checked property directly
        setTimeout(() => {
            leftRadio.checked = isLeftAlignment;
            rightRadio.checked = isRightAlignment;
        }, 50);

        // Add event listeners to radio buttons
        leftRadio.addEventListener('change', () => {
            if (leftRadio.checked) {
                this.currentBannerIconImageAlignment = 'left';
                this.updateBannerIconImageAlignment(this.currentBannerIconImageAlignment);
            }
        });

        rightRadio.addEventListener('change', () => {
            if (rightRadio.checked) {
                this.currentBannerIconImageAlignment = 'right';
                this.updateBannerIconImageAlignment(this.currentBannerIconImageAlignment);
            }
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
                max: '100',
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
            text: 'Icon Y Position',
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
            text: 'Icon Size',
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

        // Banner Icon Image Size Multiplier control container
        const bannerIconImageSizeMultiplierContainer = bannerIconControlsContainer.createDiv({
            cls: 'banner-icon-image-size-multiplier-container',
            attr: {
                style: `
                    display: ${hasBannerIconImage ? 'flex' : 'none'};
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    min-width: 60px;
                    flex: 0 auto;
                    margin-top: 10px;
                `
            }
        });

        // Banner Icon Image Size Multiplier label
        const bannerIconImageSizeMultiplierLabel = bannerIconImageSizeMultiplierContainer.createEl('div', { 
            text: 'Icon Image Size Multiplier',
            cls: 'banner-icon-image-size-multiplier-label',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        // Get current banner icon image size multiplier
        const iconImageSizeMultiplierField = Array.isArray(this.plugin.settings.customBannerIconImageSizeMultiplierField)
            ? this.plugin.settings.customBannerIconImageSizeMultiplierField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconImageSizeMultiplierField;
        this.currentBannerIconImageSizeMultiplier = frontmatter?.[iconImageSizeMultiplierField] || 1;

        // Banner Icon Image Size Multiplier slider
        const bannerIconImageSizeMultiplierSlider = bannerIconImageSizeMultiplierContainer.createEl('input', {
            type: 'range',
            cls: 'banner-icon-image-size-multiplier-slider',
            attr: {
                min: '.2',
                max: '3',
                step: '0.1',
                value: this.currentBannerIconImageSizeMultiplier,
                style: `
                    flex: 1;
                    writing-mode: horizontal-tb;
                    direction: ltr;
                `
            }
        });

        // Banner Icon Image Size Multiplier value display
        const bannerIconImageSizeMultiplierValue = bannerIconImageSizeMultiplierContainer.createDiv({
            cls: 'banner-icon-image-size-multiplier-value',
            attr: {
                style: `
                    font-family: var(--font-monospace);
                    font-size: 0.9em;
                `
            }
        });
        bannerIconImageSizeMultiplierValue.setText(`${this.currentBannerIconImageSizeMultiplier}`);

        // Banner Icon Image Size Multiplier slider event listener
        bannerIconImageSizeMultiplierSlider.addEventListener('input', () => {
            this.currentBannerIconImageSizeMultiplier = parseFloat(bannerIconImageSizeMultiplierSlider.value);
            bannerIconImageSizeMultiplierValue.setText(`${this.currentBannerIconImageSizeMultiplier}`);
            this.updateBannerIconImageSizeMultiplier(this.currentBannerIconImageSizeMultiplier);
        });

        // Banner Icon Text Vertical Offset control container
        const bannerIconTextVerticalOffsetContainer = bannerIconControlsContainer.createDiv({
            cls: 'banner-icon-text-vertical-offset-container',
            attr: {
                style: `
                    display: ${hasBannerIconText ? 'flex' : 'none'};
                    flex-direction: row;
                    gap: 10px;
                    align-items: center;
                    min-width: 60px;
                    flex: 0 auto;
                    margin-top: 10px;
                `
            }
        });

        // Banner Icon Text Vertical Offset label
        const bannerIconTextVerticalOffsetLabel = bannerIconTextVerticalOffsetContainer.createEl('div', { 
            text: 'Icon Text Vertical Offset',
            cls: 'banner-icon-text-vertical-offset-label',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        // Get current banner icon text vertical offset
        const iconTextVerticalOffsetField = Array.isArray(this.plugin.settings.customBannerIconTextVerticalOffsetField)
            ? this.plugin.settings.customBannerIconTextVerticalOffsetField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconTextVerticalOffsetField;
        this.currentBannerIconTextVerticalOffset = frontmatter?.[iconTextVerticalOffsetField] || this.plugin.settings.bannerIconTextVerticalOffset || 0;

        // Banner Icon Text Vertical Offset slider
        const bannerIconTextVerticalOffsetSlider = bannerIconTextVerticalOffsetContainer.createEl('input', {
            type: 'range',
            cls: 'banner-icon-text-vertical-offset-slider',
            attr: {
                min: '-50',
                max: '50',
                step: '1',
                value: this.currentBannerIconTextVerticalOffset,
                style: `
                    flex: 1;
                    writing-mode: horizontal-tb;
                    direction: ltr;
                `
            }
        });

        // Banner Icon Text Vertical Offset value display
        const bannerIconTextVerticalOffsetValue = bannerIconTextVerticalOffsetContainer.createDiv({
            cls: 'banner-icon-text-vertical-offset-value',
            attr: {
                style: `
                    font-family: var(--font-monospace);
                    font-size: 0.9em;
                `
            }
        });
        bannerIconTextVerticalOffsetValue.setText(`${this.currentBannerIconTextVerticalOffset}`);

        // Banner Icon Text Vertical Offset slider event listener
        bannerIconTextVerticalOffsetSlider.addEventListener('input', () => {
            this.currentBannerIconTextVerticalOffset = parseInt(bannerIconTextVerticalOffsetSlider.value);
            bannerIconTextVerticalOffsetValue.setText(`${this.currentBannerIconTextVerticalOffset}`);
            this.updateBannerIconTextVerticalOffset(this.currentBannerIconTextVerticalOffset);
        });

        // Banner Icon Rotate control container
        const bannerIconRotateContainer = bannerIconControlsContainer.createDiv({
            cls: 'banner-icon-rotate-container',
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

        // Banner Icon Rotate label
        const bannerIconRotateLabel = bannerIconRotateContainer.createEl('div', { 
            text: 'Icon Rotation',
            cls: 'banner-icon-rotate-label',
            attr: {
                style: `
                    color: var(--text-muted); 
                    font-size: 0.9em;
                `
            }
        });

        // Get current banner icon rotate
        const iconRotateField = Array.isArray(this.plugin.settings.customBannerIconRotateField)
            ? this.plugin.settings.customBannerIconRotateField[0].split(',')[0].trim()
            : this.plugin.settings.customBannerIconRotateField;
        this.currentBannerIconRotate = frontmatter?.[iconRotateField] || 0;

        // Banner Icon Rotate slider
        const bannerIconRotateSlider = bannerIconRotateContainer.createEl('input', {
            type: 'range',
            cls: 'banner-icon-rotate-slider',
            attr: {
                min: '0',
                max: '360',
                step: '5',
                value: this.currentBannerIconRotate,
                style: `
                    flex: 1;
                    writing-mode: horizontal-tb;
                    direction: ltr;
                `
            }
        });

        // Banner Icon Rotate value display
        const bannerIconRotateValue = bannerIconRotateContainer.createDiv({
            cls: 'banner-icon-rotate-value',
            attr: {
                style: `
                    font-family: var(--font-monospace);
                    font-size: 0.9em;
                `
            }
        });
        bannerIconRotateValue.setText(`${this.currentBannerIconRotate}`);

        // Banner Icon Rotate slider event listener
        bannerIconRotateSlider.addEventListener('input', () => {
            this.currentBannerIconRotate = parseInt(bannerIconRotateSlider.value);
            bannerIconRotateValue.setText(`${this.currentBannerIconRotate}`);
            this.updateBannerIconRotate(this.currentBannerIconRotate);
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
            text: 'Icon Text Color',
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
        
        // Parse the current color value
        let currentIconColor = this.plugin.settings.bannerIconColor;
        
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

        // Make sure we have a valid hex color for the color picker
        const ensureValidHexColor = (color) => {
            // If no color or invalid format, return default black
            if (!color || !/^#[0-9A-F]{6}$/i.test(color)) {
                return '#000000';
            }
            return color;
        };

        // Banner Icon Color picker
        const bannerIconColorPicker = bannerIconColorContainer.createEl('input', {
            type: 'color',
            cls: 'banner-icon-color-picker',
            attr: {
                value: ensureValidHexColor(this.currentBannerIconColor),
                style: `
                    width: 30px;
                    height: 30px;
                    cursor: pointer;
                    padding: 0;
                    background-color: transparent;
                    margin-left: 5px;
                    border: 1px solid;
                    border-radius: 50%;
                `
            }
        });

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
            text: 'Icon Text Font Weight',
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
            text: 'Icon Background Color',
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
        let currentColor = this.plugin.settings.bannerIconBackgroundColor;
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
                    this.currentBannerIconBgColor : '',
                style: `
                    width: 30px;
                    height: 30px;
                    cursor: pointer;
                    padding: 0;
                    background-color: transparent;
                    margin-left: 5px;
                    border: 1px solid;
                    border-radius: 50%;
                `
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
            text: 'Icon Padding X',
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
            text: 'Icon Padding Y',
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
            text: 'Icon Border Radius',
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
        this.currentBannerIconBorderRadius = getValueWithZeroCheck([
            frontmatter?.[iconBorderRadiusField],
            this.plugin.settings.bannerIconBorderRadius,
        ]);

        // Banner Icon Border Radius slider
        const bannerIconBorderRadiusSlider = bannerIconBorderRadiusContainer.createEl('input', {
            type: 'range',
            cls: 'banner-icon-border-radius-slider',
            attr: {
                min: '0',
                max: '200',
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
                    max-width: 600px;
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
                    max-width: 440px;
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
                    min-width: 90px;
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
                    max-width: 90px;
                `
            }
        });

        // Title color picker
        const titleColorPicker = titleColorSection.createEl('input', {
            type: 'color',
            cls: 'title-color-picker',
            attr: {
                value: this.currentTitleColor && this.currentTitleColor.startsWith('#') ? 
                    this.currentTitleColor : (getCurrentTheme() === 'dark' ? '#ffffff' : '#000000'),
                style: `
                    width: 30px;
                    height: 30px;
                    cursor: pointer;
                    padding: 0;
                    background-color: transparent;
                    margin-left: 5px;
                `
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

        // Define reset function to be used by both buttons
        this.resetPixelBannerNoteSettings = (deleteBannerAndIcon = false) => {
            // Reset UI elements
            displaySelect.value = 'cover';
            zoomContainer.style.display = 'none';
            repeatContainer.style.display = 'none';
            
            // Reset slider values for visual feedback
            zoomSlider.value = 100;
            heightSlider.value = this.plugin.settings.bannerHeight;
            contentStartPositionSlider.value = this.plugin.settings.contentStartPosition;
            bannerIconXPositionSlider.value = this.plugin.settings.bannerIconXPosition;
            bannerFadeSlider.value = this.plugin.settings.fade;
            bannerFadeValue.setText(this.plugin.settings.fade.toString());
            
            const currentTheme = getCurrentTheme();
            let defaultColor = currentTheme === 'dark' ? '#ffffff' : '#000000';

            // Reset new banner icon controls
            if (bannerIconSizeSlider) bannerIconSizeSlider.value = this.plugin.settings.bannerIconSize;
            if (bannerIconImageSizeMultiplierSlider) bannerIconImageSizeMultiplierSlider.value = this.plugin.settings.bannerIconImageSizeMultiplier;
            if (bannerIconRotateSlider) bannerIconRotateSlider.value = 0;
            if (bannerIconTextVerticalOffsetSlider) bannerIconTextVerticalOffsetSlider.value = this.plugin.settings.bannerIconTextVerticalOffset;
            
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
                    const rgbaMatch = colorValue?.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
                    if (rgbaMatch) {
                        // Convert RGB to hex
                        const r = parseInt(rgbaMatch[1]);
                        const g = parseInt(rgbaMatch[2]);
                        const b = parseInt(rgbaMatch[3]);
                        defaultColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                        defaultAlpha = Math.round(parseFloat(rgbaMatch[4]) * 100);
                    } 
                    // Check if it's a hex color
                    else if (colorValue?.startsWith('#')) {
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
            if (bannerIconSizeSlider) bannerIconSizeSlider.value = this.plugin.settings.bannerIconSize;
            if (bannerIconRotateSlider) bannerIconRotateSlider.value = 0;
            
            // Reset value displays
            zoomValue.setText('100%');
            heightValue.setText(`${this.plugin.settings.bannerHeight}px`);
            contentStartPositionValue.setText(`${this.plugin.settings.contentStartPosition}px`);
            bannerIconXPositionValue.setText(`${this.plugin.settings.bannerIconXPosition}`);
            
            // Reset max-width checkbox to checked (default is unset)
            if (unsetCheckbox) {
                unsetCheckbox.checked = true;
                maxWidthValueDisplay.style.color = 'var(--text-muted)';
                maxWidthValueDisplay.setText('unset');
            }
            
            // Reset alignment to default (center)
            if (alignmentSelect) {
                alignmentSelect.value = 'center';
            }
            
            // Reset banner icon value displays
            if (bannerIconSizeValue) bannerIconSizeValue.setText(`${this.plugin.settings.bannerIconSize}`);
            if (bannerIconImageSizeMultiplierValue) bannerIconImageSizeMultiplierValue.setText(`${this.plugin.settings.bannerIconImageSizeMultiplier}`);
            if (bannerIconTextVerticalOffsetValue) bannerIconTextVerticalOffsetValue.setText(`${this.plugin.settings.bannerIconTextVerticalOffset}`);
            if (bannerIconPaddingXValue) bannerIconPaddingXValue.setText(`${this.plugin.settings.bannerIconPaddingX}`);
            if (bannerIconPaddingYValue) bannerIconPaddingYValue.setText(`${this.plugin.settings.bannerIconPaddingY}`);
            if (bannerIconBorderRadiusValue) bannerIconBorderRadiusValue.setText(`${this.plugin.settings.bannerIconBorderRadius}`);
            if (bannerIconVerticalOffsetValue) bannerIconVerticalOffsetValue.setText(`${this.plugin.settings.bannerIconVeritalOffset}`);
            if (bannerIconRotateValue) bannerIconRotateValue.setText(`${this.plugin.settings.bannerIconRotate}`);
            
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
                    
                const maxWidthField = Array.isArray(this.plugin.settings.customBannerMaxWidthField)
                    ? this.plugin.settings.customBannerMaxWidthField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerMaxWidthField;
                    
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

                const bannerIconImageAlignmentField = Array.isArray(this.plugin.settings.customBannerIconImageAlignmentField)
                    ? this.plugin.settings.customBannerIconImageAlignmentField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerIconImageAlignmentField;

                const repeatField = Array.isArray(this.plugin.settings.customImageRepeatField)
                    ? this.plugin.settings.customImageRepeatField[0].split(',')[0].trim()
                    : this.plugin.settings.customImageRepeatField;

                const fadeField = Array.isArray(this.plugin.settings.customFadeField)
                    ? this.plugin.settings.customFadeField[0].split(',')[0].trim()
                    : this.plugin.settings.customFadeField;
                    
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

                const bannerIconSizeField = Array.isArray(this.plugin.settings.customBannerIconSizeField)
                    ? this.plugin.settings.customBannerIconSizeField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerIconSizeField;

                const bannerIconTextVerticalOffsetField = Array.isArray(this.plugin.settings.customBannerIconTextVerticalOffsetField)
                    ? this.plugin.settings.customBannerIconTextVerticalOffsetField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerIconTextVerticalOffsetField;

                const bannerIconImageSizeMultiplierField = Array.isArray(this.plugin.settings.customBannerIconImageSizeMultiplierField)
                    ? this.plugin.settings.customBannerIconImageSizeMultiplierField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerIconImageSizeMultiplierField;

                const bannerIconRotateField = Array.isArray(this.plugin.settings.customBannerIconRotateField)
                    ? this.plugin.settings.customBannerIconRotateField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerIconRotateField;

                // Remove benner image fields
                delete frontmatter[displayField];
                delete frontmatter[heightField];
                delete frontmatter[maxWidthField];
                delete frontmatter[xField];
                delete frontmatter[yField];
                delete frontmatter[contentStartPositionField];
                delete frontmatter[repeatField];
                delete frontmatter[fadeField];
                
                // Remove banner icon fields
                delete frontmatter[bannerIconXPositionField];
                delete frontmatter[bannerIconImageAlignmentField];
                delete frontmatter[bannerIconColorField];
                delete frontmatter[bannerIconFontWeightField];
                delete frontmatter[bannerIconBgColorField];
                delete frontmatter[bannerIconPaddingXField];
                delete frontmatter[bannerIconPaddingYField];
                delete frontmatter[bannerIconBorderRadiusField];
                delete frontmatter[bannerIconVerticalOffsetField];
                delete frontmatter[bannerIconSizeField];
                delete frontmatter[bannerIconTextVerticalOffsetField];
                delete frontmatter[bannerIconImageSizeMultiplierField];
                delete frontmatter[bannerIconRotateField];
                
                // Remove alignment field
                const alignmentField = Array.isArray(this.plugin.settings.customBannerAlignmentField)
                    ? this.plugin.settings.customBannerAlignmentField[0].split(',')[0].trim()
                    : this.plugin.settings.customBannerAlignmentField;
                delete frontmatter[alignmentField];
                
                // Remove flag color field (this ensures the note uses the global default flag color)
                const flagColorField = Array.isArray(this.plugin.settings.customFlagColorField)
                    ? this.plugin.settings.customFlagColorField[0].split(',')[0].trim()
                    : this.plugin.settings.customFlagColorField;
                delete frontmatter[flagColorField];
                
                // If deleteBannerAndIcon is true, also remove the banner image and banner icon fields
                if (deleteBannerAndIcon) {
                    // Get the banner image field
                    const bannerField = Array.isArray(this.plugin.settings.customBannerField) 
                        ? this.plugin.settings.customBannerField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerField;

                    // Get the banner icon image field
                    const bannerIconImageField = Array.isArray(this.plugin.settings.customBannerIconImageField)
                        ? this.plugin.settings.customBannerIconImageField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconImageField;
                    
                    // Get the banner icon field
                    const bannerIconField = Array.isArray(this.plugin.settings.customBannerIconField)
                        ? this.plugin.settings.customBannerIconField[0].split(',')[0].trim()
                        : this.plugin.settings.customBannerIconField;
                    
                    // Remove the banner image and icon
                    delete frontmatter[bannerField];
                    delete frontmatter[bannerIconImageField];
                    delete frontmatter[bannerIconField];
                }
            });
            
            // After processing frontmatter, update the flag color radio buttons
            if (flagRadioContainer) {
                const flagRadios = flagRadioContainer.querySelectorAll('input[type="radio"]');
                flagRadios.forEach(radio => {
                    radio.checked = radio.value === this.plugin.settings.selectImageIconFlag;
                });
            }

            // After processing frontmatter, update the banner icon image aligment radio buttons
            if (bannerIconImageAlignmentRadioContainer) {
                const bannerIconImageAlignmentRadios = bannerIconImageAlignmentRadioContainer.querySelectorAll('input[type="radio"]');
                bannerIconImageAlignmentRadios.forEach(radio => {
                    radio.checked = radio.value === this.plugin.settings.bannerIconImageAlignment;
                });
            }

            // Reset title color if inline title is enabled
            if (inlineTitleEnabled && titleColorInput) {
                // Convert default title color if it's a CSS variable
                let defaultTitleColor = this.plugin.settings.titleColor;
                if (defaultTitleColor.startsWith('var(--')) {
                    console.log('defaultTitleColor', defaultTitleColor);
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
            }
            const titleColorField = Array.isArray(this.plugin.settings.customTitleColorField)
                ? this.plugin.settings.customTitleColorField[0].split(',')[0].trim()
                : this.plugin.settings.customTitleColorField;
            
            // Properly remove the title color from the frontmatter
            if (activeFile) {
                this.app.fileManager.processFrontMatter(activeFile, (fm) => {
                    delete fm[titleColorField];
                });
            }
            
            // Reset the banner position
            this.currentX = this.plugin.settings.xPosition;
            this.currentY = this.plugin.settings.yPosition;
            
            // Update crosshair position visually
            verticalLine.style.left = `${this.currentX}%`;
            horizontalLine.style.top = `${this.currentY}%`;

            // Update position indicator with default values
            updatePositionIndicator();

            // Update the banner to ensure the note is re-rendered properly
            setTimeout(() => {
                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (view) {
                    this.plugin.updateBanner(view, true);
                }
            }, 750);

            if (deleteBannerAndIcon) {
                this.close();
            }
        };

        // Add event listener to reset the modal when the reset button is clicked
        resetButton.addEventListener('click', () => {
            this.resetPixelBannerNoteSettings();
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
        let isCrosshairDragging = false;

        modalEl.addEventListener('mousedown', (e) => {
            // Prevent dragging if the target is a slider
            if (e.target === zoomSlider || 
                e.target === heightSlider || 
                e.target === maxWidthSlider ||
                e.target === contentStartPositionSlider || 
                e.target === bannerFadeSlider ||
                e.target === borderRadiusSlider ||
                e.target === bannerIconXPositionSlider ||
                e.target === bannerIconSizeSlider ||
                e.target === bannerIconImageSizeMultiplierSlider ||
                e.target === bannerIconTextVerticalOffsetSlider ||
                e.target === bannerIconRotateSlider ||
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
                e.target === titleColorInput ||
                e.target === targetArea ||
                e.target === verticalLine ||
                e.target === horizontalLine) return;
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
            
            if (isCrosshairDragging) {
                updatePosition(e);
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            isCrosshairDragging = false;
            modalEl.style.cursor = 'default';
            targetArea.style.cursor = 'crosshair';
        });

        // Replace click with drag for crosshair positioning
        targetArea.addEventListener('mousedown', (e) => {
            isCrosshairDragging = true;
            targetArea.style.cursor = 'move';
            updatePosition(e);
            e.preventDefault(); // Prevent text selection during drag
        });

        // Add crosshair dragging to the lines themselves
        verticalLine.addEventListener('mousedown', (e) => {
            isCrosshairDragging = true;
            targetArea.style.cursor = 'move';
            e.preventDefault(); // Prevent text selection during drag
        });

        horizontalLine.addEventListener('mousedown', (e) => {
            isCrosshairDragging = true;
            targetArea.style.cursor = 'move';
            e.preventDefault(); // Prevent text selection during drag
        });

        // Set initial position of the modal
        modalEl.style.position = 'absolute';
        modalEl.style.left = `${modalEl.getBoundingClientRect().left}px`;
        modalEl.style.top = `${modalEl.getBoundingClientRect().top}px`;
    }

    addStyle() {
        const style = document.createElement('style');
        style.textContent = `
            /* --------------------------- */
            /* -- Target Position Modal -- */
            /* --------------------------- */
            .target-position-modal {
                display: flex;
                flex-direction: column;
                justify-content: space-between;
            }

            .target-position-modal .target-container {
                display: flex;
                flex-direction: column;
                gap: 10px;
                min-width: 200px;
            }

            .target-position-modal .target-area {
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                border-radius: 4px;
            }

            .target-position-modal .position-indicator {
                padding: 4px;
                border-radius: 4px;
                background-color: var(--background-secondary);
            }

            .target-position-modal .crosshair-line {
                position: absolute;
                background-color: var(--text-accent);
                pointer-events: none;
            }

            .target-position-modal .vertical {
                width: 1px;
                height: 100%;
            }

            .target-position-modal .horizontal {
                width: 100%;
                height: 1px;
            }

            .target-position-modal .control-panel {
                background-color: var(--background-secondary);
                padding: 15px;
                border-radius: 8px;
            }

            .target-position-modal .display-mode-select {
                width: 100%;
                min-width: max-content;
                padding: 6px;
                border-radius: 4px;
                border: 1px solid var(--background-modifier-border);
                background-color: var(--background-primary);
                color: var(--text-normal);
            }

            .target-position-modal .zoom-container {
                position: relative;
            }

            .target-position-modal .zoom-slider {
                width: 15px;
                background-color: var(--background-primary);
                border-radius: 5px;
                cursor: pointer;
                margin: 10px auto;
                appearance: none;
            }

            .target-position-modal .zoom-slider::-webkit-slider-runnable-track {
                width: 100%;
                height: 200px;
                background: var(--background-modifier-border);
                border-radius: 5px;
                border: none;
            }

            .target-position-modal .zoom-slider::-moz-range-track {
                width: 100%;
                height: 200px;
                background: var(--background-modifier-border);
                border-radius: 5px;
                border: none;
            }

            .target-position-modal .zoom-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: var(--text-accent);
                cursor: pointer;
                border: none;
                margin-top: 90px;
                position: relative;
                left: -2px;
            }

            .target-position-modal .zoom-slider::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: var(--text-accent);
                cursor: pointer;
                border: none;
            }

            .target-position-modal .zoom-value {
                color: var(--text-muted);
                text-align: center;
            }

            .target-position-modal .height-slider,
            .target-position-modal .content-start-position-slider {
                width: 15px;
                background-color: var(--background-primary);
                border-radius: 5px;
                cursor: pointer;
                margin: 10px auto;
                appearance: none;
            }

            .target-position-modal .height-slider::-webkit-slider-runnable-track,
            .target-position-modal .content-start-position-slider::-webkit-slider-runnable-track {
                width: 100%;
                height: 200px;
                background: var(--background-modifier-border);
                border-radius: 5px;
                border: none;
            }

            .target-position-modal .height-slider::-moz-range-track,
            .target-position-modal .content-start-position-slider::-moz-range-track {
                width: 100%;
                height: 200px;
                background: var(--background-modifier-border);
                border-radius: 5px;
                border: none;
            }

            .target-position-modal .max-width-slider::-webkit-slider-runnable-track,
            .target-position-modal .height-slider::-webkit-slider-runnable-track,
            .target-position-modal .content-start-position-slider::-webkit-slider-runnable-track {
                width: 100%;
                height: 200px;
                background: var(--background-modifier-border);
                border-radius: 5px;
                border: none;
            }

            .target-position-modal .max-width-slider::-moz-range-track,
            .target-position-modal .height-slider::-moz-range-track,
            .target-position-modal .content-start-position-slider::-moz-range-track {
                width: 100%;
                height: 200px;
                background: var(--background-modifier-border);
                border-radius: 5px;
                border: none;
            }

            .target-position-modal .max-width-slider::-webkit-slider-thumb,
            .target-position-modal .height-slider::-webkit-slider-thumb,
            .target-position-modal .content-start-position-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: var(--text-accent);
                cursor: pointer;
                border: none;
                margin-top: 90px;
                position: relative;
                left: -2px;
            }

            .target-position-modal .max-width-slider:disabled {
                opacity: 0;
                cursor: not-allowed;
            }

            .target-position-modal .max-width-slider::-moz-range-thumb,
            .target-position-modal .height-slider::-moz-range-thumb,
            .target-position-modal .content-start-position-slider::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: var(--text-accent);
                cursor: pointer;
                border: none;
            }

            .target-position-modal .height-value,
            .target-position-modal .content-start-position-value {
                color: var(--text-muted);
                text-align: center;
            }

            .target-position-modal .max-width-container,
            .target-position-modal .height-container,
            .target-position-modal .content-start-position-container {
                display: flex;
                flex-direction: column;
                gap: 5px;
                align-items: center;
                background-color: var(--background-secondary);
                padding: 15px;
                border-radius: 4px;
            }

            .target-position-modal .height-label,
            .target-position-modal .content-start-position-label {
                color: var(--text-muted);
                font-size: 0.9em;
            }

            .target-position-modal .height-value,
            .target-position-modal .content-start-position-value {
                font-family: var(--font-monospace);
                font-size: 0.9em;
                color: var(--text-muted);
            }

            .target-position-modal .reset-button {
                padding: 8px;
                width: 100%;
                font-size: 14px;
                border-radius: 4px;
                cursor: pointer;
                transition: background-color 0.2s ease;
            }

            .target-position-modal .reset-button:hover {
                background-color: var(--interactive-accent-hover);
            }

            .target-position-modal .target-area {
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .target-position-modal .vertical {
                position: absolute;
                background-color: var(--text-accent);
                pointer-events: none;
                width: 1px;
                height: 100%;
                left: ${this.currentX}%;
                pointer-events: auto;
                cursor: move;
            }
            .target-position-modal .horizontal {
                position: absolute;
                background-color: var(--text-accent);
                pointer-events: none;
                width: 100%;
                height: 1px;
                top: ${this.currentY}%;
                pointer-events: auto;
                cursor: move;
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

            /* ------------------- */
            /* -- mobile layout -- */
            /* ------------------- */
            @media screen and (max-width: 550px) {
                .banner-image-header { flex-direction: column !important; }
                .banner-icon-header { flex-direction: column !important; }
                .main-container--banner-image { flex-direction: column !important; }
                .main-container--banner-icon { flex-direction: column !important; }
                .target-container { order: -1 !important; align-items: center !important; }
                .height-slider,
                .content-start-position-slider {
                    rotate: 90deg !important;
                    flex: 0 auto !important;
                    writing-mode: unset !important;
                    direction: unset !important;
                }
                .color-picker-and-alpha-slider-row { flex-wrap: wrap !important; }
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