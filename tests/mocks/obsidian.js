import { vi } from 'vitest';

// Mock Obsidian API classes and functions
export class Plugin {
  constructor(app, manifest) {
    this.app = app;
    this.manifest = manifest;
    this.settings = {};
    // Initialize observer properties with proper mock objects
    this.observer = {
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn(() => [])
    };
    this.resizeObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    };
  }

  async loadData() {
    return this.settings;
  }

  async saveData(data) {
    this.settings = data;
  }

  registerEvent(eventRef) {
    return eventRef;
  }

  registerDomEvent(el, event, callback) {
    el.addEventListener(event, callback);
    return { el, event, callback };
  }

  registerInterval(callback, delay) {
    const id = setInterval(callback, delay);
    return id;
  }

  addCommand(command) {
    return command;
  }

  addSettingTab(tab) {
    return tab;
  }

  addRibbonIcon(iconId, title, callback) {
    const ribbonIcon = {
      iconId,
      title,
      callback,
      click: callback
    };
    return ribbonIcon;
  }

  registerMarkdownPostProcessor(postProcessor, sortOrder) {
    return { postProcessor, sortOrder };
  }

  async onload() {}
  async onunload() {}
}

export class Modal {
  constructor(app) {
    this.app = app;
    this.containerEl = document.createElement('div');
    this.contentEl = document.createElement('div');
    this.modalEl = document.createElement('div');
    this.bgEl = document.createElement('div');
    
    // Add common modal properties
    this.onChoose = null;
    this.onSave = null;
    
    // Add Obsidian-specific methods to DOM elements
    function addObsidianMethods(el) {
      el.empty = function() { this.innerHTML = ''; return this; };
      el.addClass = function(className) { this.classList.add(className); return this; };
      el.removeClass = function(className) { this.classList.remove(className); return this; };
      el.toggleClass = function(className, force) { this.classList.toggle(className, force); return this; };
      el.hasClass = function(className) { return this.classList.contains(className); };
      el.setText = function(text) { this.textContent = text; return this; };
      el.createEl = function(tag, attrs) { 
        const child = document.createElement(tag);
        if (attrs) {
          if (attrs.text) child.textContent = attrs.text;
          if (attrs.cls) child.className = attrs.cls;
          if (attrs.href) child.href = attrs.href;
          if (attrs.attr) {
            Object.keys(attrs.attr).forEach(key => {
              if (key === 'style') {
                child.style.cssText = attrs.attr[key];
              } else {
                child.setAttribute(key, attrs.attr[key]);
              }
            });
          }
          // Handle other properties
          Object.keys(attrs).forEach(key => {
            if (!['text', 'cls', 'href', 'attr'].includes(key)) {
              child[key] = attrs[key];
            }
          });
        }
        this.appendChild(child);
        addObsidianMethods(child);
        return child;
      };
      el.createDiv = function(className, attrs) {
        return this.createEl('div', { cls: className, ...attrs });
      };
      el.createSpan = function(className, attrs) {
        return this.createEl('span', { cls: className, ...attrs });
      };
      el.createButton = function(className, attrs) {
        return this.createEl('button', { cls: className, ...attrs });
      };
      return el;
    }
    
    addObsidianMethods(this.containerEl);
    addObsidianMethods(this.contentEl);
    addObsidianMethods(this.modalEl);
    addObsidianMethods(this.bgEl);
    
    // Add modal container to the DOM structure
    this.containerEl.classList.add('modal-container');
    this.modalEl.classList.add('modal');
    this.containerEl.appendChild(this.modalEl);
    this.modalEl.appendChild(this.contentEl);
  }

  open() {
    document.body.appendChild(this.containerEl);
    this.onOpen();
  }

  close() {
    this.onClose();
    this.containerEl.remove();
  }

  onOpen() {}
  onClose() {}
}

export class FuzzySuggestModal extends Modal {
  constructor(app) {
    super(app);
    this.inputEl = document.createElement('input');
    this.resultContainerEl = document.createElement('div');
    this.contentEl.appendChild(this.inputEl);
    this.contentEl.appendChild(this.resultContainerEl);
  }

