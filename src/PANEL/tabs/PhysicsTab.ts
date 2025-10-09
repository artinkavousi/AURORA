/**
 * PANEL/tabs/PhysicsTab.ts - Physics & simulation controls tab
 * Migrated and enhanced from PARTICLESYSTEM/PANELphysic.ts
 */

import type { Pane } from 'tweakpane';
import type { FlowConfig } from '../../config';
import { updateParticleParams } from '../../config';
import { BaseTab, type BaseCallbacks } from '../types';
import * as THREE from "three/webgpu";
import { 
  MaterialType, 
  MATERIAL_PRESETS, 
  MaterialManager 
} from '../../PARTICLESYSTEM/physic/materials';
import {
  ForceFieldType,
  type ForceFieldConfig,
  ForceFieldManager,
  FORCE_FIELD_PRESETS
} from '../../PARTICLESYSTEM/physic/forcefields';
import {
  EmitterType,
  EmissionPattern,
  type ParticleEmitterConfig,
  ParticleEmitterManager,
  EMITTER_PRESETS
} from '../../PARTICLESYSTEM/physic/emitters';
import {
  BoundaryShape,
  CollisionMode,
  type ParticleBoundaries
} from '../../PARTICLESYSTEM/physic/boundaries';

export interface PhysicsTabCallbacks extends BaseCallbacks {
  onParticleCountChange?: (count: number) => void;
  onSizeChange?: (size: number) => void;
  onSimulationChange?: (config: FlowConfig['simulation']) => void;
  onGravityChange?: (gravityType: number) => void;
  onMaterialChange?: () => void;
  onForceFieldsChange?: () => void;
  onEmittersChange?: () => void;
  onBoundariesChange?: () => void;
}

export enum ColorMode {
  VELOCITY = 0,
  DENSITY = 1,
  PRESSURE = 2,
  MATERIAL = 3,
  FORCE_MAGNITUDE = 4,
  CUSTOM_HSV = 5,
}

/**
 * PhysicsTab - Comprehensive particle physics controls
 */
export class PhysicsTab extends BaseTab {
  private gravitySensor: any = null;
  public fpsGraph: any = null;
  
  public materialManager: MaterialManager;
  public forceFieldManager: ForceFieldManager;
  public emitterManager: ParticleEmitterManager;
  public boundaries: ParticleBoundaries | null = null;
  
  private selectedMaterialType: MaterialType = MaterialType.FLUID;
  public colorMode: ColorMode = ColorMode.VELOCITY;
  
  public debugVisualization = {
    showGrid: false,
    showForceFields: true,
    showEmitters: true,
    showBoundaries: true,
    showVelocityVectors: false,
  };
  
  public metrics = {
    activeParticles: 0,
    simulationFPS: 0,
    kernelTime: 0,
  };

  constructor(pane: Pane, config: FlowConfig, callbacks: PhysicsTabCallbacks = {}) {
    super(pane, config, callbacks);
    
    this.materialManager = new MaterialManager();
    this.forceFieldManager = new ForceFieldManager(8);
    this.emitterManager = new ParticleEmitterManager(8);
  }

  buildUI(): void {
    // Core sections in optimized order
    this.setupMetrics();
    this.setupScenePresets();
    this.setupSimulationEngine();
    this.setupPhysicsProperties();
    this.setupEnvironmentControls();
    this.setupVisualizationSettings();
  }
  
  private setupScenePresets(): void {
    const folder = this.createFolder("🎬 Scene Presets", true);
    
    folder.addBlade({
      view: 'buttongrid',
      size: [2, 3],
      cells: (x: number, y: number) => {
        const presets = [
          ['💧 Fountain', '❄️ Snow'],
          ['🌪️ Tornado', '💥 Explosion'],
          ['🌀 Galaxy', '⚡ Spark']
        ];
        return { title: presets[y][x] };
      },
      label: 'Quick Scenes',
    }).on('click', (ev: any) => {
      const scenes = ['fountain', 'snow', 'tornado', 'explosion', 'galaxy', 'spark'];
      const index = ev.index[1] * 2 + ev.index[0];
      if (index < scenes.length) {
        this.loadScenePreset(scenes[index]);
      }
    });
  }
  
