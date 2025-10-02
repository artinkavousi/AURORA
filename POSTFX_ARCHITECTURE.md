# 🎨 Post-FX System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FlowApp (APP.ts)                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Initialization                          │  │
│  │  1. Load config with post-FX parameters                   │  │
│  │  2. Create PostFX instance with all effects               │  │
│  │  3. Setup PostFXPanel with callbacks                      │  │
│  │  4. Connect callbacks to PostFX update methods            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Update Loop                             │  │
│  │  1. Update scene (particles, camera, lights)              │  │
│  │  2. Render via PostFX pipeline                            │  │
│  │  3. User adjusts panel → callbacks fire → uniforms update │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      PostFX (postfx.ts)                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Uniform Management                        │  │
│  │  • bloomUniforms        (enabled, threshold, strength...)  │  │
│  │  • caUniforms           (enabled, strength, radial...)     │  │
│  │  • lensUniforms         (enabled, distortion, vignette...) │  │
│  │  • colorGradeUniforms   (enabled, exposure, contrast...)   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              TSL Effect Pipeline (GPU)                     │  │
│  │                                                            │  │
│  │  Step 1: MRT Scene Pass                                   │  │
│  │  ┌─────────────────────────────────────┐                 │  │
│  │  │  pass(scene, camera)                │                 │  │
│  │  │  → output (scene color)             │                 │  │
│  │  │  → bloomIntensity (per-object mask) │                 │  │
│  │  └─────────────────────────────────────┘                 │  │
│  │                  ↓                                         │  │
│  │  Step 2: Advanced Bloom                                   │  │
│  │  ┌─────────────────────────────────────┐                 │  │
│  │  │  1. Threshold extraction (bright)   │                 │  │
│  │  │  2. Multi-scale Kawase blur         │                 │  │
│  │  │     → Level 1: radius × 1           │                 │  │
│  │  │     → Level 2: radius × 2           │                 │  │
│  │  │     → Level 3: radius × 3           │                 │  │
│  │  │  3. Weighted blend                  │                 │  │
│  │  │  4. Apply strength                  │                 │  │
│  │  │  5. Mask with bloomIntensity        │                 │  │
│  │  │  6. Additive blend to scene         │                 │  │
│  │  └─────────────────────────────────────┘                 │  │
│  │                  ↓                                         │  │
│  │  Step 3: Chromatic Aberration                             │  │
│  │  ┌─────────────────────────────────────┐                 │  │
│  │  │  1. Calculate radial distance       │                 │  │
│  │  │  2. Sample R channel (offset +)     │                 │  │
│  │  │  3. Sample G channel (offset 0)     │                 │  │
│  │  │  4. Sample B channel (offset -)     │                 │  │
│  │  │  5. Conditional blend (if enabled)  │                 │  │
│  │  └─────────────────────────────────────┘                 │  │
│  │                  ↓                                         │  │
│  │  Step 4: Lens Distortion & Vignette                       │  │
│  │  ┌─────────────────────────────────────┐                 │  │
│  │  │  1. Convert to polar coords         │                 │  │
│  │  │  2. Apply barrel/pincushion         │                 │  │
│  │  │  3. Sample distorted UV             │                 │  │
│  │  │  4. Calculate radial vignette       │                 │  │
│  │  │  5. Apply darkening                 │                 │  │
│  │  │  6. Conditional blend (if enabled)  │                 │  │
│  │  └─────────────────────────────────────┘                 │  │
│  │                  ↓                                         │  │
│  │  Step 5: Color Grading                                    │  │
│  │  ┌─────────────────────────────────────┐                 │  │
│  │  │  1. Exposure adjustment             │                 │  │
│  │  │  2. Brightness shift                │                 │  │
│  │  │  3. Contrast around mid-gray        │                 │  │
│  │  │  4. Saturation (luminance-based)    │                 │  │
│  │  │  5. Temperature/tint shift          │                 │  │
│  │  │  6. Clamp to valid range            │                 │  │
│  │  └─────────────────────────────────────┘                 │  │
│  │                  ↓                                         │  │
│  │  Step 6: Final Output                                     │  │
│  │  ┌─────────────────────────────────────┐                 │  │
│  │  │  renderOutput() → Screen            │                 │  │
│  │  └─────────────────────────────────────┘                 │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↑                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Update Methods                            │  │
│  │  • updateBloom(config)                                    │  │
│  │  • updateChromaticAberration(config)                      │  │
│  │  • updateLensDistortion(config)                           │  │
│  │  • updateColorGrade(config)                               │  │
│  │  → All modify uniforms in real-time                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                ↑
┌─────────────────────────────────────────────────────────────────┐
│                  PostFXPanel (PANELpostfx.ts)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                      UI Folders                            │  │
│  │                                                            │  │
│  │  ✨ Bloom                                                  │  │
│  │  ├─ enable          [x]                                   │  │
│  │  ├─ threshold       [━━━━━○━━━━] 0.70                     │  │
│  │  ├─ strength        [━━━━○━━━━━] 0.80                     │  │
│  │  ├─ radius          [━━━○━━━━━━] 1.00                     │  │
│  │  ├─ quality         [━━━○━━━━━━] 3                        │  │
│  │  └─ smoothing       [━○━━━━━━━━] 0.05                     │  │
│  │                                                            │  │
│  │  🌈 Chromatic Aberration                                  │  │
│  │  ├─ enable          [ ]                                   │  │
│  │  ├─ strength        [━○━━━━━━━━] 0.003                    │  │
│  │  └─ radial          [━━━━━○━━━━] 1.20                     │  │
│  │                                                            │  │
│  │  🔍 Lens & Vignette                                       │  │
│  │  ├─ enable          [ ]                                   │  │
│  │  ├─ distortion      [━━━━━○━━━━] 0.00                     │  │
│  │  ├─ vignette        [━━○━━━━━━━] 0.30                     │  │
│  │  └─ v-radius        [━━━━━○━━━━] 1.00                     │  │
│  │                                                            │  │
│  │  🎨 Color Grade                                           │  │
│  │  ├─ enable          [x]                                   │  │
│  │  ├─ exposure        [━━━━━○━━━━] 1.00                     │  │
│  │  ├─ contrast        [━━━━━○━━━━] 1.05                     │  │
│  │  ├─ saturation      [━━━━━━○━━━] 1.10                     │  │
│  │  ├─ brightness      [━━━━━○━━━━] 0.00                     │  │
│  │  ├─ temperature     [━━━━━○━━━━] 0.00                     │  │
│  │  └─ tint            [━━━━━○━━━━] 0.00                     │  │
│  │                                                            │  │
│  │  🌍 Environment                                           │  │
│  │  ├─ intensity       [━━━○━━━━━━] 0.50                     │  │
│  │  └─ exposure        [━━━━○━━━━━] 0.66                     │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Callbacks                               │  │
│  │  • onBloomChange                                          │  │
│  │  • onChromaticAberrationChange                            │  │
│  │  • onLensDistortionChange                                 │  │
│  │  • onColorGradeChange                                     │  │
│  │  • onEnvironmentChange                                    │  │
│  │  → Fire on any slider/toggle change                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Effect Modules (TSL Nodes)                    │
│                                                                  │
│  kawaseblur.ts                                                  │
│  ├─ kawaseBlur(texture, direction, offset)                     │
│  │  • Samples 4 texels in + pattern                            │
│  │  • Separable (H/V passes)                                   │
│  └─ kawaseBlurMultiPass(texture, iterations, scale)            │
│     • Multiple blur passes                                      │
│     • Exponential radius growth                                │
│                                                                  │
│  advancedbloom.ts                                               │
│  ├─ bloomThreshold(texture, threshold, smoothing)              │
│  │  • Luminance calculation                                    │
│  │  • Smooth knee threshold                                    │
│  ├─ advancedBloom(texture, threshold, strength, radius, levels)│
│  │  • Multi-scale blur combination                             │
│  │  • Weighted blending                                        │
│  └─ bloomBlend(scene, bloom, strength)                         │
│     • Additive blend mode                                      │
│                                                                  │
│  chromaticaberration.ts                                         │
│  └─ chromaticAberration(texture, strength, radialIntensity)    │
│     • Radial distance calculation                              │
│     • RGB channel separation                                   │
│     • Distance-based falloff                                   │
│                                                                  │
│  lensdistortion.ts                                              │
│  ├─ lensDistortion(texture, distortion, vigStr, vigRad)        │
│  │  • Polar coordinate transform                               │
│  │  • Barrel/pincushion effect                                 │
│  │  • Radial vignette                                          │
│  └─ vignette(texture, strength, radius)                        │
│     • Vignette only (no distortion)                            │
│                                                                  │
│  colorgrade.ts                                                  │
│  └─ colorGrade(texture, exp, con, sat, bri, temp, tint)        │
│     • Exposure multiplication                                  │
│     • Brightness addition                                      │
│     • Contrast around mid-gray                                 │
│     • Saturation via luminance                                 │
│     • Temperature/tint RGB shifts                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
User Interaction
      ↓
