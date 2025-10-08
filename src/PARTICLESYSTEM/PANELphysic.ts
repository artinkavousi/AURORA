/**
 * PARTICLESYSTEM/PANELphysic.ts - Premium particle physics control panel
 * Elegant, organized UI for advanced particle system controls
 */

import type { Pane } from 'tweakpane';
import type { FlowConfig } from '../config';
import { updateParticleParams } from '../config';
import * as THREE from "three/webgpu";
import { 
  MaterialType, 
  MATERIAL_PRESETS, 
  MaterialManager 
} from './physic/materials';
import {
  ForceFieldType,
  ForceFalloff,
  type ForceFieldConfig,
  ForceFieldManager,
  FORCE_FIELD_PRESETS
} from './physic/forcefields';
import {
  EmitterType,
  EmissionPattern,
  type ParticleEmitterConfig,
  ParticleEmitterManager,
  EMITTER_PRESETS
} from './physic/emitters';
import {
  BoundaryShape,
  CollisionMode,
  type ParticleBoundaries
} from './physic/boundaries';
import { ColorMode } from './visuals/colormodes';

export interface PhysicPanelCallbacks {
  onParticleCountChange?: (count: number) => void;
  onSimulationChange?: (config: FlowConfig['simulation']) => void;
  onGravityChange?: (gravityType: number) => void;
  onMaterialChange?: () => void;
  onForceFieldsChange?: () => void;
  onEmittersChange?: () => void;
  onBoundariesChange?: () => void;
}

/**
 * PhysicPanel - Premium particle physics control panel
 * Clean, organized interface with advanced controls
 */
export class PhysicPanel {
  private pane: any;
  private config: FlowConfig;
  private callbacks: PhysicPanelCallbacks;
  private gravitySensor: any = null;
  public fpsGraph: any = null; // Public so APP.ts can access for begin()/end()
  
  public materialManager: MaterialManager;
  public forceFieldManager: ForceFieldManager;
  public emitterManager: ParticleEmitterManager;
  public boundaries: ParticleBoundaries | null = null;
  
  private selectedMaterialType: MaterialType = MaterialType.FLUID;
  
  public metrics = {
    activeParticles: 0,
    simulationFPS: 0,
    kernelTime: 0,
  };
  
  constructor(
    pane: Pane,
    config: FlowConfig,
    callbacks: PhysicPanelCallbacks = {}
  ) {
    this.config = config;
    this.callbacks = callbacks;
    
    this.materialManager = new MaterialManager();
    this.forceFieldManager = new ForceFieldManager(8);
    this.emitterManager = new ParticleEmitterManager(8);
    
    // Use provided pane from unified panel system
    this.pane = pane;
    this.setupUI();
  }
  
  private setupUI(): void {
    this.setupMetrics();
    this.setupSimulationControls();
    this.setupParticleControls();
    this.setupMaterialManager();
    this.setupForceFieldManager();
    this.setupEmitterManager();
    this.setupBoundaryControls();
    this.setupVisualSettings();
    this.setupPresets();
  }
  
  // ========================================
  // PERFORMANCE METRICS
  // ========================================
  
  private setupMetrics(): void {
    const folder = this.pane.addFolder({ 
      title: "📊 Performance", 
      expanded: true 
    });
    
    // Add FPS graph at the top
    this.fpsGraph = folder.addBlade({
      view: 'fpsgraph',
      label: 'FPS',
      rows: 3,
      lineCount: 2,
    });
    
    folder.addBinding(this.metrics, "activeParticles", { 
      label: "Particles", 
      readonly: true 
    });
    
    folder.addBinding(this.metrics, "simulationFPS", { 
      label: "Sim FPS", 
      readonly: true, 
      format: (v: number) => v.toFixed(1) 
    });
    
    folder.addBinding(this.metrics, "kernelTime", { 
      label: "Kernel Time", 
      readonly: true, 
      format: (v: number) => `${v.toFixed(2)}ms` 
    });
  }
  
  /**
   * Update FPS graph (call from animation loop)
   */
  public updateFPS(): void {
    if (this.fpsGraph) {
      this.fpsGraph.begin();
      this.fpsGraph.end();
    }
  }
  