  private setupSimulationEngine(): void {
    const folder = this.createFolder("⚙️ Simulation Engine", true);
    
    // Main controls group
    const mainGroup = folder.addFolder({ title: 'Core Controls', expanded: true });
    mainGroup.addBinding(this.config.simulation, "run", { label: "▶️ Running" });
    mainGroup.addBinding(this.config.simulation, "speed", { 
      label: "Time Scale", 
      min: 0.1, 
      max: 3.0, 
      step: 0.1 
    }).on('change', () => {
      (this.callbacks as PhysicsTabCallbacks).onSimulationChange?.(this.config.simulation);
    });
    
    // Particle configuration
    const particlesGroup = folder.addFolder({ title: 'Particles', expanded: true });
    particlesGroup.addBinding(this.config.particles, "count", {
      label: "Count",
      min: 4096,
      max: this.config.particles.maxCount,
      step: 4096,
    }).on('change', () => {
      updateParticleParams(this.config);
      (this.callbacks as PhysicsTabCallbacks).onParticleCountChange?.(this.config.particles.count);
    });
    
    particlesGroup.addBinding(this.config.particles, "size", {
      label: "Base Size",
      min: 0.1,
      max: 3.0,
      step: 0.1,
    }).on('change', () => {
      updateParticleParams(this.config);
      (this.callbacks as PhysicsTabCallbacks).onSizeChange?.(this.config.particles.actualSize);
    });
    
    particlesGroup.addBinding(this.config.simulation, "density", {
      label: "Density",
      min: 0.2,
      max: 3.0,
      step: 0.1,
    }).on('change', () => {
      updateParticleParams(this.config);
      (this.callbacks as PhysicsTabCallbacks).onSimulationChange?.(this.config.simulation);
    });
    
    // Advanced solver settings
    this.setupAdvancedSolver(folder);
  }
  
  private setupAdvancedSolver(parentFolder: any): void {
    const folder = parentFolder.addFolder({ title: "Advanced Solver", expanded: false });
    
    // Transfer method
    const transferGroup = folder.addFolder({ title: 'FLIP/PIC Transfer', expanded: true });
    this.createList(
      'Mode',
      this.config.simulation.transferMode,
      {
        'PIC (Stable)': 0,
        'FLIP (Energetic)': 1,
        'Hybrid (Balanced)': 2,
      },
      (value: number) => {
        this.config.simulation.transferMode = value;
        (this.callbacks as PhysicsTabCallbacks).onSimulationChange?.(this.config.simulation);
      }
    );
    
    transferGroup.addBinding(this.config.simulation, "flipRatio", {
      label: "FLIP Ratio",
      min: 0.0,
      max: 1.0,
      step: 0.05,
    }).on('change', () => {
      (this.callbacks as PhysicsTabCallbacks).onSimulationChange?.(this.config.simulation);
    });
    
    // Performance optimizations
    const perfGroup = folder.addFolder({ title: 'Performance', expanded: false });
    perfGroup.addBinding(this.config.simulation, "sparseGrid", { label: "⚡ Sparse Grid" });
    perfGroup.addBinding(this.config.simulation, "adaptiveTimestep", { label: "🎯 Adaptive DT" });
    perfGroup.addBinding(this.config.simulation, "cflTarget", {
      label: "CFL Target",
      min: 0.3,
      max: 1.0,
      step: 0.05,
    }).on('change', () => {
      (this.callbacks as PhysicsTabCallbacks).onSimulationChange?.(this.config.simulation);
    });
  }
  
