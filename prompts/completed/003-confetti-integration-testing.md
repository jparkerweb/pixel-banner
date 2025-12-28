<objective>
Integrate the confetti system into Pixel Banner's note lifecycle, add the confetti button to the Position modal, handle cleanup and edge cases, and create comprehensive tests for all confetti functionality.
</objective>

<context>
This builds on Phase 1 (core infrastructure) and Phase 2 (modal UI). Now we need to wire everything together so confetti renders automatically based on frontmatter and users can access the confetti modal.

Read CLAUDE.md for project conventions and testing patterns.

Key files to examine:
- `src/core/bannerManager.js` - Where banner insertion happens (hook confetti here)
- `src/core/eventHandler.js` - Event system for note changes
- `src/core/pixelBannerPlugin.js` - Main plugin entry point
- `src/modal/modals/targetPositionModal.js` - Where to add Confetti section button
- `src/utils/frontmatterUtils.js` - Reading frontmatter
- `src/core/confettiManager.js` - Created in Phase 1
- `src/modal/modals/confettiModal.js` - Created in Phase 2
- `tests/unit/` - Existing test patterns
- `tests/mocks/obsidian.js` - Obsidian API mocks
</context>

<requirements>
1. **Add Confetti Section to Position Modal**

   In `src/modal/modals/targetPositionModal.js`:
   ```javascript
   // Add above Flag Color section (or appropriate location)
   containerEl.createEl('h3', { text: 'Confetti' });

   new Setting(containerEl)
     .setName('Effect Settings')
     .setDesc('Add animated confetti effects to your note')
     .addButton(button => button
       .setButtonText('Add/Edit Confetti')
       .onClick(() => {
         // Get current confetti config from frontmatter
         const currentConfig = this.getCurrentConfettiConfig();
         new ConfettiModal(this.app, this.plugin, currentConfig).open();
       }));
   ```

   Add method to read current confetti config from active note's frontmatter.

2. **Hook Confetti into Note Lifecycle**

   In `src/core/bannerManager.js` or `src/core/eventHandler.js`:

   **On note open/switch:**
   ```javascript
   // After banner is inserted
   const confettiConfig = frontmatter[confettiFieldName]; // Support custom field names
   if (confettiConfig) {
     const { presetName, overrides } = parseConfettiConfig(confettiConfig);
     const isMobile = Platform.isMobile; // Obsidian's platform check
     const disableOnMobile = this.plugin.settings.confettiDisableOnMobile;

     if (!(isMobile && disableOnMobile)) {
       confettiManager.start(noteId, noteElement, presetName, overrides, isMobile);
     }
   }
   ```

   **On note close/switch away:**
   ```javascript
   // Fade out and cleanup confetti
   confettiManager.stop(noteId, 500); // 500ms fade out
   ```

   **On plugin unload:**
   ```javascript
   confettiManager.stopAll();
   ```

3. **Support Custom Field Names**

   The frontmatter key defaults to 'confetti' but should respect custom field configuration:
   ```javascript
   // Get field name from settings or use default
   const confettiFieldName = this.plugin.settings.customConfettiField || 'confetti';
   ```

   Add custom field option to settings if not already present via the existing Custom Fields system.

4. **Handle Multiple Notes (Tabs/Splits)**

   - Each note pane gets its own canvas and confetti instance
   - Use unique note ID (leaf ID or similar) to track each
   - When switching between tabs, don't stop confetti on hidden tabs (let it continue)
   - Only stop when note is actually closed

5. **Implement Proper Canvas Placement**

   ```javascript
   createCanvas(noteElement, coverage) {
     const canvas = document.createElement('canvas');
     canvas.className = 'pixel-banner-confetti-canvas';
     canvas.style.position = 'absolute';
     canvas.style.top = '0';
     canvas.style.left = '0';
     canvas.style.width = '100%';
     canvas.style.height = '100%';
     canvas.style.pointerEvents = 'none';
     canvas.style.zIndex = '50'; // Above content, below modals (modals are 1000+)
     canvas.style.opacity = '0'; // Start invisible for fade-in
     canvas.style.transition = 'opacity ease-in-out';

     // For banner-only coverage, position within banner element
     // For note coverage, position within note container
     const container = coverage === 'banner'
       ? noteElement.querySelector('.pixel-banner-image')
       : noteElement;

     container.style.position = 'relative'; // Ensure positioning context
     container.appendChild(canvas);

     return canvas;
   }
   ```

6. **Add CSS for Canvas**

   In `styles.css`:
   ```css
   .pixel-banner-confetti-canvas {
     position: absolute;
     top: 0;
     left: 0;
     width: 100%;
     height: 100%;
     pointer-events: none;
     z-index: 50;
   }
   ```

