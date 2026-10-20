// Export to PDF renders the note into a separate, short-lived print document
// (.print > .markdown-preview-view) and prints it about a second later. The async
// updateBanner() path finishes after that, so the PDF came out without a banner
// (issue #323). Everything here runs synchronously from the markdown post
// processor: no fetch, no timers, no writes to the pane's caches.

import { MarkdownView } from 'obsidian';
import { getFrontmatterValue } from '../utils/frontmatterUtils.js';
import { resolveField } from './fieldRegistry.js';
import { getIconLayoutVars } from './headerMode.js';


// ---------------------
// -- is print render --
// ---------------------
// True for the top level preview of a print render. Notes embedded in the printed
// note are left alone, as are normal reading views and hover popovers.
function isPrintRender(containerEl) {
    if (!containerEl) return false;
    return containerEl.classList.contains('markdown-preview-view') &&
        containerEl.closest('.print') !== null &&
        containerEl.closest('.markdown-embed') === null;
}


// ---------------------
// -- is cached video --
// ---------------------
// The same test addPixelBanner() uses: a { isVideo: true } entry, or a cached video
// resource URL (they contain '/media-attachment/').
function isCachedVideo(cached) {
    if (cached && typeof cached === 'object') return cached.isVideo === true;
    if (typeof cached !== 'string') return false;
    const url = cached.toLowerCase();
    return cached.includes('/media-attachment/') && (url.endsWith('.mp4') || url.endsWith('.mov'));
}


// ----------------------------------
// -- resolve print image source --
// ----------------------------------
// The image the open pane already resolved, else a local or direct source that
// needs no async work. Keyword banners only print the pane's image: fetching a new
// one would pick a different random image, and too late. Returns { src } or null.
function resolvePrintImageSource(plugin, file, bannerImage) {
    const cached = plugin.loadedImages.get(file.path);
    // Video banners print the pane video's current frame, or nothing
    if (isCachedVideo(cached)) {
        const frame = grabVideoFrame(plugin, file);
        return frame ? { src: frame } : null;
    }
    if (typeof cached === 'string' && cached) {
        return { src: cached };
    }
    if (cached && typeof cached === 'object' && cached.url) {
        return { src: cached.url };
    }

    const input = Array.isArray(bannerImage) ? bannerImage.flat()[0] : bannerImage;
    if (typeof input !== 'string') return null;

    const type = plugin.getInputType(input, file.path);
    if (type === 'url') {
        return { src: input.trim() };
    }

    // Resolve the vault path the same way getImageUrl() does
    let vaultPath = null;
    if (type === 'vaultPath') {
        const exact = plugin.app.vault.getAbstractFileByPath(input);
        if (exact && 'extension' in exact) {
            vaultPath = input;
        } else {
            vaultPath = plugin.app.metadataCache.getFirstLinkpathDest(input, file.path)?.path ?? null;
        }
    } else if (type === 'obsidianLink') {
        vaultPath = plugin.getPathFromObsidianLink(input)?.path ?? null;
    } else if (type === 'markdownImage') {
        const target = plugin.getPathFromMarkdownImage(input, file.path);
        if (typeof target === 'string') {
            try {
                new URL(target);
                return { src: target };
            } catch (_) {
                vaultPath = target;
            }
        } else {
            vaultPath = target?.path ?? null;
        }
    }
    if (!vaultPath) return null;

    const tfile = plugin.app.vault.getAbstractFileByPath(vaultPath);
    if (!tfile || !('extension' in tfile)) return null;
    // An <img> cannot show a video file: no banner rather than a broken image
    if (/^(mp4|mov)$/i.test(tfile.extension)) return null;
    return { src: plugin.app.vault.getResourcePath(tfile) };
}


// --------------------------
// -- find pane for file --
// --------------------------
// The markdown leaf showing the note being exported, or undefined. A background tab
// can still hold a DeferredView, which has no content to read.
function findPaneForFile(plugin, file) {
    return plugin.app.workspace.getLeavesOfType('markdown')
        .find(leaf => leaf.view instanceof MarkdownView && leaf.view.file === file);
}


// ----------------------
// -- grab video frame --
// ----------------------
// The frame the pane's video banner is showing, as a JPEG data URL: a <video> in the
// print document would print blank. Drawn on a canvas in the main document, so only
// the string reaches the print render. Returns null when no frame is ready, or when
// a cross-origin video has tainted the canvas (toDataURL throws SecurityError).
function grabVideoFrame(plugin, file) {
    const video = findPaneForFile(plugin, file)?.view?.contentEl?.querySelector('video.pixel-banner-video');
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;

    try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.9);
    } catch (error) {
        return null;
    }
}