  // ========================================
  // SIMULATION CONTROLS
  // ========================================
  
  private setupSimulationControls(): void {
    const folder = this.pane.addFolder({ 
      title: "⚙️ Simulation", 
      expanded: true 
    });
    
    folder.addBinding(this.config.simulation, "run", { label: "▶️ Running" });

    folder.addBlade({ view: 'separator' });
    
    folder.addBinding(this.config.simulation, "speed", {
      label: "Speed", 
      min: 0.1, 
      max: 3.0, 
      step: 0.1,
    }).on('change', () => this.callbacks.onSimulationChange?.(this.config.simulation));
    
    folder.addBlade({
      view: 'list', 
      label: 'Gravity', 
      value: this.config.simulation.gravityType,
      options: [
        { text: '← Back', value: 0 },
        { text: '↓ Down', value: 1 },
        { text: '○ Center', value: 2 },
        { text: '📱 Device', value: 3 },
      ],
    }).on('change', (ev: any) => {
      if (ev.value === 3) this.setupGravitySensor();
      this.config.simulation.gravityType = ev.value;
      this.callbacks.onGravityChange?.(ev.value);
    });
    
    // Advanced
    const advFolder = folder.addFolder({ 
      title: "Advanced Physics", 
      expanded: false 
    });
    
    // FLIP/PIC Hybrid Controls
    advFolder.addBlade({
      view: 'list',
      label: 'Transfer Mode',
      value: this.config.simulation.transferMode,
      options: [
        { text: 'PIC (Stable)', value: 0 },
        { text: 'FLIP (Energetic)', value: 1 },
        { text: 'Hybrid (Best)', value: 2 },
      ],
    }).on('change', (ev: any) => {
      this.config.simulation.transferMode = ev.value;
      this.callbacks.onSimulationChange?.(this.config.simulation);
    });
    
    advFolder.addBinding(this.config.simulation, "flipRatio", {
      label: "FLIP Ratio",
      min: 0.0,
      max: 1.0,
      step: 0.05,
    }).on('change', () => this.callbacks.onSimulationChange?.(this.config.simulation));
    
    advFolder.addBlade({ view: 'separator' });
    
    // Vorticity Confinement
    advFolder.addBinding(this.config.simulation, "vorticityEnabled", {
      label: "✨ Vorticity",
    }).on('change', () => this.callbacks.onSimulationChange?.(this.config.simulation));
    
    advFolder.addBinding(this.config.simulation, "vorticityEpsilon", {
      label: "Strength",
      min: 0.0,
      max: 1.0,
      step: 0.05,
    }).on('change', () => this.callbacks.onSimulationChange?.(this.config.simulation));
    
    advFolder.addBlade({ view: 'separator' });
    
    // Surface Tension
    advFolder.addBinding(this.config.simulation, "surfaceTensionEnabled", {
      label: "💧 Surface Tension",
    }).on('change', () => this.callbacks.onSimulationChange?.(this.config.simulation));
    
    advFolder.addBinding(this.config.simulation, "surfaceTensionCoeff", {
      label: "Coefficient",
      min: 0.0,
      max: 2.0,
      step: 0.1,
    }).on('change', () => this.callbacks.onSimulationChange?.(this.config.simulation));
    
    advFolder.addBlade({ view: 'separator' });
    
    // Performance Optimizations
    advFolder.addBinding(this.config.simulation, "sparseGrid", {
      label: "⚡ Sparse Grid",
    }).on('change', () => this.callbacks.onSimulationChange?.(this.config.simulation));
    
    advFolder.addBinding(this.config.simulation, "adaptiveTimestep", {
      label: "🎯 Adaptive DT",
    }).on('change', () => this.callbacks.onSimulationChange?.(this.config.simulation));
    
    advFolder.addBinding(this.config.simulation, "cflTarget", {
      label: "CFL Target",
      min: 0.3,
      max: 1.0,
      step: 0.05,
    }).on('change', () => this.callbacks.onSimulationChange?.(this.config.simulation));
    
    advFolder.addBlade({ view: 'separator' });
    
    advFolder.addBinding(this.config.simulation, "noise", {
      label: "Turbulence", 
      min: 0, 
      max: 3.0, 
      step: 0.01,
    }).on('change', () => this.callbacks.onSimulationChange?.(this.config.simulation));
    
    advFolder.addBinding(this.config.simulation, "density", {
      label: "Density", 
      min: 0.2, 
      max: 3.0, 
      step: 0.1,
    }).on('change', () => {
      updateParticleParams(this.config);
      this.callbacks.onSimulationChange?.(this.config.simulation);
    });
  }
  
