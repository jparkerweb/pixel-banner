# AGENTS.md

This file provides guidance to AI coding agents like Claude Code (claude.ai/code), Cursor AI, Codex, Gemini CLI, GitHub Copilot, and other AI coding assistants when working with code in this repository.

## Overview

Pixel Banner is an Obsidian plugin that adds customizable banner images to notes. It supports AI-generated banners via Pixel Banner Plus, local images/videos, and integrations with Pexels, Pixabay, Flickr, and Unsplash APIs.

- **Language**: JavaScript (no TypeScript)
- **Target**: Obsidian 1.6.0+
- **Bundler**: esbuild (ES2018)
- **No linting/formatting tools** - maintain consistent style manually

## Essential Commands

```bash
# Development build (copies to test vault)
npm run test-build

# Production build
npm run build

# Run all tests
npm test

# Run single test file
npx vitest tests/unit/core/bannerUtils.test.js

# Run tests matching pattern
npx vitest -t "getInputType"

# Watch mode
npx vitest --watch
```

## Architecture

### Core Plugin Flow

1. **Entry**: `src/core/pixelBannerPlugin.js` extends Obsidian's `Plugin` class
2. **Events**: `eventHandler.js` handles workspace events (leaf changes, mode changes)
3. **Resolution**: `bannerManager.js` determines and displays banners based on frontmatter/folder settings
4. **Input Detection**: `bannerUtils.js:getInputType()` identifies input type (keyword, URL, vault path, wiki link)
5. **DOM**: `bannerManager.js:insertBanner()` handles DOM manipulation
6. **Caching**: `cacheHelpers.js` manages image caching

### Input Type Detection (`bannerUtils.js:getInputType()`)

The plugin reads multiple input formats:
- Plain paths: `image.jpg`, `folder/image.jpg`
- Wiki links: `[[image.jpg]]`, `![[image.jpg]]`
- Markdown images: `![](image.jpg)`
- URLs: `https://example.com/image.jpg`
- file:// protocol: `file:///C:/path/image.jpg`
- Keywords: `sunset beach` (triggers API search)

Resolution order:
1. Check for wiki/markdown syntax
2. Clean quotes and syntax
3. Check for file:/// protocol
4. Try URL parsing
5. Check vault for exact path match
6. Try partial path matching
7. Default to keyword

### Modal Pattern

All modals extend Obsidian's `Modal` class:
```javascript
class ExampleModal extends Modal {
  constructor(app, plugin) { /* setup */ }
  onOpen() { /* build UI */ }
  onClose() { /* cleanup */ }
}
```

### Service Layer

- `apiService.js`: Pexels, Pixabay, Flickr, Unsplash integrations
- `apiPixelBannerPlus.js`: Premium AI generation features
- API keys stored in plugin settings, never in code

## Key Files

| File | Purpose |
|------|---------|
| `src/core/pixelBannerPlugin.js` | Main entry point |
| `src/core/bannerManager.js` | Banner creation/updates |
| `src/core/bannerUtils.js` | Input type detection, path resolution |
| `src/core/eventHandler.js` | Workspace event handlers |
| `src/core/settings.js` | Settings load/save |
| `src/utils/frontmatterUtils.js` | Frontmatter parsing/updates |
| `src/modal/modals.js` | Modal exports |

## Required Updates When Modifying Code

1. **Always update `inventory.md`** when modifying files
2. **Update `UPDATE.md`** for user-facing changes (shown in plugin UI)
3. **Update `CHANGELOG.md`** for technical changes
4. Test in `.vault/pixel-banner-example/` before committing

## Testing

- Framework: Vitest with happy-dom
- Tests: `tests/unit/` and `tests/integration/`
- Mocks: `tests/mocks/obsidian.js` simulates Obsidian API
- Test vault: `.vault/pixel-banner-example/`

Key test files:
- `bannerUtils.test.js` - Input type detection
- `frontmatterUtils.test.js` - Frontmatter handling
- `bannerWorkflow.test.js` - E2E banner workflows

## Code Style

- camelCase for variables/functions
- PascalCase for classes/components
- Ensure desktop and mobile Obsidian compatibility
- Console logs acceptable during development

## Adding New Features

### New Image Provider
1. Add config to `src/resources/constants.js`
2. Implement API in `src/services/apiService.js`
3. Add UI in `src/modal/modals/searchModal.js`
4. Update settings tabs if API key required
5. Add tests in `tests/unit/services/`

### New Image Property Format
1. Add dropdown option in `src/settings/tabs/settingsTabGeneral.js`
2. Handle format in `src/utils/frontmatterUtils.js:updateNoteFrontmatter()`
3. Add to DEFAULT_SETTINGS in `src/core/settings.js` if needed
4. Add tests in `tests/unit/utils/frontmatterUtils.test.js`

## Debugging

- Obsidian Developer Tools: Ctrl+Shift+I
- Banner issues: Check `bannerManager.js`
- Path resolution issues: Check `bannerUtils.js:getInputType()`

## Release Process

1. Update version in `manifest.json` and `package.json`
2. Update `CHANGELOG.md` (technical) and `UPDATE.md` (user-facing)
3. Update `inventory.md` if files changed
4. Run `npm run build`
5. Test in `.vault` environment
