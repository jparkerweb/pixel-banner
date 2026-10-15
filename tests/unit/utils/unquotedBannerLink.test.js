import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    findUnquotedBannerLink,
    findUnquotedBannerLinkInText,
    checkUnquotedBannerLink,
    scheduleUnquotedBannerLinkCheck,
    UNQUOTED_BANNER_LINK_SETTLE_MS
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

    it('reads the note only when Obsidian could not parse its properties', async () => {
        cache.frontmatter = { banner: '![[image.jpg]]' };
        await checkUnquotedBannerLink(plugin, file);
        expect(plugin.app.vault.cachedRead).not.toHaveBeenCalled();
        expect(Notice).not.toHaveBeenCalled();

        // No properties at all: nothing to read
        delete cache.frontmatter;
        cache.sections = [{ type: 'paragraph' }];
        await checkUnquotedBannerLink(plugin, file);
        expect(plugin.app.vault.cachedRead).not.toHaveBeenCalled();

        // A properties block that failed to parse still shows as a yaml section
        cache.sections = [{ type: 'yaml' }, { type: 'paragraph' }];
        plugin.app.vault.cachedRead.mockResolvedValue('---\nbanner: ![[image.jpg]]\n---\n');
        await checkUnquotedBannerLink(plugin, file);
        expect(Notice).toHaveBeenCalledTimes(1);
        expect(Notice.mock.calls[0][0]).toContain('banner: "![[image.jpg]]"');
    });

    it('ignores non-markdown files', async () => {
        cache.frontmatter = { banner: [['image.jpg']] };
        await checkUnquotedBannerLink(plugin, { ...file, extension: 'canvas' });
        expect(Notice).not.toHaveBeenCalled();
    });

    // A note re-opened at startup (issue #333) is checked twice in quick succession
    it('shows the fix once when two checks overlap while the note is read', async () => {
        cache.sections = [{ type: 'yaml' }];
        plugin.app.vault.cachedRead.mockResolvedValue('---\nbanner: ![[image.jpg]]\n---\n');

        await Promise.all([
            checkUnquotedBannerLink(plugin, file),
            checkUnquotedBannerLink(plugin, file)
        ]);

        expect(Notice).toHaveBeenCalledTimes(1);
        expect(plugin.app.vault.cachedRead).toHaveBeenCalledTimes(1);
    });

    it('checks the note again later when the read found nothing', async () => {
        cache.sections = [{ type: 'yaml' }];
        plugin.app.vault.cachedRead.mockResolvedValue('---\nbanner: "![[image.jpg]]"\n---\n');
        await checkUnquotedBannerLink(plugin, file);
        expect(Notice).not.toHaveBeenCalled();

        plugin.app.vault.cachedRead.mockResolvedValue('---\nbanner: ![[image.jpg]]\n---\n');
        await checkUnquotedBannerLink(plugin, file);
        expect(Notice).toHaveBeenCalledTimes(1);
    });
});

describe('scheduleUnquotedBannerLinkCheck', () => {
    let plugin;
    let cache;
    let file;

    beforeEach(() => {
        vi.useFakeTimers();
        Notice.mockClear();
        cache = {};
        file = { path: 'notes/b.md', basename: 'b', extension: 'md' };
        plugin = {
            settings: { customBannerField: ['banner'] },
            register: vi.fn(),
            app: {
                metadataCache: { getFileCache: vi.fn(() => cache) },
                vault: { cachedRead: vi.fn(async () => '') },
                // the note is open in a pane unless a test says otherwise
                workspace: { getLeavesOfType: vi.fn(() => [{ view: { file } }]) }
            }
        };
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('reports the settled value, not a half-typed one', async () => {
        cache.frontmatter = { banner: [['im']] };
        scheduleUnquotedBannerLinkCheck(plugin, file);
        await vi.advanceTimersByTimeAsync(1000);

        cache.frontmatter = { banner: [['image.jpg']] };
        scheduleUnquotedBannerLinkCheck(plugin, file);

        // The first schedule was cancelled: nothing runs until the second settles
        await vi.advanceTimersByTimeAsync(UNQUOTED_BANNER_LINK_SETTLE_MS - 1);
        expect(plugin.app.metadataCache.getFileCache).not.toHaveBeenCalled();
        expect(Notice).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(plugin.app.metadataCache.getFileCache).toHaveBeenCalledTimes(1);
        expect(Notice).toHaveBeenCalledTimes(1);
        expect(Notice.mock.calls[0][0]).toContain('banner: "[[image.jpg]]"');
    });

    it('skips notes that are not open, such as notes changed by sync', async () => {
        cache.frontmatter = { banner: [['image.jpg']] };
        plugin.app.workspace.getLeavesOfType.mockReturnValue([{ view: { file: { path: 'other.md' } } }]);
        scheduleUnquotedBannerLinkCheck(plugin, file);
        await vi.advanceTimersByTimeAsync(UNQUOTED_BANNER_LINK_SETTLE_MS);

        expect(Notice).not.toHaveBeenCalled();
    });

    it('keeps its timers straight when the note is renamed while waiting', async () => {
        cache.frontmatter = { banner: [['image.jpg']] };
        scheduleUnquotedBannerLinkCheck(plugin, file);
        file.path = 'notes/renamed.md';
        scheduleUnquotedBannerLinkCheck(plugin, file);
        await vi.advanceTimersByTimeAsync(UNQUOTED_BANNER_LINK_SETTLE_MS);

        expect(plugin.unquotedBannerLinkTimers.size).toBe(0);
        expect(Notice).toHaveBeenCalledTimes(1);
    });

    it('stays quiet when the value is quoted by the time the note settles', async () => {
        cache.frontmatter = { banner: [['image.jpg']] };
        scheduleUnquotedBannerLinkCheck(plugin, file);
        cache.frontmatter = { banner: '[[image.jpg]]' };
        await vi.advanceTimersByTimeAsync(UNQUOTED_BANNER_LINK_SETTLE_MS);

        expect(Notice).not.toHaveBeenCalled();
    });

    it('still checks an edit made while an earlier check reads the note', async () => {
        cache.sections = [{ type: 'yaml' }];
        let finishRead;
        plugin.app.vault.cachedRead.mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));

        // The first check claims the note and starts reading it
        scheduleUnquotedBannerLinkCheck(plugin, file);
        await vi.advanceTimersByTimeAsync(UNQUOTED_BANNER_LINK_SETTLE_MS);
        expect(plugin.unquotedBannerLinkWarned.has(file.path)).toBe(true);

        // The edit that adds the unquoted link lands during that read
        scheduleUnquotedBannerLinkCheck(plugin, file);
        finishRead('---\nbanner: "[[image.jpg]]"\n---\n');
        await vi.advanceTimersByTimeAsync(0);
        expect(Notice).not.toHaveBeenCalled();

        plugin.app.vault.cachedRead.mockResolvedValue('---\nbanner: [[image.jpg]]\n---\n');
        await vi.advanceTimersByTimeAsync(UNQUOTED_BANNER_LINK_SETTLE_MS);
        expect(Notice).toHaveBeenCalledTimes(1);
    });

    it('clears pending checks when the plugin unloads', async () => {
        cache.frontmatter = { banner: [['image.jpg']] };
        scheduleUnquotedBannerLinkCheck(plugin, file);
        const onUnload = plugin.register.mock.calls[0][0];
        onUnload();
        await vi.advanceTimersByTimeAsync(UNQUOTED_BANNER_LINK_SETTLE_MS);

        expect(Notice).not.toHaveBeenCalled();
    });
});