7. **Handle Reduced Motion Preference**

   ```javascript
   // Check user preference
   const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const disableForReducedMotion = config.disableForReducedMotion || false;

   if (prefersReducedMotion && disableForReducedMotion) {
     // Don't start confetti
     return;
   }
   ```

8. **Error Handling**

   Wrap all confetti operations in try-catch:
   ```javascript
   try {
     // confetti operations
   } catch (error) {
     console.error('Pixel Banner: Confetti error:', error);
     // Don't throw - fail silently to user
   }
   ```

9. **Create Unit Tests**

   `tests/unit/core/confettiPresets.test.js`:
   - Test each preset has all required properties
   - Test preset values are within valid ranges
   - Test getPresetNames() returns all presets

   `tests/unit/core/confettiManager.test.js`:
   - Test mapPosition() for all position options
   - Test createEmojiShapes() with single and multiple emoji
   - Test buildOptions() merges preset with overrides correctly
   - Test emoji takes precedence over colors
   - Test start() and stop() methods

   `tests/unit/utils/confettiUtils.test.js`:
   - Test parseConfettiConfig() with preset only
   - Test parseConfettiConfig() with preset and overrides
   - Test buildConfettiFrontmatter() produces correct format
   - Test hasOverrides() detects changes from defaults
   - Test parseEmojiString() handles multi-character emoji

10. **Create Integration Tests**

    `tests/integration/confettiWorkflow.test.js`:
    - Test confetti starts when note with confetti frontmatter opens
    - Test confetti stops when note closes
    - Test confetti respects mobile disable setting
    - Test confetti respects reduced motion setting
    - Test custom field name is respected
    - Test modal saves to frontmatter correctly
    - Test applying modal triggers immediate render

11. **Update Mobile Settings UI**

    In appropriate settings tab (likely General or Advanced):
    ```javascript
    new Setting(containerEl)
      .setName('Disable Confetti on Mobile')
      .setDesc('Turn off confetti effects on mobile devices for better performance')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.confettiDisableOnMobile)
        .onChange(async value => {
          this.plugin.settings.confettiDisableOnMobile = value;
          await this.plugin.saveSettings();
        }));
    ```

12. **Plugin Lifecycle Integration**

    In `src/core/pixelBannerPlugin.js`:
    ```javascript
    // In onload()
    import { confettiManager } from './confettiManager';

    // In onunload()
    confettiManager.stopAll();
    ```
</requirements>

<implementation>
- Follow existing event handling patterns in eventHandler.js
- Use Obsidian's Platform.isMobile for mobile detection
- Use workspace.getLeaf() or similar for unique note IDs
- Debounce note switch events to prevent rapid start/stop
- Canvas z-index must be below Obsidian's modal z-index (typically 1000+)
- All confetti operations must be wrapped in try-catch with console.error logging
- Tests should mock canvas-confetti library
- Tests should use existing Obsidian mocks from tests/mocks/obsidian.js
- Integration tests should test the full flow from frontmatter to rendering
- Cleanup must be thorough to prevent memory leaks
</implementation>

<output>
Files to modify:
- `./src/modal/modals/targetPositionModal.js` - Add Confetti section with button
- `./src/core/bannerManager.js` or `./src/core/eventHandler.js` - Hook confetti lifecycle
- `./src/core/pixelBannerPlugin.js` - Add cleanup on unload
- `./src/settings/tabs/` - Add mobile disable toggle (appropriate tab)
- `./styles.css` - Add canvas styles

Files to create:
- `./tests/unit/core/confettiPresets.test.js`
- `./tests/unit/core/confettiManager.test.js`
- `./tests/unit/utils/confettiUtils.test.js`
- `./tests/integration/confettiWorkflow.test.js`
</output>

<verification>
Before declaring complete:
1. Confetti button appears in Position/Style modal
2. Clicking button opens Confetti modal with current settings
3. Confetti renders automatically when opening note with confetti frontmatter
4. Confetti fades out when closing/switching note
5. Multiple notes can have independent confetti effects
6. Mobile disable setting works
7. Reduced motion preference respected
8. Custom field names work
9. No console errors during normal operation
10. Memory cleanup is thorough (no lingering canvases)
11. All unit tests pass
12. All integration tests pass
13. Run `npm test` to verify all 671+ existing tests still pass
14. Test in .vault environment manually with multiple presets
</verification>

<success_criteria>
- Complete end-to-end confetti workflow functional
- Confetti integrates seamlessly with existing banner system
- Multiple simultaneous effects work in split views
- Proper cleanup prevents memory leaks
- Settings integration is complete
- Comprehensive test coverage for all confetti functionality
- Existing tests remain passing
- User can add/edit confetti through intuitive modal interface
</success_criteria>
