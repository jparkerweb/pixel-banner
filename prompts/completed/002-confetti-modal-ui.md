<objective>
Create the confetti settings modal UI for Pixel Banner that allows users to configure confetti effects with live preview, preset selection, and parameter customization using sliders and controls.
</objective>

<context>
This builds on Phase 1 which established the core confetti infrastructure. The modal should follow existing modal patterns in the codebase.

Read CLAUDE.md for project conventions.

Key files to examine:
- `src/modal/modals/targetPositionModal.js` - Main position/style modal (where confetti button will be added)
- `src/modal/modals/setEmojiModal.js` - Example of a settings modal with multiple controls
- `src/modal/modals/selectPixelBannerModal.js` - Complex modal with multiple UI components
- `src/utils/frontmatterUtils.js` - How to update frontmatter
- `src/core/confettiPresets.js` - Preset definitions (created in Phase 1)
- `src/core/confettiManager.js` - Core confetti logic (created in Phase 1)
- `src/utils/confettiUtils.js` - Helper functions (created in Phase 1)
- `styles.css` - Existing CSS patterns
</context>

<requirements>
1. **Create `src/modal/modals/confettiModal.js`**

   Modal class structure:
   ```javascript
   import { Modal, Setting } from 'obsidian';
   import { CONFETTI_PRESETS } from '../../core/confettiPresets';
   import { confettiManager } from '../../core/confettiManager';
   import { getPresetNames, buildConfettiFrontmatter, hasOverrides } from '../../utils/confettiUtils';

   export class ConfettiModal extends Modal {
     constructor(app, plugin, currentConfig = null) {
       super(app);
       this.plugin = plugin;
       this.currentConfig = currentConfig; // {presetName, overrides} or null
       this.selectedPreset = currentConfig?.presetName || 'none';
       this.settings = this.initializeSettings();
       this.previewCanvas = null;
       this.previewInstance = null;
       this.isModified = false;
     }

     initializeSettings() {
       // If currentConfig exists, merge preset defaults with overrides
       // Otherwise return empty/default state
     }

     onOpen() {
       this.buildUI();
       this.updatePreview();
     }

     onClose() {
       this.cleanupPreview();
     }

     buildUI() {
       // Build complete modal UI
     }

     updatePreview() {
       // Render confetti preview over modal
     }

     cleanupPreview() {
       // Stop and remove preview canvas
     }

     checkIfModified() {
       // Compare current settings to preset defaults
       // Update modified indicator
     }

     resetToDefaults() {
       // Reset all controls to preset defaults
       // Update preview
     }

     applySettings() {
       // Build frontmatter value
       // Update note frontmatter
       // Close modal
       // Trigger confetti render on note
     }
   }
   ```

2. **Modal UI Layout**

   Structure the modal with these sections:

   **Header:**
   - Title: "Confetti Effect Settings"
   - Modified indicator (show when settings differ from preset defaults)

   **Effect Selection:**
   - Dropdown: None, Snow, Leaves, Rain, Stars, Fireworks, Confetti, Hearts, Sparkles, Bubbles
   - When changed, load preset defaults into all controls and update preview

   **Particle Settings Section** (only shown when effect selected):
   - Particle Count: Slider 10-500, step 1
   - Size: Slider 0.1-5.0, step 0.1
   - Speed: Slider 1-100, step 1
   - Gravity: Slider -3.0 to 3.0, step 0.1 (negative for float up)
   - Spread: Slider 0-360, step 1
   - Drift: Slider -5.0 to 5.0, step 0.1
   - Duration: Slider 50-1000, step 10

   **Appearance Section:**
   - Canvas Opacity: Slider 0.1-1.0, step 0.05
   - Spawn Position: Dropdown (top, bottom, left, right, center, top-left, top-right, bottom-left, bottom-right, random)
   - Coverage Area: Dropdown (Entire Note, Banner Only)
   - Colors: Color picker component (add/remove colors, click to edit)
   - Custom Emoji: Text input (for emoji-based effects)

   **Timing Section:**
   - Start Delay: Slider 0-5000ms, step 100
   - Fade In Duration: Slider 0-2000ms, step 100
   - Continuous Effect: Toggle checkbox
   - Burst Interval: Slider 50-5000ms, step 50 (only enabled when Continuous is on)

   **Accessibility Section:**
   - Disable for reduced motion: Toggle checkbox

   **Actions:**
   - Reset to Preset Defaults button
   - Cancel button
   - Apply button

3. **Slider Implementation**

   For each slider control:
   ```javascript
   new Setting(container)
     .setName('Particle Count')
     .setDesc('Number of particles per burst')
     .addSlider(slider => slider
       .setLimits(10, 500, 1)
       .setValue(this.settings.count)
       .setDynamicTooltip()
       .onChange(value => {
         this.settings.count = value;
         this.checkIfModified();
         this.updatePreview();
       }))
     .addText(text => text
       .setValue(String(this.settings.count))
       .onChange(value => {
         const num = parseInt(value);
         if (!isNaN(num) && num >= 10 && num <= 500) {
           this.settings.count = num;
           // Update slider too
           this.checkIfModified();
           this.updatePreview();
         }
       }));
   ```

   Include numeric text input next to slider for precise values.

