# 🚀 Unified Panel System - Quick Start Guide

## Overview

Your Flow application now features a **beautiful, modern unified panel system** with:
- ✨ Advanced glassmorphism design
- 🎨 Hot-swappable themes
- 📱 Adaptive docking (drag to any screen edge)
- ⌨️ Keyboard shortcuts
- 💾 Persistent state (remembers your preferences)
- 🎯 Tab-based navigation

## Getting Started

Simply run your application - the unified panel system is **automatically initialized**!

```bash
npm run dev
```

## Interface Overview

### Main Components

```
┌─────────────────────────────────────┐
│  🎨 Themes  ⚛️ Physics  ✨ Post-FX  │ ← Tabs
│  🎨 Visuals  🎵 Audio               │
├─────────────────────────────────────┤
│                                     │
│  [Active Panel Content]             │ ← Panel Content
│                                     │
│  • Controls                         │
│  • Parameters                       │
│  • Settings                         │
│                                     │
└─────────────────────────────────────┘
```

### Available Panels

1. **🎨 Themes** - Visual theme management
   - Switch between built-in themes
   - Customize colors, glassmorphism effects
   - Import/export themes

2. **⚛️ Physics** - Particle simulation controls
   - Particle count & behavior
   - Force fields & emitters
   - Material properties
   - Boundaries & collisions

3. **✨ Post-FX** - Post-processing effects
   - Bloom
   - Radial focus & chromatic aberration
   - Vignette
   - Film grain
   - Color grading

4. **🎨 Visuals** - Rendering & appearance
   - Render modes (Mesh, Sprite, Point)
   - Material properties (metalness, roughness)
   - Color modes & gradients
   - Particle size & quality

5. **🎵 Audio** - Audio reactivity
   - Microphone or file input
   - Frequency analysis
   - Kinetic gestures
   - Personality engine
   - Macro controls

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + P` | Toggle panel visibility |
| `Ctrl/Cmd + 1` | Switch to first tab |
| `Ctrl/Cmd + 2` | Switch to second tab |
| `...` | ... |
| `Ctrl/Cmd + 9` | Switch to ninth tab |
| `Escape` | Collapse/expand panel |

## Interacting with the Panel

### Dragging & Docking

1. **Click and hold** the panel header
2. **Drag** to any screen edge (left, right, bottom)
3. **Release** to snap into position
4. The panel automatically adapts its layout!

### Collapsing

- Click the **collapse button** (▼/▲) in the header
- Or press `Escape`
- The panel minimizes to a thin bar

### Switching Tabs

- **Click** on any tab icon
- Or use **keyboard shortcuts** (Ctrl/Cmd + 1-9)
- The active tab is highlighted

## Theme System

### Built-in Themes

- 🌌 **Cosmic Blue** (default) - Deep blues with cosmic vibes
- 🌠 **Aurora Purple** - Vibrant purples and magentas
- 🌊 **Ocean Cyan** - Cool aqua tones
- 🌑 **Midnight Dark** - Elegant dark theme
- 🌅 **Sunset Orange** - Warm oranges and yellows
- 🔥 **Crimson Fire** - Bold reds and pinks
- 🌹 **Rose Gold** - Sophisticated pinks and golds
- 🌲 **Emerald Forest** - Natural greens

### Switching Themes

**Via Themes Panel:**
1. Open the **🎨 Themes** tab
2. Select a theme from the dropdown
3. Or click a theme button in the gallery
4. Changes apply instantly!

**Programmatically:**
```typescript
const themeEngine = dashboard.getThemeEngine();
themeEngine.switchTheme('aurora-purple');
```

### Creating Custom Themes

1. Open **🎨 Themes** panel
2. Click **"➕ Create Custom"**
3. Adjust colors, blur, transparency
4. Save and apply!

## Configuration

### Initialization Options

```typescript
const dashboard = new DashboardV2({
  defaultDock: 'right',        // 'left' | 'right' | 'bottom'
  defaultTheme: 'cosmic-blue', // Theme ID
  defaultExpanded: true,       // Start expanded or collapsed
  width: 360,                  // Panel width (px)
  height: 400,                 // Panel height for bottom dock (px)
  enableDragging: true,        // Allow drag-to-dock
  enableDocking: true,         // Enable docking system
  enablePersistence: true,     // Save state to localStorage
  enableKeyboardShortcuts: true, // Enable keyboard controls
});
```

### Adding New Panels

```typescript
// 1. Create the panel definition
const { pane } = dashboard.createPanel('myPanel', {
  title: '🎯 My Panel',
  icon: '🎯',
});

