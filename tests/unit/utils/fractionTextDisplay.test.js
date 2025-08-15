import { describe, it, expect } from 'vitest';
import { decimalToFractionString } from '@/utils/fractionTextDisplay.js';

describe('fractionTextDisplay utilities', () => {
  describe('decimalToFractionString', () => {
    describe('exact fraction matches', () => {
      it('should convert 0.25 to ¼', () => {
        expect(decimalToFractionString(0.25)).toBe('¼');
      });

      it('should convert 0.5 to ½', () => {
        expect(decimalToFractionString(0.5)).toBe('½');
      });

      it('should convert 0.75 to ¾', () => {
        expect(decimalToFractionString(0.75)).toBe('¾');
      });
    });

    describe('whole numbers with fractions', () => {
      it('should convert 1.25 to "1 ¼"', () => {
        expect(decimalToFractionString(1.25)).toBe('1 ¼');
      });

      it('should convert 1.5 to "1 ½"', () => {
        expect(decimalToFractionString(1.5)).toBe('1 ½');
      });

      it('should convert 1.75 to "1 ¾"', () => {
        expect(decimalToFractionString(1.75)).toBe('1 ¾');
      });

      it('should convert 2.25 to "2 ¼"', () => {
        expect(decimalToFractionString(2.25)).toBe('2 ¼');
      });

      it('should convert 10.5 to "10 ½"', () => {
        expect(decimalToFractionString(10.5)).toBe('10 ½');
      });
    });

    describe('whole numbers without fractions', () => {
      it('should convert 1 to "1"', () => {
        expect(decimalToFractionString(1)).toBe('1');
      });

      it('should convert 2 to "2"', () => {
        expect(decimalToFractionString(2)).toBe('2');
      });

      it('should convert 10 to "10"', () => {
        expect(decimalToFractionString(10)).toBe('10');
      });

      it('should convert 100 to "100"', () => {
        expect(decimalToFractionString(100)).toBe('100');
      });
    });

    describe('zero and edge cases', () => {
      it('should convert 0 to "0"', () => {
        expect(decimalToFractionString(0)).toBe('0');
      });

      it('should handle 0.0 to "0"', () => {
        expect(decimalToFractionString(0.0)).toBe('0');
      });
    });

    describe('non-standard decimals (fallback behavior)', () => {
      it('should fallback to string representation for 0.1', () => {
        expect(decimalToFractionString(0.1)).toBe('0.1');
      });

      it('should fallback to string representation for 0.33', () => {
        expect(decimalToFractionString(0.33)).toBe('0.33');
      });

      it('should fallback to string representation for 0.67', () => {
        expect(decimalToFractionString(0.67)).toBe('0.67');
      });

      it('should fallback to string representation for 0.99', () => {
        expect(decimalToFractionString(0.99)).toBe('0.99');
      });

      it('should handle whole number with non-standard decimal', () => {
        expect(decimalToFractionString(1.1)).toBe('1');
      });

      it('should handle whole number with non-standard decimal 1.33', () => {
        expect(decimalToFractionString(1.33)).toBe('1');
      });

      it('should handle larger number with non-standard decimal', () => {
        expect(decimalToFractionString(5.1)).toBe('5');
      });
    });

    describe('precision and rounding', () => {
      it('should handle floating point precision issues with 0.25', () => {
        // Test potential floating point precision issues
        expect(decimalToFractionString(0.25000000000001)).toBe('¼');
      });

      it('should handle floating point precision issues with 0.5', () => {
        expect(decimalToFractionString(0.49999999999999)).toBe('½');
      });

      it('should limit decimal precision to 2 places', () => {
        // The function uses .toFixed(2), so this tests that behavior
        expect(decimalToFractionString(1.251)).toBe('1 ¼');
        expect(decimalToFractionString(1.249)).toBe('1 ¼');
      });

      it('should handle very small decimals', () => {
        expect(decimalToFractionString(0.001)).toBe('0.001');
      });

      it('should handle very precise decimals that round to known fractions', () => {
        expect(decimalToFractionString(0.2501)).toBe('¼');
        expect(decimalToFractionString(0.2499)).toBe('¼');
      });
    });

    describe('negative numbers', () => {
      it('should handle negative fractions', () => {
        // Math.floor(-0.25) = -1, decimal = -0.25 - (-1) = 0.75
        expect(decimalToFractionString(-0.25)).toBe('-1 ¾');
      });

      it('should handle negative whole numbers with fractions', () => {
        // Math.floor(-1.5) = -2, decimal = -1.5 - (-2) = 0.5
        expect(decimalToFractionString(-1.5)).toBe('-2 ½');
      });

      it('should handle negative whole numbers', () => {
        expect(decimalToFractionString(-2)).toBe('-2');
      });

      it('should handle negative non-standard decimals', () => {
        // Math.floor(-0.1) = -1, decimal = -0.1 - (-1) = 0.9, but 0.9 isn't in fractionMap
        expect(decimalToFractionString(-0.1)).toBe('-1');
      });
    });

    describe('large numbers', () => {
      it('should handle large whole numbers with fractions', () => {
        expect(decimalToFractionString(999.75)).toBe('999 ¾');
      });

      it('should handle very large numbers', () => {
        expect(decimalToFractionString(1000000.5)).toBe('1000000 ½');
      });
    });

    describe('special JavaScript number values', () => {
      it('should handle NaN', () => {
        expect(decimalToFractionString(NaN)).toBe('NaN');
      });

      it('should handle Infinity', () => {
        expect(decimalToFractionString(Infinity)).toBe('Infinity');
      });

      it('should handle -Infinity', () => {
        expect(decimalToFractionString(-Infinity)).toBe('-Infinity');
      });
    });

    describe('edge cases with Math.floor behavior', () => {
      it('should correctly separate whole and decimal parts for positive numbers', () => {
        expect(decimalToFractionString(3.75)).toBe('3 ¾');
        expect(decimalToFractionString(10.25)).toBe('10 ¼');
      });

      it('should correctly handle negative numbers with Math.floor', () => {
        // Math.floor(-1.25) = -2, so decimal = -1.25 - (-2) = 0.75
        expect(decimalToFractionString(-1.25)).toBe('-2 ¾');
        // Math.floor(-1.75) = -2, so decimal = -1.75 - (-2) = 0.25
        expect(decimalToFractionString(-1.75)).toBe('-2 ¼');
      });
    });

    describe('decimal precision edge cases', () => {
      it('should handle numbers that might have precision issues', () => {
        // These test the toFixed(2) behavior
        expect(decimalToFractionString(1.2500000001)).toBe('1 ¼');
        expect(decimalToFractionString(1.7499999999)).toBe('1 ¾');
      });

      it('should handle borderline cases near fraction boundaries', () => {
        expect(decimalToFractionString(1.24)).toBe('1');
        expect(decimalToFractionString(1.26)).toBe('1');
        expect(decimalToFractionString(1.49)).toBe('1');
        expect(decimalToFractionString(1.51)).toBe('1');
      });
    });

    describe('real-world usage scenarios', () => {
      it('should handle typical UI scaling values', () => {
        expect(decimalToFractionString(1.25)).toBe('1 ¼');
        expect(decimalToFractionString(1.5)).toBe('1 ½');
        expect(decimalToFractionString(2.0)).toBe('2');
      });

      it('should handle measurement values', () => {
        expect(decimalToFractionString(0.75)).toBe('¾');
        expect(decimalToFractionString(2.25)).toBe('2 ¼');
        expect(decimalToFractionString(3.5)).toBe('3 ½');
      });
    });
  });
});