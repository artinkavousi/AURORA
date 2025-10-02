# 🎨 Unified Panel Pipeline Architecture v2.0

## Overview

This document describes the **unified, glassmorphism-styled control panel system** that powers the Flow application. The architecture follows a **parent-child pattern** where the **Dashboard** acts as the central UI coordinator, and three specialized panels handle domain-specific controls.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        🌐 Browser DOM                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  <head>                                              │   │
│  │    <style id="flow-glassmorphism-styles">           │   │
│  │      /* 900+ lines of premium glassmorphism CSS */  │   │
│  │    </style>                                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  <body>                                              │   │
│  │                                                       │   │
│  │    ╔══════════════════════════════════════════╗     │   │
│  │    ║  Dashboard (Main Controller)            ║     │   │
│  │    ║  • Injects glassmorphism styles          ║     │   │
│  │    ║  • Creates panel containers              ║     │   │
│  │    ║  • Manages draggability                  ║     │   │
│  │    ╚══════════════════════════════════════════╝     │   │
│  │           │                                          │   │
│  │           ├─────────────┬────────────┬──────────┐   │   │
│  │           ▼             ▼            ▼          ▼   │   │
│  │      ┌────────┐   ┌─────────┐  ┌────────┐  ┌─────┐│   │
│  │      │📊 FPS  │   │ℹ️ Info │  │🌊 Phys │  │🎨 FX││   │
│  │      │Monitor │   │Credits  │  │Physics │  │Post ││   │
│  │      └────────┘   └─────────┘  └────────┘  └─────┘│   │
│  │                                       │             │   │
│  │                                       ▼             │   │
│  │                                  ┌─────────┐       │   │
│  │                                  │🎵 Audio │       │   │
│  │                                  │Reactive │       │   │
│  │                                  └─────────┘       │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

### 1. 🎛️ Dashboard (Parent/Controller)

**File:** `flow/src/PANEL/dashboard.ts`

**Responsibilities:**
- ✅ Inject glassmorphism CSS globally
- ✅ Create panel containers with positioning
- ✅ Enable draggable functionality
- ✅ Manage panel lifecycle
- ✅ Provide FPS monitoring
- ✅ Display app information

**Key Methods:**
```typescript
class Dashboard {
  constructor(options: DashboardOptions)
  
  // Core API
  public createPanel(id: string, config: PanelConfig): { pane: Pane; container: HTMLDivElement }
  
  // Internal
  private injectStyles(): HTMLStyleElement
  private createFPSPanel(): void
  private createInfoPanel(): void
  private makeDraggable(container: HTMLDivElement, pane: Pane): void
  
  // Accessors
  public updateFPS(): void
  public dispose(): void
}
```

**Initialization:**
```typescript
// In APP.ts
this.dashboard = new Dashboard({ 
  showInfo: true, 
  showFPS: true,
  enableGlassmorphism: true // default
});
```

### 2. 🌊 PhysicPanel (Child)

**File:** `flow/src/PARTICLESYSTEM/PANELphysic.ts`

**Responsibilities:**
- ✅ Particle physics parameters
- ✅ Material type selection
- ✅ Force field management
- ✅ Emitter controls
- ✅ Boundary configuration
- ✅ Performance metrics

**Panel Sections:**
1. **Performance** - FPS, particle count, kernel time
2. **Simulation** - Timestep, iterations, gravity
3. **Particles** - Count, size, rendering mode
4. **Materials** - Fluid, elastic, snow, sand properties
5. **Force Fields** - Gravity wells, vortices, directional
6. **Emitters** - Particle spawners
7. **Boundaries** - Collision detection
8. **Visuals** - Debug visualization
9. **Scene Presets** - Quick configurations

**Initialization:**
```typescript
// In APP.ts
this.physicPanel = new PhysicPanel(this.dashboard, this.config, {
  onParticleCountChange: (count) => { /* ... */ },
  onMaterialChange: () => { /* ... */ },
  onForceFieldsChange: () => { /* ... */ },
  // ... other callbacks
});
```

### 3. 🎨 PostFXPanel (Child)

**File:** `flow/src/POSTFX/PANELpostfx.ts`

**Responsibilities:**
- ✅ Post-processing effects
- ✅ Camera and environment settings
- ✅ Color grading
- ✅ Tone mapping
- ✅ Bloom, DOF, lens effects

