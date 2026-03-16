import { useCallback, useEffect } from 'react';

/**
 * useGameCamera Hook
 * Handles zoom, pan, and camera/viewport transformations
 * Uses semantic dispatchers (updateZoom, updatePan) instead of setState
 */
export const useGameCamera = (viewport, updateZoom, updatePan, canvasRef) => {
    /**
     * Convert screen coordinates to world coordinates
     */
    const screenToWorld = useCallback((screenX, screenY) => {
        const worldX = (screenX - viewport.offsetX) / viewport.zoom;
        const worldY = (screenY - viewport.offsetY) / viewport.zoom;
        return { x: worldX, y: worldY };
    }, [viewport.offsetX, viewport.offsetY, viewport.zoom]);

    /**
     * Handle mouse wheel for zoom
     */
    const handleWheel = useCallback((e) => {
        e.preventDefault();
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Smaller zoom delta for smoother zoom
        const zoomDelta = e.deltaY > 0 ? 0.95 : 1.05;
        
        const newZoom = Math.max(viewport.minZoom, Math.min(viewport.maxZoom, viewport.zoom * zoomDelta));
        
        // Only update if zoom actually changed
        if (newZoom !== viewport.zoom) {
            updateZoom(newZoom);
            
            // Calculate new offset to zoom towards mouse position
            const zoomRatio = newZoom / viewport.zoom;
            const newOffsetX = mouseX - (mouseX - viewport.offsetX) * zoomRatio;
            const newOffsetY = mouseY - (mouseY - viewport.offsetY) * zoomRatio;
            
            updatePan(newOffsetX, newOffsetY);
        }
    }, [viewport, updateZoom, updatePan, canvasRef]);

    /**
     * Add wheel event listener
     */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            canvas.removeEventListener('wheel', handleWheel);
        };
    }, [handleWheel, canvasRef]);

    /**
     * Reset zoom and pan to default state
     */
    const resetCamera = useCallback(() => {
        updateZoom(1);
        updatePan(0, 0);
    }, [updateZoom, updatePan]);

    /**
     * Zoom in
     */
    const zoomIn = useCallback(() => {
        const newZoom = Math.min(viewport.maxZoom, viewport.zoom * 1.25);
        updateZoom(newZoom);
    }, [viewport.maxZoom, viewport.zoom, updateZoom]);

    /**
     * Zoom out
     */
    const zoomOut = useCallback(() => {
        const newZoom = Math.max(viewport.minZoom, viewport.zoom * 0.8);
        updateZoom(newZoom);
    }, [viewport.minZoom, viewport.zoom, updateZoom]);

    /**
     * Pan camera
     */
    const panCamera = useCallback((deltaX, deltaY) => {
        updatePan(viewport.offsetX + deltaX, viewport.offsetY + deltaY);
    }, [viewport.offsetX, viewport.offsetY, updatePan]);

    return {
        screenToWorld,
        zoomIn,
        zoomOut,
        resetCamera,
        panCamera,
        handleWheel
    };
};
