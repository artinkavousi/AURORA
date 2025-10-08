# 🎨 Unified Panel System - Quick Start Guide

## Overview

The new unified panel system provides an elegant, consolidated interface for all control panels with:
- **One unified container** with tabbed navigation
- **Intelligent auto-docking** to screen edges
- **Beautiful glassmorphism** styling
- **Hot-swappable themes**
- **Full keyboard navigation**
- **State persistence**

## 📦 Installation

All required files are in `flow/src/PANEL/core/`:

```
core/
├── AdaptiveDockingSystem.ts   - Smart positioning
├── TabNavigationSystem.ts     - Tab management
├── UnifiedPanelContainer.ts   - Main orchestrator
├── ThemeEngine.ts             - Theme system
├── StateManager.ts            - State persistence
├── AnimationController.ts     - Animations
├── unified-panel.css          - Complete styling
└── index.ts                   - Exports
```

## 🚀 Quick Start

### 1. Basic Setup

```typescript
import { DashboardV2 } from './PANEL/DashboardV2';

// Create dashboard (automatically sets up everything)
const dashboard = new DashboardV2({
  defaultDock: 'right',           // Where to dock (left/right/bottom)
  defaultExpanded: true,          // Start expanded or collapsed
  defaultTheme: 'cosmic-blue',    // Initial theme
  width: 360,                     // Panel width
  height: 400,                    // Panel height (bottom dock)
});
```

### 2. Create Panels

```typescript
// Visuals panel
const { pane: visualsPane } = dashboard.createPanel('visuals', {
  title: '🎨 Visuals',
  expanded: true,
});

// Physics panel
const { pane: physicsPane } = dashboard.createPanel('physics', {
  title: '🌊 Physics',
  expanded: true,
});

// Audio panel
const { pane: audioPane } = dashboard.createPanel('audio', {
  title: '🎵 Audio',
  expanded: true,
});
```

### 3. Add Controls (Standard Tweakpane)

```typescript
// Add controls as usual
visualsPane.addBinding(settings, 'brightness', {
  label: 'Brightness',
  min: 0,
  max: 2,
  step: 0.01,
});

visualsPane.addBinding(settings, 'contrast', {
  label: 'Contrast',
  min: 0,
  max: 2,
  step: 0.01,
});

// Add folders
const colorFolder = visualsPane.addFolder({
  title: 'Color',
  expanded: true,
});

colorFolder.addBinding(settings, 'saturation', {
  label: 'Saturation',
  min: 0,
  max: 2,
  step: 0.01,
});
```

### 4. Theme Management

```typescript
// Get theme engine
const themeEngine = dashboard.getThemeEngine();

// Switch themes
themeEngine.switchTheme('aurora-purple');  // Built-in
themeEngine.switchTheme('cyberpunk-neon'); // Built-in

// Get all available themes
const themes = themeEngine.getAllThemes();
themes.forEach(theme => {
  console.log(`${theme.name}: ${theme.description}`);
});

// Export theme
const json = themeEngine.exportTheme();
// Save to file or share

// Import custom theme
const customThemeJson = '...'; // JSON string
const theme = themeEngine.importTheme(customThemeJson);
if (theme) {
  themeEngine.switchTheme(theme.id);
}
```

## 🎨 Built-in Themes

### 1. Cosmic Blue (Default)
```typescript
themeEngine.switchTheme('cosmic-blue');
```
- Deep space aesthetic
- Blue color palette
- Perfect for general use

### 2. Aurora Purple
```typescript
themeEngine.switchTheme('aurora-purple');
```
- Mystical purple tones
- Soft gradients
- Great for creative work

### 3. Cyberpunk Neon
```typescript
themeEngine.switchTheme('cyberpunk-neon');
```
- Futuristic neon lights
- High contrast
- Perfect for demos

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + B` | Toggle collapse/expand |
| `Ctrl/Cmd + 1` | Switch to first panel |
| `Ctrl/Cmd + 2` | Switch to second panel |
| `Ctrl/Cmd + 3` | Switch to third panel |
| `Ctrl/Cmd + 4` | Switch to fourth panel |
| `Ctrl/Cmd + 5` | Switch to fifth panel |
| `Arrow Keys` | Navigate between tabs |
| `Home` | Go to first tab |
| `End` | Go to last tab |

## 🎯 Features

### Intelligent Docking
- **Auto-snap**: Drag panel near edge (within 150px) to snap
- **Magnetic feedback**: Visual glow when near snap zone
- **Smooth animations**: Spring physics for natural movement
- **Remember position**: Saves last dock location

### Tab System
- **Icon + Label**: Clear visual hierarchy
- **Active indicator**: Smooth animated highlight
- **Badge support**: Show notifications (red dot)
- **Keyboard navigation**: Full accessibility

### Glassmorphism
- **Advanced effects**: Multi-layer backdrop filters
- **Gradient backgrounds**: Beautiful color blends
- **Border glows**: Subtle luminescence
- **Hover enhancements**: Interactive feedback

### State Persistence
- **Dock position**: Remembers where you docked it
- **Expanded state**: Keeps collapsed/expanded state
- **Active panel**: Remembers last viewed panel
- **Theme choice**: Saves selected theme

## 📝 Example: Complete Setup

```typescript
import { DashboardV2 } from './PANEL/DashboardV2';
import type { FlowConfig } from './config';