  getItems() {
    return [];
  }

  getItemText(item) {
    return String(item);
  }

  onChooseItem(item, evt) {}

  setPlaceholder(placeholder) {
    this.inputEl.placeholder = placeholder;
  }

  setInstructions(instructions) {
    // Mock implementation
  }
}

export class MarkdownView {
  constructor() {
    this.file = null;
    this.editor = {
      getValue: vi.fn(() => ''),
      setValue: vi.fn(),
      replaceRange: vi.fn(),
      getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
      setCursor: vi.fn(),
      getLine: vi.fn(() => ''),
      lastLine: vi.fn(() => 0),
      getSelection: vi.fn(() => ''),
      replaceSelection: vi.fn(),
    };
    this.contentEl = document.createElement('div');
    this.containerEl = document.createElement('div');
    this.leaf = {
      id: 'test-leaf-id',
      view: this,
    };
  }

  getViewType() {
    return 'markdown';
  }

  getMode() {
    return 'preview';
  }

  getFile() {
    return this.file;
  }
}

export class TFile {
  constructor(path) {
    this.path = path;
    this.basename = path.split('/').pop().replace('.md', '');
    this.extension = 'md';
    this.name = this.basename + '.' + this.extension;
    this.parent = null;
    this.stat = {
      mtime: Date.now(),
      ctime: Date.now(),
      size: 1000,
    };
  }
}

export class TFolder {
  constructor(path) {
    this.path = path;
    this.name = path.split('/').pop();
    this.parent = null;
    this.children = [];
  }

  isRoot() {
    return this.path === '/';
  }
}

export class Notice {
  constructor(message, timeout) {
    this.message = message;
    this.timeout = timeout;
    this.noticeEl = document.createElement('div');
    this.noticeEl.textContent = message;
  }

  setMessage(message) {
    this.message = message;
    this.noticeEl.textContent = message;
  }

  hide() {
    this.noticeEl.remove();
  }
}

export class PluginSettingTab {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }

  display() {}
  hide() {}
}

export class Setting {
  constructor(containerEl) {
    this.containerEl = containerEl;
    this.settingEl = document.createElement('div');
    this.infoEl = document.createElement('div');
    this.controlEl = document.createElement('div');
    this.components = []; // Track components for testing
    containerEl.appendChild(this.settingEl);
    this.settingEl.appendChild(this.infoEl);
    this.settingEl.appendChild(this.controlEl);
    
    // Add Obsidian methods to DOM elements
    function addObsidianMethods(el) {
      el.empty = function() { this.innerHTML = ''; return this; };
      el.addClass = function(className) { this.classList.add(className); return this; };
      el.removeClass = function(className) { this.classList.remove(className); return this; };
      el.toggleClass = function(className, force) { this.classList.toggle(className, force); return this; };
      el.hasClass = function(className) { return this.classList.contains(className); };
      el.setText = function(text) { this.textContent = text; return this; };
      el.createEl = function(tag, attrs) { 
        const child = document.createElement(tag);
        if (attrs) {
          if (attrs.text) child.textContent = attrs.text;
          if (attrs.cls) child.className = attrs.cls;
          if (attrs.href) child.href = attrs.href;
          if (attrs.attr) {
            Object.keys(attrs.attr).forEach(key => {
              if (key === 'style') {
                child.style.cssText = attrs.attr[key];
              } else {
                child.setAttribute(key, attrs.attr[key]);
              }
            });
          }
        }
        this.appendChild(child);
        addObsidianMethods(child);
        return child;
      };
      el.createDiv = function(className, attrs) {
        return this.createEl('div', { cls: className, ...attrs });
      };
      el.createSpan = function(className, attrs) {
        return this.createEl('span', { cls: className, ...attrs });
      };
      el.createButton = function(className, attrs) {
        return this.createEl('button', { cls: className, ...attrs });
      };
      return el;
    }
    
    addObsidianMethods(this.settingEl);
    addObsidianMethods(this.infoEl);
    addObsidianMethods(this.controlEl);
  }

