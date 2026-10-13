# Testing
> Part of [AGENTS.md](../AGENTS.md): project guidance for AI coding agents.

- Framework: Vitest with happy-dom
- Tests: `tests/unit/` and `tests/integration/` (only `tests/**/*.test.js` runs)
- Mocks: `vitest.config.js` aliases `obsidian` to `tests/mocks/obsidian.js` and `virtual:release-notes` to `tests/mocks/virtual-release-notes.js`
- Setup: `tests/setup.js` runs before every file
- Shared data and helpers: `tests/fixtures/mockData.js`, `tests/helpers/testHelpers.js`
- `tests/unit/services/apiService.slow.test.js.backup` is parked and never runs
- Test vault: `.vault/pixel-banner-example/`

Key test files:
- `bannerUtils.test.js` - Input type detection
- `frontmatterUtils.test.js` - Frontmatter handling
- `bannerWorkflow.test.js` - E2E banner workflows

For verifying changes in a real running Obsidian, see [Live UI Testing](./AGENTS-live-ui-testing.md).
