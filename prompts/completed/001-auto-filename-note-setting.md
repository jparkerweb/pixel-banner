<objective>
Implement a new general setting that allows the saved banner image filename to be automatically set to match the note's filename. When enabled, this should pre-fill the filename input with the current note's basename (without extension) when saving a banner image.
</objective>

<context>
This is an Obsidian plugin (Pixel Banner) that allows adding banner images to notes. Users can save/pin banner images locally. Currently, the default filename is configured via `plugin.settings.pinnedImageFilename` but doesn't consider the note context.

Key files to examine:
- `src/utils/handlePinIconClick.js` - Main banner save logic (lines 69-123 handle save)
- `src/modal/modals/saveImageModal.js` - Filename input modal
- `src/settings/settings.js` - Default settings definitions
- `src/settings/tabs/settingsTabGeneral.js` - General settings UI
- `src/core/pixelBannerPlugin.js` - Plugin command at line 351
- `src/core/bannerManager.js` - Pin icon handler at line 622
- `CLAUDE.md` - Project conventions and guidelines

The save flow is triggered from:
1. Plugin command (via workspace.getActiveViewOfType)
2. Banner pin icon click (has access to file context)
3. AI generation modal (knows which note it's for)
4. Store modal (knows which note it's for)
</context>

<requirements>
1. **Add new setting**: `useNoteFilenameForBanner` (boolean, default: false)
   - Add to DEFAULT_SETTINGS in `src/settings/settings.js`
   - Add UI toggle in general settings tab after the folder configuration

2. **Update save flow to pass note context**:
   - Modify `handlePinIconClick` signature to accept optional `noteFile` parameter
   - Update all call sites to pass the current note file when available
   - In plugin command: get file from `workspace.getActiveViewOfType(MarkdownView)?.file`
   - In banner pin icon: already has file context
   - In AI modal: has note context
   - In Store modal: has note context

3. **Implement auto-filename logic**:
   - When `useNoteFilenameForBanner` is enabled AND note context is available:
     - Pre-fill suggested filename with note's basename (without .md extension)
     - **EXCEPTION**: If note filename starts with "Untitled" (case-sensitive), ignore the setting and use `pinnedImageFilename` instead
   - Filename should still be editable in the modal (pre-fill, not bypass)
   - Fall back to `pinnedImageFilename` if note context unavailable or filename starts with "Untitled"

4. **Settings UI**:
   - Add toggle in General Settings tab (near the folder/filename settings)
   - Label: "Use Note Filename for Banner Images"
   - Description: "When saving banner images, automatically use the note's filename as the default image filename"
</requirements>

<implementation>
1. Start by reading CLAUDE.md for project conventions
2. Read the current settings structure in `src/settings/settings.js`
3. Read `handlePinIconClick.js` to understand the full save flow
4. Read `saveImageModal.js` to see how filename is passed
5. Trace all call sites of `handlePinIconClick` to update them

**Order of changes**:
1. Add setting to `src/settings/settings.js` (DEFAULT_SETTINGS)
2. Add UI toggle to `src/settings/tabs/settingsTabGeneral.js`
3. Update `handlePinIconClick` function signature and logic
4. Update call sites:
   - `src/core/pixelBannerPlugin.js` (command)
   - `src/core/bannerManager.js` (pin icon)
   - `src/modal/modals/generateAIBannerModal.js` (AI generation)
   - `src/modal/modals/pixelBannerStoreModal.js` (store)

**Naming conventions** (per CLAUDE.md):
- camelCase for variables/functions
- No TypeScript, JavaScript only
- Match existing code style in each file
</implementation>

<constraints>
- Do NOT use TypeScript (project uses JavaScript only)
- Do NOT add any new npm dependencies
- Do NOT modify the SaveImageModal's functionality - just pass a different default filename
- Preserve backward compatibility - existing behavior should work when setting is disabled
- Filename sanitization already exists in handlePinIconClick (line 103) - rely on that
- Match the existing code style and patterns in each file you modify
</constraints>

<output>
Modify these existing files (do NOT create new files):

1. `./src/settings/settings.js`
   - Add `useNoteFilenameForBanner: false` to DEFAULT_SETTINGS

2. `./src/settings/tabs/settingsTabGeneral.js`
   - Add toggle UI for the new setting (place after pinnedImageFolder setting around line 335)

3. `./src/utils/handlePinIconClick.js`
   - Add `noteFile = null` parameter to function signature
   - Use note filename when setting is enabled and noteFile is provided

4. `./src/core/pixelBannerPlugin.js`
   - Update the command to pass the active note file

5. `./src/core/bannerManager.js`
   - Update the pin icon click handler to pass the file context

6. `./src/modal/modals/generateAIBannerModal.js`
   - Update calls to pass the note context (this modal knows which note it's for)

7. `./src/modal/modals/pixelBannerStoreModal.js`
   - Update call to pass the note context
</output>

<verification>
After implementation, verify:
1. New setting appears in Settings → General tab
2. Toggle can be enabled/disabled and persists after plugin reload
3. When DISABLED: Filename defaults to `pinnedImageFilename` setting (existing behavior)
4. When ENABLED with note context: Filename pre-fills with note's basename
5. When ENABLED but note filename starts with "Untitled": Falls back to `pinnedImageFilename`
6. When ENABLED without note context: Falls back to `pinnedImageFilename`
7. User can still modify the pre-filled filename in the modal
8. No TypeScript compilation errors (though this is JS-only)
9. Run `npm test` to ensure existing tests pass
</verification>

<success_criteria>
- Setting toggle appears and functions correctly in General Settings
- Banner images saved while the setting is enabled default to the note's filename
- All existing functionality remains intact when setting is disabled
- Code follows existing patterns and conventions in the codebase
- All existing tests continue to pass
</success_criteria>