  setName(name) {
    this.name = name;
    const nameEl = document.createElement('div');
    nameEl.textContent = name;
    this.infoEl.appendChild(nameEl);
    // Add data-name attribute for test selectors
    this.settingEl.setAttribute('data-name', name);
    return this._createChainableObject();
  }

  setDesc(desc) {
    this.desc = desc;
    const descEl = document.createElement('div');
    descEl.textContent = desc;
    this.infoEl.appendChild(descEl);
    return this._createChainableObject();
  }

  setClass(cls) {
    this.settingEl.classList.add(cls);
    return this._createChainableObject();
  }

  addText(cb) {
    const text = new TextComponent(this.controlEl);
    if (cb) cb(text);
    return this._createChainableObject();
  }

  addTextArea(cb) {
    const textArea = new TextAreaComponent(this.controlEl);
    if (cb) cb(textArea);
    return this._createChainableObject();
  }

  addToggle(cb) {
    const toggle = new ToggleComponent(this.controlEl);
    if (cb) cb(toggle);
    this.components.push(toggle);
    return this._createChainableObject();
  }

  addDropdown(cb) {
    const dropdown = new DropdownComponent(this.controlEl);
    if (cb) cb(dropdown);
    return this._createChainableObject();
  }

  addButton(cb) {
    const button = new ButtonComponent(this.controlEl);
    if (cb) cb(button);
    return this._createChainableObject();
  }

  addSlider(cb) {
    const slider = new SliderComponent(this.controlEl);
    if (cb) cb(slider);
    return this._createChainableObject();
  }

  addExtraButton(cb) {
    const button = new ExtraButtonComponent(this.controlEl);
    // Set reference to the setting's controlEl for proper DOM queries
    button.extraSettingsEl = this.controlEl;
    if (cb) cb(button);
    return this._createChainableObject();
  }

  addColorPicker(cb) {
    const colorPicker = new ColorPickerComponent(this.controlEl);
    if (cb) cb(colorPicker);
    return this._createChainableObject();
  }

  _createChainableObject() {
    const self = this;
    const chainable = Object.create(this);
    chainable.then = function(callback) {
      if (callback) {
        callback(self);
      }
      return self._createChainableObject();
    };
    return chainable;
  }
}

class TextComponent {
  constructor(containerEl) {
    this.inputEl = document.createElement('input');
    this.inputEl.type = 'text';
    containerEl.appendChild(this.inputEl);
  }

  setPlaceholder(placeholder) {
    this.inputEl.placeholder = placeholder;
    return this;
  }

  setValue(value) {
    this.inputEl.value = value;
    return this;
  }

  onChange(callback) {
    this.inputEl.addEventListener('change', (e) => callback(e.target.value));
    return this;
  }

  setDisabled(disabled) {
    this.inputEl.disabled = disabled;
    return this;
  }
}

class TextAreaComponent {
  constructor(containerEl) {
    this.inputEl = document.createElement('textarea');
    containerEl.appendChild(this.inputEl);
  }

  setPlaceholder(placeholder) {
    this.inputEl.placeholder = placeholder;
    return this;
  }

  setValue(value) {
    this.inputEl.value = value;
    return this;
  }

  onChange(callback) {
    this.inputEl.addEventListener('change', (e) => callback(e.target.value));
    return this;
  }
}

class ToggleComponent {
  constructor(containerEl) {
    // Create a wrapper container that matches Obsidian's structure
    this.container = document.createElement('div');
    this.container.className = 'checkbox-container';
    
    // Create the actual toggle input
    this.toggleEl = document.createElement('input');
    this.toggleEl.type = 'checkbox';
    this.container.appendChild(this.toggleEl);
    
    // Append container to parent
    containerEl.appendChild(this.container);
  }