// Initialize
const dashboard = new DashboardV2({
  defaultDock: 'right',
  defaultExpanded: true,
  defaultTheme: 'cosmic-blue',
  width: 360,
  height: 400,
  enableKeyboardShortcuts: true,
  enablePersistence: true,
});

// Create visuals panel
const { pane: visualsPane } = dashboard.createPanel('visuals', {
  title: '🎨 Visuals',
  expanded: true,
});

const visualSettings = {
  brightness: 1.0,
  contrast: 1.0,
  saturation: 1.0,
  renderMode: 'mesh',
};

// Renderer section
const rendererFolder = visualsPane.addFolder({
  title: 'Renderer',
  expanded: true,
});

rendererFolder.addBinding(visualSettings, 'renderMode', {
  label: 'Mode',
  options: {
    Point: 'point',
    Sprite: 'sprite',
    Mesh: 'mesh',
    Trail: 'trail',
  },
});

// Color section
const colorFolder = visualsPane.addFolder({
  title: 'Color',
  expanded: true,
});

colorFolder.addBinding(visualSettings, 'brightness', {
  label: 'Brightness',
  min: 0,
  max: 2,
  step: 0.01,
});

colorFolder.addBinding(visualSettings, 'contrast', {
  label: 'Contrast',
  min: 0,
  max: 2,
  step: 0.01,
});

colorFolder.addBinding(visualSettings, 'saturation', {
  label: 'Saturation',
  min: 0,
  max: 2,
  step: 0.01,
});

// Add separator
colorFolder.addBlade({ view: 'separator' });

// Add button
colorFolder.addButton({
  title: 'Reset Colors',
}).on('click', () => {
  visualSettings.brightness = 1.0;
  visualSettings.contrast = 1.0;
  visualSettings.saturation = 1.0;
  visualsPane.refresh();
});

// Create physics panel
const { pane: physicsPane } = dashboard.createPanel('physics', {
  title: '🌊 Physics',
  expanded: true,
});

const physicsSettings = {
  speed: 1.0,
  gravity: 1.0,
  particleCount: 10000,
};

physicsPane.addBinding(physicsSettings, 'speed', {
  label: 'Speed',
  min: 0.1,
  max: 3.0,
  step: 0.1,
});

physicsPane.addBinding(physicsSettings, 'gravity', {
  label: 'Gravity',
  min: 0.0,
  max: 2.0,
  step: 0.1,
});

physicsPane.addBinding(physicsSettings, 'particleCount', {
  label: 'Particles',
  min: 1000,
  max: 100000,
  step: 1000,
});

// Create themes panel
const { pane: themesPane } = dashboard.createPanel('themes', {
  title: '🎭 Themes',
  expanded: true,
});

const themeEngine = dashboard.getThemeEngine();
const themes = themeEngine.getAllThemes();

const themeSettings = {
  currentTheme: 'cosmic-blue',
};

const themeOptions: Record<string, string> = {};
themes.forEach(theme => {
  themeOptions[theme.name] = theme.id;
});

themesPane.addBinding(themeSettings, 'currentTheme', {
  label: 'Theme',
  options: themeOptions,
}).on('change', (ev: any) => {
  themeEngine.switchTheme(ev.value);
});

// Add quick theme buttons
const quickThemes = themesPane.addFolder({
  title: 'Quick Select',
  expanded: true,
});

quickThemes.addButton({
  title: '🌌 Cosmic Blue',
}).on('click', () => {
  themeEngine.switchTheme('cosmic-blue');
  themeSettings.currentTheme = 'cosmic-blue';
  themesPane.refresh();
});

quickThemes.addButton({
  title: '🌠 Aurora Purple',
}).on('click', () => {
  themeEngine.switchTheme('aurora-purple');
  themeSettings.currentTheme = 'aurora-purple';
  themesPane.refresh();
});

quickThemes.addButton({
  title: '🌃 Cyberpunk Neon',
}).on('click', () => {
  themeEngine.switchTheme('cyberpunk-neon');
  themeSettings.currentTheme = 'cyberpunk-neon';
  themesPane.refresh();
});

// Export functionality
const exportFolder = themesPane.addFolder({
  title: 'Import/Export',
  expanded: false,
});

