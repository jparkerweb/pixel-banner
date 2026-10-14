import { describe, it, expect, beforeEach, vi } from 'vitest';
import confetti from 'canvas-confetti';
import {
    SHAPE_PATHS,
    SHAPE_MATRICES,
    getPathShape,
    isCustomPathShape,
    clearShapeCache
} from '@/core/confettiShapes.js';

vi.mock('canvas-confetti', () => ({
    default: {
        shapeFromPath: vi.fn(({ path, matrix }) => ({ type: 'path', path, matrix }))
    }
}));

describe('confettiShapes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        clearShapeCache();
    });

    it('has a precomputed matrix for every path', () => {
        expect(Object.keys(SHAPE_MATRICES).sort()).toEqual(Object.keys(SHAPE_PATHS).sort());
        for (const [name, matrix] of Object.entries(SHAPE_MATRICES)) {
            expect(matrix, name).toHaveLength(6);
            expect(matrix.every(Number.isFinite), name).toBe(true);
            // Uniform scale, no skew, as canvas-confetti computes it
            expect([matrix[1], matrix[2]], name).toEqual([0, 0]);
            expect(matrix[0], name).toBe(matrix[3]);
        }
    });

    // Without a matrix canvas-confetti samples a 1000x1000 grid on the main thread
    it('passes the precomputed matrix to shapeFromPath', () => {
        const shape = getPathShape('heart');

        expect(confetti.shapeFromPath).toHaveBeenCalledWith({
            path: SHAPE_PATHS.heart,
            matrix: SHAPE_MATRICES.heart
        });
        expect(shape).toEqual({ type: 'path', path: SHAPE_PATHS.heart, matrix: SHAPE_MATRICES.heart });
    });

    it('compiles each shape once', () => {
        expect(getPathShape('leaf')).toBe(getPathShape('leaf'));
        expect(confetti.shapeFromPath).toHaveBeenCalledTimes(1);
    });

    it('returns null for unknown names', () => {
        expect(getPathShape('nope')).toBeNull();
        expect(confetti.shapeFromPath).not.toHaveBeenCalled();
    });

    // Regression: an inherited key returned Object.prototype's function, which drew nothing
    it('returns null for inherited object keys', () => {
        for (const name of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) {
            expect(isCustomPathShape(name), name).toBe(false);
            expect(getPathShape(name), name).toBeNull();
        }
        expect(confetti.shapeFromPath).not.toHaveBeenCalled();
    });
});
