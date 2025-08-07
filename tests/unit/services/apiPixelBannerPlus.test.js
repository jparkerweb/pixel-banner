import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  verifyPixelBannerPlusCredentials,
  getPixelBannerInfo
} from '@/services/apiPixelBannerPlus.js';
import { PIXEL_BANNER_PLUS } from '@/resources/constants.js';
import { makeRequest } from '@/services/apiService.js';

// Mock the makeRequest function to avoid rate limiting issues
vi.mock('@/services/apiService.js', () => ({
  makeRequest: vi.fn()
}));

// Mock plugin with settings for testing
const createMockPlugin = (overrides = {}) => ({
  settings: {
    pixelBannerPlusEmail: 'test@example.com',
    pixelBannerPlusApiKey: 'test-api-key-123',
    lastVersion: '3.6.5',
    ...overrides
  }
});

// Mock successful verification response
const mockVerificationSuccessResponse = {
  success: true,
  banner_tokens: 150,
  jackpot: 1000,
  daily_game: 'Word Puzzle',
  high_score: 850,
  top_user: 'TopPlayer123',
  time_left: '23:45:12'
};

// Mock failed verification response
const mockVerificationFailureResponse = {
  success: false,
  banner_tokens: 0,
  jackpot: 0,
  daily_game: '',
  high_score: 0,
  top_user: '',
  time_left: '0'
};

// Mock info response
const mockInfoResponse = {
  version: '2.1.0'
};