  // ========================================
  // PARTICLE SETTINGS
  // ========================================
  
  private setupParticleControls(): void {
    const folder = this.pane.addFolder({ 
      title: "⚛️ Particles", 
      expanded: true 
    });
    
    folder.addBinding(this.config.particles, "count", {
      label: "Count", 
      min: 4096, 
      max: this.config.particles.maxCount, 
      step: 4096,
    }).on('change', () => {
      updateParticleParams(this.config);
      this.callbacks.onParticleCountChange?.(this.config.particles.count);
    });
    
    // NOTE: Size and rendering mode moved to Visuals Panel
    // Physics panel focuses on particle count and physics properties only
  }
  
  // ========================================
  // MATERIALS
  // ========================================
  
  private setupMaterialManager(): void {
    const folder = this.pane.addFolder({ 
      title: "🧪 Materials", 
      expanded: false 
    });
    
    folder.addBlade({
      view: 'list', 
      label: 'Type', 
      value: this.selectedMaterialType,
      options: [
        { text: '💧 Fluid', value: MaterialType.FLUID },
        { text: '🎈 Elastic', value: MaterialType.ELASTIC },
        { text: '🏖️ Sand', value: MaterialType.SAND },
        { text: '❄️ Snow', value: MaterialType.SNOW },
        { text: '☁️ Foam', value: MaterialType.FOAM },
        { text: '🍯 Viscous', value: MaterialType.VISCOUS },
        { text: '⚙️ Rigid', value: MaterialType.RIGID },
        { text: '⚡ Plasma', value: MaterialType.PLASMA },
      ],
    }).on('change', (ev: any) => {
      this.selectedMaterialType = ev.value;
      this.callbacks.onMaterialChange?.();
    });
  }
  
  // ========================================
  // FORCE FIELDS
  // ========================================
  
  private setupForceFieldManager(): void {
    const folder = this.pane.addFolder({ 
      title: "🌀 Force Fields", 
      expanded: false 
    });
    
    folder.addButton({ title: '➕ Add Attractor' }).on('click', () => {
      this.forceFieldManager.addField({
        type: ForceFieldType.ATTRACTOR,
        position: new THREE.Vector3(0, 5, 0),
        strength: 20.0, 
        radius: 15.0,
      });
      this.callbacks.onForceFieldsChange?.();
    });

    folder.addButton({ title: '➕ Add Repeller' }).on('click', () => {
      this.forceFieldManager.addField({
        type: ForceFieldType.REPELLER,
        position: new THREE.Vector3(0, 5, 0),
        strength: 20.0, 
        radius: 15.0,
      });
      this.callbacks.onForceFieldsChange?.();
    });
    
    const presetFolder = folder.addFolder({ 
      title: 'Presets', 
      expanded: false 
    });
    
    Object.keys(FORCE_FIELD_PRESETS).forEach(key => {
      presetFolder.addButton({ 
        title: key.toLowerCase().replace(/_/g, ' ') 
      }).on('click', () => {
        this.forceFieldManager.addPreset(key as keyof typeof FORCE_FIELD_PRESETS);
        this.callbacks.onForceFieldsChange?.();
      });
    });
  }
  
  // ========================================
  // EMITTERS
  // ========================================
  
