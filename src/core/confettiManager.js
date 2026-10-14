import confetti from 'canvas-confetti';
import { Platform } from 'obsidian';
import { getPresetCopy, getLightThemeColors } from './confettiPresets';
import { parseEmojiString, sanitizeConfig } from '../utils/confettiUtils';
import { normalize, resolvePresetName, sanitizeHexColors } from '../utils/confettiConfig';
import { getPathShape } from './confettiShapes';

// Effect id the confetti modal uses for its live preview
export const PREVIEW_EFFECT_ID = '<<confetti-modal-preview>>';

// Class that gives a pane's container position: relative while an effect runs in it
export const CONFETTI_HOST_CLASS = 'pixel-banner-confetti-host';

// Whether confetti may run at all: the mobile setting and the OS reduced-motion
// preference (unless the effect opts out with respectReducedMotion: false).
// Every start path (note open, metadata change, startup, Apply, preview) asks this.
export function shouldRunConfetti(plugin, overrides = {}) {
    if (plugin && plugin.settings && plugin.settings.confettiDisableOnMobile && Platform.isMobile) {
        return false;
    }
    const prefersReducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion && (!overrides || overrides.respectReducedMotion !== false)) {
        return false;
    }
    return true;
}

// Stable string for comparing two configs (key order independent)
function configKey(presetName, overrides) {
    const normalized = normalize(overrides || {});
    const sorted = {};
    for (const key of Object.keys(normalized).sort()) {
        sorted[key] = normalized[key];
    }
    return JSON.stringify([resolvePresetName(presetName) || presetName, sorted]);
}

// Singular keys and the range each one stands in for at burst time
const SINGULAR_RANGE_KEYS = {
    size: 'sizeRange',
    speed: 'speedRange',
    gravity: 'gravityRange',
    drift: 'driftRange'
};

// Obsidian marks the light theme on body; read when an effect starts
export function isLightTheme() {
    return typeof document !== 'undefined' && !!document.body && document.body.classList.contains('theme-light');
}

// Randomise one burst's size, speed, gravity and drift within the config's
// ranges. Without a driftRange, drift gets a slight jitter for variety.
function applyRanges(options, config) {
    const pick = ([min, max]) => min + Math.random() * (max - min);
    if (Array.isArray(config.sizeRange)) {
        options.scalar = pick(config.sizeRange);
    }
    if (Array.isArray(config.speedRange)) {
        options.startVelocity = pick(config.speedRange);
    }
    if (Array.isArray(config.gravityRange)) {
        options.gravity = pick(config.gravityRange);
    }
    if (Array.isArray(config.driftRange)) {
        options.drift = pick(config.driftRange);
    } else if (config.drift !== undefined) {
        options.drift = config.drift + (Math.random() - 0.5) * 0.5;
    }
}

// A burst of 3 or fewer emoji shows one random emoji for variety; larger
// bursts keep the full list so multi-emoji presets show their mix
function pickBurstEmoji(options, config) {
    if (config.emoji && options.shapes && options.shapes.length > 1 && options.particleCount <= 3) {
        options.shapes = [options.shapes[Math.floor(Math.random() * options.shapes.length)]];
    }
}

// One pane's effect: its canvas, canvas-confetti instance, timers and
// observers. Runs only while the document is visible, the pane has a size and
// its banner (or content) is on screen.
class ConfettiEffect {
    constructor(manager, id, containerEl, { presetName, overrides, options, config, isPreview, filePath }) {
        this.manager = manager;
        this.id = id;
        this.containerEl = containerEl;
        // The pane's own document: a popout window has its own, with its own visibility
        this.doc = containerEl.doc || containerEl.ownerDocument || document;
        this.presetName = presetName;
        this.overrides = overrides || {};
        this.rawConfig = { presetName, overrides: this.overrides };
        this.configKey = configKey(presetName, this.overrides);
        this.options = options;
        this.config = config;
        this.isPreview = !!isPreview;
        this.filePath = filePath || null;

        this.canvas = null;
        this.confettiInstance = null;
        this.intervalId = null;
        this.timeoutId = null;
        this.fadeInTimeoutId = null;
        this.fadeOutTimeoutId = null;
        this.resizeObserver = null;
        this.intersectionObserver = null;
        this.observedEl = null;
        this.observedRoot = null;
        this.lastTargetLookup = 0;

        this.isContinuous = !!(config.continuous && config.interval > 0);
        this.delayDone = false;
        this.hasSize = false;
        this.onScreen = true;
        this.paused = false;
        this.firedOnce = false;
        this.stopped = false;
        this.disposed = false;
    }

