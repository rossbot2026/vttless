# GameStateContext Developer Guide

## Overview

The GameStateContext provides a centralized, Redux-like state management system for the VTTless game engine. It uses React's `useReducer` hook and Context API to maintain a single source of truth for all game state.

## Quick Start

### Basic Usage

```javascript
import { useGameState } from '../contexts/GameStateContext';

function MyComponent() {
  const { state, selectToken, moveToken, updateZoom } = useGameState();
  
  // Access state
  console.log(state.selectedToken);
  console.log(state.viewport.zoom);
  
  // Dispatch actions
  selectToken(tokenId);
  moveToken(tokenId, 100, 200);
  updateZoom(1.5);
  
  return <div>{/* Your JSX */}</div>;
}
```

## State Structure

### Complete State Shape

```javascript
{
  // Tokens and Selection
  tokens: Array<Token>,           // All tokens on the map
  selectedToken: Token | null,    // Currently selected token
  
  // Background
  background: {
    imageUrl: string | null,      // URL of background image
    position: { x, y },           // Background position
    scale: number,                // Background zoom scale
    isDragging: boolean,          // Is being dragged
    dragStart: { x, y },          // Where drag started
    startPosition: { x, y },      // Position before drag
    image: HTMLImageElement | null // Loaded image object
  },
  
  // Camera/Viewport
  viewport: {
    zoom: number,                 // Camera zoom level (0.25 - 4)
    panOffset: { x, y },          // Camera pan offset
    offsetX: number,              // Backward compatibility
    offsetY: number,              // Backward compatibility
    width: number,                // Viewport width
    height: number,               // Viewport height
    minZoom: 0.25,                // Minimum zoom
    maxZoom: 4                     // Maximum zoom
  },
  
  // Grid
  grid: {
    size: number,                 // Grid square size in pixels
    visible: boolean,             // Is grid visible
    color: string,                // Grid color (hex)
    type: 'square' | 'hex',       // Grid type
    width: number,                // Grid width in squares
    height: number                // Grid height in squares
  },
  
  // UI State
  ui: {
    showGridSettings: boolean,    // Grid settings panel open
    showTokenModal: boolean,      // Token edit modal open
    selectedTokenName: string,    // Currently editing token name
    dragState: {
      isDragging: boolean,        // Token is being dragged
      isResizing: boolean,        // Token is being resized
      isDragOver: boolean,        // File drag over canvas
      dragType: string | null     // Type of drag ('token', 'background', etc)
    }
  },
  
  // Backward compatibility
  scale: number,                  // Token scale (deprecated)
  gridSize: number,               // Grid size (use grid.size instead)
  mapDimensions: { width, height } // Map dimensions (calculated)
}
```

## Action Reference

### Token Actions

#### SELECT_TOKEN
Select a token for editing/display
```javascript
const { selectToken } = useGameState();
selectToken(tokenId);
```

#### ADD_TOKEN
Add a new token to the game
```javascript
const { addToken } = useGameState();
addToken({
  id: 'token-123',
  x: 100,
  y: 200,
  width: 50,
  height: 50,
  name: 'Player Character',
  ownerId: 'user-123'
});
```

#### REMOVE_TOKEN
Remove a token from the game
```javascript
const { removeToken } = useGameState();
removeToken(tokenId);
```

#### MOVE_TOKEN
Move a token to a new position
```javascript
const { moveToken } = useGameState();
moveToken(tokenId, newX, newY);
```

#### RESIZE_TOKEN
Resize a token (and optionally move it)
```javascript
const { resizeToken } = useGameState();
resizeToken(tokenId, newWidth, newHeight, newX, newY);
```

#### UPDATE_TOKEN
Update any token properties
```javascript
const { updateToken } = useGameState();
updateToken(tokenId, {
  name: 'New Name',
  opacity: 0.8,
  // ... any other properties
});
```

#### BULK_UPDATE_TOKENS
Replace all tokens at once
```javascript
const { bulkUpdateTokens } = useGameState();
bulkUpdateTokens(newTokensArray);
```

### Background Actions

#### SET_BACKGROUND
Load a new background image
```javascript
const { setBackground } = useGameState();
setBackground(
  imageUrl,              // URL or path
  { x: 0, y: 0 },       // Position
  1,                     // Scale
  imageElement           // Optional: loaded Image object
);
```

