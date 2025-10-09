# 🔄 Migration Guide: Unified Dashboard System

This guide helps you migrate from the old scattered panel system to the new unified dashboard.

---

## 📋 Overview of Changes

### Old Structure
```
❌ Multiple standalone panels
- src/POSTFX/PANELpostfx.ts
- src/PARTICLESYSTEM/PANELphysic.ts
- src/PARTICLESYSTEM/PANEL/PANELvisuals.ts
- src/AUDIO/PANELsoundreactivity.ts

Each panel created its own Pane instance
```

### New Structure
```
✅ Unified dashboard with tabs
- src/PANEL/UnifiedPanelManager.ts (main orchestrator)
- src/PANEL/tabs/PhysicsTab.ts
- src/PANEL/tabs/VisualsTab.ts
- src/PANEL/tabs/AudioTab.ts
- src/PANEL/tabs/PostFXTab.ts
- src/PANEL/tabs/LibraryTab.ts (NEW)
- src/PANEL/tabs/SettingsTab.ts (NEW)

All tabs unified under single Dashboard instance
```

---

## 🚀 Quick Start

### Before (Old Way)
```typescript
import { Dashboard } from './PANEL/dashboard';
import { PhysicPanel } from './PARTICLESYSTEM/PANELphysic';
import { VisualsPanel } from './PARTICLESYSTEM/PANEL/PANELvisuals';
import { AudioPanel } from './AUDIO/PANELsoundreactivity';
import { PostFXPanel } from './POSTFX/PANELpostfx';

// Create dashboard
const dashboard = new Dashboard();

// Create each panel individually
const physicPanel = new PhysicPanel(dashboard, config, callbacks);
const visualsPanel = new VisualsPanel(dashboard, config, callbacks);
const audioPanel = new AudioPanel(dashboard, config, callbacks);
const postfxPanel = new PostFXPanel(dashboard, config, callbacks);
```

### After (New Way)
```typescript
import { createUnifiedPanels } from './PANEL';

// Create all panels at once
const panelManager = createUnifiedPanels(config, {
  physics: {
    onParticleCountChange: (count) => { /* ... */ },
    onSizeChange: (size) => { /* ... */ },
    // ... other physics callbacks
  },
  visuals: {
    onRenderModeChange: (mode) => { /* ... */ },
    // ... other visuals callbacks
  },
  audio: {
    onAudioConfigChange: (cfg) => { /* ... */ },
    // ... other audio callbacks
  },
  postfx: {
    onBloomChange: (bloom) => { /* ... */ },
    // ... other postfx callbacks
  },
  library: {
    onScenePresetLoad: (preset) => { /* ... */ },
  },
  settings: {
    onThemeChange: (theme) => { /* ... */ },
    onDockChange: (dock) => { /* ... */ },
  },
});

// Access individual tabs if needed
panelManager.physicsTab.boundaries = boundaries;
panelManager.visualsTab.setRendererManager(rendererManager);
```

---

## 🔧 Step-by-Step Migration

### Step 1: Remove Old Imports
```typescript
// ❌ Remove these
import { PhysicPanel } from './PARTICLESYSTEM/PANELphysic';
import { VisualsPanel } from './PARTICLESYSTEM/PANEL/PANELvisuals';
import { AudioPanel } from './AUDIO/PANELsoundreactivity';
import { PostFXPanel } from './POSTFX/PANELpostfx';
```

### Step 2: Add New Import
```typescript
// ✅ Add this
import { createUnifiedPanels } from './PANEL';
import type { UnifiedPanelCallbacks } from './PANEL';
```

### Step 3: Consolidate Callbacks
```typescript
// ✅ Organize all callbacks into one structure
const callbacks: UnifiedPanelCallbacks = {
  physics: {
    onParticleCountChange: (count) => {
      // Your logic here
    },
    onSizeChange: (size) => {
      // Your logic here
    },
    onSimulationChange: (sim) => {
      // Your logic here
    },
    onGravityChange: (gravity) => {
      // Your logic here
    },
    onMaterialChange: () => {
      // Your logic here
    },
    onForceFieldsChange: () => {
      // Your logic here
    },
    onEmittersChange: () => {
      // Your logic here
    },
    onBoundariesChange: () => {
      // Your logic here
    },
  },
  visuals: {
    onRenderModeChange: (mode) => {
      // Your logic here
    },
    onMaterialPresetChange: (preset) => {
      // Your logic here
    },
    onColorModeChange: (mode) => {
      // Your logic here
    },
    onColorGradientChange: (gradient) => {
      // Your logic here
    },
    onSizeChange: (size) => {
      // Your logic here
    },
    onMaterialPropertyChange: (property, value) => {
      // Your logic here
    },
  },
  audio: {
    onAudioConfigChange: (config) => {
      // Your logic here
    },
    onAudioReactiveConfigChange: (config) => {
      // Your logic here
    },
    onSourceChange: (source) => {
      // Your logic here
    },
    onFileLoad: (url) => {
      // Your logic here
    },
    onTogglePlayback: () => {
      // Your logic here
    },
    onVolumeChange: (volume) => {
      // Your logic here
    },
  },
  postfx: {
    onBloomChange: (bloom) => {
      // Your logic here
    },
    onRadialFocusChange: (focus) => {
      // Your logic here
    },
    onRadialCAChange: (ca) => {
      // Your logic here
    },
  },
  library: {
    onMaterialPresetSelect: (preset) => {
      // Your logic here
    },
    onScenePresetLoad: (preset) => {
      // Your logic here
    },
    onConfigExport: () => {
      // Your logic here
    },
    onConfigImport: (config) => {
      // Your logic here
    },
  },
  settings: {
    onThemeChange: (theme) => {
      // Your logic here
    },
    onDockChange: (dock) => {
      // Your logic here
    },
    onClearStorage: () => {
      // Your logic here
    },
  },
};
```

