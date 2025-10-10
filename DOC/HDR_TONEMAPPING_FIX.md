# 🎨 HDR/Tone Mapping Fix - Double Tone Mapping Resolved

## Problem Identified

**Double tone mapping** was causing washed out, overexposed colors:

1. ❌ **Scenery.ts** applied tone mapping to the WebGPU renderer
   - Set `renderer.toneMapping = THREE.ACESFilmicToneMapping`
   - Set `renderer.toneMappingExposure = exposure`
   - Output: Tone-mapped sRGB

2. ❌ **PostFX.ts** ALSO applied ACES tone mapping in its shader
   - Lines 293-328: Manual ACES implementation + gamma correction
   - Input: Already tone-mapped sRGB (from Scenery)
   - Output: Double tone-mapped → washed out colors

**Result**: Colors were tone-mapped TWICE, causing severe overexposure and color distortion.

---

## Solution Implemented

### ✅ Clean Color Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ 1. SCENERY.TS (Scene Rendering)                            │
│    • Outputs: LINEAR HDR (no tone mapping)                 │
│    • renderer.toneMapping = NoToneMapping                  │
│    • renderer.outputColorSpace = LinearSRGBColorSpace      │
└─────────────────────┬───────────────────────────────────────┘
                      │ Linear HDR [0, ∞)
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. POSTFX.TS (Post-Processing Pipeline)                    │
│    ┌─────────────────────────────────────────────────────┐ │
│    │ BLOOM        │ HDR glow effects (linear space)     │ │
│    ├─────────────────────────────────────────────────────┤ │
│    │ ABERRATION   │ Lens effects (linear space)         │ │
│    ├─────────────────────────────────────────────────────┤ │
│    │ DOF          │ Depth of field (linear space)       │ │
│    ├─────────────────────────────────────────────────────┤ │
│    │ COLOR GRADE  │ Pre-tone-map adjustments (linear)   │ │
│    ├─────────────────────────────────────────────────────┤ │
│    │ TONE MAPPING │ ACES Filmic: HDR → LDR [0, 1]       │ │
│    ├─────────────────────────────────────────────────────┤ │
│    │ GAMMA        │ Linear → sRGB (pow 1/2.2)           │ │
│    └─────────────────────────────────────────────────────┘ │
│    • Outputs: sRGB LDR [0, 1] ready for display           │
└─────────────────────────────────────────────────────────────┘
```

---

## Changes Made

### 1. **Scenery.ts** - Added PostFX Mode

```typescript
/**
 * Disable renderer tone mapping for PostFX pipeline
 * 
 * When PostFX is active, the renderer MUST output linear HDR values
 * without any tone mapping or color space conversion.
 * PostFX will handle tone mapping in its shader pipeline.
 */
public disableToneMappingForPostFX(): void {
  this.renderer.toneMapping = THREE.NoToneMapping;
  this.renderer.toneMappingExposure = 1.0;
  // Output LINEAR color space for PostFX to process
  this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  console.log('⚙️ Scenery: Tone mapping DISABLED for PostFX pipeline (outputting linear HDR)');
}
```

**Purpose**: When PostFX is active, Scenery outputs raw linear HDR without any color/tone transformations.

---

### 2. **PostFX.ts** - Documented Color Pipeline

Added comprehensive documentation explaining the color pipeline:

```typescript
/**
 * ═══════════════════════════════════════════════════════════════════
 * 🎨 COLOR PIPELINE ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════
 * 
 * INPUT:  Linear HDR from Scenery (no tone mapping, linear color space)
 *         ↓
 * BLOOM:  HDR glow effects (operates in HDR/linear space)
 *         ↓
 * EFFECTS: Aberration, DOF, etc. (HDR/linear space)
 *         ↓
 * COLOR GRADING: Pre-tone-mapping color adjustments (HDR/linear space)
 *         ↓
 * TONE MAPPING: HDR → LDR conversion (ACES Filmic)
 *         ↓
 * GAMMA CORRECTION: Linear → sRGB (pow 1/2.2)
 *         ↓
 * OUTPUT: sRGB LDR for display
 * 
 * ⚠️ CRITICAL: Scenery MUST output LINEAR HDR (no tone mapping)
 *              This class handles the ONLY tone mapping step
 */
```

**Purpose**: Clear documentation of the color pipeline flow and requirements.

---

### 3. **APP.ts** - Activate PostFX Mode

```typescript
// Initialize PostFX (unified visual pipeline)
this.postFX = new PostFX(/* ... */);
await this.postFX.init();

// CRITICAL: Disable Scenery's tone mapping since PostFX handles it
// This prevents double tone mapping and color issues
this.scenery.disableToneMappingForPostFX();
```

**Purpose**: Immediately after PostFX initialization, switch Scenery to linear HDR output mode.

---

## Key Principles

### 🎯 Single Source of Truth for Tone Mapping

- **Scenery**: Outputs LINEAR HDR (no tone mapping)
- **PostFX**: Performs the ONLY tone mapping step
- **Result**: Correct color reproduction, no double tone mapping

### 🌈 Color Space Flow

1. **Scene Rendering** → Linear HDR
2. **Post Effects** → Linear HDR (preserves HDR range)
3. **Tone Mapping** → Linear LDR [0, 1]
4. **Gamma Correction** → sRGB LDR (display-ready)

### 🔧 Configuration

- `renderer.toneMapping = NoToneMapping` (when PostFX active)
- `renderer.outputColorSpace = LinearSRGBColorSpace` (when PostFX active)
- `postProcessing.outputColorTransform = false` (manual tone mapping)

---

## Testing

After reloading the application, you should see:

✅ **Console Logs**:
```
⚙️ Scenery: Tone mapping DISABLED for PostFX pipeline (outputting linear HDR)
✅ PostFX pipeline initialized (expects linear HDR input, outputs sRGB)
```

✅ **Visual Results**:
- Natural, film-like colors (not washed out)
- Proper HDR bloom glow
- Correct exposure levels
- Smooth tone transitions (no banding)
- Accurate material colors

---

## Future Considerations

### Direct Rendering Mode (Without PostFX)

If PostFX is ever disabled, Scenery can handle tone mapping directly:

```typescript
// When not using PostFX, re-enable Scenery's tone mapping
this.scenery.updateToneMapping({
  enabled: true,
  exposure: 0.5,
  mode: 'ACES'
});
```

### Debugging

To verify the color pipeline:

1. **Check input to PostFX**: Should be LINEAR HDR (bright, can exceed 1.0)
2. **Check PostFX bloom**: Should glow naturally (not blown out)
3. **Check final output**: Should be natural colors, good contrast
4. **Disable tone mapping**: Set `toneMappingEnabled.value = 0` → should look washed out (proves tone mapping is working)

---

## Architecture Benefits

✅ **Separation of Concerns**
- Scenery: Scene rendering + environment
- PostFX: Post-processing + tone mapping

✅ **Correct Color Science**
- Single tone mapping step
- Proper HDR → LDR conversion
- Accurate gamma correction

✅ **Maintainable**
- Clear documentation
- Well-defined interfaces
- Easy to debug

✅ **Flexible**
- Can toggle PostFX on/off
- Can adjust tone mapping settings at runtime
- Can add new post effects without color issues

---

## Summary

**Problem**: Double tone mapping caused washed out colors  
**Solution**: Scenery outputs linear HDR, PostFX does single tone mapping  
**Result**: Correct, beautiful, film-like HDR rendering 🎬✨