#### UPDATE_BACKGROUND_POSITION
Move the background
```javascript
const { updateBackgroundPosition } = useGameState();
updateBackgroundPosition(newX, newY);
```

#### UPDATE_BACKGROUND_SCALE
Change background zoom
```javascript
const { updateBackgroundScale } = useGameState();
updateBackgroundScale(1.5);
```

### Viewport Actions

#### SET_VIEWPORT
Set the entire viewport state
```javascript
const { setViewport } = useGameState();
setViewport({
  zoom: 1.5,
  panOffset: { x: 100, y: 200 },
  width: 1024,
  height: 768
});
```

#### UPDATE_ZOOM
Change zoom level
```javascript
const { updateZoom } = useGameState();
updateZoom(2.0);
```

#### UPDATE_PAN
Change camera pan
```javascript
const { updatePan } = useGameState();
updatePan(offsetX, offsetY);
```

#### SET_VIEWPORT_SIZE
Update viewport dimensions
```javascript
const { setViewportSize } = useGameState();
setViewportSize(newWidth, newHeight);
```

### Grid Actions

#### UPDATE_GRID
Update grid settings
```javascript
const { updateGrid } = useGameState();
updateGrid({
  size: 64,              // pixels per square
  visible: true,
  color: '#ff0000',
  type: 'square',
  width: 20,             // grid width in squares
  height: 20             // grid height in squares
});
```

#### TOGGLE_GRID_VISIBILITY
Toggle grid on/off
```javascript
const { toggleGridVisibility } = useGameState();
toggleGridVisibility();
```

#### SET_GRID_VISIBILITY
Set grid visibility
```javascript
const { setGridVisibility } = useGameState();
setGridVisibility(true);
```

### UI Actions

#### SHOW_GRID_SETTINGS / HIDE_GRID_SETTINGS
Control grid settings panel
```javascript
const { showGridSettings, hideGridSettings } = useGameState();
showGridSettings();
// ... later
hideGridSettings();
```

#### SHOW_TOKEN_MODAL / HIDE_TOKEN_MODAL
Control token edit modal
```javascript
const { showTokenModal, hideTokenModal } = useGameState();
showTokenModal(tokenId);
// ... later
hideTokenModal();
```

#### SET_DRAG_STATE
Update drag/interaction state
```javascript
const { setDragState } = useGameState();
setDragState({
  isDragging: true,
  isDragOver: false,
  dragType: 'token'
});
```

### Utility Actions

#### RESET_GAME_STATE
Reset all game state to initial values
```javascript
const { resetGameState } = useGameState();
resetGameState();
```

## Direct Dispatch (Advanced)

For actions not exposed as convenience functions, use dispatch directly:

```javascript
const { state, dispatch } = useGameState();

dispatch({
  type: 'SELECT_TOKEN',
  payload: tokenId
});

dispatch({
  type: 'MOVE_TOKEN',
  payload: { tokenId, x: 100, y: 200 }
});
```

## Usage Patterns

### Pattern 1: Token Selection and Movement

```javascript
function TokenInteraction() {
  const { state, selectToken, moveToken } = useGameState();
  
  const handleTokenClick = (token) => {
    selectToken(token.id);
  };
  
  const handleTokenDrag = (tokenId, newX, newY) => {
    moveToken(tokenId, newX, newY);
  };
  
  return (
    <div>
      {state.tokens.map(token => (
        <div
          key={token.id}
          className={state.selectedToken?.id === token.id ? 'selected' : ''}
          onClick={() => handleTokenClick(token)}
          onDrag={(e) => handleTokenDrag(token.id, e.clientX, e.clientY)}
        >
          {token.name}
        </div>
      ))}
    </div>
  );
}
```

### Pattern 2: Responsive Zoom Controls

```javascript
function ZoomControls() {
  const { state, updateZoom } = useGameState();
  
  return (
    <div>
      <button onClick={() => updateZoom(state.viewport.zoom * 1.25)}>
        Zoom In
      </button>
      <span>Zoom: {Math.round(state.viewport.zoom * 100)}%</span>
      <button onClick={() => updateZoom(state.viewport.zoom * 0.8)}>
        Zoom Out
      </button>
    </div>
  );
}
```

