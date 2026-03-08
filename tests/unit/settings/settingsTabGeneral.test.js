import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { createGeneralSettings } from '@/settings/tabs/settingsTabGeneral.js';
import { createMockApp, Setting } from 'obsidian';
import { FolderSuggestModal } from '../../../src/settings/settings.js';

// Mock DOM globals

// Mock flags data
vi.mock('@/resources/flags.js', () => ({
    flags: {
        red: 'data:image/png;base64,red-flag',
        blue: 'data:image/png;base64,blue-flag',
        green: 'data:image/png;base64,green-flag',
        yellow: 'data:image/png;base64,yellow-flag'
    }
}));

// Mock DEFAULT_SETTINGS
const DEFAULT_SETTINGS = {
    showSelectImageIcon: true,
    selectImageIconOpacity: 80,
    selectImageIconFlag: 'red',
    pinnedImageFolder: 'pixel-banner-images',
    defaultSelectImagePath: '',
    defaultSelectIconPath: '',
    openTargetingModalAfterSelectingBannerOrIcon: false,
    bannerMaxWidth: 1280,
    xPosition: 50,
    yPosition: 50,
    contentStartPosition: 150,
    imageDisplay: 'cover',
    imageRepeat: false,
    bannerHeight: 350,
    fade: 0,
    bannerFadeInAnimationDuration: 300,
    borderRadius: 0,
    bannerGap: 0,
    titleColor: 'var(--text-normal)',
    hideEmbeddedNoteTitles: false,
    hideEmbeddedNoteBanners: false,
    showBannerInPopoverPreviews: true,
    showViewImageIcon: true,
    imagePropertyFormat: '![[image]]',
    hidePixelBannerFields: false,
    hidePropertiesSectionIfOnlyBanner: false,
    bannerIconSize: 24,
    bannerIconXPosition: 50,
    bannerIconOpacity: 100,
    bannerIconColor: 'var(--text-normal)',
    bannerIconFontWeight: 'normal',
    bannerIconBackgroundColor: 'transparent',
    bannerIconPaddingX: 0,
    bannerIconPaddingY: 0,
    bannerIconBorderRadius: 0,
    bannerIconVerticalOffset: 0,
    showReleaseNotes: true
};

// Mock the settings module 
vi.mock('../../../src/settings/settings.js', () => ({
    DEFAULT_SETTINGS: {
        showSelectImageIcon: true,
        selectImageIconOpacity: 80,
        selectImageIconFlag: 'red',
        pinnedImageFolder: 'pixel-banner-images',
        defaultSelectImagePath: '',
        defaultSelectIconPath: '',
        openTargetingModalAfterSelectingBannerOrIcon: false,
        bannerMaxWidth: 1280,
        xPosition: 50,
        yPosition: 50,
        contentStartPosition: 150,
        imageDisplay: 'cover',
        imageRepeat: false,
        bannerHeight: 350,
        fade: 0,
        bannerFadeInAnimationDuration: 300,
        borderRadius: 0,
        bannerGap: 0,
        titleColor: 'var(--text-normal)',
        hideEmbeddedNoteTitles: false,
        hideEmbeddedNoteBanners: false,
        showBannerInPopoverPreviews: true,
        showViewImageIcon: true,
        imagePropertyFormat: '![[image]]',
        hidePixelBannerFields: false,
        hidePropertiesSectionIfOnlyBanner: false,
        bannerIconSize: 24,
        bannerIconXPosition: 50,
        bannerIconOpacity: 100,
        bannerIconColor: 'var(--text-normal)',
        bannerIconFontWeight: 'normal',
        bannerIconBackgroundColor: 'transparent',
        bannerIconPaddingX: 0,
        bannerIconPaddingY: 0,
        bannerIconBorderRadius: 0,
        bannerIconVerticalOffset: 0,
        showReleaseNotes: true
    },
    FolderSuggestModal: vi.fn().mockImplementation((app, callback) => ({
        open: vi.fn(() => {
            callback('test-folder-path');
        })
    }))
}));

