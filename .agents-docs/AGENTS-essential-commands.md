# Essential Commands
> Part of [AGENTS.md](../AGENTS.md): project guidance for AI coding agents.

```bash
# Development build (copies to test vault)
npm run test-build

# Production build (test-build, then zips .vault into example-vault.zip)
npm run build

# Run all tests once (use this, not `npm test`, from an agent)
npx vitest run

# Run single test file
npx vitest run tests/unit/core/bannerUtils.test.js

# Run tests matching pattern
npx vitest run -t "getInputType"

# Watch mode / browser UI / coverage report
npx vitest --watch
npm run test:ui
npm run test:coverage

# Wipe node_modules and package-lock.json, then reinstall
npm run clean
```

Gotchas:
- `npm test` is plain `vitest`, which stays in watch mode in an interactive shell. Use `npx vitest run` when you need it to exit.
- `npm run build` shells out to `zip`, which is not on PATH on Windows. Use `npm run test-build` for development builds.
- The Husky pre-commit hook (`.husky/pre-commit`) runs `npm test`, so every commit runs the full suite.
- `test:coverage` enforces 60% thresholds (lines, functions, branches, statements) from `vitest.config.js`.
- The real build is `scripts/esbuild.config.mjs` plus `scripts/copy-build.mjs`. The root `build.mjs` is legacy and unused (it points at an `esbuild.config.mjs` that no longer exists at the root).
