import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isPrintRender, resolvePrintImageSource, addPrintBanner, clonePaneIcon, grabVideoFrame } from '@/core/printBanner.js';
import { getInputType, getPathFromObsidianLink, getPathFromMarkdownImage } from '@/core/bannerUtils.js';
import { TFile, MarkdownView } from 'obsidian';
import { DEFAULT_SETTINGS } from '@/settings/settings.js';

// Export to PDF renders the note into .print > .markdown-preview-view (issue #323)

function previewView() {
    const el = document.createElement('div');
    el.classList.add('markdown-preview-view', 'markdown-rendered');
    return el;
}

function wrapIn(el, ...classes) {
    const parent = document.createElement('div');
    parent.classList.add(...classes);
    parent.appendChild(el);
    return parent;
}

describe('isPrintRender', () => {
    it('is true for the top level preview of a print render', () => {
        const el = previewView();
        wrapIn(el, 'print');
        expect(isPrintRender(el)).toBe(true);
    });

    it('is false for a normal reading view', () => {
        const el = previewView();
        wrapIn(wrapIn(el, 'markdown-reading-view'), 'view-content');
        expect(isPrintRender(el)).toBe(false);
    });

    it('is false for a note embedded in the printed note', () => {
        const el = previewView();
        wrapIn(wrapIn(el, 'internal-embed', 'markdown-embed'), 'print');
        expect(isPrintRender(el)).toBe(false);
    });

    it('is false for a hover popover', () => {
        const el = previewView();
        wrapIn(el, 'hover-popover');
        expect(isPrintRender(el)).toBe(false);
    });

    it('is false without a container', () => {
        expect(isPrintRender(null)).toBe(false);
    });
});

function imageFile(path) {
    const file = new TFile(path);
    file.extension = path.split('.').pop();
    return file;
}

// A plugin with the real input helpers over a small vault
function createPlugin(files = []) {
    const byPath = new Map(files.map(file => [file.path, file]));
    const byName = new Map(files.map(file => [file.path.split('/').pop(), file]));
    return {
        settings: {},
        loadedImages: new Map(),
        lastKeywords: new Map(),
        app: {
            vault: {
                getAbstractFileByPath: vi.fn(path => byPath.get(path) ?? null),
                getResourcePath: vi.fn(file => `app://local/${file.path}`)
            },
            metadataCache: {
                getFirstLinkpathDest: vi.fn(link => byPath.get(link) ?? byName.get(link) ?? null)
            },
            workspace: {
                getLeavesOfType: vi.fn(() => [])
            }
        },
        getInputType(input, sourcePath = '') { return getInputType.call(this, input, sourcePath); },
        getPathFromObsidianLink(link) { return getPathFromObsidianLink.call(this, link); },
        getPathFromMarkdownImage(link, sourcePath = '') { return getPathFromMarkdownImage.call(this, link, sourcePath); }
    };
}

