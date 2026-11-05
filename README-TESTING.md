# Testing Guide for Pixel Banner Plugin

This document provides comprehensive information about the testing setup and practices for the Obsidian Pixel Banner plugin.

## 🧪 Testing Framework

We use **Vitest** as our primary testing framework, chosen for its:
- Fast execution with ES modules support
- Built-in TypeScript support
- Excellent mocking capabilities
- Vue-like testing experience
- Happy-DOM integration for browser APIs

## 📁 Project Structure

```
tests/
├── setup.js                    # Global test setup
├── mocks/
│   └── obsidian.js             # Comprehensive Obsidian API mocks
├── helpers/
│   └── testHelpers.js          # Common testing utilities
├── fixtures/
│   └── mockData.js             # Test data fixtures
├── unit/                       # Unit tests
│   ├── utils/                  # Utility function tests
│   ├── core/                   # Core functionality tests
│   ├── services/               # API service tests
│   ├── modal/                  # Modal component tests
│   └── settings/               # Settings UI tests
└── integration/                # Integration tests
    ├── pluginLifecycle.test.js
    ├── bannerWorkflow.test.js
    ├── apiIntegration.test.js
    ├── cacheIntegration.test.js
    └── modalWorkflows.test.js
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm or yarn package manager

### Installation
Dependencies are already installed if you ran `npm install` in the project root.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx vitest run tests/unit/utils/semver.test.js

# Run tests matching a pattern
npx vitest run --grep "debounce"
```

## 📋 Test Categories

### Unit Tests
Test individual functions and components in isolation:

- **Pure Utilities** (`tests/unit/utils/`)
  - `semver.test.js` - Version comparison logic
  - `debounce.test.js` - Debouncing functions
  - `fractionTextDisplay.test.js` - Text formatting
  - `frontmatterUtils.test.js` - Frontmatter parsing

- **Core Business Logic** (`tests/unit/core/`)
  - `bannerUtils.test.js` - Banner manipulation
  - `cacheHelpers.test.js` - Cache management
  - `domManager.test.js` - DOM manipulation
  - `eventHandler.test.js` - Event handling

- **Services** (`tests/unit/services/`)
  - `apiService.test.js` - External API integrations
  - `apiPixelBannerPlus.test.js` - Premium service

- **UI Components** (`tests/unit/modal/`, `tests/unit/settings/`)
  - Modal interactions and workflows
  - Settings UI components

### Integration Tests
Test complete workflows and component interactions:

- **Plugin Lifecycle** - Load/unload, settings persistence
- **Banner Workflows** - Complete banner creation flows
- **API Integration** - Provider switching and error handling
- **Cache Integration** - Multi-component cache management
- **Modal Workflows** - End-to-end user interactions

## 🛠 Testing Utilities

### Mock Framework
The `tests/mocks/obsidian.js` file provides comprehensive mocks for:
- Obsidian Plugin API
- Modal and UI components
- Vault and file operations
- Workspace and view management
- Settings and metadata cache

### Test Helpers
The `tests/helpers/testHelpers.js` provides utilities for:
- Creating test objects (files, plugins, views)
- DOM manipulation simulation
- Async operation helpers
- Mock data generation
- Performance measurement

### Mock Data
The `tests/fixtures/mockData.js` contains:
- Sample frontmatter configurations
- Plugin settings variations
- API response examples
- File structure samples
- Error scenarios

## 📝 Writing Tests

### Basic Test Structure

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { functionToTest } from '@/path/to/module';

describe('FunctionToTest', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should handle normal input correctly', () => {
    // Arrange
    const input = 'test input';
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(functionToTest(null)).toBe(null);
    expect(functionToTest('')).toBe('');
  });
});
```

### Testing Async Functions

```javascript
it('should handle async operations', async () => {
  const mockFn = vi.fn().mockResolvedValue('success');
  
  const result = await asyncFunction();
  
  expect(result).toBe('success');
  expect(mockFn).toHaveBeenCalled();
});
```

### Testing DOM Interactions

```javascript
import { simulateClick, expectBannerToExist } from '../helpers/testHelpers.js';

it('should create banner on click', () => {
  const button = document.createElement('button');
  document.body.appendChild(button);
  
  simulateClick(button);
  
  expectBannerToExist(document.body);
});
```

### Testing API Calls

```javascript
import { setupMockRequestUrl } from '../helpers/testHelpers.js';

it('should fetch image from API', async () => {
  const mockResponses = {
    'https://api.pexels.com/v1/search': {
      json: { photos: [{ src: { large: 'test-url' } }] }
    }
  };
  
  vi.mocked(requestUrl).mockImplementation(setupMockRequestUrl(mockResponses));
  
  const result = await fetchPexelsImage(plugin, 'nature');
  
  expect(result).toBe('test-url');
});
```

## 🎯 Best Practices

### Test Organization
- Group related tests using `describe` blocks
- Use descriptive test names that explain the scenario
- Follow the AAA pattern (Arrange, Act, Assert)
- Keep tests focused on a single behavior

### Mocking Strategy
- Mock external dependencies (Obsidian API, HTTP requests)
- Use real implementations for pure functions
- Mock time-dependent operations with `vi.useFakeTimers()`
- Clean up mocks between tests

### Coverage Goals
- Aim for 80%+ statement coverage
- Focus on critical paths and edge cases
- Don't obsess over 100% coverage at the expense of test quality
- Use coverage reports to identify untested code

### Error Testing
- Test error conditions and edge cases
- Verify error messages and error handling
- Test recovery mechanisms
- Mock network failures and timeouts

## 🔧 Debugging Tests

### Common Issues

1. **Tests timing out**
   ```javascript
   // Use fake timers for debounced functions
   vi.useFakeTimers();
   vi.advanceTimersByTime(1000);
   vi.useRealTimers();
   ```

2. **Mock not working**
   ```javascript
   // Ensure mocks are imported before the tested module
   vi.mock('obsidian', () => ({ ... }));
   ```

3. **DOM not available**
   ```javascript
   // Ensure happy-dom is configured in vitest.config.mjs
   environment: 'happy-dom'
   ```

### Debug Output
```javascript
// Log test state for debugging
console.log('Test state:', JSON.stringify(testObject, null, 2));

// Use vitest's debug mode
npx vitest run --reporter=verbose
```

## 📊 Coverage Reports

Coverage reports are generated in the `coverage/` directory:
- `coverage/index.html` - Interactive HTML report
- `coverage/lcov.info` - LCOV format for CI tools
- `coverage/coverage-summary.json` - Summary statistics

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Happy-DOM Documentation](https://github.com/capricorn86/happy-dom)
- [Obsidian Plugin Development](https://docs.obsidian.md/Plugins)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🤝 Contributing

When adding new features:
1. Write tests before implementation (TDD approach)
2. Ensure existing tests pass
3. Add integration tests for complex workflows
4. Update this documentation if needed
5. Maintain or improve coverage percentage

For questions about testing, refer to existing test files for patterns and examples.