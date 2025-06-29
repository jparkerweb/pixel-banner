import { PluginSettingTab, FuzzySuggestModal } from 'obsidian';
import { createAPISettings } from './tabs/settingsTabAPISettings';
import { createFolderSettings } from './tabs/settingsTabFolderImages';
import { createCustomFieldsSettings } from './tabs/settingsTabCustomFieldNames';
import { createGeneralSettings } from './tabs/settingsTabGeneral';
import { createPixelBannerPlusSettings } from './tabs/settingsTabPixelBannerPlus';

const DEFAULT_SETTINGS = {
    pixelBannerPlusEmail: '',
    pixelBannerPlusApiKey: '',
    pixelBannerPlusEnabled: true,
    apiProvider: 'all',
    pexelsApiKey: '',
    pixabayApiKey: '',
    flickrApiKey: '',
    unsplashApiKey: '',
    imageSize: 'medium',
    imageOrientation: 'landscape',
    numberOfImages: 10,
    defaultKeywords: 'nature, abstract, landscape, technology, art, cityscape, wildlife, ocean, mountains, forest, space, architecture, food, travel, science, music, sports, fashion, business, education, health, culture, history, weather, transportation, industry, people, animals, plants, patterns',
    xPosition: 50,
    yPosition: 60,
    customBannerField: ['banner'],
    customXPositionField: ['banner-x, x'],
    customYPositionField: ['banner-y, y'],
    customContentStartField: ['content-start'],
    customImageDisplayField: ['banner-display'],
    customImageRepeatField: ['banner-repeat'],
    customBannerMaxWidthField: ['banner-max-width'],
    customBannerAlignmentField: ['banner-align'],
    customBannerHeightField: ['banner-height'],
    customFadeField: ['banner-fade'],
    customBorderRadiusField: ['banner-radius'],
    customTitleColorField: ['banner-inline-title-color'],
    customBannerShuffleField: ['banner-shuffle'],
    customBannerIconField: ['icon'],
    customBannerIconImageField: ['icon-image'],
    customBannerIconSizeField: ['icon-size'],
    customBannerIconImageSizeMultiplierField: ['icon-image-size-multiplier'],
    customBannerIconTextVerticalOffsetField: ['icon-text-vertical-offset'],
    customBannerIconRotateField: ['icon-rotate'],
    customBannerIconXPositionField: ['icon-x'],
    customBannerIconOpacityField: ['icon-opacity'],
    customBannerIconColorField: ['icon-color'],
    customBannerIconFontWeightField: ['icon-font-weight'],
    customBannerIconBackgroundColorField: ['icon-bg-color'],
    customBannerIconPaddingXField: ['icon-padding-x'],
    customBannerIconPaddingYField: ['icon-padding-y'],
    customBannerIconBorderRadiusField: ['icon-border-radius'],
    customBannerIconVeritalOffsetField: ['icon-y'],
    customBannerIconImageAlignmentField: ['banner-icon-image-alignment'],
    customFlagColorField: ['pixel-banner-flag-color'],
    folderImages: [],
    contentStartPosition: 355,
    imageDisplay: 'cover',
    imageRepeat: false,
    bannerHeight: 350,
    bannerMaxWidth: 2560,
    fade: -70,
    bannerFadeInAnimationDuration: 300,
    borderRadius: 17,
    showPinIcon: false,
    pinnedImageFolder: 'pixel-banner-images',
    pinnedImageFilename: 'pixel-banner-image',
    imagePropertyFormat: '![[image]]',
    showReleaseNotes: true,
    lastVersion: null,
    showRefreshIcon: false,
    showViewImageIcon: false,
    hidePixelBannerFields: true,
    hidePropertiesSectionIfOnlyBanner: true,
    titleColor: 'var(--inline-title-color)',
    enableImageShuffle: false,
    hideEmbeddedNoteTitles: false,
    hideEmbeddedNoteBanners: false,
    showBannerInPopoverPreviews: true,
    showSelectImageIcon: true,
    selectImageIconOpacity: 40,
    selectImageIconFlag: 'red',
    defaultSelectImagePath: '',
    defaultSelectIconPath: '',
    useShortPath: true,
    bannerGap: 12,
    bannerIconSize: 70,
    bannerIconImageSizeMultiplier: 1,
    bannerIconTextVerticalOffset: 0,
    bannerIconXPosition: 75,
    bannerIconOpacity: 100,
    bannerIconColor: '',
    bannerIconFontWeight: 'normal',
    bannerIconBackgroundColor: '',
    bannerIconPaddingX: '10',
    bannerIconPaddingY: '10',
    bannerIconBorderRadius: '17',
    bannerIconVeritalOffset: '0',
    bannerIconImageAlignment: 'left',
    openTargetingModalAfterSelectingBannerOrIcon: true,
    enableDailyGame: false,
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
            '⚙️ General',
            '✨ Plus',
            '🗺️ Custom Fields',
            '🗃️ Folder Groups',
            '🌐 3rd Party APIs'
        ]);

        // General tab content
        const generalTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': '⚙️ General' } });
        createGeneralSettings(generalTab, this.plugin);

        // Pixel Banner Plus tab content
        const pixelBannerPlusTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': '✨ Plus' } });
        createPixelBannerPlusSettings(pixelBannerPlusTab, this.plugin);

        // Custom Fields tab content
        const customFieldsTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': '🗺️ Custom Fields' } });
        createCustomFieldsSettings(customFieldsTab, this.plugin);

        // 3rd Party APIs tab content
        const apiTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': '🌐 3rd Party APIs' } });
        createAPISettings(apiTab, this.plugin);

        // Folder Images tab content
        const foldersTab = tabContentContainer.createEl('div', { cls: 'tab-content', attr: { 'data-tab': '🗃️ Folder Groups' } });
        createFolderSettings(foldersTab, this.plugin);

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
