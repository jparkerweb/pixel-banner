# Code Organization Recommendations

## Current Issues
- [x] Identified large file size (2500+ lines)
- [x] Identified mixed concerns
- [x] Identified coupling issues
- [x] Created initial reorganization plan

## Proposed File Structure & Migration Checklist

### 1. API Services (`/src/services/`)
#### apiService.js
- [x] Create services directory
- [x] Create apiService.js file
- [x] Move and refactor methods:
  - [x] fetchPexelsImage()
  - [x] fetchPixabayImage()
  - [x] fetchFlickrImage() 
  - [x] fetchUnsplashImage()
  - [x] makeRequest()
  - [x] verifyPixelBannerPlusCredentials()

### 2. Banner Management (`/src/core/`)
#### bannerManager.js
- [x] Create banner directory
- [x] Create bannerManager.js
- [x] Move and refactor methods:
  - [x] addPixelBanner()
  - [x] updateBanner()
  - [x] applyBannerSettings()
  - [x] applyContentStartPosition()
  - [x] applyBannerWidth()
  - [x] updateAllBanners()
  - [x] updateBannerPosition()

#### bannerUtils.js
- [x] Create bannerUtils.js
- [x] Move and refactor utility methods:
  - [x] getInputType()
  - [x] getPathFromObsidianLink()
  - [x] getVaultImageUrl()
  - [x] preloadImage()
  - [x] getFolderPath()
  - [x] getFolderSpecificImage()
  - [x] getFolderSpecificSetting()
  - [x] getRandomImageFromFolder()
  - [x] getActiveApiProvider()
  - [x] hasBannerFrontmatter()
  - [x] createFolderImageSettings()

### 3. Event Handlers (`/src/core/events/`)
- [ ] Create events directory
- [ ] Create eventHandlers.js
- [ ] Move and refactor methods:
  - [ ] handleActiveLeafChange()
  - [ ] handleLayoutChange()
  - [ ] handleModeChange()
  - [ ] handleSelectImage()
  - [ ] handleSetBannerIcon()
  - [ ] handlePinIconClick() (verify already moved)

### 4. DOM Management (`/src/core/dom/`)
- [ ] Create dom directory
- [ ] Create domManager.js
- [ ] Move and refactor methods:
  - [ ] setupMutationObserver()
  - [ ] setupResizeObserver()
  - [ ] updateFieldVisibility()
  - [ ] updateEmbeddedTitlesVisibility()
  - [ ] updateEmbeddedBannersVisibility()
  - [ ] cleanupPreviousLeaf()

### 5. Cache Management (`/src/core/cache/`)
- [x] Created initial cacheHelpers.js
- [ ] Rename to cacheManager.js
- [ ] Review and enhance cache functionality
- [ ] Add cache-specific types/interfaces

### 6. Icon Management (`/src/core/icon/`)
- [x] Created initial iconOverlay.js
- [ ] Create icon directory
- [ ] Move icon-related utilities
- [ ] Add icon-specific types/interfaces

### 7. Plugin Core (`/src/core/`)
- [ ] Rename pixelBannerPluginClass.js to pixelBannerPlugin.js
- [ ] Clean up core file to only include:
  - [ ] onload()
  - [ ] onunload()
  - [ ] loadSettings()
  - [ ] saveSettings()
  - [ ] checkVersion()
  - [ ] getReleaseNotes()

## Implementation Phases

### Phase 1: Initial Setup
- [ ] Create all required directories
- [ ] Set up module structure
- [ ] Create empty files with exports
- [ ] Update main imports

### Phase 2: API & Utils Migration
- [ ] Move API services
- [ ] Move utility functions
- [ ] Test API functionality
- [ ] Update references

### Phase 3: Core Features Migration
- [ ] Move banner management
- [ ] Move event handlers
- [ ] Move DOM management
- [ ] Test core features

### Phase 4: Enhancement & Testing
- [ ] Add TypeScript (optional)
- [ ] Add JSDoc comments
- [ ] Create test suite
- [ ] Add error boundaries
- [ ] Implement performance monitoring

## Quality Assurance
- [ ] Verify all features work after each migration
- [ ] Check for circular dependencies
- [ ] Review error handling
- [ ] Test performance impact
- [ ] Update documentation

## Final Steps
- [ ] Remove old code
- [ ] Update README
- [ ] Update version number
- [ ] Create migration guide
- [ ] Test full plugin functionality

This checklist will help track progress and ensure nothing is missed during the refactoring process. Each item should be checked off only after testing confirms the change works as expected. 