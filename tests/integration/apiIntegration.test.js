import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PixelBannerPlugin } from '@/core/pixelBannerPlugin.js';
import { createMockApp, createMockManifest, requestUrl, Notice } from 'obsidian';
import { DEFAULT_SETTINGS } from '@/settings/settings.js';
import { fetchPexelsImage, fetchPixabayImage, fetchFlickrImage, fetchUnsplashImage } from '@/services/apiService.js';

// DOM globals are automatically provided by happy-dom environment

describe('API Integration Tests', () => {
    let plugin;
    let mockApp;
    let mockManifest;
    let mockRequestUrl;

    // Mock API responses
    const mockPexelsResponse = {
        status: 200,
        json: {
            photos: [
                { src: { large: 'https://example.com/pexels1.jpg', medium: 'https://example.com/pexels1.jpg', small: 'https://example.com/pexels1.jpg' } },
                { src: { large: 'https://example.com/pexels2.jpg', medium: 'https://example.com/pexels2.jpg', small: 'https://example.com/pexels2.jpg' } }
            ]
        }
    };

    const mockPixabayResponse = {
        status: 200,
        json: {
            hits: [
                { largeImageURL: 'https://example.com/pixabay1.jpg' },
                { largeImageURL: 'https://example.com/pixabay2.jpg' }
            ]
        },
        arrayBuffer: new TextEncoder().encode(JSON.stringify({
            hits: [
                { largeImageURL: 'https://example.com/pixabay1.jpg' },
                { largeImageURL: 'https://example.com/pixabay2.jpg' }
            ]
        }))
    };

    const mockFlickrResponse = {
        status: 200,
        text: 'jsonFlickrApi({"photos":{"photo":[{"id":"123","secret":"abc","server":"456","farm":7}]}})',
        arrayBuffer: new TextEncoder().encode(JSON.stringify({
            stat: 'ok',
            photos: {
                photo: [
                    { id: '123', secret: 'abc', server: '456', farm: 7 }
                ]
            }
        }))
    };

    const mockUnsplashResponse = {
        status: 200,
        json: {
            results: [
                { urls: { regular: 'https://example.com/unsplash1.jpg', small: 'https://example.com/unsplash1.jpg', full: 'https://example.com/unsplash1.jpg' } },
                { urls: { regular: 'https://example.com/unsplash2.jpg', small: 'https://example.com/unsplash2.jpg', full: 'https://example.com/unsplash2.jpg' } }
            ]
        },
        arrayBuffer: new TextEncoder().encode(JSON.stringify({
            results: [
                { urls: { regular: 'https://example.com/unsplash1.jpg', small: 'https://example.com/unsplash1.jpg', full: 'https://example.com/unsplash1.jpg' } },
                { urls: { regular: 'https://example.com/unsplash2.jpg', small: 'https://example.com/unsplash2.jpg', full: 'https://example.com/unsplash2.jpg' } }
            ]
        }))
    };

    beforeEach(() => {
        mockApp = createMockApp();
        mockManifest = createMockManifest();
        plugin = new PixelBannerPlugin(mockApp, mockManifest);
        
        // Mock requestUrl directly on the imported mock
        mockRequestUrl = vi.fn();
        requestUrl.mockImplementation(mockRequestUrl);
        
        // Mock console methods
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    describe('API Provider Selection', () => {
        it('should use first available API provider', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                apiProviders: ['pexels', 'pixabay'],
                pexelsApiKey: 'test-pexels-key',
                pixabayApiKey: 'test-pixabay-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            const activeProvider = plugin.getActiveApiProvider();
            expect(activeProvider).toBe('pexels');
        });

        it('should skip providers without API keys', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                apiProviders: ['pexels', 'pixabay', 'unsplash'],
                // No pexels key
                pixabayApiKey: 'test-pixabay-key',
                unsplashApiKey: 'test-unsplash-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            const activeProvider = plugin.getActiveApiProvider();
            expect(activeProvider).toBe('pixabay');
        });

        it('should return null when no providers have API keys', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                apiProviders: ['pexels', 'pixabay', 'unsplash']
                // No API keys set
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            const activeProvider = plugin.getActiveApiProvider();
            expect(activeProvider).toBeNull();
        });

        it('should cycle through providers on failure', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                apiProviders: ['pexels', 'pixabay'],
                pexelsApiKey: 'test-pexels-key',
                pixabayApiKey: 'test-pixabay-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            // First provider fails
            mockRequestUrl
                .mockRejectedValueOnce(new Error('Pexels API failed'))
                .mockResolvedValueOnce(mockPixabayResponse);
            
            const result = await plugin.getImageUrl('keyword', 'nature');
            
            expect(mockRequestUrl).toHaveBeenCalledTimes(2);
            expect(mockRequestUrl).toHaveBeenNthCalledWith(1, expect.objectContaining({
                url: expect.stringContaining('pexels.com')
            }));
            expect(mockRequestUrl).toHaveBeenNthCalledWith(2, expect.objectContaining({
                url: expect.stringContaining('pixabay.com')
            }));
        });
    });

    describe('Pexels API Integration', () => {
        it('should fetch image from Pexels successfully', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                pexelsApiKey: 'test-pexels-key',
                numberOfImages: 20
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockResolvedValue(mockPexelsResponse);
            
            const result = await fetchPexelsImage(plugin, 'nature');
            
            expect(mockRequestUrl).toHaveBeenCalledWith({
                url: 'https://api.pexels.com/v1/search?query=nature&per_page=20',
                headers: { 'Authorization': 'test-pexels-key' }
            });
            expect(result).toMatch(/https:\/\/example\.com\/pexels[12]\.jpg/);
        });

        it('should handle Pexels API errors', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                pexelsApiKey: 'invalid-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockRejectedValue(new Error('Unauthorized'));
            
            const result = await fetchPexelsImage(plugin, 'nature');
            expect(result).toBeNull();
        });

        it('should fallback to default keywords on Pexels failure', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                pexelsApiKey: 'test-pexels-key',
                defaultKeywords: 'landscape, sky, water'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl
                .mockRejectedValueOnce(new Error('No results'))
                .mockResolvedValueOnce(mockPexelsResponse);
            
            const result = await fetchPexelsImage(plugin, 'nonexistentkeyword');
            
            expect(mockRequestUrl).toHaveBeenCalledTimes(2);
            expect(mockRequestUrl).toHaveBeenNthCalledWith(2, expect.objectContaining({
                url: expect.stringMatching(/query=(landscape|sky|water)/)
            }));
        });
    });

    describe('Pixabay API Integration', () => {
        it('should fetch image from Pixabay successfully', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                pixabayApiKey: 'test-pixabay-key',
                numberOfImages: 20
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockResolvedValue(mockPixabayResponse);
            
            const result = await fetchPixabayImage(plugin, 'mountain');
            
            expect(mockRequestUrl).toHaveBeenCalledWith({
                url: 'https://pixabay.com/api/?key=test-pixabay-key&q=mountain&image_type=photo&per_page=20&safesearch=true',
                headers: {}
            });
            expect(result).toMatch(/https:\/\/example\.com\/pixabay[12]\.jpg/);
        });

        it('should handle Pixabay API errors', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                pixabayApiKey: 'invalid-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockRejectedValue(new Error('API key invalid'));
            
            const result = await fetchPixabayImage(plugin, 'mountain');
            expect(result).toBeNull();
        });

        it('should handle empty Pixabay results', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                pixabayApiKey: 'test-pixabay-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockResolvedValue({
                status: 200,
                json: { hits: [] }
            });
            
            const result = await fetchPixabayImage(plugin, 'nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('Flickr API Integration', () => {
        it('should fetch image from Flickr successfully', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                flickrApiKey: 'test-flickr-key',
                numberOfImages: 20
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockResolvedValue(mockFlickrResponse);
            
            const result = await fetchFlickrImage(plugin, 'sunset');
            
            expect(mockRequestUrl).toHaveBeenCalledWith({
                url: expect.stringContaining('www.flickr.com/services/rest/'),
                headers: {}
            });
            expect(result).toContain('https://live.staticflickr.com');
        });

        it('should handle Flickr JSONP response parsing', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                flickrApiKey: 'test-flickr-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            const flickrJsonpResponse = {
                status: 200,
                text: 'jsonFlickrApi({"photos":{"photo":[{"id":"123456","secret":"abcdef","server":"789","farm":10}]}})'
            };
            
            mockRequestUrl.mockResolvedValue(flickrJsonpResponse);
            
            const result = await fetchFlickrImage(plugin, 'ocean');
            
            expect(result).toBe('https://live.staticflickr.com/789/123456_abcdef_z.jpg');
        });

        it('should handle malformed Flickr JSONP response', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                flickrApiKey: 'test-flickr-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockResolvedValue({
                status: 200,
                text: 'invalid jsonp response'
            });
            
            const result = await fetchFlickrImage(plugin, 'ocean');
            expect(result).toBeNull();
        });
    });

    describe('Unsplash API Integration', () => {
        it('should fetch image from Unsplash successfully', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                unsplashApiKey: 'test-unsplash-key',
                numberOfImages: 20
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockResolvedValue(mockUnsplashResponse);
            
            const result = await fetchUnsplashImage(plugin, 'forest');
            
            expect(mockRequestUrl).toHaveBeenCalledWith({
                url: 'https://api.unsplash.com/search/photos?query=forest&per_page=20&orientation=landscape',
                headers: { 'Authorization': 'Client-ID test-unsplash-key', 'Accept-Version': 'v1' }
            });
            expect(result).toMatch(/https:\/\/example\.com\/unsplash[12]\.jpg/);
        });

        it('should handle Unsplash rate limiting', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                unsplashApiKey: 'test-unsplash-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockRejectedValue(new Error('Rate limit exceeded'));
            
            const result = await fetchUnsplashImage(plugin, 'forest');
            expect(result).toBeNull();
        });

        it('should handle empty Unsplash results', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                unsplashApiKey: 'test-unsplash-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockResolvedValue({
                status: 200,
                json: { results: [] }
            });
            
            const result = await fetchUnsplashImage(plugin, 'nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('Rate Limiting', () => {
        it('should respect rate limiting between requests', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                pexelsApiKey: 'test-pexels-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockResolvedValue(mockPexelsResponse);
            
            const start = Date.now();
            
            // Make two consecutive requests
            await fetchPexelsImage(plugin, 'nature1');
            await fetchPexelsImage(plugin, 'nature2');
            
            const elapsed = Date.now() - start;
            
            // In test environment, should have at least 10ms delay between requests
            expect(elapsed).toBeGreaterThanOrEqual(10);
        });

        it('should not delay first request', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                pexelsApiKey: 'test-pexels-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockResolvedValue(mockPexelsResponse);
            
            const start = Date.now();
            await fetchPexelsImage(plugin, 'nature');
            const elapsed = Date.now() - start;
            
            // First request should be immediate (accounting for API call time)
            expect(elapsed).toBeLessThan(500);
        });
    });

    describe('API Provider Fallback Chain', () => {
        it('should try all providers before giving up', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                apiProviders: ['pexels', 'pixabay', 'unsplash'],
                pexelsApiKey: 'test-pexels-key',
                pixabayApiKey: 'test-pixabay-key',
                unsplashApiKey: 'test-unsplash-key',
                defaultKeywords: 'fallback'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            // All providers fail
            mockRequestUrl.mockRejectedValue(new Error('API failed'));
            
            const result = await plugin.getImageUrl('keyword', 'nature');
            expect(result).toBeNull();
            
            // Should have tried all providers with both original and fallback keywords
            expect(mockRequestUrl).toHaveBeenCalledTimes(6); // 3 providers × 2 keywords
        });

        it('should succeed with fallback provider', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                apiProviders: ['pexels', 'pixabay'],
                pexelsApiKey: 'test-pexels-key',
                pixabayApiKey: 'test-pixabay-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            // First provider fails, second succeeds
            mockRequestUrl
                .mockRejectedValueOnce(new Error('Pexels failed'))
                .mockResolvedValueOnce(mockPixabayResponse);
            
            const result = await plugin.getImageUrl('keyword', 'nature');
            
            expect(typeof result).toBe('string');
            expect(result).toMatch(/https:\/\/example\.com\/pixabay[12]\.jpg/);
            expect(mockRequestUrl).toHaveBeenCalledTimes(2);
        });
    });

    describe('Error Recovery', () => {
        it('should handle network timeouts gracefully', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                pexelsApiKey: 'test-pexels-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockRejectedValue(new Error('Network timeout'));
            
            const result = await plugin.getImageUrl('keyword', 'nature');
            expect(result).toBeNull();
        });

        it('should handle malformed JSON responses', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                pexelsApiKey: 'test-pexels-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockResolvedValue({
                status: 200,
                json: null // Malformed response
            });
            
            const result = await fetchPexelsImage(plugin, 'nature');
            expect(result).toBeNull();
        });

        it('should handle HTTP error status codes', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                pexelsApiKey: 'test-pexels-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockResolvedValue({
                status: 403,
                json: { error: 'Forbidden' }
            });
            
            const result = await fetchPexelsImage(plugin, 'nature');
            expect(result).toBeNull();
        });
    });

    describe('API Key Validation', () => {
        it('should not make API calls without valid keys', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                apiProviders: ['pexels'],
                pexelsApiKey: '' // Empty key
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            const result = await plugin.getImageUrl('keyword', 'nature');
            
            expect(result).toBeNull();
            expect(mockRequestUrl).not.toHaveBeenCalled();
        });

        it('should validate API keys during settings changes', async () => {
            vi.spyOn(plugin, 'loadData').mockResolvedValue({});
            await plugin.onload();
            
            // Change settings to add API key
            plugin.settings.pexelsApiKey = 'new-test-key';
            plugin.settings.apiProviders = ['pexels'];
            
            mockRequestUrl.mockResolvedValue(mockPexelsResponse);
            
            const result = await plugin.getImageUrl('keyword', 'nature');
            
            expect(mockRequestUrl).toHaveBeenCalledWith(expect.objectContaining({
                headers: { 'Authorization': 'new-test-key' }
            }));
        });
    });

    describe('Concurrent API Requests', () => {
        it('should handle concurrent keyword requests', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                pexelsApiKey: 'test-pexels-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            mockRequestUrl.mockResolvedValue(mockPexelsResponse);
            
            // Make multiple concurrent requests
            const promises = [
                plugin.getImageUrl('keyword', 'nature'),
                plugin.getImageUrl('keyword', 'mountain'),
                plugin.getImageUrl('keyword', 'ocean')
            ];
            
            const results = await Promise.all(promises);
            
            expect(results).toHaveLength(3);
            results.forEach(result => {
                expect(result).toMatch(/https:\/\/example\.com\/pexels[12]\.jpg/);
            });
        });

        it('should handle race conditions in provider selection', async () => {
            const settings = {
                ...DEFAULT_SETTINGS,
                apiProviders: ['pexels', 'pixabay'],
                pexelsApiKey: 'test-pexels-key',
                pixabayApiKey: 'test-pixabay-key'
            };
            
            vi.spyOn(plugin, 'loadData').mockResolvedValue(settings);
            await plugin.onload();
            
            // Different responses for different providers
            mockRequestUrl
                .mockImplementation((options) => {
                    if (options.url.includes('pexels')) {
                        return Promise.resolve(mockPexelsResponse);
                    } else if (options.url.includes('pixabay')) {
                        return Promise.resolve(mockPixabayResponse);
                    }
                    return Promise.reject(new Error('Unknown provider'));
                });
            
            // Make concurrent requests - should consistently use first available provider
            const promises = Array.from({ length: 5 }, () => 
                plugin.getImageUrl('keyword', 'nature')
            );
            
            const results = await Promise.all(promises);
            
            // All should use the same provider (Pexels)
            results.forEach(result => {
                expect(result).toMatch(/pexels/);
            });
        });
    });
});