// ---------------------
// -- clone pane icon --
// ---------------------
// A copy of the banner icon the open pane already rendered, so the PDF shows the
// same emoji, text or image without resolving it again. Returns null without one.
function clonePaneIcon(plugin, file) {
    const leaf = findPaneForFile(plugin, file);
    // Notes embedded in the pane have overlays of their own: skip those
    const overlays = leaf?.view?.contentEl?.querySelectorAll('.banner-icon-overlay') ?? [];
    const overlay = Array.from(overlays).find(el => !el.closest('.internal-embed, .markdown-embed'));
    if (!overlay) return null;

    const clone = overlay.cloneNode(true);
    clone.removeAttribute('data-persistent');
    return clone;
}


// ------------------
// -- set icon vars --
// ------------------
// Plain style.setProperty: Obsidian's setCssProps may not exist on elements of the print document
function setIconVars(el, vars) {
    for (const [name, value] of Object.entries(vars)) {
        el.style.setProperty(name, value);
    }
}


// -------------------------
// -- add print icon only --
// -------------------------
// An icon-only note's header: the pane's icon at the top of the print render, in normal flow.
// Returns true when it was added, false without a pane icon to copy
function addPrintIconOnly(plugin, containerEl, { file, frontmatter, folderSpecific }) {
    const icon = clonePaneIcon(plugin, file);
    if (!icon) return false;

    const doc = containerEl.ownerDocument;
    const wrapper = doc.createElement('div');
    wrapper.className = 'pixel-banner-print pixel-banner-print-icon-only';
    wrapper.appendChild(icon.ownerDocument === doc ? icon : doc.importNode(icon, true));
    setIconVars(wrapper, getIconLayoutVars(plugin, frontmatter, folderSpecific, { mode: 'icon-only' }));
    containerEl.insertBefore(wrapper, containerEl.firstChild);
    return true;
}


// ----------------------
// -- add print banner --
// ----------------------
// Puts the banner at the top of the print render as an <img> in normal flow, which
// prints regardless of background printing. The post processor runs once per
// section, so only the first call adds it. Returns true when a banner was added.
function addPrintBanner(plugin, containerEl, { file, frontmatter, bannerImage }) {
    if (containerEl.querySelector(':scope > .pixel-banner-print')) return false;

    let wrapper = null;
    try {
        const folderSpecific = plugin.getFolderSpecificImage(file.path);
        // No banner value, or one with no image to print: the icon alone, when the pane has one
        const source = bannerImage ? resolvePrintImageSource(plugin, file, bannerImage) : null;
        if (!source) return addPrintIconOnly(plugin, containerEl, { file, frontmatter, folderSpecific });

        // The print render has its own document
        const doc = containerEl.ownerDocument;
        wrapper = doc.createElement('div');
        wrapper.className = 'pixel-banner-print';
        const img = doc.createElement('img');
        img.className = 'pixel-banner-print-image';
        img.setAttribute('src', source.src);
        img.setAttribute('alt', '');
        img.setAttribute('loading', 'eager');
        img.setAttribute('decoding', 'sync');
        wrapper.appendChild(img);

        // The icon straddles the banner's bottom edge; has-icon makes room for it
        const icon = clonePaneIcon(plugin, file);
        if (icon) {
            wrapper.appendChild(icon.ownerDocument === doc ? icon : doc.importNode(icon, true));
            wrapper.classList.add('has-icon');
        }
        containerEl.insertBefore(wrapper, containerEl.firstChild);

        // The cloned overlay carries no inline styles: it reads the icon variables from here
        setIconVars(wrapper, getIconLayoutVars(plugin, frontmatter, folderSpecific, {
            mode: 'banner',
            bannerHeight: resolveField(plugin, 'height', frontmatter, folderSpecific)
        }));

        // Same resolution as the hover popover branch of the post processor
        const imageDisplay = getFrontmatterValue(frontmatter, plugin.settings.customImageDisplayField) ||
            folderSpecific?.imageDisplay ||
            plugin.settings.imageDisplay;
        const imageRepeat = getFrontmatterValue(frontmatter, plugin.settings.customImageRepeatField) ??
            folderSpecific?.imageRepeat ??
            plugin.settings.imageRepeat;
        // styles.css crops with object-fit: cover; Image Display "contain" shows the whole image
        img.classList.toggle('pixel-banner-print-contain', imageDisplay === 'contain');
        plugin.applyBannerSettings(img, { file, frontmatter, imageDisplay, imageRepeat }, false);
        return true;
    } catch (error) {
        wrapper?.remove();
        console.warn('Pixel Banner: could not add the banner to the PDF export', error);
        return false;
    }
}


export {
    isPrintRender,
    resolvePrintImageSource,
    addPrintBanner,
    clonePaneIcon,
    grabVideoFrame
};
