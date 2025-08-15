import { describe, it, expect } from 'vitest';
import { PIXEL_BANNER_PLUS } from '@/resources/constants.js';

describe('constants resource', () => {
  describe('PIXEL_BANNER_PLUS export', () => {
    it('should export PIXEL_BANNER_PLUS as an object', () => {
      expect(typeof PIXEL_BANNER_PLUS).toBe('object');
      expect(PIXEL_BANNER_PLUS).not.toBeNull();
      expect(Array.isArray(PIXEL_BANNER_PLUS)).toBe(false);
    });

    it('should have required top-level properties', () => {
      expect(PIXEL_BANNER_PLUS).toHaveProperty('API_URL');
      expect(PIXEL_BANNER_PLUS).toHaveProperty('ENDPOINTS');
      expect(PIXEL_BANNER_PLUS).toHaveProperty('SHOP_URL');
      expect(PIXEL_BANNER_PLUS).toHaveProperty('DONATE_URL');
      expect(PIXEL_BANNER_PLUS).toHaveProperty('BANNER_ICON_KEY');
    });
  });

  describe('API_URL', () => {
    it('should have a valid API_URL', () => {
      expect(typeof PIXEL_BANNER_PLUS.API_URL).toBe('string');
      expect(PIXEL_BANNER_PLUS.API_URL.length).toBeGreaterThan(0);
    });

    it('should be a valid URL format', () => {
      expect(PIXEL_BANNER_PLUS.API_URL).toMatch(/^https?:\/\//);
    });

    it('should end with a trailing slash', () => {
      expect(PIXEL_BANNER_PLUS.API_URL).toMatch(/\/$/);
    });

    it('should be one of the expected environments', () => {
      const validUrls = [
        'https://pixel-banner.online/',
        'http://localhost:3000/'
      ];
      expect(validUrls).toContain(PIXEL_BANNER_PLUS.API_URL);
    });
  });

  describe('ENDPOINTS', () => {
    it('should be an object', () => {
      expect(typeof PIXEL_BANNER_PLUS.ENDPOINTS).toBe('object');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS).not.toBeNull();
      expect(Array.isArray(PIXEL_BANNER_PLUS.ENDPOINTS)).toBe(false);
    });

    it('should contain all expected endpoint keys', () => {
      const expectedEndpoints = [
        'PING', 'VERIFY', 'TEXT_TO_IMAGE_MODELS', 'UPLOAD_TEMP_IMAGE',
        'GENERATE', 'GENERATE_BANNER_IDEA', 'GENERATE_BANNER_IDEA_FROM_SEED',
        'REWRITE_BANNER_IDEA', 'HISTORY', 'HISTORY_COUNT', 'HISTORY_PAGE',
        'HISTORY_DELETE', 'STORE_CATEGORIES', 'STORE_CATEGORY_IMAGES',
        'STORE_IMAGE_BY_ID', 'STORE_IMAGE_SEARCH', 'SIGNUP',
        'BANNER_VOTES_STATS', 'BANNER_VOTES_USER_VOTE', 'BANNER_VOTES_UPVOTE',
        'BANNER_VOTES_DOWNVOTE', 'INFO', 'DAILY_GAME', 'BANNER_ICON_CATEGORIES',
        'BANNER_ICONS', 'BANNER_ICONS_SEARCH', 'BANNER_ICONS_ID'
      ];

      expectedEndpoints.forEach(endpoint => {
        expect(PIXEL_BANNER_PLUS.ENDPOINTS).toHaveProperty(endpoint);
      });
    });

    it('should have all endpoint values as strings', () => {
      Object.values(PIXEL_BANNER_PLUS.ENDPOINTS).forEach(endpoint => {
        expect(typeof endpoint).toBe('string');
        expect(endpoint.length).toBeGreaterThan(0);
      });
    });

    it('should have expected endpoint values', () => {
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.PING).toBe('ping');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.VERIFY).toBe('verify');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.TEXT_TO_IMAGE_MODELS).toBe('text-to-image-models');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.UPLOAD_TEMP_IMAGE).toBe('/upload-temp-image');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.GENERATE).toBe('generatev2');
    });

    it('should have history-related endpoints', () => {
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.HISTORY).toBe('history');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.HISTORY_COUNT).toBe('history/count');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.HISTORY_PAGE).toBe('history/page');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.HISTORY_DELETE).toBe('history/image');
    });

    it('should have banner idea generation endpoints', () => {
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.GENERATE_BANNER_IDEA).toBe('generate-banner-idea');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.GENERATE_BANNER_IDEA_FROM_SEED).toBe('generate-banner-idea-from-seed');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.REWRITE_BANNER_IDEA).toBe('rewrite-banner-idea');
    });

    it('should have store-related endpoints', () => {
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.STORE_CATEGORIES).toBe('store-categories');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.STORE_CATEGORY_IMAGES).toBe('store-category-images');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.STORE_IMAGE_BY_ID).toBe('store-image-by-id');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.STORE_IMAGE_SEARCH).toBe('store-search');
    });

    it('should have voting-related endpoints with parameter placeholders', () => {
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.BANNER_VOTES_STATS).toBe('api/banner-votes/:id/stats');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.BANNER_VOTES_USER_VOTE).toBe('api/banner-votes/:id/user-vote');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.BANNER_VOTES_UPVOTE).toBe('api/banner-votes/:id/upvote');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.BANNER_VOTES_DOWNVOTE).toBe('api/banner-votes/:id/downvote');
    });

    it('should have API endpoints with api/ prefix', () => {
      const apiEndpoints = [
        'BANNER_VOTES_STATS', 'BANNER_VOTES_USER_VOTE', 'BANNER_VOTES_UPVOTE',
        'BANNER_VOTES_DOWNVOTE', 'INFO', 'BANNER_ICON_CATEGORIES',
        'BANNER_ICONS', 'BANNER_ICONS_SEARCH', 'BANNER_ICONS_ID'
      ];

      apiEndpoints.forEach(endpoint => {
        expect(PIXEL_BANNER_PLUS.ENDPOINTS[endpoint]).toMatch(/^api\//);
      });
    });

    it('should have icon-related endpoints', () => {
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.BANNER_ICON_CATEGORIES).toBe('api/icon-categories');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.BANNER_ICONS).toBe('api/banner-icons');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.BANNER_ICONS_SEARCH).toBe('api/banner-icons/search');
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.BANNER_ICONS_ID).toBe('api/banner-icons/:id');
    });

    it('should not have endpoints starting with leading slashes except UPLOAD_TEMP_IMAGE', () => {
      Object.entries(PIXEL_BANNER_PLUS.ENDPOINTS).forEach(([key, value]) => {
        if (key !== 'UPLOAD_TEMP_IMAGE') {
          expect(value).not.toMatch(/^\/[^/]/);
        }
      });
    });

    it('should have UPLOAD_TEMP_IMAGE with leading slash', () => {
      expect(PIXEL_BANNER_PLUS.ENDPOINTS.UPLOAD_TEMP_IMAGE).toBe('/upload-temp-image');
    });
  });

  describe('External URLs', () => {
    it('should have valid SHOP_URL', () => {
      expect(typeof PIXEL_BANNER_PLUS.SHOP_URL).toBe('string');
      expect(PIXEL_BANNER_PLUS.SHOP_URL).toMatch(/^https?:\/\//);
      expect(PIXEL_BANNER_PLUS.SHOP_URL).toBe('https://ko-fi.com/s/7ce609ff2c');
    });

    it('should have valid DONATE_URL', () => {
      expect(typeof PIXEL_BANNER_PLUS.DONATE_URL).toBe('string');
      expect(PIXEL_BANNER_PLUS.DONATE_URL).toMatch(/^https?:\/\//);
      expect(PIXEL_BANNER_PLUS.DONATE_URL).toBe('https://ko-fi.com/jparkerweb');
    });

    it('should have HTTPS URLs for external services', () => {
      expect(PIXEL_BANNER_PLUS.SHOP_URL).toMatch(/^https:\/\//);
      expect(PIXEL_BANNER_PLUS.DONATE_URL).toMatch(/^https:\/\//);
    });
  });

  describe('BANNER_ICON_KEY', () => {
    it('should be a string', () => {
      expect(typeof PIXEL_BANNER_PLUS.BANNER_ICON_KEY).toBe('string');
    });

    it('should have expected value', () => {
      expect(PIXEL_BANNER_PLUS.BANNER_ICON_KEY).toBe('pixel-banner-icons');
    });

    it('should be a valid key format', () => {
      expect(PIXEL_BANNER_PLUS.BANNER_ICON_KEY).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe('data integrity', () => {
    it('should not have null or undefined values', () => {
      function checkObject(obj, path = '') {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;
          
          expect(value).not.toBeNull();
          expect(value).not.toBeUndefined();
          
          if (typeof value === 'object' && value !== null) {
            checkObject(value, currentPath);
          }
        });
      }

      checkObject(PIXEL_BANNER_PLUS);
    });

    it('should not have empty string values', () => {
      function checkObject(obj) {
        Object.values(obj).forEach(value => {
          if (typeof value === 'string') {
            expect(value.length).toBeGreaterThan(0);
          } else if (typeof value === 'object' && value !== null) {
            checkObject(value);
          }
        });
      }

      checkObject(PIXEL_BANNER_PLUS);
    });

    it('should have consistent data types', () => {
      expect(typeof PIXEL_BANNER_PLUS.API_URL).toBe('string');
      expect(typeof PIXEL_BANNER_PLUS.ENDPOINTS).toBe('object');
      expect(typeof PIXEL_BANNER_PLUS.SHOP_URL).toBe('string');
      expect(typeof PIXEL_BANNER_PLUS.DONATE_URL).toBe('string');
      expect(typeof PIXEL_BANNER_PLUS.BANNER_ICON_KEY).toBe('string');
    });
  });

  describe('usage scenarios', () => {
    it('should support URL construction', () => {
      const fullUrl = PIXEL_BANNER_PLUS.API_URL + PIXEL_BANNER_PLUS.ENDPOINTS.PING;
      expect(fullUrl).toMatch(/^https?:\/\/.+\/ping$/);
    });

    it('should support parameterized endpoint usage', () => {
      const endpoint = PIXEL_BANNER_PLUS.ENDPOINTS.BANNER_VOTES_STATS;
      const withId = endpoint.replace(':id', '123');
      expect(withId).toBe('api/banner-votes/123/stats');
    });

    it('should provide access to all required constants', () => {
      // Test that common access patterns work
      expect(() => {
        const api = PIXEL_BANNER_PLUS.API_URL;
        const endpoint = PIXEL_BANNER_PLUS.ENDPOINTS.GENERATE;
        const shop = PIXEL_BANNER_PLUS.SHOP_URL;
        const key = PIXEL_BANNER_PLUS.BANNER_ICON_KEY;
      }).not.toThrow();
    });

    it('should be suitable for configuration object', () => {
      // Verify the structure is suitable for use as configuration
      expect(PIXEL_BANNER_PLUS).toEqual({
        API_URL: expect.any(String),
        ENDPOINTS: expect.any(Object),
        SHOP_URL: expect.any(String),
        DONATE_URL: expect.any(String),
        BANNER_ICON_KEY: expect.any(String)
      });
    });
  });

  describe('endpoint categorization', () => {
    it('should have basic service endpoints', () => {
      const basicEndpoints = ['PING', 'VERIFY', 'INFO', 'SIGNUP'];
      basicEndpoints.forEach(endpoint => {
        expect(PIXEL_BANNER_PLUS.ENDPOINTS).toHaveProperty(endpoint);
      });
    });

    it('should have generation endpoints', () => {
      const generationEndpoints = [
        'TEXT_TO_IMAGE_MODELS', 'GENERATE', 'GENERATE_BANNER_IDEA',
        'GENERATE_BANNER_IDEA_FROM_SEED', 'REWRITE_BANNER_IDEA'
      ];
      generationEndpoints.forEach(endpoint => {
        expect(PIXEL_BANNER_PLUS.ENDPOINTS).toHaveProperty(endpoint);
      });
    });

    it('should have history management endpoints', () => {
      const historyEndpoints = ['HISTORY', 'HISTORY_COUNT', 'HISTORY_PAGE', 'HISTORY_DELETE'];
      historyEndpoints.forEach(endpoint => {
        expect(PIXEL_BANNER_PLUS.ENDPOINTS).toHaveProperty(endpoint);
      });
    });

    it('should have store/content endpoints', () => {
      const storeEndpoints = [
        'STORE_CATEGORIES', 'STORE_CATEGORY_IMAGES', 'STORE_IMAGE_BY_ID', 'STORE_IMAGE_SEARCH'
      ];
      storeEndpoints.forEach(endpoint => {
        expect(PIXEL_BANNER_PLUS.ENDPOINTS).toHaveProperty(endpoint);
      });
    });

    it('should have voting endpoints', () => {
      const votingEndpoints = [
        'BANNER_VOTES_STATS', 'BANNER_VOTES_USER_VOTE', 'BANNER_VOTES_UPVOTE', 'BANNER_VOTES_DOWNVOTE'
      ];
      votingEndpoints.forEach(endpoint => {
        expect(PIXEL_BANNER_PLUS.ENDPOINTS).toHaveProperty(endpoint);
      });
    });

    it('should have icon management endpoints', () => {
      const iconEndpoints = [
        'BANNER_ICON_CATEGORIES', 'BANNER_ICONS', 'BANNER_ICONS_SEARCH', 'BANNER_ICONS_ID'
      ];
      iconEndpoints.forEach(endpoint => {
        expect(PIXEL_BANNER_PLUS.ENDPOINTS).toHaveProperty(endpoint);
      });
    });
  });
});