describe('resolvePrintImageSource', () => {
    const note = new TFile('notes/note.md');
    let plugin;
    let setSpy;

    beforeEach(() => {
        plugin = createPlugin([imageFile('images/banner.jpg'), imageFile('images/clip.mp4')]);
        setSpy = vi.spyOn(plugin.loadedImages, 'set');
    });

    afterEach(() => {
        // The print path never writes to the pane's caches
        expect(setSpy).not.toHaveBeenCalled();
        expect(plugin.lastKeywords.size).toBe(0);
    });

    it('uses a cached URL string', () => {
        plugin.loadedImages = new Map([[note.path, 'blob:cached']]);
        setSpy = vi.spyOn(plugin.loadedImages, 'set');
        expect(resolvePrintImageSource(plugin, note, 'mountains')).toEqual({ src: 'blob:cached' });
    });

    it('uses the url of a cached image object', () => {
        plugin.loadedImages = new Map([[note.path, { url: 'blob:cached-object', isVideo: false }]]);
        setSpy = vi.spyOn(plugin.loadedImages, 'set');
        expect(resolvePrintImageSource(plugin, note, 'mountains')).toEqual({ src: 'blob:cached-object' });
    });

    it('returns null for a cached video without a frame', () => {
        plugin.loadedImages = new Map([[note.path, { url: 'blob:video', isVideo: true }]]);
        setSpy = vi.spyOn(plugin.loadedImages, 'set');
        expect(resolvePrintImageSource(plugin, note, 'images/clip.mp4')).toBeNull();
    });

    describe('with a frame in the pane video', () => {
        let canvasSpies;

        beforeEach(() => {
            canvasSpies = [
                vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn() }),
                vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AAA')
            ];
            addPane(plugin, note, paneVideo());
        });

        // Only the canvas spies: vi.restoreAllMocks() would also clear setSpy's
        // calls before the outer afterEach checks them
        afterEach(() => {
            canvasSpies.forEach(spy => spy.mockRestore());
        });

        it('uses the frame for a cached video', () => {
            plugin.loadedImages = new Map([[note.path, { url: 'blob:video', isVideo: true }]]);
            setSpy = vi.spyOn(plugin.loadedImages, 'set');
            expect(resolvePrintImageSource(plugin, note, 'images/clip.mp4')).toEqual({ src: 'data:image/jpeg;base64,AAA' });
        });

        it('uses the frame for a cached video resource URL', () => {
            plugin.loadedImages = new Map([[note.path, 'app://local/media-attachment/clip.MP4']]);
            setSpy = vi.spyOn(plugin.loadedImages, 'set');
            expect(resolvePrintImageSource(plugin, note, 'images/clip.mp4')).toEqual({ src: 'data:image/jpeg;base64,AAA' });

            plugin.loadedImages = new Map([[note.path, 'app://local/media-attachment/clip.mov']]);
            setSpy = vi.spyOn(plugin.loadedImages, 'set');
            expect(resolvePrintImageSource(plugin, note, 'images/clip.mov')).toEqual({ src: 'data:image/jpeg;base64,AAA' });
        });
    });

    it('returns null for a cached video resource URL without a frame', () => {
        plugin.loadedImages = new Map([[note.path, 'app://local/media-attachment/clip.mp4']]);
        setSpy = vi.spyOn(plugin.loadedImages, 'set');
        expect(resolvePrintImageSource(plugin, note, 'images/clip.mp4')).toBeNull();
    });

    it('hands an uncached URL to the image as is', () => {
        expect(resolvePrintImageSource(plugin, note, '  https://example.com/banner.jpg ')).toEqual({ src: 'https://example.com/banner.jpg' });
    });

    it('uses the resource path of an uncached vault image', () => {
        expect(resolvePrintImageSource(plugin, note, 'images/banner.jpg')).toEqual({ src: 'app://local/images/banner.jpg' });
    });

    it('uses the resource path of an uncached wiki link', () => {
        expect(resolvePrintImageSource(plugin, note, '[[banner.jpg]]')).toEqual({ src: 'app://local/images/banner.jpg' });
    });

    it('uses the resource path of an uncached markdown image', () => {
        expect(resolvePrintImageSource(plugin, note, '![](images/banner.jpg)')).toEqual({ src: 'app://local/images/banner.jpg' });
    });

    it('hands the URL of an uncached markdown image to the image as is', () => {
        expect(resolvePrintImageSource(plugin, note, '![](https://example.com/banner.jpg)')).toEqual({ src: 'https://example.com/banner.jpg' });
    });

    it('uses the resource path of an uncached image given as an array', () => {
        expect(resolvePrintImageSource(plugin, note, [['banner.jpg']])).toEqual({ src: 'app://local/images/banner.jpg' });
    });

    it('resolves an uncached partial vault path', () => {
        expect(resolvePrintImageSource(plugin, note, 'banner.jpg')).toEqual({ src: 'app://local/images/banner.jpg' });
    });

    // An <img> cannot show a video: no banner rather than a broken image
    it('returns null for an uncached video file', () => {
        expect(resolvePrintImageSource(plugin, note, 'images/clip.mp4')).toBeNull();
        expect(resolvePrintImageSource(plugin, note, '[[clip.mp4]]')).toBeNull();
        expect(plugin.app.vault.getResourcePath).not.toHaveBeenCalled();
    });

    it('returns null for an uncached keyword', () => {
        expect(resolvePrintImageSource(plugin, note, 'mountains')).toBeNull();
    });

    it('returns null when the vault file is missing', () => {
        expect(resolvePrintImageSource(plugin, note, '[[missing.jpg]]')).toBeNull();
        expect(plugin.app.vault.getResourcePath).not.toHaveBeenCalled();
    });
});

