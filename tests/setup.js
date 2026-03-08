import { vi } from 'vitest';

// Global setup for all tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.MutationObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn(() => []),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Mock virtual release notes module
vi.mock('virtual:release-notes', () => ({
  releaseNotes: '<h1>Test Release Notes</h1><p>Test content</p>'
}));

// Mock Obsidian global functions
global.createDiv = (attrs = {}) => {
  const div = document.createElement('div');
  if (attrs.cls) {
    if (Array.isArray(attrs.cls)) {
      div.classList.add(...attrs.cls);
    } else {
      div.classList.add(attrs.cls);
    }
  }
  if (attrs.attr) {
    Object.entries(attrs.attr).forEach(([key, value]) => {
      if (key === 'style') {
        div.style.cssText = value;
      } else {
        div.setAttribute(key, value);
      }
    });
  }
  if (attrs.text) {
    div.textContent = attrs.text;
  }
  return div;
};

global.createEl = (tag, attrs = {}) => {
  const el = document.createElement(tag);
  if (attrs.cls) {
    if (Array.isArray(attrs.cls)) {
      el.classList.add(...attrs.cls);
    } else {
      el.classList.add(attrs.cls);
    }
  }
  if (attrs.attr) {
    Object.entries(attrs.attr).forEach(([key, value]) => {
      if (key === 'style') {
        el.style.cssText = value;
      } else {
        el.setAttribute(key, value);
      }
    });
  }
  if (attrs.text) {
    el.textContent = attrs.text;
  }
  return el;
};