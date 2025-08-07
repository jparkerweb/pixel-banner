import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
    getFrontmatterValue, 
    getValueWithZeroCheck, 
    updateNoteFrontmatter, 
    updateNoteFrontmatterWithUrl 
} from '@/utils/frontmatterUtils.js';
import { createMockApp, TFile, Notice } from 'obsidian';

// Mock Notice
vi.mock('obsidian', async () => {
    const actual = await vi.importActual('obsidian');
    return {
        ...actual,
        Notice: vi.fn().mockImplementation((message) => ({ message }))
    };
});

describe('frontmatterUtils', () => {
    let mockApp, mockPlugin;

    beforeEach(() => {
        mockApp = createMockApp();
        
        mockPlugin = {
            app: mockApp,
            settings: {
                customBannerField: ['banner', 'image'],
                imagePropertyFormat: '![[image]]',
                useShortPath: false,
                pinnedImageFolder: 'attachments'
            }
        };

        // Mock workspace.getActiveFile
        mockApp.workspace.getActiveFile = vi.fn();
        
        // Mock vault methods
        mockApp.vault.read = vi.fn();
        mockApp.vault.modify = vi.fn();
        mockApp.vault.getAbstractFileByPath = vi.fn();
        mockApp.vault.getFiles = vi.fn();

        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('getFrontmatterValue', () => {
        it('should return value for existing field', () => {
            const frontmatter = { banner: 'image.jpg', title: 'Test' };
            const result = getFrontmatterValue(frontmatter, 'banner');
            expect(result).toBe('image.jpg');
        });

        it('should return first matching field from array', () => {
            const frontmatter = { image: 'photo.jpg', title: 'Test' };
            const result = getFrontmatterValue(frontmatter, ['banner', 'image']);
            expect(result).toBe('photo.jpg');
        });

        it('should handle comma-separated field names', () => {
            const frontmatter = { photo: 'test.jpg' };
            const result = getFrontmatterValue(frontmatter, 'banner,image,photo');
            expect(result).toBe('test.jpg');
        });

        it('should handle mixed array and comma-separated fields', () => {
            const frontmatter = { cover: 'cover.jpg' };
            const result = getFrontmatterValue(frontmatter, ['banner,image', 'photo', 'cover']);
            expect(result).toBe('cover.jpg');
        });

        it('should return 0 explicitly when field value is 0', () => {
            const frontmatter = { opacity: 0, height: 200 };
            const result = getFrontmatterValue(frontmatter, 'opacity');
            expect(result).toBe(0);
        });

        it('should convert string booleans to actual booleans', () => {
            const frontmatter = { 
                enabled: 'true', 
                disabled: 'false',
                mixed: 'TRUE',
                other: 'False'
            };
            
            expect(getFrontmatterValue(frontmatter, 'enabled')).toBe(true);
            expect(getFrontmatterValue(frontmatter, 'disabled')).toBe(false);
            expect(getFrontmatterValue(frontmatter, 'mixed')).toBe(true);
            expect(getFrontmatterValue(frontmatter, 'other')).toBe(false);
        });

        it('should return null for non-existent fields', () => {
            const frontmatter = { title: 'Test' };
            const result = getFrontmatterValue(frontmatter, 'banner');
            expect(result).toBeNull();
        });

        it('should return null for null/undefined frontmatter', () => {
            expect(getFrontmatterValue(null, 'banner')).toBeNull();
            expect(getFrontmatterValue(undefined, 'banner')).toBeNull();
        });

        it('should return null for null/undefined fieldNames', () => {
            const frontmatter = { banner: 'image.jpg' };
            expect(getFrontmatterValue(frontmatter, null)).toBeNull();
            expect(getFrontmatterValue(frontmatter, undefined)).toBeNull();
        });

        it('should trim whitespace from comma-separated fields', () => {
            const frontmatter = { photo: 'test.jpg' };
            const result = getFrontmatterValue(frontmatter, 'banner, image , photo  ');
            expect(result).toBe('test.jpg');
        });

        it('should filter out empty fields after splitting', () => {
            const frontmatter = { image: 'test.jpg' };
            const result = getFrontmatterValue(frontmatter, 'banner,,image,');
            expect(result).toBe('test.jpg');
        });
    });

    describe('getValueWithZeroCheck', () => {
        it('should return first non-falsy value', () => {
            const values = [null, undefined, 'first-value', 'second-value'];
            const result = getValueWithZeroCheck(values);
            expect(result).toBe('first-value');
        });

        it('should return 0 when it is the first value', () => {
            const values = [0, 100, 200];
            const result = getValueWithZeroCheck(values);
            expect(result).toBe(0);
        });

        it('should return 0 when found later in array', () => {
            const values = [null, undefined, 0, 100];
            const result = getValueWithZeroCheck(values);
            expect(result).toBe(0);
        });

        it('should return last value when all are falsy', () => {
            const values = [null, undefined, null, 'default'];
            const result = getValueWithZeroCheck(values);
            expect(result).toBe('default');
        });

        it('should handle empty array', () => {
            const result = getValueWithZeroCheck([]);
            expect(result).toBeUndefined();
        });

        it('should warn and return null for non-array input', () => {
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            const result = getValueWithZeroCheck('not-an-array');
            expect(result).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('getValueWithZeroCheck expects an array of values');
            consoleSpy.mockRestore();
        });

        it('should handle boolean values correctly', () => {
            // false is falsy, so it should skip to true
            const values = [false, true, 'fallback'];
            const result = getValueWithZeroCheck(values);
            // The function checks for null/undefined, not general falsiness for booleans
            // So false is returned since it's not null/undefined
            expect(result).toBe(false);
        });

        it('should handle empty string as falsy', () => {
            const values = ['', 'non-empty', 'fallback'];
            const result = getValueWithZeroCheck(values);
            // The function checks for null/undefined, not general falsiness
            // So empty string is returned since it's not null/undefined
            expect(result).toBe('');
        });
    });

    describe('updateNoteFrontmatter', () => {
        beforeEach(() => {
            const activeFile = new TFile('test.md');
            mockApp.workspace.getActiveFile.mockReturnValue(activeFile);
        });

        it('should add frontmatter to file without existing frontmatter', async () => {
            const fileContent = 'This is the note content.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatter('images/banner.jpg', mockPlugin);
            
            const expectedContent = '---\nbanner: "![[images/banner.jpg]]"\n---\n\nThis is the note content.';
            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                expect.any(TFile),
                expectedContent
            );
        });

        it('should update existing frontmatter', async () => {
            const fileContent = '---\ntitle: Test Note\nbanner: old-image.jpg\n---\n\nNote content.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatter('images/new-banner.jpg', mockPlugin);
            
            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                expect.any(TFile),
                expect.stringContaining('banner: "![[images/new-banner.jpg]]"')
            );
        });

        it('should use short path when enabled and file is unique', async () => {
            mockPlugin.settings.useShortPath = true;
            const fileContent = 'Note content.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            const imageFile = new TFile('images/banner.jpg');
            imageFile.name = 'banner.jpg';
            mockApp.vault.getAbstractFileByPath.mockReturnValue(imageFile);
            mockApp.vault.getFiles.mockReturnValue([imageFile]); // Only one file with this name
            
            await updateNoteFrontmatter('images/banner.jpg', mockPlugin);
            
            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                expect.any(TFile),
                expect.stringContaining('banner: "![[banner.jpg]]"')
            );
        });

        it('should use full path when duplicate filenames exist', async () => {
            mockPlugin.settings.useShortPath = true;
            const fileContent = 'Note content.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            const imageFile = new TFile('images/banner.jpg');
            imageFile.name = 'banner.jpg';
            const duplicateFile = new TFile('other/banner.jpg');
            duplicateFile.name = 'banner.jpg';
            
            mockApp.vault.getAbstractFileByPath.mockReturnValue(imageFile);
            mockApp.vault.getFiles.mockReturnValue([imageFile, duplicateFile]);
            
            await updateNoteFrontmatter('images/banner.jpg', mockPlugin);
            
            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                expect.any(TFile),
                expect.stringContaining('banner: "![[images/banner.jpg]]"')
            );
        });

        it('should use different image format when configured', async () => {
            mockPlugin.settings.imagePropertyFormat = '[[image]]';
            const fileContent = 'Note content.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatter('images/banner.jpg', mockPlugin);
            
            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                expect.any(TFile),
                expect.stringContaining('banner: "[[images/banner.jpg]]"')
            );
        });

        it('should use custom field name when provided', async () => {
            const fileContent = 'Note content.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatter('images/banner.jpg', mockPlugin, 'cover');
            
            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                expect.any(TFile),
                expect.stringContaining('cover: "![[images/banner.jpg]]"')
            );
        });

        it('should clean existing banner fields before adding new one', async () => {
            const fileContent = '---\ntitle: Test\nbanner: old.jpg\nimage: another.jpg\n---\n\nContent.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatter('new.jpg', mockPlugin);
            
            const call = mockApp.vault.modify.mock.calls[0][1];
            expect(call).not.toContain('old.jpg');
            expect(call).not.toContain('another.jpg');
            expect(call).toContain('banner: "![[new.jpg]]"');
        });

        it('should handle empty file content', async () => {
            mockApp.vault.read.mockResolvedValue('');
            
            await updateNoteFrontmatter('banner.jpg', mockPlugin);
            
            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                expect.any(TFile),
                '---\nbanner: "![[banner.jpg]]"\n---\n\n'
            );
        });

        it('should trim leading whitespace from content', async () => {
            const fileContent = '   \n  \nNote content with leading whitespace.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatter('banner.jpg', mockPlugin);
            
            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                expect.any(TFile),
                '---\nbanner: "![[banner.jpg]]"\n---\n\nNote content with leading whitespace.'
            );
        });

        it('should not modify file if content is unchanged', async () => {
            const fileContent = '---\nbanner: "![[banner.jpg]]"\n---\n\nContent.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatter('banner.jpg', mockPlugin);
            
            expect(mockApp.vault.modify).not.toHaveBeenCalled();
        });

        it('should return early if no active file', async () => {
            mockApp.workspace.getActiveFile.mockReturnValue(null);
            
            await updateNoteFrontmatter('banner.jpg', mockPlugin);
            
            expect(mockApp.vault.read).not.toHaveBeenCalled();
            expect(mockApp.vault.modify).not.toHaveBeenCalled();
        });

        it('should show notice for duplicate filename scenario', async () => {
            mockPlugin.settings.useShortPath = true;
            const fileContent = 'Note content.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            const imageFile = new TFile('images/banner.jpg');
            imageFile.name = 'banner.jpg';
            const duplicateFile = new TFile('other/banner.jpg');
            duplicateFile.name = 'banner.jpg';
            
            mockApp.vault.getAbstractFileByPath.mockReturnValue(imageFile);
            mockApp.vault.getFiles.mockReturnValue([imageFile, duplicateFile]);
            
            await updateNoteFrontmatter('images/banner.jpg', mockPlugin);
            
            expect(Notice).toHaveBeenCalledWith('Banner image pinned (full path used due to duplicate filenames)');
        });

        it('should show normal notice for successful pin', async () => {
            const fileContent = 'Note content.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatter('banner.jpg', mockPlugin);
            
            expect(Notice).toHaveBeenCalledWith('Banner image pinned');
        });
    });

    describe('updateNoteFrontmatterWithUrl', () => {
        beforeEach(() => {
            const activeFile = new TFile('test.md');
            mockApp.workspace.getActiveFile.mockReturnValue(activeFile);
        });

        it('should add URL to frontmatter in file without existing frontmatter', async () => {
            const fileContent = 'This is the note content.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatterWithUrl('https://example.com/image.jpg', mockPlugin);
            
            const expectedContent = '---\nbanner: "https://example.com/image.jpg"\n---\n\nThis is the note content.';
            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                expect.any(TFile),
                expectedContent
            );
        });

        it('should update existing frontmatter with URL', async () => {
            const fileContent = '---\ntitle: Test Note\nbanner: old-image.jpg\n---\n\nNote content.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatterWithUrl('https://example.com/new-image.jpg', mockPlugin);
            
            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                expect.any(TFile),
                expect.stringContaining('banner: "https://example.com/new-image.jpg"')
            );
        });

        it('should use custom field name when provided', async () => {
            const fileContent = 'Note content.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatterWithUrl('https://example.com/image.jpg', mockPlugin, 'cover');
            
            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                expect.any(TFile),
                expect.stringContaining('cover: "https://example.com/image.jpg"')
            );
        });

        it('should clean existing banner fields before adding URL', async () => {
            const fileContent = '---\ntitle: Test\nbanner: old.jpg\nimage: another.jpg\n---\n\nContent.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatterWithUrl('https://example.com/new.jpg', mockPlugin);
            
            const call = mockApp.vault.modify.mock.calls[0][1];
            expect(call).not.toContain('old.jpg');
            expect(call).not.toContain('another.jpg');
            expect(call).toContain('banner: "https://example.com/new.jpg"');
        });

        it('should trim leading whitespace from content', async () => {
            const fileContent = '   \n  \nNote content with leading whitespace.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatterWithUrl('https://example.com/image.jpg', mockPlugin);
            
            expect(mockApp.vault.modify).toHaveBeenCalledWith(
                expect.any(TFile),
                '---\nbanner: "https://example.com/image.jpg"\n---\n\nNote content with leading whitespace.'
            );
        });

        it('should not modify file if content is unchanged', async () => {
            const fileContent = '---\nbanner: "https://example.com/image.jpg"\n---\n\nContent.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatterWithUrl('https://example.com/image.jpg', mockPlugin);
            
            expect(mockApp.vault.modify).not.toHaveBeenCalled();
        });

        it('should return early if no active file', async () => {
            mockApp.workspace.getActiveFile.mockReturnValue(null);
            
            await updateNoteFrontmatterWithUrl('https://example.com/image.jpg', mockPlugin);
            
            expect(mockApp.vault.read).not.toHaveBeenCalled();
            expect(mockApp.vault.modify).not.toHaveBeenCalled();
        });

        it('should show notice for successful URL pin', async () => {
            const fileContent = 'Note content.';
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatterWithUrl('https://example.com/image.jpg', mockPlugin);
            
            expect(Notice).toHaveBeenCalledWith('Banner image URL pinned');
        });

        it('should handle complex frontmatter structure', async () => {
            const fileContent = `---
title: "Complex Note"
tags: [test, note]
banner: old-banner.jpg
metadata:
  created: 2023-01-01
  updated: 2023-01-02
image: another-image.jpg
---

Note content here.`;
            
            mockApp.vault.read.mockResolvedValue(fileContent);
            
            await updateNoteFrontmatterWithUrl('https://example.com/new-banner.jpg', mockPlugin);
            
            const modifiedContent = mockApp.vault.modify.mock.calls[0][1];
            expect(modifiedContent).toContain('banner: "https://example.com/new-banner.jpg"');
            expect(modifiedContent).toContain('title: "Complex Note"');
            expect(modifiedContent).toContain('tags: [test, note]');
            expect(modifiedContent).not.toContain('old-banner.jpg');
            expect(modifiedContent).not.toContain('another-image.jpg');
        });
    });
});