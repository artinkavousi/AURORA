/**
 * APP.ts - Main application orchestrator
 * Single responsibility: Lifecycle management and module coordination
 */

import * as THREE from "three/webgpu";
import { AppPipeline, type PipelineReporter } from './APP/pipeline';
import type { ProgressCallback } from './APP/types';
import { defaultConfig, updateParticleParams, type FlowConfig } from './config';
import { Dashboard } from './PANEL/dashboard';
import { Scenery } from './STAGE/scenery';
import { PostFX } from './POSTFX/postfx';  // RE-ENABLED (simplified version)
import { ParticleBoundaries } from './PARTICLESYSTEM/physic/boundaries';
import { PostFXPanel } from './POSTFX/PANELpostfx';  // RE-ENABLED
import { MlsMpmSimulator } from './PARTICLESYSTEM/physic/mls-mpm';
import { MeshRenderer } from './PARTICLESYSTEM/RENDERER/meshrenderer';
import { PointRenderer } from './PARTICLESYSTEM/RENDERER/pointrenderer';
import { RendererManager, ParticleRenderMode } from './PARTICLESYSTEM/RENDERER/renderercore';
import { PhysicPanel, ColorMode } from './PARTICLESYSTEM/PANELphysic';
import { VisualsPanel } from './PARTICLESYSTEM/PANEL/PANELvisuals';
import { SoundReactivity } from './AUDIO/soundreactivity';
import type { AudioData } from './AUDIO/soundreactivity';
import { AudioReactiveBehavior } from './AUDIO/audioreactive';
import { AudioVisualizationManager } from './AUDIO/audiovisual';
import { AudioPanel } from './AUDIO/PANELsoundreactivity';
import { AdaptivePerformanceManager, type PerformanceChangeContext, type PerformanceTier } from './APP/performance';

export type { ProgressCallback } from './APP/types';

/**
 * FlowApp - Main application class
 * Coordinates all modules and manages the application lifecycle
 */
export class FlowApp {
  // Configuration
  private config: FlowConfig = { ...defaultConfig };

  // Core modules
  private scenery!: Scenery;
  private postFX!: PostFX;  // RE-ENABLED
  private dashboard!: Dashboard;

  // Scene elements
  private boundaries!: ParticleBoundaries;

  // Particle system
  private mlsMpmSim!: MlsMpmSimulator;
  private rendererManager!: RendererManager;  // PRIMARY: Unified renderer system
  private currentRenderObject: THREE.Object3D | null = null;  // Currently active renderer
  
  // Legacy renderers (DEPRECATED - kept for backward compatibility only)
  private meshRenderer!: MeshRenderer;
  private pointRenderer!: PointRenderer;
  private useLegacyRenderers: boolean = false;  // Set to true to use old system

  // UI Panels
  private postFXPanel!: PostFXPanel;  // RE-ENABLED
  private physicPanel!: PhysicPanel;
  private visualsPanel!: VisualsPanel;  // NEW: Visual controls
  private audioPanel!: AudioPanel;

  // Audio reactivity
  private soundReactivity!: SoundReactivity;
  private audioReactiveBehavior!: AudioReactiveBehavior;
  private audioVisualizationManager!: AudioVisualizationManager;

  // Adaptive performance
  private performanceManager!: AdaptivePerformanceManager;
  private currentPerformanceTier: PerformanceTier = 'high';
  private preferredRenderMode: ParticleRenderMode = ParticleRenderMode.MESH;

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
   * Initialize all modules
   */
  public async init(progressCallback?: ProgressCallback): Promise<void> {
    const pipeline = this.createInitializationPipeline();
    await pipeline.execute({
      progress: progressCallback,
      reporter: this.createPipelineReporter(),
      settleDelayMs: 100,
    });
  }

  private createPipelineReporter(): PipelineReporter {
    return {
      onStepStart: ({ step }) => {
        console.info(`⏳ [${step.id}] ${step.label}...`);
      },
      onStepComplete: ({ step, durationMs }) => {
        console.info(`✅ [${step.id}] ${step.label} (${durationMs.toFixed(1)}ms)`);
      },
      onStepSkipped: ({ step }) => {
        console.info(`⏭️ [${step.id}] ${step.label} skipped`);
      },
    };
  }