describe('apiPixelBannerPlus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('verifyPixelBannerPlusCredentials', () => {
    it('should verify credentials successfully with valid email and API key', async () => {
      const plugin = createMockPlugin();

      vi.mocked(makeRequest).mockResolvedValue({
        status: 200,
        json: mockVerificationSuccessResponse,
        text: JSON.stringify(mockVerificationSuccessResponse),
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(makeRequest).toHaveBeenCalledWith(
        `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.VERIFY}`,
        {
          method: 'GET',
          headers: {
            'X-User-Email': plugin.settings.pixelBannerPlusEmail,
            'X-API-Key': plugin.settings.pixelBannerPlusApiKey,
            'X-Pixel-Banner-Version': plugin.settings.lastVersion,
            'Accept': 'application/json'
          }
        }
      );

      expect(result).toEqual({
        serverOnline: true,
        verified: true,
        bannerTokens: 150,
        jackpot: 1000,
        dailyGameName: 'Word Puzzle',
        highScore: 850,
        topUser: 'TopPlayer123',
        timeLeft: '23:45:12'
      });
    });

    it('should return unverified when email is missing', async () => {
      const plugin = createMockPlugin({ pixelBannerPlusEmail: '' });

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result).toEqual({
        serverOnline: true,
        verified: false,
        bannerTokens: 0
      });

      expect(makeRequest).not.toHaveBeenCalled();
    });

    it('should return unverified when API key is missing', async () => {
      const plugin = createMockPlugin({ pixelBannerPlusApiKey: '' });

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result).toEqual({
        serverOnline: true,
        verified: false,
        bannerTokens: 0
      });

      expect(makeRequest).not.toHaveBeenCalled();
    });

    it('should return unverified when both email and API key are missing', async () => {
      const plugin = createMockPlugin({ 
        pixelBannerPlusEmail: '', 
        pixelBannerPlusApiKey: '' 
      });

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result).toEqual({
        serverOnline: true,
        verified: false,
        bannerTokens: 0
      });

      expect(makeRequest).not.toHaveBeenCalled();
    });

    it('should handle successful response with failure status', async () => {
      const plugin = createMockPlugin();

      vi.mocked(makeRequest).mockResolvedValue({
        status: 200,
        json: mockVerificationFailureResponse,
        text: JSON.stringify(mockVerificationFailureResponse),
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result).toEqual({
        serverOnline: true,
        verified: false,
        bannerTokens: 0,
        jackpot: 0,
        dailyGameName: '',
        highScore: 0,
        topUser: '',
        timeLeft: '0'
      });
    });

    it('should handle non-200 HTTP status codes', async () => {
      const plugin = createMockPlugin();

      vi.mocked(makeRequest).mockResolvedValue({
        status: 404,
        json: {},
        text: 'Not Found',
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result).toEqual({
        serverOnline: true,
        verified: false,
        bannerTokens: 0,
        jackpot: 0,
        dailyGameName: '',
        highScore: 0,
        topUser: '',
        timeLeft: '0'
      });
    });

    it('should handle 401 unauthorized errors as server online but invalid credentials', async () => {
      const plugin = createMockPlugin();

      vi.mocked(makeRequest).mockRejectedValue(new Error('Request failed: 401 Unauthorized'));

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result).toEqual({
        serverOnline: true,
        verified: false,
        bannerTokens: 0,
        jackpot: 0,
        dailyGameName: '',
        highScore: 0,
        topUser: '',
        timeLeft: '0'
      });
    });

    it('should detect server offline for network errors', async () => {
      const plugin = createMockPlugin();

      vi.mocked(makeRequest).mockRejectedValue(new Error('Network error'));

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result).toEqual({
        serverOnline: false,
        verified: false,
        bannerTokens: 0,
        jackpot: 0,
        dailyGameName: '',
        highScore: 0,
        topUser: '',
        timeLeft: '0'
      });
    });

    it('should detect server offline for ERR_ prefixed errors', async () => {
      const plugin = createMockPlugin();

      vi.mocked(makeRequest).mockRejectedValue(new Error('ERR_NETWORK_FAILURE'));

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result).toEqual({
        serverOnline: false,
        verified: false,
        bannerTokens: 0,
        jackpot: 0,
        dailyGameName: '',
        highScore: 0,
        topUser: '',
        timeLeft: '0'
      });
    });

    it('should detect server offline for failed to fetch errors', async () => {
      const plugin = createMockPlugin();

      vi.mocked(makeRequest).mockRejectedValue(new Error('Failed to fetch'));

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result).toEqual({
        serverOnline: false,
        verified: false,
        bannerTokens: 0,
        jackpot: 0,
        dailyGameName: '',
        highScore: 0,
        topUser: '',
        timeLeft: '0'
      });
    });

    it('should detect server offline when navigator is offline', async () => {
      const plugin = createMockPlugin();

      // Mock navigator offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      vi.mocked(makeRequest).mockRejectedValue(new Error('Network error'));

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result).toEqual({
        serverOnline: false,
        verified: false,
        bannerTokens: 0,
        jackpot: 0,
        dailyGameName: '',
        highScore: 0,
        topUser: '',
        timeLeft: '0'
      });
    });

    it('should handle TypeError as connection error', async () => {
      const plugin = createMockPlugin();

      const typeError = new TypeError('Failed to fetch');
      vi.mocked(makeRequest).mockRejectedValue(typeError);

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result.serverOnline).toBe(false);
      expect(result.verified).toBe(false);
    });

    it('should handle generic Error as connection error', async () => {
      const plugin = createMockPlugin();

      const genericError = new Error('Some network issue');
      genericError.name = 'Error';
      vi.mocked(makeRequest).mockRejectedValue(genericError);

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result.serverOnline).toBe(false);
      expect(result.verified).toBe(false);
    });

    it('should include all required headers in the request', async () => {
      const plugin = createMockPlugin({
        pixelBannerPlusEmail: 'user@test.com',
        pixelBannerPlusApiKey: 'key-456',
        lastVersion: '3.7.0'
      });

      vi.mocked(makeRequest).mockResolvedValue({
        status: 200,
        json: mockVerificationSuccessResponse,
        text: JSON.stringify(mockVerificationSuccessResponse),
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      await verifyPixelBannerPlusCredentials(plugin);

      expect(makeRequest).toHaveBeenCalledWith(
        `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.VERIFY}`,
        {
          method: 'GET',
          headers: {
            'X-User-Email': 'user@test.com',
            'X-API-Key': 'key-456',
            'X-Pixel-Banner-Version': '3.7.0',
            'Accept': 'application/json'
          }
        }
      );
    });

    it('should handle partial response data gracefully', async () => {
      const plugin = createMockPlugin();

      const partialResponse = {
        success: true,
        banner_tokens: 100
        // Missing other fields
      };

      vi.mocked(makeRequest).mockResolvedValue({
        status: 200,
        json: partialResponse,
        text: JSON.stringify(partialResponse),
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result.serverOnline).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.bannerTokens).toBe(100);
      expect(result.jackpot).toBeUndefined();
    });

    it('should log debug information for errors', async () => {
      const plugin = createMockPlugin();
      const consoleSpy = vi.spyOn(console, 'log');

      vi.mocked(makeRequest).mockRejectedValue(new Error('Test error message'));

      await verifyPixelBannerPlusCredentials(plugin);

      expect(consoleSpy).toHaveBeenCalledWith('pixel banner plus error.message: Test error message');
      expect(consoleSpy).toHaveBeenCalledWith('pixel banner plus isConnectionError: true');
      expect(consoleSpy).toHaveBeenCalledWith('pixel banner plus isUnauthorized: false');
    });

    it('should detect unauthorized correctly', async () => {
      const plugin = createMockPlugin();
      const consoleSpy = vi.spyOn(console, 'log');

      vi.mocked(makeRequest).mockRejectedValue(new Error('Request failed: 401 Unauthorized'));

      await verifyPixelBannerPlusCredentials(plugin);

      expect(consoleSpy).toHaveBeenCalledWith('pixel banner plus isUnauthorized: true');
    });
  });

  describe('getPixelBannerInfo', () => {
    it('should fetch info successfully', async () => {
      vi.mocked(makeRequest).mockResolvedValue({
        status: 200,
        json: mockInfoResponse,
        text: JSON.stringify(mockInfoResponse),
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await getPixelBannerInfo();

      expect(makeRequest).toHaveBeenCalledWith(
        `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.INFO}`,
        {
          method: 'GET'
        }
      );

      expect(result).toEqual({
        version: '2.1.0'
      });
    });

    it('should handle non-200 status codes', async () => {
      vi.mocked(makeRequest).mockResolvedValue({
        status: 404,
        json: {},
        text: 'Not Found',
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await getPixelBannerInfo();

      expect(result).toEqual({
        version: '0.0.0'
      });
    });

    it('should handle network errors', async () => {
      vi.mocked(makeRequest).mockRejectedValue(new Error('Network error'));

      const result = await getPixelBannerInfo();

      expect(result).toEqual({
        version: '0.0.0'
      });
    });

    it('should handle malformed JSON response', async () => {
      vi.mocked(makeRequest).mockResolvedValue({
        status: 200,
        json: null,
        text: 'invalid json',
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await getPixelBannerInfo();

      expect(result).toEqual({
        version: '0.0.0'
      });
    });

    it('should handle missing version field in response', async () => {
      vi.mocked(makeRequest).mockResolvedValue({
        status: 200,
        json: { someOtherField: 'value' },
        text: JSON.stringify({ someOtherField: 'value' }),
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await getPixelBannerInfo();

      expect(result.version).toBeUndefined();
    });

    it('should log errors to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');

      vi.mocked(makeRequest).mockRejectedValue(new Error('Test error'));

      await getPixelBannerInfo();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to get Pixel Banner Plus info:',
        expect.any(Error)
      );
    });
  });

  describe('API endpoint validation', () => {
    it('should use correct API URL from constants', async () => {
      const plugin = createMockPlugin();

      vi.mocked(makeRequest).mockResolvedValue({
        status: 200,
        json: mockVerificationSuccessResponse,
        text: JSON.stringify(mockVerificationSuccessResponse),
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      await verifyPixelBannerPlusCredentials(plugin);

      expect(makeRequest).toHaveBeenCalledWith(
        `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.VERIFY}`,
        expect.any(Object)
      );
    });

    it('should use correct INFO endpoint', async () => {
      vi.mocked(makeRequest).mockResolvedValue({
        status: 200,
        json: mockInfoResponse,
        text: JSON.stringify(mockInfoResponse),
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      await getPixelBannerInfo();

      expect(makeRequest).toHaveBeenCalledWith(
        `${PIXEL_BANNER_PLUS.API_URL}${PIXEL_BANNER_PLUS.ENDPOINTS.INFO}`,
        {
          method: 'GET'
        }
      );
    });
  });

  describe('error categorization', () => {
    it('should categorize various network error types correctly', async () => {
      const plugin = createMockPlugin();
      
      const networkErrors = [
        'network error',
        'failed to fetch', 
        'Network request failed',
        'ERR_NETWORK',
        'ERR_INTERNET_DISCONNECTED'
      ];

      for (const errorMessage of networkErrors) {
        vi.mocked(makeRequest).mockRejectedValue(new Error(errorMessage));
        
        const result = await verifyPixelBannerPlusCredentials(plugin);
        
        expect(result.serverOnline).toBe(false);
        expect(result.verified).toBe(false);
      }
    });

    it('should categorize unauthorized errors correctly', async () => {
      const plugin = createMockPlugin();
      
      const unauthorizedErrors = [
        '401 Unauthorized',
        'Request failed: 401',
        'unauthorized access'
      ];

      for (const errorMessage of unauthorizedErrors) {
        vi.mocked(makeRequest).mockRejectedValue(new Error(errorMessage));
        
        const result = await verifyPixelBannerPlusCredentials(plugin);
        
        expect(result.serverOnline).toBe(true); // Server is online but credentials invalid
        expect(result.verified).toBe(false);
      }
    });

    it('should handle mixed case in error messages', async () => {
      const plugin = createMockPlugin();

      vi.mocked(makeRequest).mockRejectedValue(new Error('NETWORK ERROR'));

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result.serverOnline).toBe(false);
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle empty response data', async () => {
      const plugin = createMockPlugin();

      vi.mocked(makeRequest).mockResolvedValue({
        status: 200,
        json: {},
        text: '{}',
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result.serverOnline).toBe(true);
      expect(result.verified).toBeUndefined(); // undefined success
    });

    it('should handle null values in response', async () => {
      const plugin = createMockPlugin();

      const responseWithNulls = {
        success: true,
        banner_tokens: null,
        jackpot: null,
        daily_game: null
      };

      vi.mocked(makeRequest).mockResolvedValue({
        status: 200,
        json: responseWithNulls,
        text: JSON.stringify(responseWithNulls),
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result.verified).toBe(true);
      expect(result.bannerTokens).toBeNull();
      expect(result.jackpot).toBeNull();
    });

    it('should handle response with string numbers', async () => {
      const plugin = createMockPlugin();

      const responseWithStringNumbers = {
        success: true,
        banner_tokens: '150',
        jackpot: '1000'
      };

      vi.mocked(makeRequest).mockResolvedValue({
        status: 200,
        json: responseWithStringNumbers,
        text: JSON.stringify(responseWithStringNumbers),
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result.verified).toBe(true);
      expect(result.bannerTokens).toBe('150');
      expect(result.jackpot).toBe('1000');
    });

    it('should handle extremely large numbers in response', async () => {
      const plugin = createMockPlugin();

      const responseWithLargeNumbers = {
        success: true,
        banner_tokens: Number.MAX_SAFE_INTEGER,
        jackpot: 999999999999999
      };

      vi.mocked(makeRequest).mockResolvedValue({
        status: 200,
        json: responseWithLargeNumbers,
        text: JSON.stringify(responseWithLargeNumbers),
        arrayBuffer: new ArrayBuffer(0),
        headers: {}
      });

      const result = await verifyPixelBannerPlusCredentials(plugin);

      expect(result.verified).toBe(true);
      expect(typeof result.bannerTokens).toBe('number');
      expect(typeof result.jackpot).toBe('number');
    });
  });
});