### Pattern 3: Grid Configuration

```javascript
function GridConfig() {
  const { state, updateGrid } = useGameState();
  
  return (
    <div>
      <label>
        Grid Size (pixels):
        <input
          type="number"
          value={state.grid.size}
          onChange={(e) => updateGrid({
            ...state.grid,
            size: parseInt(e.target.value)
          })}
        />
      </label>
      
      <label>
        <input
          type="checkbox"
          checked={state.grid.visible}
          onChange={(e) => updateGrid({
            ...state.grid,
            visible: e.target.checked
          })}
        />
        Show Grid
      </label>
    </div>
  );
}
```

### Pattern 4: Conditional Rendering Based on State

```javascript
function GameUI() {
  const { state } = useGameState();
  
  return (
    <div>
      {state.selectedToken && (
        <TokenProperties token={state.selectedToken} />
      )}
      
      {state.ui.dragState.isDragOver && (
        <DropZoneHint type={state.ui.dragState.dragType} />
      )}
      
      {state.ui.showGridSettings && (
        <GridSettingsPanel />
      )}
    </div>
  );
}
```

## Common Pitfalls

### ❌ Mutating State Directly
```javascript
// DON'T DO THIS
const { state } = useGameState();
state.selectedToken.x = 100;  // Will not update UI
```

### ✅ Use Actions Instead
```javascript
// DO THIS
const { moveToken } = useGameState();
moveToken(tokenId, 100, state.selectedToken.y);
```

### ❌ Accessing Context Outside Provider
```javascript
// This will throw an error
function BadComponent() {
  const { state } = useGameState();  // Error: must be within GameStateProvider
}
```

### ✅ Ensure Provider Wraps Component
```javascript
// Good: Provider wraps everything
<GameStateProvider>
  <Play />
</GameStateProvider>

// Bad: Component used outside provider
<Play />
```

## Performance Optimization

### Use Selectors for Large Lists
```javascript
function TokenList() {
  const { state } = useGameState();
  
  // This causes re-render when ANY state changes
  const allTokens = state.tokens;
  
  // Better: memoize if needed
  const visibleTokens = useMemo(
    () => state.tokens.filter(t => isVisible(t)),
    [state.tokens]
  );
}
```

### Batch Updates When Possible
```javascript
const { updateToken } = useGameState();

// Instead of 3 separate dispatches
updateToken(id, { x: 100 });
updateToken(id, { y: 200 });
updateToken(id, { width: 50 });

// Do this
updateToken(id, { x: 100, y: 200, width: 50 });
```

## Debugging

### Log All State Changes

Add this to your reducer for development:

```javascript
// In GameStateContext.jsx reducer
function gameStateReducer(state, action) {
  if (process.env.NODE_ENV === 'development') {
    console.log('Action:', action.type, action.payload);
  }
  
  // ... rest of reducer
}
```

### Use React DevTools

1. Install React DevTools browser extension
2. Open DevTools → Components tab
3. Find `GameStateProvider` in the component tree
4. Expand and inspect the state prop
5. See state updates in real-time

### Manual State Inspection

```javascript
function DebugPanel() {
  const { state } = useGameState();
  
  return (
    <pre style={{ fontSize: '10px', overflow: 'auto' }}>
      {JSON.stringify(state, null, 2)}
    </pre>
  );
}
```

## Migration Guide (From Old hooks)

### Old Way (useGameState from hooks)
```javascript
const gameStateHook = useGameState();
const { gameState, setGameState } = gameStateHook;

setGameState(prev => ({
  ...prev,
  isDragging: true
}));
```

### New Way (useGameState from context)
```javascript
const { state, setDragState } = useGameState();

setDragState({ isDragging: true, isResizing: false });
```

## API Reference

See the reducer function in `GameStateContext.jsx` for the complete implementation details and all supported actions.

## Contributing

When adding new features:

1. **Define the state shape** - What data needs to persist?
2. **Create an action** - Add a case in the reducer
3. **Create a dispatcher** - Add a convenience function in GameStateProvider
4. **Update this guide** - Document the new action and usage

---

For more information, see:
- `PHASE_2_1_TESTING_REPORT.md` - Implementation details and testing
- `GameStateContext.jsx` - Source code with detailed comments
- React Context API: https://react.dev/reference/react/useContext
