import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelectPixelBannerModal } from '../../../src/modal/modals/selectPixelBannerModal.js';
import { mockApp, createMockPlugin } from '../../mocks/obsidian.js';

describe('SelectPixelBannerModal', () => {
    let modal;
    let plugin;
    let mockWorkspace;

    beforeEach(() => {
        mockWorkspace = {
            getActiveFile: vi.fn().mockReturnValue({
                path: 'test.md',
                name: 'test.md'
            })
        };
        
        const app = {
            ...mockApp,
            workspace: mockWorkspace,
            fileManager: {
                processFrontMatter: vi.fn()
            },
            metadataCache: {
                getFileCache: vi.fn().mockReturnValue(null)
            }
        };
        
        plugin = createMockPlugin(app);
        plugin.settings = {
            pixelBannerPlusEnabled: false,
            pixelBannerPlusEmail: '',
            pixelBannerPlusApiKey: '',
            customBannerField: ['banner'],
            customBannerShuffleField: [],
            customBannerIconField: ['banner-icon'],
            customBannerIconImageField: ['banner-icon-image'],
            imagePropertyFormat: '[[image]]',
            defaultSelectImagePath: '',
            defaultSelectIconPath: '',
            selectImageIconFlag: 'red',
            lastVersion: '3.6.11',
            openTargetingModalAfterSelectingBannerOrIcon: false,
            enableDailyGame: false
        };
        plugin.pixelBannerPlusEnabled = false;
        plugin.pixelBannerPlusServerOnline = false;
        plugin.pixelBannerPlusBannerTokens = 0;
        plugin.pixelBannerVersion = '3.6.11';
        plugin.pixelBannerPlusDailyGameName = 'Game';
        plugin.pixelBannerPlusHighScore = '0';
        plugin.pixelBannerPlusJackpot = 10;
        plugin.pixelBannerPlusTimeLeft = '24:00:00';
        plugin.saveSettings = vi.fn().mockResolvedValue();
        plugin.hasBannerFrontmatter = vi.fn().mockReturnValue(false);
        plugin.verifyPixelBannerPlusCredentials = vi.fn().mockResolvedValue({
            verified: true,
            serverOnline: true,
            bannerTokens: 5
        });
        plugin.getPixelBannerInfo = vi.fn().mockResolvedValue();
        
        modal = new SelectPixelBannerModal(app, plugin);
        
        // Create a mock contentEl with required methods
        const contentElDiv = document.createElement('div');
        contentElDiv.empty = function() {
            this.innerHTML = '';
            while (this.firstChild) {
                this.removeChild(this.firstChild);
            }
        };
        contentElDiv.createEl = function(tag, options = {}) {
            const element = document.createElement(tag);
            if (options.text) element.textContent = options.text;
            if (options.cls) element.className = options.cls;
            if (options.type) element.type = options.type;
            if (options.attr) {
                Object.entries(options.attr).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) {
                        element.setAttribute(key, value);
                    }
                });
            }
            this.appendChild(element);
            
            // Add createEl method to created elements too
            element.createEl = contentElDiv.createEl.bind(element);
            element.createDiv = contentElDiv.createDiv.bind(element);
            element.appendChild = HTMLElement.prototype.appendChild.bind(element);
            element.empty = contentElDiv.empty.bind(element);
            
            return element;
        };
        contentElDiv.createDiv = function(options = {}) {
            return this.createEl('div', options);
        };
        
        modal.contentEl = contentElDiv;
        modal.style = null; // Add a style property to prevent errors in onClose
    });

    it('should create a toggle control in the account section', async () => {
        await modal.onOpen();
        
        const toggleContainer = modal.contentEl.querySelector('.checkbox-container');
        expect(toggleContainer).toBeTruthy();
        
        const toggleInput = toggleContainer.querySelector('input[type="checkbox"]');
        expect(toggleInput).toBeTruthy();
    });

    it('should reflect the current Pixel Banner Plus enabled state', async () => {
        plugin.settings.pixelBannerPlusEnabled = true;
        await modal.onOpen();
        
        const toggleContainer = modal.contentEl.querySelector('.checkbox-container');
        const toggleInput = toggleContainer.querySelector('input[type="checkbox"]');
        expect(toggleInput.checked).toBe(true);
        expect(toggleContainer.classList.contains('is-enabled')).toBe(true);
    });

    it('should update settings when toggle is changed', async () => {
        await modal.onOpen();
        
        const toggleContainer = modal.contentEl.querySelector('.checkbox-container');
        const toggleInput = toggleContainer.querySelector('input[type="checkbox"]');
        
        // Simulate checking the toggle
        toggleInput.checked = true;
        toggleInput.dispatchEvent(new Event('change'));
        
        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 10));
        
        expect(plugin.saveSettings).toHaveBeenCalled();
        expect(plugin.pixelBannerPlusEnabled).toBe(true);
        expect(plugin.settings.pixelBannerPlusEnabled).toBe(true);
    });

    it('should show AI Banner and Plus Collection buttons when enabled', async () => {
        plugin.settings.pixelBannerPlusEnabled = true;
        await modal.onOpen();
        
        const content = modal.contentEl.textContent;
        expect(content).toContain('AI Banner');
        expect(content).toContain('Plus Collection');
    });

    it('should hide AI Banner and Plus Collection buttons when disabled', async () => {
        plugin.settings.pixelBannerPlusEnabled = false;
        await modal.onOpen();
        
        const content = modal.contentEl.textContent;
        expect(content).not.toContain('AI Banner');
        expect(content).not.toContain('Plus Collection');
    });

    it('should always show the Pixel Banner Plus section with toggle', async () => {
        // Test when disabled
        plugin.settings.pixelBannerPlusEnabled = false;
        await modal.onOpen();
        
        let plusSection = modal.contentEl.querySelector('.pixel-banner-section.pixel-banner-api-dependent');
        expect(plusSection).toBeTruthy();
        
        let toggleContainer = modal.contentEl.querySelector('.checkbox-container');
        let toggleInput = toggleContainer.querySelector('input[type="checkbox"]');
        expect(toggleInput).toBeTruthy();
        expect(toggleInput.checked).toBe(false);
        expect(toggleContainer.classList.contains('is-enabled')).toBe(false);
        
        // Clear and test when enabled
        modal.contentEl.innerHTML = '';
        plugin.settings.pixelBannerPlusEnabled = true;
        await modal.onOpen();
        
        plusSection = modal.contentEl.querySelector('.pixel-banner-section.pixel-banner-api-dependent');
        expect(plusSection).toBeTruthy();
        
        toggleContainer = modal.contentEl.querySelector('.checkbox-container');
        toggleInput = toggleContainer.querySelector('input[type="checkbox"]');
        expect(toggleInput).toBeTruthy();
        expect(toggleInput.checked).toBe(true);
        expect(toggleContainer.classList.contains('is-enabled')).toBe(true);
    });
});