  private setupPhysicsProperties(): void {
    const folder = this.createFolder("🌊 Physics Properties", true);
    
    // Material selection
    const materialGroup = folder.addFolder({ title: 'Material Type', expanded: true });
    this.createList(
      'Type',
      this.selectedMaterialType,
      {
        '💧 Fluid': MaterialType.FLUID,
        '🎈 Elastic': MaterialType.ELASTIC,
        '🏖️ Sand': MaterialType.SAND,
        '❄️ Snow': MaterialType.SNOW,
        '☁️ Foam': MaterialType.FOAM,
        '🍯 Viscous': MaterialType.VISCOUS,
        '⚙️ Rigid': MaterialType.RIGID,
        '⚡ Plasma': MaterialType.PLASMA,
      },
      (value: number) => {
        this.selectedMaterialType = value;
        (this.callbacks as PhysicsTabCallbacks).onMaterialChange?.();
      }
    );
    
    // Vorticity enhancement
    const vorticityGroup = folder.addFolder({ title: 'Vorticity', expanded: false });
    vorticityGroup.addBinding(this.config.simulation, "vorticityEnabled", { label: "✨ Enable" });
    vorticityGroup.addBinding(this.config.simulation, "vorticityEpsilon", {
      label: "Strength",
      min: 0.0,
      max: 1.0,
      step: 0.05,
    }).on('change', () => {
      (this.callbacks as PhysicsTabCallbacks).onSimulationChange?.(this.config.simulation);
    });
    
    // Surface tension
    const tensionGroup = folder.addFolder({ title: 'Surface Tension', expanded: false });
    tensionGroup.addBinding(this.config.simulation, "surfaceTensionEnabled", { label: "💧 Enable" });
    tensionGroup.addBinding(this.config.simulation, "surfaceTensionCoeff", {
      label: "Coefficient",
      min: 0.0,
      max: 2.0,
      step: 0.1,
    }).on('change', () => {
      (this.callbacks as PhysicsTabCallbacks).onSimulationChange?.(this.config.simulation);
    });
    
    // Turbulence
    folder.addBlade({ view: 'separator' });
    folder.addBinding(this.config.simulation, "noise", {
      label: "🌀 Turbulence",
      min: 0,
      max: 3.0,
      step: 0.01,
    }).on('change', () => {
      (this.callbacks as PhysicsTabCallbacks).onSimulationChange?.(this.config.simulation);
    });
  }
  
  private setupEnvironmentControls(): void {
    const folder = this.createFolder("🌍 Environment", true);
    
    // Gravity system
    const gravityGroup = folder.addFolder({ title: 'Gravity', expanded: true });
    this.createList(
      'Direction',
      this.config.simulation.gravityType,
      {
        '← Back': 0,
        '↓ Down': 1,
        '○ Center': 2,
        '📱 Device': 3,
      },
      (value: number) => {
        if (value === 3) this.setupGravitySensor();
        this.config.simulation.gravityType = value;
        (this.callbacks as PhysicsTabCallbacks).onGravityChange?.(value);
      }
    );
    
    // Boundaries and containers
    this.setupBoundarySystem(folder);
    
    // Force fields
    this.setupForceFieldSystem(folder);
    
    // Emitters
    this.setupEmitterSystem(folder);
  }
  