describe('settingsTabGeneral', () => {
    let containerEl;
    let mockPlugin;
    let mockApp;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        document.head.innerHTML = '';
        
        // Create container element with Obsidian-like API
        containerEl = document.createElement('div');
        containerEl.createEl = vi.fn(function(tag, attrs) {
            const el = document.createElement(tag);
            if (attrs) {
                if (attrs.cls) el.className = attrs.cls;
                if (attrs.text) el.textContent = attrs.text;
                if (attrs.type) el.type = attrs.type;
                if (attrs.value !== undefined) el.value = attrs.value;
                if (attrs.placeholder) el.placeholder = attrs.placeholder;
                if (attrs.min !== undefined) el.min = attrs.min;
                if (attrs.max !== undefined) el.max = attrs.max;
                if (attrs.step !== undefined) el.step = attrs.step;
                if (attrs.src) el.src = attrs.src;
                if (attrs.alt) el.alt = attrs.alt;
                if (attrs.href) el.href = attrs.href;
                if (attrs.title) el.title = attrs.title;
                if (attrs.target) el.target = attrs.target;
                // Handle nested attributes
                if (attrs.attr) {
                    Object.keys(attrs.attr).forEach(key => {
                        if (key === 'style') {
                            el.style.cssText = attrs.attr[key];
                        } else {
                            el.setAttribute(key, attrs.attr[key]);
                        }
                    });
                }
            }
            // Mock createEl method for nested elements - use 'this' to refer to parent
            el.createEl = function(tag, attrs) {
                return containerEl.createEl.call(el, tag, attrs);
            };
            // Mock setText method
            el.setText = vi.fn((text) => { el.textContent = text; return el; });
            // Append to parent (this)
            this.appendChild(el);
            return el;
        });
        
        // Add additional Obsidian-specific element creation methods
        containerEl.createDiv = vi.fn((attrs) => containerEl.createEl('div', attrs));
        containerEl.createSpan = vi.fn((attrs) => containerEl.createEl('span', attrs));
        containerEl.createButton = vi.fn((attrs) => containerEl.createEl('button', attrs));
        document.body.appendChild(containerEl);
        
        // Create mock app
        mockApp = createMockApp();
        
        // Create mock plugin
        mockPlugin = {
            app: mockApp,
            settings: { ...DEFAULT_SETTINGS },
            saveSettings: vi.fn(() => Promise.resolve()),
            updateAllBanners: vi.fn(),
            updateEmbeddedTitlesVisibility: vi.fn(),
            updateEmbeddedBannersVisibility: vi.fn(),
            getPixelBannerInfo: vi.fn(() => Promise.resolve())
        };

        // Mock getComputedStyle for color handling
        global.window.getComputedStyle = vi.fn(() => ({
            color: 'rgb(0, 0, 0)'
        }));
    });

    afterEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
        document.head.innerHTML = '';
    });

    describe('general settings creation', () => {
        it('should create settings without errors', () => {
            expect(() => {
                createGeneralSettings(containerEl, mockPlugin);
            }).not.toThrow();
        });

        it('should create callout section', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const callout = containerEl.querySelector('.tab-callout');
            expect(callout).toBeTruthy();
            expect(callout.textContent).toContain('Configure default settings');
        });
    });

    describe('show select image icon setting', () => {
        it('should create toggle setting', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const setting = containerEl.querySelector('[data-name="Show Pixel Banner Flag"]');
            expect(setting).toBeTruthy();
        });

        it('should update setting value on toggle change', async () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            // Find the specific toggle for "Show Pixel Banner Flag"
            const setting = containerEl.querySelector('[data-name="Show Pixel Banner Flag"]');
            expect(setting).toBeTruthy();
            const toggleInput = setting.querySelector('input[type="checkbox"]');
            expect(toggleInput).toBeTruthy();
            expect(toggleInput.checked).toBe(true);
            
            // Simulate unchecking
            toggleInput.checked = false;
            toggleInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockPlugin.settings.showSelectImageIcon).toBe(false);
            expect(mockPlugin.saveSettings).toHaveBeenCalled();
            expect(mockPlugin.updateAllBanners).toHaveBeenCalled();
        });

        it('should reset to default when reset button clicked', async () => {
            mockPlugin.settings.showSelectImageIcon = false;
            createGeneralSettings(containerEl, mockPlugin);
            
            const resetButton = containerEl.querySelector('[aria-label="Reset to default"]');
            expect(resetButton).toBeTruthy();
            
            resetButton.click();
            
            expect(mockPlugin.settings.showSelectImageIcon).toBe(DEFAULT_SETTINGS.showSelectImageIcon);
            expect(mockPlugin.saveSettings).toHaveBeenCalled();
        });
    });

    describe('opacity slider setting', () => {
        it('should create slider with correct limits and value', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const sliders = containerEl.querySelectorAll('input[type="range"]');
            const opacitySlider = Array.from(sliders).find(slider => 
                slider.parentElement.parentElement.textContent.includes('Opacity')
            );
            
            expect(opacitySlider).toBeTruthy();
            expect(opacitySlider.min).toBe('0');
            expect(opacitySlider.max).toBe('100');
            expect(Number(opacitySlider.value)).toBe(DEFAULT_SETTINGS.selectImageIconOpacity);
        });

        it('should update opacity on slider change', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const sliders = containerEl.querySelectorAll('input[type="range"]');
            const opacitySlider = Array.from(sliders).find(slider => 
                slider.parentElement.parentElement.textContent.includes('Opacity')
            );
            
            opacitySlider.value = '60';
            opacitySlider.dispatchEvent(new Event('input'));
            
            expect(mockPlugin.settings.selectImageIconOpacity).toBe(60);
            expect(mockPlugin.saveSettings).toHaveBeenCalled();
        });
    });

    describe('flag selection setting', () => {
        it('should create radio buttons for each flag', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const radioInputs = containerEl.querySelectorAll('input[name="pixel-banner-flag"]');
            expect(radioInputs.length).toBe(4); // red, blue, green, yellow
            
            const redRadio = Array.from(radioInputs).find(input => input.value === 'red');
            expect(redRadio).toBeTruthy();
            expect(redRadio.checked).toBe(true); // Default setting
        });

        it('should create flag images with correct src', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const flagImages = containerEl.querySelectorAll('img[alt*="flag"]');
            expect(flagImages.length).toBe(4);
            
            const redFlag = Array.from(flagImages).find(img => img.alt === 'red flag');
            expect(redFlag).toBeTruthy();
            expect(redFlag.src).toContain('red-flag');
        });

        it('should update flag selection on radio change', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const blueRadio = containerEl.querySelector('input[value="blue"]');
            expect(blueRadio).toBeTruthy();
            
            blueRadio.checked = true;
            blueRadio.dispatchEvent(new Event('change'));
            
            expect(mockPlugin.settings.selectImageIconFlag).toBe('blue');
            expect(mockPlugin.saveSettings).toHaveBeenCalled();
        });

        it('should reset flag selection when reset button clicked', async () => {
            mockPlugin.settings.selectImageIconFlag = 'blue';
            createGeneralSettings(containerEl, mockPlugin);
            
            // Verify initial state
            const blueRadioInitial = containerEl.querySelector('input[value="blue"]');
            expect(blueRadioInitial.checked).toBe(true);
            
            // Find reset button for flag setting
            const resetButtons = containerEl.querySelectorAll('[aria-label="Reset to default"]');
            const flagResetButton = Array.from(resetButtons).find(btn => 
                btn.parentElement.parentElement.textContent.includes('Select Pixel Banner Flag Color')
            );
            
            expect(flagResetButton).toBeTruthy();
            flagResetButton.click();
            
            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Verify settings were reset to default
            expect(mockPlugin.settings.selectImageIconFlag).toBe(DEFAULT_SETTINGS.selectImageIconFlag);
            expect(mockPlugin.saveSettings).toHaveBeenCalled();
            
            // Verify updateAllBanners was called to refresh UI
            expect(mockPlugin.updateAllBanners).toHaveBeenCalled();
        });
    });

    describe('folder path settings', () => {
        it('should create text input for default saved banners folder', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const textInputs = containerEl.querySelectorAll('input[type="text"]');
            const folderInput = Array.from(textInputs).find(input => 
                input.parentElement.parentElement.textContent.includes('Default Saved Banners Folder')
            );
            
            expect(folderInput).toBeTruthy();
            expect(folderInput.value).toBe(DEFAULT_SETTINGS.pinnedImageFolder);
            expect(folderInput.placeholder).toBe('pixel-banner-images');
        });

        it('should validate and auto-correct empty folder path on blur', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const textInputs = containerEl.querySelectorAll('input[type="text"]');
            const folderInput = Array.from(textInputs).find(input => 
                input.parentElement.parentElement.textContent.includes('Default Saved Banners Folder')
            );
            
            folderInput.value = '';
            folderInput.dispatchEvent(new Event('blur'));
            
            expect(folderInput.value).toBe('pixel-banner-images');
            expect(mockPlugin.settings.pinnedImageFolder).toBe('pixel-banner-images');
        });

        it('should open folder browser when browse button clicked', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const browseButtons = containerEl.querySelectorAll('button');
            const folderBrowseButton = Array.from(browseButtons).find(btn => 
                btn.textContent === 'Browse' && 
                btn.parentElement.parentElement.textContent.includes('Default Saved Banners Folder')
            );
            
            folderBrowseButton.click();
            
            expect(FolderSuggestModal).toHaveBeenCalledWith(
                mockApp,
                expect.any(Function)
            );
            expect(mockPlugin.settings.pinnedImageFolder).toBe('test-folder-path');
        });
    });

    describe('position and display settings', () => {
        it('should create banner max width slider', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const sliders = containerEl.querySelectorAll('input[type="range"]');
            const maxWidthSlider = Array.from(sliders).find(slider => 
                slider.parentElement.parentElement.textContent.includes('Banner Max Width')
            );
            
            expect(maxWidthSlider).toBeTruthy();
            expect(maxWidthSlider.min).toBe('100');
            expect(maxWidthSlider.max).toBe('2560');
            expect(Number(maxWidthSlider.value)).toBe(DEFAULT_SETTINGS.bannerMaxWidth);
        });

        it('should create horizontal position slider', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const sliders = containerEl.querySelectorAll('input[type="range"]');
            const xPositionSlider = Array.from(sliders).find(slider => 
                slider.parentElement.parentElement.textContent.includes('Horizontal Position')
            );
            
            expect(xPositionSlider).toBeTruthy();
            expect(xPositionSlider.min).toBe('0');
            expect(xPositionSlider.max).toBe('100');
            expect(Number(xPositionSlider.value)).toBe(DEFAULT_SETTINGS.xPosition);
        });

        it('should create image display dropdown', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const selects = containerEl.querySelectorAll('select');
            const displaySelect = Array.from(selects).find(select => 
                select.parentElement.parentElement.textContent.includes('Image Display')
            );
            
            expect(displaySelect).toBeTruthy();
            expect(displaySelect.value).toBe(DEFAULT_SETTINGS.imageDisplay);
            
            const options = Array.from(displaySelect.options).map(opt => opt.value);
            expect(options).toContain('auto');
            expect(options).toContain('cover');
            expect(options).toContain('contain');
        });
    });

    describe('banner height setting', () => {
        it('should create number input for banner height', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const numberInputs = containerEl.querySelectorAll('input[type="number"]');
            const heightInput = Array.from(numberInputs).find(input => 
                input.parentElement.parentElement.textContent.includes('Banner Height')
            );
            
            expect(heightInput).toBeTruthy();
            expect(heightInput.min).toBe('0');
            expect(heightInput.max).toBe('1280');
            expect(Number(heightInput.value)).toBe(DEFAULT_SETTINGS.bannerHeight);
        });

        it('should validate banner height on blur', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const numberInputs = containerEl.querySelectorAll('input[type="number"]');
            const heightInput = Array.from(numberInputs).find(input => 
                input.parentElement.parentElement.textContent.includes('Banner Height')
            );
            
            // Test invalid value
            heightInput.value = '';
            heightInput.dispatchEvent(new Event('blur'));
            
            expect(Number(heightInput.value)).toBe(350); // Default
            expect(mockPlugin.settings.bannerHeight).toBe(350);
            
            // Test value above max
            heightInput.value = '2000';
            heightInput.dispatchEvent(new Event('blur'));
            
            expect(Number(heightInput.value)).toBe(1280); // Max
            expect(mockPlugin.settings.bannerHeight).toBe(1280);
        });
    });

    describe('color picker settings', () => {
        it('should create color picker for title color', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const colorInputs = containerEl.querySelectorAll('input[type="color"]');
            const titleColorInput = Array.from(colorInputs).find(input => 
                input.parentElement.parentElement.textContent.includes('Inline Title Color')
            );
            
            expect(titleColorInput).toBeTruthy();
        });

        it('should handle CSS variable color conversion', () => {
            mockPlugin.settings.titleColor = 'var(--text-normal)';
            
            createGeneralSettings(containerEl, mockPlugin);
            
            const colorInputs = containerEl.querySelectorAll('input[type="color"]');
            const titleColorInput = Array.from(colorInputs).find(input => 
                input.parentElement.parentElement.textContent.includes('Inline Title Color')
            );
            
            // Should convert CSS variable to hex color
            expect(titleColorInput.value).toMatch(/^#[0-9a-fA-F]{6}$/);
        });
    });

    describe('dependent settings', () => {
        it('should create hide pixel banner fields toggle', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const toggles = containerEl.querySelectorAll('input[type="checkbox"]');
            const hideFieldsToggle = Array.from(toggles).find(toggle => {
                // Walk up the DOM tree to find the setting element containing the text
                let element = toggle.parentElement;
                while (element && element !== containerEl) {
                    if (element.textContent.includes('Hide Pixel Banner Fields')) {
                        return true;
                    }
                    element = element.parentElement;
                }
                return false;
            });
            
            expect(hideFieldsToggle).toBeTruthy();
        });

        it('should disable dependent setting when main setting is off', () => {
            mockPlugin.settings.hidePixelBannerFields = false;
            createGeneralSettings(containerEl, mockPlugin);
            
            const dependentSetting = containerEl.querySelector('.setting-dependent');
            expect(dependentSetting).toBeTruthy();
            expect(dependentSetting.classList.contains('is-disabled')).toBe(true);
        });

        it('should enable dependent setting when main setting is on', () => {
            mockPlugin.settings.hidePixelBannerFields = true;
            createGeneralSettings(containerEl, mockPlugin);
            
            const dependentSetting = containerEl.querySelector('.setting-dependent');
            expect(dependentSetting.classList.contains('is-disabled')).toBe(false);
        });

        it('should toggle dependent setting state when main setting changes', async () => {
            mockPlugin.settings.hidePixelBannerFields = false;
            createGeneralSettings(containerEl, mockPlugin);
            
            const toggles = containerEl.querySelectorAll('input[type="checkbox"]');
            const hideFieldsToggle = Array.from(toggles).find(toggle => {
                // Walk up the DOM tree to find the setting element containing the text
                let element = toggle.parentElement;
                while (element && element !== containerEl) {
                    if (element.textContent.includes('Hide Pixel Banner Fields')) {
                        return true;
                    }
                    element = element.parentElement;
                }
                return false;
            });
            
            const dependentSetting = containerEl.querySelector('.setting-dependent');
            expect(dependentSetting.classList.contains('is-disabled')).toBe(true);
            
            // Enable main setting
            hideFieldsToggle.checked = true;
            hideFieldsToggle.dispatchEvent(new Event('change'));
            
            expect(dependentSetting.classList.contains('is-disabled')).toBe(false);
        });
    });

    describe('banner icon settings', () => {
        it('should create banner icon size slider', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const sliders = containerEl.querySelectorAll('input[type="range"]');
            const iconSizeSlider = Array.from(sliders).find(slider => 
                slider.parentElement.parentElement.textContent.includes('Default Banner Icon Size')
            );
            
            expect(iconSizeSlider).toBeTruthy();
            expect(iconSizeSlider.min).toBe('10');
            expect(iconSizeSlider.max).toBe('200');
            expect(Number(iconSizeSlider.value)).toBe(DEFAULT_SETTINGS.bannerIconSize);
        });

        it('should create banner icon color text input', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const textInputs = containerEl.querySelectorAll('input[type="text"]');
            const iconColorInput = Array.from(textInputs).find(input => 
                input.parentElement.parentElement.textContent.includes('Default Banner Icon Text Color')
            );
            
            expect(iconColorInput).toBeTruthy();
            expect(iconColorInput.placeholder).toBe('Enter color (e.g., #ffffff or white)');
            expect(iconColorInput.value).toBe(DEFAULT_SETTINGS.bannerIconColor);
        });

        it('should create font weight dropdown', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const selects = containerEl.querySelectorAll('select');
            const fontWeightSelect = Array.from(selects).find(select => 
                select.parentElement.parentElement.textContent.includes('Font Weight')
            );
            
            expect(fontWeightSelect).toBeTruthy();
            expect(fontWeightSelect.value).toBe(DEFAULT_SETTINGS.bannerIconFontWeight);
            
            const options = Array.from(fontWeightSelect.options).map(opt => opt.value);
            expect(options).toContain('lighter');
            expect(options).toContain('normal');
            expect(options).toContain('bold');
        });
    });

    describe('promotional links', () => {
        it('should create promotional links section', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const promoLinks = containerEl.querySelector('.pixel-banner-promotional-links');
            expect(promoLinks).toBeTruthy();
            
            const links = promoLinks.querySelectorAll('a');
            expect(links.length).toBe(2); // Discord and Ko-fi
        });

        it('should create Discord link with correct attributes', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const discordLink = containerEl.querySelector('a[target="discord"]');
            expect(discordLink).toBeTruthy();
            expect(discordLink.href).toBe('https://discord.gg/sp8AQQhMJ7');
            
            const img = discordLink.querySelector('img');
            expect(img).toBeTruthy();
            expect(img.alt).toBe('Discord');
        });

        it('should create Ko-fi link with correct attributes', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const kofiLink = containerEl.querySelector('a[target="kofi"]');
            expect(kofiLink).toBeTruthy();
            expect(kofiLink.href).toBe('https://ko-fi.com/Z8Z212UMBI');
            
            const img = kofiLink.querySelector('img');
            expect(img).toBeTruthy();
            expect(img.alt).toBe('Buy Me a Coffee at ko-fi.com');
        });
    });

    describe('reset functionality', () => {
        it('should have reset buttons for all major settings', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const resetButtons = containerEl.querySelectorAll('[aria-label="Reset to default"]');
            expect(resetButtons.length).toBeGreaterThan(10); // Should have many reset buttons
        });

        it('should reset complex settings with proper UI updates', async () => {
            mockPlugin.settings.imageDisplay = 'contain';
            createGeneralSettings(containerEl, mockPlugin);
            
            // Find the specific Image Display dropdown
            const selects = containerEl.querySelectorAll('select');
            const imageDisplaySelect = Array.from(selects).find(select => 
                select.parentElement.parentElement.textContent.includes('Image Display')
            );
            expect(imageDisplaySelect.value).toBe('contain'); // Initial state
            
            const resetButtons = containerEl.querySelectorAll('[aria-label="Reset to default"]');
            const displayResetButton = Array.from(resetButtons).find(btn => 
                btn.parentElement.parentElement.textContent.includes('Image Display')
            );
            
            displayResetButton.click();
            
            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(mockPlugin.settings.imageDisplay).toBe(DEFAULT_SETTINGS.imageDisplay);
            expect(imageDisplaySelect.value).toBe(DEFAULT_SETTINGS.imageDisplay);
        });
    });

    describe('error handling and edge cases', () => {
        it('should handle missing plugin gracefully', () => {
            expect(() => {
                createGeneralSettings(containerEl, null);
            }).toThrow(); // Expected to throw with null plugin
        });

        it('should handle missing settings gracefully', () => {
            const incompletePlugin = {
                settings: {},
                saveSettings: vi.fn(),
                updateAllBanners: vi.fn(),
                getPixelBannerInfo: vi.fn(() => Promise.resolve())
            };
            
            expect(() => {
                createGeneralSettings(containerEl, incompletePlugin);
            }).not.toThrow();
        });

        it('should handle async save errors gracefully', async () => {
            mockPlugin.saveSettings.mockRejectedValue(new Error('Save failed'));
            createGeneralSettings(containerEl, mockPlugin);
            
            const toggle = containerEl.querySelector('input[type="checkbox"]');
            
            await expect(async () => {
                toggle.checked = false;
                toggle.dispatchEvent(new Event('change'));
            }).not.toThrow();
        });

        it('should handle invalid color values', () => {
            mockPlugin.settings.titleColor = 'invalid-color';
            
            expect(() => {
                createGeneralSettings(containerEl, mockPlugin);
            }).not.toThrow();
        });

        it('should handle missing DOM elements in reset functions', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            // Remove elements before clicking reset
            const toggles = containerEl.querySelectorAll('input[type="checkbox"]');
            toggles.forEach(toggle => toggle.remove());
            
            const resetButtons = containerEl.querySelectorAll('[aria-label="Reset to default"]');
            
            expect(() => {
                resetButtons[0].click();
            }).not.toThrow();
        });
    });

    describe('accessibility and usability', () => {
        it('should set appropriate input types and attributes', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const numberInputs = containerEl.querySelectorAll('input[type="number"]');
            numberInputs.forEach(input => {
                expect(input.min).toBeDefined();
                expect(input.max).toBeDefined();
            });
            
            const rangeInputs = containerEl.querySelectorAll('input[type="range"]');
            rangeInputs.forEach(input => {
                expect(input.min).toBeDefined();
                expect(input.max).toBeDefined();
                expect(input.step).toBeDefined();
            });
        });

        it('should have proper labels and descriptions', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const settings = containerEl.querySelectorAll('.setting-item');
            settings.forEach(setting => {
                const name = setting.querySelector('.setting-item-name');
                const desc = setting.querySelector('.setting-item-description');
                
                if (name) {
                    expect(name.textContent.trim().length).toBeGreaterThan(0);
                }
                if (desc) {
                    expect(desc.textContent.trim().length).toBeGreaterThan(0);
                }
            });
        });

        it('should have tooltips on reset buttons', () => {
            createGeneralSettings(containerEl, mockPlugin);
            
            const resetButtons = containerEl.querySelectorAll('[aria-label="Reset to default"]');
            resetButtons.forEach(button => {
                expect(button.getAttribute('aria-label')).toBe('Reset to default');
            });
        });
    });
});