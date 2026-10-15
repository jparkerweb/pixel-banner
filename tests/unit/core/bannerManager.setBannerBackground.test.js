import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setBannerBackground } from '@/core/bannerManager.js';

// Swapping a banner's background to an image that is not decoded yet paints it empty
// for a few frames, which flickers when switching notes (issue #327). The swap waits
// for the decode; a banner that shows nothing yet gets its image at once.

let decodes;

class FakeImage {
    constructor() {
        this.src = '';
        this.decode = () => new Promise((resolve, reject) => decodes.push({ src: this.src, resolve, reject }));
    }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('setBannerBackground', () => {
    let banner;

    beforeEach(() => {
        decodes = [];
        vi.stubGlobal('Image', FakeImage);
        banner = document.createElement('div');
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('sets the image at once on a banner that shows nothing yet', () => {
        setBannerBackground(banner, 'blob:first');

        expect(banner.style.backgroundImage).toContain('blob:first');
        expect(decodes).toHaveLength(0);
    });

    it('keeps the current image until the new one is decoded', async () => {
        banner.style.backgroundImage = "url('blob:old')";

        setBannerBackground(banner, 'blob:new');
        expect(banner.style.backgroundImage).toContain('blob:old');

        decodes[0].resolve();
        await flush();
        expect(banner.style.backgroundImage).toContain('blob:new');
    });

    it('lets the latest update win when decodes finish out of order', async () => {
        banner.style.backgroundImage = "url('blob:old')";

        setBannerBackground(banner, 'blob:a');
        setBannerBackground(banner, 'blob:b');
        decodes[1].resolve();
        await flush();
        decodes[0].resolve();
        await flush();

        expect(banner.style.backgroundImage).toContain('blob:b');
    });

    it('does not bring back an image a cleanup cleared meanwhile', async () => {
        banner.style.backgroundImage = "url('blob:old')";

        setBannerBackground(banner, 'blob:new');
        banner.style.backgroundImage = '';
        decodes[0].resolve();
        await flush();

        expect(banner.style.backgroundImage).toBe('');
    });

    it('still sets the image when decoding fails', async () => {
        banner.style.backgroundImage = "url('blob:old')";

        setBannerBackground(banner, 'blob:broken');
        decodes[0].reject(new Error('decode failed'));
        await flush();

        expect(banner.style.backgroundImage).toContain('blob:broken');
    });
});