  private setupEmitterManager(): void {
    const folder = this.pane.addFolder({ 
      title: "💫 Emitters", 
      expanded: false 
    });
    
    folder.addButton({ title: '➕ Add Emitter' }).on('click', () => {
      this.emitterManager.addEmitter({
        type: EmitterType.POINT,
        pattern: EmissionPattern.CONTINUOUS,
        position: new THREE.Vector3(0, 5, 0),
        rate: 100,
      });
      this.callbacks.onEmittersChange?.();
    });
    
    const presetFolder = folder.addFolder({ 
      title: 'Presets', 
      expanded: false 
    });
    
    Object.keys(EMITTER_PRESETS).forEach(key => {
      presetFolder.addButton({ 
        title: key.toLowerCase().replace(/_/g, ' ') 
      }).on('click', () => {
        this.emitterManager.addPreset(key as keyof typeof EMITTER_PRESETS);
        this.callbacks.onEmittersChange?.();
      });
    });
  }
  
  // ========================================
  // BOUNDARIES - Full Control System
  // ========================================
  
  private setupBoundaryControls(): void {
    const folder = this.pane.addFolder({ 
      title: "🔲 Boundaries", 
      expanded: true  // Expanded by default to show key controls
    });
    
    // Boundary state object for UI binding
    const boundaryState = {
      container: 'none' as string,  // Container type (includes enabled state)
      wallStiffness: 0.3,
      wallThickness: 3,
      restitution: 0.3,
      friction: 0.1,
      collisionMode: 'reflect' as string,
      visible: false,  // Default hidden
    };
    
    // ========== MAIN CONTROLS ==========
    
    // Container type selector - PRIMARY CONTROL
    folder.addBlade({
      view: 'list',
      label: 'Container',
      value: boundaryState.container,
      options: [
        { text: '∞ None (Viewport)', value: 'none' },
        { text: '📦 Box', value: 'box' },
        { text: '⚪ Sphere', value: 'sphere' },
        { text: '🛢️ Tube', value: 'tube' },
        { text: '🔷 Dodecahedron', value: 'dodecahedron' },
      ],
    }).on('change', async (ev: any) => {
      if (this.boundaries) {
        const containerMap: Record<string, { shape: BoundaryShape, enabled: boolean }> = {
          'none': { shape: BoundaryShape.NONE, enabled: false },
          'box': { shape: BoundaryShape.BOX, enabled: true },
          'sphere': { shape: BoundaryShape.SPHERE, enabled: true },
          'tube': { shape: BoundaryShape.TUBE, enabled: true },
          'dodecahedron': { shape: BoundaryShape.DODECAHEDRON, enabled: true },
        };
        
        const config = containerMap[ev.value];
        if (config) {
          await this.boundaries.setShape(config.shape);
          this.boundaries.setEnabled(config.enabled);
          
          // Auto-show visual for containers (except NONE)
          if (config.enabled && ev.value !== 'none') {
            this.boundaries.setVisible(true);
            boundaryState.visible = true;
          } else {
            this.boundaries.setVisible(false);
            boundaryState.visible = false;
          }
          
          boundaryState.container = ev.value;
          this.pane.refresh();
          this.callbacks.onBoundariesChange?.();
        }
      }
    });
    
    // Collision mode
    folder.addBlade({
      view: 'list',
      label: 'Collision',
      value: boundaryState.collisionMode,
      options: [
        { text: '↩️ Reflect', value: 'reflect' },
        { text: '🛑 Clamp', value: 'clamp' },
        { text: '🔄 Wrap', value: 'wrap' },
        { text: '💀 Kill', value: 'kill' },
      ],
    }).on('change', (ev: any) => {
      if (this.boundaries) {
        const modeMap: Record<string, CollisionMode> = {
          'reflect': CollisionMode.REFLECT,
          'clamp': CollisionMode.CLAMP,
          'wrap': CollisionMode.WRAP,
          'kill': CollisionMode.KILL,
        };
        this.boundaries.setCollisionMode(modeMap[ev.value]);
        boundaryState.collisionMode = ev.value;
        this.callbacks.onBoundariesChange?.();
      }
    });
    
    // Visibility toggle (only for containers, not NONE)
    folder.addBinding(boundaryState, 'visible', {
      label: '👁️ Show Container',
    }).on('change', (ev: any) => {
      if (this.boundaries && boundaryState.container !== 'none') {
        this.boundaries.setVisible(ev.value);
      }
    });
    
    // ========== PROPERTIES FOLDER ==========
    
    const propsFolder = folder.addFolder({ 
      title: 'Properties', 
      expanded: false 
    });
    
    propsFolder.addBinding(boundaryState, 'wallStiffness', {
      label: 'Stiffness',
      min: 0.0,
      max: 1.0,
      step: 0.05,
    }).on('change', (ev: any) => {
      if (this.boundaries) {
        this.boundaries.setWallStiffness(ev.value);
        this.callbacks.onBoundariesChange?.();
      }
    });
    
    propsFolder.addBinding(boundaryState, 'wallThickness', {
      label: 'Thickness',
      min: 1,
      max: 10,
      step: 0.5,
    }).on('change', (ev: any) => {
      if (this.boundaries) {
        this.boundaries.setWallThickness(ev.value);
        this.callbacks.onBoundariesChange?.();
      }
    });
    
    propsFolder.addBinding(boundaryState, 'restitution', {
      label: 'Bounce',
      min: 0.0,
      max: 1.0,
      step: 0.05,
    }).on('change', (ev: any) => {
      if (this.boundaries) {
        this.boundaries.setRestitution(ev.value);
        this.callbacks.onBoundariesChange?.();
      }
    });
    
    propsFolder.addBinding(boundaryState, 'friction', {
      label: 'Friction',
      min: 0.0,
      max: 1.0,
      step: 0.05,
    }).on('change', (ev: any) => {
      if (this.boundaries) {
        this.boundaries.setFriction(ev.value);
        this.callbacks.onBoundariesChange?.();
      }
    });
    
    // ========== QUICK PRESETS ==========
    
    const presetFolder = folder.addFolder({ 
      title: 'Quick Presets', 
      expanded: false 
    });
    
    presetFolder.addButton({ title: '💧 Fluid Container' }).on('click', () => {
      if (this.boundaries) {
        this.boundaries.setWallStiffness(0.3);
        this.boundaries.setRestitution(0.2);
        this.boundaries.setFriction(0.1);
        boundaryState.wallStiffness = 0.3;
        boundaryState.restitution = 0.2;
        boundaryState.friction = 0.1;
        this.pane.refresh();
        this.callbacks.onBoundariesChange?.();
      }
    });
    
    presetFolder.addButton({ title: '🎈 Bouncy Ball' }).on('click', () => {
      if (this.boundaries) {
        this.boundaries.setWallStiffness(0.8);
        this.boundaries.setRestitution(0.9);
        this.boundaries.setFriction(0.0);
        boundaryState.wallStiffness = 0.8;
        boundaryState.restitution = 0.9;
        boundaryState.friction = 0.0;
        this.pane.refresh();
        this.callbacks.onBoundariesChange?.();
      }
    });
    
    presetFolder.addButton({ title: '🏖️ Sticky Sand' }).on('click', () => {
      if (this.boundaries) {
        this.boundaries.setWallStiffness(0.5);
        this.boundaries.setRestitution(0.1);
        this.boundaries.setFriction(0.8);
        boundaryState.wallStiffness = 0.5;
        boundaryState.restitution = 0.1;
        boundaryState.friction = 0.8;
        this.pane.refresh();
        this.callbacks.onBoundariesChange?.();
      }
    });
    
    presetFolder.addButton({ title: '🌀 Free Flow (Viewport)' }).on('click', async () => {
      if (this.boundaries) {
        await this.boundaries.setShape(BoundaryShape.NONE);
        this.boundaries.setEnabled(false);
        this.boundaries.setVisible(false);
        boundaryState.container = 'none';
        boundaryState.visible = false;
        this.pane.refresh();
        this.callbacks.onBoundariesChange?.();
      }
    });
  }
  
