import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { throttle, debounce } from 'lodash';
import {
    Box,
    useToast,
    Drawer,
    DrawerBody,
    DrawerHeader,
    DrawerOverlay,
    DrawerContent,
    DrawerCloseButton,
    VStack,
    HStack,
    Button,
    Text,
    Card,
    CardBody,
    IconButton,
    useDisclosure,
    Input
} from '@chakra-ui/react';
import { HiMenu } from 'react-icons/hi';
import { IoArrowBack } from 'react-icons/io5';
import { socket } from '../socket';
import './Play.css';
import { api } from '../common/axiosPrivate.js';
import VideoChat from './VideoChat';
import CharacterImageUpdate from './CharacterImageUpdate';
import TokenNameEditModal from './TokenNameEditModal';
import GridSettingsPanel from './GridSettingsPanel';
import CharacterSidebar from './CharacterSidebar';

// Import custom hooks
import { useGameState } from '../contexts/GameStateContext';
import { useTokenDragResize } from '../hooks/useTokenDragResize';
import { useGridSettings } from '../hooks/useGridSettings';
import { useSocketGameEvents } from '../hooks/useSocketGameEvents';
import { useCanvasRendering } from '../hooks/useCanvasRendering';
import { useGameCamera } from '../hooks/useGameCamera';
import { useAssetUpload } from '../hooks/useAssetUpload';

/**
 * Play Component
 * Main game board interface for VTTless
 * Handles canvas rendering, token management, and real-time multiplayer updates
 * Refactored to use custom hooks and separated modal components
 */