4. **Color Picker Component**

   - Show current colors as clickable swatches
   - Click swatch to open color picker
   - "+" button to add new color
   - "X" button on each swatch to remove
   - Update preview on any color change
   - Store as array of HEX strings

5. **Preview Rendering**

   ```javascript
   updatePreview() {
     if (this.selectedPreset === 'none') {
       this.cleanupPreview();
       return;
     }

     // Create canvas overlay on modal content
     if (!this.previewCanvas) {
       this.previewCanvas = document.createElement('canvas');
       this.previewCanvas.style.position = 'absolute';
       this.previewCanvas.style.top = '0';
       this.previewCanvas.style.left = '0';
       this.previewCanvas.style.width = '100%';
       this.previewCanvas.style.height = '100%';
       this.previewCanvas.style.pointerEvents = 'none';
       this.previewCanvas.style.zIndex = '1000';
       this.modalEl.appendChild(this.previewCanvas);
       this.previewInstance = confetti.create(this.previewCanvas, { resize: true });
     }

     // Fire preview burst with current settings
     // Use confettiManager.buildOptions() to get proper config
     // Trigger burst
   }
   ```

6. **Frontmatter Update**

   On Apply:
   ```javascript
   applySettings() {
     const activeFile = this.app.workspace.getActiveFile();
     if (!activeFile) return;

     if (this.selectedPreset === 'none') {
       // Remove confetti from frontmatter
       await this.removeConfettiFromFrontmatter(activeFile);
     } else {
       // Build frontmatter value
       const overrides = this.getOverridesFromDefaults();
       const frontmatterValue = buildConfettiFrontmatter(this.selectedPreset, overrides);
       // Update frontmatter using existing utils
       // Trigger confetti render on note
     }

     this.close();
   }
   ```

7. **Add CSS styles to `styles.css`**

   ```css
   .confetti-modal {
     /* Modal specific styles */
   }

   .confetti-modal .modified-indicator {
     color: var(--text-warning);
     font-size: 0.9em;
     margin-left: 10px;
   }

   .confetti-modal .color-swatches {
     display: flex;
     gap: 8px;
     flex-wrap: wrap;
   }

   .confetti-modal .color-swatch {
     width: 32px;
     height: 32px;
     border-radius: 4px;
     cursor: pointer;
     border: 2px solid var(--background-modifier-border);
     position: relative;
   }

   .confetti-modal .color-swatch:hover .remove-color {
     display: block;
   }

   .confetti-modal .remove-color {
     display: none;
     position: absolute;
     top: -6px;
     right: -6px;
     /* ... */
   }

   .confetti-modal .add-color {
     /* + button styles */
   }

   .confetti-modal .section-header {
     margin-top: 20px;
     margin-bottom: 10px;
     font-weight: bold;
   }
   ```
</requirements>

<implementation>
- Extend Obsidian's Modal class
- Follow existing modal patterns in the codebase
- Use Obsidian's Setting component for consistent UI
- All sliders must have numeric input companions for precise values
- Preview updates must be debounced to prevent performance issues (50-100ms)
- Color picker can use HTML5 input type="color" or Obsidian's color utilities
- Emoji input should preserve multi-character emoji properly
- Continuous toggle should enable/disable the interval slider
- Modified indicator updates on every setting change
- Reset button restores ALL settings to preset defaults
- Apply button saves, closes modal, AND triggers effect immediately
- Handle case where no active file is open
- Use existing frontmatterUtils for updating note metadata
</implementation>

<output>
Files to create/modify:
- `./src/modal/modals/confettiModal.js` - Complete modal implementation
- `./styles.css` - Add confetti modal styles
</output>

<verification>
Before declaring complete:
1. Modal opens without errors
2. Preset dropdown loads all 9 presets + None option
3. Selecting preset loads its default values into all controls
4. All sliders work with proper ranges and have numeric input companions
5. Color picker allows adding, editing, removing colors
6. Emoji input accepts and displays emoji properly
7. Preview renders over modal when preset selected
8. Preview updates on any setting change (with debouncing)
9. Modified indicator shows when settings differ from preset defaults
10. Reset button restores all controls to preset defaults
11. Cancel button closes without saving
12. Apply button saves to frontmatter and closes
13. No JavaScript errors in console
14. UI follows existing modal styling patterns
</verification>

<success_criteria>
- Modal provides full control over all confetti parameters
- Live preview shows effect over modal itself
- User-friendly controls (sliders with numeric inputs, dropdowns, color swatches)
- Clear visual feedback for modified state
- Proper integration with frontmatter system
- Consistent with existing plugin UI patterns
- Accessible and intuitive for users
</success_criteria>
