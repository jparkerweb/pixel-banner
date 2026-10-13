# Adding New Features
> Part of [AGENTS.md](../AGENTS.md): project guidance for AI coding agents.

## New Image Provider
1. Add the API key setting to `DEFAULT_SETTINGS` in `src/settings/settings.js`
2. Implement the fetch in `src/services/apiService.js` (follow `fetchPexelsImage()` and siblings)
3. Wire it into `bannerUtils.js:getActiveApiProvider()` and the provider `switch` blocks in `src/core/pixelBannerPlugin.js` (search for `case 'unsplash':`)
4. Add the API key field and provider option in `src/settings/tabs/settingsTabAPISettings.js` (watch for mixed line endings in this file; see the Failure log in AGENTS.md)
5. Add tests in `tests/unit/services/`

## New Image Property Format
1. Add dropdown option in `src/settings/tabs/settingsTabGeneral.js`
2. Handle format in `src/utils/frontmatterUtils.js:updateNoteFrontmatter()`
3. Add to `DEFAULT_SETTINGS` in `src/settings/settings.js` if needed
4. Add tests in `tests/unit/utils/frontmatterUtils.test.js`
