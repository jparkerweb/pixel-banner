    // Get an overlay from the pool or create a new one
    export function getIconOverlay() {
        if (this.iconOverlayPool.length > 0) {
            return this.iconOverlayPool.pop();
        }
        const overlay = document.createElement('div');
        overlay.className = 'banner-icon-overlay';
        return overlay;
    }

    // Return an overlay to the pool
    export function returnIconOverlay(overlay) {
        if (this.iconOverlayPool.length < this.MAX_POOL_SIZE) {
            // Reset the overlay
            overlay.style.cssText = '';
            overlay.className = 'banner-icon-overlay';
            overlay.textContent = '';
            overlay.remove(); // Remove from DOM
            this.iconOverlayPool.push(overlay);
        }
    }

    // Optimized method to compare icon states and determine if update is needed
    export function shouldUpdateIconOverlay(existingOverlay, newIconState, viewType) {
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
                    !(prop.includes('color') && this.normalizeColor(current) === this.normalizeColor(value));
        });
    }