    // Same preset and normalized overrides as this running effect?
    matches(presetName, overrides) {
        return this.configKey === configKey(presetName, overrides);
    }

    start() {
        this.manager._watchDocument(this.doc);
        const canvas = this.doc.createElement('canvas');
        // Overlay layout (position, size, z-index) lives in styles.css under
        // .pixel-banner-confetti-canvas; only the fade is set here.
        canvas.className = 'pixel-banner-confetti-canvas';
        canvas.style.opacity = '0';
        canvas.style.transition = 'opacity 0s linear';

        // The absolute canvas needs a positioned container. A host class
        // does that without changing Obsidian's own element for good: it is
        // removed again when the last effect in this container goes.
        const win = this.containerEl.win || this.doc.defaultView || window;
        const position = win.getComputedStyle(this.containerEl).position;
        if (!position || position === 'static') {
            this.containerEl.classList.add(CONFETTI_HOST_CLASS);
        }

        this.containerEl.appendChild(canvas);
        this.canvas = canvas;

        // Main-thread instance: canvas-confetti's worker is a module-level
        // singleton bound to one canvas, so it cannot drive several panes.
        // The canvas buffer is sized by our ResizeObserver, not by the library.
        this.confettiInstance = confetti.create(canvas, {
            resize: false,
            useWorker: false
        });

        // Apply fadeIn opacity transition
        if (this.config.fadeIn > 0) {
            canvas.style.transition = `opacity ${this.config.fadeIn}ms ease-in`;
        }
        this.fadeInTimeoutId = setTimeout(() => {
            this.fadeInTimeoutId = null;
            if (this.canvas) this.canvas.style.opacity = String(this.config.opacity);
        }, 10);

        // Track the pane size; nothing fires until the canvas has a size
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => this.handleResize());
            this.resizeObserver.observe(this.containerEl);
        }
        this.handleResize();

        // Pause while the banner is scrolled away or the pane is hidden
        this.observeVisibility();

        if (this.config.delay > 0) {
            this.timeoutId = setTimeout(() => {
                this.timeoutId = null;
                this.delayDone = true;
                this.reconcile();
            }, this.config.delay);
        } else {
            this.delayDone = true;
            this.reconcile();
        }
    }

    // Keep the canvas buffer at the container's size. A size change clears the
    // particles in flight, since the library keeps drawing at the old size.
    handleResize() {
        if (this.stopped || !this.canvas) return;
        const width = this.containerEl.clientWidth || 0;
        const height = this.containerEl.clientHeight || 0;
        this.hasSize = width > 0 && height > 0;

        if (this.hasSize && (this.canvas.width !== width || this.canvas.height !== height)) {
            if (this.firedOnce) {
                try {
                    this.confettiInstance.reset();
                } catch (error) {
                    // Nothing in flight to clear; the new size applies anyway
                }
            }
            this.canvas.width = width;
            this.canvas.height = height;
        }

        this.reconcile();
    }

    // The element to watch for on-screen state and its scroll container:
    // the banner inside the scroller that is currently shown (editing or
    // reading view), otherwise the container itself against the viewport.
    // The container holds the scroller, so it can never intersect it (a new
    // split pane has no banner yet when its effect starts), and a banner
    // outside the shown scroller sits in a hidden view that never comes on
    // screen (a pane hidden behind another tab has no shown scroller).
    resolveVisibilityTarget() {
        this.lastTargetLookup = Date.now();
        const scrollers = Array.from(this.containerEl.querySelectorAll('.cm-scroller, .markdown-preview-view'));
        const root = scrollers.find(el => el.offsetParent !== null) || null;
        const banner = root ? root.querySelector('.pixel-banner-image') : null;
        return banner ? { root, target: banner } : { root: null, target: this.containerEl };
    }

    observeVisibility() {
        if (typeof IntersectionObserver === 'undefined') return;

        const { root, target } = this.resolveVisibilityTarget();
        if (this.intersectionObserver && target === this.observedEl && root === this.observedRoot) return;

        if (this.intersectionObserver) this.intersectionObserver.disconnect();
        this.observedEl = target;
        this.observedRoot = root;
        this.intersectionObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                // The banner was re-rendered: watch the new one instead of
                // pausing on the detached element.
                if (!entry.target.isConnected) {
                    this.observeVisibility();
                    return;
                }
                this.onScreen = entry.isIntersecting;
            }
            this.reconcile();
            // The pane is shown again: watch its banner from here on, so
            // scrolling the banner away pauses the effect
            if (this.onScreen && this.observedEl === this.containerEl) {
                this.observeVisibility();
            }
        }, { root, threshold: 0 });
        this.intersectionObserver.observe(target);
    }

    // Re-resolve the watched element (after a mode switch or banner re-render)
    refreshVisibilityTarget() {
        if (this.stopped) return;
        this.observeVisibility();
        this.handleResize();
    }

    shouldRun() {
        return !this.stopped && !this.paused && this.delayDone && this.hasSize
            && this.onScreen && !this.doc.hidden;
    }

    // Start or stop the interval (continuous) or fire the one burst, based on
    // whether the effect should be running right now. Resuming fires once
    // immediately so there is no visible gap.
    reconcile() {
        if (this.stopped) return;
        const run = this.shouldRun();

        if (!this.isContinuous) {
            if (run && !this.firedOnce) {
                this.fireBurst();
            }
            return;
        }

        if (run && this.intervalId === null) {
            this.fireBurst();
            this.intervalId = setInterval(() => this.fireBurst(), this.config.interval);
        } else if (!run && this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    fireBurst() {
        if (this.stopped || !this.confettiInstance) return;
        // Still watching the container: the banner renders after the effect
        // starts in a new pane, so look for it and watch it once it exists.
        // At most once a second: the lookup forces layout, and a note without
        // a banner never finds one (layout changes and update() still re-resolve).
        if (this.intersectionObserver && this.observedEl === this.containerEl
            && Date.now() - this.lastTargetLookup >= 1000) {
            this.observeVisibility();
        }
        this.firedOnce = true;
        this.manager.fireBurst(this.confettiInstance, this.config, this.options);
    }

    pause() {
        this.paused = true;
        this.reconcile();
    }

    resume() {
        this.paused = false;
        this.reconcile();
    }

    _clearRunning() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        if (this.fadeInTimeoutId !== null) {
            clearTimeout(this.fadeInTimeoutId);
            this.fadeInTimeoutId = null;
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }
    }

    // Stop spawning at once; let the particles fade with the canvas, then
    // clear them and remove the canvas. fadeMs 0 removes everything now.
    stop(fadeMs = 500) {
        if (this.disposed) return;
        if (this.stopped) {
            if (fadeMs <= 0) this.dispose();
            return;
        }
        this.stopped = true;
        this._clearRunning();

        if (fadeMs > 0 && this.canvas) {
            this.canvas.style.transition = `opacity ${fadeMs}ms ease-out`;
            this.canvas.style.opacity = '0';
            this.fadeOutTimeoutId = setTimeout(() => {
                this.fadeOutTimeoutId = null;
                this.dispose();
            }, fadeMs);
        } else {
            this.dispose();
        }
    }

    // Release everything: timers, observers, particles and the canvas. Safe to call twice.
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.stopped = true;
        this._clearRunning();
        if (this.fadeOutTimeoutId !== null) {
            clearTimeout(this.fadeOutTimeoutId);
            this.fadeOutTimeoutId = null;
        }

        if (this.confettiInstance) {
            try {
                this.confettiInstance.reset();
            } catch (error) {
                // Nothing in flight to clear; the canvas is removed anyway
            }
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }

        this.canvas = null;
        this.confettiInstance = null;
        this.observedEl = null;
        this.observedRoot = null;
        this.manager._forget(this);
        this.removeHostClass();
    }

    // Drop the host class unless another live effect still draws in this container
    removeHostClass() {
        const shared = [...this.manager.effects.values(), ...this.manager.fadingEffects]
            .some(effect => effect !== this && !effect.disposed && effect.containerEl === this.containerEl);
        if (!shared) {
            this.containerEl.classList.remove(CONFETTI_HOST_CLASS);
        }
    }
}

