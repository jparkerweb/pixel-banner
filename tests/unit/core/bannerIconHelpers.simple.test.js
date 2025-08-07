import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
    getIconOverlay,
    returnIconOverlay,
    shouldUpdateIconOverlay
} from '@/core/bannerIconHelpers.js';
import { createMockApp, MarkdownView, TFile } from 'obsidian';

describe('bannerIconHelpers (simplified)', () => {
    let mockPlugin;
    let mockApp;

    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = '';
        
        // Create mock app
        mockApp = createMockApp();
        
        // Create mock plugin with icon overlay pool
        mockPlugin = {
            app: mockApp,
            iconOverlayPool: [],
            MAX_POOL_SIZE: 10,
            settings: {
                customBannerIconField: ['banner-icon'],
                customBannerIconImageField: ['icon-image']
            }
        };
    });

    describe('getIconOverlay', () => {
        it('should return overlay from pool when available', () => {
            const poolOverlay = document.createElement('div');
            poolOverlay.className = 'banner-icon-overlay';
            mockPlugin.iconOverlayPool.push(poolOverlay);

            const result = getIconOverlay(mockPlugin);

            expect(result).toBe(poolOverlay);
            expect(mockPlugin.iconOverlayPool.length).toBe(0);
        });

        it('should create new overlay when pool is empty', () => {
            const result = getIconOverlay(mockPlugin);

            expect(result).toBeInstanceOf(HTMLElement);
            expect(result.className).toBe('banner-icon-overlay');
            expect(mockPlugin.iconOverlayPool.length).toBe(0);
        });
    });

    describe('returnIconOverlay', () => {
        it('should return overlay to pool when under max size', () => {
            const overlay = document.createElement('div');
            overlay.className = 'banner-icon-overlay';
            overlay.style.color = 'red';
            overlay.textContent = 'test';
            document.body.appendChild(overlay);

            returnIconOverlay(mockPlugin, overlay);

            expect(mockPlugin.iconOverlayPool.length).toBe(1);
            expect(overlay.style.cssText).toBe('');
            expect(overlay.textContent).toBe('');
            expect(overlay.className).toBe('banner-icon-overlay');
        });

        it('should not return overlay when pool is at max size', () => {
            // Fill pool to max
            mockPlugin.iconOverlayPool = new Array(mockPlugin.MAX_POOL_SIZE).fill(null);
            
            const overlay = document.createElement('div');
            returnIconOverlay(mockPlugin, overlay);

            expect(mockPlugin.iconOverlayPool.length).toBe(mockPlugin.MAX_POOL_SIZE);
        });

        it('should handle null overlay gracefully', () => {
            expect(() => returnIconOverlay(mockPlugin, null)).not.toThrow();
            expect(mockPlugin.iconOverlayPool.length).toBe(0);
        });
    });

    describe('shouldUpdateIconOverlay', () => {
        it('should return true when no existing overlay', () => {
            const newIconState = { icon: '📝', size: 24 };
            
            const result = shouldUpdateIconOverlay(mockPlugin, null, newIconState, 'preview');
            
            expect(result).toBe(true);
        });

        it('should return true when no new icon state', () => {
            const existingOverlay = document.createElement('div');
            
            const result = shouldUpdateIconOverlay(mockPlugin, existingOverlay, null, 'preview');
            
            expect(result).toBe(true);
        });

        it('should return true when icon content differs', () => {
            const existingOverlay = document.createElement('div');
            existingOverlay._isPersistentBannerIcon = true;
            existingOverlay.dataset.viewType = 'preview';
            existingOverlay.textContent = '📄';
            
            const newIconState = { icon: '📝', size: 24 };
            
            const result = shouldUpdateIconOverlay(mockPlugin, existingOverlay, newIconState, 'preview');
            
            expect(result).toBe(true);
        });

        it('should return true when view type differs', () => {
            const existingOverlay = document.createElement('div');
            existingOverlay._isPersistentBannerIcon = true;
            existingOverlay.dataset.viewType = 'edit';
            existingOverlay.textContent = '📝';
            
            const newIconState = { icon: '📝', size: 24 };
            
            const result = shouldUpdateIconOverlay(mockPlugin, existingOverlay, newIconState, 'preview');
            
            expect(result).toBe(true);
        });

        it('should return true when not persistent', () => {
            const existingOverlay = document.createElement('div');
            existingOverlay._isPersistentBannerIcon = false;
            existingOverlay.dataset.viewType = 'preview';
            existingOverlay.textContent = '📝';
            
            const newIconState = { icon: '📝', size: 24 };
            
            const result = shouldUpdateIconOverlay(mockPlugin, existingOverlay, newIconState, 'preview');
            
            expect(result).toBe(true);
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle missing icon overlay pool', () => {
            delete mockPlugin.iconOverlayPool;
            
            expect(() => getIconOverlay(mockPlugin)).toThrow();
        });

        it('should handle invalid icon state in shouldUpdate', () => {
            const existingOverlay = document.createElement('div');
            existingOverlay._isPersistentBannerIcon = true;
            existingOverlay.dataset.viewType = 'preview';
            existingOverlay.textContent = '📝';
            
            const invalidIconState = {}; // Missing required properties
            
            // Should not throw, should handle gracefully
            const result = shouldUpdateIconOverlay(mockPlugin, existingOverlay, invalidIconState, 'preview');
            
            expect(typeof result).toBe('boolean');
        });
    });
});