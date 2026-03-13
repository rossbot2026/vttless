import { useState, useCallback } from 'react';

/**
 * useTokenDragResize Hook
 * Handles token drag, resize, and selection logic
 * Manages state for dragging tokens and resizing them with handles
 */
export const useTokenDragResize = () => {
    const [editingToken, setEditingToken] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeState, setResizeState] = useState({
        isResizing: false,
        resizeHandle: null, // 'se', 'sw', 'ne', 'nw', 's', 'e', 'n', 'w'
        startSize: { width: 0, height: 0 },
        startPos: { x: 0, y: 0 },
        startMouse: { x: 0, y: 0 }
    });

    const startEditingTokenName = useCallback((tokenOrCharacter) => {
        // Handle both token objects from game state and character objects from sidebar
        if (tokenOrCharacter._id) {
            // This is a character object from the sidebar
            setEditingToken(tokenOrCharacter._id);
            setEditingName(tokenOrCharacter.name || '');
        } else {
            // This is a token object from game state
            setEditingToken(tokenOrCharacter.id);
            setEditingName(tokenOrCharacter.name || '');
        }
    }, []);

    const cancelEditingTokenName = useCallback(() => {
        setEditingToken(null);
        setEditingName('');
    }, []);

    return {
        editingToken,
        setEditingToken,
        editingName,
        setEditingName,
        dragOffset,
        setDragOffset,
        resizeState,
        setResizeState,
        startEditingTokenName,
        cancelEditingTokenName
    };
};
