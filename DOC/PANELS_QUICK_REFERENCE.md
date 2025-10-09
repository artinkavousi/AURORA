# 🎯 Control Panels Quick Reference

## System Architecture

```
Dashboard (Core UI Manager)
├── 📊 FPS Panel (top-left)
├── ℹ️ Info Panel (bottom-left)
├── 🌊 Particle Physics Panel (left, draggable)
├── 🎨 Visual Effects Panel (right, draggable)
└── 🎵 Audio Reactivity Panel (right-bottom, draggable)
```

## Panel Summary

| Panel | File | Position | Features |
|-------|------|----------|----------|
| **Physics** | `PARTICLESYSTEM/PANELphysic.ts` | Left | Particles, materials, forces, emitters, presets |
| **Visual FX** | `POSTFX/PANELpostfx.ts` | Top-right | Bloom, aberration, DOF, color grade, environment |
| **Audio** | `AUDIO/PANELsoundreactivity.ts` | Right-bottom | Source, analysis, volumetric, metrics |

## Dashboard API

```typescript
// Create Dashboard
const dashboard = new Dashboard({
  showInfo: true,
  showFPS: true,
  enableGlassmorphism: true,
});

// Create custom panel
const { pane, container } = dashboard.createPanel('panel-id', {
  title: '🎯 Panel Title',
  position: { x: 100, y: 100 },
  expanded: true,
  draggable: true,
  collapsible: true,
});

// Get existing panel
const existingPane = dashboard.getPanel('panel-id');

// Toggle panel visibility
dashboard.togglePanel('panel-id', true); // show
dashboard.togglePanel('panel-id', false); // hide

// FPS tracking
dashboard.begin(); // Start of frame
dashboard.end();   // End of frame

// Cleanup
dashboard.dispose();
```

## Control Types Cheatsheet

```typescript
// === Basic Bindings ===

// Checkbox
pane.addBinding(obj, 'enabled', { label: 'Enable' });

// Number input
pane.addBinding(obj, 'value', { 
  label: 'Value', 
  min: 0, 
  max: 100, 
  step: 1 
});

// Text input
pane.addBinding(obj, 'name', { label: 'Name' });

// Color picker
pane.addBinding(obj, 'color', { label: 'Color' });

// === Advanced Bindings ===

// Dropdown list
pane.addBlade({
  view: 'list',
  label: 'Mode',
  value: obj.mode,
  options: [
    { text: 'Option A', value: 'a' },
    { text: 'Option B', value: 'b' },
  ],
}).on('change', (ev) => console.log(ev.value));

// Button
pane.addButton({ title: 'Click Me' })
  .on('click', () => console.log('Clicked'));

// Read-only monitor
pane.addBinding(metrics, 'fps', {
  label: 'FPS',
  readonly: true,
  format: (v) => v.toFixed(1),
});

// Separator
pane.addBlade({ view: 'separator' });

// === Folders ===

const folder = pane.addFolder({
  title: '📁 Category',
  expanded: true,
});

folder.addBinding(obj, 'setting', { label: 'Setting' });
```

## Styling Classes

```css
/* Main container */
.tp-dfwv { /* Glassmorphism panel */ }
.panel-container { /* Draggable wrapper */ }

/* Headers */
.tp-fldv_t { /* Folder title (draggable) */ }
.tp-fldv_b { /* Title text */ }

/* Controls */
.tp-lblv_l { /* Label */ }
.tp-btnv_b { /* Button */ }
.tp-sldv_k { /* Slider knob */ }
.tp-ckbv_i { /* Checkbox */ }
.tp-lstv_s { /* Dropdown */ }

/* States */
.panel-container.dragging { /* While dragging */ }
.tp-fldv.tp-fldv-collapsed { /* Collapsed folder */ }
```

## Emoji Icons Reference

Use these for consistent panel styling:

### Categories
- 🌊 Physics/Fluids
- 🎨 Visual/Color
- 🎵 Audio/Sound
- ⚙️ Simulation/Settings
- 🔍 Debug/Tools
- 📊 Metrics/Stats
- 📦 Presets
- ℹ️ Information

### Elements
- ⚛️ Particles
- ✨ Bloom/Effects
- 🌈 Chromatic/Color
- 🔍 DOF/Focus
- 🎤 Microphone
- 🔬 Analysis
- 🌐 Volumetric
- 💫 Emitters
- 🌀 Force Fields
- 🧪 Materials

### Actions
- ➕ Add
- ▶️ Play/Run
- ⏸️ Pause
- 🔄 Refresh
- 💾 Save
- 🗑️ Delete
- 🔒 Lock
- 🔓 Unlock

## Common Patterns

### Real-time Metrics Update

