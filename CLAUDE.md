# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the Pixel Banner plugin for Obsidian - a feature-rich plugin that adds customizable banner images to notes. The plugin supports AI-generated banners via Pixel Banner Plus, local images/videos, and integrations with multiple image APIs (Pexels, Pixabay, Flickr, Unsplash).

## Essential Commands

### Development
```bash
# Install dependencies
npm install

# Build and copy to test vault (primary development command)
npm run test-build

# Full build (includes creating example-vault.zip)
npm run build

# Clean install dependencies
npm run clean
```

### Testing
```bash
# Run all tests
npm test

# Run tests with UI
npm test:ui

# Run tests with coverage report
npm test:coverage

# Run a single test file
npx vitest tests/unit/core/bannerUtils.test.js

# Run tests in watch mode
npx vitest --watch
```

- Uses Vitest test framework with happy-dom for DOM testing
- Test files located in `tests/` directory
- Development testing also done via the `.vault` directory which contains a test Obsidian vault
- Built files are automatically copied to `.vault/pixel-banner-example/.obsidian/plugins/pexels-banner/`

### Build System
- Uses **esbuild** for bundling (configured in `scripts/esbuild.config.mjs`)
- Targets ES2018
- Automatically processes `UPDATE.md` into release notes during build
- No TypeScript, linting, or formatting tools configured

## Architecture

### Core Plugin Flow
1. **Entry Point**: `src/core/pixelBannerPlugin.js` extends Obsidian's Plugin class
2. **Event System**: Workspace events trigger banner updates via `eventHandler.js`
3. **Banner Resolution**: `bannerManager.js` determines what banner to display based on frontmatter, folder settings, or defaults
4. **Input Processing**: `bannerUtils.js:getInputType()` identifies whether input is a keyword, URL, vault path, wiki link, or markdown image
5. **Image Fetching**: Based on input type:
   - Keywords → API calls via `apiService.js`
   - URLs → Direct fetch
   - Vault paths → Resolved via Obsidian's vault API
   - Wiki/Markdown links → Parsed and resolved to vault paths
6. **DOM Insertion**: `bannerManager.js:insertBanner()` handles actual DOM manipulation
7. **Caching**: `cacheHelpers.js` manages image caching for performance

### Frontmatter Processing
The plugin supports multiple frontmatter formats for custom banners:
- **Wiki links**: `[[image.jpg]]`, `![[image.jpg]]` (quoted or unquoted)
- **Markdown images**: `![](image.jpg)` (quoted or unquoted)  
- **Plain paths**: `folder/image.jpg`, `image.jpg` (quoted or unquoted)
- **URLs**: `https://example.com/image.jpg`
- **Keywords**: `sunset beach` (triggers API search)

Path resolution logic in `bannerUtils.js:getInputType()`:
1. Check for wiki/markdown syntax first (before cleaning)
2. Clean quotes and syntax
3. Check for file:/// protocol
4. Try URL parsing
5. Check vault for exact path match
6. Try partial path matching for relative paths
7. Default to keyword if no match found

### Modal System
All modals extend Obsidian's Modal class and follow a pattern:
1. Constructor sets up initial state
2. `onOpen()` builds the UI
3. Event handlers manage user interactions
4. Results are passed via callbacks or promises
5. `onClose()` handles cleanup

Key modals:
- `selectPixelBannerModal.js` - Main banner selection interface
- `pixelBannerStoreModal.js` - Browse/download from collection
- `generateAIBannerModal.js` - AI generation interface
- `targetPositionModal.js` - Position/style configuration

### Service Layer
- **apiService.js**: Handles Pexels, Pixabay, Flickr, Unsplash APIs
- **apiPixelBannerPlus.js**: Manages premium features (AI generation, collection)
- API keys are stored in plugin settings, never in code

### Settings Management
- Settings schema defined in `src/core/settings.js`
- UI components in `src/settings/tabs/`
- Settings are persisted via Obsidian's plugin data API
- Folder-specific settings override global defaults

## Development Guidelines

### Code Style
- **Language**: JavaScript (not TypeScript)
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Target**: Obsidian 1.6.0+ (manifest.json)
- **No linting/formatting tools** - maintain consistent style manually

### Important Practices
1. Update `inventory.md` when modifying files (developer documentation)
2. Update `UPDATE.md` for user-facing changes (shown in plugin)
3. Test changes in the `.vault` test environment before committing
4. Ensure compatibility with both desktop and mobile Obsidian

### API Keys and Services
- Plugin uses multiple image APIs requiring API keys
- Keys are stored in plugin settings, never in code
- Pixel Banner Plus is the premium AI service (requires subscription)

## Testing Strategy

### Test Structure
- **Unit tests**: `tests/unit/` - Test individual functions/components
- **Integration tests**: `tests/integration/` - Test workflows and component interactions
- Uses Vitest with happy-dom for DOM testing
- Mocks in `tests/mocks/obsidian.js` simulate Obsidian API

### Key Test Files
- `bannerUtils.test.js` - Tests input type detection and path resolution
- `frontmatterUtils.test.js` - Tests frontmatter parsing and updates
- `bannerWorkflow.test.js` - Tests complete banner display workflows
- `modalWorkflows.test.js` - Tests modal interactions

### Running Specific Tests
```bash
# Run tests for a specific component
npx vitest tests/unit/core/bannerUtils.test.js

# Run tests matching a pattern
npx vitest -t "getInputType"

# Debug a specific test
npx vitest tests/unit/core/bannerUtils.test.js --reporter=verbose
```

## Common Development Tasks

### Adding a New Image Provider
1. Add provider configuration to `src/resources/constants.js`
2. Implement API logic in `src/services/apiService.js`
3. Add UI components in `src/modal/modals/searchModal.js`
4. Update settings tabs if API key is required
5. Add tests in `tests/unit/services/apiService.test.js`

### Modifying Banner Behavior
1. Core logic is in `src/core/bannerManager.js`
2. DOM insertion happens in `insertBanner()` and related methods
3. Banner positioning and styling controlled by CSS classes in `styles.css`
4. Test changes in `tests/integration/bannerWorkflow.test.js`

### Working with Frontmatter
1. Parsing logic in `src/utils/frontmatterUtils.js`
2. Input type detection in `src/core/bannerUtils.js:getInputType()`
3. Path resolution in `getPathFromObsidianLink()` and `getPathFromMarkdownImage()`
4. Test frontmatter handling in `tests/unit/utils/frontmatterUtils.test.js`

### Debugging Tips
- Use Obsidian's Developer Tools (Ctrl+Shift+I)
- Console logs are acceptable during development
- Test in the `.vault` directory's Obsidian instance
- Check `bannerManager.js` for banner insertion issues
- Check `bannerUtils.js:getInputType()` for path resolution issues

## Release Process
1. Update version in `manifest.json` and `package.json`
2. Update `CHANGELOG.md` with release notes
3. Update `UPDATE.md` for user-facing changes (shown in plugin)
4. Run `npm run build` to create release bundle
5. Test in `.vault` environment before releasing