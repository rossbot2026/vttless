import { useState, useCallback } from 'react';

/**
 * useGameState Hook
 * Manages the game state for tokens, background, and viewport
 * Provides centralized state management for canvas-based game logic
 */
export const useGameState = () => {
    const [currentMap, setCurrentMap] = useState(null);
    const [gameState, setGameState] = useState({
        tokens: [],
        selectedToken: null,
        isDragging: false,
        scale: 1,
        gridSize: 40,
        mapDimensions: { width: 800, height: 600 }
    });
    const [viewport, setViewport] = useState({
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        minZoom: 0.25,
        maxZoom: 4
    });
    const [background, setBackground] = useState({
        image: null,
        x: 0,
        y: 0,
        isDragging: false,
        dragStart: { x: 0, y: 0 },
        startPosition: { x: 0, y: 0 }
    });
    const [dragState, setDragState] = useState({
        isDragOver: false,
        dragType: null // 'token' or 'background'
    });
    const [gridSettings, setGridSettings] = useState({
        gridWidth: 20,
        gridHeight: 20,
        gridSize: 40,
        visible: true,
        color: '#ccc'
    });

    return {
        currentMap,
        setCurrentMap,
        gameState,
        setGameState,
        viewport,
        setViewport,
        background,
        setBackground,
        dragState,
        setDragState,
        gridSettings,
        setGridSettings
    };
};
