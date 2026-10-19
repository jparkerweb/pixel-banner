import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openPluginSettings, openCommunityPluginsSettings } from '@/utils/openSettings.js';

function makeApp({ openTabById, doc } = {}) {
  return {
    setting: {
      open: vi.fn().mockResolvedValue(undefined),
      openTabById,
      win: doc ? { document: doc } : undefined,
    },
  };
}

function makeDoc(map) {
  const make = (text) => ({ textContent: text, click: vi.fn() });
  const els = {};
  for (const [selector, texts] of Object.entries(map)) els[selector] = texts.map(make);
  return {
    els,
    querySelectorAll: vi.fn((selector) => els[selector] ?? []),
  };
}

describe('openSettings', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('openPluginSettings', () => {
    it('jumps straight to the plugin tab by id', async () => {
      const openTabById = vi.fn().mockReturnValue({});
      const app = makeApp({ openTabById });

      const pending = openPluginSettings(app);
      await vi.runAllTimersAsync();
      await pending;

      expect(app.setting.open).toHaveBeenCalledOnce();
      expect(openTabById).toHaveBeenCalledWith('pexels-banner');
    });

    it('clicks the sidebar entry in the settings window when openTabById is unavailable', async () => {
      const doc = makeDoc({
        '.vertical-tab-header-group .vertical-tab-nav-item': ['Appearance', 'Pixel Banner'],
      });
      const app = makeApp({ doc });

      const pending = openPluginSettings(app);
      await vi.runAllTimersAsync();
      await pending;

      const [appearance, pixelBanner] = doc.els['.vertical-tab-header-group .vertical-tab-nav-item'];
      expect(appearance.click).not.toHaveBeenCalled();
      expect(pixelBanner.click).toHaveBeenCalledOnce();
    });

    it('clicks the Plus sub-tab in the settings window when asked', async () => {
      const subTabs = '.pixel-banner-settings-tabs > button.pixel-banner-settings-tab';
      const doc = makeDoc({ [subTabs]: ['General', 'Plus'] });
      const app = makeApp({ openTabById: vi.fn().mockReturnValue({}), doc });

      const pending = openPluginSettings(app, { plusTab: true });
      await vi.runAllTimersAsync();
      await pending;

      const [general, plus] = doc.els[subTabs];
      expect(general.click).not.toHaveBeenCalled();
      expect(plus.click).toHaveBeenCalledOnce();
    });
  });

  describe('openCommunityPluginsSettings', () => {
    it('opens the community plugins tab and clicks Check for updates', async () => {
      const doc = makeDoc({ button: ['Browse', 'Check for updates'] });
      const openTabById = vi.fn().mockReturnValue({});
      const app = makeApp({ openTabById, doc });

      const pending = openCommunityPluginsSettings(app, { checkForUpdates: true });
      await vi.runAllTimersAsync();
      await pending;

      expect(openTabById).toHaveBeenCalledWith('community-plugins');
      const [browse, check] = doc.els.button;
      expect(browse.click).not.toHaveBeenCalled();
      expect(check.click).toHaveBeenCalledOnce();
    });
  });
});
