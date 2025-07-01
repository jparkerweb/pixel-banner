import { MarkdownView } from 'obsidian';

// Helper method to generate cache key
export function generateCacheKey(filePath, leafId, isShuffled = false) {
    // Ensure filePath is properly encoded to handle special characters and numbers
    const encodedPath = encodeURIComponent(filePath);
    return `${encodedPath}-${leafId}${isShuffled ? '-shuffle' : ''}`;
}

// Helper method to get all cache entries for a file
export function getCacheEntriesForFile(filePath) {
    const encodedPath = encodeURIComponent(filePath);
    return Array.from(this.bannerStateCache.entries())
        .filter(([key]) => key.startsWith(`${encodedPath}-`));
}


// Enhanced cache cleanup method
export function cleanupCache(force = false) {
    const now = Date.now();

    // Clean up by age
    for (const [key, entry] of this.bannerStateCache) {
        // Use shorter timeout for shuffle images
        const maxAge = entry.isShuffled ? this.SHUFFLE_CACHE_AGE : this.MAX_CACHE_AGE;
        if (force || now - entry.timestamp > maxAge) {
            // Clean up any persistent icon overlays for this entry
            if (entry.leafId) {
                const leaf = this.app.workspace.getLeafById(entry.leafId);
                if (leaf?.view instanceof MarkdownView) {
                    const contentEl = leaf.view.contentEl;
                    ['cm-sizer', 'markdown-preview-sizer'].forEach(selector => {
                        const container = contentEl.querySelector(`.${selector}`);
                        if (container) {
                            const iconOverlays = container.querySelectorAll('.banner-icon-overlay[data-persistent="true"]');
                            iconOverlays.forEach(overlay => overlay.remove());
                        }
                    });
                }
            }

            // Clean up blob URLs
            if (entry.state?.imageUrl && typeof entry.state.imageUrl === 'string' && entry.state.imageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(entry.state.imageUrl);
            }
            this.bannerStateCache.delete(key);
        }
    }
    
    // Clean up by size if not doing a force cleanup
    if (!force && this.bannerStateCache.size > this.MAX_CACHE_ENTRIES) {
        // Sort entries by timestamp (oldest first)
        const entries = Array.from(this.bannerStateCache.entries())
            .sort(([, a], [, b]) => a.timestamp - b.timestamp);
        
        // Remove oldest entries until we're at max size
        while (entries.length > this.MAX_CACHE_ENTRIES) {
            const [key, entry] = entries.shift();
            // Clean up any persistent icon overlays for this entry
            if (entry.leafId) {
                const leaf = this.app.workspace.getLeafById(entry.leafId);
                if (leaf?.view instanceof MarkdownView) {
                    const contentEl = leaf.view.contentEl;
                    ['cm-sizer', 'markdown-preview-sizer'].forEach(selector => {
                        const container = contentEl.querySelector(`.${selector}`);
                        if (container) {
                            const iconOverlays = container.querySelectorAll('.banner-icon-overlay[data-persistent="true"]');
                            iconOverlays.forEach(overlay => overlay.remove());
                        }
                    });
                }
            }

            // Clean up blob URLs
            if (entry.state?.imageUrl && typeof entry.state.imageUrl === 'string' && entry.state.imageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(entry.state.imageUrl);
            }
            this.bannerStateCache.delete(key);
        }
    }
}

// Helper to invalidate cache for a specific leaf
export function invalidateLeafCache(leafId) {
    for (const [key, entry] of this.bannerStateCache) {
        if (key && typeof key === 'string' && key.includes(`-${leafId}`)) {
            // Clean up any persistent icon overlays
            const leaf = this.app.workspace.getLeafById(leafId);
            if (leaf?.view instanceof MarkdownView) {
                const contentEl = leaf.view.contentEl;
                ['cm-sizer', 'markdown-preview-sizer'].forEach(selector => {
                    const container = contentEl.querySelector(`.${selector}`);
                    if (container) {
                        const iconOverlays = container.querySelectorAll('.banner-icon-overlay[data-persistent="true"]');
                        iconOverlays.forEach(overlay => overlay.remove());
                    }
                });
            }

            // Clean up blob URLs
            if (entry.state?.imageUrl && typeof entry.state.imageUrl === 'string' && entry.state.imageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(entry.state.imageUrl);
            }
            this.bannerStateCache.delete(key);
        }
    }
}