import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
    getInputType, 
    getIconImageInputType,
    getPathFromObsidianLink, 
    getPathFromMarkdownImage, 
    getVaultImageUrl, 
    preloadImage, 
    getFolderPath, 
    getFolderSpecificImage, 
    getFolderSpecificSetting, 
    getRandomImageFromFolder, 
    getActiveApiProvider, 
    hasBannerFrontmatter, 
    createFolderImageSettings 
} from '@/core/bannerUtils.js';
import { createMockApp, TFile, TFolder } from 'obsidian';

// Test context object to simulate 'this' context in banner utils
let testContext;

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Blob constructor
global.Blob = vi.fn().mockImplementation(() => ({}));

// Mock Image constructor
global.Image = class {
    constructor() {
        this.onload = null;
        this.onerror = null;
        this.src = '';
    }
    
    set src(value) {
        this._src = value;
        // Simulate successful image load after a short delay
        setTimeout(() => {
            if (this.onload) this.onload();
        }, 10);
    }
    
    get src() {
        return this._src;
    }
};

describe('bannerUtils', () => {
    beforeEach(() => {
        // Create mock app with vault and metadata cache
        const mockApp = createMockApp();
        
        // Add some mock files to the vault
        const imageFile = new TFile('test-image.jpg');
        const folderWithImages = new TFolder('images');
        const childImage1 = new TFile('images/image1.png');
        const childImage2 = new TFile('images/image2.gif');
        
        folderWithImages.children = [childImage1, childImage2];
        
        mockApp.vault.files.set('test-image.jpg', imageFile);
        mockApp.vault.files.set('images/image1.png', childImage1);
        mockApp.vault.files.set('images/image2.gif', childImage2);
        mockApp.vault.folders.set('images', folderWithImages);
        
        // Mock getAbstractFileByPath
        mockApp.vault.getAbstractFileByPath = vi.fn((path) => {
            return mockApp.vault.files.get(path) || mockApp.vault.folders.get(path) || null;
        });
        
        // Mock getResourcePath
        mockApp.vault.getResourcePath = vi.fn((file) => `app://vault/${file.path}`);
        
        // Mock readBinary
        mockApp.vault.readBinary = vi.fn(async () => new ArrayBuffer(1024));
        
        // Mock getFirstLinkpathDest
        mockApp.metadataCache.getFirstLinkpathDest = vi.fn((path) => {
            return mockApp.vault.getAbstractFileByPath(path);
        });
        
        // Test context with mock settings
        testContext = {
            app: mockApp,
            settings: {
                apiProvider: 'pexels',
                pexelsApiKey: 'test-pexels-key',
                pixabayApiKey: '',
                flickrApiKey: 'test-flickr-key',
                unsplashApiKey: '',
                customBannerField: ['banner', 'image'],
                folderImages: [
                    {
                        folder: 'projects',
                        image: 'project-banner.jpg',
                        directChildrenOnly: false,
                        enableImageShuffle: false
                    },
                    {
                        folder: 'personal',
                        image: 'personal-banner.jpg',
                        directChildrenOnly: true,
                        enableImageShuffle: true,
                        shuffleFolder: 'banners'
                    },
                    {
                        folder: '/',
                        image: 'root-banner.jpg',
                        directChildrenOnly: false,
                        enableImageShuffle: false
                    }
                ]
            },
            getFolderPath: getFolderPath.bind(testContext),
            createFolderImageSettings: createFolderImageSettings.bind(testContext),
            getRandomImageFromFolder: getRandomImageFromFolder.bind(testContext)
        };
    });
    
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('getInputType', () => {
        it('should detect URL input type', () => {
            const result = getInputType.call(testContext, 'https://example.com/image.jpg');
            expect(result).toBe('url');
        });

        it('should detect obsidian link input type', () => {
            expect(getInputType.call(testContext, '[[test-image.jpg]]')).toBe('obsidianLink');
            expect(getInputType.call(testContext, '![[test-image.jpg]]')).toBe('obsidianLink');
            expect(getInputType.call(testContext, '"[[test-image.jpg]]"')).toBe('obsidianLink');
        });

        it('should detect unquoted wiki image formats', () => {
            expect(getInputType.call(testContext, '![[folder/subfolder/image.jpg]]')).toBe('obsidianLink');
            expect(getInputType.call(testContext, '![[subfolder/image.jpg]]')).toBe('obsidianLink');
            expect(getInputType.call(testContext, '![[image.jpg]]')).toBe('obsidianLink');
        });

        it('should detect markdown image input type', () => {
            expect(getInputType.call(testContext, '![](image.jpg)')).toBe('markdownImage');
            expect(getInputType.call(testContext, '"![](image.jpg)"')).toBe('markdownImage');
        });

        it('should detect file URL input type', () => {
            const result = getInputType.call(testContext, 'file:///C:/path/to/image.jpg');
            expect(result).toBe('fileUrl');
        });

        it('should detect vault path input type', () => {
            // Ensure the file exists in vault mock and has proper extension
            const imageFile = new TFile('test-image.jpg');
            imageFile.extension = 'jpg';
            testContext.app.vault.files.set('test-image.jpg', imageFile);
            testContext.app.vault.getAbstractFileByPath = vi.fn((path) => {
                if (path === 'test-image.jpg') return imageFile;
                return null;
            });

            const result = getInputType.call(testContext, 'test-image.jpg');
            expect(result).toBe('vaultPath');
        });

        it('should detect WebP files as vaultPath', () => {
            // Test WebP file extension support
            const webpFile = new TFile('test-image.webp');
            webpFile.extension = 'webp';
            testContext.app.vault.files.set('test-image.webp', webpFile);
            testContext.app.vault.getAbstractFileByPath = vi.fn((path) => {
                if (path === 'test-image.webp') return webpFile;
                return null;
            });

            const result = getInputType.call(testContext, 'test-image.webp');
            expect(result).toBe('vaultPath');
        });

        it('should detect quoted WebP files as vaultPath', () => {
            // Test quoted WebP file paths
            const webpFile = new TFile('folder/image.webp');
            webpFile.extension = 'webp';
            testContext.app.vault.files.set('folder/image.webp', webpFile);
            testContext.app.vault.getAbstractFileByPath = vi.fn((path) => {
                if (path === 'folder/image.webp') return webpFile;
                return null;
            });

            expect(getInputType.call(testContext, '"folder/image.webp"')).toBe('vaultPath');
            expect(getInputType.call(testContext, "'folder/image.webp'")).toBe('vaultPath');
        });

        it('should detect WebP files via getFirstLinkpathDest', () => {
            // Test partial path resolution for WebP files
            const webpFile = new TFile('images/banners/sunset.webp');
            webpFile.extension = 'webp';

            testContext.app.vault.getAbstractFileByPath = vi.fn(() => null); // Exact path fails
            testContext.app.metadataCache.getFirstLinkpathDest = vi.fn((path) => {
                if (path === 'sunset.webp') return webpFile;
                return null;
            });

            const result = getInputType.call(testContext, 'sunset.webp');
            expect(result).toBe('vaultPath');
        });

        it('should detect unquoted path formats', () => {
            // Set up mock files for different path formats
            const files = [
                'folder/subfolder/image.jpg',
                'subfolder/image.jpg', 
                'image.jpg'
            ];
            
            files.forEach(path => {
                const imageFile = new TFile(path);
                imageFile.extension = 'jpg';
                testContext.app.vault.files.set(path, imageFile);
            });
            
            testContext.app.vault.getAbstractFileByPath = vi.fn((path) => {
                return testContext.app.vault.files.get(path) || null;
            });
            
            expect(getInputType.call(testContext, 'folder/subfolder/image.jpg')).toBe('vaultPath');
            expect(getInputType.call(testContext, 'subfolder/image.jpg')).toBe('vaultPath');
            expect(getInputType.call(testContext, 'image.jpg')).toBe('vaultPath');
        });

        it('should detect keyword input type for non-existing files', () => {
            const result = getInputType.call(testContext, 'nature landscape');
            expect(result).toBe('keyword');
        });

        it('should handle invalid input types', () => {
            expect(getInputType.call(testContext, null)).toBe('invalid');
            expect(getInputType.call(testContext, 123)).toBe('invalid');
            expect(getInputType.call(testContext, {})).toBe('invalid');
        });

        it('should handle array input by flattening', () => {
            // Ensure the file exists in vault mock and has proper extension
            const imageFile = new TFile('test-image.jpg');
            imageFile.extension = 'jpg';
            testContext.app.vault.getAbstractFileByPath = vi.fn((path) => {
                if (path === 'test-image.jpg') return imageFile;
                return null;
            });
            
            const result = getInputType.call(testContext, [['test-image.jpg']]);
            expect(result).toBe('vaultPath');
        });

        it('should trim and clean input strings', () => {
            // Test obsidian link detection (doesn't require vault lookup)
            expect(getInputType.call(testContext, '![[test-image.jpg]]')).toBe('obsidianLink');
            
            // Test quoted input - for this test we'll check that it gets to the URL check
            // Since it's not a valid URL and file doesn't exist, it should be 'keyword'
            expect(getInputType.call(testContext, '  "some-keyword"  ')).toBe('keyword');
        });
    });

    describe('getIconImageInputType', () => {
        beforeEach(() => {
            // Add a test image file with space in name for testing partial resolution
            const carLoanImage = new TFile('assets/car loan.png');
            carLoanImage.extension = 'png';
            testContext.app.vault.files.set('assets/car loan.png', carLoanImage);
            
            // Mock getFirstLinkpathDest to find files by partial path/filename
            testContext.app.metadataCache.getFirstLinkpathDest = vi.fn((path) => {
                // If exact path exists, return it
                const exactFile = testContext.app.vault.files.get(path);
                if (exactFile) return exactFile;
                
                // Otherwise, try to find by filename
                for (const [fullPath, file] of testContext.app.vault.files) {
                    const fileName = fullPath.split('/').pop();
                    if (fileName === path) {
                        return file;
                    }
                }
                return null;
            });
        });

        it('should detect vault path for bare filename that exists in vault', () => {
            const result = getIconImageInputType.call(testContext, 'car loan.png');
            expect(result).toBe('vaultPath');
        });

        it('should detect vault path for quoted filename that exists in vault', () => {
            const result = getIconImageInputType.call(testContext, '"car loan.png"');
            expect(result).toBe('vaultPath');
        });

        it('should detect vault path for partial path that exists in vault', () => {
            const result = getIconImageInputType.call(testContext, 'assets/car loan.png');
            expect(result).toBe('vaultPath');
        });

        it('should still detect URLs correctly', () => {
            const result = getIconImageInputType.call(testContext, 'https://example.com/icon.jpg');
            expect(result).toBe('url');
        });

        it('should still detect wiki links correctly', () => {
            const result = getIconImageInputType.call(testContext, '[[car loan.png]]');
            expect(result).toBe('obsidianLink');
        });

        it('should return keyword for non-existent files', () => {
            const result = getIconImageInputType.call(testContext, 'nonexistent-file.png');
            expect(result).toBe('keyword');
        });

        it('should detect WebP files as vaultPath', () => {
            // Test WebP file extension support in icon image input type
            const webpIcon = new TFile('icons/icon.webp');
            webpIcon.extension = 'webp';
            testContext.app.vault.files.set('icons/icon.webp', webpIcon);
            testContext.app.vault.getAbstractFileByPath = vi.fn((path) => {
                if (path === 'icons/icon.webp') return webpIcon;
                return testContext.app.vault.files.get(path) || null;
            });

            const result = getIconImageInputType.call(testContext, 'icons/icon.webp');
            expect(result).toBe('vaultPath');
        });
    });

    describe('getPathFromObsidianLink', () => {
        it('should extract path from basic obsidian link', () => {
            const result = getPathFromObsidianLink.call(testContext, '[[test-image.jpg]]');
            expect(testContext.app.metadataCache.getFirstLinkpathDest).toHaveBeenCalledWith('test-image.jpg', '');
        });

        it('should handle links with aliases', () => {
            getPathFromObsidianLink.call(testContext, '[[test-image.jpg|My Image]]');
            expect(testContext.app.metadataCache.getFirstLinkpathDest).toHaveBeenCalledWith('test-image.jpg', '');
        });

        it('should handle render links with exclamation', () => {
            getPathFromObsidianLink.call(testContext, '![[test-image.jpg]]');
            expect(testContext.app.metadataCache.getFirstLinkpathDest).toHaveBeenCalledWith('test-image.jpg', '');
        });

        it('should handle quoted links', () => {
            getPathFromObsidianLink.call(testContext, '"[[test-image.jpg]]"');
            expect(testContext.app.metadataCache.getFirstLinkpathDest).toHaveBeenCalledWith('test-image.jpg', '');
        });
    });

    describe('getPathFromMarkdownImage', () => {
        it('should extract URL from markdown image syntax', () => {
            const result = getPathFromMarkdownImage.call(testContext, '![](https://example.com/image.jpg)');
            expect(result).toBe('https://example.com/image.jpg');
        });

        it('should extract vault path from markdown image syntax', () => {
            getPathFromMarkdownImage.call(testContext, '![](test-image.jpg)');
            expect(testContext.app.metadataCache.getFirstLinkpathDest).toHaveBeenCalledWith('test-image.jpg', '');
        });

        it('should handle quoted markdown images', () => {
            const result = getPathFromMarkdownImage.call(testContext, '"![](https://example.com/image.jpg)"');
            expect(result).toBe('https://example.com/image.jpg');
        });

        it('should return null for invalid format', () => {
            const result = getPathFromMarkdownImage.call(testContext, 'invalid-format');
            expect(result).toBeNull();
        });
    });

    describe('getVaultImageUrl', () => {
        it('should create blob URL for image files', async () => {
            const imageFile = new TFile('test-image.jpg');
            imageFile.extension = 'jpg';
            testContext.app.vault.files.set('test-image.jpg', imageFile);
            testContext.app.vault.getAbstractFileByPath = vi.fn(() => imageFile);
            
            const result = await getVaultImageUrl.call(testContext, 'test-image.jpg');
            
            expect(result).toEqual({
                url: 'blob:test-url',
                isVideo: false,
                fileType: 'jpg'
            });
        });

        it('should use resource path for video files', async () => {
            const videoFile = new TFile('test-video.mp4');
            videoFile.extension = 'mp4';
            testContext.app.vault.files.set('test-video.mp4', videoFile);
            testContext.app.vault.getAbstractFileByPath = vi.fn(() => videoFile);
            
            const result = await getVaultImageUrl.call(testContext, 'test-video.mp4');
            
            expect(result).toEqual({
                url: 'app://vault/test-video.mp4',
                isVideo: true,
                fileType: 'mp4',
                originalPath: 'test-video.mp4'
            });
        });

        it('should handle SVG files with correct MIME type', async () => {
            const svgFile = new TFile('test-image.svg');
            svgFile.extension = 'svg';
            testContext.app.vault.files.set('test-image.svg', svgFile);
            testContext.app.vault.getAbstractFileByPath = vi.fn(() => svgFile);
            
            const result = await getVaultImageUrl.call(testContext, 'test-image.svg');
            
            // Just verify we get a result with correct properties
            expect(result).toEqual({
                url: 'blob:test-url',
                isVideo: false,
                fileType: 'svg'
            });
        });

        it('should return null for non-existent files', async () => {
            const result = await getVaultImageUrl.call(testContext, 'non-existent.jpg');
            expect(result).toBeNull();
        });

        it('should handle read errors gracefully', async () => {
            const imageFile = new TFile('error-image.jpg');
            imageFile.extension = 'jpg';
            testContext.app.vault.getAbstractFileByPath = vi.fn(() => imageFile);
            testContext.app.vault.readBinary = vi.fn().mockRejectedValue(new Error('Read error'));
            
            const result = await getVaultImageUrl.call(testContext, 'error-image.jpg');
            expect(result).toBeNull();
        });
    });

    describe('preloadImage', () => {
        it('should resolve with URL on successful image load', async () => {
            const url = 'https://example.com/image.jpg';
            const result = await preloadImage(url);
            expect(result).toBe(url);
        });

        it('should reject on image load error', async () => {
            // Mock Image to simulate error
            global.Image = class {
                constructor() {
                    this.onload = null;
                    this.onerror = null;
                }
                
                set src(value) {
                    setTimeout(() => {
                        if (this.onerror) this.onerror();
                    }, 10);
                }
            };

            await expect(preloadImage('invalid-url')).rejects.toThrow();
            
            // Restore normal Image mock
            global.Image = class {
                constructor() {
                    this.onload = null;
                    this.onerror = null;
                }
                
                set src(value) {
                    setTimeout(() => {
                        if (this.onload) this.onload();
                    }, 10);
                }
            };
        });
    });

    describe('getFolderPath', () => {
        it('should return folder path for file with path', () => {
            expect(getFolderPath('folder/subfolder/file.md')).toBe('folder/subfolder');
            expect(getFolderPath('projects/notes/daily.md')).toBe('projects/notes');
        });

        it('should return root for files without folder', () => {
            expect(getFolderPath('file.md')).toBe('/');
            expect(getFolderPath('')).toBe('/');
        });

        it('should handle null/undefined input', () => {
            expect(getFolderPath(null)).toBe('/');
            expect(getFolderPath(undefined)).toBe('/');
        });

        it('should handle single-level paths', () => {
            expect(getFolderPath('folder/file.md')).toBe('folder');
        });
    });

    describe('getFolderSpecificImage', () => {
        it('should return most specific folder match', () => {
            const result = getFolderSpecificImage.call(testContext, 'projects/subfolder/file.md');
            expect(result).toEqual({
                folder: 'projects',
                image: 'project-banner.jpg',
                directChildrenOnly: false,
                enableImageShuffle: false
            });
        });

        it('should respect directChildrenOnly setting', () => {
            // The personal folder has directChildrenOnly: true, so it should only match direct children
            // 'personal/subfolder/file.md' is not a direct child of 'personal', so should fall back to root folder
            const result = getFolderSpecificImage.call(testContext, 'personal/subfolder/file.md');
            expect(result).not.toBeNull(); // Should match root folder instead
            expect(result.folder).toBe('/'); // Should fall back to root folder rule
        });

        it('should match direct children when directChildrenOnly is true', () => {
            const result = getFolderSpecificImage.call(testContext, 'personal/file.md');
            expect(result.folder).toBe('personal');
        });

        it('should handle root folder matching', () => {
            const result = getFolderSpecificImage.call(testContext, 'random-file.md');
            expect(result.folder).toBe('/');
        });

        it('should return null for no matches', () => {
            testContext.settings.folderImages = [];
            const result = getFolderSpecificImage.call(testContext, 'any-file.md');
            expect(result).toBeNull();
        });

        it('should handle shuffle folder logic', () => {
            // Mock the createFolderImageSettings method to handle shuffle logic
            testContext.createFolderImageSettings = vi.fn().mockImplementation((folderImage) => {
                const settings = { ...folderImage };
                if (folderImage.enableImageShuffle && folderImage.shuffleFolder) {
                    settings.image = 'banners/random-image.jpg';
                }
                return settings;
            });
            
            const result = getFolderSpecificImage.call(testContext, 'personal/file.md');
            expect(result.image).toBe('banners/random-image.jpg');
            expect(testContext.createFolderImageSettings).toHaveBeenCalled();
        });
    });

    describe('getFolderSpecificSetting', () => {
        beforeEach(() => {
            testContext.settings.folderImages = [
                { folder: 'projects', opacity: 0.8, height: 300 },
                { folder: 'personal', opacity: 0.6, height: 0 } // Test zero value
            ];
        });

        it('should return folder-specific setting value', () => {
            const opacity = getFolderSpecificSetting.call(testContext, 'projects/file.md', 'opacity');
            expect(opacity).toBe(0.8);
        });

        it('should handle zero values correctly', () => {
            const height = getFolderSpecificSetting.call(testContext, 'personal/file.md', 'height');
            expect(height).toBe(0);
        });

        it('should return undefined for non-existent setting', () => {
            const result = getFolderSpecificSetting.call(testContext, 'projects/file.md', 'nonExistent');
            expect(result).toBeUndefined();
        });

        it('should return undefined for no matching folder', () => {
            const result = getFolderSpecificSetting.call(testContext, 'other/file.md', 'opacity');
            expect(result).toBeUndefined();
        });
    });

    describe('getRandomImageFromFolder', () => {
        it('should return random image from folder', () => {
            // Mock folder and children properly
            const folderWithImages = new TFolder('images');
            const childImage1 = new TFile('images/image1.png');
            childImage1.extension = 'png';
            const childImage2 = new TFile('images/image2.gif');
            childImage2.extension = 'gif';
            
            folderWithImages.children = [childImage1, childImage2];
            testContext.app.vault.getAbstractFileByPath = vi.fn((path) => {
                if (path === 'images') return folderWithImages;
                return null;
            });
            
            const result = getRandomImageFromFolder.call(testContext, 'images');
            expect(['images/image1.png', 'images/image2.gif']).toContain(result);
        });

        it('should return null for non-existent folder', () => {
            const result = getRandomImageFromFolder.call(testContext, 'non-existent');
            expect(result).toBeNull();
        });

        it('should return null for folder with no images', () => {
            const emptyFolder = new TFolder('empty');
            emptyFolder.children = [];
            testContext.app.vault.folders.set('empty', emptyFolder);
            testContext.app.vault.getAbstractFileByPath = vi.fn((path) => {
                if (path === 'empty') return emptyFolder;
                return testContext.app.vault.files.get(path) || testContext.app.vault.folders.get(path);
            });
            
            const result = getRandomImageFromFolder.call(testContext, 'empty');
            expect(result).toBeNull();
        });

        it('should handle errors gracefully', () => {
            testContext.app.vault.getAbstractFileByPath = vi.fn().mockImplementation(() => {
                throw new Error('Vault error');
            });
            
            const result = getRandomImageFromFolder.call(testContext, 'any-folder');
            expect(result).toBeNull();
        });
    });

    describe('getActiveApiProvider', () => {
        it('should return specific provider when not set to "all"', () => {
            testContext.settings.apiProvider = 'pexels';
            const result = getActiveApiProvider.call(testContext);
            expect(result).toBe('pexels');
        });

        it('should return random available provider when set to "all"', () => {
            testContext.settings.apiProvider = 'all';
            const result = getActiveApiProvider.call(testContext);
            expect(['pexels', 'flickr']).toContain(result);
        });

        it('should return null when no API keys configured', () => {
            testContext.settings.apiProvider = 'all';
            testContext.settings.pexelsApiKey = '';
            testContext.settings.flickrApiKey = '';
            
            const result = getActiveApiProvider.call(testContext);
            expect(result).toBeNull();
        });

        it('should only return providers with valid API keys', () => {
            testContext.settings.apiProvider = 'all';
            testContext.settings.pexelsApiKey = '';
            testContext.settings.flickrApiKey = 'valid-key';
            
            const result = getActiveApiProvider.call(testContext);
            expect(result).toBe('flickr');
        });
    });

    describe('hasBannerFrontmatter', () => {
        it('should return true when banner field exists', () => {
            const mockFile = new TFile('test.md');
            testContext.app.metadataCache.getFileCache = vi.fn().mockReturnValue({
                frontmatter: { banner: 'image.jpg' }
            });
            
            const result = hasBannerFrontmatter.call(testContext, mockFile);
            expect(result).toBe(true);
        });

        it('should check all custom banner fields', () => {
            const mockFile = new TFile('test.md');
            testContext.app.metadataCache.getFileCache = vi.fn().mockReturnValue({
                frontmatter: { image: 'photo.jpg' }
            });
            
            const result = hasBannerFrontmatter.call(testContext, mockFile);
            expect(result).toBe(true);
        });

        it('should return false when no banner fields exist', () => {
            const mockFile = new TFile('test.md');
            testContext.app.metadataCache.getFileCache = vi.fn().mockReturnValue({
                frontmatter: { title: 'Test Note' }
            });
            
            const result = hasBannerFrontmatter.call(testContext, mockFile);
            expect(result).toBe(false);
        });

        it('should return false when no frontmatter exists', () => {
            const mockFile = new TFile('test.md');
            testContext.app.metadataCache.getFileCache = vi.fn().mockReturnValue(null);
            
            const result = hasBannerFrontmatter.call(testContext, mockFile);
            expect(result).toBe(false);
        });

        it('should return false when no metadata exists', () => {
            const mockFile = new TFile('test.md');
            testContext.app.metadataCache.getFileCache = vi.fn().mockReturnValue({});
            
            const result = hasBannerFrontmatter.call(testContext, mockFile);
            expect(result).toBe(false);
        });
    });

    describe('createFolderImageSettings', () => {
        it('should create copy of folder image settings', () => {
            const folderImage = {
                folder: 'test',
                image: 'banner.jpg',
                opacity: 0.8
            };
            
            const result = createFolderImageSettings.call(testContext, folderImage);
            expect(result).toEqual(folderImage);
            expect(result).not.toBe(folderImage); // Should be a copy
        });

        it('should handle shuffle settings and replace image', () => {
            const folderImage = {
                folder: 'test',
                image: 'banner.jpg',
                enableImageShuffle: true,
                shuffleFolder: 'banners'
            };
            
            testContext.getRandomImageFromFolder = vi.fn().mockReturnValue('banners/random.jpg');
            
            const result = createFolderImageSettings.call(testContext, folderImage);
            expect(result.image).toBe('banners/random.jpg');
            expect(testContext.getRandomImageFromFolder).toHaveBeenCalledWith('banners');
        });

        it('should keep original image when shuffle returns null', () => {
            const folderImage = {
                folder: 'test',
                image: 'banner.jpg',
                enableImageShuffle: true,
                shuffleFolder: 'empty-folder'
            };
            
            testContext.getRandomImageFromFolder = vi.fn().mockReturnValue(null);
            
            const result = createFolderImageSettings.call(testContext, folderImage);
            expect(result.image).toBe('banner.jpg');
        });

        it('should not shuffle when enableImageShuffle is false', () => {
            const folderImage = {
                folder: 'test',
                image: 'banner.jpg',
                enableImageShuffle: false,
                shuffleFolder: 'banners'
            };
            
            testContext.getRandomImageFromFolder = vi.fn();
            
            const result = createFolderImageSettings.call(testContext, folderImage);
            expect(result.image).toBe('banner.jpg');
            expect(testContext.getRandomImageFromFolder).not.toHaveBeenCalled();
        });
    });
});