import React, { createContext, useReducer, useCallback } from 'react';

/**
 * GameStateContext
 * Central context for all game state management
 * Replaces scattered useState hooks with a unified reducer pattern
 */
export const GameStateContext = createContext();

/**
 * Initial game state shape
 * Consolidates all game state into a single, well-organized structure
 */
const initialState = {
  tokens: [],
  selectedToken: null,
  background: {
    imageUrl: null,
    position: { x: 0, y: 0 },
    scale: 1,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    startPosition: { x: 0, y: 0 },
    image: null // For loaded image object
  },
  viewport: {
    zoom: 1,
    panOffset: { x: 0, y: 0 },
    offsetX: 0, // For backward compatibility with existing code
    offsetY: 0,
    width: 1024,
    height: 768,
    minZoom: 0.25,
    maxZoom: 4
  },
  grid: {
    size: 50,
    visible: true,
    color: '#ccc',
    type: 'square',
    width: 20,
    height: 20
  },
  ui: {
    showGridSettings: false,
    showTokenModal: false,
    selectedTokenName: '',
    dragState: {
      isDragging: false,
      isResizing: false,
      isDragOver: false,
      dragType: null
    }
  },
  // For backward compatibility
  scale: 1,
  gridSize: 40,
  mapDimensions: { width: 800, height: 600 }
};

/**
 * Game state reducer
 * Handles all state mutations through semantic actions
 */
