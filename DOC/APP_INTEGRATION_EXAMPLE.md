# 🔗 APP.ts Integration Example

This document shows the key changes needed to integrate the new unified panel system into APP.ts.

---

## 📝 Key Changes

### 1. Update Imports

#### Remove Old Imports
```typescript
// ❌ Remove these
import { Dashboard } from './PANEL/dashboard';
import { PostFXPanel } from './PANEL/panels/postfx';
import { PhysicPanel, ColorMode } from './PANEL/panels/physics';
import { VisualsPanel } from './PANEL/panels/visuals';
import { AudioPanel } from './PANEL/panels/audio';
import { ThemeManagerPanel } from './PANEL/panels/theme';
```

#### Add New Import
```typescript
// ✅ Add this
import { createUnifiedPanels, type UnifiedPanelCallbacks } from './PANEL';
```

---

### 2. Update Class Properties

#### Remove Old Panel Properties
```typescript
// ❌ Remove these
private dashboard!: Dashboard;
private postFXPanel!: PostFXPanel;
private physicPanel!: PhysicPanel;
private visualsPanel!: VisualsPanel;
private audioPanel!: AudioPanel;
private themePanel!: ThemeManagerPanel;
```

#### Add Unified Panel Manager
```typescript
// ✅ Add this
private panelManager!: ReturnType<typeof createUnifiedPanels>;
```

---

### 3. Update Initialization Pipeline

#### Remove Old Panel Init Steps
```typescript
// ❌ Remove these steps from pipeline
{ id: 'panels', label: 'Core control panels', weight: 1, run: async () => this.initializeCorePanels() },
{ id: 'visuals', label: 'Visual controls', weight: 1, run: async () => this.initializeVisualsPanel() },
{ id: 'audio-panel', label: 'Audio control panel', weight: 1, enabled: () => this.isAudioPipelineEnabled(), run: async () => this.initializeAudioPanel() },
```

#### Add Unified Panel Init Step
```typescript
// ✅ Add this single step
{ id: 'panels', label: 'Unified control panels', weight: 1, run: async () => this.initializeUnifiedPanels() },
```

---

### 4. Create Unified Panel Initialization Method

