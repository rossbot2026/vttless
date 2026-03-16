# VTTLess Background Image Debug Report

## Issue Summary
Map background images are not displaying in the Play component after the Phase 2.1 refactor. No console/backend errors were being reported.

## Root Cause Identified

### ❌ BUG FOUND: Incorrect `setBackground()` Call Signature in `initializeGameState`

**File:** `client/src/components/Play.jsx`  
**Line:** ~278 (originally)

**The Problem:**
```javascript
// WRONG - passing an object instead of using function signature
setBackground(prev => ({
    ...prev,
    image: img,
    x: mapData.backgroundImage.position.x,
    y: mapData.backgroundImage.position.y
}));
```

**The Fix Applied:**
The `setBackground` function in GameStateContext expects 4 parameters:
```javascript
setBackground(imageUrl, position, scale, image)
```

**Changed to:**
```javascript
setBackground(imageUrl, mapData.backgroundImage.position, 1, img);
```

This same issue was not present in `handleBackgroundUpdate` (which was already correct) or `handleBackgroundUpload` (which was also correct).

## Root Cause Analysis

### Flow Trace:

1. **Initial Load (`initializeGameState`):**
   - ✅ Loads mapData from API
   - ✅ Gets backgroundImage.assetId from mapData
   - ✅ Calls loadAssetUrl() to get image URL
   - ✅ Creates Image object and sets onload handler
   - ❌ **CRITICAL:** In onload, was calling `setBackground` with wrong signature
   - ❌ This caused the Image object to NOT be stored in state properly
   - Result: `background.image` remains `null` even after image loads

2. **Rendering (`useCanvasRendering`):**
   - ✅ Hook receives `background` prop from gameState
   - ✅ Checks `if (background.image)` before drawing
   - ❌ **Since `background.image` is null, the drawImage never executes**
   - Result: No background rendered, but no error either (silent failure)

3. **State Management (`GameStateContext`):**
   - ✅ Reducer properly handles SET_BACKGROUND action
   - ✅ Stores image, position, scale correctly
   - ❌ **But the action was never being dispatched properly due to call signature mismatch**

## Changes Made

### 1. **Play.jsx - initializeGameState** (CRITICAL FIX)
Added console logs and fixed the setBackground call:
```javascript
if (mapData.backgroundImage?.assetId) {
    try {
        console.log('🖼️ [initializeGameState] Loading background, assetId:', mapData.backgroundImage.assetId);
        const imageUrl = await loadAssetUrl(mapData.backgroundImage.assetId);
        const img = new Image();
        img.onload = () => {
            console.log('🖼️ [initializeGameState] Image loaded, dimensions:', img.width, 'x', img.height);
            // CRITICAL FIX: setBackground expects (imageUrl, position, scale, image) not an object!
            setBackground(imageUrl, mapData.backgroundImage.position, 1, img);
        };
        img.src = imageUrl;
    } catch (error) {
        console.error('Error loading background image:', error);
    }
}
```

### 2. **Play.jsx - handleBackgroundUpdate**
Added debugging to trace socket-based background updates:
```javascript
const handleBackgroundUpdate = useCallback(async (data) => {
    if (data.backgroundImage?.assetId) {
        console.log('🎨 [handleBackgroundUpdate] Received background update, assetId:', data.backgroundImage.assetId);
        const imageUrl = await loadAssetUrl(data.backgroundImage.assetId);
        const img = new Image();
        img.onload = () => {
            console.log('🎨 [handleBackgroundUpdate] Image loaded, setting background');
            setBackground(imageUrl, data.backgroundImage.position, 1, img);
        };
        img.src = imageUrl;
    }
}, [loadAssetUrl, setBackground, updateBackgroundPosition]);
```

### 3. **GameStateContext.jsx - SET_BACKGROUND Reducer**
Added logging to track state mutations:
```javascript
case 'SET_BACKGROUND':
    console.log('🔄 [GameStateContext] SET_BACKGROUND action received:');
    console.log('  - imageUrl:', action.payload.imageUrl);
    console.log('  - image dimensions:', action.payload.image ? { width: action.payload.image.naturalWidth, height: action.payload.image.naturalHeight } : 'null');
    return {
        ...state,
        background: {
            ...state.background,
            imageUrl: action.payload.imageUrl,
            position: action.payload.position || { x: 0, y: 0 },
            scale: action.payload.scale || 1,
            image: action.payload.image || null,
            x: action.payload.position?.x || 0,
            y: action.payload.position?.y || 0
        }
    };
```

### 4. **useCanvasRendering.js - renderGame Hook**
Added debugging to track rendering:
```javascript
if (background.image) {
    console.log('🎨 [useCanvasRendering] Drawing background:');
    console.log('  - image:', background.image);
    console.log('  - position:', { x: background.x, y: background.y });
    console.log('  - image natural size:', { width: background.image.naturalWidth, height: background.image.naturalHeight });
    ctx.drawImage(background.image, background.x, background.y, gameState.mapDimensions.width, gameState.mapDimensions.height);
} else {
    console.log('🎨 [useCanvasRendering] No background.image to draw. Background state:', background);
}
```

## Testing the Fix

### Expected Console Output After Fix:

1. **When map initializes:**
   ```
   🖼️ [initializeGameState] Loading background, assetId: <id>
   🖼️ [initializeGameState] Got imageUrl: <url>
   🖼️ [initializeGameState] Image loaded, dimensions: <width> x <height>
   🔄 [GameStateContext] SET_BACKGROUND action received:
     - imageUrl: <url>
     - image dimensions: { width: <w>, height: <h> }
   🎨 [useCanvasRendering] Drawing background:
     - image: Image { ... }
     - position: { x: 0, y: 0 }
     - image natural size: { width: <w>, height: <h> }
   ```

2. **Every frame after that:**
   ```
   🎨 [useCanvasRendering] Drawing background: ... (repeats in animation loop)
   ```

## Why This Wasn't Caught

1. **Silent failure:** The renderer doesn't error out if `background.image` is null—it just skips drawing
2. **No API errors:** The asset loading works fine, image downloads successfully
3. **State structure preserved:** The background state object exists, just with null image
4. **Asymmetric code:** `handleBackgroundUpdate` had the correct signature but `initializeGameState` didn't

## Verification Steps

1. **Check console output** during map load—should see all 🖼️ and 🔄 logs
2. **Verify background image renders** on canvas
3. **Drag to reposition background**—should work with 🎨 socket event logs
4. **Upload new background**—should follow same logging pattern

## Next Steps

- ✅ Deploy these debugging changes
- 🔍 Check console during map load to confirm fix works
- 📊 Monitor for any residual issues with background rendering
- 🧹 Remove debug console.logs once verified working (optional, can keep for support)
