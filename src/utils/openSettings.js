const PLUGIN_ID = 'pexels-banner';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Obsidian can show settings in its own window, so the DOM to search is not always `document`
function getSettingsDocument(app) {
    return app.setting?.win?.document ?? document;
}

function clickByText(doc, selector, text) {
    for (const el of doc.querySelectorAll(selector)) {
        if (el.textContent.includes(text)) {
            el.click();
            return true;
        }
    }
    return false;
}

async function openSettingsTab(app, tabId, sidebarText) {
    await app.setting.open();
    if (typeof app.setting.openTabById === 'function' && app.setting.openTabById(tabId)) {
        await wait(300);
        return;
    }
    await wait(300);
    clickByText(getSettingsDocument(app), '.vertical-tab-header-group .vertical-tab-nav-item', sidebarText);
}

export async function openPluginSettings(app, { plusTab = false } = {}) {
    await openSettingsTab(app, PLUGIN_ID, 'Pixel Banner');
    if (plusTab) {
        clickByText(
            getSettingsDocument(app),
            '.pixel-banner-settings-tabs > button.pixel-banner-settings-tab',
            'Plus'
        );
    }
}

export async function openCommunityPluginsSettings(app, { checkForUpdates = false } = {}) {
    await openSettingsTab(app, 'community-plugins', 'Community plugins');
    if (checkForUpdates) {
        await wait(500);
        clickByText(getSettingsDocument(app), 'button', 'Check for updates');
    }
}
