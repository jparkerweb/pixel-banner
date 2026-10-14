import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    findUnquotedBannerLink,
    findUnquotedBannerLinkInText,
    checkUnquotedBannerLink
} from '@/utils/unquotedBannerLink.js';
import { Notice } from 'obsidian';

vi.mock('obsidian', async () => {
    const actual = await vi.importActual('obsidian');
    return {
        ...actual,
        Notice: vi.fn().mockImplementation((message) => ({ message }))
    };
});

// Unquoted banner links are not read as text by YAML (issue #289)

describe('findUnquotedBannerLink', () => {
    it('finds a banner parsed as a list inside a list', () => {
        expect(findUnquotedBannerLink({ banner: [['image.jpg']] }, ['banner']))
            .toEqual({ field: 'banner', value: '[[image.jpg]]' });
    });

    it('checks every banner field name, including comma separated ones', () => {
        expect(findUnquotedBannerLink({ cover: [['a.png']] }, ['banner, cover']))
            .toEqual({ field: 'cover', value: '[[a.png]]' });
    });

    it('ignores quoted links, plain values and real lists', () => {
        expect(findUnquotedBannerLink({ banner: '[[image.jpg]]' }, ['banner'])).toBeNull();
        expect(findUnquotedBannerLink({ banner: 'sunset' }, ['banner'])).toBeNull();
        expect(findUnquotedBannerLink({ banner: ['[[image.jpg]]'] }, ['banner'])).toBeNull();
        expect(findUnquotedBannerLink({ banner: [['a.jpg', 'b.jpg']] }, ['banner'])).toBeNull();
        expect(findUnquotedBannerLink(undefined, ['banner'])).toBeNull();
    });
});

describe('findUnquotedBannerLinkInText', () => {
    it('finds an unquoted embed link in the frontmatter block', () => {
        const text = '---\ntitle: "A Tale: B"\nbanner: ![[image.jpg]]\n---\nbody\n';
        expect(findUnquotedBannerLinkInText(text, ['banner']))
            .toEqual({ field: 'banner', value: '![[image.jpg]]' });
    });

    it('handles CRLF line endings and plain wiki links', () => {
        const text = '---\r\nbanner: [[folder/image.jpg]]\r\n---\r\nbody';
        expect(findUnquotedBannerLinkInText(text, ['banner']))
            .toEqual({ field: 'banner', value: '[[folder/image.jpg]]' });
    });

    it('ignores quoted values and lines outside the frontmatter', () => {
        expect(findUnquotedBannerLinkInText('---\nbanner: "![[image.jpg]]"\n---\n', ['banner'])).toBeNull();
        expect(findUnquotedBannerLinkInText('---\ntitle: x\n---\nbanner: ![[image.jpg]]\n', ['banner'])).toBeNull();
        expect(findUnquotedBannerLinkInText('no frontmatter', ['banner'])).toBeNull();
    });
});

describe('checkUnquotedBannerLink', () => {
    let plugin;
    let cache;
    let file;

    beforeEach(() => {
        Notice.mockClear();
        cache = {};
        file = { path: 'notes/a.md', basename: 'a', extension: 'md' };
        plugin = {
            settings: { customBannerField: ['banner'] },
            app: {
                metadataCache: { getFileCache: vi.fn(() => cache) },
                vault: { cachedRead: vi.fn(async () => '') }
            }
        };
    });

    it('shows the fix once per note', async () => {
        cache.frontmatter = { banner: [['image.jpg']] };

        await checkUnquotedBannerLink(plugin, file);
        await checkUnquotedBannerLink(plugin, file);

        expect(Notice).toHaveBeenCalledTimes(1);
        expect(Notice.mock.calls[0][0]).toContain('banner: "[[image.jpg]]"');
    });

    it('reads the note only when its frontmatter could not be parsed', async () => {
        cache.frontmatter = { banner: '![[image.jpg]]' };
        await checkUnquotedBannerLink(plugin, file);
        expect(plugin.app.vault.cachedRead).not.toHaveBeenCalled();
        expect(Notice).not.toHaveBeenCalled();

        delete cache.frontmatter;
        plugin.app.vault.cachedRead.mockResolvedValue('---\nbanner: ![[image.jpg]]\n---\n');
        await checkUnquotedBannerLink(plugin, file);
        expect(Notice).toHaveBeenCalledTimes(1);
        expect(Notice.mock.calls[0][0]).toContain('banner: "![[image.jpg]]"');
    });

    it('uses text it is given instead of reading the note', async () => {
        await checkUnquotedBannerLink(plugin, file, '---\nbanner: [[x.png]]\n---\n');
        expect(plugin.app.vault.cachedRead).not.toHaveBeenCalled();
        expect(Notice).toHaveBeenCalledTimes(1);
    });

    it('ignores non-markdown files', async () => {
        cache.frontmatter = { banner: [['image.jpg']] };
        await checkUnquotedBannerLink(plugin, { ...file, extension: 'canvas' });
        expect(Notice).not.toHaveBeenCalled();
    });
});