```typescript
/**
 * Initialize unified control panels
 */
private initializeUnifiedPanels(): void {
  console.log('[APP] Initializing unified control panels...');
  
  const callbacks: UnifiedPanelCallbacks = {
    physics: {
      onParticleCountChange: (count: number) => {
        console.log('[Physics] Particle count changed:', count);
        this.mlsMpmSim.setParticleCount(count);
      },
      onSizeChange: (size: number) => {
        console.log('[Physics] Particle size changed:', size);
        // Update size in renderer
        if (this.rendererManager) {
          this.rendererManager.setParticleSize(size);
        }
      },
      onSimulationChange: (config: FlowConfig['simulation']) => {
        console.log('[Physics] Simulation config changed');
        // Update simulation settings
        this.mlsMpmSim.updateConfig(config);
      },
      onGravityChange: (gravityType: number) => {
        console.log('[Physics] Gravity type changed:', gravityType);
        // Handled in update loop
      },
      onMaterialChange: () => {
        console.log('[Physics] Material changed');
        // Update material in simulator
        if (this.panelManager.physicsTab) {
          const materialType = this.panelManager.physicsTab.getCurrentMaterialType();
          this.mlsMpmSim.setMaterialType(materialType);
        }
      },
      onForceFieldsChange: () => {
        console.log('[Physics] Force fields changed');
        // Update force fields
        if (this.panelManager.physicsTab) {
          const fields = this.panelManager.physicsTab.forceFieldManager.getActiveFields();
          this.mlsMpmSim.updateForceFields(fields);
        }
      },
      onEmittersChange: () => {
        console.log('[Physics] Emitters changed');
        // Update emitters
        if (this.panelManager.physicsTab) {
          const emitters = this.panelManager.physicsTab.emitterManager.getActiveEmitters();
          this.mlsMpmSim.updateEmitters(emitters);
        }
      },
      onBoundariesChange: () => {
        console.log('[Physics] Boundaries changed');
        // Boundaries updated via panel reference
      },
    },
    visuals: {
      onRenderModeChange: (mode: ParticleRenderMode) => {
        console.log('[Visuals] Render mode changed:', mode);
        this.preferredRenderMode = mode;
        this.rendererManager.switchRenderer(mode);
      },
      onMaterialPresetChange: (preset: any) => {
        console.log('[Visuals] Material preset changed:', preset);
        // Apply preset to renderer
        if (this.rendererManager) {
          this.rendererManager.applyMaterialPreset(preset);
        }
      },
      onColorModeChange: (mode: ColorMode) => {
        console.log('[Visuals] Color mode changed:', mode);
        // Update color mode
        if (this.rendererManager) {
          this.rendererManager.setColorMode(mode);
        }
      },
      onColorGradientChange: (gradientName: string) => {
        console.log('[Visuals] Color gradient changed:', gradientName);
        // Update gradient
        if (this.rendererManager) {
          this.rendererManager.setColorGradient(gradientName);
        }
      },
      onSizeChange: (size: number) => {
        console.log('[Visuals] Particle size changed:', size);
        if (this.rendererManager) {
          this.rendererManager.setParticleSize(size);
        }
      },
      onMaterialPropertyChange: (property: string, value: number) => {
        console.log('[Visuals] Material property changed:', property, value);
        if (this.rendererManager) {
          this.rendererManager.setMaterialProperty(property, value);
        }
      },
    },
    audio: {
      onAudioConfigChange: (config: Partial<AudioConfig>) => {
        console.log('[Audio] Audio config changed:', config);
        if (this.soundReactivity) {
          this.soundReactivity.updateConfig(config);
        }
      },
      onAudioReactiveConfigChange: (config: Partial<AudioReactiveConfig>) => {
        console.log('[Audio] Audio reactive config changed:', config);
        if (this.audioReactiveBehavior) {
          this.audioReactiveBehavior.updateConfig(config);
        }
      },
      onSourceChange: (source: 'microphone' | 'file') => {
        console.log('[Audio] Source changed:', source);
        if (this.soundReactivity) {
          this.soundReactivity.setSource(source);
        }
      },
      onFileLoad: (url: string) => {
        console.log('[Audio] File loaded:', url);
        if (this.soundReactivity) {
          this.soundReactivity.loadAudioFile(url);
        }
      },
      onTogglePlayback: () => {
        console.log('[Audio] Playback toggled');
        if (this.soundReactivity) {
          this.soundReactivity.togglePlayback();
        }
      },
      onVolumeChange: (volume: number) => {
        console.log('[Audio] Volume changed:', volume);
        if (this.soundReactivity) {
          this.soundReactivity.setVolume(volume);
        }
      },
    },
    postfx: {
      onBloomChange: (config: FlowConfig['bloom']) => {
        console.log('[PostFX] Bloom config changed');
        if (this.postFX) {
          this.postFX.updateBloom(config);
        }
      },
      onRadialFocusChange: (config: FlowConfig['radialFocus']) => {
        console.log('[PostFX] Radial focus config changed');
        if (this.postFX) {
          this.postFX.updateRadialFocus(config);
        }
      },
      onRadialCAChange: (config: FlowConfig['radialCA']) => {
        console.log('[PostFX] Radial CA config changed');
        if (this.postFX) {
          this.postFX.updateRadialCA(config);
        }
      },
    },
    library: {
      onMaterialPresetSelect: (presetName: string) => {
        console.log('[Library] Material preset selected:', presetName);
        // Apply preset
      },
      onScenePresetLoad: (presetName: string) => {
        console.log('[Library] Scene preset loaded:', presetName);
        // Load scene preset (use physics panel methods)
      },
      onConfigExport: () => {
        console.log('[Library] Config export requested');
        // Export handled by library tab
      },
      onConfigImport: (config: any) => {
        console.log('[Library] Config import requested');
        // Merge imported config
        Object.assign(this.config, config);
      },
    },
    settings: {
      onThemeChange: (theme: any) => {
        console.log('[Settings] Theme changed');
        // Theme handled by dashboard
      },
      onDockChange: (dock: 'left' | 'right' | 'bottom') => {
        console.log('[Settings] Dock position changed:', dock);
        // Dock handled by dashboard
      },
      onClearStorage: () => {
        console.log('[Settings] Clear storage requested');
        localStorage.clear();
      },
    },
  };
  
  // Create unified panel manager
  this.panelManager = createUnifiedPanels(this.config, callbacks);
  
  // Set up references
  if (this.panelManager.physicsTab) {
    this.panelManager.physicsTab.boundaries = this.boundaries;
  }
  
  if (this.panelManager.visualsTab) {
    this.panelManager.visualsTab.setRendererManager(this.rendererManager);
  }
  
  console.log('[APP] ✅ Unified control panels initialized');
}
```