Panel Control Changed
      ↓
Callback Fired (PANELpostfx.ts)
      ↓
Update Method Called (postfx.ts)
      ↓
Uniform Value Changed (GPU memory)
      ↓
Next Frame Render
      ↓
TSL Shader Reads Uniform
      ↓
Effect Applied
      ↓
Screen Output
```

## Performance Flow

```
┌──────────────────┐
│   Scene Render   │  Base: ~5-10ms
└────────┬─────────┘
         ↓
┌──────────────────┐
│   Bloom Pass     │  +2.5ms (3 levels)
│  ┌────────────┐  │
│  │ Threshold  │  │  +0.2ms
│  └──────┬─────┘  │
│         ↓        │
│  ┌────────────┐  │
│  │ Blur L1    │  │  +0.8ms
│  └──────┬─────┘  │
│         ↓        │
│  ┌────────────┐  │
│  │ Blur L2    │  │  +0.8ms
│  └──────┬─────┘  │
│         ↓        │
│  ┌────────────┐  │
│  │ Blur L3    │  │  +0.8ms
│  └──────┬─────┘  │
│         ↓        │
│  ┌────────────┐  │
│  │   Blend    │  │  +0.1ms
│  └────────────┘  │
└────────┬─────────┘
         ↓
┌──────────────────┐
│   Chromatic AB   │  +0.1ms (when enabled)
└────────┬─────────┘
         ↓