exportFolder.addButton({
  title: '📤 Export Theme',
}).on('click', () => {
  const json = themeEngine.exportTheme();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `theme-${themeSettings.currentTheme}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

console.log('✅ Dashboard initialized with unified panel system!');
```

## 🔧 Advanced Usage

### Creating Custom Themes

```typescript
import type { ThemeConfig } from './PANEL/core/ThemeEngine';

const myTheme: ThemeConfig = {
  id: 'my-ocean-theme',
  name: '🌊 Ocean Depths',
  description: 'Deep ocean vibes',
  colors: {
    primary: '#006994',
    secondary: '#0088b7',
    accent: '#00a6d6',
    success: '#06d6a0',
    warning: '#ffd60a',
    danger: '#e63946',
    bgBase: 'rgba(0, 29, 61, 0.95)',
    bgOverlay: 'rgba(0, 48, 73, 0.85)',
    bgGlass: 'rgba(0, 65, 106, 0.75)',
    textPrimary: 'rgba(255, 255, 255, 0.95)',
    textSecondary: 'rgba(255, 255, 255, 0.75)',
    textMuted: 'rgba(255, 255, 255, 0.50)',
    borderLight: 'rgba(255, 255, 255, 0.15)',
    borderMedium: 'rgba(255, 255, 255, 0.30)',
    borderHeavy: 'rgba(0, 150, 199, 0.60)',
    shadowAmbient: 'rgba(0, 0, 0, 0.50)',
    shadowGlow: 'rgba(0, 150, 199, 0.40)',
    shadowInner: 'rgba(0, 150, 199, 0.10)',
  },
  glassmorphism: {
    blur: 60,
    saturation: 220,
    brightness: 1.25,
    contrast: 1.2,
    opacity: 0.85,
    borderOpacity: 0.30,
    shadowIntensity: 1.0,
  },
  borderRadius: { sm: 8, md: 12, lg: 16, xl: 20 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  fontSize: { xs: 10, sm: 11, base: 13, lg: 15, xl: 18 },
  animation: {
    fast: 200,
    base: 300,
    slow: 400,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
};

// Register and use
const themeEngine = dashboard.getThemeEngine();
themeEngine.registerCustomTheme(myTheme);
themeEngine.switchTheme('my-ocean-theme');
```

### Programmatic Control

```typescript
// Get unified panel container
const panelContainer = dashboard.getUnifiedPanel();

// Access docking system
const dockingSystem = panelContainer['dockingSystem'];

// Manual dock to specific side
dockingSystem.setDock({ side: 'left', offset: { x: 0, y: 0 } });

// Toggle expanded programmatically
panelContainer.toggleExpanded();
```

## 📚 API Reference

### DashboardV2

```typescript
class DashboardV2 {
  constructor(options?: DashboardV2Options)
  
  createPanel(id: string, config: PanelConfig): { pane: Pane; container: HTMLElement }
  getThemeEngine(): ThemeEngine
  getUnifiedPanel(): UnifiedPanelContainer
  getPanel(id: string): Pane | undefined
  dispose(): void
}
```

### UnifiedPanelContainer

```typescript
class UnifiedPanelContainer {
  constructor(config?: UnifiedPanelConfig)
  
  registerPanel(definition: PanelDefinition): void
  toggleExpanded(): void
  getThemeEngine(): ThemeEngine
  getElement(): HTMLElement
  dispose(): void
}
```

### ThemeEngine

```typescript
class ThemeEngine {
  constructor(defaultThemeId?: string)
  
  getCurrentTheme(): ThemeConfig
  getCurrentThemeId(): string
  applyTheme(theme: ThemeConfig): void
  switchTheme(themeId: string): boolean
  registerCustomTheme(theme: ThemeConfig): void
  getAllThemes(): ThemeConfig[]
  exportTheme(themeId?: string): string
  importTheme(json: string): ThemeConfig | null
  dispose(): void
}
```

## 💡 Tips & Best Practices

1. **Panel Organization**: Group related parameters in folders
2. **Use Separators**: Add visual breaks between sections
3. **Descriptive Labels**: Use clear, concise labels
4. **Appropriate Ranges**: Set sensible min/max values
5. **Step Values**: Use appropriate step sizes for precision
6. **Default Values**: Set good defaults for new users
7. **Tooltips**: Add helpful descriptions where needed

## 🐛 Troubleshooting

### Panels not showing
- Check that you called `createPanel()` with unique IDs
- Ensure CSS is loaded (auto-injected by default)
- Verify no conflicting z-index issues

### Themes not applying
- Confirm theme ID exists (`getAllThemes()`)
- Check browser console for errors
- Try refreshing the page

### Docking not working
- Make sure `enableDocking: true` in config
- Check that panel is being dragged (not content)
- Verify snap threshold is reasonable (default 150px)

### State not persisting
- Confirm `enablePersistence: true` in config
- Check localStorage is available
- Look for quota errors in console

## 📞 Support

- **Proposal**: See `PANEL_REDESIGN_PROPOSAL.md`
- **Implementation**: See `IMPLEMENTATION_SUMMARY.md`
- **Examples**: This README.md

**Enjoy your beautiful new control panels!** ✨

