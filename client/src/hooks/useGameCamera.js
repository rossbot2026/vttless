import { useCallback, useEffect } from 'react';

/**
 * useGameCamera Hook
 * Handles zoom, pan, and camera/viewport transformations
 * Provides screen-to-world coordinate conversion and zoom controls
 */
export const useGameCamera = (viewport, setViewport, canvasRef) => {
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
        
        setViewport(prev => {
            const newZoom = Math.max(prev.minZoom, Math.min(prev.maxZoom, prev.zoom * zoomDelta));
            
            // Only update if zoom actually changed
            if (newZoom === prev.zoom) return prev;
            
            // Calculate new offset to zoom towards mouse position
            const zoomRatio = newZoom / prev.zoom;
            const newOffsetX = mouseX - (mouseX - prev.offsetX) * zoomRatio;
            const newOffsetY = mouseY - (mouseY - prev.offsetY) * zoomRatio;
            
            return {
                ...prev,
                zoom: newZoom,
                offsetX: newOffsetX,
                offsetY: newOffsetY
            };
        });
    }, [setViewport, canvasRef]);

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
        setViewport({
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
            minZoom: 0.25,
            maxZoom: 4
        });
    }, [setViewport]);

    /**
     * Zoom in
     */
    const zoomIn = useCallback(() => {
        setViewport(prev => ({
            ...prev,
            zoom: Math.min(prev.maxZoom, prev.zoom * 1.25)
        }));
    }, [setViewport]);

    /**
     * Zoom out
     */
    const zoomOut = useCallback(() => {
        setViewport(prev => ({
            ...prev,
            zoom: Math.max(prev.minZoom, prev.zoom * 0.8)
        }));
    }, [setViewport]);

    return {
        screenToWorld,
        resetCamera,
        zoomIn,
        zoomOut,
        handleWheel
    };
};