  private createInitializationPipeline(): AppPipeline {
    return new AppPipeline([
      { id: 'config', label: 'Configuration & dashboard', weight: 1, run: async () => this.initializeConfigAndDashboard() },
      { id: 'scenery', label: 'Scene & camera', weight: 2, run: async () => this.initializeScenery() },
      { id: 'postfx', label: 'Post-processing stack', weight: 1, run: async () => this.initializePostFX() },
      { id: 'boundaries', label: 'Particle boundaries', weight: 1, run: async () => this.initializeBoundaries() },
      { id: 'physics', label: 'Particle physics solver', weight: 2, run: async () => this.initializePhysics() },
      { id: 'renderers', label: 'Renderer systems', weight: 2, run: async () => this.initializeRenderers() },
      { id: 'panels', label: 'Core control panels', weight: 1, run: async () => this.initializeCorePanels() },
      { id: 'audio', label: 'Audio reactivity stack', weight: 1, enabled: () => this.isAudioPipelineEnabled(), run: async () => this.initializeAudioSystems() },
      { id: 'visuals', label: 'Visual controls', weight: 1, run: async () => this.initializeVisualsPanel() },
      { id: 'audio-panel', label: 'Audio control panel', weight: 1, enabled: () => this.isAudioPipelineEnabled(), run: async () => this.initializeAudioPanel() },
      { id: 'interaction', label: 'Input & resize wiring', weight: 1, run: async () => this.initializeInteraction() },
    ]);
  }

  private isAudioPipelineEnabled(): boolean {
    return this.config.audio.enabled || this.config.audioReactive.enabled;
  }

