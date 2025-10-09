/**
 * APP.ts - Main application orchestrator
 * Single responsibility: Lifecycle management and module coordination
 */

import * as THREE from "three/webgpu";
import { defaultConfig, updateParticleParams, type FlowConfig } from './config';
import { createUnifiedPanels, type UnifiedPanelCallbacks, ColorMode } from './PANEL';
import type { DashboardDock } from './PANEL/dashboard';
import { Scenery } from './STAGE/scenery';
import { PostFX } from './POSTFX/postfx';
import { ParticleBoundaries } from './PARTICLESYSTEM/physic/boundaries';
import { MlsMpmSimulator } from './PARTICLESYSTEM/physic/mls-mpm';
import { MeshRenderer } from './PARTICLESYSTEM/RENDERER/meshrenderer';
import { PointRenderer } from './PARTICLESYSTEM/RENDERER/pointrenderer';
import { RendererManager, ParticleRenderMode } from './PARTICLESYSTEM/RENDERER/renderercore';
import { SoundReactivity } from './AUDIO/soundreactivity';
import type { AudioData } from './AUDIO/soundreactivity';
import { AudioReactiveBehavior } from './AUDIO/audioreactive';
import { AudioVisualizationManager } from './AUDIO/audiovisual';
import { AdaptivePerformanceManager, type PerformanceChangeContext, type PerformanceTier } from './APP/performance';

// ==================== Type Definitions ====================

/**
 * Callback for initialization progress updates
 * @param fraction - Progress from 0 to 1
 * @param delay - Optional delay in ms before resolving
 */
export type ProgressCallback = (fraction: number, delay?: number) => Promise<void>;

export interface FlowFrameMetrics {
  readonly delta: number;
  readonly elapsed: number;
  readonly fps: number;
  readonly frameTime: number;
  readonly particleCount: number;
  readonly performanceTier: PerformanceTier;
  readonly rendererMode: ParticleRenderMode;
  readonly audioReactive: boolean;
  readonly dashboardDock: DashboardDock;
}

/**
 * Initialization pipeline step
 */
interface InitStep {
  readonly id: string;
  readonly label: string;
  readonly weight?: number;
  readonly enabled?: () => boolean;
  run: () => Promise<void> | void;
}

// ==================== Application Class ====================

/**
 * FlowApp - Main application class
 * Coordinates all modules and manages the application lifecycle
 */
export class FlowApp {
  // Configuration
  private config: FlowConfig = { ...defaultConfig };

  // Core modules
  private scenery!: Scenery;
  private postFX!: PostFX;

  // Scene elements
  private boundaries!: ParticleBoundaries;

  // Particle system
  private mlsMpmSim!: MlsMpmSimulator;
  private rendererManager!: RendererManager;
  private currentRenderObject: THREE.Object3D | null = null;
  
  // Legacy renderers (DEPRECATED - kept for backward compatibility only)
  private meshRenderer!: MeshRenderer;
  private pointRenderer!: PointRenderer;
  private useLegacyRenderers: boolean = false;

  // Unified Panel Manager
  private panelManager!: ReturnType<typeof createUnifiedPanels>;

  // Audio reactivity
  private soundReactivity!: SoundReactivity;
  private audioReactiveBehavior!: AudioReactiveBehavior;
  private audioVisualizationManager!: AudioVisualizationManager;

  // Adaptive performance
  private performanceManager!: AdaptivePerformanceManager;
  private currentPerformanceTier: PerformanceTier = 'high';
  private preferredRenderMode: ParticleRenderMode = ParticleRenderMode.MESH;
  private lastFrameMetrics: FlowFrameMetrics | null = null;

  // Shared grid metrics
  private readonly baseGridSize = new THREE.Vector3(64, 64, 64);
  private viewportGridSize = new THREE.Vector3(64, 64, 64);
  private lastAudioData: AudioData | null = null;
  private readonly tmpGravity = new THREE.Vector3();
  private readonly tmpMouseOrigin = new THREE.Vector3();
  private readonly tmpMouseDirection = new THREE.Vector3();
  private readonly tmpMouseForce = new THREE.Vector3();