describe('addPrintBanner', () => {
    const note = new TFile('notes/note.md');
    const frontmatter = { banner: 'https://example.com/banner.jpg' };
    let plugin;
    let printDocument;
    let containerEl;

    beforeEach(() => {
        plugin = createPlugin();
        plugin.settings = {
            imageDisplay: 'cover',
            imageRepeat: false,
            customImageDisplayField: ['image-display'],
            customImageRepeatField: ['image-repeat']
        };
        plugin.getFolderSpecificImage = vi.fn(() => null);
        plugin.applyBannerSettings = vi.fn();
        plugin.loadedImages.set(note.path, 'blob:cached');

        // The print render lives in its own document, not the global one
        printDocument = document.implementation.createHTMLDocument('print');
        const print = printDocument.createElement('div');
        print.classList.add('print');
        containerEl = printDocument.createElement('div');
        containerEl.classList.add('markdown-preview-view', 'markdown-rendered');
        containerEl.appendChild(printDocument.createElement('p'));
        print.appendChild(containerEl);
        printDocument.body.appendChild(print);
    });

    const add = () => addPrintBanner(plugin, containerEl, { file: note, frontmatter, bannerImage: frontmatter.banner });

    it('adds the banner as the first child, once across several calls', () => {
        expect(add()).toBe(true);
        expect(add()).toBe(false);
        expect(add()).toBe(false);

        const wrappers = containerEl.querySelectorAll(':scope > .pixel-banner-print');
        expect(wrappers).toHaveLength(1);
        expect(containerEl.firstChild).toBe(wrappers[0]);

        const img = wrappers[0].querySelector('img.pixel-banner-print-image');
        expect(img.getAttribute('src')).toBe('blob:cached');
        expect(img.getAttribute('alt')).toBe('');
        expect(img.getAttribute('loading')).toBe('eager');
        expect(img.getAttribute('decoding')).toBe('sync');
    });

    it('adds nothing when there is no source', () => {
        plugin.loadedImages.clear();
        expect(addPrintBanner(plugin, containerEl, { file: note, frontmatter, bannerImage: 'mountains' })).toBe(false);
        expect(containerEl.querySelector('.pixel-banner-print')).toBeNull();
        expect(plugin.applyBannerSettings).not.toHaveBeenCalled();
    });

    it('adds nothing for a video banner without a frame', () => {
        plugin.loadedImages.set(note.path, { url: 'blob:video', isVideo: true });
        expect(addPrintBanner(plugin, containerEl, { file: note, frontmatter, bannerImage: 'images/clip.mp4' })).toBe(false);
        expect(containerEl.querySelector('.pixel-banner-print')).toBeNull();
        expect(plugin.applyBannerSettings).not.toHaveBeenCalled();
    });

    it('creates its elements from the print document', () => {
        const createSpy = vi.spyOn(printDocument, 'createElement');
        const globalCreateSpy = vi.spyOn(document, 'createElement');
        add();

        const wrapper = containerEl.querySelector('.pixel-banner-print');
        expect(wrapper.ownerDocument).toBe(printDocument);
        expect(createSpy).toHaveBeenCalledWith('div');
        expect(createSpy).toHaveBeenCalledWith('img');
        expect(globalCreateSpy).not.toHaveBeenCalled();
    });

    it('applies the banner settings to the image', () => {
        add();
        const img = containerEl.querySelector('img.pixel-banner-print-image');
        expect(plugin.applyBannerSettings).toHaveBeenCalledWith(img, {
            file: note,
            frontmatter,
            imageDisplay: 'cover',
            imageRepeat: false
        }, false);
    });

    it('resolves Image Display and Image Repeat like the hover popover', () => {
        plugin.getFolderSpecificImage = vi.fn(() => ({ imageDisplay: 'contain', imageRepeat: true }));
        add();
        expect(plugin.applyBannerSettings).toHaveBeenLastCalledWith(expect.anything(),
            expect.objectContaining({ imageDisplay: 'contain', imageRepeat: true }), false);

        containerEl.querySelector('.pixel-banner-print').remove();
        const withFrontmatter = { ...frontmatter, 'image-display': 'auto', 'image-repeat': false };
        addPrintBanner(plugin, containerEl, { file: note, frontmatter: withFrontmatter, bannerImage: frontmatter.banner });
        expect(plugin.applyBannerSettings).toHaveBeenLastCalledWith(expect.anything(),
            expect.objectContaining({ imageDisplay: 'auto', imageRepeat: false }), false);
    });

    // object-fit comes from styles.css (cover), a class switches it to contain: no inline styles
    it('fits the image with Image Display', () => {
        add();
        const img = () => containerEl.querySelector('img.pixel-banner-print-image');
        expect(img().classList.contains('pixel-banner-print-contain')).toBe(false);
        expect(img().getAttribute('style') ?? '').not.toContain('object-fit');

        containerEl.querySelector('.pixel-banner-print').remove();
        addPrintBanner(plugin, containerEl, { file: note, frontmatter: { ...frontmatter, 'image-display': 'contain' }, bannerImage: frontmatter.banner });
        expect(img().classList.contains('pixel-banner-print-contain')).toBe(true);
    });

    it('puts the pane icon after the image, adopted into the print document', () => {
        addPane(plugin, note, iconOverlay('🌄'));
        add();

        const wrapper = containerEl.querySelector('.pixel-banner-print');
        expect(wrapper.classList.contains('has-icon')).toBe(true);
        expect(wrapper.children).toHaveLength(2);
        expect(wrapper.children[0].classList.contains('pixel-banner-print-image')).toBe(true);
        const icon = wrapper.children[1];
        expect(icon.classList.contains('banner-icon-overlay')).toBe(true);
        expect(icon.textContent).toBe('🌄');
        expect(icon.ownerDocument).toBe(printDocument);
    });

    it('has no icon class without a pane icon', () => {
        addPane(plugin, note, document.createElement('p'));
        add();

        const wrapper = containerEl.querySelector('.pixel-banner-print');
        expect(wrapper.classList.contains('has-icon')).toBe(false);
        expect(wrapper.querySelector('.banner-icon-overlay')).toBeNull();
    });

    // Buttons do nothing on paper: only the image and the icon are printed
    it('never prints the pane controls', () => {
        const controls = ['select-image-icon', 'pin-icon', 'refresh-icon', 'view-image-icon'].map(cls => {
            const el = document.createElement('div');
            el.classList.add(cls);
            return el;
        });
        addPane(plugin, note, ...controls, iconOverlay('🌄'));
        add();

        for (const cls of ['select-image-icon', 'pin-icon', 'refresh-icon', 'view-image-icon']) {
            expect(containerEl.querySelector('.' + cls)).toBeNull();
        }
        expect(containerEl.querySelector('.banner-icon-overlay')).not.toBeNull();
    });

    it('catches an error and leaves no banner behind', () => {
        plugin.applyBannerSettings = vi.fn(() => { throw new Error('boom'); });
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        expect(add()).toBe(false);
        expect(containerEl.querySelector('.pixel-banner-print')).toBeNull();
        expect(warnSpy).toHaveBeenCalledWith('Pixel Banner: could not add the banner to the PDF export', expect.any(Error));
        warnSpy.mockRestore();
    });
});

