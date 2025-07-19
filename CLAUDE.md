# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Pixel Banner is a sophisticated Obsidian plugin that adds customizable banner images to notes. It's built with modern JavaScript/ES6+ and uses ESBuild for bundling. The codebase is modular with clear separation of concerns between UI, core functionality, APIs, and utilities.

## Architecture

### Core Components
- **Plugin Entry**: `src/main.js` → `src/core/pixelBannerPlugin.js` - Main plugin class extending Obsidian's Plugin
- **Banner Management**: `src/core/bannerManager.js` - Handles banner rendering, positioning, and updates
- **Settings**: `src/settings/settings.js` - Settings management and configuration UI
- **DOM Manipulation**: `src/core/domManager.js` - Handles DOM updates and observers
- **Event Handling**: `src/core/eventHandler.js` - Centralized event management

### UI Modals
Located in `src/modal/modals/` with various modals for:
- AI banner generation (`generateAIBannerModal.js`)
- Image selection (`imageSelectionModal.js`)
- Pixel Banner Plus store (`pixelBannerStoreModal.js`)
- Daily game (`dailyGameModal.js`)

### Services
- **API Service**: `src/services/apiService.js` - Third-party image APIs (Pexels, Pixabay, Flickr, Unsplash)
- **Pixel Banner Plus**: `src/services/apiPIxelBannerPlus.js` - Premium features and token management

### Utilities
- Icon helpers, cache management, frontmatter utilities
- Image preloading and cache invalidation
- Debouncing and performance optimizations

## Build System

### Build Commands
- `npm run test-build` - Development build with ESBuild + file copying
- `npm run build` - Production build + example vault zip
- `npm run clean` - Clean and reinstall dependencies

### Build Process
1. **ESBuild Config**: `scripts/esbuild.config.mjs` - Handles bundling with virtual modules for release notes
2. **File Copying**: `scripts/copy-build.mjs` - Copies built files to example vault
3. **Release Notes**: Uses `marked` to convert UPDATE.md to HTML via virtual module

## Key Patterns

### Cache Management
- `bannerStateCache` with TTL (30min max, 30 entries max)
- `imageCache` for image preloading
- Cache invalidation via leaf changes and frontmatter updates

### Event Lifecycle
- Mutation observers for DOM changes
- Resize observers for responsive behavior
- Debounced updates to prevent performance issues
- Active leaf change handlers for state management

### Settings System
- Modular settings tabs in `src/settings/tabs/`
- Folder-specific configurations
- Custom field name support via frontmatter

## Development Guidelines

### Adding New Features
1. Add settings to appropriate tab in `src/settings/tabs/`
2. Create/update modal flows in `src/modal/modals/`
3. Add utility functions to relevant core module
4. Update frontmatter validators in `frontmatterUtils.js`

### Testing Changes
1. Run `npm run test-build` for quick development builds
2. Plugin files are copied to `.vault/pixel-banner-example/`
3. User must manually test with the example vault provided via Obsidian app

### File Structure
- Avoid direct DOM manipulation - use `domManager.js`
- Use pre-defined constants from `src/resources/`
- Implement proper cleanup in lifecycle methods
- Follow existing error handling patterns with console.error + Notice

## Important File Locations
- **Main plugin**: `src/core/pixelBannerPlugin.js`
- **Build script**: `scripts/esbuild.config.mjs`
- **Styles**: `styles.css` (external file included in manifest)
- **Manifest**: `manifest.json`
- **Settings UI**: `src/settings/settings.js`