```typescript
class MyPanel {
  private metrics = {
    value1: 0,
    value2: 0,
  };

  private buildMetrics(): void {
    const folder = this.pane.addFolder({
      title: '📊 Metrics',
      expanded: true,
    });

    folder.addBinding(this.metrics, 'value1', {
      label: 'Value 1',
      readonly: true,
      format: (v: number) => v.toFixed(2),
    });
  }

  public updateMetrics(v1: number, v2: number): void {
    this.metrics.value1 = v1;
    this.metrics.value2 = v2;
  }
}
```

### Callback Pattern

```typescript
export interface MyCallbacks {
  onChange?: (value: any) => void;
  onAction?: () => void;
}

constructor(
  dashboard: Dashboard,
  config: Config,
  callbacks: MyCallbacks = {}
) {
  // ...
  folder.addBinding(config, 'value', { label: 'Value' })
    .on('change', (ev: any) => {
      callbacks.onChange?.(ev.value);
    });
}
```

### Preset System

```typescript
private setupPresets(): void {
  const folder = this.pane.addFolder({
    title: '📦 Presets',
    expanded: false,
  });

  folder.addButton({ title: '🌊 Preset 1' })
    .on('click', () => this.loadPreset1());
  
  folder.addButton({ title: '🔥 Preset 2' })
    .on('click', () => this.loadPreset2());
}

private loadPreset1(): void {
  this.config.value1 = 10;
  this.config.value2 = 20;
  // Trigger callbacks
  this.callbacks.onChange?.();
}
```

## Position Presets

```typescript
// Screen corners
const TOP_LEFT = { x: 16, y: 16 };
const TOP_RIGHT = { x: window.innerWidth - 340, y: 16 };
const BOTTOM_LEFT = { x: 16, y: window.innerHeight - 320 };
const BOTTOM_RIGHT = { x: window.innerWidth - 340, y: window.innerHeight - 320 };

// Edge positions
const LEFT_CENTER = { x: 16, y: window.innerHeight / 2 - 160 };
const RIGHT_CENTER = { x: window.innerWidth - 340, y: window.innerHeight / 2 - 160 };
const TOP_CENTER = { x: window.innerWidth / 2 - 170, y: 16 };
const BOTTOM_CENTER = { x: window.innerWidth / 2 - 170, y: window.innerHeight - 320 };
```

## Best Practices

### ✅ DO
- Use semantic emoji icons for visual clarity
- Group related controls in folders
- Provide sensible min/max/step values
- Use callbacks for reactive updates
- Add separators to organize complex panels
- Collapse advanced/debug sections by default
- Format numeric displays appropriately
- Dispose panels when no longer needed

### ❌ DON'T
- Overwhelm with too many controls at once
- Forget to set proper constraints on numeric inputs
- Create deeply nested folder hierarchies
- Update metrics unnecessarily (throttle if needed)
- Hard-code position values without responsive considerations
- Mix unrelated controls in the same section
- Forget to handle mobile screen sizes

## Performance Optimization

```typescript
// Throttle high-frequency updates
let lastUpdate = 0;
const UPDATE_INTERVAL = 100; // ms

update(delta: number): void {
  const now = Date.now();
  if (now - lastUpdate > UPDATE_INTERVAL) {
    this.panel.updateMetrics(value1, value2);
    lastUpdate = now;
  }
}

// Conditional rendering
if (this.config.showAdvanced) {
  this.buildAdvancedControls();
}

// Lazy initialization
private advancedFolder?: any;
private getAdvancedFolder(): any {
  if (!this.advancedFolder) {
    this.advancedFolder = this.pane.addFolder({
      title: '⚙️ Advanced',
      expanded: false,
    });
  }
  return this.advancedFolder;
}
```

## Debugging Tips

```typescript
// Log panel state
console.log('Panel created:', this.pane);
console.log('Container:', container);

// Monitor bindings
folder.addBinding(obj, 'value', { label: 'Value' })
  .on('change', (ev: any) => {
    console.log('Value changed:', ev.value, ev);
  });

// Check panel existence
const panel = dashboard.getPanel('my-panel');
if (!panel) {
  console.error('Panel not found!');
}

// Inspect DOM
const containers = document.querySelectorAll('.panel-container');
console.log('Active panels:', containers.length);
```

## File Template

```typescript
/**
 * CATEGORY/PANELname.ts - Panel description
 * Single responsibility: UI controls for [feature]
 */

import type { Dashboard } from '../PANEL/dashboard';
import type { FlowConfig } from '../config';

export interface MyPanelCallbacks {
  onChange?: (value: any) => void;
}

/**
 * MyPanel - Description
 * Standalone draggable panel with [features]
 */
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

    const { pane } = dashboard.createPanel('my-panel', {
      title: '🎯 My Panel',
      position: { x: 16, y: 120 },
      expanded: true,
      draggable: true,
      collapsible: true,
    });

    this.pane = pane;
    this.buildUI();
  }

  private buildUI(): void {
    // Build control structure
  }

  public dispose(): void {
    this.pane.dispose();
  }
}
```

---

**Quick Reference Version**: v1.0  
**Last Updated**: January 2025