// An open pane showing the note, with whatever its sizer holds
function addPane(plugin, file, ...children) {
    const contentEl = document.createElement('div');
    const sizer = document.createElement('div');
    sizer.classList.add('markdown-preview-sizer');
    children.forEach(child => sizer.appendChild(child));
    contentEl.appendChild(sizer);
    const leaves = plugin.app.workspace?.getLeavesOfType?.('markdown') ?? [];
    const view = new MarkdownView();
    view.file = file;
    view.contentEl = contentEl;
    leaves.push({ view });
    plugin.app.workspace = { getLeavesOfType: vi.fn(() => leaves) };
    return contentEl;
}

function iconOverlay(content) {
    const overlay = document.createElement('div');
    overlay.classList.add('banner-icon-overlay');
    overlay.setAttribute('data-persistent', 'true');
    if (typeof content === 'string') {
        const text = document.createElement('span');
        text.classList.add('banner-icon-text');
        text.textContent = content;
        overlay.appendChild(text);
    } else {
        overlay.appendChild(content);
    }
    return overlay;
}

// Icon-only notes (issues #322, #238): the PDF gets the pane's icon at the top, with no banner
describe('addPrintBanner for an icon-only note', () => {
    const note = new TFile('notes/note.md');
    const frontmatter = { icon: '🌟' };
    let plugin;
    let printDocument;
    let containerEl;
    let guards;

    beforeEach(() => {
        plugin = createPlugin();
        plugin.settings = { ...DEFAULT_SETTINGS };
        plugin.getFolderSpecificImage = vi.fn(() => null);
        plugin.applyBannerSettings = vi.fn();

        printDocument = document.implementation.createHTMLDocument('print');
        const print = printDocument.createElement('div');
        print.classList.add('print');
        containerEl = printDocument.createElement('div');
        containerEl.classList.add('markdown-preview-view', 'markdown-rendered');
        containerEl.appendChild(printDocument.createElement('p'));
        print.appendChild(containerEl);
        printDocument.body.appendChild(print);

        // The print path stays synchronous: no timers, no fetches, no writes to the pane's caches
        guards = {
            timeout: vi.spyOn(globalThis, 'setTimeout'),
            fetch: vi.fn(),
            cacheSet: vi.spyOn(plugin.loadedImages, 'set'),
            keywordSet: vi.spyOn(plugin.lastKeywords, 'set')
        };
        vi.stubGlobal('fetch', guards.fetch);
    });

    afterEach(() => {
        expect(guards.timeout).not.toHaveBeenCalled();
        expect(guards.fetch).not.toHaveBeenCalled();
        expect(guards.cacheSet).not.toHaveBeenCalled();
        expect(guards.keywordSet).not.toHaveBeenCalled();
        // Only the spies created here: another afterEach may assert on its own
        guards.timeout.mockRestore();
        guards.cacheSet.mockRestore();
        guards.keywordSet.mockRestore();
        vi.unstubAllGlobals();
    });

    const add = (bannerImage = null) => addPrintBanner(plugin, containerEl, { file: note, frontmatter, bannerImage });

    it('prints the pane icon as an icon-only wrapper with the icon-only variables', () => {
        addPane(plugin, note, iconOverlay('🌟'));

        expect(add()).toBe(true);

        const wrapper = containerEl.querySelector(':scope > .pixel-banner-print');
        expect(containerEl.firstChild).toBe(wrapper);
        expect(wrapper.classList.contains('pixel-banner-print-icon-only')).toBe(true);
        expect(wrapper.classList.contains('has-icon')).toBe(false);
        expect(wrapper.querySelector('img.pixel-banner-print-image')).toBeNull();
        expect(wrapper.children).toHaveLength(1);
        const icon = wrapper.firstElementChild;
        expect(icon.classList.contains('banner-icon-overlay')).toBe(true);
        expect(icon.textContent).toBe('🌟');
        expect(icon.ownerDocument).toBe(printDocument);
        expect(wrapper.style.getPropertyValue('--pixel-banner-icon-start')).toBe('16px');
        expect(wrapper.style.getPropertyValue('--pixel-banner-icon-translate-y')).toBe('0%');
        expect(wrapper.style.getPropertyValue('--pixel-banner-icon-size')).toBe(`70px`);
        expect(plugin.applyBannerSettings).not.toHaveBeenCalled();
    });

    it('adds nothing when the pane has no icon to copy', () => {
        addPane(plugin, note, document.createElement('p'));

        expect(add()).toBe(false);
        expect(containerEl.querySelector('.pixel-banner-print')).toBeNull();
    });

    it('adds nothing when no pane shows the note', () => {
        expect(add()).toBe(false);
        expect(containerEl.querySelector('.pixel-banner-print')).toBeNull();
    });

    it('adds the header once across several calls', () => {
        addPane(plugin, note, iconOverlay('🌟'));

        expect(add()).toBe(true);
        expect(add()).toBe(false);
        expect(add()).toBe(false);

        expect(containerEl.querySelectorAll(':scope > .pixel-banner-print')).toHaveLength(1);
    });

    it('falls back to the icon when the banner value gives no image to print', () => {
        addPane(plugin, note, iconOverlay('🌟'));

        expect(add('mountains')).toBe(true);

        const wrapper = containerEl.querySelector('.pixel-banner-print');
        expect(wrapper.classList.contains('pixel-banner-print-icon-only')).toBe(true);
        expect(wrapper.querySelector('img.pixel-banner-print-image')).toBeNull();
        expect(wrapper.querySelector('.banner-icon-overlay')).not.toBeNull();
    });

    it('gives a banner wrapper the banner-mode icon variables', () => {
        plugin.loadedImages.set(note.path, 'blob:cached');
        guards.cacheSet.mockClear();
        addPane(plugin, note, iconOverlay('🌟'));

        expect(add('https://example.com/banner.jpg')).toBe(true);

        const wrapper = containerEl.querySelector('.pixel-banner-print');
        expect(wrapper.classList.contains('pixel-banner-print-icon-only')).toBe(false);
        expect(wrapper.style.getPropertyValue('--pixel-banner-icon-translate-y')).toBe('-15%');
        expect(wrapper.style.getPropertyValue('--pixel-banner-icon-start')).toBe('315px');
        expect(wrapper.style.getPropertyValue('--pixel-banner-icon-size')).toBe(`70px`);
    });
});

