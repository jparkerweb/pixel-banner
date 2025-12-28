<objective>
Implement the core confetti infrastructure for Pixel Banner plugin using the canvas-confetti library. This establishes the foundation that the modal UI and integration phases will build upon.
</objective>

<context>
Pixel Banner is an Obsidian plugin (JavaScript, not TypeScript) that adds customizable banners to notes. We're adding a confetti effect feature that renders animated particle effects over notes based on frontmatter configuration.

Read CLAUDE.md for project conventions and architecture.

Key files to examine:
- `src/core/settings.js` - Settings schema pattern
- `src/utils/frontmatterUtils.js` - How frontmatter is read/written
- `src/resources/constants.js` - How constants are organized
- `package.json` - Current dependencies
- `scripts/esbuild.config.mjs` - Build configuration
</context>

<requirements>
1. **Install canvas-confetti package**
   - Add `canvas-confetti` to dependencies in package.json
   - Run npm install to add the package

2. **Create `src/core/confettiPresets.js`**
   Define these 9 presets with their default configurations:

   ```javascript
   // Each preset has these properties:
   {
     count: number,        // particleCount (10-500)
     size: number,         // scalar (0.1-5.0)
     speed: number,        // startVelocity (1-100)
     gravity: number,      // gravity (0-3, negative for float up)
     spread: number,       // spread degrees (0-360)
     drift: number,        // horizontal drift (-5 to 5)
     duration: number,     // ticks/frames (50-1000)
     delay: number,        // start delay ms (0-5000)
     fadeIn: number,       // canvas fade-in ms (0-2000)
     opacity: number,      // canvas opacity (0.1-1.0)
     continuous: boolean,  // loop the effect
     interval: number,     // ms between bursts if continuous (50-5000)
     position: string,     // spawn location
     colors: array|null,   // HEX colors or null if emoji
     emoji: string|null,   // emoji characters or null
     coverage: string      // 'note' or 'banner'
   }
   ```

   **Preset Definitions:**

   - **snow**: count=50, size=1.2, speed=10, gravity=0.3, spread=180, drift=0.5, duration=400, delay=0, fadeIn=500, opacity=0.8, continuous=true, interval=300, position='top', colors=['#ffffff','#e0f0ff','#c0e0ff'], emoji=null, coverage='note'

   - **leaves**: count=30, size=2.0, speed=15, gravity=0.5, spread=120, drift=2, duration=500, delay=0, fadeIn=500, opacity=0.9, continuous=true, interval=800, position='top', colors=null, emoji='🍂🍁🍃', coverage='note'

   - **rain**: count=100, size=0.8, speed=80, gravity=2.5, spread=20, drift=0, duration=150, delay=0, fadeIn=300, opacity=0.6, continuous=true, interval=100, position='top', colors=['#6699cc','#4477aa','#88aacc'], emoji=null, coverage='note'

   - **stars**: count=20, size=1.5, speed=5, gravity=0.1, spread=360, drift=0, duration=600, delay=0, fadeIn=1000, opacity=1.0, continuous=true, interval=2000, position='random', colors=['#ffd700','#ffec8b','#ffffff'], emoji='⭐✨', coverage='note'

   - **fireworks**: count=80, size=1.0, speed=60, gravity=1.2, spread=180, drift=0, duration=200, delay=0, fadeIn=0, opacity=1.0, continuous=true, interval=3000, position='bottom', colors=['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff'], emoji=null, coverage='note'

   - **confetti**: count=100, size=1.0, speed=45, gravity=1.0, spread=70, drift=0, duration=200, delay=0, fadeIn=0, opacity=1.0, continuous=false, interval=0, position='center', colors=['#ff0000','#00ff00','#0000ff','#ffff00','#ff00ff','#00ffff','#ffa500'], emoji=null, coverage='note'

   - **hearts**: count=40, size=2.0, speed=25, gravity=-0.5, spread=60, drift=0.5, duration=400, delay=0, fadeIn=500, opacity=0.9, continuous=true, interval=1500, position='bottom', colors=null, emoji='❤️💕💖', coverage='note'

   - **sparkles**: count=30, size=0.8, speed=20, gravity=0.2, spread=360, drift=1, duration=300, delay=0, fadeIn=500, opacity=1.0, continuous=true, interval=500, position='random', colors=['#ffd700','#c0c0c0','#ffffff'], emoji='✨', coverage='note'

   - **bubbles**: count=25, size=1.5, speed=15, gravity=-0.8, spread=45, drift=0.3, duration=500, delay=0, fadeIn=800, opacity=0.5, continuous=true, interval=1000, position='bottom', colors=['#87ceeb','#add8e6','#b0e0e6'], emoji=null, coverage='note'

