# ✨ PostFX & Scenery Clean Separation

## Overview

PostFX and Scenery are now properly separated with clear responsibilities:

- **PostFX**: Post-processing effects only
- **Scenery**: Environment, HDR, lighting, scene setup

---

## 📦 PostFX System

### Responsibility: **Post-Processing Effects Only**

Located in: `src/POSTFX/`

### Effects Included:

1. **✨ Bloom** - HDR glow effect
   - Threshold
   - Strength
   - Radius/Spread
   - ✅ Can be enabled/disabled

2. **🔴 Chromatic Aberration** - Color fringing effect
   - Strength
   - Radial intensity
   - Edge falloff
   - Barrel distortion
   - Fringing
   - ✅ Can be enabled/disabled

3. **📷 Depth of Field** - Focus/Blur effect
   - Focus distance
   - Focus range
   - Aperture
   - Bokeh size
   - Bokeh intensity/glow
   - Max blur
   - ✅ Can be enabled/disabled

4. **🎨 Color Grading** - Color adjustments
   - Exposure
   - Contrast
   - Brightness
   - Saturation
   - Temperature
   - Tint
   - ✅ Can be enabled/disabled

5. **🎬 Tone Mapping** - HDR→LDR conversion
   - Enable/disable
   - Exposure
   - Algorithm (ACES, Reinhard, Cineon, Linear)
   - ✅ Can be enabled/disabled

### What PostFX Does NOT Handle:

❌ Environment setup  
❌ HDR texture loading  
❌ Environment intensity  
❌ Scene lighting  
❌ Camera setup  

---

## 🌍 Scenery System

### Responsibility: **Scene, Environment, HDR, Lighting**

Located in: `src/STAGE/scenery.ts`

### Features:

1. **🌍 HDR Environment**
   - HDR texture loading (RGBE)
   - Environment intensity
   - Background rotation
   - Environment map rotation

2. **💡 Lighting**
   - Spotlight setup
   - Shadow configuration
   - Light positioning

3. **📷 Camera System**
   - Perspective camera
   - Orbit controls
   - Camera parameters

4. **🎬 Renderer Configuration**
   - Tone mapping mode (when PostFX disabled)
   - Output color space
   - Shadow maps

### PostFX Integration:

When PostFX is active, Scenery:
- Outputs **LINEAR HDR** (no tone mapping)
- Sets `renderer.outputColorSpace = LinearSRGBColorSpace`
- Lets PostFX handle tone mapping

---

## 🔄 How They Work Together

### Initialization Flow:

```typescript
// 1. Initialize Scenery (scene, camera, HDR environment)
this.scenery = new Scenery(renderer, domElement, config);
await this.scenery.init();

// 2. Initialize PostFX (post-processing pipeline)
this.postFX = new PostFX(renderer, scene, camera, config);
await this.postFX.init();

// 3. Switch Scenery to PostFX mode (output linear HDR)
this.scenery.disableToneMappingForPostFX();
```

### Rendering Flow:

```
┌─────────────────────────────────────┐
│ SCENERY                             │
│ • Renders scene with HDR env        │
│ • Outputs: Linear HDR (no tone map) │
└───────────────┬─────────────────────┘
                │ Linear HDR [0, ∞)
                ↓
┌─────────────────────────────────────┐
│ POSTFX PIPELINE                     │
│ ┌─────────────────────────────────┐ │
│ │ 1. Bloom (HDR glow)             │ │
│ ├─────────────────────────────────┤ │
│ │ 2. Chromatic Aberration         │ │
│ ├─────────────────────────────────┤ │
│ │ 3. Depth of Field (blur)        │ │
│ ├─────────────────────────────────┤ │
│ │ 4. Color Grading                │ │
│ ├─────────────────────────────────┤ │
│ │ 5. Tone Mapping (HDR→LDR)       │ │
│ ├─────────────────────────────────┤ │
│ │ 6. Gamma Correction (sRGB)      │ │
│ └─────────────────────────────────┘ │
│ • Outputs: sRGB LDR [0, 1]          │
└───────────────┬─────────────────────┘
                │ sRGB display-ready
                ↓
           🖥️ Display
```

---

## 🎮 Control Panels

### PostFX Panel: `✨ Post Effects`

