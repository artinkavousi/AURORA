# 🎨 Glassmorphism Panel System Guide

## Overview

The control panel system uses **Tweakpane** with a custom **glassmorphism** styling layer, providing:

- ✨ **Beautiful glassmorphism aesthetics** with backdrop blur and transparency
- 🖱️ **Fully draggable panels** that can be repositioned anywhere on screen
- 📦 **Collapsible sections** for organizing complex controls
- 🎯 **Independent modular panels** for different system components
- 📱 **Mobile responsive** with touch support
- 🌈 **Gradient accents** and smooth animations
- ⚡ **High performance** with GPU-accelerated effects

## Architecture

### Dashboard (Core)
**File**: `src/PANEL/dashboard.ts`

The `Dashboard` class is the central UI controller that:
- Injects glassmorphism CSS styles globally
- Creates and manages independent draggable panels
- Provides FPS monitoring and info panels
- Handles panel lifecycle (creation, disposal)

### Control Panels

#### 1. **Particle Physics Panel** 🌊
**File**: `src/PARTICLESYSTEM/PANELphysic.ts`

Controls for particle simulation:
- ⚛️ Particle count and size
- ⚙️ Simulation speed and physics parameters
- 🧪 Material types (Fluid, Elastic, Sand, Snow, etc.)
- 🌀 Force fields (Attractors, Repellers, Vortex, Wind)
- 💫 Particle emitters with various patterns
- 🎨 Visual settings (color modes, rendering)
- 🔍 Debug metrics and performance monitoring
- 📦 Presets (Water Fountain, Snow Storm, Tornado, etc.)

**Position**: Top-left (below FPS panel)

#### 2. **Visual Effects Panel** 🎨
**File**: `src/POSTFX/PANELpostfx.ts`

Post-processing controls:
- ✨ Bloom (threshold, strength, radius, quality)
- 🌈 Chromatic Aberration (radial lens effects)
- 🔍 Depth of Field (radial blur, vignette)
- 🎨 Color Grading (exposure, contrast, saturation, temperature, tint)
- 🌍 Environment (lighting intensity, tone mapping)

**Position**: Top-right

#### 3. **Audio Reactivity Panel** 🎵
**File**: `src/AUDIO/PANELsoundreactivity.ts`

Audio analysis and visualization:
- 🎤 Audio Source (microphone or file input)
- 🔬 Analysis Settings (FFT size, smoothing, frequency bands)
- 🌐 Volumetric Visualization (multiple modes and styles)
- 📊 Real-time Metrics (bass, mid, treble, beats, frequency)
- 🎛️ Reactivity Influence (particles, volumetric, color, post-FX)

**Position**: Top-right (below Visual Effects panel)

## Creating a New Panel

### Step 1: Define Panel Class

```typescript
import type { Dashboard } from '../PANEL/dashboard';
import type { FlowConfig } from '../config';

export interface MyPanelCallbacks {
  onSettingChange?: (value: any) => void;
}

export class MyPanel {
  private pane: any;
  private config: FlowConfig;
  private callbacks: MyPanelCallbacks;

  constructor(
    dashboard: Dashboard,
    config: FlowConfig,
    callbacks: MyPanelCallbacks = {}
  ) {
    this.config = config;
    this.callbacks = callbacks;

    // Create standalone draggable panel
    const { pane } = dashboard.createPanel('my-panel', {
      title: '🚀 My Feature',
      position: { x: 400, y: 16 },
      expanded: true,
      draggable: true,
      collapsible: true,
    });

    this.pane = pane;
    this.buildControls();
  }

  private buildControls(): void {
    // Add folders and controls
    const folder = this.pane.addFolder({
      title: '⚙️ Settings',
      expanded: true,
    });

    folder.addBinding(this.config.mySettings, 'someValue', {
      label: 'Value',
      min: 0,
      max: 100,
      step: 1,
    }).on('change', (ev: any) => {
      this.callbacks.onSettingChange?.(ev.value);
    });
  }

  public dispose(): void {
    this.pane.dispose();
  }
}
```

### Step 2: Integrate in APP.ts

```typescript
// In FlowApp class
private myPanel!: MyPanel;

// In init() method
this.myPanel = new MyPanel(this.dashboard, this.config, {
  onSettingChange: (value) => {
    // Handle changes
    console.log('Setting changed:', value);
  },
});

// In dispose() method
this.myPanel.dispose();
```

## Panel Configuration

### Position Options

```typescript
dashboard.createPanel('panel-id', {
  title: '🎯 Panel Title',
  position: { x: 16, y: 120 },  // Absolute position
  expanded: true,                // Start expanded or collapsed
  draggable: true,               // Enable drag functionality
  collapsible: true,             // Enable collapse/expand
});
```