  setValue(value) {
    this.toggleEl.checked = value;
    // Update the container class based on checked state
    if (value) {
      this.container.classList.add('is-enabled');
    } else {
      this.container.classList.remove('is-enabled');
    }
    return this;
  }

  onChange(callback) {
    this.toggleEl.addEventListener('change', (e) => {
      const checked = e.target.checked;
      // Update the container class when toggled
      if (checked) {
        this.container.classList.add('is-enabled');
      } else {
        this.container.classList.remove('is-enabled');
      }
      callback(checked);
    });
    return this;
  }

  setDisabled(disabled) {
    this.toggleEl.disabled = disabled;
    return this;
  }
}

class DropdownComponent {
  constructor(containerEl) {
    this.selectEl = document.createElement('select');
    containerEl.appendChild(this.selectEl);
    this.options = {};
  }

  addOption(value, display) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = display;
    this.selectEl.appendChild(option);
    this.options[value] = display;
    return this;
  }

  setValue(value) {
    this.selectEl.value = value;
    return this;
  }

  onChange(callback) {
    this.selectEl.addEventListener('change', (e) => callback(e.target.value));
    return this;
  }
}

class ButtonComponent {
  constructor(containerEl) {
    this.buttonEl = document.createElement('button');
    containerEl.appendChild(this.buttonEl);
  }

  setButtonText(text) {
    this.buttonEl.textContent = text;
    return this;
  }

  setCta() {
    this.buttonEl.classList.add('mod-cta');
    return this;
  }

  setWarning() {
    this.buttonEl.classList.add('mod-warning');
    return this;
  }

  onClick(callback) {
    this.buttonEl.addEventListener('click', callback);
    return this;
  }

  setDisabled(disabled) {
    this.buttonEl.disabled = disabled;
    return this;
  }
}

class SliderComponent {
  constructor(containerEl) {
    this.sliderEl = document.createElement('input');
    this.sliderEl.type = 'range';
    containerEl.appendChild(this.sliderEl);
  }

  setLimits(min, max, step) {
    this.sliderEl.min = min;
    this.sliderEl.max = max;
    this.sliderEl.step = step;
    return this;
  }

  setValue(value) {
    this.sliderEl.value = value;
    return this;
  }

  setDynamicTooltip() {
    return this;
  }

  onChange(callback) {
    this.sliderEl.addEventListener('input', (e) => callback(Number(e.target.value)));
    return this;
  }
}

class ExtraButtonComponent {
  constructor(containerEl) {
    this.buttonEl = document.createElement('button');
    this.extraSettingsEl = containerEl; // Reference to the container for DOM queries
    containerEl.appendChild(this.buttonEl);
  }

  setIcon(icon) {
    this.icon = icon;
    this.buttonEl.textContent = icon;
    return this;
  }

  setTooltip(tooltip) {
    this.tooltip = tooltip;
    this.buttonEl.title = tooltip;
    this.buttonEl.setAttribute('aria-label', tooltip);
    return this;
  }

  onClick(callback) {
    this.buttonEl.addEventListener('click', callback);
    return this;
  }
}

class ColorPickerComponent {
  constructor(containerEl) {
    this.inputEl = document.createElement('input');
    this.inputEl.type = 'color';
    containerEl.appendChild(this.inputEl);
  }

  setValue(value) {
    this.inputEl.value = value;
    return this;
  }

  onChange(callback) {
    this.inputEl.addEventListener('change', (e) => callback(e.target.value));
    return this;
  }

  setDisabled(disabled) {
    this.inputEl.disabled = disabled;
    return this;
  }
}

// Platform mock
export const Platform = {
  isDesktop: true,
  isDesktopApp: true,
  isMobile: false,
  isMobileApp: false,
  isIosApp: false,
  isAndroidApp: false,
};

// Request URL mock for API testing
export const requestUrl = vi.fn(async (options) => {
  return {
    status: 200,
    headers: {},
    arrayBuffer: new ArrayBuffer(0),
    json: {},
    text: '',
  };
});

