import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requestUrl } from 'obsidian';
import {
  fetchPexelsImage,
  fetchPixabayImage,
  fetchFlickrImage,
  fetchUnsplashImage
} from '@/services/apiService.js';

// Mock plugin with settings for testing
const createMockPlugin = (overrides = {}) => ({
  settings: {
    pexelsApiKey: 'test-pexels-key',
    pixabayApiKey: 'test-pixabay-key',
    flickrApiKey: 'test-flickr-key',
    unsplashApiKey: 'test-unsplash-key',
    numberOfImages: 10,
    imageSize: 'medium',
    imageOrientation: 'all',
    defaultKeywords: 'nature, landscape, abstract',
    ...overrides
  }
});

// Mock image responses
const mockPexelsResponse = {
  photos: [
    {
      id: 1,
      src: {
        small: 'https://images.pexels.com/small/image1.jpg',
        medium: 'https://images.pexels.com/medium/image1.jpg',
        large: 'https://images.pexels.com/large/image1.jpg'
      }
    }
  ]
};

const mockPixabayResponse = {
  hits: [
    {
      id: 1,
      largeImageURL: 'https://pixabay.com/large/image1.jpg'
    }
  ]
};

const mockFlickrResponse = {
  stat: 'ok',
  photos: {
    photo: [
      {
        id: '123456',
        server: '1234',
        secret: 'abcdef'
      }
    ]
  }
};

const mockUnsplashResponse = {
  results: [
    {
      id: '1',
      urls: {
        small: 'https://images.unsplash.com/small/image1.jpg',
        regular: 'https://images.unsplash.com/regular/image1.jpg',
        full: 'https://images.unsplash.com/full/image1.jpg'
      }
    }
  ]
};

describe('apiService (fast tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Math.random to return 0 for predictable results
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchPexelsImage', () => {
    it('should fetch image successfully', async () => {
      const plugin = createMockPlugin();
      
      vi.mocked(requestUrl).mockResolvedValue({
        status: 200,
        json: mockPexelsResponse,
        text: JSON.stringify(mockPexelsResponse),
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await fetchPexelsImage(plugin, 'sunset');
      
      expect(result).toBe('https://images.pexels.com/medium/image1.jpg');
      expect(requestUrl).toHaveBeenCalled();
    });

    it('should return null when API key is missing', async () => {
      const plugin = createMockPlugin({ pexelsApiKey: '' });
      
      const result = await fetchPexelsImage(plugin, 'sunset');
      
      expect(result).toBeNull();
      expect(requestUrl).not.toHaveBeenCalled();
    });

    it('should handle different image sizes', async () => {
      const plugin = createMockPlugin({ imageSize: 'large' });
      
      vi.mocked(requestUrl).mockResolvedValue({
        status: 200,
        json: mockPexelsResponse,
        text: JSON.stringify(mockPexelsResponse),
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await fetchPexelsImage(plugin, 'test');
      
      expect(result).toBe('https://images.pexels.com/large/image1.jpg');
    });
  });

  describe('fetchPixabayImage', () => {
    it('should fetch image successfully', async () => {
      const plugin = createMockPlugin();
      
      vi.mocked(requestUrl).mockResolvedValue({
        status: 200,
        json: mockPixabayResponse,
        text: JSON.stringify(mockPixabayResponse),
        arrayBuffer: new TextEncoder().encode(JSON.stringify(mockPixabayResponse)).buffer,
        headers: {}
      });

      const result = await fetchPixabayImage(plugin, 'mountain');
      
      expect(result).toBe('https://pixabay.com/large/image1.jpg');
      expect(requestUrl).toHaveBeenCalled();
    });

    it('should return null when API key is missing', async () => {
      const plugin = createMockPlugin({ pixabayApiKey: '' });
      
      const result = await fetchPixabayImage(plugin, 'mountain');
      
      expect(result).toBeNull();
      expect(requestUrl).not.toHaveBeenCalled();
    });
  });

  describe('fetchFlickrImage', () => {
    it('should fetch image successfully', async () => {
      const plugin = createMockPlugin();
      
      vi.mocked(requestUrl).mockResolvedValue({
        status: 200,
        json: mockFlickrResponse,
        text: JSON.stringify(mockFlickrResponse),
        arrayBuffer: new TextEncoder().encode(JSON.stringify(mockFlickrResponse)).buffer,
        headers: {}
      });

      const result = await fetchFlickrImage(plugin, 'ocean');
      
      expect(result).toBe('https://live.staticflickr.com/1234/123456_abcdef_z.jpg');
      expect(requestUrl).toHaveBeenCalled();
    });

    it('should return null when API key is missing', async () => {
      const plugin = createMockPlugin({ flickrApiKey: '' });
      
      const result = await fetchFlickrImage(plugin, 'ocean');
      
      expect(result).toBeNull();
      expect(requestUrl).not.toHaveBeenCalled();
    });
  });

  describe('fetchUnsplashImage', () => {
    it('should fetch image successfully', async () => {
      const plugin = createMockPlugin();
      
      vi.mocked(requestUrl).mockResolvedValue({
        status: 200,
        json: mockUnsplashResponse,
        text: JSON.stringify(mockUnsplashResponse),
        arrayBuffer: new TextEncoder().encode(JSON.stringify(mockUnsplashResponse)).buffer,
        headers: {}
      });

      const result = await fetchUnsplashImage(plugin, 'forest');
      
      expect(result).toBe('https://images.unsplash.com/regular/image1.jpg');
      expect(requestUrl).toHaveBeenCalled();
    });

    it('should return null when API key is missing', async () => {
      const plugin = createMockPlugin({ unsplashApiKey: '' });
      
      const result = await fetchUnsplashImage(plugin, 'forest');
      
      expect(result).toBeNull();
      expect(requestUrl).not.toHaveBeenCalled();
    });

    it('should handle different image sizes', async () => {
      const plugin = createMockPlugin({ imageSize: 'small' });
      
      vi.mocked(requestUrl).mockResolvedValue({
        status: 200,
        json: mockUnsplashResponse,
        text: JSON.stringify(mockUnsplashResponse),
        arrayBuffer: new TextEncoder().encode(JSON.stringify(mockUnsplashResponse)).buffer,
        headers: {}
      });

      const result = await fetchUnsplashImage(plugin, 'test');
      
      expect(result).toBe('https://images.unsplash.com/small/image1.jpg');
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const plugin = createMockPlugin();
      
      vi.mocked(requestUrl).mockResolvedValue({
        status: 404,
        json: {},
        text: 'Not found',
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await fetchPexelsImage(plugin, 'nonexistent');
      
      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      const plugin = createMockPlugin();
      
      vi.mocked(requestUrl).mockRejectedValue(new Error('Network error'));

      const result = await fetchPexelsImage(plugin, 'test');
      
      expect(result).toBeNull();
    });

    it('should handle empty responses', async () => {
      const plugin = createMockPlugin();
      
      vi.mocked(requestUrl).mockResolvedValue({
        status: 200,
        json: { photos: [] },
        text: JSON.stringify({ photos: [] }),
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await fetchPexelsImage(plugin, 'empty');
      
      expect(result).toBeNull();
    });
  });
});