import { PluginSettingTab, FuzzySuggestModal } from 'obsidian';
import { createExampleSettings } from './tabs/settingsTabExample';
import { createAPISettings } from './tabs/settingsTabAPISettings';
import { createFolderSettings } from './tabs/settingsTabFolderImages';
import { createCustomFieldsSettings } from './tabs/settingsTabCustomFieldNames';
import { createGeneralSettings } from './tabs/settingsTabGeneral';

const DEFAULT_SETTINGS = {
    pixelBannerPlusEmail: '',
    pixelBannerPlusApiKey: '',
    apiProvider: 'all',
    pexelsApiKey: '',
    pixabayApiKey: '',
    flickrApiKey: '',
    unsplashApiKey: '',
    imageSize: 'medium',
    imageOrientation: 'landscape',
    numberOfImages: 10,
    defaultKeywords: 'nature, abstract, landscape, technology, art, cityscape, wildlife, ocean, mountains, forest, space, architecture, food, travel, science, music, sports, fashion, business, education, health, culture, history, weather, transportation, industry, people, animals, plants, patterns',
    yPosition: 50,
    xPosition: 50,
    customBannerField: ['banner'],
    customYPositionField: ['banner-y, y'],
    customXPositionField: ['banner-x, x'],
    customContentStartField: ['content-start'],
    customImageDisplayField: ['banner-display'],
    customImageRepeatField: ['banner-repeat'],
    customBannerHeightField: ['banner-height'],
    customFadeField: ['banner-fade'],
    customBorderRadiusField: ['banner-radius'],
    customTitleColorField: ['banner-inline-title-color'],
    customBannerShuffleField: ['banner-shuffle'],
    customBannerIconField: ['icon'],
    customBannerIconSizeField: ['icon-size'],
    customBannerIconXPositionField: ['icon-x'],
    customBannerIconOpacityField: ['icon-opacity'],
    customBannerIconColorField: ['icon-color'],
    customBannerIconFontWeightField: ['icon-font-weight'],
    customBannerIconBackgroundColorField: ['icon-bg-color'],
    customBannerIconPaddingXField: ['icon-padding-x'],
    customBannerIconPaddingYField: ['icon-padding-y'],
    customBannerIconBorderRadiusField: ['icon-border-radius'],
    customBannerIconVeritalOffsetField: ['icon-y'],
    folderImages: [],
    contentStartPosition: 275,
    imageDisplay: 'cover',
    imageRepeat: false,
    bannerHeight: 350,
    fade: -75,
    bannerFadeInAnimationDuration: 300,
    borderRadius: 17,
    showPinIcon: true,
    pinnedImageFolder: 'pixel-banner-images',
    showReleaseNotes: true,
    lastVersion: null,
    showRefreshIcon: true,
    showViewImageIcon: false,
    hidePixelBannerFields: false,
    hidePropertiesSectionIfOnlyBanner: false,
    titleColor: 'var(--inline-title-color)',
    enableImageShuffle: false,
    hideEmbeddedNoteTitles: false,
    hideEmbeddedNoteBanners: false,
    showSelectImageIcon: true,
    defaultSelectImagePath: '',
    useShortPath: true,
    bannerGap: 12,
    bannerIconSize: 70,
    bannerIconXPosition: 25,
    bannerIconOpacity: 100,
    bannerIconColor: '',
    bannerIconFontWeight: 'normal',
    bannerIconBackgroundColor: '',
    bannerIconPaddingX: '0',
    bannerIconPaddingY: '0',
    bannerIconBorderRadius: '17',
    bannerIconVeritalOffset: '0',
};

class FolderSuggestModal extends FuzzySuggestModal {
    constructor(app, onChoose) {
        super(app);
        this.onChoose = onChoose;
    }

    getItems() {
        return this.app.vault.getAllLoadedFiles()
            .filter(file => file.children)
            .map(folder => folder.path);
    }

    getItemText(item) {
        return item;
    }

    onChooseItem(item) {
        this.onChoose(item);
    }
}

class PixelBannerSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('pixel-banner-settings');

        const mainContent = containerEl.createEl('div', { cls: 'pixel-banner-main-content' });

        // Create tabs in the desired order
        const { tabsEl, tabContentContainer } = this.createTabs(mainContent, [
            'General',
            'Custom Field Names',
            'Folder Images',
            'API Settings',
            'Examples'
        ]);

        // General tab content
        const generalTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': 'General' } });
        createGeneralSettings(generalTab, this.plugin);

        // Custom Fields tab content
        const customFieldsTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': 'Custom Field Names' } });
        createCustomFieldsSettings(customFieldsTab, this.plugin);

        // API Settings tab content
        const apiTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': 'API Settings' } });
        createAPISettings(apiTab, this.plugin);

        // Folder Images tab content
        const foldersTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': 'Folder Images' } });
        createFolderSettings(foldersTab, this.plugin);

        // Examples tab content
        const examplesTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': 'Examples' } });
        createExampleSettings(examplesTab, this.plugin);

        // Activate the General tab by default
        tabsEl.firstChild.click();
    }

    createTabs(containerEl, tabNames) {
        const tabsEl = containerEl.createEl('div', { cls: 'pixel-banner-settings-tabs' });
        const tabContentContainer = containerEl.createEl('div', { cls: 'pixel-banner-settings-tab-content-container' });

        tabNames.forEach(tabName => {
            const tabEl = tabsEl.createEl('button', { cls: 'pixel-banner-settings-tab', text: tabName });
            tabEl.addEventListener('click', () => {
                // Deactivate all tabs
                tabsEl.querySelectorAll('.pixel-banner-settings-tab').forEach(tab => tab.removeClass('active'));
                tabContentContainer.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');

                // Activate clicked tab
                tabEl.addClass('active');
                tabContentContainer.querySelector(`.tab-content[data-tab="${tabName}"]`).style.display = 'flex';
            });
        });

        return { tabsEl, tabContentContainer };
    }
}

// Utility function for debouncing
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

function random20characters() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 20; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

export { DEFAULT_SETTINGS, FolderSuggestModal, PixelBannerSettingTab, debounce };
