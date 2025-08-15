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
- No formal test framework is configured
- Development testing is done via the `.vault` directory which contains a test Obsidian vault
- Built files are automatically copied to `.vault/pixel-banner-example/.obsidian/plugins/pexels-banner/`

### Build System
- Uses **esbuild** for bundling (configured in `esbuild.config.mjs`)
- Targets ES2018
- Automatically processes `UPDATE.md` into release notes during build
- No TypeScript, linting, or formatting tools configured

## Architecture

### Directory Structure
```
src/
├── core/                    # Core plugin functionality
│   ├── pixelBannerPlugin.js # Main plugin class extending Obsidian.Plugin
│   ├── bannerManager.js     # Handles banner DOM insertion and updates
│   ├── bannerUtils.js       # Banner-related utility functions
│   ├── cacheHelpers.js      # Image caching logic
│   ├── domManager.js        # DOM mutation observers
│   ├── eventHandler.js      # Obsidian workspace event handling
│   └── settings.js          # Plugin settings management
├── modal/                   # UI modals
│   └── modals/             # Individual modal implementations
├── services/               # External API integrations
│   ├── apiPixelBannerPlus.js # Premium AI banner service
│   └── apiService.js      # Image provider APIs (Pexels, Pixabay, etc.)
├── settings/               # Settings UI components
│   └── tabs/              # Individual settings tab implementations
└── utils/                  # General utility functions
```

### Key Architectural Patterns

1. **Plugin Entry Point**: `src/core/pixelBannerPlugin.js` extends Obsidian's Plugin class
2. **Event-Driven Architecture**: Uses Obsidian workspace events to trigger banner updates
3. **Modal System**: Heavy use of Obsidian's Modal class for user interactions
4. **Service Layer**: API interactions are isolated in the services directory
5. **DOM Management**: Custom DOM observers handle banner insertion and updates
6. **Caching System**: Implements custom caching to optimize performance

### Critical Files

- **Main Plugin**: `src/core/pixelBannerPlugin.js` - Entry point and plugin lifecycle
- **Banner Management**: `src/core/bannerManager.js` - Core banner insertion logic
- **Settings**: `src/core/settings.js` - Plugin configuration and persistence
- **API Service**: `src/services/apiService.js` - Handles all external image API calls
- **Constants**: `src/resources/constants.js` - API endpoints and configuration

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

## Common Development Tasks

### Adding a New Image Provider
1. Add provider configuration to `src/resources/constants.js`
2. Implement API logic in `src/services/apiService.js`
3. Add UI components in `src/modal/modals/searchModal.js`
4. Update settings tabs if needed

### Modifying Banner Behavior
1. Core logic is in `src/core/bannerManager.js`
2. DOM insertion happens in `insertBanner()` and related methods
3. Banner positioning and styling controlled by CSS classes in `styles.css`

### Working with Settings
1. Settings schema defined in `src/core/settings.js`
2. UI components in `src/settings/tabs/`
3. Settings are persisted via Obsidian's plugin data API

### Debugging
- Use Obsidian's Developer Tools (Ctrl+Shift+I)
- Console logs are acceptable during development
- Test in the `.vault` directory's Obsidian instance