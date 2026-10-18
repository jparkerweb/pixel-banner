import { describe, it, expect, beforeEach } from 'vitest';
import {
    FIELDS,
    getFieldNames,
    getPrimaryName,
    getAllFieldNames,
    resolveField,
    writeField,
    clearField
} from '@/core/fieldRegistry.js';
import { DEFAULT_SETTINGS } from '@/settings/settings.js';

// The keys of a folderImages entry, as the Add Folder Image button in
// src/settings/tabs/settingsTabFolderImages.js builds it, plus the icon keys its
// addBannerIconSettings controls save
const FOLDER_ENTRY_KEYS = [
    'folder', 'image', 'imageDisplay', 'imageRepeat', 'yPosition', 'xPosition',
    'contentStartPosition', 'bannerHeight', 'fade', 'borderRadius', 'titleColor',
    'directChildrenOnly', 'enableImageShuffle', 'shuffleFolder',
    'bannerIconSize', 'bannerIconXPosition', 'bannerIconOpacity', 'bannerIconColor',
    'bannerIconFontWeight', 'bannerIconBackgroundColor', 'bannerIconPaddingX',
    'bannerIconPaddingY', 'bannerIconBorderRadius', 'bannerIconVerticalOffset'
];

const makePlugin = (overrides = {}) => ({
    settings: { ...structuredClone(DEFAULT_SETTINGS), ...overrides }
});