### Common Positions

- **Top-left**: `{ x: 16, y: 16 }`
- **Top-right**: `{ x: window.innerWidth - 340, y: 16 }`
- **Bottom-left**: `{ x: 16, y: window.innerHeight - 320 }`
- **Bottom-right**: `{ x: window.innerWidth - 340, y: window.innerHeight - 320 }`

## Control Types

### Basic Controls

```typescript
// Checkbox
folder.addBinding(config, 'enabled', { label: 'Enable' });

// Slider
folder.addBinding(config, 'value', {
  label: 'Value',
  min: 0,
  max: 100,
  step: 1,
});

// Dropdown
folder.addBlade({
  view: 'list',
  label: 'Mode',
  value: config.mode,
  options: [
    { text: 'Option 1', value: 1 },
    { text: 'Option 2', value: 2 },
  ],
});

// Button
folder.addButton({ title: 'Action' })
  .on('click', () => {
    console.log('Button clicked');
  });

// Separator
folder.addBlade({ view: 'separator' });

// Read-only monitor
folder.addBinding(metrics, 'fps', {
  label: 'FPS',
  readonly: true,
  format: (v: number) => v.toFixed(1),
});
```

### Nested Folders

```typescript
const mainFolder = pane.addFolder({
  title: '📁 Main Settings',
  expanded: true,
});

const subFolder = mainFolder.addFolder({
  title: '⚙️ Advanced',
  expanded: false,
});

subFolder.addBinding(config, 'advancedSetting', {
  label: 'Setting',
});
```

## Styling Customization

### Colors

The glassmorphism theme uses:
- **Primary**: `#667eea` → `#764ba2` (Purple gradient)
- **Background**: `rgba(17, 25, 40, 0.75)` (Dark blue-gray with transparency)
- **Border**: `rgba(255, 255, 255, 0.125)` (Subtle white)
- **Hover**: Increased opacity and glow effects

### Modifying Styles

Edit `dashboard.ts` → `injectStyles()` method to customize:

```typescript
// Change primary gradient
.tp-btnv_b {
  background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%) !important;
}

// Change glass background
.tp-dfwv {
  background: rgba(your-r, your-g, your-b, your-alpha) !important;
}
```

## Drag Behavior

Panels can be dragged by:
- 🎯 Clicking and holding the **title bar**
- 🎯 Clicking and holding any **folder header**

Constraints:
- ✅ Panels stay within viewport bounds
- ✅ Touch-enabled for mobile devices
- ✅ Smooth GPU-accelerated transitions

## Keyboard Shortcuts

Consider adding global keyboard shortcuts for panel management:

```typescript
// Example: Toggle panel visibility
document.addEventListener('keydown', (e) => {
  if (e.key === 'h') {
    dashboard.togglePanel('physics');
  }
});
```

## Performance Tips

1. **Minimize updates**: Only update metrics when values actually change
2. **Use readonly bindings**: For display-only values to prevent interaction overhead
3. **Collapse unused sections**: Reduces DOM complexity and improves FPS
4. **Throttle rapid changes**: For high-frequency updates (e.g., audio metrics)

## Mobile Considerations

The panel system is responsive:
- Panels have `max-width: calc(100vw - 32px)` on mobile
- Touch events are properly handled
- Font sizes adjust for smaller screens
- Consider starting with collapsed panels on mobile

## Troubleshooting

### Panels not appearing
- Check if `dashboard.createPanel()` is called before use
- Verify position coordinates are within viewport
- Ensure Dashboard is initialized before panels

### Dragging not working
- Confirm `draggable: true` in panel config
- Check if title bar elements are properly targeted
- Verify z-index isn't being overridden

### Styling issues
- Ensure only one Dashboard instance exists
- Check browser DevTools for CSS conflicts
- Verify backdrop-filter is supported (modern browsers only)

## Examples

See the existing panel implementations for reference:
- **Simple panel**: `PANELpostfx.ts` (straightforward controls)
- **Complex panel**: `PANELphysic.ts` (nested folders, presets, metrics)
- **Interactive panel**: `PANELsoundreactivity.ts` (real-time updates, file input)

## Future Enhancements

Possible improvements:
- 💾 Save/restore panel positions to localStorage
- 🔒 Lock/unlock panel positions
- 📌 Snap to grid or screen edges
- 🎨 Multiple color themes
- 📱 Mobile drawer mode
- ⌨️ Keyboard navigation within panels
- 🔍 Search/filter controls in large panels
- 📋 Preset management system
- 🖱️ Right-click context menus
- 📊 Visual parameter graphs

---

**Created**: January 2025  
**Updated**: Latest version with WebGPU TSL architecture  
**Maintained by**: Flow Development Team

