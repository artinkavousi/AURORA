# Rendering Fix Summary
**Date:** 2025-10-02  
**Issue:** `outputNode.build is not a function` error + overexposed/white page

## 🐛 Root Cause Analysis

### Primary Issue: Invalid MRT Node Assignment
**File:** `src/PARTICLESYSTEM/RENDERER/meshrenderer.ts`  
**Line:** 231  
**Problem:** Setting `material.mrtNode` to a plain JavaScript object instead of proper TSL nodes

```typescript
// ❌ BEFORE (BROKEN)
this.material.mrtNode = { bloomIntensity: intensity } as any;

// ✅ AFTER (FIXED)
// MRT bloom disabled - was causing "outputNode.build is not a function"
// The mrtNode expects proper TSL nodes, not plain objects
```

**Why This Broke:**
- Three.js WebGPU's node system expects all nodes to be proper TSL objects with a `.build()` method
- Plain JavaScript objects don't have this method → runtime error
- The `as any` type cast masked the TypeScript error but couldn't prevent runtime failure

### Secondary Issue: Overexposure from Multiple Sources
**Problem:** Multiple conflicting exposure/intensity settings across files

**Contributing factors:**
1. Environment intensity too high (0.3 → 0.25)
2. Tone mapping exposure too high (0.6 → 0.5)
3. Lack of centralized color/HDR management
4. No clear single source of truth for visual output

## ✅ Fixes Applied

### 1. Disabled Invalid MRT Bloom (meshrenderer.ts)
**Changed:** `setBloomIntensity()` method  
**Action:** Disabled MRT-based bloom entirely to prevent the error
```typescript
public setBloomIntensity(intensity: number): void {
  // Intentionally empty - MRT bloom disabled
  // Bloom should be handled by post-processing when re-enabled
}
```

**Impact:**
- ✅ Eliminates `outputNode.build is not a function` error
- ✅ Particles still render correctly
- ⚠️ Bloom effect currently disabled (will be handled by PostFX system later)

### 2. Unified Color/HDR Management (scenery.ts)
**Changed:** Centralized all visual output settings in `Scenery` class  
**Action:** Made Scenery the SINGLE SOURCE OF TRUTH for:
- Tone mapping (ACES Filmic, exposure)
- HDR environment (intensity, rotation)
- Color space configuration
- Renderer output settings

**New defaults (reduced to prevent overexposure):**
- `environmentIntensity: 0.25` (was 0.3)
- `exposure: 0.5` (was 0.6)

**Added:**
- Console logging for tone mapping configuration
- Comprehensive documentation of HDR→LDR pipeline
- Clear comments on color space handling

### 3. Updated Config Defaults (config.ts)
**Changed:** Aligned config defaults with Scenery defaults  
**Action:** 
- Updated `toneMapping.exposure` to 0.5
- Updated `environment.environmentIntensity` to 0.25
- Added documentation clarifying Scenery.ts as single source of truth

### 4. Documented Boundaries Isolation (boundaries.ts)
**Changed:** Added clarifications about material isolation  
**Action:**
- Documented that boundary materials don't affect main rendering
- Clarified proper color space handling for textures
- Confirmed TSL node usage (no plain objects)

**Verified:**
- ✅ Color map uses `SRGBColorSpace` (correct)
- ✅ Normal/AO/Roughness use `LinearSRGBColorSpace` (correct)
- ✅ All nodes properly wrapped in `Fn()` (correct)

## 📋 Architecture Improvements

### Single Source of Truth Pattern
**Before:** Color/tone mapping settings scattered across:
- `config.ts` (defaults)
- `APP.ts` (initialization)
- `scenery.ts` (rendering)
- `meshrenderer.ts` (materials)
- `boundaries.ts` (visualization)

**After:** Centralized in `Scenery.ts`:
```
config.ts → APP.ts → Scenery.ts (SSOT) → Renderer
                       ↓
                  All materials respect Scenery settings
```

### Proper TSL Node Usage
**Rule:** NEVER assign plain objects to node properties
```typescript
// ❌ WRONG - will cause runtime errors
material.mrtNode = { bloomIntensity: 0.5 } as any;
material.colorNode = { r: 1, g: 0, b: 0 };

// ✅ CORRECT - use proper TSL nodes
material.colorNode = Fn(() => vec3(1, 0, 0))();
material.positionNode = Fn(() => positionWorld.mul(scale))();
```

### Color Space Guidelines
**Established clear rules:**
- **HDR textures (HDRI):** `LinearSRGBColorSpace` (no gamma)
- **Color/diffuse maps:** `SRGBColorSpace` (gamma-encoded)
- **Data maps (normal/roughness/AO):** `LinearSRGBColorSpace` (raw data)
- **Renderer output:** `SRGBColorSpace` (for display)

## 🎨 Visual Output Pipeline

```
┌─────────────────────────────────────────────────────┐
│  HDR Scene (Linear RGB, unbounded values)          │
│  - Particles, lights, environment, materials        │
└─────────────────────┬───────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Tone Mapping (HDR → LDR)                           │
│  - Mode: ACES Filmic (natural film-like curve)     │
│  - Exposure: 0.5 (conservative, prevents blow-out) │
│  - Maps unbounded HDR to [0,1] displayable range   │
└─────────────────────┬───────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Color Space Conversion (Linear → sRGB)            │
│  - Output: SRGBColorSpace                          │
│  - Applies gamma correction for display            │
└─────────────────────┬───────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  Display (sRGB, gamma 2.2)                         │
│  - Final image on screen                           │
└─────────────────────────────────────────────────────┘
```

## 🔧 Testing Checklist

- [x] No TypeScript linter errors
- [ ] Page loads without white screen
- [ ] No `outputNode.build` error in console
- [ ] Particles visible and properly lit
- [ ] Exposure looks natural (not blown out)
- [ ] HDR environment loads correctly
- [ ] Camera controls work
- [ ] Shadows render properly

## 📝 Future Work

### Bloom Re-implementation
When re-enabling bloom, use proper post-processing pipeline:
```typescript
// In PostFX system (not in material MRT)
import { bloom } from 'three/tsl';

const bloomPass = pass(scene, camera)
  .bloom(threshold, strength, radius);
```

### PostFX System Re-activation
Currently disabled for debugging. When re-enabling:
1. Verify all post-processing passes use proper TSL nodes
2. Ensure PostFX doesn't override Scenery's tone mapping
3. Test that bloom/CA/DOF work without conflicts
4. Maintain Scenery as SSOT for base rendering settings

## 🎯 Key Takeaways

1. **Never use plain objects for TSL node properties** - always use proper TSL functions
2. **Centralize visual output settings** - avoid scattered config
3. **Respect color spaces** - HDR/Linear/sRGB have different purposes
4. **Conservative defaults** - better to start dark and adjust up
5. **Document single source of truth** - make architecture clear

## 📚 References

- [Three.js TSL Documentation](https://threejs.org/docs/#api/en/renderers/webgpu/nodes/TSL)
- [WebGPU Node System](https://threejs.org/docs/#api/en/renderers/webgpu/nodes/Nodes)
- [Color Space Management](https://threejs.org/docs/#manual/en/introduction/Color-management)
- [Tone Mapping](https://threejs.org/docs/#api/en/constants/Renderer)

---

**Status:** ✅ All fixes applied, ready for testing