3. **Create `src/core/confettiManager.js`**

   Core class that manages confetti rendering:

   ```javascript
   import confetti from 'canvas-confetti';
   import { CONFETTI_PRESETS } from './confettiPresets';

   class ConfettiManager {
     constructor() {
       this.activeCanvases = new Map(); // noteId -> canvas instance
       this.activeAnimations = new Map(); // noteId -> animation state
     }

     // Create canvas overlay for a note element
     createCanvas(noteElement, coverage) {
       // Create canvas element
       // Set position: absolute, pointer-events: none
       // Z-index above content, below modals
       // Return confetti.create() instance
     }

     // Map user-friendly position to origin {x, y}
     mapPosition(position) {
       // 'top' -> {x: 0.5, y: 0}
       // 'bottom' -> {x: 0.5, y: 1}
       // 'left' -> {x: 0, y: 0.5}
       // 'right' -> {x: 1, y: 0.5}
       // 'center' -> {x: 0.5, y: 0.5}
       // 'top-left' -> {x: 0, y: 0}
       // 'top-right' -> {x: 1, y: 0}
       // 'bottom-left' -> {x: 0, y: 1}
       // 'bottom-right' -> {x: 1, y: 1}
       // 'random' -> {x: Math.random(), y: Math.random()}
     }

     // Create emoji shapes from string
     createEmojiShapes(emojiString, scalar) {
       // Split emoji string into array of individual emoji
       // Use confetti.shapeFromText() for each
       // Return array of shapes
       // Randomly pick one per particle call
     }

     // Build confetti options from preset + overrides
     buildOptions(presetName, overrides = {}) {
       // Get preset defaults
       // Merge with overrides
       // Map to canvas-confetti API
       // Handle emoji vs colors (emoji takes precedence)
     }

     // Start confetti effect on a note
     start(noteId, noteElement, presetName, overrides = {}, isMobile = false) {
       // Check mobile disable setting
       // Stop any existing effect on this note
       // Get merged config
       // Create canvas
       // Apply fadeIn opacity transition
       // Handle delay
       // If continuous: start loop with interval
       // If not continuous: single burst
       // Store in activeAnimations
     }

     // Stop confetti effect on a note with fade out
     stop(noteId, fadeOutDuration = 500) {
       // Get canvas
       // Apply opacity fade out
       // After fade, cleanup canvas
       // Clear animation loop
       // Remove from maps
     }

     // Stop all active effects
     stopAll() {
       // Iterate all active canvases
       // Stop each with fade out
     }

     // Fire single burst (for non-continuous or each loop iteration)
     fireBurst(confettiInstance, config) {
       // Build options
       // If position is 'random', set new random origin
       // If emoji, randomly select from emoji shapes
       // Call confettiInstance(options)
     }
   }

   export const confettiManager = new ConfettiManager();
   ```

4. **Create `src/utils/confettiUtils.js`**

   Helper functions:

   ```javascript
   // Parse frontmatter confetti value
   export function parseConfettiConfig(value) {
     // Handle: [presetName]
     // Handle: [presetName, {overrides}]
     // Return { presetName, overrides }
   }

   // Build frontmatter value from config
   export function buildConfettiFrontmatter(presetName, overrides) {
     // If no overrides or empty object: return [presetName]
     // Otherwise: return [presetName, overrides]
   }

   // Check if config has any overrides from preset defaults
   export function hasOverrides(presetName, config) {
     // Compare config to preset defaults
     // Return true if any differences
   }

   // Get list of preset names
   export function getPresetNames() {
     // Return array of preset names
   }

   // Validate emoji string (split into array)
   export function parseEmojiString(emojiString) {
     // Split string into individual emoji characters
     // Handle multi-codepoint emoji properly
   }
   ```

5. **Update settings schema in `src/core/settings.js`**

   Add mobile disable option:
   ```javascript
   // In DEFAULT_SETTINGS
   confettiDisableOnMobile: false
   ```

   Note: The actual confetti config is per-note frontmatter, not global settings. The frontmatter key defaults to 'confetti' but can be customized via the existing Custom Fields feature.
</requirements>

<implementation>
- Use ES6 imports/exports
- Follow existing code patterns in the codebase
- camelCase for variables/functions
- No TypeScript, pure JavaScript
- Import canvas-confetti at module level
- Use Map for tracking active instances (supports multiple notes with splits/tabs)
- Canvas must have pointer-events: none for click-through
- Canvas z-index should be high but below Obsidian's modal z-index (typically 1000+)
- Emoji parsing must handle multi-codepoint emoji (use spread operator or proper regex)
- Console.log errors, don't throw to user
</implementation>

<output>
Files to create/modify:
- `./package.json` - Add canvas-confetti dependency
- `./src/core/confettiPresets.js` - All preset definitions
- `./src/core/confettiManager.js` - Core confetti management class
- `./src/utils/confettiUtils.js` - Helper functions
- `./src/core/settings.js` - Add confettiDisableOnMobile setting

After creating files, run `npm install` to install the canvas-confetti package.
</output>

<verification>
Before declaring complete:
1. Verify canvas-confetti is in package.json dependencies
2. Verify all 9 presets are defined with correct default values
3. Verify confettiManager has all required methods
4. Verify position mapping covers all 10 options (including random)
5. Verify emoji parsing handles multi-character emoji properly
6. Run `npm install` to confirm package installs
7. No syntax errors in any created files
</verification>

<success_criteria>
- canvas-confetti package is installed and bundleable
- All 9 presets are fully defined with correct defaults
- ConfettiManager can create/destroy canvases per note
- Position mapping handles all user-friendly positions
- Emoji shapes can be created from emoji strings
- Mobile disable setting added to schema
- Code follows existing project patterns
</success_criteria>
