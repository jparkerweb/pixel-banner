import { describe, it, expect } from 'vitest';
import { flags } from '@/resources/flags.js';

describe('flags resource', () => {
  describe('flags export', () => {
    it('should export an object', () => {
      expect(typeof flags).toBe('object');
      expect(flags).not.toBeNull();
      expect(Array.isArray(flags)).toBe(false);
    });

    it('should not be empty', () => {
      expect(Object.keys(flags).length).toBeGreaterThan(0);
    });

    it('should contain expected flag names', () => {
      const expectedFlags = [
        'red', 'checkers', 'blue', 'green', 'pink', 'yellow', 
        'orange', 'purple', 'white', 'black', 'finish-line', 'bee',
        'red-fade-light', 'blue-fade-light', 'red-fade-dark', 'blue-fade-dark'
      ];

      expectedFlags.forEach(flagName => {
        expect(flags).toHaveProperty(flagName);
      });
    });

    it('should have all values as base64 data URLs', () => {
      Object.values(flags).forEach(flagData => {
        expect(typeof flagData).toBe('string');
        expect(flagData).toMatch(/^data:image\/png;base64,/);
      });
    });

    it('should have valid base64 encoded data', () => {
      Object.entries(flags).forEach(([name, data]) => {
        const base64Part = data.replace('data:image/png;base64,', '');
        
        // Check if it's valid base64
        expect(base64Part).toMatch(/^[A-Za-z0-9+/]*={0,2}$/);
        
        // Check if it can be decoded without error
        expect(() => {
          atob(base64Part);
        }).not.toThrow();
      });
    });

    it('should have reasonable data sizes', () => {
      Object.entries(flags).forEach(([name, data]) => {
        // Base64 data should be reasonable size (not empty, not excessively large)
        const base64Part = data.replace('data:image/png;base64,', '');
        expect(base64Part.length).toBeGreaterThan(100); // Not too small
        expect(base64Part.length).toBeLessThan(50000); // Not too large (reasonable for small flag images)
      });
    });
  });

  describe('specific flag validation', () => {
    it('should have basic color flags', () => {
      const basicColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black'];
      
      basicColors.forEach(color => {
        expect(flags).toHaveProperty(color);
        expect(flags[color]).toMatch(/^data:image\/png;base64,/);
      });
    });

    it('should have special pattern flags', () => {
      const specialFlags = ['checkers', 'finish-line', 'bee'];
      
      specialFlags.forEach(flag => {
        expect(flags).toHaveProperty(flag);
        expect(flags[flag]).toMatch(/^data:image\/png;base64,/);
      });
    });

    it('should have fade variant flags', () => {
      const fadeFlags = ['red-fade-light', 'blue-fade-light', 'red-fade-dark', 'blue-fade-dark'];
      
      fadeFlags.forEach(flag => {
        expect(flags).toHaveProperty(flag);
        expect(flags[flag]).toMatch(/^data:image\/png;base64,/);
      });
    });

    it('should have consistent naming pattern', () => {
      const flagNames = Object.keys(flags);
      
      flagNames.forEach(name => {
        // Should only contain lowercase letters, numbers, and hyphens
        expect(name).toMatch(/^[a-z0-9-]+$/);
        
        // Should not start or end with hyphen
        expect(name).not.toMatch(/^-|-$/);
        
        // Should not have consecutive hyphens
        expect(name).not.toMatch(/--/);
      });
    });
  });

  describe('data integrity', () => {
    it('should not have null or undefined values', () => {
      Object.entries(flags).forEach(([name, data]) => {
        expect(data).not.toBeNull();
        expect(data).not.toBeUndefined();
        expect(data).not.toBe('');
      });
    });

    it('should have unique flag names', () => {
      const flagNames = Object.keys(flags);
      const uniqueNames = [...new Set(flagNames)];
      expect(flagNames.length).toBe(uniqueNames.length);
    });

    it('should have PNG format for all flags', () => {
      Object.values(flags).forEach(data => {
        expect(data).toMatch(/^data:image\/png;base64,/);
      });
    });

    it('should have proper MIME type', () => {
      Object.values(flags).forEach(data => {
        const mimeMatch = data.match(/^data:([^;]+);base64,/);
        expect(mimeMatch).toBeTruthy();
        expect(mimeMatch[1]).toBe('image/png');
      });
    });
  });

  describe('base64 data validation', () => {
    it('should decode to valid binary data', () => {
      Object.entries(flags).forEach(([name, data]) => {
        const base64Part = data.replace('data:image/png;base64,', '');
        
        // Decode and check that we get binary data
        const binaryString = atob(base64Part);
        expect(binaryString.length).toBeGreaterThan(0);
        
        // Check PNG signature (first 8 bytes of PNG files)
        const uint8Array = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          uint8Array[i] = binaryString.charCodeAt(i);
        }
        
        // PNG signature: 89 50 4E 47 0D 0A 1A 0A
        if (uint8Array.length >= 8) {
          expect(uint8Array[0]).toBe(0x89);
          expect(uint8Array[1]).toBe(0x50);
          expect(uint8Array[2]).toBe(0x4E);
          expect(uint8Array[3]).toBe(0x47);
        }
      });
    });

    it('should have proper base64 padding', () => {
      Object.values(flags).forEach(data => {
        const base64Part = data.replace('data:image/png;base64,', '');
        
        // Base64 should be properly padded
        const paddingCount = (base64Part.match(/=/g) || []).length;
        expect(paddingCount).toBeLessThanOrEqual(2);
        
        // If there's padding, it should be at the end
        if (paddingCount > 0) {
          expect(base64Part.endsWith('='.repeat(paddingCount))).toBe(true);
        }
      });
    });
  });

  describe('usage scenarios', () => {
    it('should be suitable for use in image src attributes', () => {
      Object.entries(flags).forEach(([name, data]) => {
        // The data should be ready to use as src="..."
        expect(data).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/);
      });
    });

    it('should support common flag lookup patterns', () => {
      // Test common access patterns
      expect(flags['red']).toBeDefined();
      expect(flags.blue).toBeDefined();
      expect(flags['finish-line']).toBeDefined();
      
      // Test that we can iterate over flags
      const flagEntries = Object.entries(flags);
      expect(flagEntries.length).toBeGreaterThan(0);
      
      flagEntries.forEach(([name, data]) => {
        expect(typeof name).toBe('string');
        expect(typeof data).toBe('string');
      });
    });

    it('should provide reasonable variety of flag options', () => {
      const flagCount = Object.keys(flags).length;
      expect(flagCount).toBeGreaterThanOrEqual(10); // Should have at least 10 different flags
      
      // Should have basic colors
      const hasBasicColors = ['red', 'blue', 'green'].every(color => flags[color]);
      expect(hasBasicColors).toBe(true);
      
      // Should have some variety beyond basic colors
      const hasSpecialFlags = ['checkers', 'finish-line'].some(flag => flags[flag]);
      expect(hasSpecialFlags).toBe(true);
    });
  });

  describe('performance considerations', () => {
    it('should have reasonable total data size', () => {
      const totalSize = JSON.stringify(flags).length;
      expect(totalSize).toBeLessThan(500000); // 500KB limit for all flag data combined
    });

    it('should have individual flags of reasonable size', () => {
      Object.entries(flags).forEach(([name, data]) => {
        // Individual flags should be reasonable size for web use
        expect(data.length).toBeLessThan(50000); // 50KB per flag
        expect(data.length).toBeGreaterThan(500); // Not too small to be meaningful
      });
    });
  });

  describe('expected flag collection', () => {
    it('should have the exact expected flags', () => {
      const expectedFlags = {
        'red': expect.stringMatching(/^data:image\/png;base64,/),
        'checkers': expect.stringMatching(/^data:image\/png;base64,/),
        'blue': expect.stringMatching(/^data:image\/png;base64,/),
        'green': expect.stringMatching(/^data:image\/png;base64,/),
        'pink': expect.stringMatching(/^data:image\/png;base64,/),
        'yellow': expect.stringMatching(/^data:image\/png;base64,/),
        'orange': expect.stringMatching(/^data:image\/png;base64,/),
        'purple': expect.stringMatching(/^data:image\/png;base64,/),
        'white': expect.stringMatching(/^data:image\/png;base64,/),
        'black': expect.stringMatching(/^data:image\/png;base64,/),
        'finish-line': expect.stringMatching(/^data:image\/png;base64,/),
        'bee': expect.stringMatching(/^data:image\/png;base64,/),
        'red-fade-light': expect.stringMatching(/^data:image\/png;base64,/),
        'blue-fade-light': expect.stringMatching(/^data:image\/png;base64,/),
        'red-fade-dark': expect.stringMatching(/^data:image\/png;base64,/),
        'blue-fade-dark': expect.stringMatching(/^data:image\/png;base64,/)
      };

      expect(flags).toEqual(expectedFlags);
    });

    it('should have exactly the right number of flags', () => {
      expect(Object.keys(flags).length).toBe(16);
    });
  });
});