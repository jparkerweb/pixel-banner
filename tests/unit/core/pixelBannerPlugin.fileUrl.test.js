import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { PixelBannerPlugin } from '@/core/pixelBannerPlugin.js';
import { createMockApp, createMockManifest } from 'obsidian';

// getImageUrl reads a local file:// banner from disk and returns it as a data URL
describe('getImageUrl with a local file', () => {
    let plugin;
    let dir;
    let filePath;

    beforeEach(() => {
        plugin = new PixelBannerPlugin(createMockApp(), createMockManifest());
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-banner-'));
        filePath = path.join(dir, 'my banner.png');
        fs.writeFileSync(filePath, Buffer.from([1, 2, 3]));
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    it('reads a plain file:// URL', async () => {
        const url = pathToFileURL(filePath).href;
        await expect(plugin.getImageUrl('fileUrl', url)).resolves.toBe('data:image/png;base64,AQID');
    });

    it('reads the target of a Markdown link to a local file', async () => {
        const url = pathToFileURL(filePath).href;
        await expect(plugin.getImageUrl('fileUrl', `[my banner.png](${url})`)).resolves.toBe('data:image/png;base64,AQID');
    });
});