  // Mouse interaction
  private raycaster!: THREE.Raycaster;
  private plane!: THREE.Plane;
  private readonly pointerMoveHandler = (event: PointerEvent) => {
    this.onMouseMove(event);
  };

  constructor(private renderer: THREE.WebGPURenderer) {}

  /**
   * Initialize all modules with progress tracking
   */
  public async init(progressCallback?: ProgressCallback): Promise<void> {
    const steps: InitStep[] = [
      { id: 'config', label: 'Configuration', weight: 1, run: () => this.initializeConfig() },
      { id: 'scenery', label: 'Scene & camera', weight: 2, run: () => this.initializeScenery() },
      { id: 'postfx', label: 'Post-processing', weight: 1, run: () => this.initializePostFX() },
      { id: 'boundaries', label: 'Boundaries', weight: 1, run: () => this.initializeBoundaries() },
      { id: 'physics', label: 'Physics solver', weight: 2, run: () => this.initializePhysics() },
      { id: 'renderers', label: 'Renderers', weight: 2, run: () => this.initializeRenderers() },
      { id: 'audio', label: 'Audio system', weight: 1, enabled: () => this.config.audio.enabled || this.config.audioReactive.enabled, run: () => this.initializeAudioSystems() },
      { id: 'panels', label: 'Control panels', weight: 1, run: () => this.initializeUnifiedPanels() },
      { id: 'interaction', label: 'Interaction', weight: 1, run: () => this.initializeInteraction() },
    ];

    // Calculate total weight
    const totalWeight = steps
      .filter(step => !step.enabled || step.enabled())
      .reduce((sum, step) => sum + (step.weight ?? 1), 0);
    
    let completed = 0;
    if (progressCallback) await progressCallback(0);

    // Execute steps
    for (const step of steps) {
      if (step.enabled && !step.enabled()) continue;
      
      await step.run();
      completed += step.weight ?? 1;
      
      if (progressCallback) {
        await progressCallback(Math.min(completed / totalWeight, 1));
      }
    }

    if (progressCallback) await progressCallback(1, 100);
  }

  private initializeConfig(): void {
    updateParticleParams(this.config);
  }

  private async initializeScenery(): Promise<void> {
    this.scenery = new Scenery(
      this.renderer,
      this.renderer.domElement,
      {
        camera: this.config.camera,
        environment: this.config.environment,
        toneMapping: this.config.toneMapping,
        shadowMap: true,
        shadowMapType: THREE.PCFSoftShadowMap,
        enableDamping: true,
        enablePan: false,
        maxDistance: 2.0,
        minPolarAngle: 0.2 * Math.PI,
        maxPolarAngle: 0.8 * Math.PI,
        minAzimuthAngle: 0.7 * Math.PI,
        maxAzimuthAngle: 1.3 * Math.PI,
      }
    );
    await this.scenery.init();
  }

  private async initializePostFX(): Promise<void> {
    this.postFX = new PostFX(
      this.renderer,
      this.scenery.scene,
      this.scenery.camera,
      {
        bloom: this.config.bloom,
        radialFocus: this.config.radialFocus,
        radialCA: this.config.radialCA,
      }
    );
    await this.postFX.init();
    this.scenery.disableToneMappingForPostFX();
  }

  private async initializeBoundaries(): Promise<void> {
    this.viewportGridSize.copy(this.baseGridSize);
    this.boundaries = new ParticleBoundaries({
      gridSize: this.viewportGridSize,
      wallThickness: 3,
      wallStiffness: 0.3,
      visualize: false,
      audioReactive: true,
      audioPulseStrength: 0.15,
    });
    await this.boundaries.init();
    this.scenery.add(this.boundaries.object);
    this.boundaries.setEnabled(false);
  }

