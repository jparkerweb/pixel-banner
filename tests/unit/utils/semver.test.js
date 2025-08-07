import { describe, it, expect } from 'vitest';
import { semver } from '@/utils/semver.js';

describe('semver utilities', () => {
  describe('parse', () => {
    it('should parse a valid semver string', () => {
      const result = semver.parse('1.2.3');
      expect(result).toEqual({
        major: 1,
        minor: 2,
        patch: 3
      });
    });

    it('should parse version with zeros', () => {
      const result = semver.parse('0.0.1');
      expect(result).toEqual({
        major: 0,
        minor: 0,
        patch: 1
      });
    });

    it('should parse version with large numbers', () => {
      const result = semver.parse('10.20.30');
      expect(result).toEqual({
        major: 10,
        minor: 20,
        patch: 30
      });
    });

    it('should handle malformed version string gracefully', () => {
      const result = semver.parse('1.2');
      expect(result).toEqual({
        major: 1,
        minor: 2,
        patch: undefined
      });
    });

    it('should handle empty string', () => {
      const result = semver.parse('');
      expect(result).toEqual({
        major: 0,
        minor: undefined,
        patch: undefined
      });
    });

    it('should handle non-numeric version parts', () => {
      const result = semver.parse('1.a.3');
      expect(result).toEqual({
        major: 1,
        minor: NaN,
        patch: 3
      });
    });

    it('should handle version with extra parts (ignores them)', () => {
      const result = semver.parse('1.2.3.4');
      expect(result).toEqual({
        major: 1,
        minor: 2,
        patch: 3
      });
    });
  });

  describe('gt (greater than)', () => {
    it('should return true when first version is greater by major', () => {
      expect(semver.gt('2.0.0', '1.9.9')).toBe(true);
    });

    it('should return false when first version is less by major', () => {
      expect(semver.gt('1.9.9', '2.0.0')).toBe(false);
    });

    it('should return true when first version is greater by minor (same major)', () => {
      expect(semver.gt('1.2.0', '1.1.9')).toBe(true);
    });

    it('should return false when first version is less by minor (same major)', () => {
      expect(semver.gt('1.1.9', '1.2.0')).toBe(false);
    });

    it('should return true when first version is greater by patch (same major.minor)', () => {
      expect(semver.gt('1.2.3', '1.2.2')).toBe(true);
    });

    it('should return false when first version is less by patch (same major.minor)', () => {
      expect(semver.gt('1.2.2', '1.2.3')).toBe(false);
    });

    it('should return false when versions are equal', () => {
      expect(semver.gt('1.2.3', '1.2.3')).toBe(false);
    });

    it('should handle zero versions correctly', () => {
      expect(semver.gt('0.0.1', '0.0.0')).toBe(true);
      expect(semver.gt('0.1.0', '0.0.9')).toBe(true);
      expect(semver.gt('1.0.0', '0.9.9')).toBe(true);
    });

    it('should handle comparison with different number of digits', () => {
      expect(semver.gt('10.0.0', '9.0.0')).toBe(true);
      expect(semver.gt('1.10.0', '1.9.0')).toBe(true);
      expect(semver.gt('1.0.10', '1.0.9')).toBe(true);
    });

    it('should prioritize major version over minor and patch', () => {
      expect(semver.gt('2.0.0', '1.99.99')).toBe(true);
    });

    it('should prioritize minor version over patch when major is equal', () => {
      expect(semver.gt('1.2.0', '1.1.99')).toBe(true);
    });

    it('should handle edge case with very large version numbers', () => {
      expect(semver.gt('999.999.999', '999.999.998')).toBe(true);
      expect(semver.gt('1000.0.0', '999.999.999')).toBe(true);
    });

    // Edge cases with malformed versions
    it('should handle malformed versions gracefully', () => {
      // When comparing with NaN, the result should be false
      expect(semver.gt('1.2.3', '1.2.a')).toBe(false);
      expect(semver.gt('1.2.a', '1.2.3')).toBe(false);
      expect(semver.gt('a.2.3', '1.2.3')).toBe(false);
    });

    it('should handle empty version strings', () => {
      // Empty string parses to { major: 0, minor: undefined, patch: undefined }
      // 1.2.3 vs 0 => 1 > 0, so true
      expect(semver.gt('1.2.3', '')).toBe(true);
      // 0 vs 1.2.3 => 0 < 1, so false
      expect(semver.gt('', '1.2.3')).toBe(false);
      // 0 vs 0 => equal, so false
      expect(semver.gt('', '')).toBe(false);
    });
  });

  describe('integration tests', () => {
    it('should work with real-world version scenarios', () => {
      const versions = ['1.0.0', '1.0.1', '1.1.0', '1.1.1', '2.0.0'];
      
      // Test that each version is greater than all previous versions
      for (let i = 1; i < versions.length; i++) {
        for (let j = 0; j < i; j++) {
          expect(semver.gt(versions[i], versions[j])).toBe(true);
          expect(semver.gt(versions[j], versions[i])).toBe(false);
        }
      }
    });

    it('should handle typical plugin version progression', () => {
      expect(semver.gt('3.6.5', '3.6.4')).toBe(true);
      expect(semver.gt('3.7.0', '3.6.5')).toBe(true);
      expect(semver.gt('4.0.0', '3.7.0')).toBe(true);
    });
  });
});