const Play = () => {
    const { campaignId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const canvasRef = useRef(null);
    const { isOpen, onOpen, onClose } = useDisclosure();

    // Custom hooks for game state management
    const gameStateHook = useGameState();
    const dragResizeHook = useTokenDragResize();
    const gridSettingsHook = useGridSettings();
    const assetUploadHook = useAssetUpload();

    // Destructure game state and actions from context
    const {
        state,
        dispatch,
        selectToken,
        updateToken,
        moveToken,
        resizeToken,
        bulkUpdateTokens,
        setBackground,
        updateBackgroundPosition,
        setBackgroundDragging,
        updateZoom,
        updatePan,
        updateGrid,
        setDragState,
        resetGameState
    } = gameStateHook;

    // Extract state values for cleaner access
    const gameState = state;
    const viewport = state.viewport;
    const background = state.background;
    const dragState = state.ui.dragState;
    const gridSettings = state.grid;

    // For backward compatibility, provide setters that dispatch actions
    const setGameState = (updates) => {
        if (typeof updates === 'function') {
            const newState = updates(state);
            gameStateHook.setGameState(newState);
        } else {
            gameStateHook.setGameState(updates);
        }
    };

    const setViewport = (updates) => {
        if (typeof updates === 'function') {
            const newViewport = updates(viewport);
            gameStateHook.setViewport(newViewport);
        } else {
            gameStateHook.setViewport(updates);
        }
    };

    const setGridSettings = (updates) => {
        if (typeof updates === 'function') {
            const newGridSettings = updates(gridSettings);
            updateGrid(newGridSettings);
        } else {
            updateGrid(updates);
        }
    };

    // For local component state that doesn't go in global context
    const [currentMap, setCurrentMap] = useState(null);

    const {
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
    } = dragResizeHook;

    const {
        snapToGrid,
        snapSizeToGrid,
        findTokenAtPosition
    } = gridSettingsHook;

    // Initialize camera hook with viewport dispatch functions
    const cameraHook = useGameCamera(viewport, setViewport, canvasRef);
    const {
        screenToWorld,
        resetCamera,
        zoomIn,
        zoomOut
    } = cameraHook;

    const {
        uploadAsset,
        loadAssetUrl
    } = assetUploadHook;

    // Canvas rendering hook
    const canvasRenderingHook = useCanvasRendering(canvasRef, gameState, viewport, background, gridSettings);
    const { renderGame, renderSelectedTokenUI } = canvasRenderingHook;

    // Component-level state
    const [campaign, setCampaign] = useState(null);
    const [campaignMaps, setCampaignMaps] = useState([]);
    const [isCreatingMap, setIsCreatingMap] = useState(false);
    const [newMapName, setNewMapName] = useState('');
    const [isMapSectionCollapsed, setIsMapSectionCollapsed] = useState(false);
    const [isCharacterSectionCollapsed, setIsCharacterSectionCollapsed] = useState(false);
    const [isGridSectionCollapsed, setIsGridSectionCollapsed] = useState(false);
    const [campaignCharacters, setCampaignCharacters] = useState([]);
    const [campaignAssets, setCampaignAssets] = useState([]);
    const [characterImageModal, setCharacterImageModal] = useState({
        isOpen: false,
        character: null
    });
    const [performanceState, setPerformanceState] = useState({
        isHeavyInteraction: false,
        interactionType: null
    });

    // Performance-optimized socket emissions
    const throttledTokenMove = useMemo(
        () => throttle((moveData) => {
            socket.emit('tokenMove', moveData);
        }, 50),
        [campaignId]
    );

    const debouncedTokenMoveEnd = useMemo(
        () => debounce((moveData) => {
            socket.emit('tokenMoveEnd', moveData);
        }, 100),
        [campaignId]
    );

    const throttledBackgroundUpdate = useMemo(
        () => throttle((updateData) => {
            socket.emit('backgroundUpdate', updateData);
        }, 100),
        [campaignId]
    );

    // Performance monitoring helpers
    const markInteractionStart = useCallback((type) => {
        setPerformanceState({
            isHeavyInteraction: true,
            interactionType: type
        });
    }, []);

    const markInteractionEnd = useCallback(() => {
        setPerformanceState({
            isHeavyInteraction: false,
            interactionType: null
        });
    }, []);

    // Check if current user is GM
    const isGM = campaign?.gm?._id === user.user.id || campaign?.gm === user.user.id;

    // Get user's characters from tokens
    const userCharacters = gameState.tokens.filter(token => {
        const tokenOwnerId = token.ownerId?._id || token.ownerId;
        return tokenOwnerId === user.user.id;
    });

    // ====== INITIALIZATION & DATA LOADING ======

    // Load campaign and map data
    useEffect(() => {
        const loadCampaignData = async () => {
            try {
                const response = await api.get(`/campaigns/${campaignId}`);
                setCampaign(response.data);
                
                if (response.data.activeMap) {
                    try {
                        const mapId = response.data.activeMap._id || response.data.activeMap;
                        const mapResponse = await api.get(`/maps/${mapId}`);
                        setCurrentMap(mapResponse.data);
                        await initializeGameState(mapResponse.data);
                    } catch (mapError) {
                        console.error('Error loading map:', mapError);
                        toast({
                            title: "Error loading map",
                            description: `Failed to load map: ${mapError.response?.data?.message || mapError.message}`,
                            status: "error"
                        });
                    }
                }
            } catch (error) {
                console.error('Error loading campaign:', error);
                toast({
                    title: "Error loading campaign",
                    description: `Failed to load campaign: ${error.response?.data?.message || error.message}`,
                    status: "error"
                });
            }
        };

        loadCampaignData();
    }, [campaignId]);

    const initializeGameState = async (mapData) => {
        // Load background image
        if (mapData.backgroundImage?.assetId) {
            try {
                console.log('🖼️ [initializeGameState] Loading background, assetId:', mapData.backgroundImage.assetId);
                const imageUrl = await loadAssetUrl(mapData.backgroundImage.assetId);
                console.log('🖼️ [initializeGameState] Got imageUrl:', imageUrl);
                const img = new Image();
                img.onload = () => {
                    console.log('🖼️ [initializeGameState] Image loaded, dimensions:', img.width, 'x', img.height);
                    console.log('🖼️ [initializeGameState] Background position:', mapData.backgroundImage.position);
                    // CRITICAL FIX: setBackground expects (imageUrl, position, scale, image) not an object!
                    setBackground(imageUrl, mapData.backgroundImage.position, 1, img);
                    console.log('🖼️ [initializeGameState] Called setBackground with correct signature');
                };
                img.onerror = () => {
                    console.error('🖼️ [initializeGameState] Image failed to load from:', imageUrl);
                };
                img.src = imageUrl;
            } catch (error) {
                console.error('Error loading background image:', error);
            }
        } else {
            console.log('🖼️ [initializeGameState] No background image in mapData');
        }

        // Load legacy tokens
        const loadedLegacyTokens = await Promise.all((mapData.tokens || []).map(async token => {
            try {
                const imageUrl = await loadAssetUrl(token.assetId);
                const img = new Image();
                await new Promise(resolve => {
                    img.onload = resolve;
                    img.src = imageUrl;
                });
                return { ...token, image: img };
            } catch (error) {
                return token;
            }
        }));

        // Load character instances
        const loadedCharacterInstances = await Promise.all((mapData.characterInstances || []).map(async instance => {
            try {
                const character = instance.characterId;
                const assetId = character.assetId?._id || character.assetId;
                
                if (!assetId) {
                    console.error('No assetId found for character:', character);
                    return null;
                }
                
                const imageUrl = await loadAssetUrl(assetId);
                const img = new Image();
                await new Promise(resolve => {
                    img.onload = resolve;
                    img.src = imageUrl;
                });
                
                return {
                    id: `char_${character._id}`,
                    assetId: assetId,
                    x: instance.x,
                    y: instance.y,
                    width: instance.width,
                    height: instance.height,
                    ownerId: character.ownerId,
                    name: character.name,
                    image: img,
                    characterId: character._id,
                    isCharacterInstance: true
                };
            } catch (error) {
                console.error('Error loading character instance:', error);
                return null;
            }
        }));

        const validCharacterInstances = loadedCharacterInstances.filter(instance => instance !== null);
        const allTokens = [...loadedLegacyTokens, ...validCharacterInstances];

        // Update grid settings from map data
        dispatch({
            type: 'UPDATE_GRID',
            payload: {
                gridWidth: mapData.gridWidth || 20,
                gridHeight: mapData.gridHeight || 20,
                gridSize: mapData.gridSettings?.size || 40,
                visible: mapData.gridSettings?.visible !== false,
                color: mapData.gridSettings?.color || '#ccc'
            }
        });

        // Bulk update tokens using the proper dispatcher
        bulkUpdateTokens(allTokens);
    };

    // Load campaign maps when campaign is loaded and user is GM
    useEffect(() => {
        if (campaign && isGM) {
            loadCampaignMaps();
        }
    }, [campaign, isGM]);

    // Load campaign characters
    useEffect(() => {
        if (campaign && user.user.id) {
            loadCampaignCharacters();
            loadCampaignAssets();
        }
    }, [campaign, user.user.id]);

    // Listen for character imports from D&D Beyond extension
    useEffect(() => {
        const handleCharacterImport = (event) => {
            console.log('🎯 Character import detected from extension:', event.detail);
            if (campaign && user.user.id) {
                loadCampaignCharacters();
                loadCampaignAssets();
            }
        };

        window.addEventListener('vttless:character-imported', handleCharacterImport);
        return () => {
            window.removeEventListener('vttless:character-imported', handleCharacterImport);
        };
    }, [campaign, user.user.id]);

    // Cleanup throttled functions on unmount
    useEffect(() => {
        return () => {
            throttledTokenMove.cancel();
            debouncedTokenMoveEnd.cancel();
            throttledBackgroundUpdate.cancel();
        };
    }, [throttledTokenMove, debouncedTokenMoveEnd, throttledBackgroundUpdate]);

    // FIX: Ensure dragging stops even if mouse leaves the window
    // Handle window-level mouseup to catch cases where user drags outside canvas
    useEffect(() => {
        const handleWindowMouseUp = () => {
            if (gameState.isDragging || background.isDragging) {
                console.log('🖼️ [Window mouseup] Ending drag - isDragging:', gameState.isDragging, ', background.isDragging:', background.isDragging);
                handleMouseUp();
            }
        };

        window.addEventListener('mouseup', handleWindowMouseUp);
        return () => {
            window.removeEventListener('mouseup', handleWindowMouseUp);
        };
    }, [gameState.isDragging, background.isDragging, handleMouseUp]);

    // ====== SOCKET.IO EVENT HANDLERS ======

    const handleTokenMove = useCallback((data) => {
        moveToken(data.tokenId, data.x, data.y);
    }, [moveToken]);

    const handleTokenUpdate = useCallback((data) => {
        const updates = {
            x: data.x,
            y: data.y
        };
        if (data.width !== undefined) updates.width = data.width;
        if (data.height !== undefined) updates.height = data.height;
        updateToken(data.tokenId, updates);
    }, [updateToken]);

    const handleBackgroundUpdate = useCallback(async (data) => {
        if (data.backgroundImage?.assetId) {
            try {
                console.log('🎨 [handleBackgroundUpdate] Received background update, assetId:', data.backgroundImage.assetId);
                const imageUrl = await loadAssetUrl(data.backgroundImage.assetId);
                console.log('🎨 [handleBackgroundUpdate] Got imageUrl:', imageUrl);
                const img = new Image();
                img.onload = () => {
                    console.log('🎨 [handleBackgroundUpdate] Image loaded, dimensions:', img.width, 'x', img.height);
                    console.log('🎨 [handleBackgroundUpdate] Setting background with position:', data.backgroundImage.position);
                    setBackground(imageUrl, data.backgroundImage.position, 1, img);
                    console.log('🎨 [handleBackgroundUpdate] Background set successfully');
                };
                img.onerror = () => {
                    console.error('🎨 [handleBackgroundUpdate] Image failed to load from:', imageUrl);
                };
                img.src = imageUrl;
            } catch (error) {
                console.error('Error loading background image:', error);
            }
        } else if (data.position) {
            console.log('🎨 [handleBackgroundUpdate] Updating background position only:', data.position);
            updateBackgroundPosition(data.position.x, data.position.y);
        }
    }, [loadAssetUrl, setBackground, updateBackgroundPosition]);

    const handleBackgroundMove = useCallback((data) => {
        updateBackgroundPosition(data.x, data.y);
    }, [updateBackgroundPosition]);

    // Setup socket.io events
    useSocketGameEvents(
        campaignId,
        user.user.id,
        handleTokenMove,
        handleTokenUpdate,
        handleBackgroundUpdate,
        handleBackgroundMove
    );

    // ====== DRAG & DROP HANDLERS ======

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const isNearCenter = Math.abs(mouseX - centerX) < 150 && Math.abs(mouseY - centerY) < 150;
        const dragType = isNearCenter ? 'token' : (isGM ? 'background' : 'token');
        
        setDragState({
            isDragOver: true,
            isDragging: false,
            dragType: dragType
        });
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragState({ isDragOver: false, dragType: null, isDragging: false });
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        setDragState({ isDragOver: false, dragType: null, isDragging: false });

        const file = e.dataTransfer.files[0];
        if (!file || !file.type.startsWith('image/')) {
            toast({
                title: "Invalid file type",
                description: "Please drop an image file (PNG, JPG, etc.)",
                status: "error"
            });
            return;
        }

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const isNearCenter = Math.abs(mouseX - centerX) < 150 && Math.abs(mouseY - centerY) < 150;
        const shouldUploadAsBackground = !isNearCenter && isGM;
        
        try {
            if (shouldUploadAsBackground) {
                await handleBackgroundUpload(file);
            } else {
                await handleTokenUpload(file, mouseX, mouseY);
            }
        } catch (error) {
            toast({
                title: "Upload failed",
                description: error.message,
                status: "error"
            });
        }
    };

    const handleBackgroundUpload = async (file) => {
        if (!currentMap?._id) {
            throw new Error('No active map found. Please ensure a map is loaded before uploading backgrounds.');
        }
        
        const uploadToastId = toast({
            title: "Uploading background...",
            description: "Analyzing grid and uploading image",
            status: "info",
            duration: null,
            isClosable: false
        });

        let analysisResult = null;
        
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            const analysisResponse = await api.post('/maps/analyze', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            
            analysisResult = analysisResponse.data;
        } catch (analysisError) {
            console.log('Analysis failed, continuing with upload:', analysisError);
        }
        
        const assetId = await uploadAsset(file, 'background', campaignId);
        const imageUrl = await loadAssetUrl(assetId);
        
        const mapUpdate = {
            backgroundImage: {
                assetId: assetId,
                position: { x: 0, y: 0 }
            }
        };

        if (analysisResult?.success && analysisResult.confidence > 0.5) {
            const shouldUpdateGrid = window.confirm(
                `Grid analysis detected a ${analysisResult.suggestions.gridWidth}×${analysisResult.suggestions.gridHeight} grid with ${analysisResult.suggestions.gridSize}px squares (${Math.round(analysisResult.confidence * 100)}% confidence).\n\nWould you like to update the map's grid settings to match?`
            );
            
            if (shouldUpdateGrid) {
                mapUpdate.gridWidth = analysisResult.suggestions.gridWidth;
                mapUpdate.gridHeight = analysisResult.suggestions.gridHeight;
                mapUpdate.gridSettings = {
                    ...currentMap.gridSettings,
                    size: analysisResult.suggestions.gridSize
                };
            }
        }
        
        await api.patch(`/maps/${currentMap._id}`, mapUpdate);

        if (mapUpdate.gridWidth || mapUpdate.gridHeight || mapUpdate.gridSettings) {
            const updatedMap = {
                ...currentMap,
                ...mapUpdate
            };
            setCurrentMap(updatedMap);

            if (mapUpdate.gridWidth || mapUpdate.gridHeight || mapUpdate.gridSettings) {
                const newGridSettings = {
                    width: mapUpdate.gridWidth || currentMap.gridWidth,
                    height: mapUpdate.gridHeight || currentMap.gridHeight,
                    size: mapUpdate.gridSettings?.size || currentMap.gridSettings?.size || gridSettings.size,
                    visible: mapUpdate.gridSettings?.visible !== undefined ? mapUpdate.gridSettings.visible : gridSettings.visible,
                    color: mapUpdate.gridSettings?.color || gridSettings.color
                };
                
                updateGrid(newGridSettings);
            }
        }

        const img = new Image();
        img.onload = () => {
            setBackground(imageUrl, { x: 0, y: 0 }, 1, img);
        };
        img.src = imageUrl;

        if (currentMap?._id) {
            socket.emit('backgroundUpdate', {
                campaignId,
                mapId: currentMap._id,
                backgroundImage: {
                    assetId: assetId,
                    position: { x: 0, y: 0 }
                }
            });
        }
        
        toast.close(uploadToastId);
        
        const successMessage = analysisResult?.success && mapUpdate.gridWidth 
            ? `Background updated with grid settings (${mapUpdate.gridWidth}×${mapUpdate.gridHeight})`
            : "Background updated successfully";
            
        toast({
            title: "Background updated",
            description: successMessage,
            status: "success",
            duration: 4000
        });
    };

    const handleTokenUpload = async (file, dropX, dropY) => {
        if (!currentMap?._id) {
            throw new Error('No active map found. Please ensure a map is loaded before uploading tokens.');
        }
        
        const assetId = await uploadAsset(file, 'token', campaignId);
        
        const worldPos = screenToWorld(dropX, dropY);
        const x = snapToGrid(worldPos.x, gridSettings.gridSize);
        const y = snapToGrid(worldPos.y, gridSettings.gridSize);
        
        const characterName = file.name.replace(/\.[^/.]+$/, '');
        
        try {
            const characterResponse = await api.post(`/campaigns/${campaignId}/characters`, {
                name: characterName,
                assetId,
                level: 1,
                hitPoints: 10,
                maxHitPoints: 10,
                armorClass: 10,
                defaultSize: {
                    width: gridSettings.gridSize,
                    height: gridSettings.gridSize
                }
            });
            
            const newCharacter = characterResponse.data;
            
            await api.post(`/characters/${newCharacter._id}/place/${currentMap._id}`, {
                x,
                y,
                width: gridSettings.gridSize,
                height: gridSettings.gridSize
            });
            
            const [mapResponse] = await Promise.all([
                api.get(`/maps/${currentMap._id}`),
                loadCampaignCharacters()
            ]);
            
            setCurrentMap(mapResponse.data);
            initializeGameState(mapResponse.data);
            
            socket.emit('characterPlaced', {
                campaignId,
                mapId: currentMap._id,
                characterId: newCharacter._id,
                x,
                y,
                width: gridSettings.gridSize,
                height: gridSettings.gridSize,
                playerId: user.user.id
            });
            
            toast({
                title: "Character created",
                description: `${characterName} has been created and added to the map`,
                status: "success"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to create character",
                status: "error"
            });
        }
    };

    // ====== MOUSE & CANVAS INTERACTION ======

    const isClickOnTokenNameLabel = (worldX, worldY, token) => {
        if (!gameState.selectedToken || gameState.selectedToken !== token.id || gameState.isDragging) {
            return false;
        }
        
        const labelX = token.x + (token.width * gameState.scale) / 2;
        const labelY = token.y + (token.height * gameState.scale) + 20;
        
        const labelWidth = Math.max(100 / viewport.zoom, 80);
        const labelHeight = Math.max(20 / viewport.zoom, 16);
        
        return worldX >= labelX - labelWidth / 2 && 
               worldX <= labelX + labelWidth / 2 && 
               worldY >= labelY && 
               worldY <= labelY + labelHeight;
    };

    const getResizeHandle = (mouseX, mouseY, token) => {
        if (!token) return null;

        const handleSize = 8 / viewport.zoom;
        const tokenRight = token.x + token.width * gameState.scale;
        const tokenBottom = token.y + token.height * gameState.scale;

        // Check corners first
        if (Math.abs(mouseX - tokenRight) <= handleSize && Math.abs(mouseY - tokenBottom) <= handleSize) {
            return 'se';
        }
        if (Math.abs(mouseX - token.x) <= handleSize && Math.abs(mouseY - tokenBottom) <= handleSize) {
            return 'sw';
        }
        if (Math.abs(mouseX - tokenRight) <= handleSize && Math.abs(mouseY - token.y) <= handleSize) {
            return 'ne';
        }
        if (Math.abs(mouseX - token.x) <= handleSize && Math.abs(mouseY - token.y) <= handleSize) {
            return 'nw';
        }

        // Check edges
        if (Math.abs(mouseX - tokenRight) <= handleSize && mouseY >= token.y && mouseY <= tokenBottom) {
            return 'e';
        }
        if (Math.abs(mouseX - token.x) <= handleSize && mouseY >= token.y && mouseY <= tokenBottom) {
            return 'w';
        }
        if (Math.abs(mouseY - tokenBottom) <= handleSize && mouseX >= token.x && mouseX <= tokenRight) {
            return 's';
        }
        if (Math.abs(mouseY - token.y) <= handleSize && mouseX >= token.x && mouseX <= tokenRight) {
            return 'n';
        }

        return null;
    };

    const handleMouseDown = (e) => {
        const { offsetX, offsetY } = e.nativeEvent;
        const worldPos = screenToWorld(offsetX, offsetY);
        const clickedToken = findTokenAtPosition(worldPos.x, worldPos.y, gameState.tokens, gameState.scale);
        
        // Check if clicking on a token name label
        if (gameState.selectedToken) {
            const selectedTokenData = gameState.tokens.find(t => t.id === gameState.selectedToken);
            if (selectedTokenData && isClickOnTokenNameLabel(worldPos.x, worldPos.y, selectedTokenData)) {
                const tokenOwnerId = selectedTokenData?.ownerId?._id || selectedTokenData?.ownerId;
                if (tokenOwnerId === user.user.id) {
                    startEditingTokenName(selectedTokenData);
                    return;
                }
            }

            // Check for resize handles
            const resizeHandle = getResizeHandle(worldPos.x, worldPos.y, selectedTokenData);
            if (resizeHandle && (selectedTokenData?.ownerId?._id || selectedTokenData?.ownerId) === user.user.id) {
                setResizeState({
                    isResizing: true,
                    resizeHandle,
                    startSize: { width: selectedTokenData.width, height: selectedTokenData.height },
                    startPos: { x: selectedTokenData.x, y: selectedTokenData.y },
                    startMouse: { x: worldPos.x, y: worldPos.y }
                });
                markInteractionStart('resize');
                return;
            }
        }
        
        if (clickedToken) {
            const tokenOwnerId = clickedToken?.ownerId?._id || clickedToken?.ownerId;
            const canDragToken = tokenOwnerId === user.user.id;
            
            const isSameToken = gameState.selectedToken && gameState.selectedToken === clickedToken.id;
            
            if (isSameToken && canDragToken) {
                const tokenOffsetX = worldPos.x - clickedToken.x;
                const tokenOffsetY = worldPos.y - clickedToken.y;
                setDragOffset({ x: tokenOffsetX, y: tokenOffsetY });
                
                dispatch({ type: 'SET_DRAG_STATE', payload: { isDragging: true, isResizing: false } });
                markInteractionStart('drag');
            } else if (isSameToken && !canDragToken) {
                selectToken(null);
                dispatch({ type: 'SET_DRAG_STATE', payload: { isDragging: false, isResizing: false } });
            } else {
                if (canDragToken) {
                    const tokenOffsetX = worldPos.x - clickedToken.x;
                    const tokenOffsetY = worldPos.y - clickedToken.y;
                    setDragOffset({ x: tokenOffsetX, y: tokenOffsetY });
                }
                
                setGameState(prev => ({
                    ...prev,
                    selectedToken: clickedToken,
                    isDragging: canDragToken
                }));
            }
        } else {
            if (gameState.selectedToken) {
                selectToken(null);
                dispatch({ type: 'SET_DRAG_STATE', payload: { isDragging: false, isResizing: false } });
            } else if (background.image && isGM) {
                console.log('🖼️ [handleMouseDown] Starting background drag at screen pos:', { offsetX, offsetY });
                console.log('🖼️ [handleMouseDown] Current background position:', { x: background.x, y: background.y });
                setBackgroundDragging(true, { x: offsetX, y: offsetY }, { x: background.x, y: background.y });
                markInteractionStart('background');
            }
        }
    };

    const handleMouseMove = (e) => {
        const { offsetX, offsetY } = e.nativeEvent;
        const worldPos = screenToWorld(offsetX, offsetY);

        if (resizeState.isResizing && gameState.selectedToken) {
            const deltaX = worldPos.x - resizeState.startMouse.x;
            const deltaY = worldPos.y - resizeState.startMouse.y;
            
            let newWidth = resizeState.startSize.width;
            let newHeight = resizeState.startSize.height;
            let newX = resizeState.startPos.x;
            let newY = resizeState.startPos.y;

            switch (resizeState.resizeHandle) {
                case 'se':
                    newWidth = snapSizeToGrid(resizeState.startSize.width + deltaX / gameState.scale, gridSettings.gridSize);
                    newHeight = snapSizeToGrid(resizeState.startSize.height + deltaY / gameState.scale, gridSettings.gridSize);
                    break;
                case 'sw':
                    newWidth = snapSizeToGrid(resizeState.startSize.width - deltaX / gameState.scale, gridSettings.gridSize);
                    newHeight = snapSizeToGrid(resizeState.startSize.height + deltaY / gameState.scale, gridSettings.gridSize);
                    newX = resizeState.startPos.x + (resizeState.startSize.width - newWidth);
                    break;
                case 'ne':
                    newWidth = snapSizeToGrid(resizeState.startSize.width + deltaX / gameState.scale, gridSettings.gridSize);
                    newHeight = snapSizeToGrid(resizeState.startSize.height - deltaY / gameState.scale, gridSettings.gridSize);
                    newY = resizeState.startPos.y + (resizeState.startSize.height - newHeight);
                    break;
                case 'nw':
                    newWidth = snapSizeToGrid(resizeState.startSize.width - deltaX / gameState.scale, gridSettings.gridSize);
                    newHeight = snapSizeToGrid(resizeState.startSize.height - deltaY / gameState.scale, gridSettings.gridSize);
                    newX = resizeState.startPos.x + (resizeState.startSize.width - newWidth);
                    newY = resizeState.startPos.y + (resizeState.startSize.height - newHeight);
                    break;
                case 'e':
                    newWidth = snapSizeToGrid(resizeState.startSize.width + deltaX / gameState.scale, gridSettings.gridSize);
                    break;
                case 'w':
                    newWidth = snapSizeToGrid(resizeState.startSize.width - deltaX / gameState.scale, gridSettings.gridSize);
                    newX = resizeState.startPos.x + (resizeState.startSize.width - newWidth);
                    break;
                case 's':
                    newHeight = snapSizeToGrid(resizeState.startSize.height + deltaY / gameState.scale, gridSettings.gridSize);
                    break;
                case 'n':
                    newHeight = snapSizeToGrid(resizeState.startSize.height - deltaY / gameState.scale, gridSettings.gridSize);
                    newY = resizeState.startPos.y + (resizeState.startSize.height - newHeight);
                    break;
                default:
                    break;
            }

            setGameState(prev => ({
                ...prev,
                tokens: prev.tokens.map(token =>
                    token.id === prev.selectedToken
                        ? { ...token, x: newX, y: newY, width: newWidth, height: newHeight }
                        : token
                )
            }));
        } else {
            const canvas = canvasRef.current;
            if (canvas && gameState.selectedToken) {
                const selectedTokenData = gameState.tokens.find(t => t.id === gameState.selectedToken);
                if (selectedTokenData && (selectedTokenData?.ownerId?._id || selectedTokenData?.ownerId) === user.user.id) {
                    const resizeHandle = getResizeHandle(worldPos.x, worldPos.y, selectedTokenData);
                    if (resizeHandle) {
                        const cursors = {
                            'se': 'se-resize', 'nw': 'nw-resize',
                            'sw': 'sw-resize', 'ne': 'ne-resize',
                            's': 's-resize', 'n': 'n-resize',
                            'e': 'e-resize', 'w': 'w-resize'
                        };
                        canvas.style.cursor = cursors[resizeHandle] || 'default';
                    } else {
                        canvas.style.cursor = 'default';
                    }
                } else {
                    canvas.style.cursor = 'default';
                }
            }
        }

        if (gameState.isDragging && gameState.selectedToken) {
            const newX = snapToGrid(worldPos.x - dragOffset.x, gridSettings.gridSize);
            const newY = snapToGrid(worldPos.y - dragOffset.y, gridSettings.gridSize);
            
            setGameState(prev => ({
                ...prev,
                tokens: prev.tokens.map(token =>
                    token.id === prev.selectedToken
                        ? { ...token, x: newX, y: newY }
                        : token
                )
            }));

            throttledTokenMove({
                campaignId: campaignId,
                tokenId: gameState.selectedToken,
                x: newX,
                y: newY,
                playerId: user.user.id
            });
        } else if (background.isDragging) {
            const deltaX = (offsetX - background.dragStart.x) / viewport.zoom;
            const deltaY = (offsetY - background.dragStart.y) / viewport.zoom;
            const newX = background.startPosition.x + deltaX;
            const newY = background.startPosition.y + deltaY;
            
            console.log('🖼️ [handleMouseMove] Dragging background:', { deltaX, deltaY, newX, newY });
            updateBackgroundPosition(newX, newY);

            throttledBackgroundUpdate({
                x: newX,
                y: newY,
                playerId: user.user.id
            });
        }
    };

    const handleMouseUp = async () => {
        if (resizeState.isResizing && gameState.selectedToken && currentMap?._id) {
            try {
                const currentToken = gameState.tokens.find(token => token.id === gameState.selectedToken);
                if (currentToken) {
                    if (currentToken.isCharacterInstance) {
                        await api.patch(`/characters/${currentToken.characterId}/position/${currentMap._id}`, {
                            x: currentToken.x,
                            y: currentToken.y,
                            width: currentToken.width,
                            height: currentToken.height
                        });
                    } else {
                        await api.patch(`/maps/${currentMap._id}/tokens/${gameState.selectedToken}`, {
                            x: currentToken.x,
                            y: currentToken.y,
                            width: currentToken.width,
                            height: currentToken.height
                        });
                    }
                    
                    socket.emit('tokenUpdate', {
                        campaignId: campaignId,
                        tokenId: gameState.selectedToken,
                        x: currentToken.x,
                        y: currentToken.y,
                        width: currentToken.width,
                        height: currentToken.height,
                        playerId: user.user.id
                    });
                }
            } catch (error) {
                toast({
                    title: "Warning",
                    description: "Token size may not be saved",
                    status: "warning"
                });
            }
        }

        if (gameState.isDragging && gameState.selectedToken && currentMap?._id) {
            try {
                const currentToken = gameState.tokens.find(token => token.id === gameState.selectedToken);
                if (currentToken) {
                    console.log('📍 [handleMouseMove] Saving token position:', {
                        tokenId: currentToken.id,
                        characterId: currentToken.characterId,
                        x: currentToken.x,
                        y: currentToken.y,
                        isCharacterInstance: currentToken.isCharacterInstance
                    });
                    if (currentToken.isCharacterInstance) {
                        await api.patch(`/characters/${currentToken.characterId}/position/${currentMap._id}`, {
                            x: currentToken.x,
                            y: currentToken.y
                        });
                    } else {
                        await api.patch(`/maps/${currentMap._id}/tokens/${gameState.selectedToken}`, {
                            x: currentToken.x,
                            y: currentToken.y
                        });
                    }
                }
            } catch (error) {
                toast({
                    title: "Warning",
                    description: "Token position may not be saved",
                    status: "warning"
                });
            }
        }

        if (background.isDragging && currentMap?._id && currentMap.backgroundImage?.assetId) {
            try {
                await api.patch(`/maps/${currentMap._id}`, {
                    backgroundImage: {
                        assetId: currentMap.backgroundImage.assetId,
                        position: { 
                            x: background.x, 
                            y: background.y 
                        }
                    }
                });
            } catch (error) {
                toast({
                    title: "Warning",
                    description: "Background position may not be saved",
                    status: "warning"
                });
            }
        }

        if (gameState.isDragging && gameState.selectedToken) {
            const currentToken = gameState.tokens.find(token => token.id === gameState.selectedToken);
            if (currentToken) {
                debouncedTokenMoveEnd({
                    campaignId: campaignId,
                    tokenId: gameState.selectedToken,
                    x: currentToken.x,
                    y: currentToken.y,
                    playerId: user.user.id
                });
            }
        }

        setGameState(prev => ({
            ...prev,
            isDragging: false
        }));
        console.log('🖼️ [handleMouseUp] Ending background drag');
        setBackgroundDragging(false);
        setResizeState({
            isResizing: false,
            resizeHandle: null,
            startSize: { width: 0, height: 0 },
            startPos: { x: 0, y: 0 },
            startMouse: { x: 0, y: 0 }
        });

        markInteractionEnd();
    };

    // ====== RENDERING ======

    const renderGameWithSelectedTokenUI = useCallback(() => {
        renderGame();
        
        // Render selected token UI separately (name label + resize handles)
        if (gameState.selectedToken) {
            renderSelectedTokenUI(
                gameState.selectedToken,
                user.user.id,
                resizeState,
                editingToken,
                editingName
            );
        }
    }, [renderGame, renderSelectedTokenUI, gameState.selectedToken, user.user.id, resizeState, editingToken, editingName]);

    // Animation loop is handled by useCanvasRendering hook

    // ====== API CALLS ======

    const loadCampaignMaps = async () => {
        if (!isGM || !campaignId) return;
        try {
            const response = await api.get(`/maps/campaign/${campaignId}`);
            setCampaignMaps(response.data);
        } catch (error) {
            toast({
                title: "Error loading maps",
                description: "Failed to load campaign maps",
                status: "error"
            });
        }
    };

    const loadCampaignCharacters = async () => {
        if (!campaignId) return;
        try {
            const response = await api.get(`/campaigns/${campaignId}/characters/user`);
            setCampaignCharacters(response.data);
        } catch (error) {
            toast({
                title: "Error loading characters",  
                description: "Failed to load campaign characters",
                status: "error"
            });
        }
    };

    const loadCampaignAssets = async () => {
        if (!campaignId) return;
        try {
            const response = await api.get(`/assets/campaign/${campaignId}`);
            setCampaignAssets(response.data || []);
        } catch (error) {
            console.error('Error loading campaign assets:', error);
            setCampaignAssets([]);
        }
    };

    const handleBackToMain = () => {
        navigate('/campaigns');
    };

    const handleCharacterImageClick = (character) => {
        setCharacterImageModal({
            isOpen: true,
            character: character
        });
    };

    const handleCharacterImageUpdate = (updatedCharacter) => {
        setCampaignCharacters(prev => 
            prev.map(char => 
                char._id === updatedCharacter._id ? updatedCharacter : char
            )
        );
        
        setCharacterImageModal({
            isOpen: false,
            character: null
        });
    };

    const handleCharacterImageModalClose = () => {
        setCharacterImageModal({
            isOpen: false,
            character: null
        });
    };

    const addCharacterToMap = async (characterId) => {
        if (!currentMap) return;
        
        try {
            const centerX = Math.round((400 / gridSettings.gridSize)) * gridSettings.gridSize;
            const centerY = Math.round((300 / gridSettings.gridSize)) * gridSettings.gridSize;
            
            await api.post(`/characters/${characterId}/place/${currentMap._id}`, {
                x: centerX,
                y: centerY,
                width: gridSettings.gridSize,
                height: gridSettings.gridSize
            });

            const mapResponse = await api.get(`/maps/${currentMap._id}`);
            setCurrentMap(mapResponse.data);
            
            initializeGameState(mapResponse.data);

            toast({
                title: "Character Added",
                description: "Character has been added to the map",
                status: "success"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to add character to map",
                status: "error"
            });
        }
    };

    const removeCharacterFromMap = async (characterId) => {
        if (!currentMap) return;
        
        try {
            await api.delete(`/characters/${characterId}/remove/${currentMap._id}`);

            const mapResponse = await api.get(`/maps/${currentMap._id}`);
            setCurrentMap(mapResponse.data);
            
            initializeGameState(mapResponse.data);

            toast({
                title: "Character Removed",
                description: "Character has been removed from the map",
                status: "success"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to remove character from map",
                status: "error"
            });
        }
    };

    const handleCreateMap = async () => {
        if (!newMapName.trim()) {
            toast({
                title: "Map name required",
                description: "Please enter a name for the new map",
                status: "warning"
            });
            return;
        }

        try {
            const response = await api.post('/maps', {
                name: newMapName,
                campaign: campaignId,
                gridWidth: 20,
                gridHeight: 20,
                gridSize: 40
            });

            toast({
                title: "Map created",
                description: `"${newMapName}" has been created successfully`,
                status: "success"
            });

            setNewMapName('');
            setIsCreatingMap(false);
            await loadCampaignMaps();
        } catch (error) {
            toast({
                title: "Error creating map",
                description: error.response?.data?.message || "Failed to create map",
                status: "error"
            });
        }
    };

    const handleSwitchMap = async (mapId) => {
        try {
            await api.post('/campaigns/update', {
                campaignId: campaignId,
                activeMap: mapId
            });

            const mapResponse = await api.get(`/maps/${mapId}`);
            setCurrentMap(mapResponse.data);
            
            setCampaign(prev => ({
                ...prev,
                activeMap: mapId
            }));
            
            await initializeGameState(mapResponse.data);

            toast({
                title: "Map switched successfully",
                description: `Switched to map: ${mapResponse.data.name}`,
                status: "success"
            });
        } catch (error) {
            console.error('Error switching map:', error);
            toast({
                title: "Error switching map",
                description: `Failed to switch to the selected map: ${error.response?.data?.message || error.message}`,
                status: "error"
            });
        }
    };

    const handleGridSettingsUpdate = async (newSettings) => {
        try {
            dispatch({ type: 'UPDATE_GRID', payload: newSettings });
            
            const newMapDimensions = {
                width: newSettings.gridWidth * newSettings.gridSize,
                height: newSettings.gridHeight * newSettings.gridSize
            };
            
            setGameState(prev => ({
                ...prev,
                gridSize: newSettings.gridSize,
                mapDimensions: newMapDimensions
            }));

            await api.patch(`/maps/${currentMap._id}`, {
                gridWidth: newSettings.gridWidth,
                gridHeight: newSettings.gridHeight,
                gridSettings: {
                    size: newSettings.gridSize,
                    visible: newSettings.visible,
                    color: newSettings.color
                }
            });

            toast({
                title: "Grid settings updated",
                description: "Map grid settings have been saved successfully",
                status: "success"
            });
        } catch (error) {
            toast({
                title: "Error updating grid settings",
                description: "Failed to save grid settings",
                status: "error"
            });
        }
    };

    const saveTokenName = async (tokenId) => {
        try {
            const token = gameState.tokens.find(t => t.id === tokenId);
            
            setGameState(prev => ({
                ...prev,
                tokens: prev.tokens.map(token =>
                    token.id === tokenId
                        ? { ...token, name: editingName }
                        : token
                )
            }));

            if (token?.isCharacterInstance) {
                await api.patch(`/characters/${token.characterId}`, {
                    name: editingName
                });
                
                await loadCampaignCharacters();
            } else {
                await api.patch(`/maps/${currentMap._id}/tokens/${tokenId}`, {
                    name: editingName
                });
            }

            socket.emit('tokenUpdated', {
                campaignId,
                mapId: currentMap._id,
                tokenId,
                updates: { name: editingName }
            });

            setEditingToken(null);
            setEditingName('');

            toast({
                title: "Token name updated",
                description: `Token renamed to "${editingName}"`,
                status: "success"
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update token name",
                status: "error"
            });
        }
    };

    // ====== RENDER ======

    return (
        <Box position="relative" h="100vh" w="100vw" overflow="hidden" display="flex">
            {/* Menu Toggle Button */}
            <IconButton
                icon={<HiMenu />}
                onClick={onOpen}
                position="fixed"
                top={4}
                left={4}
                zIndex={1000}
                colorScheme="orange"
                variant="solid"
                size="md"
                aria-label="Open menu"
            />

            {/* Zoom Level Indicator */}
            <Box
                position="fixed"
                top={4}
                left="50%"
                transform="translateX(-50%)"
                zIndex={1000}
                bg="rgba(0, 0, 0, 0.8)"
                color="white"
                px={3}
                py={2}
                borderRadius="md"
                fontSize="sm"
                fontWeight="medium"
                border="1px solid"
                borderColor="orange.400"
                backdropFilter="blur(4px)"
            >
                <Text>
                    Zoom: {Math.round(viewport.zoom * 100)}%
                </Text>
            </Box>

            {/* Main Game Area */}
            <Box
                flex={1}
                position="relative"
                h="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg="gray.900"
                mr="320px"
            >
                <canvas
                    ref={canvasRef}
                    width={gameState.mapDimensions.width}
                    height={gameState.mapDimensions.height}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    style={{ 
                        border: dragState.isDragOver 
                            ? `3px dashed ${dragState.dragType === 'token' ? '#F6AD55' : '#4FD1C7'}` 
                            : '2px solid #4A5568',
                        borderRadius: '8px',
                        cursor: background.isDragging ? 'grabbing' : (isGM ? 'grab' : 'default'),
                        boxShadow: dragState.isDragOver 
                            ? `0 0 20px ${dragState.dragType === 'token' ? 'rgba(246, 173, 85, 0.5)' : 'rgba(79, 209, 199, 0.5)'}` 
                            : '0 10px 25px rgba(0,0,0,0.3)',
                        transition: 'all 0.2s ease'
                    }}
                />
            </Box>

            {/* Video Chat Sidebar */}
            <Box
                position="fixed"
                top={0}
                right={0}
                w="320px"
                h="100vh"
                bg="gray.800"
                borderLeft="1px solid"
                borderColor="gray.600"
                p={4}
                overflowY="auto"
                zIndex={999}
            >
                <Text fontSize="lg" fontWeight="bold" color="orange.400" mb={4}>
                    Video Chat
                </Text>
                <VideoChat
                    socket={socket}
                    campaignId={campaignId}
                    userId={user.user.id}
                    userName={user.user.username}
                    campaign={campaign}
                    isOpen={true}
                    isRightSidebar={true}
                />
            </Box>

            {/* Drag and Drop Overlay */}
            {dragState.isDragOver && (
                <Box
                    position="fixed"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    zIndex={1001}
                    bg="rgba(0, 0, 0, 0.8)"
                    color="white"
                    px={6}
                    py={4}
                    borderRadius="lg"
                    textAlign="center"
                    border="2px dashed"
                    borderColor={dragState.dragType === 'token' ? 'orange.400' : 'teal.400'}
                    backdropFilter="blur(8px)"
                >
                    <Text fontSize="lg" fontWeight="bold" mb={2}>
                        {dragState.dragType === 'token' ? '🎭 Drop to add Token' : '🖼️ Drop to set Background'}
                    </Text>
                    <Text fontSize="sm" color="gray.300">
                        {dragState.dragType === 'token' 
                            ? 'Drop in center area to add a character token'
                            : 'Drop near edges to set map background'
                        }
                    </Text>
                </Box>
            )}

            {/* Empty State Overlay */}
            {userCharacters.length === 0 && !dragState.isDragOver && (
                <Box
                    position="fixed"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    zIndex={999}
                    bg="rgba(0, 0, 0, 0.7)"
                    color="white"
                    px={8}
                    py={6}
                    borderRadius="xl"
                    textAlign="center"
                    border="2px dashed"
                    borderColor="orange.400"
                    maxW="400px"
                    backdropFilter="blur(8px)"
                >
                    <Text fontSize="2xl" mb={2}>🎭</Text>
                    <Text fontSize="lg" fontWeight="bold" mb={3} color="orange.400">
                        No Tokens on the Map
                    </Text>
                    <Text fontSize="sm" mb={4} color="gray.300">
                        Drag and drop an image file onto the center of the map to add your character token.
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                        💡 Drop in center for tokens, drop near edges for background images
                    </Text>
                </Box>
            )}

            {/* Selected Token Name Display */}
            {gameState.selectedToken && (
                <Box
                    position="fixed"
                    bottom={4}
                    left="50%"
                    transform="translateX(-50%)"
                    zIndex={1000}
                    bg="rgba(0, 0, 0, 0.8)"
                    color="white"
                    px={4}
                    py={2}
                    borderRadius="lg"
                    textAlign="center"
                    border="2px solid"
                    borderColor="orange.400"
                    backdropFilter="blur(8px)"
                    boxShadow="0 4px 12px rgba(0,0,0,0.3)"
                >
                    <HStack spacing={2}>
                        <Text fontSize="sm" color="orange.400" fontWeight="semibold">
                            Selected:
                        </Text>
                        <Text fontSize="sm" fontWeight="medium">
                            {gameState.selectedToken.name || 'Unnamed Token'}
                        </Text>
                    </HStack>
                </Box>
            )}

            {/* Token Name Edit Modal */}
            <TokenNameEditModal
                isOpen={!!editingToken}
                tokenId={editingToken}
                editingName={editingName}
                onNameChange={setEditingName}
                onSave={saveTokenName}
                onCancel={cancelEditingTokenName}
            />

            {/* Side Drawer */}
            <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="md">
                <DrawerOverlay />
                <DrawerContent bg="gray.800" color="white">
                    <DrawerCloseButton color="white" />
                    <DrawerHeader borderBottomWidth="1px" borderBottomColor="gray.600">
                        <Text fontSize="xl" fontWeight="bold" color="orange.400">
                            Game Menu
                        </Text>
                    </DrawerHeader>
                    
                    <DrawerBody>
                        <VStack spacing={6} align="stretch">
                            {/* Back to Main Button */}
                            <Button
                                leftIcon={<IoArrowBack />}
                                onClick={handleBackToMain}
                                colorScheme="orange"
                                variant="outline"
                                size="lg"
                                w="full"
                            >
                                Back to Campaigns
                            </Button>

                            {/* Campaign Info */}
                            <Box>
                                <Text fontSize="lg" fontWeight="semibold" mb={2} color="gray.200">
                                    Current Campaign
                                </Text>
                                <Card bg="gray.700" borderColor="gray.600">
                                    <CardBody>
                                        <Text color="white" fontWeight="medium">
                                            {campaign?.name || 'Loading...'}
                                        </Text>
                                        <Text color="gray.400" fontSize="sm" mt={1}>
                                            {campaign?.description || 'No description'}
                                        </Text>
                                    </CardBody>
                                </Card>
                            </Box>

                            {/* Map Management Section - GM Only */}
                            {isGM && (
                                <Box>
                                    <HStack 
                                        spacing={2} 
                                        mb={3} 
                                        cursor="pointer" 
                                        onClick={() => setIsMapSectionCollapsed(!isMapSectionCollapsed)}
                                        _hover={{ color: 'orange.400' }}
                                        transition="color 0.2s"
                                    >
                                        <Text fontSize="lg" fontWeight="semibold" color="gray.200">
                                            Map Management
                                        </Text>
                                        <IconButton
                                            icon={isMapSectionCollapsed ? undefined : undefined}
                                            size="xs"
                                            variant="ghost"
                                            color="gray.400"
                                            aria-label="Toggle map management"
                                            _hover={{ color: 'orange.400' }}
                                        />
                                    </HStack>
                                    {!isMapSectionCollapsed && (
                                        <VStack spacing={3} align="stretch">
                                        {currentMap && (
                                            <Card bg="gray.700" borderColor="orange.400" borderWidth="2px">
                                                <CardBody>
                                                    <HStack spacing={3}>
                                                        <Box flex={1}>
                                                            <Text color="orange.400" fontWeight="bold" fontSize="sm">
                                                                ACTIVE MAP
                                                            </Text>
                                                            <Text color="white" fontWeight="medium">
                                                                {currentMap.name}
                                                            </Text>
                                                            <Text color="gray.400" fontSize="sm">
                                                                {currentMap.gridWidth}x{currentMap.gridHeight} grid
                                                            </Text>
                                                        </Box>
                                                    </HStack>
                                                </CardBody>
                                            </Card>
                                        )}

                                        {campaignMaps.length > 0 && (
                                            <Box>
                                                <Text fontSize="sm" fontWeight="semibold" mb={2} color="gray.300">
                                                    Switch to Map:
                                                </Text>
                                                <VStack spacing={2} align="stretch">
                                                    {campaignMaps
                                                        .filter(map => map._id !== currentMap?._id)
                                                        .map((map) => (
                                                        <Card key={map._id} bg="gray.700" borderColor="gray.600">
                                                            <CardBody py={3}>
                                                                <HStack spacing={3}>
                                                                    <Box flex={1}>
                                                                        <Text color="white" fontWeight="medium" fontSize="sm">
                                                                            {map.name}
                                                                        </Text>
                                                                        <Text color="gray.400" fontSize="xs">
                                                                            {map.gridWidth}x{map.gridHeight} grid
                                                                        </Text>
                                                                    </Box>
                                                                    <Button
                                                                        size="xs"
                                                                        colorScheme="orange"
                                                                        variant="outline"
                                                                        onClick={() => handleSwitchMap(map._id)}
                                                                    >
                                                                        Switch
                                                                    </Button>
                                                                </HStack>
                                                            </CardBody>
                                                        </Card>
                                                    ))}
                                                </VStack>
                                            </Box>
                                        )}

                                        {!isCreatingMap ? (
                                            <Button
                                                colorScheme="orange"
                                                variant="outline"
                                                size="sm"
                                                w="full"
                                                onClick={() => setIsCreatingMap(true)}
                                            >
                                                + Create New Map
                                            </Button>
                                        ) : (
                                            <VStack spacing={2}>
                                                <Input
                                                    value={newMapName}
                                                    onChange={(e) => setNewMapName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleCreateMap();
                                                        } else if (e.key === 'Escape') {
                                                            setIsCreatingMap(false);
                                                            setNewMapName('');
                                                        }
                                                    }}
                                                    placeholder="Enter map name"
                                                    size="sm"
                                                    bg="gray.600"
                                                    color="white"
                                                    border="1px solid"
                                                    borderColor="orange.400"
                                                    _focus={{ borderColor: 'orange.500', boxShadow: 'none' }}
                                                    autoFocus
                                                />
                                                <HStack spacing={2} w="100%">
                                                    <Button
                                                        size="xs"
                                                        colorScheme="orange"
                                                        onClick={handleCreateMap}
                                                        flex={1}
                                                    >
                                                        Create
                                                    </Button>
                                                    <Button
                                                        size="xs"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setIsCreatingMap(false);
                                                            setNewMapName('');
                                                        }}
                                                        flex={1}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </HStack>
                                            </VStack>
                                        )}
                                        </VStack>
                                    )}
                                </Box>
                            )}

                            {/* Grid Settings Panel */}
                            {isGM && currentMap && (
                                <GridSettingsPanel
                                    gridSettings={gridSettings}
                                    onGridSettingsUpdate={handleGridSettingsUpdate}
                                    isCollapsed={isGridSectionCollapsed}
                                    onCollapseToggle={() => setIsGridSectionCollapsed(!isGridSectionCollapsed)}
                                />
                            )}

                            {/* Character Sidebar */}
                            {currentMap && (
                                <CharacterSidebar
                                    characters={campaignCharacters}
                                    currentMap={currentMap}
                                    editingToken={editingToken}
                                    editingName={editingName}
                                    onEditingTokenChange={startEditingTokenName}
                                    onEditingNameChange={setEditingName}
                                    onSaveTokenName={saveTokenName}
                                    onCancelEditingTokenName={cancelEditingTokenName}
                                    onCharacterImageClick={handleCharacterImageClick}
                                    onAddCharacterToMap={addCharacterToMap}
                                    onRemoveCharacterFromMap={removeCharacterFromMap}
                                    isCollapsed={isCharacterSectionCollapsed}
                                    onCollapseToggle={() => setIsCharacterSectionCollapsed(!isCharacterSectionCollapsed)}
                                />
                            )}

                            {/* Zoom Controls */}
                            <Box>
                                <Text fontSize="sm" color="gray.400" mb={2}>
                                    Zoom Level: {Math.round(viewport.zoom * 100)}%
                                </Text>
                                <HStack spacing={2}>
                                    <Button
                                        size="sm"
                                        onClick={zoomOut}
                                        disabled={viewport.zoom <= viewport.minZoom}
                                        variant="outline"
                                        colorScheme="orange"
                                    >
                                        Zoom Out
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={resetCamera}
                                        variant="outline"
                                        colorScheme="orange"
                                    >
                                        Reset
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={zoomIn}
                                        disabled={viewport.zoom >= viewport.maxZoom}
                                        variant="outline"
                                        colorScheme="orange"
                                    >
                                        Zoom In
                                    </Button>
                                </HStack>
                            </Box>

                            {/* Connection Status */}
                            <Box>
                                <Text fontSize="sm" color="gray.400">
                                    Connection Status: 
                                    <Text as="span" color={socket.connected ? 'green.400' : 'red.400'} ml={2}>
                                        {socket.connected ? 'Connected' : 'Disconnected'}
                                    </Text>
                                </Text>
                            </Box>
                        </VStack>
                    </DrawerBody>
                </DrawerContent>
            </Drawer>

            {/* Character Image Update Modal */}
            <CharacterImageUpdate
                isOpen={characterImageModal.isOpen}
                onClose={handleCharacterImageModalClose}
                character={characterImageModal.character}
                campaignId={campaignId}
                onUpdate={handleCharacterImageUpdate}
                campaignAssets={campaignAssets}
            />
        </Box>
    );
};

export default Play;