  // ========================================
  // VISUAL SETTINGS
  // ========================================
  
  private setupVisualSettings(): void {
    // NOTE: All visual controls (color mode, bloom, debug visualization) 
    // have been moved to the Visuals Panel as part of the consolidation.
    // Physics panel now focuses purely on physics parameters.
    // This method kept for backward compatibility but does nothing.
  }
  
  // ========================================
  // PRESETS
  // ========================================
  
  private setupPresets(): void {
    const folder = this.pane.addFolder({ 
      title: "📦 Scene Presets", 
      expanded: false 
    });
    
    folder.addButton({ title: '💧 Water Fountain' })
      .on('click', () => this.loadWaterFountain());
    
    folder.addButton({ title: '❄️ Snow Storm' })
      .on('click', () => this.loadSnowStorm());
    
    folder.addButton({ title: '🌪️ Tornado' })
      .on('click', () => this.loadTornado());
    
    folder.addButton({ title: '💥 Explosion' })
      .on('click', () => this.loadExplosion());
    
    folder.addButton({ title: '🌀 Galaxy' })
      .on('click', () => this.loadGalaxy());
  }
  
  // ========================================
  // PRESET LOADERS
  // ========================================
  
  private loadWaterFountain(): void {
    this.emitterManager.clearEmitters();
    this.forceFieldManager.clearFields();
    this.emitterManager.addPreset('FOUNTAIN');
    this.selectedMaterialType = MaterialType.FLUID;
    this.config.simulation.gravityType = 1;
    this.callbacks.onMaterialChange?.();
    this.callbacks.onEmittersChange?.();
  }
  