Location: Top-right corner

**Controls:**
- ✨ Bloom Glow
- 🔴 Chromatic Aberration
- 📷 Depth of Field
- 🎨 Color Grading
- 🎬 Tone Mapping

**Does NOT control:** Environment, HDR intensity, lighting

### Future: Scenery Panel (Optional)

Could add a panel for environment controls:
- 🌍 HDR Environment
  - Environment intensity
  - Background rotation
  - Environment rotation
- 💡 Lighting
  - Spotlight intensity
  - Light position
  - Shadow settings

---

## 📝 API Reference

### PostFX Methods:

```typescript
// Enable/disable effects
postFX.enabled = true/false;

// Update individual effects
postFX.updateBloom(config);
postFX.updateChromaticAberration(config);
postFX.updateRadialLensAberration(config);
postFX.updateDepthOfField(config);
postFX.updateColorGrade(config);
postFX.updateToneMapping(config);

// Render
await postFX.render();

// Cleanup
postFX.dispose();
```

### Scenery Methods:

```typescript
// Environment control
scenery.updateEnvironment(config);

// Tone mapping (only used when PostFX disabled)
scenery.updateToneMapping(config);

// PostFX integration
scenery.disableToneMappingForPostFX();

// Camera control
scenery.updateCameraParams(config);
scenery.createRaycaster();

// Lighting control
scenery.updateSpotlight(params);
scenery.getSpotlight();

// Scene management
scenery.add(object);
scenery.remove(object);

// Rendering (when PostFX disabled)
await scenery.render();

// Cleanup
scenery.dispose();
```

---

## ✅ Checklist: Clean Separation

- [x] PostFX only contains post-processing effects
- [x] All effects can be enabled/disabled independently
- [x] Environment controls removed from PostFX
- [x] Environment controls removed from PostFX panel
- [x] Scenery handles all HDR/environment setup
- [x] Scenery outputs linear HDR when PostFX active
- [x] PostFX performs single tone mapping step
- [x] No double tone mapping
- [x] Clear documentation in both files
- [x] Proper TypeScript interfaces
- [x] Clean callbacks in APP.ts

---

## 🎯 Benefits of This Architecture

### Separation of Concerns
- PostFX: Visual effects processing
- Scenery: Scene and environment setup
- Each module has one clear responsibility

### Maintainability
- Easy to understand what each module does
- Easy to add new effects to PostFX
- Easy to modify environment settings in Scenery
- No confusion about where settings belong

### Flexibility
- Can enable/disable PostFX entirely
- Can enable/disable individual effects
- Can adjust environment separately from effects
- Future: Could create separate Scenery panel

### Correct Color Science
- Single tone mapping step (in PostFX)
- Linear HDR throughout pipeline
- Proper gamma correction
- No color space conflicts

---

## 🚀 Usage Example

```typescript
// Setup
const scenery = new Scenery(renderer, domElement, config);
await scenery.init();

const postFX = new PostFX(renderer, scenery.scene, scenery.camera, {
  bloom: { enabled: true, threshold: 0.8, strength: 0.5 },
  chromaticAberration: { enabled: false },
  depthOfField: { enabled: false },
  colorGrade: { enabled: false },
  toneMapping: { enabled: true, exposure: 1.0, mode: 'ACES' },
});

// Switch Scenery to PostFX mode
scenery.disableToneMappingForPostFX();

// Render loop
function render() {
  scenery.update(delta, elapsed);
  await postFX.render();
}

// Adjust environment at runtime
scenery.updateEnvironment({
  environmentIntensity: 0.5,
});

// Adjust effects at runtime
postFX.updateBloom({
  strength: 0.8,
});

// Enable/disable effects
postFX.updateDepthOfField({
  enabled: true,
  focusDistance: 0.3,
});
```

---

## Summary

✅ **PostFX**: Post-processing effects (bloom, aberration, DOF, color grading, tone mapping)  
✅ **Scenery**: Environment, HDR, lighting, scene setup  
✅ **Clean separation**: No overlap, clear responsibilities  
✅ **All effects**: Can be enabled/disabled independently  
✅ **Proper integration**: Work together seamlessly  

🎬 **Result**: Beautiful, maintainable, flexible visual pipeline! ✨