describe('fieldRegistry', () => {
    describe('the table', () => {
        it('has one entry for every custom*Field setting and no extras', () => {
            const settingKeys = Object.keys(DEFAULT_SETTINGS).filter(key => /^custom.*Field$/.test(key)).sort();
            const registryKeys = FIELDS.map(field => field.namesKey).sort();
            expect(registryKeys).toEqual(settingKeys);
            expect(FIELDS).toHaveLength(31);
        });

        it('has unique ids', () => {
            const ids = FIELDS.map(field => field.id);
            expect(new Set(ids).size).toBe(ids.length);
        });

        it('points every settingKey at a setting that exists', () => {
            for (const field of FIELDS.filter(f => f.settingKey)) {
                expect(DEFAULT_SETTINGS, field.id).toHaveProperty(field.settingKey);
            }
        });

        it('points every folderKey at a key folder entries have', () => {
            for (const field of FIELDS.filter(f => f.folderKey)) {
                expect(FOLDER_ENTRY_KEYS, field.id).toContain(field.folderKey);
            }
        });

        it('puts every field in a known group', () => {
            for (const field of FIELDS) {
                expect(['banner', 'icon', 'confetti']).toContain(field.group);
            }
        });

        it('is frozen', () => {
            expect(Object.isFrozen(FIELDS)).toBe(true);
            expect(Object.isFrozen(FIELDS[0])).toBe(true);
        });
    });

    describe('names', () => {
        it('splits comma-separated entries and keeps their order', () => {
            const plugin = makePlugin({ customBannerField: ['banner, image', 'cover'] });
            expect(getFieldNames(plugin, 'banner')).toEqual(['banner', 'image', 'cover']);
            expect(getPrimaryName(plugin, 'banner')).toBe('banner');
        });

        it('accepts a single string and drops empty parts', () => {
            const plugin = makePlugin({ customFadeField: 'banner-fade, , fade' });
            expect(getFieldNames(plugin, 'fade')).toEqual(['banner-fade', 'fade']);
        });

        it('returns no names when the setting is missing', () => {
            const plugin = { settings: {} };
            expect(getFieldNames(plugin, 'fade')).toEqual([]);
            expect(getPrimaryName(plugin, 'fade')).toBeUndefined();
        });

        it('reads the settings live', () => {
            const plugin = makePlugin();
            expect(getPrimaryName(plugin, 'fade')).toBe('banner-fade');
            plugin.settings.customFadeField = ['fade'];
            expect(getPrimaryName(plugin, 'fade')).toBe('fade');
        });

        it('throws for an unknown field id', () => {
            expect(() => getFieldNames(makePlugin(), 'nope')).toThrow('unknown banner field "nope"');
        });

        it('lists every field name, and leaves out excluded groups', () => {
            const plugin = makePlugin();
            const all = getAllFieldNames(plugin);
            expect(all).toContain('banner-confetti');
            expect(all).toContain('banner-align');
            expect(all).toContain('icon-image');
            expect(all).toContain('pixel-banner-flag-color');

            const withoutConfetti = getAllFieldNames(plugin, { excludeGroups: ['confetti'] });
            expect(withoutConfetti).not.toContain('banner-confetti');
            expect(withoutConfetti).toContain('banner-align');
        });

        it('lists each name once', () => {
            const plugin = makePlugin({ customXPositionField: ['banner-x', 'x'], customBannerIconXPositionField: ['x'] });
            const all = getAllFieldNames(plugin);
            expect(all.filter(name => name === 'x')).toHaveLength(1);
        });
    });

    describe('resolveField', () => {
        let plugin;
        const folder = { fade: -20 };

        beforeEach(() => {
            plugin = makePlugin();
        });

        it('keeps 0 from the frontmatter', () => {
            expect(resolveField(plugin, 'fade', { 'banner-fade': 0 }, folder)).toBe(0);
        });

        it('falls through an empty or null frontmatter value to the folder', () => {
            expect(resolveField(plugin, 'fade', { 'banner-fade': '' }, folder)).toBe(-20);
            expect(resolveField(plugin, 'fade', { 'banner-fade': null }, folder)).toBe(-20);
        });

        it('falls through an empty folder value to the setting', () => {
            expect(resolveField(plugin, 'fade', {}, { fade: '' })).toBe(-40);
        });

        it('uses the setting when nothing else is set', () => {
            expect(resolveField(plugin, 'fade', null)).toBe(DEFAULT_SETTINGS.fade);
        });

        it('falls through an empty setting to the registry default, which fade does not have', () => {
            plugin.settings.fade = '';
            expect(resolveField(plugin, 'fade', {}, { fade: '' })).toBeUndefined();
        });

        it('keeps 0 from the folder and the setting', () => {
            expect(resolveField(plugin, 'fade', {}, { fade: 0 })).toBe(0);
            plugin.settings.fade = 0;
            expect(resolveField(plugin, 'fade', {})).toBe(0);
        });

        it('ignores the folder entry for fields without a folder key', () => {
            expect(resolveField(plugin, 'iconImageSizeMultiplier', {}, { bannerIconImageSizeMultiplier: 3 })).toBe(DEFAULT_SETTINGS.bannerIconImageSizeMultiplier);
        });

        it('turns boolean strings into booleans and leaves number strings alone', () => {
            expect(resolveField(plugin, 'imageRepeat', { 'banner-repeat': 'true' })).toBe(true);
            expect(resolveField(plugin, 'imageRepeat', { 'banner-repeat': 'FALSE' })).toBe(false);
            expect(resolveField(plugin, 'iconPaddingX', { 'icon-padding-x': '10' })).toBe('10');
        });

        it('keeps false from the setting', () => {
            expect(resolveField(plugin, 'imageRepeat', {})).toBe(false);
        });

        it('uses the registry default when a setting is empty by design', () => {
            expect(DEFAULT_SETTINGS.bannerIconColor).toBe('');
            expect(resolveField(plugin, 'iconColor', {})).toBe('var(--text-normal)');
            expect(resolveField(plugin, 'iconBackgroundColor', {})).toBeUndefined();
        });

        it('uses the registry default for fields with no setting', () => {
            expect(resolveField(plugin, 'alignment', {})).toBe('center');
            expect(resolveField(plugin, 'iconRotate', {})).toBe(0);
            expect(resolveField(plugin, 'icon', {})).toBeUndefined();
        });

        it('reads the field under a second configured name', () => {
            expect(resolveField(plugin, 'xPosition', { x: 12 })).toBe(12);
        });

        it('goes to the folder when the first present name is empty, not to the later names', () => {
            expect(resolveField(plugin, 'xPosition', { 'banner-x': '', x: 5 }, { xPosition: 7 })).toBe(7);
        });

        it('reads names configured as one comma-separated entry', () => {
            plugin.settings.customFadeField = ['banner-fade, fade'];
            expect(resolveField(plugin, 'fade', { fade: -5 })).toBe(-5);
        });
    });

    describe('writeField and clearField', () => {
        let plugin;

        beforeEach(() => {
            plugin = makePlugin();
        });

        it('writes under the name the note already uses', () => {
            const fm = { title: 'Note', x: 10 };
            writeField(fm, plugin, 'xPosition', 30);
            expect(fm).toEqual({ title: 'Note', x: 30 });
        });

        it('keeps the first present name and removes the other', () => {
            const fm = { 'banner-x': 10, x: 20 };
            writeField(fm, plugin, 'xPosition', 30);
            expect(fm).toEqual({ 'banner-x': 30 });
        });

        it('writes the primary name when no name is present', () => {
            const fm = { title: 'Note' };
            writeField(fm, plugin, 'xPosition', 30);
            expect(fm).toEqual({ title: 'Note', 'banner-x': 30 });
        });

        it('writes the first name of a comma-separated entry, never the whole entry', () => {
            plugin.settings.customBannerField = ['banner, image'];
            const fm = {};
            writeField(fm, plugin, 'banner', 'cover.png');
            expect(fm).toEqual({ banner: 'cover.png' });
            expect(fm).not.toHaveProperty('banner, image');
        });

        it('removes other present names given as one comma-separated entry', () => {
            plugin.settings.customBannerField = ['banner, image'];
            const fm = { image: 'old.png', banner: 'older.png' };
            writeField(fm, plugin, 'banner', 'new.png');
            expect(fm).toEqual({ banner: 'new.png' });
        });

        it('writes 0 and false as values', () => {
            const fm = {};
            writeField(fm, plugin, 'iconOpacity', 0);
            writeField(fm, plugin, 'imageRepeat', false);
            expect(fm).toEqual({ 'icon-opacity': 0, 'banner-repeat': false });
        });

        it('clears the field when writing null or undefined', () => {
            const fm = { title: 'Note', 'banner-x': 10, x: 20 };
            writeField(fm, plugin, 'xPosition', null);
            expect(fm).toEqual({ title: 'Note' });
        });

        it('clears every configured name and nothing else', () => {
            const fm = { title: 'Note', 'banner-y': 10, y: 20, 'banner-x': 5 };
            clearField(fm, plugin, 'yPosition');
            expect(fm).toEqual({ title: 'Note', 'banner-x': 5 });
        });

        it('does nothing without a frontmatter object or names', () => {
            expect(() => writeField(null, plugin, 'fade', 1)).not.toThrow();
            expect(() => clearField(undefined, plugin, 'fade')).not.toThrow();
            const fm = {};
            writeField(fm, { settings: {} }, 'fade', 1);
            expect(fm).toEqual({});
        });
    });
});
