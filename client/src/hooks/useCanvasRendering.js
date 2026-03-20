import { useCallback, useEffect, useRef } from 'react';

/**
 * useCanvasRendering Hook
 * Manages canvas rendering logic including grid drawing and animation loop
 * Provides render functions and handles canvas animation frames
 */
export const useCanvasRendering = (canvasRef, gameState, viewport, background, gridSettings) => {
    // Refs to store current values without causing re-renders or loop restarts
    const viewportRef = useRef(viewport);
    const backgroundRef = useRef(background);
    const gridSettingsRef = useRef(gridSettings);
    
    // Update refs whenever they change (but don't trigger animation loop)
    useEffect(() => {
        viewportRef.current = viewport;
    }, [viewport]);
    
    useEffect(() => {
        backgroundRef.current = background;
    }, [background]);
    
    useEffect(() => {
        gridSettingsRef.current = gridSettings;
    }, [gridSettings]);

    /**
     * Draw grid on canvas
     */
    const drawGrid = useCallback((ctx) => {
        // Read from ref to get current values without dependency
        const currentViewport = viewportRef.current;
        const currentGridSettings = gridSettingsRef.current;
        
        // Skip grid drawing if grid is not visible or zoomed out too far
        if (!currentGridSettings.visible || currentViewport.zoom < 0.5) return;
        
        const gridSize = currentGridSettings.gridSize;
        const { width, height } = gameState.mapDimensions;
        
        ctx.strokeStyle = currentGridSettings.color || '#ccc';
        ctx.lineWidth = Math.max(0.5 / currentViewport.zoom, 0.1);

        // Draw vertical lines
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }, [gameState.mapDimensions]);

    /**
     * Main render function for the game canvas
     * Only depends on gameState (which includes tokens and map dimensions)
     * Reads viewport and background from refs to avoid restarting animation loop
     * drawGrid is intentionally not in dependencies because it's called inline
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const renderGame = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const currentViewport = viewportRef.current;
        const currentBackground = backgroundRef.current;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Apply zoom and pan transformation
        ctx.save();
        ctx.translate(currentViewport.offsetX, currentViewport.offsetY);
        ctx.scale(currentViewport.zoom, currentViewport.zoom);
        
        // Draw background if exists
        if (currentBackground.image) {




            ctx.save();
            ctx.globalAlpha = 0.5; // Optional: make grid visible through background
            ctx.drawImage(
                currentBackground.image,
                currentBackground.x,
                currentBackground.y,
                gameState.mapDimensions.width,
                gameState.mapDimensions.height
            );
            ctx.restore();
        } else {
        }
        
        drawGrid(ctx);
        
        // Draw tokens
        gameState.tokens.forEach(token => {
            if (token.image) {
                ctx.drawImage(
                    token.image,
                    token.x,
                    token.y,
                    token.width * gameState.scale,
                    token.height * gameState.scale
                );
            }
        });
        
        // Restore transformation
        ctx.restore();
    }, [gameState, canvasRef]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * Render with selected token UI (name label, resize handles)
     * This is separated so it can be called with additional parameters
     * Reads viewport from ref to avoid triggering animation loop restarts
     */
    const renderSelectedTokenUI = useCallback((selectedToken, userId, resizeState, editingToken, editingName) => {
        const canvas = canvasRef.current;
        if (!canvas || !selectedToken) return;

        const ctx = canvas.getContext('2d');
        const currentViewport = viewportRef.current;
        
        ctx.save();
        ctx.translate(currentViewport.offsetX, currentViewport.offsetY);
        ctx.scale(currentViewport.zoom, currentViewport.zoom);

        // Get the current token data from the tokens array (has updated position)
        const currentToken = gameState.tokens.find(token => token.id === selectedToken.id);
        if (currentToken && !editingToken && !resizeState.isResizing) {
            const tokenName = currentToken.name || 'Unnamed Token';
            
            // Calculate position under the token using current position
            const labelX = currentToken.x + (currentToken.width * gameState.scale) / 2;
            const labelY = currentToken.y + (currentToken.height * gameState.scale) + 20;
        
            // Set up text styling
            ctx.save();
            ctx.font = `${Math.max(12 / currentViewport.zoom, 8)}px Arial`;
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2 / currentViewport.zoom;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            
            // Draw text background
            const textMetrics = ctx.measureText(tokenName);
            const textWidth = textMetrics.width;
            const textHeight = Math.max(12 / currentViewport.zoom, 8);
            const padding = 4 / currentViewport.zoom;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(
                labelX - textWidth / 2 - padding,
                labelY - padding,
                textWidth + padding * 2,
                textHeight + padding * 2
            );
            
            // Draw text with outline for better visibility
            ctx.strokeText(tokenName, labelX, labelY);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(tokenName, labelX, labelY);
            
            ctx.restore();

            // Draw resize handles if user owns the token
            const tokenOwnerId = currentToken?.ownerId?._id || currentToken?.ownerId;
            if (tokenOwnerId === userId) {
                ctx.save();
                const handleSize = 8 / currentViewport.zoom;
                const tokenRight = currentToken.x + currentToken.width * gameState.scale;
                const tokenBottom = currentToken.y + currentToken.height * gameState.scale;
                const tokenCenterX = currentToken.x + (currentToken.width * gameState.scale) / 2;
                const tokenCenterY = currentToken.y + (currentToken.height * gameState.scale) / 2;

                // Draw resize handles
                ctx.fillStyle = '#4299E1'; // Blue color
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 1 / currentViewport.zoom;

                // Corner handles
                const corners = [
                    { x: currentToken.x, y: currentToken.y }, // nw
                    { x: tokenRight, y: currentToken.y }, // ne
                    { x: currentToken.x, y: tokenBottom }, // sw
                    { x: tokenRight, y: tokenBottom } // se
                ];

                // Edge handles
                const edges = [
                    { x: tokenCenterX, y: currentToken.y }, // n
                    { x: tokenRight, y: tokenCenterY }, // e
                    { x: tokenCenterX, y: tokenBottom }, // s
                    { x: currentToken.x, y: tokenCenterY } // w  
                ];

                // Draw all handles
                [...corners, ...edges].forEach(handle => {
                    ctx.fillRect(
                        handle.x - handleSize/2,
                        handle.y - handleSize/2,
                        handleSize,
                        handleSize
                    );
                    ctx.strokeRect(
                        handle.x - handleSize/2,
                        handle.y - handleSize/2,
                        handleSize,
                        handleSize
                    );
                });

                ctx.restore();
            }
        }
        
        ctx.restore();
    }, [canvasRef, gameState]);

    // Animation loop - only depends on gameState (which includes background)
    // This ensures the RAF loop stays continuous even when viewport changes
    // renderGame is intentionally excluded to prevent animation loop restarts on viewport changes
    useEffect(() => {
        let animationId;
        
        const animate = () => {
            renderGame();
            animationId = requestAnimationFrame(animate);
        };
        
        animationId = requestAnimationFrame(animate);
        
        return () => {
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
        };
    }, [gameState]); // eslint-disable-line react-hooks/exhaustive-deps

    return { renderGame, renderSelectedTokenUI, drawGrid };
};
