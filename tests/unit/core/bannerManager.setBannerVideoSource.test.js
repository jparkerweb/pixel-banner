import { describe, it, expect } from 'vitest';
import { setBannerVideoSource } from '@/core/bannerManager.js';

// A vault video plays from app://<hash>/..., another origin than app://obsidian.md,
// so without CORS mode it taints the canvas the PDF export draws its frame on (#323)
describe('setBannerVideoSource', () => {
    it('loads a vault video in CORS mode, before its source is set', () => {
        const video = document.createElement('video');
        let crossOriginAtSrc;
        const setSrc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src')?.set;
        Object.defineProperty(video, 'src', {
            configurable: true,
            get() { return this.getAttribute('src'); },
            set(value) {
                crossOriginAtSrc = this.crossOrigin;
                if (setSrc) setSrc.call(this, value); else this.setAttribute('src', value);
            }
        });

        setBannerVideoSource(video, 'app://c9826185/C:/vault/clip.mp4?1792271889035');
        expect(video.crossOrigin).toBe('anonymous');
        expect(crossOriginAtSrc).toBe('anonymous');
        expect(video.getAttribute('src')).toBe('app://c9826185/C:/vault/clip.mp4?1792271889035');
    });

    // A server without CORS headers would refuse a CORS request, and the video would not play
    it('leaves a remote video as it was', () => {
        const video = document.createElement('video');
        setBannerVideoSource(video, 'https://example.com/clip.mp4');
        expect(video.crossOrigin).toBeNull();
        expect(video.getAttribute('src')).toBe('https://example.com/clip.mp4');
    });
});