  private async initializePhysics(): Promise<void> {
    this.mlsMpmSim = new MlsMpmSimulator(this.renderer, {
      maxParticles: this.config.particles.maxCount,
      gridSize: this.viewportGridSize.clone(),
    });
    await this.mlsMpmSim.init();
    this.mlsMpmSim.setBoundaries(this.boundaries);
  }

  private async initializeRenderers(): Promise<void> {
    this.rendererManager = new RendererManager(this.mlsMpmSim, {
      mode: this.config.rendering.points ? ParticleRenderMode.POINT : ParticleRenderMode.MESH,
      quality: 2 as import('./PARTICLESYSTEM/RENDERER/renderercore').RenderQuality,
      lodEnabled: false,
      sortingEnabled: false,
      cullingEnabled: false,
      maxParticles: this.config.particles.maxCount,
    });

    this.currentRenderObject = this.rendererManager.getRenderer().object;
    this.currentRenderObject.visible = true;
    this.scenery.add(this.currentRenderObject);

    this.preferredRenderMode = this.rendererManager.getCurrentMode();
    this.performanceManager = new AdaptivePerformanceManager(
      {
        lowFpsThreshold: 45,
        criticalFpsThreshold: 30,
        highFpsThreshold: 70,
        framesForLow: 45,
        framesForCritical: 30,
        framesForHigh: 180,
      },
      {
        onTierChange: (context) => {
          this.applyPerformanceTier(context);
        },
      }
    );
    this.currentPerformanceTier = 'high';

    this.meshRenderer = new MeshRenderer(this.mlsMpmSim, {
      metalness: 0.9,
      roughness: 0.5,
    });
    this.pointRenderer = new PointRenderer(this.mlsMpmSim);

    this.meshRenderer.object.visible = false;
    this.pointRenderer.object.visible = false;
    this.scenery.add(this.meshRenderer.object);
    this.scenery.add(this.pointRenderer.object);
  }