// Registry of running effects, one per pane (keyed by leaf id) plus the
// modal preview.
class ConfettiManager {
    constructor() {
        this.effects = new Map(); // effectId -> ConfettiEffect
        this.fadingEffects = new Set(); // stopped effects still fading out
        this.plugin = null;
        // Popout window documents listened to while an effect runs in them
        this.popoutDocs = new Set();

        // Effects pause while their window is hidden (each reads its own
        // document's hidden flag) to avoid burning CPU/battery.
        this._onVisibilityChange = this._onVisibilityChange.bind(this);
    }

    // Register lifecycle hooks through the plugin so unload releases them:
    // the main window's visibility listener, and one cleanup that disposes
    // every effect (with its interval) even if onunload's destroy() is missed.
    // Intervals are not registered one by one: a resume creates a new one each
    // time, and each registration would live until unload.
    init(plugin) {
        if (this.plugin === plugin) return;
        this.plugin = plugin;
        if (typeof document !== 'undefined') {
            plugin.registerDomEvent(document, 'visibilitychange', this._onVisibilityChange);
        }
        if (typeof plugin.register === 'function') {
            plugin.register(() => this.destroy());
        }
    }

    // Dispose every effect (plugin unload)
    destroy() {
        for (const effect of [...this.effects.values(), ...this.fadingEffects]) {
            effect.dispose();
        }
        this.effects.clear();
        this.fadingEffects.clear();
        this.plugin = null;
    }