  private initializeConfigAndDashboard(): void {
    updateParticleParams(this.config);
    this.dashboard = new Dashboard({ showInfo: false, showFPS: false });
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

    this.rendererManager.setSimulationTransform(this.boundaries.getSimulationTransform());

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
          console.info(
            `⚙️ Adaptive performance → ${context.tier} (${context.reason}) @ ${context.fps.toFixed(1)}fps`
          );
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

  private initializeCorePanels(): void {
    this.physicPanel = new PhysicPanel(this.dashboard, this.config, {
      onParticleCountChange: (_count) => {},
      onSizeChange: (_size) => {},
      onSimulationChange: (_simConfig) => {},
      onMaterialChange: () => {
        if (this.physicPanel.colorMode === ColorMode.MATERIAL) {
          this.mlsMpmSim.setColorMode(ColorMode.MATERIAL);
        }
      },
      onForceFieldsChange: () => {
        this.mlsMpmSim.updateForceFields(this.physicPanel.forceFieldManager);
      },
      onEmittersChange: () => {},
      onBoundariesChange: () => {
        this.mlsMpmSim.updateBoundaryUniforms();
      },
    });
    this.physicPanel.boundaries = this.boundaries;

    this.postFXPanel = new PostFXPanel(this.dashboard, this.config, {
      onBloomChange: (bloomConfig) => {
        this.postFX.updateBloom(bloomConfig);
      },
      onRadialFocusChange: (radialFocusConfig) => {
        this.postFX.updateRadialFocus(radialFocusConfig);
      },
      onRadialCAChange: (radialCAConfig) => {
        this.postFX.updateRadialCA(radialCAConfig);
      },
    });
  }

  private async initializeAudioSystems(): Promise<void> {
    this.soundReactivity = new SoundReactivity(this.config.audio);
    if (this.config.audio.enabled) {
      try {
        await this.soundReactivity.init();
        console.log('🎤 SoundReactivity initialized successfully!');
      } catch (error) {
        console.warn('⚠️ Failed to initialize audio (microphone access denied?):', error);
      }
    }

    this.audioReactiveBehavior = new AudioReactiveBehavior(this.renderer, this.config.audioReactive);
    this.audioReactiveBehavior.setForceFieldManager(this.physicPanel.forceFieldManager);

    this.audioVisualizationManager = new AudioVisualizationManager(
      this.renderer,
      this.viewportGridSize,
    );
    this.audioVisualizationManager.setMode(this.config.audioReactive.mode);
    this.mlsMpmSim.setAudioVisualizationMode(this.config.audioReactive.mode);
  }

  private initializeVisualsPanel(): void {
    this.visualsPanel = new VisualsPanel(this.dashboard, {
      onRenderModeChange: (mode) => {
        this.preferredRenderMode = mode;
        this.performanceManager.registerManualOverride();
        this.switchRenderMode(mode);
      },
      onMaterialPresetChange: (preset) => {
        console.log(`🎨 Applying preset: ${preset.name}`);
        this.visualsPanel.settings.metalness = preset.metalness;
        this.visualsPanel.settings.roughness = preset.roughness;
        this.visualsPanel.settings.emissive = preset.emissive;

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
      onColorGradientChange: (gradientName) => {
        console.log('🌈 Color gradient changed:', gradientName);
      },
      onSizeChange: (size) => {
        this.rendererManager.update(this.mlsMpmSim.numParticles, size);
      },
      onMaterialPropertyChange: (property, value) => {
        console.log(`🎨 ${property}: ${value.toFixed(2)}`);

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
    });

    this.visualsPanel.setRendererManager(this.rendererManager);
  }

  private initializeAudioPanel(): void {
    this.audioPanel = new AudioPanel(this.dashboard, this.config, {
      onAudioConfigChange: (audioConfig) => {
        this.soundReactivity.updateConfig(audioConfig);
      },
      onAudioReactiveConfigChange: (audioReactiveConfig) => {
        this.audioReactiveBehavior.updateConfig(audioReactiveConfig);
        if (audioReactiveConfig.mode !== undefined) {
          this.audioVisualizationManager.setMode(audioReactiveConfig.mode);
          this.mlsMpmSim.setAudioVisualizationMode(audioReactiveConfig.mode);
          console.log(`🎵 Visualization mode changed to: ${audioReactiveConfig.mode}`);
        }
      },
      onSourceChange: async (source) => {
        this.soundReactivity.dispose();
        this.config.audio.source = source;
        this.soundReactivity = new SoundReactivity(this.config.audio);
        try {
          await this.soundReactivity.init();
          console.log('✅ Audio source changed to:', source);
        } catch (error) {
          console.error('Failed to initialize audio:', error);
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
    });
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
    this.resizeHandler = () => {
      // Adaptive gridSize based on viewport aspect ratio
      // Maintains particle visibility when page resizes
      const aspect = window.innerWidth / window.innerHeight;

      this.viewportGridSize.set(
        this.baseGridSize.x * Math.max(1, aspect),
        this.baseGridSize.y * Math.max(1, 1 / aspect),
        this.baseGridSize.z
      );

      // Update boundaries gridSize
      this.boundaries.setGridSize(this.viewportGridSize);

      // Update simulator uniforms
      this.mlsMpmSim.updateBoundaryUniforms();

      if (this.rendererManager) {
        this.rendererManager.setSimulationTransform(this.boundaries.getSimulationTransform());
      }

      console.log('📐 Viewport adapted:', this.viewportGridSize.toArray().map(v => v.toFixed(1)));
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
  public async update(delta: number, elapsed: number): Promise<void> {
    if (this.physicPanel?.fpsGraph) {
      this.physicPanel.fpsGraph.begin();
    }

    this.scenery.update(delta, elapsed);

    const audioData = this.updateAudioReactivity(delta, elapsed);

    this.updateRendererState(audioData);

    await this.updateSimulation(delta, elapsed, audioData);

    await this.postFX.render();

    this.performanceManager.update(delta);

    if (this.physicPanel?.fpsGraph) {
      this.physicPanel.fpsGraph.end();
    }
  }

  private updateAudioReactivity(delta: number, elapsed: number): AudioData | null {
    if (!this.boundaries) {
      return null;
    }

    const audioReady = Boolean(this.soundReactivity) && this.isAudioPipelineEnabled();
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

    if (audioData && audioEnabled) {
      this.audioPanel?.updateMetrics(audioData);
    }

    if (audioData && this.config.audioReactive.enabled) {
      if (import.meta.env.DEV && Math.random() < 0.016) {
        console.log('🎵 Audio:', {
          bass: audioData.smoothBass.toFixed(2),
          mid: audioData.smoothMid.toFixed(2),
          treble: audioData.smoothTreble.toFixed(2),
          beat: audioData.isBeat ? '🔴' : '⚫',
          beatIntensity: audioData.beatIntensity.toFixed(2),
        });
      }

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
      this.visualsPanel?.settings.particleSize ??
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

    this.mlsMpmSim.updateForceFields(this.physicPanel.forceFieldManager);
    this.mlsMpmSim.setColorMode(this.physicPanel.colorMode);
    this.physicPanel.emitterManager.update(delta);

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
    this.physicPanel.updateMetrics(
      this.mlsMpmSim.numParticles,
      fps,
      frameMs
    );
  }

  /**
   * Switch particle render mode (Unified System)
   */
  private switchRenderMode(mode: ParticleRenderMode): void {
    console.log(`🎨 Switching render mode to: ${RendererManager.getModeName(mode)}`);
    
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
      this.visualsPanel?.settings.particleSize ??
      this.config.particles.actualSize ??
      this.config.particles.size ??
      1.0;

    this.rendererManager.update(
      this.mlsMpmSim.numParticles,
      particleSize
    );

    console.log(`✅ Now rendering with: ${RendererManager.getModeName(mode)}`);

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
      console.info(
        `🎯 Renderer mode adjusted for ${context.tier} tier (was ${previousTier}) → ${RendererManager.getModeName(targetMode)}`
      );
      this.switchRenderMode(targetMode);
      this.visualsPanel?.syncRenderMode(targetMode);
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
    
    this.dashboard?.dispose();
    this.scenery?.dispose();
    this.postFX?.dispose();  // RE-ENABLED
    this.boundaries?.dispose();
    this.meshRenderer?.dispose();
    this.pointRenderer?.dispose();
    this.rendererManager?.dispose();  // NEW
    this.physicPanel?.dispose();
    this.visualsPanel?.dispose();  // NEW
    this.audioPanel?.dispose();
    this.soundReactivity?.dispose();
    this.audioReactiveBehavior?.dispose();
    this.audioVisualizationManager?.dispose();
  }
}

