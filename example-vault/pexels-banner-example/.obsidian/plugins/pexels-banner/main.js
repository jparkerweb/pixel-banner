/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/main.js
var { Plugin, PluginSettingTab, Setting, requestUrl, FuzzySuggestModal, MarkdownView } = require("obsidian");
var DEFAULT_SETTINGS = {
  apiKey: "",
  imageSize: "medium",
  imageOrientation: "landscape",
  numberOfImages: 10,
  defaultKeywords: "nature, abstract, landscape, technology, art, cityscape, wildlife, ocean, mountains, forest, space, architecture, food, travel, science, music, sports, fashion, business, education, health, culture, history, weather, transportation, industry, people, animals, plants, patterns",
  yPosition: 50,
  customBannerField: "pexels-banner",
  customYPositionField: "pexels-banner-y-position",
  folderImages: [],
  // Add this new field
  contentStartPosition: 150,
  customContentStartField: "pexels-banner-content-start"
};
var FolderSuggestModal = class extends FuzzySuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
  }
  getItems() {
    return this.app.vault.getAllLoadedFiles().filter((file) => file.children).map((folder) => folder.path);
  }
  getItemText(item) {
    return item;
  }
  onChooseItem(item) {
    this.onChoose(item);
  }
};
var FolderImageSetting = class extends Setting {
  constructor(containerEl, plugin, folderImage, index) {
    super(containerEl);
    this.plugin = plugin;
    this.folderImage = folderImage;
    this.index = index;
    this.setClass("folder-image-setting");
    this.settingEl.empty();
    const infoEl = this.settingEl.createDiv("setting-item-info");
    infoEl.createDiv("setting-item-name");
    infoEl.createDiv("setting-item-description");
    this.addFolderInput();
    this.addImageInput();
    this.addPositions();
  }
  addFolderInput() {
    const folderInputContainer = this.settingEl.createDiv("folder-input-container");
    const folderInput = new Setting(folderInputContainer).setName("folder path").addText((text) => {
      text.setValue(this.folderImage.folder || "").onChange(async (value) => {
        this.folderImage.folder = value;
        await this.plugin.saveSettings();
      });
      this.folderInputEl = text.inputEl;
      this.folderInputEl.style.width = "300px";
    });
    folderInput.addButton((button) => button.setButtonText("Browse").onClick(() => {
      new FolderSuggestModal(this.plugin.app, (chosenPath) => {
        this.folderImage.folder = chosenPath;
        this.folderInputEl.value = chosenPath;
        this.plugin.saveSettings();
      }).open();
    }));
  }
  addImageInput() {
    const folderInputContainer = this.settingEl.createDiv("folder-input-container");
    const imageInput = new Setting(folderInputContainer).setName("image url or keyword").addText((text) => {
      text.setValue(this.folderImage.image || "").onChange(async (value) => {
        this.folderImage.image = value;
        await this.plugin.saveSettings();
      });
      this.imageInputEl = text.inputEl;
      this.imageInputEl.style.width = "306px";
    });
  }
  addPositions() {
    const controlEl = this.settingEl.createDiv("setting-item-control");
    this.addYPositionInput(controlEl);
    this.addContentStartInput(controlEl);
    this.addDeleteButton(controlEl);
  }
  addYPositionInput(containerEl) {
    const label = containerEl.createEl("label", { text: "y-position" });
    label.style.fontSize = "12px";
    const slider = containerEl.createEl("input", {
      type: "range",
      cls: "slider",
      attr: {
        min: "0",
        max: "100",
        step: "1"
      }
    });
    slider.value = this.folderImage.yPosition || "50";
    slider.style.marginLeft = "20px";
    slider.addEventListener("change", async () => {
      this.folderImage.yPosition = parseInt(slider.value);
      await this.plugin.saveSettings();
    });
    label.appendChild(slider);
  }
  addContentStartInput(containerEl) {
    const label = containerEl.createEl("label", { text: "content start position" });
    label.style.fontSize = "12px";
    label.style.marginLeft = "25px";
    const contentStartInput = containerEl.createEl("input", {
      type: "number",
      attr: {
        min: "0"
      }
    });
    contentStartInput.style.width = "50px";
    contentStartInput.style.marginLeft = "20px";
    contentStartInput.value = this.folderImage.contentStartPosition || "150";
    contentStartInput.addEventListener("change", async () => {
      this.folderImage.contentStartPosition = parseInt(contentStartInput.value);
      await this.plugin.saveSettings();
    });
    label.appendChild(contentStartInput);
  }
  addDeleteButton(containerEl) {
    const deleteButton = containerEl.createEl("button");
    deleteButton.style.marginLeft = "20px";
    deleteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-trash-2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
    deleteButton.addEventListener("click", async () => {
      this.plugin.settings.folderImages.splice(this.index, 1);
      await this.plugin.saveSettings();
      this.settingEl.remove();
    });
    deleteButton.addEventListener("mouseover", () => {
      deleteButton.style.color = "red";
    });
    deleteButton.addEventListener("mouseout", () => {
      deleteButton.style.color = "";
    });
  }
};
module.exports = class PexelsBannerPlugin extends Plugin {
  constructor() {
    super(...arguments);
    __publicField(this, "debounceTimer", null);
    __publicField(this, "loadedImages", /* @__PURE__ */ new Map());
    __publicField(this, "lastKeywords", /* @__PURE__ */ new Map());
    __publicField(this, "imageCache", /* @__PURE__ */ new Map());
    __publicField(this, "rateLimiter", {
      lastRequestTime: 0,
      minInterval: 1e3
      // 1 second between requests
    });
    __publicField(this, "lastYPositions", /* @__PURE__ */ new Map());
    __publicField(this, "debouncedEnsureBanner", debounce(() => {
      const activeLeaf = this.app.workspace.activeLeaf;
      if (activeLeaf && activeLeaf.view instanceof MarkdownView) {
        this.updateBanner(activeLeaf.view, false);
      }
    }, 100));
    // Update the debouncedHandleScroll to use the class method
    __publicField(this, "debouncedHandleScroll", this.debounce(() => {
      console.log("Scroll event detected (debounced)");
      this.checkAndReaddBanner();
    }, 200));
    // Keep this debounced version
    __publicField(this, "debouncedHandleMetadataChange", this.debounce((file) => {
      this.handleMetadataChange(file);
    }, 500));
    __publicField(this, "updateBannerDebounced", this.debounce(this.updateBanner.bind(this), 300));
  }
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new PexelsBannerSettingTab(this.app, this));
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", this.handleActiveLeafChange.bind(this))
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", this.handleMetadataChange.bind(this))
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", this.handleLayoutChange.bind(this))
    );
    this.registerEvent(
      this.app.workspace.on("mode-change", this.handleModeChange.bind(this))
    );
    this.registerMarkdownPostProcessor(this.postProcessor.bind(this));
    this.setupMutationObserver();
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    if (!Array.isArray(this.settings.folderImages)) {
      this.settings.folderImages = [];
    }
  }
  async saveSettings() {
    await this.saveData(this.settings);
    this.loadedImages.clear();
    this.lastKeywords.clear();
    this.imageCache.clear();
    const activeLeaf = this.app.workspace.activeLeaf;
    if (activeLeaf && activeLeaf.view.getViewType() === "markdown") {
      console.log("saveSettings", activeLeaf.view);
      await this.updateBanner(activeLeaf.view, true);
    }
  }
  async handleActiveLeafChange(leaf) {
    if (leaf && leaf.view instanceof MarkdownView && leaf.view.file) {
      await this.updateBanner(leaf.view, false);
    }
  }
  async handleMetadataChange(file) {
    const activeLeaf = this.app.workspace.activeLeaf;
    if (activeLeaf && activeLeaf.view instanceof MarkdownView && activeLeaf.view.file && activeLeaf.view.file === file) {
      await this.updateBanner(activeLeaf.view, true);
    }
  }
  handleLayoutChange() {
    setTimeout(() => {
      const activeLeaf = this.app.workspace.activeLeaf;
      if (activeLeaf && (activeLeaf.view instanceof MarkdownView || activeLeaf.view.getViewType() === "markdown")) {
        this.updateBanner(activeLeaf.view, false);
      }
    }, 100);
  }
  async handleModeChange(leaf) {
    if (leaf && leaf.view instanceof MarkdownView && leaf.view.file) {
      await this.updateBanner(leaf.view, true);
    }
  }
  async updateBanner(view, isContentChange) {
    var _a;
    if (!view || !view.file) {
      console.log("View or file is undefined, skipping banner update");
      return;
    }
    const frontmatter = (_a = this.app.metadataCache.getFileCache(view.file)) == null ? void 0 : _a.frontmatter;
    const contentEl = view.contentEl;
    const customBannerField = this.settings.customBannerField;
    const customYPositionField = this.settings.customYPositionField;
    const customYPosition = frontmatter && (frontmatter[customYPositionField] || frontmatter["pexels-banner-y"]);
    let yPosition = customYPosition !== void 0 ? customYPosition : this.settings.yPosition;
    let bannerImage = frontmatter && frontmatter[customBannerField];
    if (!bannerImage) {
      const folderSpecific = this.getFolderSpecificImage(view.file.path);
      if (folderSpecific) {
        bannerImage = folderSpecific.image;
        yPosition = customYPosition !== void 0 ? customYPosition : folderSpecific.yPosition;
      }
    }
    if (isContentChange) {
      this.loadedImages.delete(view.file.path);
      this.lastKeywords.delete(view.file.path);
    }
    await this.addPexelsBanner(contentEl, {
      frontmatter,
      file: view.file,
      isContentChange,
      yPosition,
      customBannerField,
      customYPositionField,
      customContentStartField: this.settings.customContentStartField,
      bannerImage,
      isReadingView: view.getMode() === "preview"
    });
    this.lastYPositions.set(view.file.path, yPosition);
  }
  async addPexelsBanner(el, ctx) {
    var _a, _b, _c;
    const { frontmatter, file, isContentChange, yPosition, bannerImage, isReadingView } = ctx;
    const viewContent = el;
    if (!viewContent.classList.contains("view-content")) {
      console.log(`not the right element: ${(_a = el.classList) == null ? void 0 : _a.toString()}`);
      return;
    }
    viewContent.classList.toggle("pexels-banner", !!bannerImage);
    let container = isReadingView ? viewContent.querySelector(".markdown-preview-sizer:not(.internal-embed .markdown-preview-sizer)") : viewContent.querySelector(".cm-sizer");
    if (!container) {
      console.log(`no container`);
      return;
    } else {
      console.log(`container: ${(_b = container.classList) == null ? void 0 : _b.toString()}`);
    }
    let bannerDiv = container.querySelector(":scope > .pexels-banner-image");
    if (!bannerDiv) {
      bannerDiv = createDiv({ cls: "pexels-banner-image" });
      container.insertBefore(bannerDiv, container.firstChild);
    } else {
      console.log(`bannerDiv already exists. Parent: ${(_c = bannerDiv.parentElement.classList) == null ? void 0 : _c.toString()}`);
    }
    if (bannerImage) {
      let imageUrl = this.loadedImages.get(file.path);
      const lastInput = this.lastKeywords.get(file.path);
      if (!imageUrl || isContentChange && input !== lastInput) {
        imageUrl = await this.getImageUrl(this.getInputType(bannerImage), bannerImage);
        if (imageUrl) {
          this.loadedImages.set(file.path, imageUrl);
          this.lastKeywords.set(file.path, bannerImage);
        }
      }
      if (imageUrl) {
        bannerDiv.style.backgroundImage = `url('${imageUrl}')`;
        bannerDiv.style.backgroundPosition = `center ${yPosition}%`;
        bannerDiv.style.display = "block";
      }
    } else {
      bannerDiv.style.display = "none";
      this.loadedImages.delete(file.path);
      this.lastKeywords.delete(file.path);
    }
    this.applyContentStartPosition(viewContent, this.settings.contentStartPosition);
  }
  setupMutationObserver() {
    this.observer = new MutationObserver((mutations) => {
      for (let mutation of mutations) {
        if (mutation.type === "childList") {
          const removedNodes = Array.from(mutation.removedNodes);
          const addedNodes = Array.from(mutation.addedNodes);
          const bannerRemoved = removedNodes.some(
            (node) => node.classList && node.classList.contains("pexels-banner-image")
          );
          const contentChanged = addedNodes.some(
            (node) => node.nodeType === Node.ELEMENT_NODE && (node.classList.contains("markdown-preview-section") || node.classList.contains("cm-content"))
          );
          if (bannerRemoved || contentChanged) {
            this.debouncedEnsureBanner();
          }
        }
      }
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  getFolderSpecificImage(filePath) {
    const folderPath = this.getFolderPath(filePath);
    for (const folderImage of this.settings.folderImages) {
      if (folderPath.startsWith(folderImage.folder)) {
        return {
          image: folderImage.image,
          yPosition: folderImage.yPosition,
          contentStartPosition: folderImage.contentStartPosition
        };
      }
    }
    return null;
  }
  getFolderPath(filePath) {
    const lastSlashIndex = filePath.lastIndexOf("/");
    return lastSlashIndex !== -1 ? filePath.substring(0, lastSlashIndex) : "";
  }
  // Keep only one debounce method
  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  async checkAndReaddBanner() {
    console.log("checkAndReaddBanner called");
    const activeLeaf = this.app.workspace.activeLeaf;
    if (activeLeaf && activeLeaf.view instanceof MarkdownView) {
      console.log("Checking banner existence");
      const view = activeLeaf.view;
      const containers = this.findBannerContainers(view.contentEl);
      let bannerExists = false;
      for (const container of containers) {
        const bannerDiv = container.querySelector(":scope > .pexels-banner-image");
        if (bannerDiv) {
          bannerExists = true;
          break;
        }
      }
      if (!bannerExists) {
        console.log("Banner not found, re-adding");
        await this.updateBanner(view, false);
      } else {
        console.log("Banner exists");
      }
    }
  }
  async getImageUrl(inputType, input2) {
    switch (inputType) {
      case "url":
        return input2;
      case "vaultPath":
        return await this.getVaultImageUrl(input2);
      case "obsidianLink":
        const resolvedFile = this.getPathFromObsidianLink(input2);
        return resolvedFile ? await this.getVaultImageUrl(resolvedFile.path) : null;
      case "keyword":
        return await this.fetchPexelsImage(input2);
      default:
        return null;
    }
  }
  preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = reject;
      img.src = url;
    });
  }
  async fetchPexelsImage(keyword) {
    if (this.imageCache.has(keyword)) {
      return this.imageCache.get(keyword);
    }
    const now = Date.now();
    if (now - this.rateLimiter.lastRequestTime < this.rateLimiter.minInterval) {
      await new Promise((resolve) => setTimeout(resolve, this.rateLimiter.minInterval));
    }
    this.rateLimiter.lastRequestTime = Date.now();
    const defaultKeywords = this.settings.defaultKeywords.split(",").map((k) => k.trim());
    const fallbackKeyword = defaultKeywords[Math.floor(Math.random() * defaultKeywords.length)];
    const keywords = [keyword, fallbackKeyword];
    for (const currentKeyword of keywords) {
      try {
        const response = await requestUrl({
          url: `https://api.pexels.com/v1/search?query=${encodeURIComponent(currentKeyword)}&per_page=${this.settings.numberOfImages}&size=${this.settings.imageSize}&orientation=${this.settings.imageOrientation}`,
          method: "GET",
          headers: {
            "Authorization": this.settings.apiKey
          }
        });
        if (response.status !== 200) {
          console.error("Failed to fetch images:", response.status, response.text);
          return null;
        }
        const data = response.json;
        if (data.photos && data.photos.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.photos.length);
          if (currentKeyword !== keyword) {
            console.log(`No image found for "${keyword}". Using image for "${currentKeyword}" instead.`);
          }
          const imageUrl = data.photos[randomIndex].src.original;
          this.imageCache.set(keyword, imageUrl);
          try {
            await this.preloadImage(imageUrl);
          } catch (error) {
            console.error(`Failed to preload image: ${error.message}`);
          }
          return imageUrl;
        } else if (currentKeyword === keyword) {
          console.log(`No image found for the provided keyword: "${keyword}". Trying a random default keyword.`);
        }
      } catch (error) {
        console.error(`Error fetching image from Pexels API for keyword "${currentKeyword}":`, error);
        new Notice(`Failed to fetch image: ${error.message}`);
      }
    }
    console.error("No images found for any keywords, including the random default.");
    return null;
  }
  getInputType(input2) {
    if (typeof input2 !== "string") {
      return "invalid";
    }
    input2 = input2.trim().replace(/^["'](.*)["']$/, "$1");
    if (input2.includes("[[") && input2.includes("]]")) {
      return "obsidianLink";
    }
    try {
      new URL(input2);
      return "url";
    } catch (_) {
      const file = this.app.vault.getAbstractFileByPath(input2);
      if (file && "extension" in file) {
        if (file.extension.match(/^(jpg|jpeg|png|gif|bmp|svg)$/i)) {
          return "vaultPath";
        }
      }
      return "keyword";
    }
  }
  getPathFromObsidianLink(link) {
    let innerLink = link.startsWith("[[") ? link.slice(2) : link;
    innerLink = innerLink.endsWith("]]") ? innerLink.slice(0, -2) : innerLink;
    const path = innerLink.split("|")[0];
    return this.app.metadataCache.getFirstLinkpathDest(path, "");
  }
  async getVaultImageUrl(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file && "extension" in file) {
      try {
        const arrayBuffer = await this.app.vault.readBinary(file);
        const blob = new Blob([arrayBuffer], { type: `image/${file.extension}` });
        return URL.createObjectURL(blob);
      } catch (error) {
        console.error("Error reading vault image:", error);
        return null;
      }
    }
    return null;
  }
  updateAllBanners() {
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view.getViewType() === "markdown") {
        console.log("updateAllBanners", leaf.view);
        this.updateBanner(leaf.view, true);
      }
    });
  }
  async postProcessor(el, ctx) {
    const frontmatter = ctx.frontmatter;
    if (frontmatter && frontmatter[this.settings.customBannerField]) {
      await this.addPexelsBanner(el, {
        frontmatter,
        file: ctx.sourcePath,
        isContentChange: false,
        yPosition: frontmatter[this.settings.customYPositionField] || this.settings.yPosition,
        customBannerField: this.settings.customBannerField,
        customYPositionField: this.settings.customYPositionField,
        customContentStartField: this.settings.customContentStartField,
        bannerImage: frontmatter[this.settings.customBannerField]
      });
    }
  }
  onunload() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
  applyContentStartPosition(el, contentStartPosition) {
    el.style.setProperty("--pexels-banner-content-start", `${contentStartPosition}px`);
  }
};
var PexelsBannerSettingTab = class extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("pexels-banner-settings");
    const mainContent = containerEl.createEl("div", { cls: "pexels-banner-main-content" });
    new Setting(mainContent).setName("API key").setDesc("Enter your Pexels API key. This is only required if you want to fetch images from Pexels using keywords. It's not needed for using direct URLs or local images.").addText(
      (text) => text.setPlaceholder("Enter your API key").setValue(this.plugin.settings.apiKey).onChange(async (value) => {
        this.plugin.settings.apiKey = value;
        await this.plugin.saveSettings();
      })
    ).then((setting) => {
      setting.settingEl.addClass("flex-column");
      setting.settingEl.querySelector(".setting-item-control").style.width = "100%";
      setting.controlEl.querySelector("input").style.width = "100%";
      setting.controlEl.style.display = "block";
      setting.controlEl.style.marginTop = "10px";
    });
    new Setting(mainContent).setName("Images").setDesc("Configure settings for images fetched from Pexels. These settings apply when using keywords to fetch random images.").setHeading();
    new Setting(mainContent).setName("Size").setDesc("Select the size of the image - (Pexels API only)").addDropdown((dropdown) => dropdown.addOption("small", "Small").addOption("medium", "Medium").addOption("large", "Large").setValue(this.plugin.settings.imageSize).onChange(async (value) => {
      this.plugin.settings.imageSize = value;
      await this.plugin.saveSettings();
    }));
    new Setting(mainContent).setName("Orientation").setDesc("Select the orientation of the image - (Pexels API only)").addDropdown((dropdown) => dropdown.addOption("landscape", "Landscape").addOption("portrait", "Portrait").addOption("square", "Square").setValue(this.plugin.settings.imageOrientation).onChange(async (value) => {
      this.plugin.settings.imageOrientation = value;
      await this.plugin.saveSettings();
    }));
    new Setting(mainContent).setName("Number of images").setDesc("Enter the number of random images to fetch (1-50) - (Pexels API only)").addText((text) => text.setPlaceholder("10").setValue(String(this.plugin.settings.numberOfImages || 10)).onChange(async (value) => {
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue >= 1 && numValue <= 50) {
        this.plugin.settings.numberOfImages = numValue;
        await this.plugin.saveSettings();
      }
    })).then((setting) => {
      const inputEl = setting.controlEl.querySelector("input");
      inputEl.type = "number";
      inputEl.min = "1";
      inputEl.max = "50";
      inputEl.style.width = "50px";
    });
    new Setting(mainContent).setName("Default keywords").setDesc("Enter a comma-separated list of default keywords to be used when no keyword is provided in the frontmatter, or when the provided keyword does not return any results. - (Pexels API only)").addTextArea(
      (text) => text.setPlaceholder("Enter keywords, separated by commas").setValue(this.plugin.settings.defaultKeywords).onChange(async (value) => {
        this.plugin.settings.defaultKeywords = value;
        await this.plugin.saveSettings();
      })
    ).addExtraButton(
      (button) => button.setIcon("reset").setTooltip("Reset to default").onClick(async () => {
        this.plugin.settings.defaultKeywords = DEFAULT_SETTINGS.defaultKeywords;
        await this.plugin.saveSettings();
        this.display();
      })
    ).then((setting) => {
      setting.settingEl.addClass("flex-column");
      setting.settingEl.querySelector(".setting-item-control").style.width = "100%";
      const textarea = setting.controlEl.querySelector("textarea");
      textarea.style.width = "100%";
      textarea.style.minWidth = "100%";
      textarea.style.height = "100px";
      setting.controlEl.style.display = "block";
      setting.controlEl.style.marginTop = "10px";
    });
    new Setting(mainContent).setName("Image Vertical Position").setDesc("Set the vertical position of the image (0-100)").addSlider(
      (slider) => slider.setLimits(0, 100, 1).setValue(this.plugin.settings.yPosition).setDynamicTooltip().onChange(async (value) => {
        this.plugin.settings.yPosition = value;
        await this.plugin.saveSettings();
        this.plugin.updateAllBanners();
      })
    );
    new Setting(mainContent).setName("Content Start Position").setDesc("Set the default vertical position where the content starts (in pixels)").addText((text) => text.setPlaceholder("150").setValue(String(this.plugin.settings.contentStartPosition)).onChange(async (value) => {
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue >= 0) {
        this.plugin.settings.contentStartPosition = numValue;
        await this.plugin.saveSettings();
        this.plugin.updateAllBanners();
      }
    })).then((setting) => {
      const inputEl = setting.controlEl.querySelector("input");
      inputEl.type = "number";
      inputEl.min = "0";
      inputEl.style.width = "60px";
    });
    new Setting(mainContent).setName("Custom Field Names").setDesc("Customize the frontmatter field names used for the banner and Y-position. This allows you to use different field names in your notes.").setHeading();
    const validateFieldName = (value, otherFieldName) => {
      if (value === otherFieldName) {
        new Notice("Field names must be unique!");
        return false;
      }
      return true;
    };
    new Setting(mainContent).setName("Banner Field Name").setDesc("Set a custom field name for the banner in frontmatter").addText((text) => {
      text.setPlaceholder("pexels-banner").setValue(this.plugin.settings.customBannerField).onChange(async (value) => {
        if (validateFieldName(value, this.plugin.settings.customYPositionField) && validateFieldName(value, this.plugin.settings.customContentStartField)) {
          this.plugin.settings.customBannerField = value;
          await this.plugin.saveSettings();
        } else {
          text.setValue(this.plugin.settings.customBannerField);
        }
      });
      text.inputEl.style.width = "220px";
    }).addExtraButton((button) => button.setIcon("reset").setTooltip("Reset to default").onClick(async () => {
      this.plugin.settings.customBannerField = DEFAULT_SETTINGS.customBannerField;
      await this.plugin.saveSettings();
      this.display();
    }));
    new Setting(mainContent).setName("Y-Position Field Name").setDesc("Set a custom field name for the Y-position in frontmatter").addText((text) => {
      text.setPlaceholder("pexels-banner-y-position").setValue(this.plugin.settings.customYPositionField).onChange(async (value) => {
        if (validateFieldName(value, this.plugin.settings.customBannerField) && validateFieldName(value, this.plugin.settings.customContentStartField)) {
          this.plugin.settings.customYPositionField = value;
          await this.plugin.saveSettings();
        } else {
          text.setValue(this.plugin.settings.customYPositionField);
        }
      });
      text.inputEl.style.width = "220px";
    }).addExtraButton((button) => button.setIcon("reset").setTooltip("Reset to default").onClick(async () => {
      this.plugin.settings.customYPositionField = DEFAULT_SETTINGS.customYPositionField;
      await this.plugin.saveSettings();
      this.display();
    }));
    new Setting(mainContent).setName("Content Start Position Field Name").setDesc("Set a custom field name for the content start position in frontmatter").addText((text) => {
      text.setPlaceholder("pexels-banner-content-start").setValue(this.plugin.settings.customContentStartField).onChange(async (value) => {
        if (validateFieldName(value, this.plugin.settings.customBannerField) && validateFieldName(value, this.plugin.settings.customYPositionField)) {
          this.plugin.settings.customContentStartField = value;
          await this.plugin.saveSettings();
        } else {
          text.setValue(this.plugin.settings.customContentStartField);
        }
      });
      text.inputEl.style.width = "220px";
    }).addExtraButton((button) => button.setIcon("reset").setTooltip("Reset to default").onClick(async () => {
      this.plugin.settings.customContentStartField = DEFAULT_SETTINGS.customContentStartField;
      await this.plugin.saveSettings();
      this.display();
    }));
    new Setting(mainContent).setName("Folder Images").setDesc("Set default banner images for specific folders. These will apply to all notes in the folder unless overridden by note-specific settings.").setHeading();
    const folderImagesContainer = mainContent.createDiv("folder-images-container");
    this.plugin.settings.folderImages.forEach((folderImage, index) => {
      new FolderImageSetting(folderImagesContainer, this.plugin, folderImage, index);
    });
    new Setting(folderImagesContainer).addButton((button) => button.setButtonText("Add Folder Image").onClick(async () => {
      this.plugin.settings.folderImages.push({ folder: "", image: "", yPosition: 50, contentStartPosition: 150 });
      await this.plugin.saveSettings();
      this.display();
    }));
    new Setting(mainContent).setName("How to use").setHeading();
    const instructionsEl = mainContent.createEl("div", { cls: "pexels-banner-section" });
    instructionsEl.createEl("p", { text: `Add a "pexels-banner" field to your note's frontmatter with keywords for the image you want, or a direct URL to an image. You can also specify a custom y-position for the image.` });
    const codeEl = instructionsEl.createEl("pre");
    codeEl.createEl("code", {
      text: `---
pexels-banner: blue turtle
pexels-banner-y: 30
pexels-banner-content-start: 200
---

# Or use a direct URL:
---
pexels-banner: https://example.com/image.jpg
pexels-banner-y: 70
pexels-banner-content-start: 180
---

# Or use a path to an image in the vault:
---
pexels-banner: Assets/my-image.png
pexels-banner-y: 0
pexels-banner-content-start: 100
---

# Or use an Obsidian internal link:
---
pexels-banner: [[example-image.png]]
pexels-banner-y: 100
pexels-banner-content-start: 50
---`
    });
    const exampleImg = containerEl.createEl("img", {
      attr: {
        src: "https://raw.githubusercontent.com/jparkerweb/pexels-banner/main/example.jpg",
        alt: "Example of a Pexels banner",
        style: "max-width: 100%; height: auto; margin-top: 10px; border-radius: 5px;"
      }
    });
    const footerEl = containerEl.createEl("div", { cls: "pexels-banner-footer" });
    footerEl.createEl("p", {
      text: "All settings are saved and applied automatically when changed.",
      cls: "pexels-banner-footer-text"
    });
  }
};
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}