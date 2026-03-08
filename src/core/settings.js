import { MarkdownView } from 'obsidian';
import { DEFAULT_SETTINGS } from '../settings/settings.js';


export async function loadSettings(plugin) {
    plugin.settings = Object.assign({}, DEFAULT_SETTINGS, await plugin.loadData());
    
    // Ensure folderImages is always an array
    if (!Array.isArray(plugin.settings.folderImages)) {
        plugin.settings.folderImages = [];
    }

    // Ensure customBannerField is always an array
    if (!Array.isArray(plugin.settings.customBannerField)) {
        plugin.settings.customBannerField = DEFAULT_SETTINGS.customBannerField;
    }

    // Ensure xPosition is a number
    if (typeof plugin.settings.xPosition !== 'number') {
        plugin.settings.xPosition = parseInt(plugin.settings.xPosition) || DEFAULT_SETTINGS.xPosition;
    }

    // Ensure yPosition is a number
    if (typeof plugin.settings.yPosition !== 'number') {
        plugin.settings.yPosition = parseInt(plugin.settings.yPosition) || DEFAULT_SETTINGS.yPosition;
    }

    if (plugin.settings.folderImages) {
        plugin.settings.folderImages.forEach(folderImage => {
            folderImage.imageDisplay = folderImage.imageDisplay || 'cover';
            folderImage.imageRepeat = folderImage.imageRepeat || false;
            folderImage.directChildrenOnly = folderImage.directChildrenOnly || false; // New setting
        });
    }
}

export async function saveSettings(plugin) {
    await plugin.saveData(plugin.settings);
    plugin.loadedImages.clear();
    plugin.lastKeywords.clear();
    plugin.imageCache.clear();
    
    // Update all banners and field visibility
    plugin.app.workspace.iterateAllLeaves(leaf => {
        if (leaf.view instanceof MarkdownView) {
            plugin.updateBanner(leaf.view, true);
            if (plugin.settings.hidePixelBannerFields) {
                plugin.updateFieldVisibility(leaf.view);
            }
        }
    });
}