function gameStateReducer(state, action) {
  switch (action.type) {
    // ====== TOKEN ACTIONS ======
    case 'SELECT_TOKEN':
      return {
        ...state,
        selectedToken: action.payload
      };

    case 'ADD_TOKEN':
      return {
        ...state,
        tokens: [...state.tokens, action.payload]
      };

    case 'REMOVE_TOKEN':
      return {
        ...state,
        tokens: state.tokens.filter(token => token.id !== action.payload),
        selectedToken: state.selectedToken?.id === action.payload ? null : state.selectedToken
      };

    case 'MOVE_TOKEN':
      return {
        ...state,
        tokens: state.tokens.map(token =>
          token.id === action.payload.tokenId
            ? { ...token, x: action.payload.x, y: action.payload.y }
            : token
        )
      };

    case 'RESIZE_TOKEN':
      return {
        ...state,
        tokens: state.tokens.map(token =>
          token.id === action.payload.tokenId
            ? {
              ...token,
              width: action.payload.width,
              height: action.payload.height,
              ...(action.payload.x !== undefined && { x: action.payload.x }),
              ...(action.payload.y !== undefined && { y: action.payload.y })
            }
            : token
        )
      };

    case 'UPDATE_TOKEN':
      return {
        ...state,
        tokens: state.tokens.map(token =>
          token.id === action.payload.tokenId
            ? { ...token, ...action.payload.updates }
            : token
        )
      };

    case 'BULK_UPDATE_TOKENS':
      return {
        ...state,
        tokens: action.payload
      };

    // ====== BACKGROUND ACTIONS ======
    case 'SET_BACKGROUND':
      return {
        ...state,
        background: {
          ...state.background,
          imageUrl: action.payload.imageUrl,
          position: action.payload.position || { x: 0, y: 0 },
          scale: action.payload.scale || 1,
          image: action.payload.image || null,
          x: action.payload.position?.x || 0, // For backward compatibility
          y: action.payload.position?.y || 0
        }
      };

    case 'UPDATE_BACKGROUND_POSITION':
      return {
        ...state,
        background: {
          ...state.background,
          position: { x: action.payload.x, y: action.payload.y },
          x: action.payload.x, // For backward compatibility
          y: action.payload.y
        }
      };

    case 'UPDATE_BACKGROUND_SCALE':
      return {
        ...state,
        background: {
          ...state.background,
          scale: action.payload
        }
      };

    case 'SET_BACKGROUND_DRAGGING':
      return {
        ...state,
        background: {
          ...state.background,
          isDragging: action.payload.isDragging,
          dragStart: action.payload.dragStart || state.background.dragStart,
          startPosition: action.payload.startPosition || state.background.startPosition
        }
      };

    // ====== VIEWPORT/CAMERA ACTIONS ======
    case 'SET_VIEWPORT':
      return {
        ...state,
        viewport: {
          ...state.viewport,
          zoom: action.payload.zoom || state.viewport.zoom,
          panOffset: action.payload.panOffset || state.viewport.panOffset,
          offsetX: action.payload.offsetX !== undefined ? action.payload.offsetX : action.payload.panOffset?.x ?? state.viewport.offsetX,
          offsetY: action.payload.offsetY !== undefined ? action.payload.offsetY : action.payload.panOffset?.y ?? state.viewport.offsetY
        }
      };

    case 'UPDATE_ZOOM':
      return {
        ...state,
        viewport: {
          ...state.viewport,
          zoom: Math.max(
            state.viewport.minZoom,
            Math.min(state.viewport.maxZoom, action.payload)
          )
        }
      };

    case 'UPDATE_PAN':
      return {
        ...state,
        viewport: {
          ...state.viewport,
          panOffset: {
            x: action.payload.offsetX ?? state.viewport.panOffset.x,
            y: action.payload.offsetY ?? state.viewport.panOffset.y
          },
          offsetX: action.payload.offsetX ?? state.viewport.offsetX,
          offsetY: action.payload.offsetY ?? state.viewport.offsetY
        }
      };

    case 'SET_VIEWPORT_SIZE':
      return {
        ...state,
        viewport: {
          ...state.viewport,
          width: action.payload.width,
          height: action.payload.height
        }
      };

    // ====== GRID ACTIONS ======
    case 'UPDATE_GRID':
      return {
        ...state,
        grid: {
          ...state.grid,
          ...action.payload
        },
        // Backward compatibility
        gridSize: action.payload.size || state.gridSize
      };

    case 'TOGGLE_GRID_VISIBILITY':
      return {
        ...state,
        grid: {
          ...state.grid,
          visible: !state.grid.visible
        }
      };

    case 'SET_GRID_VISIBILITY':
      return {
        ...state,
        grid: {
          ...state.grid,
          visible: action.payload
        }
      };

    // ====== UI ACTIONS ======
    case 'SHOW_GRID_SETTINGS':
      return {
        ...state,
        ui: {
          ...state.ui,
          showGridSettings: true
        }
      };

    case 'HIDE_GRID_SETTINGS':
      return {
        ...state,
        ui: {
          ...state.ui,
          showGridSettings: false
        }
      };

    case 'SHOW_TOKEN_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          showTokenModal: true,
          selectedTokenName: action.payload || ''
        }
      };

    case 'HIDE_TOKEN_MODAL':
      return {
        ...state,
        ui: {
          ...state.ui,
          showTokenModal: false,
          selectedTokenName: ''
        }
      };

    case 'SET_DRAG_STATE':
      return {
        ...state,
        ui: {
          ...state.ui,
          dragState: {
            ...state.ui.dragState,
            ...action.payload
          }
        },
        // Backward compatibility
        isDragging: action.payload.isDragging ?? state.isDragging
      };

    // ====== RESET ======
    case 'RESET_GAME_STATE':
      return initialState;

    // Backward compatibility actions
    case 'SET_GAME_STATE':
      return {
        ...state,
        ...action.payload,
        tokens: action.payload.tokens ?? state.tokens
      };

    case 'SET_BACKGROUND_OLD': // For old API
      return {
        ...state,
        background: {
          ...state.background,
          ...action.payload
        }
      };

    default:
      return state;
  }
}

/**
 * GameStateProvider Component
 * Wraps the application to provide centralized state management
 */