// MetadataCache mock
export class MetadataCache {
  constructor() {
    this.fileCache = new Map();
    this.resolvedLinks = {};
    this.unresolvedLinks = {};
    this.on = vi.fn((event, callback) => ({ event, callback }));
    this.off = vi.fn();
  }

  getFileCache(file) {
    if (!file) return null;
    return this.fileCache.get(file.path) || null;
  }

  getFirstLinkpathDest(linkpath, sourcePath) {
    return null;
  }

  setFileCache(file, cache) {
    this.fileCache.set(file.path, cache);
  }
}

// Vault mock
export class Vault {
  constructor() {
    this.files = new Map();
    this.folders = new Map();
    this.adapter = {
      read: vi.fn(),
      write: vi.fn(),
      exists: vi.fn(() => Promise.resolve(true)),
      list: vi.fn(() => Promise.resolve({ files: [], folders: [] })),
    };
  }

  getAbstractFileByPath(path) {
    return this.files.get(path) || this.folders.get(path) || null;
  }

  async read(file) {
    return 'File content';
  }

  async modify(file, content) {
    // Mock implementation
  }

  async create(path, content) {
    const file = new TFile(path);
    this.files.set(path, file);
    return file;
  }

  async createBinary(path, data) {
    const file = new TFile(path);
    this.files.set(path, file);
    return file;
  }

  async delete(file) {
    this.files.delete(file.path);
  }

  getFiles() {
    return Array.from(this.files.values());
  }

  getFolderByPath(path) {
    return this.folders.get(path) || null;
  }
}

// Workspace mock
export class Workspace {
  constructor() {
    this.activeLeaf = null;
    this.leftSplit = { collapsed: false };
    this.rightSplit = { collapsed: false };
    this.layoutReady = true;
    this.leaves = []; // Track all leaves, not just active one
  }

  getActiveViewOfType(type) {
    if (type === MarkdownView && this.activeLeaf) {
      return this.activeLeaf.view;
    }
    return null;
  }

  getActiveFile() {
    if (this.activeLeaf && this.activeLeaf.view) {
      return this.activeLeaf.view.file;
    }
    return null;
  }

  getLeavesOfType(type) {
    return [];
  }

  on(event, callback) {
    return { event, callback };
  }

  off(event, callback) {}

  iterateAllLeaves(callback) {
    if (this.activeLeaf) {
      callback(this.activeLeaf);
    }
  }

  getLeafById(leafId) {
    // Mock implementation - search through all tracked leaves
    return this.leaves.find(leaf => leaf.id === leafId) || null;
  }

  // Helper method to register leaves in tests
  addLeaf(leaf) {
    if (!this.leaves.find(l => l.id === leaf.id)) {
      this.leaves.push(leaf);
    }
    if (!this.activeLeaf) {
      this.activeLeaf = leaf;
    }
  }
}

// App mock
export class App {
  constructor() {
    this.vault = new Vault();
    this.workspace = new Workspace();
    this.metadataCache = new MetadataCache();
    this.fileManager = {
      processFrontMatter: vi.fn((file, callback) => {
        const cache = this.metadataCache.getFileCache(file);
        const frontmatter = cache?.frontmatter || {};
        callback(frontmatter);
      }),
    };
  }
}

// Export components
export {
  TextComponent,
  TextAreaComponent,
  ToggleComponent,
  DropdownComponent,
  ButtonComponent,
  SliderComponent,
  ColorPickerComponent,
};

// Helper to create mock manifest
export function createMockManifest(overrides = {}) {
  return {
    id: 'pixel-banner',
    name: 'Pixel Banner',
    version: '1.0.0',
    minAppVersion: '1.6.0',
    description: 'Test plugin',
    author: 'Test Author',
    ...overrides,
  };
}

// Helper to create mock app
export function createMockApp() {
  return new App();
}

// Helper to create mock plugin
export function createMockPlugin(app = createMockApp(), manifest = createMockManifest()) {
  return new Plugin(app, manifest);
}