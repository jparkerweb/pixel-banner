import { App, Modal, Setting, Plugin, PluginSettingTab } from 'obsidian';
import { PIXEL_BANNER_PLUS } from '../../resources/constants.js';
import { SelectPixelBannerModal } from './selectPixelBannerModal';

// Game Modal class
export class DailyGameModal extends Modal {
  constructor(app, userEmail, apiKey, plugin) {
    super(app);
    this.userEmail = userEmail;
    this.apiKey = apiKey;
    this.iframe = null;
    this.plugin = plugin;
  }

  onOpen() {
    // add style block to the head
    const style = document.createElement('style');
    style.innerHTML = `
        .pixel-banner-game-modal {
        width: 800px;
        max-width: 90vw;
        }

        .pixel-banner-game-modal .game-container {
        margin: 1rem 0;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        overflow: hidden;
        height: 600px;
        }

        .pixel-banner-game-modal iframe {
        border: none;
        }
    `;

    // Set modal title and size
    const { contentEl } = this;
    contentEl.addClass('pixel-banner-game-modal');
    
    // Create a container for the game with specific dimensions
    const gameContainer = contentEl.createDiv({ cls: 'game-container' });
    
    // Create the iframe
    this.iframe = gameContainer.createEl('iframe', {
      attr: {
        src: `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.DAILY_GAME}`,
        width: '100%',
        height: '600px',
        frameborder: '0',
        allowfullscreen: 'true'
      }
    });
    
    // add div to hold buttons
    const buttonContainer = contentEl.createDiv({
        cls: 'button-container',
        attr: {
            style: `
                display: flex;
                align-items: center;
                justify-content: space-between;
            `
      }
    });

    // add "Buy More Tokens" button
    const buyTokensButton = buttonContainer.createEl('button', {
      cls: 'pixel-banner-account-button pixel-banner-buy-tokens-button',
      text: '💵 Buy More Tokens'
    });            
    buyTokensButton.addEventListener('click', (event) => {
      event.preventDefault();
      window.open(PIXEL_BANNER_PLUS.SHOP_URL, '_blank');
    });

    // add "Back to Main Menu" button
    const backToMainButton = buttonContainer.createEl('button', {
      text: '⇠ Main Menu',
      cls: 'cursor-pointer',
      attr: {
          style: `
              margin-left: auto;
              width: max-content;
              min-width: auto;
          `
      }
    });
    // on click of back to main menu button, close this modal and open the Pixel Banner Menu modal
    backToMainButton.addEventListener('click', () => {
      this.close();
      new SelectPixelBannerModal(this.app, this.plugin).open();
    });
    
    // Send auth credentials to the iframe after it loads
    this.iframe.onload = () => {
      this.sendAuthToIframe();
    };
  }
  
  sendAuthToIframe() {
    // Make sure iframe is loaded
    if (!this.iframe.contentWindow) {
      console.error('Iframe content window not available');
      return;
    }
    
    // Send auth credentials via postMessage
    this.iframe.contentWindow.postMessage({
      type: 'auth',
      data: {
        userEmail: this.userEmail,
        apiKey: this.apiKey
      }
    }, '*');
    // }, 'app://obsidian.md'); // Specify exact origin for security
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Add this to your main plugin file
export default class PixelBannerPlus extends Plugin {
  constructor(app, settings) {
    super(app, settings);
    this.settings = settings;
  }
  
  async onload() {
    await this.loadSettings();
    
    // Add ribbon icon
    this.addRibbonIcon('game-die', 'Play Daily Game', () => {
      this.openGameModal();
    });
    
    // Add command
    this.addCommand({
      id: 'open-daily-game',
      name: 'Open Daily Game',
      callback: () => {
        this.openGameModal();
      }
    });
    
    // Add settings tab
    this.addSettingTab(new PixelBannerSettingTab(this.app, this));
  }
  
  openGameModal() {
    // Check if credentials are set
    if (!this.settings.apiKey || !this.settings.userEmail) {
      new Notice('Please set your API key and email in the plugin settings');
      return;
    }
    
    // Open the game modal
    const gameModal = new DailyGameModal(this.app, this.settings.apiKey, this.settings.userEmail, this);
    gameModal.open();
  }
  
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

// Settings interface
const PixelBannerSettings = {
  apiKey: '',
  userEmail: ''
}

const DEFAULT_SETTINGS = {
  apiKey: '',
  userEmail: ''
}

// Settings tab
class PixelBannerSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const {containerEl} = this;
    containerEl.empty();

    containerEl.createEl('h2', {text: 'Pixel Banner Plus Settings'});

    new Setting(containerEl)
      .setName('User Email')
      .setDesc('Your registered email address')
      .addText(text => text
        .setPlaceholder('Enter your email')
        .setValue(this.plugin.settings.userEmail)
        .onChange(async (value) => {
          this.plugin.settings.userEmail = value;
          await this.plugin.saveSettings();
        }));
        
    new Setting(containerEl)
      .setName('API Key')
      .setDesc('Your API key for authentication')
      .addText(text => text
        .setPlaceholder('Enter your API key')
        .setValue(this.plugin.settings.pixelBannerPlusApiKey)
        .onChange(async (value) => {
          this.plugin.settings.pixelBannerPlusApiKey = value;
          await this.plugin.saveSettings();
        }));
  }
}