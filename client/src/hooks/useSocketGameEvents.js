import { useEffect, useState } from 'react';
import { socket } from '../socket';

/**
 * useSocketGameEvents Hook
 * Sets up and manages all socket.io event listeners for the game
 * Handles real-time updates for tokens, backgrounds, and connections
 */
export const useSocketGameEvents = (
    campaignId,
    userId,
    onTokenMove,
    onTokenUpdate,
    onBackgroundUpdate,
    onBackgroundMove,
    onConnect,
    onDisconnect
) => {
    const [isConnected, setIsConnected] = useState(socket.connected);

    useEffect(() => {
        const handleConnect = () => {
            setIsConnected(true);
            onConnect?.();
        };
        const handleDisconnect = () => {
            setIsConnected(false);
            onDisconnect?.();
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        
        // Connect the socket
        socket.connect();

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.disconnect();
        };
    }, [onConnect, onDisconnect]);

    // Campaign-specific event listeners
    useEffect(() => {
        socket.emit('joinCampaign', campaignId);

        const handleTokenMove = (data) => {
            if (data.playerId !== userId) {
                onTokenMove?.(data);
            }
        };

        const handleTokenUpdate = (data) => {
            if (data.playerId !== userId) {
                onTokenUpdate?.(data);
            }
        };

        const handleBackgroundUpdate = (data) => {
            if (data.playerId !== userId) {
                onBackgroundUpdate?.(data);
            }
        };

        const handleBackgroundMove = (data) => {
            if (data.playerId !== userId) {
                onBackgroundMove?.(data);
            }
        };

        socket.on('tokenMove', handleTokenMove);
        socket.on('tokenUpdate', handleTokenUpdate);
        socket.on('backgroundUpdate', handleBackgroundUpdate);
        socket.on('backgroundMove', handleBackgroundMove);

        return () => {
            socket.emit('leaveCampaign', campaignId);
            socket.off('tokenMove', handleTokenMove);
            socket.off('tokenUpdate', handleTokenUpdate);
            socket.off('backgroundUpdate', handleBackgroundUpdate);
            socket.off('backgroundMove', handleBackgroundMove);
        };
    }, [campaignId, userId, onTokenMove, onTokenUpdate, onBackgroundUpdate, onBackgroundMove]);

    return { isConnected };
};