### Step 4: Create Unified Panel Manager
```typescript
// ✅ Create unified panel manager
const panelManager = createUnifiedPanels(config, callbacks);
```

### Step 5: Update References
```typescript
// ❌ Old way
physicPanel.boundaries = boundaries;
physicPanel.updateMetrics(activeParticles, fps, kernelTime);
visualsPanel.setRendererManager(rendererManager);
audioPanel.updateMetrics(audioData);

// ✅ New way
panelManager.physicsTab!.boundaries = boundaries;
panelManager.updatePhysicsMetrics(activeParticles, fps, kernelTime);
panelManager.visualsTab!.setRendererManager(rendererManager);
panelManager.updateAudioMetrics(audioData);
```

### Step 6: Update Animation Loop
```typescript
// ❌ Old way
function animate() {
  physicPanel.updateFPS();
  // ... other logic
}

// ✅ New way
function animate() {
  panelManager.updateFPS();
  // ... other logic
}
```

### Step 7: Clean Up on Destroy
```typescript
// ❌ Old way
physicPanel.dispose();
visualsPanel.dispose();
audioPanel.dispose();
postfxPanel.dispose();

// ✅ New way
panelManager.dispose();
```

---

## 🎨 Theme Customization

The new system includes a powerful theme editor in the Settings tab. You can also programmatically customize themes:

```typescript
import { DEFAULT_THEME, THEME_PRESETS } from './PANEL';

// Use a preset theme
panelManager.getDashboard().applyTheme(THEME_PRESETS.Amethyst);

// Create custom theme
panelManager.getDashboard().updateTheme({
  accent: '#ff6b9d',
  backgroundHue: 320,
  glassBlur: 80,
  glassSaturation: 3.0,
});
```

---

## 🔑 Key Benefits

### 1. **Unified Interface**
- Single dashboard with tab navigation
- Consistent styling across all panels
- Better space utilization

### 2. **Better Organization**
- Logical grouping of related controls
- Collapsible sections for advanced features
- Quick preset buttons for common tasks

### 3. **Enhanced UX**
- Smooth transitions and animations
- Drag-to-dock functionality
- Adaptive resizing
- Auto-snap to edges

### 4. **Improved Developer Experience**
- Cleaner API with type safety
- Centralized callback management
- Easier to extend with new tabs
- Better separation of concerns

### 5. **New Features**
- **Library Tab**: Material browser, scene presets, import/export
- **Settings Tab**: Theme editor, performance settings, about info
- **Enhanced Glassmorphism**: Beautiful frosted glass effects
- **Flexible Docking**: Left, right, or bottom positioning

---

## 🐛 Troubleshooting

### Issue: Dashboard not visible
**Solution**: Check that the dashboard container is being added to the DOM. The unified system creates the dashboard automatically.

### Issue: Callbacks not firing
**Solution**: Ensure callbacks are passed in the correct structure to `createUnifiedPanels()`.

### Issue: Tab not showing content
**Solution**: Verify that `buildUI()` is being called for each tab. The unified manager handles this automatically.

### Issue: Performance degradation
**Solution**: The new system is optimized, but ensure you're not creating multiple instances. Use the singleton pattern if needed.

---

## 📚 Additional Resources

- [API Documentation](./API_REFERENCE.md)
- [Theme Customization Guide](./THEME_GUIDE.md)
- [Control Panel Refactor Proposal](./CONTROL_PANEL_REFACTOR_PROPOSAL.md)
- [Contributing Guide](../CONTRIBUTING.md)

---

## ✅ Migration Checklist

Use this checklist to track your migration progress:

- [ ] Remove old panel imports
- [ ] Add new unified panel import
- [ ] Consolidate callbacks into `UnifiedPanelCallbacks` structure
- [ ] Create unified panel manager with `createUnifiedPanels()`
- [ ] Update all panel references (e.g., `panelManager.physicsTab`)
- [ ] Update animation loop FPS calls
- [ ] Update metrics update calls
- [ ] Update dispose/cleanup logic
- [ ] Test all panel functionality
- [ ] Test drag-and-dock behavior
- [ ] Test theme customization
- [ ] Test collapse/expand transitions
- [ ] Remove old panel files (optional, after verification)
- [ ] Update documentation/comments

---

**Migration Status**: 🟢 Production Ready  
**Estimated Time**: 30-60 minutes for typical project  
**Breaking Changes**: Yes (API changes, but straightforward migration)