// 2. Initialize your panel class
const myPanel = new MyPanel(pane, config, {
  onSomeChange: (value) => {
    console.log('Changed:', value);
  },
});
```

## State Persistence

The system automatically saves to `localStorage`:
- Active tab
- Docked position (left, right, bottom)
- Expanded/collapsed state
- Selected theme
- Panel width/height

This state is restored when you reload the page!

### Clearing State

Open browser console:
```javascript
localStorage.removeItem('unified-panel-state');
localStorage.removeItem('unified-panel-dock');
location.reload();
```

## API Reference

### DashboardV2

```typescript
class DashboardV2 {
  // Create a new panel
  createPanel(id: string, config: {
    title: string;
    icon?: string;
    expanded?: boolean;
  }): { pane: Pane; container: HTMLElement }
  
  // Get the theme engine
  getThemeEngine(): ThemeEngine
  
  // Dispose (cleanup)
  dispose(): void
}
```

### ThemeEngine

```typescript
class ThemeEngine {
  // Switch theme
  switchTheme(themeId: string): void
  
  // Get current theme
  getCurrentTheme(): ThemeConfig
  
  // Get all available themes
  getAllThemes(): ThemeConfig[]
  
  // Apply theme
  applyTheme(theme: ThemeConfig): void
}
```

## Styling

### CSS Variables

The system uses CSS custom properties for theming:

```css
:root {
  --panel-primary: #4a9eff;      /* Primary color */
  --panel-secondary: #9d4edd;    /* Secondary color */
  --panel-accent: #06ffa5;       /* Accent color */
  --panel-bg-base: #1a1a2e;      /* Background */
  --panel-glass-blur: 20px;      /* Blur amount */
  --panel-glass-opacity: 0.85;   /* Transparency */
  /* ... and many more */
}
```

### Custom Styles

Add your own styles targeting these classes:

```css
/* Panel container */
.unified-panel-container { }

/* Tab bar */
.unified-panel-tabs { }

/* Active tab */
.unified-panel-tab.active { }

/* Content area */
.unified-panel-content { }

/* Individual pane */
.unified-panel-content-pane { }
```

## Troubleshooting

### Panel not showing?
- Check browser console for errors
- Verify `autoInjectStyles` is `true` (default)
- Ensure no CSS conflicts with your existing styles

### Drag-to-dock not working?
- Check `enableDragging` and `enableDocking` options
- Verify no other element is capturing pointer events

### Theme not applying?
- Clear localStorage and reload
- Check theme ID is correct
- Verify CSS is loaded

### State not persisting?
- Check `enablePersistence` is `true` (default)
- Verify localStorage is available in your browser
- Check browser privacy settings

## Best Practices

1. **Initialize early** - Create DashboardV2 before panels
2. **Use icons** - Makes tabs more recognizable
3. **Group related controls** - Use folders in Tweakpane
4. **Provide callbacks** - React to changes in real-time
5. **Test themes** - Ensure your controls work in all themes
6. **Document shortcuts** - Let users know about keyboard controls

## Examples

### Minimal Setup

```typescript
import { DashboardV2 } from './PANEL/DashboardV2';

const dashboard = new DashboardV2();

const { pane } = dashboard.createPanel('demo', {
  title: '🎯 Demo',
  icon: '🎯',
});

pane.addBinding({ value: 0.5 }, 'value', {
  label: 'Intensity',
  min: 0,
  max: 1,
});
```

### Full Integration

See `flow/src/APP.ts` for a complete example of integrating multiple panels with the unified system.

---

## Support

For issues, questions, or feature requests:
- Check `UNIFIED_PANEL_INTEGRATION_COMPLETE.md` for technical details
- Review `PANEL_SYSTEM_UPGRADE_COMPLETE.md` for architecture overview
- Examine source files in `flow/src/PANEL/core/`

**Enjoy your beautiful new control panel!** ✨