**Panel Sections:**
1. **Bloom** - Threshold, intensity, radius
2. **Lens Aberration** - Chromatic distortion
3. **Depth of Field** - Focus distance, bokeh
4. **Color Grading** - Exposure, saturation, temperature
5. **HDR Tone Mapping** - Tone curve, white point
6. **Environment** - HDR, exposure, rotation

**Initialization:**
```typescript
// In APP.ts
this.postFXPanel = new PostFXPanel(this.dashboard, this.config, {
  onBloomChange: (config) => this.postFX.updateBloom(config),
  onRadialLensAberrationChange: (config) => { /* ... */ },
  onDepthOfFieldChange: (config) => { /* ... */ },
  // ... other callbacks
});
```

### 4. 🎵 AudioPanel (Child)

**File:** `flow/src/AUDIO/PANELsoundreactivity.ts`

**Responsibilities:**
- ✅ Audio input selection
- ✅ Frequency analysis
- ✅ Reactivity mapping
- ✅ Volumetric visualization
- ✅ Live audio metrics

**Panel Sections:**
1. **Live Audio Metrics** - RMS, peak, bass, treble
2. **Audio Input** - Source selection, enable/disable
3. **Reactivity Influence** - Particle scale, color, force
4. **Analysis Settings** - FFT size, smoothing
5. **Volumetric Viz** - 3D audio visualization

**Initialization:**
```typescript
// In APP.ts
this.audioPanel = new AudioPanel(this.dashboard, this.config, {
  onAudioStart: () => this.soundReactivity.start(),
  onAudioStop: () => this.soundReactivity.stop(),
  onConfigChange: (config) => { /* ... */ },
  // ... other callbacks
});
```

## Glassmorphism Style System

### CSS Architecture

The glassmorphism design is implemented through a comprehensive CSS injection system:

**Key Features:**
- 🌫️ **24px blur** with 200% saturation
- 🎨 **Gradient backgrounds** (slate blue to dark)
- ✨ **Multi-layered shadows** (depth + glow)
- 🔲 **20px border radius**
- 🎭 **Hover animations** (lift + glow)
- 🖱️ **Drag interactions** (scale + enhanced shadow)
- 🌈 **Custom knobs** for sliders with gradients
- 📱 **Responsive** and accessible

### CSS Selector Strategy

The system uses **multiple fallback selectors** to ensure compatibility:

```css
/* Primary Tweakpane v4 selectors */
.tp-dfwv,
.tp-rotv,

/* Generic Tweakpane selector */
[class*="tp-"][class*="v"] > div:first-child,

/* Container-based selector */
.panel-container > div:first-child {
  /* Glassmorphism styles */
}
```

### Runtime Style Application

As a **fallback**, the `createPanel()` method also applies styles directly:

```typescript
requestAnimationFrame(() => {
  const tweakpaneRoot = container.querySelector('[class*="tp-"]');
  if (tweakpaneRoot && this.enableGlassmorphism) {
    element.style.backdropFilter = 'blur(24px) saturate(200%) brightness(1.1)';
    element.style.background = 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.75) 100%)';
    // ... more styles
  }
});
```

This ensures glassmorphism works even if CSS selectors fail.

## Data Flow

### Configuration Flow

```
┌──────────────┐
│ config.ts    │ ← Central source of truth
└──────┬───────┘
       │
       ├──────────────┬──────────────┬───────────────┐
       ▼              ▼              ▼               ▼
   APP.init()    PhysicPanel   PostFXPanel    AudioPanel
       │              │              │               │
       ▼              ▼              ▼               ▼
   Creates       Reads config   Reads config   Reads config
   Dashboard     Creates UI     Creates UI     Creates UI
       │              │              │               │
       └──────────────┴──────────────┴───────────────┘
                      │
                      ▼
            User changes parameter
                      │
                      ▼
            Callback fired (e.g., onBloomChange)
                      │
                      ▼
            APP updates corresponding module
                      │
                      ▼
            Visual change on screen
```

### Panel Creation Flow

```typescript
// Step 1: Dashboard creates panel
const { pane, container } = dashboard.createPanel('physics', {
  title: '🌊 Particle Physics',
  position: { x: 16, y: 120 },
  expanded: true,
  draggable: true,
  collapsible: true,
});

// Step 2: Panel class receives pane and builds UI
class PhysicPanel {
  constructor(dashboard: Dashboard, config: FlowConfig, callbacks: Callbacks) {
    const { pane } = dashboard.createPanel('physics', { /* config */ });
    this.pane = pane;
    this.setupUI(); // Build folders and controls
  }
}

// Step 3: User interacts → Callback fired
pane.addBinding(config, 'bloomIntensity').on('change', (ev) => {
  callbacks.onBloomChange?.({ intensity: ev.value });
});

// Step 4: APP handles callback
this.postFXPanel = new PostFXPanel(this.dashboard, this.config, {
  onBloomChange: (config) => this.postFX.updateBloom(config),
});
```

