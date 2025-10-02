# 📐 Panel Layout Reference

## Visual Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Application Window                            │
│                                                                       │
│  ┌─────────────┐                               ┌──────────────────┐ │
│  │ 📊          │                               │ 🎨 Visual Effects│ │
│  │ Performance │                               ├──────────────────┤ │
│  │             │                               │ ✨ Bloom         │ │
│  │ FPS: 60     │                               │ 🌈 Chromatic AB  │ │
│  └─────────────┘                               │ 🔍 Depth of Field│ │
│                                                 │ 🎨 Color Grading │ │
│  ┌─────────────┐                               │ 🌍 Environment   │ │
│  │ 🌊 Particle │                               └──────────────────┘ │
│  │   Physics   │                                                     │
│  ├─────────────┤                               ┌──────────────────┐ │
│  │ ⚛️ Particles│                               │ 🎵 Audio         │ │
│  │ ⚙️ Simulation│                              │   Reactivity     │ │
│  │ 🧪 Materials│                               ├──────────────────┤ │
│  │ 🌀 Forces   │                               │ 🎤 Source        │ │
│  │ 💫 Emitters │         Main 3D View         │ 🔬 Analysis      │ │
│  │ 🎨 Visual   │                               │ 🌐 Volumetric    │ │
│  │ 🔍 Debug    │                               │ 📊 Metrics       │ │
│  │ 📦 Presets  │                               └──────────────────┘ │
│  └─────────────┘                                                     │
│                                                                       │
│  ┌──────────────────────────────────┐                               │
│  │ ℹ️ Information                    │                               │
│  ├──────────────────────────────────┤                               │
│  │ WebGPU Particle Flow System      │                               │
│  │ Credits • Links • Documentation  │                               │
│  └──────────────────────────────────┘                               │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Panel Positions (Default)

### Left Side
```
┌─────────────────┐
│ 📊 Performance  │  Position: { x: 16, y: 16 }
│ (collapsed)     │  Size: ~300px wide
└─────────────────┘

┌─────────────────┐
│ 🌊 Particle     │  Position: { x: 16, y: 120 }
│    Physics      │  Size: ~320px wide
│ =============== │  Expanded: true
│ Main controls   │
│ for particle    │
│ simulation      │
└─────────────────┘

┌─────────────────┐
│ ℹ️ Information  │  Position: { x: 16, y: window.innerHeight - 320 }
│ (collapsed)     │  Size: ~500px max-width
└─────────────────┘
```

### Right Side
```
                    ┌──────────────────┐
                    │ 🎨 Visual Effects│  Position: { x: window.innerWidth - 340, y: 16 }
                    │ ================ │  Size: ~320px wide
                    │ Post-processing  │  Expanded: true
                    │ controls         │
                    └──────────────────┘

                    ┌──────────────────┐
                    │ 🎵 Audio         │  Position: { x: window.innerWidth - 340, y: 280 }
                    │    Reactivity    │  Size: ~320px wide
                    │ ================ │  Expanded: true
                    │ Sound analysis   │
                    │ & visualization  │
                    └──────────────────┘
```

## Panel Hierarchy

### 🌊 Particle Physics Panel
```
🌊 Particle Physics
├─ ⚛️ Particles (expanded)
│  ├─ count
│  ├─ size
│  └─ point mode
│
├─ ⚙️ Simulation (expanded)
│  ├─ ▶️ run
│  ├─ speed
│  ├─ gravity
│  └─ advanced
│     ├─ turbulence
│     └─ density
│
├─ 🧪 Materials (collapsed)
│  └─ type (Fluid, Elastic, Sand, Snow, etc.)
│
├─ 🌀 Force Fields (collapsed)
│  ├─ ➕ add attractor
│  └─ presets
│
├─ 💫 Emitters (collapsed)
│  ├─ ➕ add emitter
│  └─ presets
│
├─ 🎨 Visual (collapsed)
│  ├─ color mode
│  └─ ✨ bloom
│
├─ 🔍 Debug & Metrics (collapsed)
│  ├─ force fields
│  ├─ emitters
│  ├─ particles
│  └─ sim FPS
│
└─ 📦 Presets (collapsed)
   ├─ 💧 water fountain
   ├─ ❄️ snow storm
   ├─ 🌪️ tornado
   ├─ 💥 explosion
   └─ 🌀 galaxy
```

### 🎨 Visual Effects Panel
```
🎨 Visual Effects
├─ ✨ Bloom (expanded)
│  ├─ enable
│  ├─ threshold
│  ├─ strength
│  ├─ radius
│  ├─ quality
│  └─ smoothing
│
├─ 🌈 Chromatic Aberration (expanded)
│  ├─ enable
│  ├─ strength
│  └─ radial
│
├─ 🔍 Depth of Field (expanded)
│  ├─ enable
│  ├─ blur size
│  ├─ max blur
│  └─ falloff
│
├─ 🎨 Color Grading (collapsed)
│  ├─ enable
│  ├─ exposure
│  ├─ contrast
│  ├─ saturation
│  ├─ brightness
│  ├─ temperature
│  └─ tint
│
└─ 🌍 Environment (collapsed)
   ├─ intensity
   └─ exposure
```