  private setupBoundarySystem(parentFolder: any): void {
    const folder = parentFolder.addFolder({ title: 'Boundaries & Container', expanded: true });
    
    const boundaryState = {
      container: 'none' as string,
      wallStiffness: 0.3,
      wallThickness: 3,
      restitution: 0.3,
      friction: 0.1,
      collisionMode: 'reflect' as string,
      visible: false,
    };
    
    // Container type
    this.createList(
      'Shape',
      boundaryState.container,
      {
        '∞ Viewport': 'none',
        '📦 Box': 'box',
        '⚪ Sphere': 'sphere',
        '🛢️ Tube': 'tube',
        '🔷 Dodecahedron': 'dodecahedron',
      },
      async (value: string) => {
        if (!this.boundaries) return;
        const containerMap: Record<string, { shape: BoundaryShape, enabled: boolean }> = {
          'none': { shape: BoundaryShape.NONE, enabled: false },
          'box': { shape: BoundaryShape.BOX, enabled: true },
          'sphere': { shape: BoundaryShape.SPHERE, enabled: true },
          'tube': { shape: BoundaryShape.TUBE, enabled: true },
          'dodecahedron': { shape: BoundaryShape.DODECAHEDRON, enabled: true },
        };
        
        const config = containerMap[value];
        if (config) {
          await this.boundaries.setShape(config.shape);
          this.boundaries.setEnabled(config.enabled);
          if (config.enabled && value !== 'none') {
            this.boundaries.setVisible(true);
            boundaryState.visible = true;
          } else {
            this.boundaries.setVisible(false);
            boundaryState.visible = false;
          }
          boundaryState.container = value;
          this.pane.refresh();
          (this.callbacks as PhysicsTabCallbacks).onBoundariesChange?.();
        }
      }
    );
    
    // Collision mode
    this.createList(
      'Collision',
      boundaryState.collisionMode,
      {
        '↩️ Reflect': 'reflect',
        '🛑 Clamp': 'clamp',
        '🔄 Wrap': 'wrap',
        '💀 Kill': 'kill',
      },
      (value: string) => {
        if (!this.boundaries) return;
        const modeMap: Record<string, CollisionMode> = {
          'reflect': CollisionMode.REFLECT,
          'clamp': CollisionMode.CLAMP,
          'wrap': CollisionMode.WRAP,
          'kill': CollisionMode.KILL,
        };
        this.boundaries.setCollisionMode(modeMap[value]);
        boundaryState.collisionMode = value;
        (this.callbacks as PhysicsTabCallbacks).onBoundariesChange?.();
      }
    );
    
    // Properties
    const propsGroup = folder.addFolder({ title: 'Properties', expanded: false });
    propsGroup.addBinding(boundaryState, 'wallStiffness', {
      label: 'Stiffness',
      min: 0.0,
      max: 1.0,
      step: 0.05,
    }).on('change', (ev: any) => {
      if (this.boundaries) {
        this.boundaries.setWallStiffness(ev.value);
        (this.callbacks as PhysicsTabCallbacks).onBoundariesChange?.();
      }
    });
    
    propsGroup.addBinding(boundaryState, 'restitution', {
      label: 'Bounce',
      min: 0.0,
      max: 1.0,
      step: 0.05,
    }).on('change', (ev: any) => {
      if (this.boundaries) {
        this.boundaries.setRestitution(ev.value);
        (this.callbacks as PhysicsTabCallbacks).onBoundariesChange?.();
      }
    });
    
    propsGroup.addBinding(boundaryState, 'friction', {
      label: 'Friction',
      min: 0.0,
      max: 1.0,
      step: 0.05,
    }).on('change', (ev: any) => {
      if (this.boundaries) {
        this.boundaries.setFriction(ev.value);
        (this.callbacks as PhysicsTabCallbacks).onBoundariesChange?.();
      }
    });
    
    // Quick presets
    folder.addBlade({ view: 'separator' });
    folder.addBlade({
      view: 'buttongrid',
      size: [2, 2],
      cells: (x: number, y: number) => {
        const presets = [
          ['💧 Fluid', '🎈 Bouncy'],
          ['🏖️ Sand', '❄️ Ice']
        ];
        return { title: presets[y][x] };
      },
      label: 'Material Presets',
    }).on('click', (ev: any) => {
      this.applyBoundaryPreset(ev.index[1] * 2 + ev.index[0]);
    });
    
    // Visibility toggle
    folder.addBlade({ view: 'separator' });
    folder.addBinding(boundaryState, 'visible', {
      label: '👁️ Show Container',
    }).on('change', (ev: any) => {
      if (this.boundaries && boundaryState.container !== 'none') {
        this.boundaries.setVisible(ev.value);
      }
    });
  }
  