  private initializeUnifiedPanels(): void {
    console.log('[APP] Initializing unified control panels...');
    
    const callbacks: UnifiedPanelCallbacks = {
      physics: {
        onParticleCountChange: (_count) => {},
        onSizeChange: (_size) => {},
        onSimulationChange: (_simConfig) => {},
        onMaterialChange: () => {
          if (this.panelManager.physicsTab && this.panelManager.physicsTab.colorMode === ColorMode.MATERIAL) {
            this.mlsMpmSim.setColorMode(ColorMode.MATERIAL);
          }
        },
        onForceFieldsChange: () => {
          if (this.panelManager.physicsTab) {
            this.mlsMpmSim.updateForceFields(this.panelManager.physicsTab.forceFieldManager);
          }
        },
        onEmittersChange: () => {},
        onBoundariesChange: () => {
          this.mlsMpmSim.updateBoundaryUniforms();
        },
      },
      visuals: {
        onRenderModeChange: (mode) => {
          this.preferredRenderMode = mode;
          this.performanceManager.registerManualOverride();
          this.switchRenderMode(mode);
        },
        onMaterialPresetChange: (preset) => {
          if (this.panelManager.visualsTab) {
            this.panelManager.visualsTab.settings.metalness = preset.metalness;
            this.panelManager.visualsTab.settings.roughness = preset.roughness;
            this.panelManager.visualsTab.settings.emissive = preset.emissive;
          }

          const currentMode = this.rendererManager.getCurrentMode();
          if (currentMode === ParticleRenderMode.MESH) {
            const renderer = this.rendererManager.getRenderer() as MeshRenderer;
            if (renderer && renderer.material) {
              renderer.material.metalness = preset.metalness;
              renderer.material.roughness = preset.roughness;
              renderer.material.needsUpdate = true;
            }
          }

          if (this.meshRenderer && this.meshRenderer.material) {
            this.meshRenderer.material.metalness = preset.metalness;
            this.meshRenderer.material.roughness = preset.roughness;
            this.meshRenderer.material.needsUpdate = true;
          }
        },
        onColorModeChange: (mode) => {
          const legacyColorMode = mode as number;
          this.mlsMpmSim.setColorMode(legacyColorMode);
        },
        onColorGradientChange: (_gradientName) => {},
        onSizeChange: (size) => {
          this.rendererManager.update(this.mlsMpmSim.numParticles, size);
        },
        onMaterialPropertyChange: (property, value) => {
          const currentMode = this.rendererManager.getCurrentMode();
          if (currentMode === ParticleRenderMode.MESH) {
            const renderer = this.rendererManager.getRenderer() as MeshRenderer;
            if (renderer && renderer.material) {
              const material = renderer.material as any;
              if (property in material) {
                material[property] = value;
                material.needsUpdate = true;
              }
            }
          }

          if (this.meshRenderer && this.meshRenderer.material) {
            const material = this.meshRenderer.material as any;
            if (property in material) {
              material[property] = value;
              material.needsUpdate = true;
            }
          }
        },
      },
      audio: {
        onAudioConfigChange: (audioConfig) => {
          this.soundReactivity.updateConfig(audioConfig);
        },
        onAudioReactiveConfigChange: (audioReactiveConfig) => {
          this.audioReactiveBehavior.updateConfig(audioReactiveConfig);
          if (audioReactiveConfig.mode !== undefined) {
            this.audioVisualizationManager.setMode(audioReactiveConfig.mode);
            this.mlsMpmSim.setAudioVisualizationMode(audioReactiveConfig.mode);
          }
        },
        onSourceChange: async (source) => {
          this.soundReactivity.dispose();
          this.config.audio.source = source;
          this.soundReactivity = new SoundReactivity(this.config.audio);
          try {
            await this.soundReactivity.init();
          } catch (error) {
            console.error('[APP] Audio init failed:', error);
          }
        },
        onFileLoad: (url) => {
          this.soundReactivity.loadAudioFile(url);
        },
        onTogglePlayback: () => {
          this.soundReactivity.togglePlayback();
        },
        onVolumeChange: (volume) => {
          this.soundReactivity.setVolume(volume);
        },
      },
      postfx: {
        onBloomChange: (bloomConfig) => {
          this.postFX.updateBloom(bloomConfig);
        },
        onRadialFocusChange: (radialFocusConfig) => {
          this.postFX.updateRadialFocus(radialFocusConfig);
        },
        onRadialCAChange: (radialCAConfig) => {
          this.postFX.updateRadialCA(radialCAConfig);
        },
      },
      library: {
        onScenePresetLoad: (_presetName) => {},
        onConfigImport: (config) => {
          Object.assign(this.config, config);
        },
      },
      settings: {
        onClearStorage: () => {
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

  private async initializeAudioSystems(): Promise<void> {
    this.soundReactivity = new SoundReactivity(this.config.audio);
    if (this.config.audio.enabled) {
      try {
        await this.soundReactivity.init();
      } catch (error) {
        console.error('[APP] Audio initialization failed:', error);
      }
    }

    this.audioReactiveBehavior = new AudioReactiveBehavior(this.renderer, this.config.audioReactive);
    
    // Set force field manager when physics tab is ready
    if (this.panelManager?.physicsTab) {
      this.audioReactiveBehavior.setForceFieldManager(this.panelManager.physicsTab.forceFieldManager);
    }

    this.audioVisualizationManager = new AudioVisualizationManager(
      this.renderer,
      this.viewportGridSize,
    );
    this.audioVisualizationManager.setMode(this.config.audioReactive.mode);
    this.mlsMpmSim.setAudioVisualizationMode(this.config.audioReactive.mode);
  }

  private initializeInteraction(): void {
    this.raycaster = this.scenery.createRaycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.2);
    this.renderer.domElement.addEventListener("pointermove", this.pointerMoveHandler);
    this.setupResizeHandler();
  }
  
  /**
   * Setup window resize handler for adaptive viewport boundaries
   * Updates gridSize when page dimensions change
   */
  private resizeHandler?: () => void;
  
  private setupResizeHandler(): void {
    this.resizeHandler = async () => {
      // Adaptive gridSize based on viewport aspect ratio
      // Maintains particle visibility when page resizes
      const aspect = window.innerWidth / window.innerHeight;

      this.viewportGridSize.set(
        this.baseGridSize.x * Math.max(1, aspect),
        this.baseGridSize.y * Math.max(1, 1 / aspect),
        this.baseGridSize.z
      );

      // Update boundaries gridSize (only in viewport mode)
      // Container modes maintain their original dimensions
      if (this.boundaries && !this.boundaries.isEnabled()) {
        await this.boundaries.setGridSize(this.viewportGridSize);
      }

      // Update simulator uniforms
      this.mlsMpmSim.updateBoundaryUniforms();
    };
    
    window.addEventListener('resize', this.resizeHandler);
    
    // Trigger initial resize to set correct dimensions
    this.resizeHandler();
  }

  /**
   * Handle mouse movement for particle interaction
   */
  private onMouseMove(event: PointerEvent): void {
    const pointer = new THREE.Vector2();
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(pointer, this.scenery.camera);
    const intersect = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.plane, intersect);

    if (intersect) {
      this.mlsMpmSim.setMouseRay(
        this.raycaster.ray.origin,
        this.raycaster.ray.direction,
        intersect
      );
    }
  }

  /**
   * Resize handler
   */
  public resize(width: number, height: number): void {
    this.scenery.resize(width, height);
  }

  /**
   * Update loop
   */
  public async update(delta: number, elapsed: number): Promise<FlowFrameMetrics> {
    if (this.panelManager) {
      this.panelManager.updateFPS();
    }

    this.scenery.update(delta, elapsed);

    const audioData = this.updateAudioReactivity(delta, elapsed);

    this.updateRendererState(audioData);

    await this.updateSimulation(delta, elapsed, audioData);

    await this.postFX.render();

    this.performanceManager.update(delta);

    const fps = delta > 0 ? 1 / delta : 0;
    const frameTime = delta > 0 ? delta * 1000 : 0;
    const particleCount = this.mlsMpmSim?.numParticles ?? this.config.particles.count;
    const rendererMode = this.rendererManager?.getCurrentMode() ?? this.preferredRenderMode;
    const dashboardDock = this.panelManager?.getDashboard().getDock() ?? 'right';

    const metrics: FlowFrameMetrics = {
      delta,
      elapsed,
      fps,
      frameTime,
      particleCount,
      performanceTier: this.currentPerformanceTier,
      rendererMode,
      audioReactive: Boolean(this.config.audioReactive.enabled && this.config.audio.enabled),
      dashboardDock,
    };

    this.lastFrameMetrics = metrics;

    return metrics;
  }

  private updateAudioReactivity(delta: number, elapsed: number): AudioData | null {
    if (!this.boundaries) {
      return null;
    }

    const audioReady = Boolean(this.soundReactivity) && (this.config.audio.enabled || this.config.audioReactive.enabled);
    const audioData = audioReady ? this.soundReactivity!.getAudioData() : null;
    const audioEnabled = this.config.audio.enabled;
    const reactiveEnabled = this.config.audioReactive.enabled && audioEnabled;

    if (audioData && reactiveEnabled) {
      this.boundaries.update(elapsed, {
        bass: audioData.smoothBass,
        mid: audioData.smoothMid,
        treble: audioData.smoothTreble,
        beatIntensity: audioData.beatIntensity,
      });
    } else {
      this.boundaries.update(elapsed);
    }

    this.mlsMpmSim?.updateBoundaryUniforms();

    if (audioData && audioEnabled && this.panelManager) {
      this.panelManager.updateAudioMetrics(audioData);
    }

    if (audioData && this.config.audioReactive.enabled) {
      this.audioReactiveBehavior?.updateAudioData(audioData);
      this.audioReactiveBehavior?.updateBeatEffects(audioData, delta, this.viewportGridSize);
      this.audioVisualizationManager?.update(audioData, delta);

      if (this.config.audioReactive.materialModulation) {
        const modulation = this.audioReactiveBehavior?.getMaterialModulation(audioData);
        if (modulation) {
          this.config.simulation.dynamicViscosity = modulation.viscosity;
          this.config.simulation.stiffness = modulation.stiffness;
        }
      }
    }

    const postFXInfluence = this.config.audio.postFXInfluence ?? 0;
    this.postFX?.applyAudioDynamics(audioData, postFXInfluence, delta);

    if (audioData) {
      this.lastAudioData = audioData;
    } else if (!audioReady) {
      this.lastAudioData = null;
    }

    return audioData;
  }

  private updateRendererState(audioData: AudioData | null): void {
    if (!this.rendererManager) {
      return;
    }

    if (this.useLegacyRenderers) {
      this.meshRenderer.object.visible = !this.config.rendering.points;
      this.pointRenderer.object.visible = this.config.rendering.points;
      this.meshRenderer.update(this.config.particles.count, this.config.particles.actualSize);
      this.pointRenderer.update(this.config.particles.count);
      this.meshRenderer.setBloomIntensity(this.config.bloom.enabled ? 1 : 0);
      return;
    }

    const particleSize =
      this.panelManager?.visualsTab?.settings.particleSize ??
      this.config.particles.actualSize ??
      this.config.particles.size ??
      1.0;

    const particleCount = this.mlsMpmSim?.numParticles ?? this.config.particles.count;
    this.rendererManager.update(particleCount, particleSize);

    const reactiveSample = audioData ?? this.lastAudioData;
    if (
      reactiveSample &&
      this.config.audio.enabled &&
      this.config.audioReactive.enabled
    ) {
      const renderer = this.rendererManager.getRenderer() as MeshRenderer;
      if (renderer && typeof (renderer as any).updateAudioReactivity === 'function') {
        (renderer as any).updateAudioReactivity({
          bass: reactiveSample.smoothBass,
          mid: reactiveSample.smoothMid,
          treble: reactiveSample.smoothTreble,
          beatIntensity: reactiveSample.beatIntensity,
        });
      }
    }
  }

  private async updateSimulation(delta: number, elapsed: number, audioData: AudioData | null): Promise<void> {
    if (!this.config.simulation.run) {
      return;
    }

    if (this.panelManager?.physicsTab) {
      this.mlsMpmSim.updateForceFields(this.panelManager.physicsTab.forceFieldManager);
      this.mlsMpmSim.setColorMode(this.panelManager.physicsTab.colorMode);
      this.panelManager.physicsTab.emitterManager.update(delta);
    }

    const gravityType = this.config.simulation.gravityType;
    this.tmpGravity.set(0, 0, 0);

    if (gravityType === 0) {
      this.tmpGravity.set(0, 0, 0.2);
    } else if (gravityType === 1) {
      this.tmpGravity.set(0, -0.2, 0);
    } else if (gravityType === 3) {
      this.tmpGravity
        .copy(this.config.gravitySensorReading)
        .add(this.config.accelerometerReading);
    }

    let audioInfluencedSpeed = this.config.simulation.speed;
    let audioInfluencedNoise = this.config.simulation.noise;

    if (audioData && this.config.audio.enabled && this.config.audio.particleInfluence > 0) {
      const influence = this.config.audio.particleInfluence;
      audioInfluencedSpeed *= 1.0 + audioData.smoothOverall * influence;
      audioInfluencedNoise *= 1.0 + audioData.smoothBass * influence * 0.5;
    }

    this.tmpMouseOrigin.set(0, 0, 0);
    this.tmpMouseDirection.set(0, 0, 0);
    this.tmpMouseForce.set(0, 0, 0);

    await this.mlsMpmSim.update(
      {
        numParticles: this.config.particles.count,
        dt: audioInfluencedSpeed,
        noise: audioInfluencedNoise,
        stiffness: this.config.simulation.stiffness,
        restDensity: this.config.simulation.restDensity,
        dynamicViscosity: this.config.simulation.dynamicViscosity,
        gravityType: this.config.simulation.gravityType,
        gravity: this.tmpGravity,
        mouseRayOrigin: this.tmpMouseOrigin,
        mouseRayDirection: this.tmpMouseDirection,
        mouseForce: this.tmpMouseForce,
        transferMode: this.config.simulation.transferMode,
        flipRatio: this.config.simulation.flipRatio,
        vorticityEnabled: this.config.simulation.vorticityEnabled,
        vorticityEpsilon: this.config.simulation.vorticityEpsilon,
        surfaceTensionEnabled: this.config.simulation.surfaceTensionEnabled,
        surfaceTensionCoeff: this.config.simulation.surfaceTensionCoeff,
        sparseGrid: this.config.simulation.sparseGrid,
        adaptiveTimestep: this.config.simulation.adaptiveTimestep,
        cflTarget: this.config.simulation.cflTarget,
      },
      delta,
      elapsed,
      this.config.audioReactive.enabled && audioData ? audioData : undefined
    );

    const fps = delta > 0 ? 1 / delta : 0;
    const frameMs = delta > 0 ? delta * 1000 : 0;
    if (this.panelManager) {
      this.panelManager.updatePhysicsMetrics(
        this.mlsMpmSim.numParticles,
        fps,
        frameMs
      );
    }
  }

  /**
   * Switch particle render mode (Unified System)
   */
  private switchRenderMode(mode: ParticleRenderMode): void {
    // Ensure legacy renderers are hidden
    if (this.meshRenderer) this.meshRenderer.object.visible = false;
    if (this.pointRenderer) this.pointRenderer.object.visible = false;
    
    // Remove current renderer from scene
    if (this.currentRenderObject) {
      this.scenery.remove(this.currentRenderObject);
    }
    
    // Switch to new renderer
    const newRenderObject = this.rendererManager.switchMode(mode);
    
    // Add to scene and make visible
    this.scenery.add(newRenderObject);
    newRenderObject.visible = true;
    this.currentRenderObject = newRenderObject;
    
    // Update renderer with current particle count
    const particleSize =
      this.panelManager?.visualsTab?.settings.particleSize ??
      this.config.particles.actualSize ??
      this.config.particles.size ??
      1.0;

    this.rendererManager.update(
      this.mlsMpmSim.numParticles,
      particleSize
    );

    // Keep legacy config flags aligned with the active renderer
    this.config.rendering.points = mode === ParticleRenderMode.POINT;
  }

  private applyPerformanceTier(context: PerformanceChangeContext): void {
    if (this.currentPerformanceTier === context.tier) {
      return;
    }

    const previousTier = this.currentPerformanceTier;
    this.currentPerformanceTier = context.tier;

    let targetMode = this.preferredRenderMode;
    if (context.tier === 'medium') {
      targetMode = ParticleRenderMode.SPRITE;
    } else if (context.tier === 'low') {
      targetMode = ParticleRenderMode.POINT;
    }

    if (this.rendererManager.getCurrentMode() !== targetMode) {
      this.switchRenderMode(targetMode);
      this.panelManager?.visualsTab?.syncRenderMode(targetMode);
    }
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Clean up resize handler
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }

    this.renderer.domElement.removeEventListener("pointermove", this.pointerMoveHandler);
    
    this.panelManager?.dispose();
    this.scenery?.dispose();
    this.postFX?.dispose();
    this.boundaries?.dispose();
    this.meshRenderer?.dispose();
    this.pointRenderer?.dispose();
    this.rendererManager?.dispose();
    this.soundReactivity?.dispose();
    this.audioReactiveBehavior?.dispose();
    this.audioVisualizationManager?.dispose();
  }

  public toggleDashboard(): void {
    this.panelManager?.toggleCollapse();
  }

  public activateDashboardTab(id: string): void {
    this.panelManager?.activateTab(id);
  }

  public getFrameMetrics(): FlowFrameMetrics | null {
    return this.lastFrameMetrics;
  }
}

