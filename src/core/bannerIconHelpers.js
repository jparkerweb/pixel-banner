import { MarkdownView, Notice } from 'obsidian';
import { EmojiSelectionModal } from '../modal/modals.js';


// Helper to normalize color values for comparison
function normalizeColor(color) {
    if (!color || color === 'transparent' || color === 'none') return 'transparent';
    // Convert rgb/rgba to lowercase and remove spaces
    return color.toLowerCase().replace(/\s+/g, '');
}


// Get an overlay from the pool or create a new one
export function getIconOverlay(plugin) {
    if (plugin.iconOverlayPool.length > 0) {
        return plugin.iconOverlayPool.pop();
    }
    const overlay = document.createElement('div');
    overlay.className = 'banner-icon-overlay';
    return overlay;
}

// Return an overlay to the pool
export function returnIconOverlay(plugin, overlay) {
    if (plugin.iconOverlayPool.length < plugin.MAX_POOL_SIZE) {
        // Reset the overlay
        overlay.style.cssText = '';
        overlay.className = 'banner-icon-overlay';
        overlay.textContent = '';
        overlay.remove(); // Remove from DOM
        plugin.iconOverlayPool.push(overlay);
    }
}

// Optimized method to compare icon states and determine if update is needed
export function shouldUpdateIconOverlay(plugin, existingOverlay, newIconState, viewType) {
    if (!existingOverlay || !newIconState) return true;
    
    // Quick checks first
    if (!existingOverlay._isPersistentBannerIcon ||
        existingOverlay.dataset.viewType !== viewType ||
        existingOverlay.textContent !== newIconState.icon) {
        return true;
    }

    // Cache computed style
    const computedStyle = window.getComputedStyle(existingOverlay);
    
    // Define style checks with expected values
    const styleChecks = {
        fontSize: `${newIconState.size}px`,
        left: `${newIconState.xPosition}%`,
        opacity: `${newIconState.opacity}%`,
        color: newIconState.color,
        fontWeight: newIconState.fontWeight,
        backgroundColor: newIconState.backgroundColor,
        borderRadius: `${newIconState.borderRadius}px`,
        marginTop: `${newIconState.verticalOffset}px`
    };

    // Check padding separately to handle both X and Y
    const currentPadding = computedStyle.padding.split(' ');
    const expectedPadding = `${newIconState.paddingY}px ${newIconState.paddingX}px`;
    if (currentPadding.join(' ') !== expectedPadding) {
        return true;
    }

    // Check all other styles
    return Object.entries(styleChecks).some(([prop, value]) => {
        const current = computedStyle[prop];
        return current !== value && 
                // Handle special cases for colors
                !(prop.includes('color') && normalizeColor(current) === normalizeColor(value));
    });
}

export async function handleSetBannerIcon(plugin) {
    const activeFile = plugin.app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice('No active file');
        return;
    }

    new EmojiSelectionModal(
        plugin.app,
        plugin,
        async (selectedEmoji) => {
            let fileContent = await plugin.app.vault.read(activeFile);
            const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
            const hasFrontmatter = frontmatterRegex.test(fileContent);
            
            const bannerIconField = Array.isArray(plugin.settings.customBannerIconField) && 
                plugin.settings.customBannerIconField.length > 0 ? 
                plugin.settings.customBannerIconField[0] : 'banner-icon';

            fileContent = fileContent.replace(/^\s+/, '');

            let updatedContent;
            if (hasFrontmatter) {
                updatedContent = fileContent.replace(frontmatterRegex, (match, frontmatter) => {
                    let cleanedFrontmatter = frontmatter.trim();
                    
                    plugin.settings.customBannerIconField.forEach(field => {
                        const fieldRegex = new RegExp(`${field}:\\s*.+\\n?`, 'g');
                        cleanedFrontmatter = cleanedFrontmatter.replace(fieldRegex, '');
                    });

                    cleanedFrontmatter = cleanedFrontmatter.trim();
                    const newFrontmatter = `${bannerIconField}: "${selectedEmoji}"${cleanedFrontmatter ? '\n' + cleanedFrontmatter : ''}`;
                    return `---\n${newFrontmatter}\n---`;
                });
            } else {
                const cleanContent = fileContent.replace(/^\s+/, '');
                updatedContent = `---\n${bannerIconField}: "${selectedEmoji}"\n---\n\n${cleanContent}`;
            }

            updatedContent = updatedContent.replace(/^\s+/, '');
            
            if (updatedContent !== fileContent) {
                await plugin.app.vault.modify(activeFile, updatedContent);

                // Wait for metadata update
                const metadataUpdated = new Promise(resolve => {
                    let eventRef = null;
                    let resolved = false;

                    const cleanup = () => {
                        if (eventRef) {
                            plugin.app.metadataCache.off('changed', eventRef);
                            eventRef = null;
                        }
                    };

                    const timeoutId = setTimeout(() => {
                        if (!resolved) {
                            resolved = true;
                            cleanup();
                            resolve();
                        }
                    }, 2000);

                    eventRef = plugin.app.metadataCache.on('changed', (file) => {
                        if (file.path === activeFile.path && !resolved) {
                            resolved = true;
                            clearTimeout(timeoutId);
                            cleanup();
                            setTimeout(resolve, 50);
                        }
                    });
                });

                await metadataUpdated;

                // attempt to update banner with retries
                const maxRetries = 3;
                const retryDelay = 150;
                let success = false;

                for (let i = 0; i < maxRetries && !success; i++) {
                    const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
                    if (view) {
                        try {
                            const cache = plugin.app.metadataCache.getFileCache(activeFile);
                            if (!cache || !cache.frontmatter || cache.frontmatter[bannerIconField] !== selectedEmoji) {
                                await new Promise(resolve => setTimeout(resolve, 100));
                                continue;
                            }

                            await plugin.updateBanner(view, true);
                            success = true;
                        } catch (error) {
                            if (i < maxRetries - 1) {
                                await new Promise(resolve => setTimeout(resolve, retryDelay));
                            }
                        }
                    }
                }

                if (!success) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
                    if (view) {
                        await plugin.updateBanner(view, true);
                    }
                }

                new Notice('Banner icon updated');
            }
        }
    ).open();
}