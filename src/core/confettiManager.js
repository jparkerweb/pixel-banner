import confetti from 'canvas-confetti';
import { CONFETTI_PRESETS, getPresetCopy } from './confettiPresets';
import { parseEmojiString, sanitizeConfig } from '../utils/confettiUtils';
import { getPathShape } from './confettiShapes';

class ConfettiManager {
    constructor() {
        this.activeCanvases = new Map(); // noteId -> { canvas, confettiInstance }
        this.activeAnimations = new Map(); // noteId -> { intervalId, timeoutId, config, fireBurst, isContinuous, onScreen, observer }
        this.pendingFadeOuts = new Map(); // noteId -> timeoutId for fade-out removal

        // Whether the document is currently visible. Continuous effects are
        // paused while the tab/window is hidden to avoid burning CPU/battery.
        this.docVisible = true;
        this._setupVisibilityHandling();
    }

    // Pause continuous effects when the document is hidden, resume when shown.
    _setupVisibilityHandling() {
        if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') {
            return;
        }
        this.docVisible = !document.hidden;
        document.addEventListener('visibilitychange', () => {
            this.docVisible = !document.hidden;
            for (const noteId of this.activeAnimations.keys()) {
                this._reconcileAnimation(noteId);
            }
        });
    }

    // Start or stop a continuous animation's interval based on whether it
    // should currently be running (document visible AND canvas on-screen).
    // Single-burst effects have no interval and are unaffected.
    _reconcileAnimation(noteId) {
        const animation = this.activeAnimations.get(noteId);
        if (!animation || !animation.isContinuous) return;

        const shouldRun = this.docVisible && animation.onScreen;

        if (shouldRun && animation.intervalId === null) {
            // Resume: fire immediately so there's no visible gap, then schedule
            animation.fireBurst();
            animation.intervalId = setInterval(animation.fireBurst, animation.config.interval);
        } else if (!shouldRun && animation.intervalId !== null) {
            // Pause
            clearInterval(animation.intervalId);
            animation.intervalId = null;
        }
    }

    // Create canvas overlay for a note element
    createCanvas(noteElement) {
        const canvas = document.createElement('canvas');
        canvas.className = 'pixel-banner-confetti-canvas';

        // Style the canvas for overlay
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        // z-index lives in styles.css (.pixel-banner-confetti-canvas) so users
        // can override the layering with a CSS snippet.
        canvas.style.opacity = '0';
        canvas.style.transition = 'opacity 0s linear';

        // Ensure noteElement has relative positioning for absolute canvas
        const parentPosition = window.getComputedStyle(noteElement).position;
        if (parentPosition === 'static') {
            noteElement.style.position = 'relative';
        }

        noteElement.appendChild(canvas);

        // Create confetti instance bound to this canvas
        const confettiInstance = confetti.create(canvas, {
            resize: true,
            useWorker: true
        });

        return { canvas, confettiInstance };
    }

    // Map user-friendly position to origin {x, y}
    mapPosition(position) {
        const positionMap = {
            'top': { x: 0.5, y: 0 },
            'bottom': { x: 0.5, y: 1 },
            'left': { x: 0, y: 0.5 },
            'right': { x: 1, y: 0.5 },
            'center': { x: 0.5, y: 0.5 },
            'top-left': { x: 0, y: 0 },
            'top-right': { x: 1, y: 0 },
            'bottom-left': { x: 0, y: 1 },
            'bottom-right': { x: 1, y: 1 },
            'random': { x: Math.random(), y: Math.random() }
        };

        return positionMap[position] || positionMap['center'];
    }

    // Get position along an edge for distributed bursts
    getEdgePosition(basePosition, index, total, yOffset = 0) {
        // Calculate position along the edge
        // Use spacing that avoids exact edges (0.05 to 0.95 range)
        const spacing = 0.9 / (total - 1);
        const position = 0.05 + (spacing * index);

        switch (basePosition) {
            case 'top':
                return { x: position, y: 0 + yOffset };
            case 'bottom':
                return { x: position, y: 1 + yOffset };
            case 'left':
                return { x: 0 + yOffset, y: position };
            case 'right':
                return { x: 1 + yOffset, y: position };
            default:
                // For corner or center positions, distribute along x-axis at the same y
                const basePos = this.mapPosition(basePosition);
                return { x: position, y: basePos.y + yOffset };
        }
    }

    // Get random position along a specified edge
    getRandomEdgePosition(basePosition) {
        switch (basePosition) {
            case 'top':
                return { x: Math.random(), y: 0 };
            case 'bottom':
                return { x: Math.random(), y: 1 };
            case 'left':
                return { x: 0, y: Math.random() };
            case 'right':
                return { x: 1, y: Math.random() };
            case 'random':
                return { x: Math.random(), y: Math.random() };
            default:
                // For corners or center, randomize along the appropriate axis
                const basePos = this.mapPosition(basePosition);
                if (basePosition.includes('top') || basePosition.includes('bottom')) {
                    return { x: Math.random(), y: basePos.y };
                }
                return basePos;
        }
    }

    // Create emoji shapes from string
    createEmojiShapes(emojiString, scalar = 1) {
        if (!emojiString) return null;

        const emojiArray = parseEmojiString(emojiString);
        if (!emojiArray || emojiArray.length === 0) return null;

        try {
            const shapes = emojiArray.map(emoji => {
                return confetti.shapeFromText({ text: emoji, scalar: scalar });
            });
            return shapes;
        } catch (error) {
            console.log('Pixel Banner: Error creating emoji shapes:', error);
            return null;
        }
    }

    // Build confetti options from preset + overrides
    buildOptions(presetName, overrides = {}) {
        const preset = getPresetCopy(presetName);
        if (!preset) {
            console.log(`Pixel Banner: Unknown confetti preset "${presetName}"`);
            return null;
        }

        // Merge preset with overrides, then clamp every value to valid ranges.
        // This guards against out-of-range or malformed numbers from
        // hand-edited frontmatter (the modal already constrains its inputs).
        const config = sanitizeConfig({ ...preset, ...overrides });

        // Build canvas-confetti API options
        const options = {
            particleCount: config.count,
            scalar: config.size,
            startVelocity: config.speed,
            gravity: config.gravity,
            spread: config.spread,
            drift: config.drift,
            ticks: config.duration,
            origin: this.mapPosition(config.position),
            disableForReducedMotion: true
        };

        // Handle custom path shapes (highest priority)
        if (config.customShapes && Array.isArray(config.customShapes) && config.customShapes.length > 0) {
            const pathShapes = config.customShapes
                .map(name => getPathShape(name))
                .filter(s => s !== null);
            if (pathShapes.length > 0) {
                options.shapes = pathShapes;
            }
        }
        // Handle emoji shapes (second priority)
        else if (config.emoji) {
            const shapes = this.createEmojiShapes(config.emoji, config.size);
            if (shapes && shapes.length > 0) {
                options.shapes = shapes;
                options.flat = true; // Emoji shapes should be flat
            }
        }
        // Handle explicit built-in shapes (circle, square, star)
        else if (config.shapes && Array.isArray(config.shapes)) {
            options.shapes = config.shapes;
        }

        // Handle colors (only if not using emoji)
        if (!config.emoji && config.colors && Array.isArray(config.colors) && config.colors.length > 0) {
            // Normalize colors to 6-character hex (strip alpha if present)
            options.colors = config.colors.map(color => {
                if (typeof color !== 'string') return '#ffffff';
                // Strip alpha channel from 8-char hex colors
                if (color.match(/^#[0-9a-fA-F]{8}$/)) {
                    return color.substring(0, 7);
                }
                return color;
            });
        }

        // Handle flat/tumble option (default is tumble/false)
        if (config.flat === true) {
            options.flat = true;
        }

        return { options, config };
    }

    // Start confetti effect on a note
    start(noteId, noteElement, presetName, overrides = {}, isMobile = false) {
        // Stop any existing effect on this note
        this.stop(noteId, 0);

        const result = this.buildOptions(presetName, overrides);
        if (!result) return;

        const { options, config } = result;

        // Create canvas
        const { canvas, confettiInstance } = this.createCanvas(noteElement);

        // Store canvas reference
        this.activeCanvases.set(noteId, { canvas, confettiInstance });

        // Apply fadeIn opacity transition
        if (config.fadeIn > 0) {
            canvas.style.transition = `opacity ${config.fadeIn}ms ease-in`;
        }

        // Set target opacity
        setTimeout(() => {
            canvas.style.opacity = String(config.opacity);
        }, 10);

        // Create animation state
        const animationState = {
            intervalId: null,
            timeoutId: null,
            config: config,
            fireBurst: () => this.fireBurst(confettiInstance, config, options),
            isContinuous: false,
            onScreen: true,
            observer: null
        };

        // Store animation state up front so _reconcileAnimation can find it
        this.activeAnimations.set(noteId, animationState);

        // Handle delay before starting
        const startAnimation = () => {
            if (config.continuous && config.interval > 0) {
                // Continuous effect: let _reconcileAnimation manage the interval
                // so it can pause/resume on visibility and on-screen changes.
                animationState.isContinuous = true;
                this._reconcileAnimation(noteId);
            } else {
                // Single burst
                animationState.fireBurst();
            }
        };

        if (config.delay > 0) {
            animationState.timeoutId = setTimeout(startAnimation, config.delay);
        } else {
            startAnimation();
        }

        // Pause continuous effects while the canvas is scrolled out of view
        if (config.continuous && config.interval > 0 && typeof IntersectionObserver !== 'undefined') {
            const observer = new IntersectionObserver((entries) => {
                for (const entry of entries) {
                    animationState.onScreen = entry.isIntersecting;
                }
                this._reconcileAnimation(noteId);
            }, { threshold: 0 });
            observer.observe(canvas);
            animationState.observer = observer;
        }
    }

    // Fire single burst
    fireBurst(confettiInstance, config, baseOptions) {
        const originSpread = config.originSpread || 'fixed';

        if (originSpread === 'edge') {
            // Fire multiple smaller bursts distributed across the edge
            const numBursts = 7; // More bursts = better coverage
            const particlesPerBurst = Math.ceil(config.count / numBursts);
            const yOffset = config.startY || 0; // Allow starting off-screen

            for (let i = 0; i < numBursts; i++) {
                const options = { ...baseOptions };
                options.particleCount = particlesPerBurst;
                options.origin = this.getEdgePosition(config.position, i, numBursts, yOffset);

                // Apply randomization ranges if specified
                if (config.sizeRange && Array.isArray(config.sizeRange)) {
                    const [min, max] = config.sizeRange;
                    options.scalar = min + Math.random() * (max - min);
                }
                if (config.gravityRange && Array.isArray(config.gravityRange)) {
                    const [min, max] = config.gravityRange;
                    options.gravity = min + Math.random() * (max - min);
                }
                if (config.driftRange && Array.isArray(config.driftRange)) {
                    const [min, max] = config.driftRange;
                    options.drift = min + Math.random() * (max - min);
                } else if (config.drift !== undefined) {
                    // Fallback: add slight randomization for natural variation
                    options.drift = config.drift + (Math.random() - 0.5) * 0.5;
                }
                if (config.speedRange && Array.isArray(config.speedRange)) {
                    const [min, max] = config.speedRange;
                    options.startVelocity = min + Math.random() * (max - min);
                }

                // If using emoji shapes, randomly select one for variety
                if (config.emoji && options.shapes && options.shapes.length > 1) {
                    const randomShape = options.shapes[Math.floor(Math.random() * options.shapes.length)];
                    options.shapes = [randomShape];
                }

                // For low particle counts per burst, randomly pick one color for variety
                if (options.colors && options.colors.length > 1 && particlesPerBurst <= 3) {
                    const randomColor = options.colors[Math.floor(Math.random() * options.colors.length)];
                    options.colors = [randomColor];
                }

                try {
                    confettiInstance(options);
                } catch (error) {
                    console.log('Pixel Banner: Error firing confetti burst:', error);
                }
            }
        } else if (originSpread === 'random') {
            // Single burst but randomize position on the edge
            const options = { ...baseOptions };

            // Get random position with optional Y offset
            const baseOrigin = this.getRandomEdgePosition(config.position);
            const yOffset = config.startY || 0;
            options.origin = { x: baseOrigin.x, y: baseOrigin.y + yOffset };

            // Apply randomization ranges if specified
            if (config.sizeRange && Array.isArray(config.sizeRange)) {
                const [min, max] = config.sizeRange;
                options.scalar = min + Math.random() * (max - min);
            }
            if (config.gravityRange && Array.isArray(config.gravityRange)) {
                const [min, max] = config.gravityRange;
                options.gravity = min + Math.random() * (max - min);
            }
            if (config.driftRange && Array.isArray(config.driftRange)) {
                const [min, max] = config.driftRange;
                options.drift = min + Math.random() * (max - min);
            } else if (config.drift !== undefined) {
                // Fallback: add slight randomization for natural variation
                options.drift = config.drift + (Math.random() - 0.5) * 0.5;
            }
            if (config.speedRange && Array.isArray(config.speedRange)) {
                const [min, max] = config.speedRange;
                options.startVelocity = min + Math.random() * (max - min);
            }

            // If using emoji shapes, randomly select one for variety
            if (config.emoji && options.shapes && options.shapes.length > 1) {
                const randomShape = options.shapes[Math.floor(Math.random() * options.shapes.length)];
                options.shapes = [randomShape];
            }

            // For low particle counts, randomly pick one color to ensure variety across bursts
            if (options.colors && options.colors.length > 1 && config.count <= 3) {
                const randomColor = options.colors[Math.floor(Math.random() * options.colors.length)];
                options.colors = [randomColor];
            }

            try {
                confettiInstance(options);
            } catch (error) {
                console.log('Pixel Banner: Error firing confetti burst:', error);
            }
        } else {
            // Fixed position (original behavior)
            const options = { ...baseOptions };

            // If position is 'random', set new random origin for each burst
            if (config.position === 'random') {
                options.origin = { x: Math.random(), y: Math.random() };
            }

            // If using emoji shapes, randomly select one for variety
            if (config.emoji && options.shapes && options.shapes.length > 1) {
                const randomShape = options.shapes[Math.floor(Math.random() * options.shapes.length)];
                options.shapes = [randomShape];
            }

            try {
                confettiInstance(options);
            } catch (error) {
                console.log('Pixel Banner: Error firing confetti burst:', error);
            }
        }
    }

    // Stop confetti effect on a note with fade out
    stop(noteId, fadeOutDuration = 500) {
        const canvasData = this.activeCanvases.get(noteId);
        const animationData = this.activeAnimations.get(noteId);

        if (!canvasData) return;

        const { canvas, confettiInstance } = canvasData;

        // Clear any running animations
        if (animationData) {
            if (animationData.intervalId) {
                clearInterval(animationData.intervalId);
            }
            if (animationData.timeoutId) {
                clearTimeout(animationData.timeoutId);
            }
            if (animationData.observer) {
                animationData.observer.disconnect();
            }
            this.activeAnimations.delete(noteId);
        }

        // Cancel any pending fade-out timeout for this note
        const pendingFadeOut = this.pendingFadeOuts.get(noteId);
        if (pendingFadeOut) {
            clearTimeout(pendingFadeOut);
            this.pendingFadeOuts.delete(noteId);
        }

        // Reset the confetti instance (clears particles)
        try {
            confettiInstance.reset();
        } catch (error) {
            console.log('Pixel Banner: Error resetting confetti instance:', error);
        }

        // Fade out and remove canvas
        if (fadeOutDuration > 0) {
            canvas.style.transition = `opacity ${fadeOutDuration}ms ease-out`;
            canvas.style.opacity = '0';

            const fadeOutTimeout = setTimeout(() => {
                this.pendingFadeOuts.delete(noteId);
                this.removeCanvas(noteId);
            }, fadeOutDuration);
            this.pendingFadeOuts.set(noteId, fadeOutTimeout);
        } else {
            this.removeCanvas(noteId);
        }
    }

    // Remove canvas from DOM and clean up
    removeCanvas(noteId) {
        const canvasData = this.activeCanvases.get(noteId);
        if (!canvasData) return;

        const { canvas } = canvasData;

        if (canvas && canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
        }

        // Nullify references to aid garbage collection
        canvasData.canvas = null;
        canvasData.confettiInstance = null;

        this.activeCanvases.delete(noteId);
    }

    // Stop all active effects
    stopAll(immediate = false) {
        const noteIds = Array.from(this.activeCanvases.keys());
        for (const noteId of noteIds) {
            this.stop(noteId, immediate ? 0 : 500);
        }
    }

    // Check if a note has an active confetti effect
    hasActiveEffect(noteId) {
        return this.activeCanvases.has(noteId);
    }

    // Get all active note IDs
    getActiveNoteIds() {
        return Array.from(this.activeCanvases.keys());
    }

    // Update an existing effect with new configuration
    update(noteId, noteElement, presetName, overrides = {}, isMobile = false) {
        // Simply restart with new configuration
        this.start(noteId, noteElement, presetName, overrides, isMobile);
    }
}

// Export singleton instance
export const confettiManager = new ConfettiManager();

// Also export the class for testing purposes
export { ConfettiManager };