describe('clonePaneIcon', () => {
    const note = new TFile('notes/note.md');
    let plugin;

    beforeEach(() => {
        plugin = createPlugin();
    });

    it('clones an emoji icon from the pane showing the note', () => {
        const overlay = iconOverlay('🌄');
        addPane(plugin, new TFile('other.md'), iconOverlay('🐳'));
        addPane(plugin, note, overlay);

        const clone = clonePaneIcon(plugin, note);
        expect(clone).not.toBe(overlay);
        expect(clone.classList.contains('banner-icon-overlay')).toBe(true);
        expect(clone.textContent).toBe('🌄');
        expect(clone.hasAttribute('data-persistent')).toBe(false);
        // The pane keeps its own icon
        expect(overlay.parentElement.classList.contains('markdown-preview-sizer')).toBe(true);
        expect(overlay.getAttribute('data-persistent')).toBe('true');
    });

    it('clones an image icon with its image', () => {
        const img = document.createElement('img');
        img.setAttribute('src', 'app://local/icon.png');
        addPane(plugin, note, iconOverlay(img));

        const clone = clonePaneIcon(plugin, note);
        expect(clone.querySelector('img').getAttribute('src')).toBe('app://local/icon.png');
    });

    it('returns null when no pane shows the note', () => {
        addPane(plugin, new TFile('other.md'), iconOverlay('🐳'));
        expect(clonePaneIcon(plugin, note)).toBeNull();
    });

    // An embedded note's icon is that note's, not the exported one's
    it('ignores icons of notes embedded in the pane', () => {
        const embed = document.createElement('div');
        embed.classList.add('internal-embed', 'markdown-embed');
        embed.appendChild(iconOverlay('🐳'));
        addPane(plugin, note, embed);
        expect(clonePaneIcon(plugin, note)).toBeNull();

        // The pane's own icon still wins over an embed listed before it
        plugin = createPlugin();
        addPane(plugin, note, embed, iconOverlay('🌄'));
        expect(clonePaneIcon(plugin, note).textContent).toBe('🌄');
    });

    it('returns null when the pane has no icon', () => {
        addPane(plugin, note, document.createElement('p'));
        expect(clonePaneIcon(plugin, note)).toBeNull();
    });
});