---

### 5. Update Animation Loop

#### Replace Old FPS Updates
```typescript
// ❌ Remove these
if (this.physicPanel) {
  this.physicPanel.updateFPS();
}
```

#### Add Unified FPS Update
```typescript
// ✅ Add this
if (this.panelManager) {
  this.panelManager.updateFPS();
}
```

---

### 6. Update Metrics Updates

#### Replace Old Metrics Updates
```typescript
// ❌ Remove these
if (this.physicPanel) {
  this.physicPanel.updateMetrics(activeParticles, fps, kernelTime);
}

if (this.audioPanel && this.lastAudioData) {
  this.audioPanel.updateMetrics(this.lastAudioData);
}
```

#### Add Unified Metrics Updates
```typescript
// ✅ Add these
if (this.panelManager) {
  this.panelManager.updatePhysicsMetrics(activeParticles, fps, kernelTime);
  
  if (this.lastAudioData) {
    this.panelManager.updateAudioMetrics(this.lastAudioData);
  }
}
```

---

### 7. Update Disposal

#### Replace Old Dispose Calls
```typescript
// ❌ Remove these
this.postFXPanel?.dispose();
this.physicPanel?.dispose();
this.visualsPanel?.dispose();
this.audioPanel?.dispose();
this.themePanel?.dispose();
this.dashboard?.destroy();
```

#### Add Unified Dispose
```typescript
// ✅ Add this
this.panelManager?.dispose();
```

---

## 📊 Complete Example

Here's a complete diff showing all changes:

```diff
  import * as THREE from "three/webgpu";
  import { AppPipeline, type PipelineReporter } from './APP/pipeline';
  import type { ProgressCallback } from './APP/types';
  import { defaultConfig, updateParticleParams, type FlowConfig } from './config';
- import { Dashboard } from './PANEL/dashboard';
+ import { createUnifiedPanels, type UnifiedPanelCallbacks } from './PANEL';
  import { Scenery } from './STAGE/scenery';
  import { PostFX } from './POSTFX/postfx';
  import { ParticleBoundaries } from './PARTICLESYSTEM/physic/boundaries';
- import { PostFXPanel } from './PANEL/panels/postfx';
  import { MlsMpmSimulator } from './PARTICLESYSTEM/physic/mls-mpm';
  import { MeshRenderer } from './PARTICLESYSTEM/RENDERER/meshrenderer';
  import { PointRenderer } from './PARTICLESYSTEM/RENDERER/pointrenderer';
  import { RendererManager, ParticleRenderMode } from './PARTICLESYSTEM/RENDERER/renderercore';
- import { PhysicPanel, ColorMode } from './PANEL/panels/physics';
- import { VisualsPanel } from './PANEL/panels/visuals';
  import { SoundReactivity } from './AUDIO/soundreactivity';
  import type { AudioData } from './AUDIO/soundreactivity';
  import { AudioReactiveBehavior } from './AUDIO/audioreactive';
  import { AudioVisualizationManager } from './AUDIO/audiovisual';
- import { AudioPanel } from './PANEL/panels/audio';
- import { ThemeManagerPanel } from './PANEL/panels/theme';
  import { AdaptivePerformanceManager, type PerformanceChangeContext, type PerformanceTier } from './APP/performance';

  export class FlowApp {
    // Configuration
    private config: FlowConfig = { ...defaultConfig };

    // Core modules
    private scenery!: Scenery;
    private postFX!: PostFX;
-   private dashboard!: Dashboard;

    // Scene elements
    private boundaries!: ParticleBoundaries;

    // Particle system
    private mlsMpmSim!: MlsMpmSimulator;
    private rendererManager!: RendererManager;

-   // UI Panels
-   private postFXPanel!: PostFXPanel;
-   private physicPanel!: PhysicPanel;
-   private visualsPanel!: VisualsPanel;
-   private audioPanel!: AudioPanel;
-   private themePanel!: ThemeManagerPanel;
+   // Unified Panel Manager
+   private panelManager!: ReturnType<typeof createUnifiedPanels>;

    // ... rest of class ...

    private createInitializationPipeline(): AppPipeline {
      return new AppPipeline([
        { id: 'config', label: 'Configuration & dashboard', weight: 1, run: async () => this.initializeConfigAndDashboard() },
        { id: 'scenery', label: 'Scene & camera', weight: 2, run: async () => this.initializeScenery() },
        { id: 'postfx', label: 'Post-processing stack', weight: 1, run: async () => this.initializePostFX() },
        { id: 'boundaries', label: 'Particle boundaries', weight: 1, run: async () => this.initializeBoundaries() },
        { id: 'physics', label: 'Particle physics solver', weight: 2, run: async () => this.initializePhysics() },
        { id: 'renderers', label: 'Renderer systems', weight: 2, run: async () => this.initializeRenderers() },
-       { id: 'panels', label: 'Core control panels', weight: 1, run: async () => this.initializeCorePanels() },
+       { id: 'panels', label: 'Unified control panels', weight: 1, run: async () => this.initializeUnifiedPanels() },
        { id: 'audio', label: 'Audio reactivity stack', weight: 1, enabled: () => this.isAudioPipelineEnabled(), run: async () => this.initializeAudioSystems() },
-       { id: 'visuals', label: 'Visual controls', weight: 1, run: async () => this.initializeVisualsPanel() },
-       { id: 'audio-panel', label: 'Audio control panel', weight: 1, enabled: () => this.isAudioPipelineEnabled(), run: async () => this.initializeAudioPanel() },
        { id: 'interaction', label: 'Input & resize wiring', weight: 1, run: async () => this.initializeInteraction() },
      ]);
    }

-   private initializeConfigAndDashboard(): void {
-     updateParticleParams(this.config);
-     this.dashboard = new Dashboard({ showInfo: false, showFPS: false });
-   }
+   private initializeConfigAndDashboard(): void {
+     updateParticleParams(this.config);
+     // Dashboard created by UnifiedPanelManager
+   }

    // ... rest of methods ...
  }
```

---

## ✅ Benefits

1. **Cleaner Code** - Single initialization method vs. multiple
2. **Type Safety** - Unified callback interface
3. **Better Organization** - All callbacks in one place
4. **Easier Maintenance** - One manager to rule them all
5. **Enhanced UX** - Unified dashboard with better styling

---

## 🎯 Next Steps

1. Update APP.ts with these changes
2. Test all panel functionality
3. Verify callbacks are working
4. Test drag-and-dock behavior
5. Remove old panel files (optional)


