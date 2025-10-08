# 🔧 Particle Snap & Sphere Clipping Fix

## 🎯 Issues Fixed

### **Issue 1: Particles Snapping to Left on Load**
**Problem**: All particles were snapping/moving to the left side when the page loaded, related to audio reactivity forces being applied before audio was initialized.

**Root Cause**: 
- Kinetic uniforms (macro parameters) had non-zero default values (0.5)
- `macroChaos` and `macroEnergy` at 0.5 caused turbulence forces even without audio
- Turbulence was being applied asymmetrically, causing leftward drift

**Fix**: Initialized all macro uniforms to `0` instead of `0.5`
```typescript
// flow/src/AUDIO/kinetic/particle-integration.ts
macroIntensity: uniform(0),  // was 0.5
macroChaos: uniform(0),       // was 0.5
macroSmoothness: uniform(0),  // was 0.5
macroResponsiveness: uniform(0),  // was 0.5
macroEnergy: uniform(0),      // was 0.5
macroCoherence: uniform(0),   // was 0.5
```

### **Issue 2: Sphere Boundary Clipping by UI Panels**
**Problem**: Sphere boundary was being clipped/deformed by UI panels and not maintaining its shape.

**Root Cause**:
- Boundaries system initialized BEFORE UI panels were created
- `ViewportTracker` couldn't detect panels during initialization
- Sphere was sized based on full viewport, not the UI-safe zone

**Fix**: Multiple improvements to ensure UI detection
1. **Delayed UI Detection**:
   ```typescript
   // flow/src/PARTICLESYSTEM/physic/viewport-tracker.ts
   setTimeout(() => this.update(), 100);
   setTimeout(() => this.update(), 500);
   ```

2. **Manual Refresh After Panel Creation**:
   ```typescript
   // flow/src/APP.ts - after initializeCorePanels()
   if (this.boundaries) {
     this.boundaries.refreshViewport();
   }
   ```

3. **Added `refreshViewport()` method**:
   ```typescript
   // flow/src/PARTICLESYSTEM/physic/boundaries.ts
   public refreshViewport(): void {
     this.viewportTracker.recalculateBounds();
   }
   ```

### **Issue 3: Particle Initialization Position**
**Problem**: Particles were not initializing in the center of the grid properly.

**Fix**: Improved initialization to center particles in grid space
```typescript
// flow/src/PARTICLESYSTEM/physic/mls-mpm.ts
const gridCenter = this.gridSize.clone().multiplyScalar(0.5);
const initRadius = Math.min(this.gridSize.x, this.gridSize.y, this.gridSize.z) * 0.15;
vec.multiplyScalar(initRadius).add(gridCenter);
```

### **Issue 4: Default Boundary Shape**
**Problem**: Default boundary was set to `SPHERE` instead of `NONE` (viewport mode).

**Fix**: Changed default to `NONE`
```typescript
// flow/src/PARTICLESYSTEM/physic/boundaries.ts
shape = BoundaryShape.NONE,  // was SPHERE
```

---

## 📁 Files Modified

### Core Fixes
1. **`flow/src/AUDIO/kinetic/particle-integration.ts`**
   - Reset macro uniform defaults from 0.5 to 0

2. **`flow/src/PARTICLESYSTEM/physic/mls-mpm.ts`**
   - Fixed particle initialization to center in grid
   - Changed calculation to use grid center + radius

3. **`flow/src/PARTICLESYSTEM/physic/boundaries.ts`**
   - Changed default shape to `NONE`
   - Added `refreshViewport()` public method
   - Sphere sizing based on safe zone (not full viewport)

### Viewport Tracking
4. **`flow/src/PARTICLESYSTEM/physic/viewport-tracker.ts`**
   - Added delayed UI panel detection (100ms, 500ms)
   - Added `recalculateBounds()` public method
   - Improved mutation observer timing

5. **`flow/src/APP.ts`**
   - Added manual viewport refresh after panels load
   - Ensures sphere adapts to UI layout

---

## ✅ Expected Behavior

### **NONE Mode (Default)**
- ✅ Particles float freely in center of viewport
- ✅ No hard boundaries
- ✅ Adapts to full page space
- ✅ Centered in available area (avoiding UI)
- ✅ No leftward drift on load

### **SPHERE Mode**
- ✅ Sphere maintains perfect shape
- ✅ Scales to fit safe zone (viewport minus UI)
- ✅ Centered in UI-free area
- ✅ No clipping with panels
- ✅ Adapts when panels resize

### **Particle Initialization**
- ✅ Particles spawn in tight sphere at grid center
- ✅ No asymmetric forces at startup
- ✅ Stable until audio/forces are applied

---

## 🧪 Testing

1. **Load app** - Particles should spawn centered, no leftward snap
2. **NONE mode** - Particles float in center of safe zone
3. **Switch to SPHERE** - Sphere appears perfectly round, centered
4. **Resize window** - Sphere adapts, stays centered
5. **Open/close panels** - Sphere adjusts position/size to avoid clipping

---

## 🔄 Initialization Order

```
1. Boundaries created (ViewportTracker initializes)
2. ViewportTracker.update() (panels not in DOM yet)
3. setTimeout updates (100ms, 500ms) scheduled
4. Panels created (initializeCorePanels)
5. boundaries.refreshViewport() called
6. setTimeout callbacks fire
   → UI panels detected
   → Safe zone calculated
   → Sphere positioned/sized correctly
```

---

## 📊 Before vs After

| Issue | Before | After |
|-------|--------|-------|
| **Particle spawn** | Snapped left | Centered stable |
| **NONE mode** | Used full grid | Uses safe zone |
| **Sphere shape** | Clipped by UI | Perfect sphere |
| **Sphere position** | Grid center | Safe zone center |
| **Audio forces** | Active at startup | Zero until audio plays |
| **Macro defaults** | 0.5 (turbulence) | 0 (no forces) |

---

## 🎨 Technical Details

### Safe Zone Calculation
The `ViewportTracker` now properly:
1. Detects UI panels via DOM queries
2. Calculates exclusion zones with margins
3. Computes safe area (viewport minus UI)
4. Centers sphere in safe area
5. Scales sphere to fit safe dimensions

### Sphere Sizing Formula
```typescript
const safeWidthGrid = (safe.width / window.innerWidth) * this.gridSize.x;
const safeHeightGrid = (safe.height / window.innerHeight) * this.gridSize.y;
const safeDimension = Math.min(safeWidthGrid, safeHeightGrid, this.gridSize.z);
this.baseRadius = (safeDimension / 2) - this.wallThickness - 5;
```

### Sphere Positioning Formula
```typescript
const safeCenterX = ((safe.centerX / screen.width) * grid.width);
const safeCenterY = ((safe.centerY / screen.height) * grid.height);
const safeCenterGrid = new THREE.Vector3(safeCenterX, safeCenterY, grid.center.z);
const worldCenter = this.viewportTracker.gridToWorld(safeCenterGrid);
```

---

## 🚀 Status

**✅ ALL ISSUES FIXED**

- ✅ Particles spawn centered without leftward drift
- ✅ Sphere maintains perfect shape
- ✅ Sphere adapts to UI layout
- ✅ No audio forces at startup
- ✅ Proper viewport-aware positioning

---

**Last Updated**: 2025-10-08  
**Scope**: Particle System, Audio Reactivity, Viewport Tracking

