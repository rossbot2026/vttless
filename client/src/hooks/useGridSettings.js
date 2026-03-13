import { useCallback } from 'react';

/**
 * useGridSettings Hook
 * Handles grid-related utility functions and calculations
 * Provides helpers for grid snapping, drawing, and configuration
 */
export const useGridSettings = () => {
    /**
     * Snap a position value to the grid
     */
    const snapToGrid = useCallback((coord, gridSize) => {
        return Math.round(coord / gridSize) * gridSize;
    }, []);

    /**
     * Snap a size value to the grid (minimum 1 grid square)
     */
    const snapSizeToGrid = useCallback((size, gridSize) => {
        return Math.max(gridSize, Math.round(size / gridSize) * gridSize);
    }, []);

    /**
     * Check if a position is within a token's bounds
     */
    const isPositionInToken = useCallback((x, y, token, scale = 1) => {
        return (
            x >= token.x &&
            x <= token.x + token.width * scale &&
            y >= token.y &&
            y <= token.y + token.height * scale
        );
    }, []);

    /**
     * Find the first token at a given position
     */
    const findTokenAtPosition = useCallback((x, y, tokens, scale = 1) => {
        return tokens.find(token => isPositionInToken(x, y, token, scale));
    }, [isPositionInToken]);

    return {
        snapToGrid,
        snapSizeToGrid,
        isPositionInToken,
        findTokenAtPosition
    };
};
