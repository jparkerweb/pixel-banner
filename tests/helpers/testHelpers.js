import { vi } from 'vitest';
import { createMockApp, createMockPlugin, TFile, TFolder, MarkdownView } from '../mocks/obsidian.js';

/**
 * Test helper utilities for Pixel Banner plugin testing
 */

// Factory functions for common test objects
export function createTestFile(path = 'test.md', frontmatter = {}) {
  const file = new TFile(path);
  const app = createMockApp();
  
  // Set up frontmatter in metadata cache
  app.metadataCache.setFileCache(file, {
    frontmatter,
    sections: [],
    headings: [],
    links: [],
    embeds: [],
    tags: [],
  });
  
  return { file, app };
}

export function createTestPlugin(settings = {}) {
  const app = createMockApp();
  const plugin = createMockPlugin(app);
  
  // Default plugin settings
  plugin.settings = {
    // API Settings
    pexelsApiKey: '',
    pixabayApiKey: '',
    flickrApiKey: '',
    unsplashApiKey: '',
    
    // General Settings
    bannerHeight: '400px',
    bannerStyle: 'cover',
    showBannerInInternalEmbed: true,
    showBannerInPreviewEmbed: true,
    showBannerInDocumentEmbed: true,
    fadeMultipleDisplays: true,
    bannerDragSelector: '.pixel-banner-icon',
    customBannerField: 'banner',
    customBannerIconField: 'banner-icon',
    customContentStartField: 'banner-content-start-position',
    
    // Advanced Settings
    defaultKeywords: 'nature,landscape,abstract',
    numberOfImages: 20,
    imageSize: 'large2x',
    
    // Folder Images
    folderImages: {},
    
    // Internal
    version: '3.6.5',
    
    ...settings
  };
  
  return plugin;
}

export function createTestView(file = null, mode = 'preview') {
  const view = new MarkdownView();
  view.file = file;
  view.getMode = vi.fn(() => mode);
  
  // Set up proper DOM structure
  view.contentEl.innerHTML = `
    <div class="markdown-preview-view markdown-rendered">
      <div class="markdown-preview-section">
        <div class="markdown-reading-view">
          <!-- Content goes here -->
        </div>
      </div>
    </div>
  `;
  
  return view;
}

export function createBannerElement() {
  const banner = document.createElement('div');
  banner.className = 'pixel-banner';
  banner.style.backgroundImage = 'url(test-image.jpg)';
  banner.style.height = '400px';
  return banner;
}

export function createIconOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'pixel-banner-icon';
  overlay.innerHTML = '<span>🎯</span>';
  return overlay;
}

// DOM manipulation helpers
export function simulateClick(element) {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window
  });
  element.dispatchEvent(event);
}

export function simulateInput(element, value) {
  element.value = value;
  const event = new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    data: value
  });
  element.dispatchEvent(event);
}

export function simulateChange(element, value) {
  element.value = value;
  const event = new Event('change', {
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(event);
}

export function simulateKeydown(element, key, options = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options
  });
  element.dispatchEvent(event);
}

// Async helpers
export function waitFor(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitForNextTick() {
  return new Promise(resolve => process.nextTick(resolve));
}

export function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

// Mock data generators
export function generateMockApiResponse(provider = 'pexels', count = 5) {
  switch (provider) {
    case 'pexels':
      return {
        photos: Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          photographer: `Photographer ${i + 1}`,
          src: {
            original: `https://images.pexels.com/photos/${i + 1}/original.jpg`,
            large2x: `https://images.pexels.com/photos/${i + 1}/large2x.jpg`,
            large: `https://images.pexels.com/photos/${i + 1}/large.jpg`,
            medium: `https://images.pexels.com/photos/${i + 1}/medium.jpg`,
            small: `https://images.pexels.com/photos/${i + 1}/small.jpg`
          }
        }))
      };
      
    case 'pixabay':
      return {
        hits: Array.from({ length: count }, (_, i) => ({
          id: i + 1,
          user: `User ${i + 1}`,
          largeImageURL: `https://pixabay.com/photos/${i + 1}/large.jpg`,
          webformatURL: `https://pixabay.com/photos/${i + 1}/web.jpg`,
          previewURL: `https://pixabay.com/photos/${i + 1}/preview.jpg`
        }))
      };
      
    case 'unsplash':
      return {
        results: Array.from({ length: count }, (_, i) => ({
          id: `photo-${i + 1}`,
          user: { name: `User ${i + 1}` },
          urls: {
            raw: `https://images.unsplash.com/photo-${i + 1}?raw=true`,
            full: `https://images.unsplash.com/photo-${i + 1}?full=true`,
            regular: `https://images.unsplash.com/photo-${i + 1}?regular=true`,
            small: `https://images.unsplash.com/photo-${i + 1}?small=true`,
            thumb: `https://images.unsplash.com/photo-${i + 1}?thumb=true`
          }
        }))
      };
      
    default:
      return { photos: [], hits: [], results: [] };
  }
}