  private setupForceFieldSystem(parentFolder: any): void {
    const folder = parentFolder.addFolder({ title: 'Force Fields', expanded: false });
    
    folder.addBlade({
      view: 'buttongrid',
      size: [2, 1],
      cells: (x: number, y: number) => {
        return { title: x === 0 ? '➕ Attractor' : '➖ Repeller' };
      },
      label: 'Add Field',
    }).on('click', (ev: any) => {
      const type = ev.index[0] === 0 ? ForceFieldType.ATTRACTOR : ForceFieldType.REPELLER;
      this.forceFieldManager.addField({
        type,
        position: new THREE.Vector3(0, 5, 0),
        strength: 20.0,
        radius: 15.0,
      });
      (this.callbacks as PhysicsTabCallbacks).onForceFieldsChange?.();
    });
    
    const presetFolder = folder.addFolder({ title: 'Presets', expanded: false });
    Object.keys(FORCE_FIELD_PRESETS).forEach(key => {
      const displayName = key.replace(/_/g, ' ').toLowerCase();
      presetFolder.addButton({ title: displayName }).on('click', () => {
        this.forceFieldManager.addPreset(key as keyof typeof FORCE_FIELD_PRESETS);
        (this.callbacks as PhysicsTabCallbacks).onForceFieldsChange?.();
      });
    });
  }
  
  private setupEmitterSystem(parentFolder: any): void {
    const folder = parentFolder.addFolder({ title: 'Emitters', expanded: false });
    
    folder.addButton({ title: '➕ Add Emitter' }).on('click', () => {
      this.emitterManager.addEmitter({
        type: EmitterType.POINT,
        pattern: EmissionPattern.CONTINUOUS,
        position: new THREE.Vector3(0, 5, 0),
        rate: 100,
      });
      (this.callbacks as PhysicsTabCallbacks).onEmittersChange?.();
    });
    
    const presetFolder = folder.addFolder({ title: 'Presets', expanded: false });
    Object.keys(EMITTER_PRESETS).forEach(key => {
      const displayName = key.replace(/_/g, ' ').toLowerCase();
      presetFolder.addButton({ title: displayName }).on('click', () => {
        this.emitterManager.addPreset(key as keyof typeof EMITTER_PRESETS);
        (this.callbacks as PhysicsTabCallbacks).onEmittersChange?.();
      });
    });
  }
  
  private setupVisualizationSettings(): void {
    const folder = this.createFolder("👁️ Visualization", false);
    
    // Color mode
    this.createList(
      'Color Mode',
      this.colorMode,
      {
        'Velocity': ColorMode.VELOCITY,
        'Density': ColorMode.DENSITY,
        'Material': ColorMode.MATERIAL,
      },
      (value: number) => {
        this.colorMode = value;
      }
    );
    
    // Debug visualization
    const debugGroup = folder.addFolder({ title: 'Debug Overlays', expanded: false });
    debugGroup.addBinding(this.debugVisualization, 'showGrid', { label: 'Grid' });
    debugGroup.addBinding(this.debugVisualization, 'showForceFields', { label: 'Force Fields' });
    debugGroup.addBinding(this.debugVisualization, 'showEmitters', { label: 'Emitters' });
    debugGroup.addBinding(this.debugVisualization, 'showBoundaries', { label: 'Boundaries' });
    debugGroup.addBinding(this.debugVisualization, 'showVelocityVectors', { label: 'Velocity Vectors' });
    
    // Rendering
    folder.addBlade({ view: 'separator' });
    folder.addBinding(this.config.rendering, "points", { label: "Point Mode" });
    folder.addBinding(this.config.rendering, "bloom", { label: "✨ Bloom" });
  }
  
  private applyBoundaryPreset(index: number): void {
    if (!this.boundaries) return;
    
    const presets = [
      { stiffness: 0.3, restitution: 0.2, friction: 0.1 }, // Fluid
      { stiffness: 0.8, restitution: 0.9, friction: 0.0 }, // Bouncy
      { stiffness: 0.5, restitution: 0.1, friction: 0.8 }, // Sand
      { stiffness: 0.6, restitution: 0.3, friction: 0.05 }, // Ice
    ];
    
    if (index < presets.length) {
      const preset = presets[index];
      this.boundaries.setWallStiffness(preset.stiffness);
      this.boundaries.setRestitution(preset.restitution);
      this.boundaries.setFriction(preset.friction);
      this.pane.refresh();
      (this.callbacks as PhysicsTabCallbacks).onBoundariesChange?.();
    }
  }
  