### 🎵 Audio Reactivity Panel
```
🎵 Audio Reactivity
├─ 🎤 Audio Source (expanded)
│  ├─ enabled
│  ├─ source (mic/file)
│  ├─ volume
│  ├─ load file
│  └─ play/pause
│
├─ 🔬 Analysis Settings (collapsed)
│  ├─ FFT size
│  ├─ smoothing
│  ├─ dynamic range
│  ├─ frequency gains
│  ├─ beat detection
│  └─ reactivity influence
│
├─ 🌐 Volumetric Visualization (collapsed)
│  ├─ enabled
│  ├─ mode
│  ├─ transform
│  ├─ appearance
│  ├─ color
│  ├─ animation
│  └─ frequency influence
│
└─ 📊 Realtime Metrics (expanded)
   ├─ bass
   ├─ mid
   ├─ treble
   ├─ overall
   ├─ beat
   └─ peak (Hz)
```

## Responsive Behavior

### Desktop (>768px)
- Panels positioned absolutely
- Fixed widths (~320px)
- Full feature set visible
- Smooth dragging

### Mobile (<768px)
```
┌──────────────┐
│ 📊 FPS       │  Top-left (collapsed)
└──────────────┘

┌──────────────┐
│ 🌊 Physics   │  Left side (collapsed by default)
└──────────────┘

   Main View
   (centered)

┌──────────────┐
│ 🎨 Visual FX │  Collapsed, accessible via tap
└──────────────┘

┌──────────────┐
│ 🎵 Audio     │  Collapsed, accessible via tap
└──────────────┘

┌──────────────┐
│ ℹ️ Info      │  Bottom (collapsed)
└──────────────┘
```

## Drag Zones

```
┌─────────────────────────────┐
│ ◄ DRAGGABLE: Title Bar  ►  │ ← Click and drag here
├─────────────────────────────┤
│ Content Area                │
│                             │
│ ┌────────────────────────┐  │
│ │◄ DRAGGABLE: Folder ► │  │ ← Or drag folder titles
│ ├────────────────────────┤  │
│ │ Control 1              │  │
│ │ Control 2              │  │
│ └────────────────────────┘  │
│                             │
└─────────────────────────────┘
```

## Color Coding

### Panel Themes
- **Physics** 🌊: Blue/Cyan accents
- **Visual FX** 🎨: Purple/Magenta accents (default theme)
- **Audio** 🎵: Yellow/Orange accents
- **Performance** 📊: Green accents
- **Info** ℹ️: Neutral/Gray

### State Colors
- **Active**: Bright gradient (`#667eea` → `#764ba2`)
- **Hover**: Enhanced glow
- **Disabled**: Muted opacity (0.5)
- **Readonly**: Subtle background
- **Error**: Red tint (if validation added)

## Spacing Guidelines

```
Panel Padding:
├─ Top: 16px
├─ Right: 16px
├─ Bottom: 16px
└─ Left: 16px

Folder Margins:
├─ Between folders: 8px
└─ Nested indent: 12px

Control Spacing:
├─ Label-to-input: 8px
├─ Between controls: 4px
└─ Section separator: 16px
```

## Z-Index Layers

```
Layer 3000: Modal overlays (future)
Layer 2000: Dragging panel
Layer 1000: Normal panels
Layer 900:  Background panels
Layer 0:    Main 3D view
```

## Accessibility Considerations

### Keyboard Navigation
- Tab through controls
- Enter to activate buttons
- Arrow keys for sliders
- Space for checkboxes

### Screen Readers
- All controls have labels
- Semantic HTML structure
- ARIA attributes (consider adding)
- Logical tab order

### Contrast
- Text: 4.5:1 minimum ratio
- Interactive elements: 3:1 minimum
- Focus indicators: Clear outlines

## Animation Timing

```
Panel Appear:    0.3s ease-out
Panel Disappear: 0.2s ease-in
Drag Transform:  0ms (instant, smooth 60fps)
Hover Effect:    0.2s ease
Button Press:    0.1s ease
Folder Toggle:   0.2s ease
```

## Performance Targets

- **Panel Creation**: < 10ms
- **Drag FPS**: 60 FPS constant
- **Control Update**: < 5ms
- **Callback Latency**: < 1ms
- **Memory per Panel**: < 100KB

## Best Layout Practices

### DO ✅
- Group related controls
- Use consistent spacing
- Collapse advanced sections
- Provide visual hierarchy
- Use emoji for quick scanning
- Keep labels short and clear

### DON'T ❌
- Overcrowd panels
- Nest folders too deeply
- Mix unrelated controls
- Use inconsistent spacing
- Hide essential controls
- Use unclear labels

---

**Layout Version**: 1.0  
**Screen Tested**: 1920x1080, 1366x768, 768x1024, 375x667  
**Last Updated**: January 2025

