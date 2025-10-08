# 🎨 Unified Panel System - Usage Guide

## 📖 Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [API Reference](#api-reference)
4. [Panel Integration](#panel-integration)
5. [Customization](#customization)
6. [Keyboard Shortcuts](#keyboard-shortcuts)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

The Unified Panel System consolidates all control panels (Physics, Visuals, Audio, PostFX) into a single, tabbed interface with:

- **Vertical tabs** on left/right sides
- **Horizontal tabs** on bottom
- **Drag-to-dock** functionality with snap zones
- **Smooth animations** (60fps)
- **State persistence** via localStorage
- **Glassmorphism** aesthetic
- **Fully responsive** design

---

## 🚀 Getting Started

### Basic Initialization

```typescript
import { Dashboard } from './PANEL/dashboard';

// Create dashboard with unified panel system (NEW)
const dashboard = new Dashboard({
  useUnifiedPanels: true,  // Enable unified system
  defaultDock: 'right',     // 'left' | 'right' | 'bottom'
  enableGlassmorphism: true,
});
```

### Creating Panels

Panels are automatically registered when created with emojis in titles:

```typescript
// 🌊 Physics Panel
const { pane: physicPane } = dashboard.createPanel('physics', {
  title: '🌊 Particle Physics',  // Icon extracted automatically
  expanded: true,
});

// 🎨 Visuals Panel
const { pane: visualPane } = dashboard.createPanel('visuals', {
  title: '🎨 Visuals',
  expanded: true,
});

// 🎵 Audio Panel
const { pane: audioPane } = dashboard.createPanel('audio', {
  title: '🎵 Audio',
  expanded: true,
});

// ✨ PostFX Panel
const { pane: postfxPane } = dashboard.createPanel('postfx', {
  title: '✨ Post Effects',
  expanded: true,
});
```

The system automatically:
- Extracts the emoji as the tab icon
- Uses the remaining text as the tab label
- Registers the panel in the unified system
- Creates the appropriate tab

---

## 📚 API Reference

### Dashboard Options

```typescript
interface DashboardOptions {
  showInfo?: boolean;          // Show info panel (legacy)
  showFPS?: boolean;           // Show FPS panel (legacy)
  enableGlassmorphism?: boolean; // Enable glassmorphism styles
  useUnifiedPanels?: boolean;  // Use unified panel system (default: true)
  defaultDock?: 'left' | 'right' | 'bottom'; // Default dock position
}
```

### UnifiedPanelSystem API

```typescript
const unifiedSystem = dashboard.getUnifiedPanelSystem();

// Get current dock side
const dockSide = unifiedSystem.getDockSide();

// Set dock side programmatically
unifiedSystem.setDockSide('left');

// Check if panel is active
const isActive = unifiedSystem.isPanelActive('physics');

// Get panel definition
const panel = unifiedSystem.getPanel('physics');

// Check if expanded
const expanded = unifiedSystem.isExpanded_();
```

### PanelDefinition

```typescript
interface PanelDefinition {
  id: string;          // Unique panel ID
  icon: string;        // Emoji icon (e.g., '🌊')
  label: string;       // Display label
  pane: Pane;          // Tweakpane instance
  container: HTMLElement; // Container element
  color?: string;      // Optional accent color
}
```

---

## 🔧 Panel Integration

### Example: Physics Panel Integration

```typescript
import type { Dashboard } from '../PANEL/dashboard';
import { PhysicPanel } from './PANELphysic';

// In your main app initialization:
function initializePanels(dashboard: Dashboard, config: FlowConfig) {
  // Create Physics panel
  const physicPanel = new PhysicPanel(
    dashboard,
    config,
    {
      onParticleCountChange: (count) => handleParticleCountChange(count),
      onSimulationChange: (simConfig) => handleSimulationChange(simConfig),
      // ... other callbacks
    }
  );
  
  // Panel is automatically registered in unified system
  // No manual registration needed!
}
```

### Panel Class Requirements

For automatic integration, panel classes should:

1. **Accept Dashboard as first parameter**
2. **Call dashboard.createPanel() with emoji title**
3. **Store panel reference internally**

Example panel class:

```typescript
export class MyCustomPanel {
  private pane: any;
  
  constructor(dashboard: Dashboard, config: MyConfig, callbacks: MyCallbacks = {}) {
    // Create panel - automatically registers in unified system
    const { pane } = dashboard.createPanel('myPanel', {
      title: '⚡ My Custom Panel',  // Emoji is extracted as icon
      expanded: true,
    });
    
    this.pane = pane;
    this.buildUI();
  }
  
  private buildUI(): void {
    // Build your panel UI using Tweakpane API
    const folder = this.pane.addFolder({ title: 'Settings' });
    folder.addBinding(/* ... */);
  }
}
```

---

## 🎨 Customization

### Custom Panel Colors

```typescript
// When creating panel, specify custom accent color
const panelDef: PanelDefinition = {
  id: 'myPanel',
  icon: '🔥',
  label: 'Fire Effects',
  pane: myPane,
  container: myContainer,
  color: '#ff6b35',  // Custom accent color
};

unifiedSystem.registerPanel(panelDef);
```

### Custom Dock Configuration

```typescript
const dashboard = new Dashboard({
  useUnifiedPanels: true,
  defaultDock: 'left',  // Start docked to left
});

// Change dock at runtime
const unifiedSystem = dashboard.getUnifiedPanelSystem();
unifiedSystem?.setDockSide('bottom');
```

### Custom Animations

Modify `animation-controller.ts` to customize animation durations and easings:

```typescript
export const ANIMATION_DURATIONS = {
  tabSwitch: 300,      // Tab switch duration (ms)
  panelToggle: 400,    // Expand/collapse duration (ms)
  dockChange: 600,     // Dock change duration (ms)
  snapZone: 200,       // Snap zone highlight (ms)
  tabGlow: 150,        // Tab glow effect (ms)
} as const;
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + H` | Toggle panel expand/collapse |
| `Tab` | Cycle to next panel (when panel focused) |
| `Shift + Tab` | Cycle to previous panel |

---

## ✅ Best Practices

### 1. Panel Titles with Emojis

Always use emojis in panel titles for automatic icon extraction:

```typescript
// ✅ Good
dashboard.createPanel('physics', { title: '🌊 Physics' });

// ❌ Bad (no icon extracted)
dashboard.createPanel('physics', { title: 'Physics Panel' });
```

### 2. Panel Organization

Organize panels by category:
- **🌊 Physics** - Simulation, particles, forces
- **🎨 Visuals** - Rendering, colors, materials
- **🎵 Audio** - Sound reactivity, visualizations
- **✨ PostFX** - Post-processing effects

### 3. Folder Structure

Use Tweakpane folders to organize related controls:

```typescript
const folder = pane.addFolder({
  title: '📊 Performance',
  expanded: true,
});

folder.addBinding(metrics, 'fps', { /* ... */ });
folder.addBinding(metrics, 'particleCount', { /* ... */ });
```

### 4. State Persistence

The system automatically persists:
- Dock position
- Expanded/collapsed state
- Active panel

To disable:

```typescript
const dashboard = new Dashboard({
  useUnifiedPanels: true,
  // Persistence is enabled by default
});
```

### 5. Mobile Responsiveness

On mobile (<768px), panels automatically:
- Snap to bottom
- Use horizontal tab layout
- Reduce padding/sizing
- Disable dragging

---

## 🐛 Troubleshooting

### Panel Not Appearing

**Problem:** Panel created but not visible in unified system.

**Solution:** Ensure panel title has emoji:

```typescript
// ❌ Won't show
dashboard.createPanel('test', { title: 'Test Panel' });

// ✅ Will show
dashboard.createPanel('test', { title: '📋 Test Panel' });
```

### Drag Not Working

**Problem:** Can't drag panel to reposition.

**Solution:** Ensure dragging is enabled:

```typescript
const dashboard = new Dashboard({
  useUnifiedPanels: true,
  // enableDocking: true is default
});
```

### CSS Not Loading

**Problem:** Unified panel styles not applied.

**Solution:** Check CSS file path in dashboard.ts:

```typescript
private injectUnifiedPanelStyles(): void {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/src/PANEL/unified-panel-system.css'; // Ensure correct path
  document.head.appendChild(link);
}
```

### Animation Performance

**Problem:** Animations stuttering or slow.

**Solution:** Reduce animation complexity or disable:

```typescript
// Disable reduced motion in CSS (for testing)
@media (prefers-reduced-motion: reduce) {
  /* Animations disabled for accessibility */
}
```

### localStorage Errors

**Problem:** Cannot save/load state.

**Solution:** Check browser localStorage availability:

```typescript
// Test in console
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('localStorage available');
} catch (e) {
  console.error('localStorage unavailable:', e);
}
```

---

## 🎓 Advanced Usage

### Dynamic Panel Registration

Register panels dynamically at runtime:

```typescript
const unifiedSystem = dashboard.getUnifiedPanelSystem();

// Create new panel
const container = document.createElement('div');
const pane = new Pane({ container, title: 'Dynamic Panel' });

// Register
unifiedSystem?.registerPanel({
  id: 'dynamicPanel',
  icon: '🚀',
  label: 'Dynamic Panel',
  pane,
  container,
});
```

### Unregister Panels

Remove panels from unified system:

```typescript
unifiedSystem?.unregisterPanel('dynamicPanel');
```

### Tab Badges

Show notification counts on tabs:

```typescript
const tabBar = unifiedSystem?.['tabBar']; // Access internal TabBar
tabBar?.setTabBadge('physics', 5); // Show "5" badge
tabBar?.setTabBadge('physics', undefined); // Remove badge
```

### Enable/Disable Tabs

Temporarily disable specific tabs:

```typescript
const tabBar = unifiedSystem?.['tabBar'];
tabBar?.setTabEnabled('postfx', false); // Disable PostFX tab
tabBar?.setTabEnabled('postfx', true);  // Re-enable
```

---

## 📊 Migration from Legacy System

### Before (Legacy Panels)

```typescript
const dashboard = new Dashboard({
  useUnifiedPanels: false,  // Old system
});

const { pane } = dashboard.createPanel('physics', {
  title: 'Physics',
  position: { x: 16, y: 16 },
  draggable: true,
});
```

### After (Unified System)

```typescript
const dashboard = new Dashboard({
  useUnifiedPanels: true,   // New system
  defaultDock: 'right',
});

const { pane } = dashboard.createPanel('physics', {
  title: '🌊 Physics',  // Just add emoji!
  expanded: true,
});
```

**Changes:**
1. Set `useUnifiedPanels: true`
2. Add emoji to panel title
3. Remove `position` (managed by dock system)
4. Remove `draggable` (handled by unified system)

---

## 🔗 Related Files

- `flow/src/PANEL/unified-panel-system.ts` - Main orchestrator
- `flow/src/PANEL/tab-bar.ts` - Tab navigation
- `flow/src/PANEL/dock-manager.ts` - Docking & snapping
- `flow/src/PANEL/animation-controller.ts` - Animation system
- `flow/src/PANEL/unified-panel-system.css` - Styles & animations
- `flow/src/PANEL/dashboard.ts` - Dashboard integration

---

## 📝 License

Part of the Flow project.

---

**Questions?** Check `UNIFIED_PANEL_SYSTEM_PROPOSAL.md` for full design documentation.