  private loadScenePreset(name: string): void {
    const presetMap: Record<string, () => void> = {
      'fountain': () => this.loadWaterFountain(),
      'snow': () => this.loadSnowStorm(),
      'tornado': () => this.loadTornado(),
      'explosion': () => this.loadExplosion(),
      'galaxy': () => this.loadGalaxy(),
      'spark': () => this.loadGalaxy(), // Reuse galaxy for now
    };
    
    const loader = presetMap[name];
    if (loader) loader();
  }

  // ========================================
  // PERFORMANCE METRICS
  // ========================================
  
  private setupMetrics(): void {
    const folder = this.createFolder("📊 Performance", true);
    
    // Add FPS graph
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
  
  // ========================================
  // PRESET LOADERS
  // ========================================
  
  private loadWaterFountain(): void {
    this.emitterManager.clearEmitters();
    this.forceFieldManager.clearFields();
    this.emitterManager.addPreset('FOUNTAIN');
    this.selectedMaterialType = MaterialType.FLUID;
    this.config.simulation.gravityType = 1;
    (this.callbacks as PhysicsTabCallbacks).onMaterialChange?.();
    (this.callbacks as PhysicsTabCallbacks).onEmittersChange?.();
  }
  
  private loadSnowStorm(): void {
    this.emitterManager.clearEmitters();
    this.forceFieldManager.clearFields();
    this.emitterManager.addPreset('SNOW');
    this.forceFieldManager.addPreset('WIND');
    this.forceFieldManager.addPreset('TURBULENCE');
    this.selectedMaterialType = MaterialType.SNOW;
    (this.callbacks as PhysicsTabCallbacks).onMaterialChange?.();
    (this.callbacks as PhysicsTabCallbacks).onEmittersChange?.();
    (this.callbacks as PhysicsTabCallbacks).onForceFieldsChange?.();
  }
  
  private loadTornado(): void {
    this.emitterManager.clearEmitters();
    this.forceFieldManager.clearFields();
    this.forceFieldManager.addPreset('TORNADO');
    this.emitterManager.addPreset('SANDSTORM');
    this.selectedMaterialType = MaterialType.SAND;
    (this.callbacks as PhysicsTabCallbacks).onMaterialChange?.();
    (this.callbacks as PhysicsTabCallbacks).onEmittersChange?.();
    (this.callbacks as PhysicsTabCallbacks).onForceFieldsChange?.();
  }
  
  private loadExplosion(): void {
    this.emitterManager.clearEmitters();
    this.forceFieldManager.clearFields();
    this.emitterManager.addPreset('EXPLOSION');
    this.forceFieldManager.addPreset('EXPLOSION');
    this.selectedMaterialType = MaterialType.PLASMA;
    (this.callbacks as PhysicsTabCallbacks).onMaterialChange?.();
    (this.callbacks as PhysicsTabCallbacks).onEmittersChange?.();
    (this.callbacks as PhysicsTabCallbacks).onForceFieldsChange?.();
  }
  
  private loadGalaxy(): void {
    this.emitterManager.clearEmitters();
    this.forceFieldManager.clearFields();
    this.forceFieldManager.addPreset('GALAXY_SPIRAL');
    this.emitterManager.addPreset('SPARK_BURST');
    this.selectedMaterialType = MaterialType.PLASMA;
    this.config.simulation.gravityType = 2;
    (this.callbacks as PhysicsTabCallbacks).onMaterialChange?.();
    (this.callbacks as PhysicsTabCallbacks).onEmittersChange?.();
    (this.callbacks as PhysicsTabCallbacks).onForceFieldsChange?.();
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
      // GravitySensor not available
    }
  }
  
  public updateMetrics(activeParticles: number, fps: number, kernelTime: number): void {
    this.metrics.activeParticles = activeParticles;
    this.metrics.simulationFPS = fps;
    this.metrics.kernelTime = kernelTime;
  }
  
  public updateFPS(): void {
    if (this.fpsGraph) {
      this.fpsGraph.begin();
      this.fpsGraph.end();
    }
  }
  
  public getCurrentMaterialType(): MaterialType {
    return this.selectedMaterialType;
  }
  
  public dispose(): void {
    if (this.gravitySensor) this.gravitySensor.stop();
  }
}


