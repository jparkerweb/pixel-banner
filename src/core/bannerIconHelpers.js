import { MarkdownView, Notice } from 'obsidian';
import { EmojiSelectionModal, IconImageSelectionModal } from '../modal/modals.js';


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
    if (!overlay) return;
    
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
            // If selectedEmoji is empty, use processFrontMatter to remove the field
            if (!selectedEmoji) {
                await plugin.app.fileManager.processFrontMatter(activeFile, (frontmatter) => {
                    const bannerIconField = Array.isArray(plugin.settings.customBannerIconField) && 
                        plugin.settings.customBannerIconField.length > 0 ? 
                        plugin.settings.customBannerIconField[0] : 'banner-icon';
                    
                    // Remove the field from frontmatter
                    delete frontmatter[bannerIconField];
                });
                
                // Wait for metadata update
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Update the banner to remove the icon
                const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
                if (view) {
                    await plugin.updateBanner(view, true);
                }
                
                new Notice('Banner icon removed');
                return;
            }
            
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

            // After setting the emoji, check if we should open the targeting modal
            if (plugin.settings.openTargetingModalAfterSelectingBannerOrIcon) {
                // Add a small delay to ensure frontmatter is updated
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Import and use TargetPositionModal
                const { TargetPositionModal } = require('../modal/modals');
                new TargetPositionModal(plugin.app, plugin).open();
            }
        },
        true // Skip the targeting modal in EmojiSelectionModal since we handle it in the callback
    ).open();
}

// Update the cleanup function to be more defensive
export function cleanupIconOverlay(plugin, view) {
    if (!view || !view.contentEl) return;
    
    // Query for all banner icon overlays in the view
    const bannerIconOverlays = view.contentEl.querySelectorAll('.banner-icon-overlay');
    
    // Remove each overlay and return it to the pool if possible
    bannerIconOverlays.forEach(overlay => {
        if (overlay) {
            returnIconOverlay(plugin, overlay);
        }
    });
}

export async function handleSetBannerIconImage(plugin) {
    const activeFile = plugin.app.workspace.getActiveFile();
    if (!activeFile) {
        new Notice('No active file');
        return;
    }

    new IconImageSelectionModal(
        plugin.app,
        plugin,
        async (selectedImage) => {
            if (!selectedImage) {
                // If no image was selected (cancelled), just return
                return;
            }
            
            // Extract the file path from the file object if it's an object
            // IconImageSelectionModal passes a full file object, not just a path string
            const imagePath = selectedImage.path ? selectedImage.path : selectedImage;
            
            let fileContent = await plugin.app.vault.read(activeFile);
            const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
            const hasFrontmatter = frontmatterRegex.test(fileContent);
            
            // Get the correct field name from settings
            const bannerIconImageField = Array.isArray(plugin.settings.customBannerIconImageField) && 
                plugin.settings.customBannerIconImageField.length > 0 ? 
                plugin.settings.customBannerIconImageField[0].split(',')[0].trim() : 'icon-image';

            fileContent = fileContent.replace(/^\s+/, '');

            let updatedContent;
            if (hasFrontmatter) {
                updatedContent = fileContent.replace(frontmatterRegex, (match, frontmatter) => {
                    let cleanedFrontmatter = frontmatter.trim();
                    
                    // Make sure the field exists in settings before trying to iterate
                    if (Array.isArray(plugin.settings.customBannerIconImageField)) {
                        plugin.settings.customBannerIconImageField.forEach(field => {
                            // Handle comma-separated field names
                            const fieldNames = field.split(',').map(f => f.trim());
                            fieldNames.forEach(fieldName => {
                                const fieldRegex = new RegExp(`${fieldName}:\\s*.+\\n?`, 'g');
                                cleanedFrontmatter = cleanedFrontmatter.replace(fieldRegex, '');
                            });
                        });
                    }

                    cleanedFrontmatter = cleanedFrontmatter.trim();
                    const newFrontmatter = `${bannerIconImageField}: "${imagePath}"${cleanedFrontmatter ? '\n' + cleanedFrontmatter : ''}`;
                    return `---\n${newFrontmatter}\n---`;
                });
            } else {
                const cleanContent = fileContent.replace(/^\s+/, '');
                updatedContent = `---\n${bannerIconImageField}: "${imagePath}"\n---\n\n${cleanContent}`;
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
                            if (!cache || !cache.frontmatter || cache.frontmatter[bannerIconImageField] !== imagePath) {
                                await new Promise(resolve => setTimeout(resolve, 100));
                                continue;
                            }

                            await plugin.updateBanner(view, true);
                            success = true;
                            new Notice(`Banner icon image updated: ${imagePath.split('/').pop()}`);
                        } catch (error) {
                            if (i < maxRetries - 1) {
                                await new Promise(resolve => setTimeout(resolve, retryDelay));
                            }
                        }
                    }
                }

                if (!success) {
                    new Notice('Banner icon image set, but banner update failed. Try reopening the note.');
                }
            }
        }
    ).open();
}