// Test fixture helpers
export function createTestFrontmatter(overrides = {}) {
  return {
    banner: 'test-banner.jpg',
    'banner-icon': '🎯',
    'banner-content-start-position': 100,
    tags: ['test'],
    ...overrides
  };
}

export function createTestFolderStructure(vault) {
  // Create test folders
  const rootFolder = new TFolder('/');
  const imagesFolder = new TFolder('/images');
  const notesFolder = new TFolder('/notes');
  
  vault.folders.set('/', rootFolder);
  vault.folders.set('/images', imagesFolder);
  vault.folders.set('/notes', notesFolder);
  
  // Create test files
  const testImage1 = new TFile('/images/test1.jpg');
  const testImage2 = new TFile('/images/test2.png');
  const testNote = new TFile('/notes/test-note.md');
  
  vault.files.set('/images/test1.jpg', testImage1);
  vault.files.set('/images/test2.png', testImage2);
  vault.files.set('/notes/test-note.md', testNote);
  
  return {
    rootFolder,
    imagesFolder,
    notesFolder,
    testImage1,
    testImage2,
    testNote
  };
}

// Mock setup helpers
export function setupMockLocalStorage() {
  const store = new Map();
  
  Object.defineProperty(global, 'localStorage', {
    value: {
      getItem: vi.fn((key) => store.get(key) || null),
      setItem: vi.fn((key, value) => store.set(key, value.toString())),
      removeItem: vi.fn((key) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
      get length() {
        return store.size;
      },
      key: vi.fn((index) => Array.from(store.keys())[index] || null)
    },
    writable: true
  });
  
  return store;
}

export function setupMockRequestUrl(responses = {}) {
  const mockRequestUrl = vi.fn(async ({ url, ...options }) => {
    // Check if we have a specific response for this URL
    const response = responses[url] || responses.default;
    
    if (response) {
      if (response.error) {
        throw new Error(response.error);
      }
      
      return {
        status: response.status || 200,
        headers: response.headers || {},
        json: response.json || {},
        text: response.text || '',
        arrayBuffer: response.arrayBuffer || new ArrayBuffer(0),
        ...response
      };
    }
    
    // Default successful response
    return {
      status: 200,
      headers: {},
      json: {},
      text: '',
      arrayBuffer: new ArrayBuffer(0)
    };
  });
  
  return mockRequestUrl;
}

// Cleanup helpers
export function cleanupTestEnvironment() {
  // Clear any global state
  vi.clearAllMocks();
  vi.clearAllTimers();
  
  // Clean up DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  
  // Reset localStorage if mocked
  if (global.localStorage?.clear) {
    global.localStorage.clear();
  }
}

// Assertion helpers
export function expectBannerToExist(container, selector = '.pixel-banner') {
  const banner = container.querySelector(selector);
  expect(banner).toBeTruthy();
  return banner;
}

export function expectBannerToHaveImage(banner, expectedUrl) {
  const backgroundImage = banner.style.backgroundImage;
  expect(backgroundImage).toContain(expectedUrl);
}

export function expectIconOverlayToExist(container, selector = '.pixel-banner-icon') {
  const overlay = container.querySelector(selector);
  expect(overlay).toBeTruthy();
  return overlay;
}

export function expectModalToBeOpen(modalClass) {
  const modal = document.querySelector(`.${modalClass}`);
  expect(modal).toBeTruthy();
  expect(modal.style.display).not.toBe('none');
  return modal;
}

// Time manipulation helpers
export function mockTimers() {
  vi.useFakeTimers();
  return {
    advance: (ms) => vi.advanceTimersByTime(ms),
    runAll: () => vi.runAllTimers(),
    restore: () => vi.useRealTimers()
  };
}

// Performance helpers
export function measurePerformance(fn) {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return {
    result,
    duration: end - start
  };
}

export async function measureAsyncPerformance(fn) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return {
    result,
    duration: end - start
  };
}