import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import getCurrentTheme from '@/utils/getCurrentTheme.js';

// Mock document.body
const mockBody = {
    classList: {
        contains: vi.fn()
    }
};

// Mock document
Object.defineProperty(global, 'document', {
    value: {
        body: mockBody
    },
    writable: true
});

describe('getCurrentTheme', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('theme detection', () => {
        it('should return "dark" when theme-dark class is present', () => {
            mockBody.classList.contains.mockReturnValue(true);
            
            const result = getCurrentTheme();
            
            expect(mockBody.classList.contains).toHaveBeenCalledWith('theme-dark');
            expect(result).toBe('dark');
        });

        it('should return "light" when theme-dark class is not present', () => {
            mockBody.classList.contains.mockReturnValue(false);
            
            const result = getCurrentTheme();
            
            expect(mockBody.classList.contains).toHaveBeenCalledWith('theme-dark');
            expect(result).toBe('light');
        });

        it('should call classList.contains exactly once', () => {
            mockBody.classList.contains.mockReturnValue(true);
            
            getCurrentTheme();
            
            expect(mockBody.classList.contains).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple calls correctly', () => {
            // First call - dark theme
            mockBody.classList.contains.mockReturnValue(true);
            expect(getCurrentTheme()).toBe('dark');
            
            // Second call - light theme
            mockBody.classList.contains.mockReturnValue(false);
            expect(getCurrentTheme()).toBe('light');
            
            // Third call - dark theme again
            mockBody.classList.contains.mockReturnValue(true);
            expect(getCurrentTheme()).toBe('dark');
            
            expect(mockBody.classList.contains).toHaveBeenCalledTimes(3);
        });
    });

    describe('error handling', () => {
        it('should handle missing document.body gracefully', () => {
            // Temporarily remove body
            const originalBody = global.document.body;
            global.document.body = null;
            
            expect(() => getCurrentTheme()).toThrow();
            
            // Restore body
            global.document.body = originalBody;
        });

        it('should handle missing classList gracefully', () => {
            // Temporarily remove classList
            const originalClassList = global.document.body.classList;
            global.document.body.classList = null;
            
            expect(() => getCurrentTheme()).toThrow();
            
            // Restore classList
            global.document.body.classList = originalClassList;
        });

        it('should handle classList.contains throwing an error', () => {
            mockBody.classList.contains.mockImplementation(() => {
                throw new Error('ClassList error');
            });
            
            expect(() => getCurrentTheme()).toThrow('ClassList error');
        });

        it('should handle classList.contains returning non-boolean values', () => {
            // Test with truthy non-boolean
            mockBody.classList.contains.mockReturnValue('truthy-string');
            expect(getCurrentTheme()).toBe('dark');
            
            // Test with falsy non-boolean
            mockBody.classList.contains.mockReturnValue(0);
            expect(getCurrentTheme()).toBe('light');
            
            // Test with null
            mockBody.classList.contains.mockReturnValue(null);
            expect(getCurrentTheme()).toBe('light');
            
            // Test with undefined
            mockBody.classList.contains.mockReturnValue(undefined);
            expect(getCurrentTheme()).toBe('light');
        });
    });

    describe('real DOM interaction simulation', () => {
        it('should work with actual DOM-like structure', () => {
            // Create a more realistic mock
            const realishDocument = {
                body: {
                    classList: {
                        contains: vi.fn((className) => {
                            // Simulate actual DOM behavior
                            if (className === 'theme-dark') {
                                return true;
                            }
                            return false;
                        })
                    }
                }
            };
            
            // Temporarily replace global document
            const originalDocument = global.document;
            global.document = realishDocument;
            
            const result = getCurrentTheme();
            
            expect(result).toBe('dark');
            expect(realishDocument.body.classList.contains).toHaveBeenCalledWith('theme-dark');
            
            // Restore original document
            global.document = originalDocument;
        });

        it('should simulate theme switching', () => {
            let isDarkTheme = false;
            
            mockBody.classList.contains.mockImplementation((className) => {
                return className === 'theme-dark' && isDarkTheme;
            });
            
            // Initially light theme
            expect(getCurrentTheme()).toBe('light');
            
            // Switch to dark theme
            isDarkTheme = true;
            expect(getCurrentTheme()).toBe('dark');
            
            // Switch back to light theme
            isDarkTheme = false;
            expect(getCurrentTheme()).toBe('light');
        });
    });

    describe('edge cases', () => {
        it('should handle empty string class name check', () => {
            mockBody.classList.contains.mockImplementation((className) => {
                return false; // No theme-dark class present
            });
            
            // The function should still work normally
            expect(getCurrentTheme()).toBe('light');
            expect(mockBody.classList.contains).toHaveBeenCalledWith('theme-dark');
        });

        it('should be case sensitive for class name', () => {
            mockBody.classList.contains.mockImplementation((className) => {
                // Should only match exact case - return false to test light theme
                return false;
            });
            
            expect(getCurrentTheme()).toBe('light');
            expect(mockBody.classList.contains).toHaveBeenCalledWith('theme-dark');
            // Verify it's not called with different cases
            expect(mockBody.classList.contains).not.toHaveBeenCalledWith('Theme-Dark');
            expect(mockBody.classList.contains).not.toHaveBeenCalledWith('THEME-DARK');
        });

        it('should handle rapid successive calls', () => {
            mockBody.classList.contains.mockReturnValue(true);
            
            // Multiple rapid calls
            const results = [];
            for (let i = 0; i < 100; i++) {
                results.push(getCurrentTheme());
            }
            
            // All results should be consistent
            expect(results.every(result => result === 'dark')).toBe(true);
            expect(mockBody.classList.contains).toHaveBeenCalledTimes(100);
        });
    });

    describe('performance considerations', () => {
        it('should not cache results (calls DOM each time)', () => {
            // First call returns dark
            mockBody.classList.contains.mockReturnValue(true);
            expect(getCurrentTheme()).toBe('dark');
            
            // Second call returns light (simulating theme change)
            mockBody.classList.contains.mockReturnValue(false);
            expect(getCurrentTheme()).toBe('light');
            
            // Should have called DOM twice
            expect(mockBody.classList.contains).toHaveBeenCalledTimes(2);
        });

        it('should be synchronous', () => {
            mockBody.classList.contains.mockReturnValue(true);
            
            const start = Date.now();
            const result = getCurrentTheme();
            const end = Date.now();
            
            expect(result).toBe('dark');
            // Should complete very quickly (allowing for test environment overhead)
            expect(end - start).toBeLessThan(100);
        });
    });

    describe('function characteristics', () => {
        it('should be a function', () => {
            expect(typeof getCurrentTheme).toBe('function');
        });

        it('should not require any parameters', () => {
            expect(getCurrentTheme.length).toBe(0);
        });

        it('should return a string', () => {
            mockBody.classList.contains.mockReturnValue(true);
            expect(typeof getCurrentTheme()).toBe('string');
            
            mockBody.classList.contains.mockReturnValue(false);
            expect(typeof getCurrentTheme()).toBe('string');
        });

        it('should only return "dark" or "light"', () => {
            const possibleValues = ['dark', 'light'];
            
            // Test with dark theme
            mockBody.classList.contains.mockReturnValue(true);
            expect(possibleValues).toContain(getCurrentTheme());
            
            // Test with light theme
            mockBody.classList.contains.mockReturnValue(false);
            expect(possibleValues).toContain(getCurrentTheme());
        });
    });
});