// A pane video with a frame ready; happy-dom has no media or canvas backend
function paneVideo({ readyState = 4, videoWidth = 640, videoHeight = 360 } = {}) {
    const video = document.createElement('video');
    video.classList.add('pixel-banner-video');
    Object.defineProperty(video, 'readyState', { value: readyState });
    Object.defineProperty(video, 'videoWidth', { value: videoWidth });
    Object.defineProperty(video, 'videoHeight', { value: videoHeight });
    return video;
}

describe('grabVideoFrame', () => {
    const note = new TFile('notes/note.md');
    let plugin;
    let drawImage;
    let toDataURL;

    beforeEach(() => {
        plugin = createPlugin();
        drawImage = vi.fn();
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage });
        toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AAA');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns the frame the pane video shows as a JPEG data URL', () => {
        const video = paneVideo();
        addPane(plugin, new TFile('other.md'), paneVideo());
        addPane(plugin, note, video);

        expect(grabVideoFrame(plugin, note)).toBe('data:image/jpeg;base64,AAA');
        expect(drawImage).toHaveBeenCalledWith(video, 0, 0);
        expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.9);
        const canvas = toDataURL.mock.contexts[0];
        expect(canvas.width).toBe(640);
        expect(canvas.height).toBe(360);
    });

    it('returns null when no pane shows the note', () => {
        addPane(plugin, new TFile('other.md'), paneVideo());
        expect(grabVideoFrame(plugin, note)).toBeNull();
    });

    // Since Obsidian 1.7.2 a background tab holds a DeferredView until it is shown
    it('skips a leaf whose view is not a markdown view', () => {
        const contentEl = document.createElement('div');
        contentEl.appendChild(paneVideo());
        contentEl.appendChild(iconOverlay('🌄'));
        plugin.app.workspace = { getLeavesOfType: vi.fn(() => [{ view: { file: note, contentEl } }]) };
        expect(grabVideoFrame(plugin, note)).toBeNull();
        expect(clonePaneIcon(plugin, note)).toBeNull();
    });

    it('returns null when the pane has no video', () => {
        addPane(plugin, note, document.createElement('p'));
        expect(grabVideoFrame(plugin, note)).toBeNull();
    });

    it('returns null before the video has a frame', () => {
        addPane(plugin, note, paneVideo({ readyState: 1 }));
        expect(grabVideoFrame(plugin, note)).toBeNull();
        expect(toDataURL).not.toHaveBeenCalled();
    });

    it('returns null for a video with no size', () => {
        addPane(plugin, note, paneVideo({ videoWidth: 0 }));
        expect(grabVideoFrame(plugin, note)).toBeNull();
        plugin = createPlugin();
        addPane(plugin, note, paneVideo({ videoHeight: 0 }));
        expect(grabVideoFrame(plugin, note)).toBeNull();
        expect(toDataURL).not.toHaveBeenCalled();
    });

    // A cross-origin video taints the canvas
    it('returns null when the canvas cannot be read', () => {
        toDataURL.mockImplementation(() => {
            throw new DOMException('The canvas has been tainted', 'SecurityError');
        });
        addPane(plugin, note, paneVideo());
        expect(grabVideoFrame(plugin, note)).toBeNull();
    });
});