  private loadSnowStorm(): void {
    this.emitterManager.clearEmitters();
    this.forceFieldManager.clearFields();
    this.emitterManager.addPreset('SNOW');
    this.forceFieldManager.addPreset('WIND');
    this.forceFieldManager.addPreset('TURBULENCE');
    this.selectedMaterialType = MaterialType.SNOW;
    this.callbacks.onMaterialChange?.();
    this.callbacks.onEmittersChange?.();
    this.callbacks.onForceFieldsChange?.();
  }
  
  private loadTornado(): void {
    this.emitterManager.clearEmitters();
    this.forceFieldManager.clearFields();
    this.forceFieldManager.addPreset('TORNADO');
    this.emitterManager.addPreset('SANDSTORM');
    this.selectedMaterialType = MaterialType.SAND;
    this.callbacks.onMaterialChange?.();
    this.callbacks.onEmittersChange?.();
    this.callbacks.onForceFieldsChange?.();
  }
  
  private loadExplosion(): void {
    this.emitterManager.clearEmitters();
    this.forceFieldManager.clearFields();
    this.emitterManager.addPreset('EXPLOSION');
    this.forceFieldManager.addPreset('EXPLOSION');
    this.selectedMaterialType = MaterialType.PLASMA;
    this.callbacks.onMaterialChange?.();
    this.callbacks.onEmittersChange?.();
    this.callbacks.onForceFieldsChange?.();
  }
  
  private loadGalaxy(): void {
    this.emitterManager.clearEmitters();
    this.forceFieldManager.clearFields();
    this.forceFieldManager.addPreset('GALAXY_SPIRAL');
    this.emitterManager.addPreset('SPARK_BURST');
    this.selectedMaterialType = MaterialType.PLASMA;
    this.config.simulation.gravityType = 2;
    this.callbacks.onMaterialChange?.();
    this.callbacks.onEmittersChange?.();
    this.callbacks.onForceFieldsChange?.();
  }
  
  // ========================================
  // UTILITIES
  // ========================================
  
  private setupGravitySensor(): void {
    if (this.gravitySensor) return;
    try {
      // @ts-ignore
      this.gravitySensor = new GravitySensor({ frequency: 60 });
      this.gravitySensor.addEventListener("reading", () => {
        this.config.gravitySensorReading.copy(this.gravitySensor).divideScalar(50);
        this.config.gravitySensorReading.y *= -1;
      });
      this.gravitySensor.start();
    } catch (error) {
      console.warn("GravitySensor not available:", error);
    }
  }
  
  public updateMetrics(activeParticles: number, fps: number, kernelTime: number): void {
    this.metrics.activeParticles = activeParticles;
    this.metrics.simulationFPS = fps;
    this.metrics.kernelTime = kernelTime;
  }
  
  public getCurrentMaterialType(): MaterialType {
    return this.selectedMaterialType;
  }
  
  public dispose(): void {
    this.pane.dispose();
    if (this.gravitySensor) this.gravitySensor.stop();
  }
}