    _onVisibilityChange() {
        for (const effect of this.effects.values()) {
            effect.reconcile();
        }
    }

    // A popout window's document gets its own listener while an effect runs
    // there; init() covers the main document for the plugin's lifetime
    _watchDocument(doc) {
        if (doc === document || this.popoutDocs.has(doc)) return;
        doc.addEventListener('visibilitychange', this._onVisibilityChange);
        this.popoutDocs.add(doc);
    }

    _forget(effect) {
        this.fadingEffects.delete(effect);
        if (this.effects.get(effect.id) === effect) {
            this.effects.delete(effect.id);
        }
        // Last effect in a popout gone: release its document
        const doc = effect.doc;
        if (this.popoutDocs.has(doc) && ![...this.effects.values(), ...this.fadingEffects].some(e => e.doc === doc)) {
            doc.removeEventListener('visibilitychange', this._onVisibilityChange);
            this.popoutDocs.delete(doc);
        }
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
            console.error('Pixel Banner: Error creating emoji shapes:', error);
            return null;
        }
    }

    // Build confetti options from preset + overrides
    buildOptions(presetName, overrides = {}) {
        const preset = getPresetCopy(presetName);
        // An unknown preset runs nothing; the Target Position modal names it
        if (!preset) {
            return null;
        }

        // Merge preset with overrides, then clamp every value to valid ranges.
        // This guards against out-of-range or malformed numbers from
        // hand-edited frontmatter (the modal already constrains its inputs).
        // A singular size/speed/gravity/drift override without its range
        // replaces the preset's range, so 'speed: 10' still changes the effect
        const userOverrides = normalize(overrides);
        const singularRanges = {};
        for (const [key, rangeKey] of Object.entries(SINGULAR_RANGE_KEYS)) {
            if (typeof userOverrides[key] === 'number' && !Array.isArray(userOverrides[rangeKey])) {
                singularRanges[rangeKey] = [userOverrides[key], userOverrides[key]];
            }
        }
        const config = sanitizeConfig({ ...preset, ...overrides, ...singularRanges });

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
            disableForReducedMotion: config.respectReducedMotion !== false
        };

        // Emoji shapes (highest priority): a user emoji replaces the preset's
        // custom or built-in shapes
        let usedEmojiShapes = false;
        if (config.emoji) {
            const shapes = this.createEmojiShapes(config.emoji, config.size);
            if (shapes && shapes.length > 0) {
                options.shapes = shapes;
                options.flat = true; // Emoji shapes should be flat
                usedEmojiShapes = true;
            }
        }
        // Custom path shapes (second priority). Built-in shapes the user picked
        // (circle, square, star) replace the preset's own custom shapes.
        const userPickedShapes = Array.isArray(userOverrides.shapes) && userOverrides.shapes.length > 0
            && !userOverrides.customShapes;
        if (!usedEmojiShapes && !userPickedShapes && config.customShapes && Array.isArray(config.customShapes) && config.customShapes.length > 0) {
            const pathShapes = config.customShapes
                .map(name => getPathShape(name))
                .filter(s => s !== null);
            if (pathShapes.length > 0) {
                options.shapes = pathShapes;
            }
        }
        // Explicit built-in shapes (circle, square, star)
        if (!usedEmojiShapes && !options.shapes && config.shapes && Array.isArray(config.shapes)) {
            options.shapes = config.shapes;
        }

        // Handle colors (only when emoji shapes were not applied)
        if (!usedEmojiShapes) {
            // Only valid hex reaches canvas-confetti: fall back to the preset's
            // colours, then to the library defaults, when none are left
            // In the light theme, presets drawn in white use their light
            // palette, unless the note sets its own colours
            const lightColors = !userOverrides.colors && isLightTheme() ? getLightThemeColors(presetName) : null;
            let colors = sanitizeHexColors(lightColors || config.colors);
            if (colors.length === 0) {
                colors = sanitizeHexColors(preset.colors);
            }
            if (colors.length > 0) {
                options.colors = colors;
            }
        }

        // Handle flat/tumble option (default is tumble/false)
        if (config.flat === true) {
            options.flat = true;
        }

        return { options, config };
    }

    // Start an effect for effectId (a leaf id, or PREVIEW_EFFECT_ID) inside
    // containerEl, replacing any effect already running under that id.
    start(effectId, containerEl, presetName, overrides = {}, opts = {}) {
        const { isPreview = false, filePath = null } = (opts && typeof opts === 'object') ? opts : {};

        this.stop(effectId, 0);
        if (!containerEl) return null;

        const result = this.buildOptions(presetName, overrides);
        if (!result) return null;

        const effect = new ConfettiEffect(this, effectId, containerEl, {
            presetName,
            overrides,
            options: result.options,
            config: result.config,
            isPreview,
            filePath
        });
        this.effects.set(effectId, effect);
        effect.start();
        return effect;
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

                applyRanges(options, config);
                pickBurstEmoji(options, config);

                // For low particle counts per burst, randomly pick one color for variety
                if (options.colors && options.colors.length > 1 && particlesPerBurst <= 3) {
                    const randomColor = options.colors[Math.floor(Math.random() * options.colors.length)];
                    options.colors = [randomColor];
                }

                try {
                    confettiInstance(options);
                } catch (error) {
                    console.error('Pixel Banner: Error firing confetti burst:', error);
                }
            }
        } else if (originSpread === 'random') {
            // Single burst but randomize position on the edge
            const options = { ...baseOptions };

            // Get random position with optional Y offset
            const baseOrigin = this.getRandomEdgePosition(config.position);
            const yOffset = config.startY || 0;
            options.origin = { x: baseOrigin.x, y: baseOrigin.y + yOffset };

            applyRanges(options, config);
            pickBurstEmoji(options, config);

            // For low particle counts, randomly pick one color to ensure variety across bursts
            if (options.colors && options.colors.length > 1 && config.count <= 3) {
                const randomColor = options.colors[Math.floor(Math.random() * options.colors.length)];
                options.colors = [randomColor];
            }

            try {
                confettiInstance(options);
            } catch (error) {
                console.error('Pixel Banner: Error firing confetti burst:', error);
            }
        } else {
            // Fixed position (original behavior)
            const options = { ...baseOptions };

            // If position is 'random', set new random origin for each burst
            if (config.position === 'random') {
                options.origin = { x: Math.random(), y: Math.random() };
            }

            applyRanges(options, config);
            pickBurstEmoji(options, config);

            try {
                confettiInstance(options);
            } catch (error) {
                console.error('Pixel Banner: Error firing confetti burst:', error);
            }
        }
    }

    // Stop one effect, fading it out over fadeOutDuration ms
    stop(effectId, fadeOutDuration = 500) {
        const effect = this.effects.get(effectId);
        if (!effect) return;
        this.effects.delete(effectId);
        if (fadeOutDuration > 0) {
            this.fadingEffects.add(effect);
        }
        effect.stop(fadeOutDuration);
    }

    // Stop all active effects
    stopAll(immediate = false) {
        for (const effectId of Array.from(this.effects.keys())) {
            this.stop(effectId, immediate ? 0 : 500);
        }
        if (immediate) {
            for (const effect of Array.from(this.fadingEffects)) {
                effect.dispose();
            }
        }
    }

    pause(effectId) {
        const effect = this.effects.get(effectId);
        if (effect) effect.pause();
    }

    resume(effectId) {
        const effect = this.effects.get(effectId);
        if (effect) effect.resume();
    }

    // Check if an effect id has a running effect
    hasActiveEffect(effectId) {
        return this.effects.has(effectId);
    }

    getEffect(effectId) {
        return this.effects.get(effectId) || null;
    }

    // Ids of note effects (the modal preview excluded)
    getNoteEffectIds() {
        return Array.from(this.effects.values())
            .filter(effect => !effect.isPreview)
            .map(effect => effect.id);
    }

    // Re-resolve each effect's watched element (after layout or mode changes)
    refreshVisibility() {
        for (const effect of this.effects.values()) {
            effect.refreshVisibilityTarget();
        }
    }

    // Restart an effect only when its config or container really changed
    update(effectId, containerEl, presetName, overrides = {}, opts = {}) {
        const effect = this.effects.get(effectId);
        if (effect && effect.containerEl === containerEl && effect.matches(presetName, overrides)) {
            if (opts && typeof opts === 'object' && opts.filePath) {
                effect.filePath = opts.filePath;
            }
            // The banner may have rendered since the effect started (a new
            // split): watch it from now on so scrolling it away pauses
            effect.refreshVisibilityTarget();
            return effect;
        }
        return this.start(effectId, containerEl, presetName, overrides, opts);
    }
}

// Export singleton instance
export const confettiManager = new ConfettiManager();

// Also export the classes for testing purposes
export { ConfettiManager, ConfettiEffect };
