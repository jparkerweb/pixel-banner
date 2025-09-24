import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateNoteFrontmatter } from '@/utils/frontmatterUtils.js';
import { createMockApp, TFile, Notice } from 'obsidian';

// Mock Notice
vi.mock('obsidian', async () => {
    const actual = await vi.importActual('obsidian');
    return {
        ...actual,
        Notice: vi.fn().mockImplementation((message) => ({ message }))
    };
});

describe('Image Property Format - Make.md Compatibility', () => {
    let mockApp, mockPlugin;

    beforeEach(() => {
        mockApp = createMockApp();

        mockPlugin = {
            app: mockApp,
            settings: {
                customBannerField: ['banner'],
                imagePropertyFormat: 'image', // Plain format for Make.md compatibility
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

        // Mock fileManager.processFrontMatter
        mockApp.fileManager = {
            processFrontMatter: vi.fn((file, callback) => {
                const frontmatter = {};
                callback(frontmatter);
                return Promise.resolve();
            })
        };
    });

    describe('Make.md Compatible Formats', () => {
        it('should save plain paths without any brackets for Make.md compatibility', async () => {
            const activeFile = new TFile('test.md');
            mockApp.workspace.getActiveFile.mockReturnValue(activeFile);

            await updateNoteFrontmatter('assets/cover.jpg', mockPlugin);

            expect(mockApp.fileManager.processFrontMatter).toHaveBeenCalled();

            const callback = mockApp.fileManager.processFrontMatter.mock.calls[0][1];
            const frontmatter = {};
            callback(frontmatter);

            // Make.md expects plain paths
            expect(frontmatter.banner).toBe('assets/cover.jpg');
            expect(frontmatter.banner).not.toContain('[[');
            expect(frontmatter.banner).not.toContain(']]');
            expect(frontmatter.banner).not.toContain('!');
        });

        it('should handle relative paths correctly for Make.md', async () => {
            const activeFile = new TFile('notes/daily.md');
            mockApp.workspace.getActiveFile.mockReturnValue(activeFile);

            await updateNoteFrontmatter('../images/header.png', mockPlugin);

            const callback = mockApp.fileManager.processFrontMatter.mock.calls[0][1];
            const frontmatter = {};
            callback(frontmatter);

            expect(frontmatter.banner).toBe('../images/header.png');
        });

        it('should handle root-relative paths for Make.md', async () => {
            const activeFile = new TFile('test.md');
            mockApp.workspace.getActiveFile.mockReturnValue(activeFile);

            await updateNoteFrontmatter('/attachments/banner.jpg', mockPlugin);

            const callback = mockApp.fileManager.processFrontMatter.mock.calls[0][1];
            const frontmatter = {};
            callback(frontmatter);

            expect(frontmatter.banner).toBe('/attachments/banner.jpg');
        });

        it('should handle simple filenames for Make.md', async () => {
            const activeFile = new TFile('test.md');
            mockApp.workspace.getActiveFile.mockReturnValue(activeFile);

            await updateNoteFrontmatter('cover.jpg', mockPlugin);

            const callback = mockApp.fileManager.processFrontMatter.mock.calls[0][1];
            const frontmatter = {};
            callback(frontmatter);

            expect(frontmatter.banner).toBe('cover.jpg');
        });

        it('should handle spaces in filenames for Make.md', async () => {
            const activeFile = new TFile('test.md');
            mockApp.workspace.getActiveFile.mockReturnValue(activeFile);

            await updateNoteFrontmatter('My Banner Image.jpg', mockPlugin);

            const callback = mockApp.fileManager.processFrontMatter.mock.calls[0][1];
            const frontmatter = {};
            callback(frontmatter);

            // Make.md can handle spaces in plain format
            expect(frontmatter.banner).toBe('My Banner Image.jpg');
        });

        it('should handle nested folder structures for Make.md', async () => {
            const activeFile = new TFile('test.md');
            mockApp.workspace.getActiveFile.mockReturnValue(activeFile);

            await updateNoteFrontmatter('assets/images/2024/january/banner.jpg', mockPlugin);

            const callback = mockApp.fileManager.processFrontMatter.mock.calls[0][1];
            const frontmatter = {};
            callback(frontmatter);

            expect(frontmatter.banner).toBe('assets/images/2024/january/banner.jpg');
        });
    });

    describe('Format Switching', () => {
        it('should switch from wiki link to plain format for Make.md', async () => {
            const activeFile = new TFile('test.md');
            mockApp.workspace.getActiveFile.mockReturnValue(activeFile);

            // Start with wiki link format
            mockPlugin.settings.imagePropertyFormat = '[[image]]';
            await updateNoteFrontmatter('banner.jpg', mockPlugin);

            let callback = mockApp.fileManager.processFrontMatter.mock.calls[0][1];
            let frontmatter = {};
            callback(frontmatter);
            expect(frontmatter.banner).toBe('[[banner.jpg]]');

            // Switch to plain format for Make.md
            mockPlugin.settings.imagePropertyFormat = 'image';
            await updateNoteFrontmatter('banner.jpg', mockPlugin);

            callback = mockApp.fileManager.processFrontMatter.mock.calls[1][1];
            frontmatter = {};
            callback(frontmatter);
            expect(frontmatter.banner).toBe('banner.jpg');
        });

        it('should switch from embedded to plain format for Make.md', async () => {
            const activeFile = new TFile('test.md');
            mockApp.workspace.getActiveFile.mockReturnValue(activeFile);

            // Start with embedded format
            mockPlugin.settings.imagePropertyFormat = '![[image]]';
            await updateNoteFrontmatter('header.png', mockPlugin);

            let callback = mockApp.fileManager.processFrontMatter.mock.calls[0][1];
            let frontmatter = {};
            callback(frontmatter);
            expect(frontmatter.banner).toBe('![[header.png]]');

            // Switch to plain format for Make.md
            mockPlugin.settings.imagePropertyFormat = 'image';
            await updateNoteFrontmatter('header.png', mockPlugin);

            callback = mockApp.fileManager.processFrontMatter.mock.calls[1][1];
            frontmatter = {};
            callback(frontmatter);
            expect(frontmatter.banner).toBe('header.png');
        });
    });
});