## Panel Positioning

Default panel positions (can be customized):

| Panel      | Position       | Initial State |
|------------|----------------|---------------|
| FPS        | (16, 16)       | Collapsed     |
| Info       | (16, bottom)   | Collapsed     |
| PhysicPanel| (16, 120)      | Expanded      |
| PostFXPanel| (320, 120)     | Expanded      |
| AudioPanel | (624, 120)     | Expanded      |

## Customization Guide

### Adding a New Panel

1. **Create panel class:**
```typescript
// src/PANEL/MyNewPanel.ts
import type { Dashboard } from './dashboard';

export class MyNewPanel {
  private pane: any;
  
  constructor(dashboard: Dashboard, config: MyConfig) {
    const { pane } = dashboard.createPanel('myPanel', {
      title: '🚀 My Panel',
      position: { x: 16, y: 400 },
      expanded: true,
    });
    
    this.pane = pane;
    this.buildUI();
  }
  
  private buildUI() {
    const folder = this.pane.addFolder({ title: 'Settings' });
    // Add controls
  }
}
```

2. **Integrate in APP.ts:**
```typescript
import { MyNewPanel } from './PANEL/MyNewPanel';

// In FlowApp class
private myPanel!: MyNewPanel;

// In init() method
this.myPanel = new MyNewPanel(this.dashboard, this.config);
```

### Customizing Glassmorphism

**Option 1: Disable for specific panel:**
```typescript
// In your panel class
const element = container.querySelector('[class*="tp-"]') as HTMLElement;
element.classList.add('no-glassmorphism');
```

Then add CSS:
```css
.no-glassmorphism {
  backdrop-filter: none !important;
  background: rgba(0, 0, 0, 0.9) !important;
}
```

**Option 2: Global disable:**
```typescript
this.dashboard = new Dashboard({ 
  enableGlassmorphism: false 
});
```

**Option 3: Custom color scheme:**

Edit `dashboard.ts` → `injectStyles()` → Modify color values:
```css
background: linear-gradient(
  135deg,
  rgba(15, 23, 42, 0.85) 0%,  /* Change these RGB values */
  rgba(15, 23, 42, 0.75) 100%
);
```

## Performance Considerations

- **CSS Injection:** Happens once on Dashboard construction
- **Runtime Styles:** Applied per-panel using `requestAnimationFrame`
- **Drag Performance:** Uses CSS transforms (GPU-accelerated)
- **Shadow Rendering:** Multi-layered shadows can impact performance on low-end devices

**Optimization Tips:**
1. Reduce `backdrop-filter` blur value (e.g., 12px instead of 24px)
2. Simplify `box-shadow` (remove extra layers)
3. Disable animations: Set all `transition` to `none`

## Debugging

### Check if styles are injected
```javascript
document.getElementById('flow-glassmorphism-styles')
```

### Check if panels exist
```javascript
document.querySelectorAll('.panel-container')
```

### Check Tweakpane elements
```javascript
document.querySelectorAll('[class*="tp-"]')
```

### Force apply glassmorphism
```javascript
document.querySelectorAll('[class*="tp-"]').forEach(el => {
  el.style.backdropFilter = 'blur(24px) saturate(200%) brightness(1.1)';
  el.style.background = 'linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(15, 23, 42, 0.75))';
  el.style.borderRadius = '20px';
});
```

## File Structure

```
flow/src/
├── PANEL/
│   └── dashboard.ts           ← Parent controller
├── PARTICLESYSTEM/
│   └── PANELphysic.ts         ← Child panel (physics)
├── POSTFX/
│   └── PANELpostfx.ts         ← Child panel (effects)
├── AUDIO/
│   └── PANELsoundreactivity.ts ← Child panel (audio)
└── APP.ts                     ← Orchestrator
```

## Summary

The unified panel pipeline provides:

✅ **Centralized styling** via Dashboard  
✅ **Modular panels** with clear separation  
✅ **Glassmorphism design** with fallbacks  
✅ **Drag-and-drop** functionality  
✅ **Collapsible sections** for organization  
✅ **Type-safe callbacks** for reactivity  
✅ **Extensible architecture** for new panels  

This architecture ensures **maintainability**, **scalability**, and a **premium user experience**.