┌──────────────────┐
│  Lens Distortion │  +0.2ms (when enabled)
└────────┬─────────┘
         ↓
┌──────────────────┐
│   Color Grade    │  +0.1ms
└────────┬─────────┘
         ↓
┌──────────────────┐
│      Output      │
└──────────────────┘

Total Post-FX: ~2.9ms
Total Frame: ~8-13ms
Target: 16.67ms (60fps) ✓
        8.33ms (120fps) ✓ (with headroom)
```

## Memory Architecture

```
┌─────────────────────────────────────┐
│            GPU Memory                │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Uniform Buffers               │ │
│  │  • bloom (4 floats)            │ │
│  │  • chromaticAb (3 floats)      │ │
│  │  • lensDistortion (4 floats)   │ │
│  │  • colorGrade (7 floats)       │ │
│  │  Total: ~72 bytes              │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Render Targets (MRT)          │ │
│  │  • output: RGBA16F             │ │
│  │  • bloomIntensity: R16F        │ │
│  │  Size: 1920×1080×6 bytes       │ │
│  │  Total: ~12.4 MB               │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Intermediate Textures         │ │
│  │  • Bloom blur passes           │ │
│  │  • Downsampled levels          │ │
│  │  Total: ~8-15 MB               │ │
│  └────────────────────────────────┘ │
│                                      │
└─────────────────────────────────────┘

Total GPU Memory: ~20-28 MB
```

## Configuration Flow

```
config.ts (defaultConfig)
      ↓
FlowApp.init() reads config
      ↓
PostFX constructor receives config
      ↓
Uniforms initialized with values
      ↓
PostFXPanel constructor receives config
      ↓
UI controls bound to config properties
      ↓
User changes control
      ↓
config property updated
      ↓
Callback fired with new config
      ↓
PostFX.updateX() method called
      ↓
Uniform.value updated
      ↓
GPU shader reads new value next frame
```

## Extensibility

Adding a new effect is simple:

1. Create `effects/neweffect.ts` with TSL node
2. Add config interface to `config.ts`
3. Add uniforms to `postfx.ts` constructor
4. Add effect to pipeline chain
5. Add update method to `postfx.ts`
6. Add controls to `PANELpostfx.ts`
7. Add callback to `APP.ts`

Each effect is isolated and composable!

---

**Architecture Highlights**:
- 🎯 **Separation of Concerns** - Effects, pipeline, UI, config all isolated
- ⚡ **Performance** - Conditional rendering, single pass, GPU-optimized
- 🔧 **Extensible** - Easy to add new effects
- 🎨 **Flexible** - 20+ parameters for artistic control
- 📊 **Observable** - Real-time updates without rebuilds

