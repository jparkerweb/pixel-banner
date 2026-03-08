import { describe, it, expect, vi } from 'vitest';

// Mock emojilib since it's an external dependency
vi.mock('emojilib', () => ({
  default: {
    '😀': ['grinning', 'face', 'smile', 'happy', 'joy'],
    '😂': ['face', 'joy', 'laugh', 'tears'],
    '❤️': ['heart', 'love', 'red'],
    '👍': ['thumbs', 'up', 'yes', 'awesome', 'good'],
    '🎉': ['party', 'celebration', 'tada'],
    '🌟': ['star', 'glowing', 'shining'],
    '🔥': ['fire', 'flame', 'hot'],
    '💯': ['hundred', 'perfect', 'score'],
  }
}));

import { emojiData } from '@/resources/emojis.js';

describe('emojis resource', () => {
  describe('emojiData export', () => {
    it('should export an array', () => {
      expect(Array.isArray(emojiData)).toBe(true);
    });

    it('should not be empty', () => {
      expect(emojiData.length).toBeGreaterThan(0);
    });

    it('should contain objects with emoji and keywords properties', () => {
      emojiData.forEach(item => {
        expect(item).toHaveProperty('emoji');
        expect(item).toHaveProperty('keywords');
        expect(typeof item.emoji).toBe('string');
        expect(typeof item.keywords).toBe('string');
      });
    });

    it('should have specific emoji entries', () => {
      const grinningFace = emojiData.find(item => item.emoji === '😀');
      expect(grinningFace).toBeDefined();
      expect(grinningFace.keywords).toBe('grinning face smile happy joy');

      const heart = emojiData.find(item => item.emoji === '❤️');
      expect(heart).toBeDefined();
      expect(heart.keywords).toBe('heart love red');
    });

    it('should join keywords with spaces', () => {
      const party = emojiData.find(item => item.emoji === '🎉');
      expect(party).toBeDefined();
      expect(party.keywords).toBe('party celebration tada');
      
      // Verify no leading/trailing spaces or double spaces
      expect(party.keywords.trim()).toBe(party.keywords);
      expect(party.keywords).not.toMatch(/\s{2,}/);
    });

    it('should have unique emoji entries', () => {
      const emojis = emojiData.map(item => item.emoji);
      const uniqueEmojis = [...new Set(emojis)];
      expect(emojis.length).toBe(uniqueEmojis.length);
    });

    it('should handle emojis with various keyword counts', () => {
      // Test emoji with many keywords
      const faceJoy = emojiData.find(item => item.emoji === '😂');
      expect(faceJoy).toBeDefined();
      expect(faceJoy.keywords.split(' ').length).toBe(4);

      // Test emoji with fewer keywords
      const heart = emojiData.find(item => item.emoji === '❤️');
      expect(heart).toBeDefined();
      expect(heart.keywords.split(' ').length).toBe(3);
    });

    it('should contain expected number of entries', () => {
      // Based on our mock, should have 8 entries
      expect(emojiData.length).toBe(8);
    });

    it('should have proper data structure for each entry', () => {
      emojiData.forEach((item, index) => {
        expect(item).toEqual({
          emoji: expect.any(String),
          keywords: expect.any(String)
        });

        // Ensure no extra properties
        expect(Object.keys(item)).toEqual(['emoji', 'keywords']);

        // Ensure emoji is not empty
        expect(item.emoji.length).toBeGreaterThan(0);
        
        // Ensure keywords are not empty (unless explicitly testing empty case)
        expect(item.keywords.length).toBeGreaterThan(0);
      });
    });

    it('should handle keywords as searchable strings', () => {
      // Test that keywords can be used for search functionality
      const searchTerm = 'happy';
      const matchingEmojis = emojiData.filter(item => 
        item.keywords.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(matchingEmojis.length).toBeGreaterThan(0);
      expect(matchingEmojis.some(item => item.emoji === '😀')).toBe(true);
    });

    it('should handle case-insensitive keyword searches', () => {
      const searchTerm = 'LOVE';
      const matchingEmojis = emojiData.filter(item => 
        item.keywords.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(matchingEmojis.length).toBeGreaterThan(0);
      expect(matchingEmojis.some(item => item.emoji === '❤️')).toBe(true);
    });

    it('should support partial keyword matching', () => {
      const searchTerm = 'star';
      const matchingEmojis = emojiData.filter(item => 
        item.keywords.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(matchingEmojis.length).toBeGreaterThan(0);
      expect(matchingEmojis.some(item => item.emoji === '🌟')).toBe(true);
    });

    it('should have keywords that are useful for search', () => {
      // Test various search scenarios
      const testCases = [
        { search: 'fire', expectedEmoji: '🔥' },
        { search: 'thumbs', expectedEmoji: '👍' },
        { search: 'hundred', expectedEmoji: '💯' },
        { search: 'party', expectedEmoji: '🎉' }
      ];

      testCases.forEach(({ search, expectedEmoji }) => {
        const found = emojiData.find(item => 
          item.keywords.toLowerCase().includes(search.toLowerCase())
        );
        expect(found).toBeDefined();
        expect(found.emoji).toBe(expectedEmoji);
      });
    });
  });

  describe('data integrity', () => {
    it('should not have null or undefined values', () => {
      emojiData.forEach(item => {
        expect(item.emoji).not.toBeNull();
        expect(item.emoji).not.toBeUndefined();
        expect(item.keywords).not.toBeNull();
        expect(item.keywords).not.toBeUndefined();
      });
    });

    it('should have consistent data types', () => {
      emojiData.forEach(item => {
        expect(typeof item.emoji).toBe('string');
        expect(typeof item.keywords).toBe('string');
      });
    });

    it('should not have empty emoji strings', () => {
      emojiData.forEach(item => {
        expect(item.emoji.length).toBeGreaterThan(0);
      });
    });

    it('should handle Unicode emoji characters properly', () => {
      // Verify that emojis are valid Unicode strings
      emojiData.forEach(item => {
        expect(item.emoji).toMatch(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);
      });
    });
  });

  describe('performance considerations', () => {
    it('should have reasonable data size', () => {
      // Ensure the data structure is not excessively large
      const totalSize = JSON.stringify(emojiData).length;
      expect(totalSize).toBeLessThan(1000000); // 1MB limit for test data
    });

    it('should have reasonable keyword string lengths', () => {
      emojiData.forEach(item => {
        expect(item.keywords.length).toBeLessThan(1000); // Reasonable keyword length
      });
    });
  });

  describe('transformation from emojilib', () => {
    it('should properly transform emojilib data structure', () => {
      // Verify the transformation from Object.entries to array format
      expect(emojiData).toEqual([
        { emoji: '😀', keywords: 'grinning face smile happy joy' },
        { emoji: '😂', keywords: 'face joy laugh tears' },
        { emoji: '❤️', keywords: 'heart love red' },
        { emoji: '👍', keywords: 'thumbs up yes awesome good' },
        { emoji: '🎉', keywords: 'party celebration tada' },
        { emoji: '🌟', keywords: 'star glowing shining' },
        { emoji: '🔥', keywords: 'fire flame hot' },
        { emoji: '💯', keywords: 'hundred perfect score' }
      ]);
    });

    it('should maintain the original emoji characters', () => {
      // Ensure emoji characters are preserved correctly from the source
      const originalEmojis = ['😀', '😂', '❤️', '👍', '🎉', '🌟', '🔥', '💯'];
      const transformedEmojis = emojiData.map(item => item.emoji);
      
      originalEmojis.forEach(emoji => {
        expect(transformedEmojis).toContain(emoji);
      });
    });
  });
});