export function GameStateProvider({ children }) {
  const [state, dispatch] = useReducer(gameStateReducer, initialState);

  // Convenience dispatch functions for common actions
  const gameStateActions = {
    selectToken: useCallback((tokenId) => {
      dispatch({ type: 'SELECT_TOKEN', payload: tokenId });
    }, []),

    addToken: useCallback((token) => {
      dispatch({ type: 'ADD_TOKEN', payload: token });
    }, []),

    removeToken: useCallback((tokenId) => {
      dispatch({ type: 'REMOVE_TOKEN', payload: tokenId });
    }, []),

    moveToken: useCallback((tokenId, x, y) => {
      dispatch({ type: 'MOVE_TOKEN', payload: { tokenId, x, y } });
    }, []),

    resizeToken: useCallback((tokenId, width, height, x, y) => {
      dispatch({ type: 'RESIZE_TOKEN', payload: { tokenId, width, height, x, y } });
    }, []),

    updateToken: useCallback((tokenId, updates) => {
      dispatch({ type: 'UPDATE_TOKEN', payload: { tokenId, updates } });
    }, []),

    bulkUpdateTokens: useCallback((tokens) => {
      dispatch({ type: 'BULK_UPDATE_TOKENS', payload: tokens });
    }, []),

    setBackground: useCallback((imageUrl, position, scale, image) => {
      dispatch({
        type: 'SET_BACKGROUND',
        payload: { imageUrl, position, scale, image }
      });
    }, []),

    updateBackgroundPosition: useCallback((x, y) => {
      dispatch({ type: 'UPDATE_BACKGROUND_POSITION', payload: { x, y } });
    }, []),

    updateBackgroundScale: useCallback((scale) => {
      dispatch({ type: 'UPDATE_BACKGROUND_SCALE', payload: scale });
    }, []),

    setBackgroundDragging: useCallback((isDragging, dragStart, startPosition) => {
      dispatch({
        type: 'SET_BACKGROUND_DRAGGING',
        payload: { isDragging, dragStart, startPosition }
      });
    }, []),

    setViewport: useCallback((viewport) => {
      dispatch({ type: 'SET_VIEWPORT', payload: viewport });
    }, []),

    updateZoom: useCallback((zoom) => {
      dispatch({ type: 'UPDATE_ZOOM', payload: zoom });
    }, []),

    updatePan: useCallback((offsetX, offsetY) => {
      dispatch({ type: 'UPDATE_PAN', payload: { offsetX, offsetY } });
    }, []),

    setViewportSize: useCallback((width, height) => {
      dispatch({ type: 'SET_VIEWPORT_SIZE', payload: { width, height } });
    }, []),

    updateGrid: useCallback((gridSettings) => {
      dispatch({ type: 'UPDATE_GRID', payload: gridSettings });
    }, []),

    toggleGridVisibility: useCallback(() => {
      dispatch({ type: 'TOGGLE_GRID_VISIBILITY' });
    }, []),

    setGridVisibility: useCallback((visible) => {
      dispatch({ type: 'SET_GRID_VISIBILITY', payload: visible });
    }, []),

    showGridSettings: useCallback(() => {
      dispatch({ type: 'SHOW_GRID_SETTINGS' });
    }, []),

    hideGridSettings: useCallback(() => {
      dispatch({ type: 'HIDE_GRID_SETTINGS' });
    }, []),

    showTokenModal: useCallback((tokenId) => {
      dispatch({ type: 'SHOW_TOKEN_MODAL', payload: tokenId });
    }, []),

    hideTokenModal: useCallback(() => {
      dispatch({ type: 'HIDE_TOKEN_MODAL' });
    }, []),

    setDragState: useCallback((dragState) => {
      dispatch({ type: 'SET_DRAG_STATE', payload: dragState });
    }, []),

    resetGameState: useCallback(() => {
      dispatch({ type: 'RESET_GAME_STATE' });
    }, []),

    // Backward compatibility
    setGameState: useCallback((updates) => {
      dispatch({ type: 'SET_GAME_STATE', payload: updates });
    }, []),

    setBackgroundOld: useCallback((updates) => {
      dispatch({ type: 'SET_BACKGROUND_OLD', payload: updates });
    }, [])
  };

  const value = {
    state,
    dispatch,
    ...gameStateActions
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

/**
 * useGameState Custom Hook
 * Provides easy access to game state and dispatch actions
 * Returns: { state, dispatch, ...actions }
 */
export function useGameState() {
  const context = React.useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within GameStateProvider');
  }
  return context;
}
