import { describe, it, expect, beforeEach, vi } from 'vitest';
import { insertPersistentElement, installPersistentChildrenOverride } from '@/core/bannerManager.js';

// Our elements must stay in front of Obsidian's sections. If one trails them, Obsidian's reading
// view measures a collapsed last section against it and folding breaks (issue #315).

function makeEl(cls) {
    const el = document.createElement('div');
    el.className = cls;
    return el;
}

function classesOf(container) {
    return Array.from(container.children).map(c => c.className);
}

// Stand-in for Obsidian's setChildrenInPlace: make the container's children exactly `children`.
function fakeSetChildrenInPlace(children) {
    Array.from(this.children).forEach(c => { if (!children.includes(c)) c.remove(); });
    children.forEach(c => this.appendChild(c));
}

describe('bannerManager persistent children', () => {
    let container;
    let pusher;
    let sectionOne;
    let sectionTwo;
    let footer;

    beforeEach(() => {
        container = makeEl('markdown-preview-sizer');
        pusher = makeEl('markdown-preview-pusher');
        sectionOne = makeEl('section-one');
        sectionTwo = makeEl('section-two');
        footer = makeEl('mod-footer');
        [pusher, sectionOne, sectionTwo, footer].forEach(el => container.appendChild(el));
    });

    describe('insertPersistentElement', () => {
        it('inserts after our existing front elements and before Obsidian children', () => {
            const banner = makeEl('pixel-banner-image');
            container.insertBefore(banner, container.firstChild);

            insertPersistentElement(container, makeEl('select-image-icon'));
            insertPersistentElement(container, makeEl('view-image-icon'));

            expect(classesOf(container)).toEqual([
                'pixel-banner-image', 'select-image-icon', 'view-image-icon',
                'markdown-preview-pusher', 'section-one', 'section-two', 'mod-footer'
            ]);
        });

        it('works on an empty container and when the element is already in front', () => {
            const empty = makeEl('cm-sizer');
            const icon = makeEl('pin-icon');
            insertPersistentElement(empty, icon);
            insertPersistentElement(empty, icon);
            expect(classesOf(empty)).toEqual(['pin-icon']);
        });
    });

    describe('installPersistentChildrenOverride', () => {
        it('keeps the banner and every icon in front of the sections Obsidian passes in', () => {
            container.setChildrenInPlace = fakeSetChildrenInPlace;
            const ours = ['refresh-icon', 'pixel-banner-image', 'pin-icon', 'banner-icon-overlay',
                'view-image-icon', 'select-image-icon'].map(makeEl);
            ours.forEach(el => container.appendChild(el));

            installPersistentChildrenOverride(container);
            // Obsidian passes only its own children, e.g. after a heading fold.
            container.setChildrenInPlace([pusher, sectionOne, footer]);

            expect(classesOf(container)).toEqual([
                'pixel-banner-image', 'banner-icon-overlay', 'select-image-icon',
                'view-image-icon', 'pin-icon', 'refresh-icon',
                'markdown-preview-pusher', 'section-one', 'mod-footer'
            ]);
            expect(container.lastElementChild).toBe(footer);
        });

        it('drops duplicates of our elements from the incoming list', () => {
            container.setChildrenInPlace = fakeSetChildrenInPlace;
            const banner = makeEl('pixel-banner-image');
            container.insertBefore(banner, container.firstChild);

            installPersistentChildrenOverride(container);
            container.setChildrenInPlace([pusher, banner, sectionOne]);

            expect(classesOf(container)).toEqual(['pixel-banner-image', 'markdown-preview-pusher', 'section-one']);
        });

        it('passes the list through untouched when none of our elements are present', () => {
            const original = vi.fn();
            container.setChildrenInPlace = original;
            installPersistentChildrenOverride(container);

            const children = [pusher, sectionOne];
            container.setChildrenInPlace(children);

            expect(original).toHaveBeenCalledWith(children);
        });

        it('installs only once', () => {
            const original = vi.fn();
            container.setChildrenInPlace = original;
            installPersistentChildrenOverride(container);
            const first = container.setChildrenInPlace;
            installPersistentChildrenOverride(container);
            expect(container.setChildrenInPlace).toBe(first);
        });

        it('does nothing when setChildrenInPlace is missing', () => {
            installPersistentChildrenOverride(container);
            expect(container.setChildrenInPlace).toBeUndefined();
            expect(container._hasOverriddenSetChildrenInPlace).toBeUndefined();
        });

        it('falls back to the original call if the override throws', () => {
            const original = vi.fn();
            container.setChildrenInPlace = original;
            container.appendChild(makeEl('pixel-banner-image'));
            installPersistentChildrenOverride(container);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            container.querySelector = () => { throw new Error('boom'); };
            const children = [pusher, sectionOne];
            container.setChildrenInPlace(children);

            expect(original).toHaveBeenLastCalledWith(children);
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
