/**
 * APP.ts - Main application orchestrator
 * Single responsibility: Lifecycle management and module coordination
 */

import * as THREE from "three/webgpu";
import { AppPipeline, type PipelineReporter } from './APP/pipeline';
import type { ProgressCallback } from './APP/types';
import { defaultConfig, updateParticleParams, type FlowConfig } from './config';
import { DashboardV2 } from './PANEL/DashboardV2';
import { Scenery } from './STAGE/scenery';
import { PostFX } from './POSTFX/postfx';  // RE-ENABLED (simplified version)
import { ParticleBoundaries } from './PARTICLESYSTEM/physic/boundaries';
import { PostFXPanel } from './POSTFX/PANELpostfx';  // RE-ENABLED
import { MlsMpmSimulator } from './PARTICLESYSTEM/physic/mls-mpm';
import { MeshRenderer } from './PARTICLESYSTEM/RENDERER/meshrenderer';
import { PointRenderer } from './PARTICLESYSTEM/RENDERER/pointrenderer';
import { RendererManager, ParticleRenderMode } from './PARTICLESYSTEM/RENDERER/renderercore';
import { PhysicPanel } from './PARTICLESYSTEM/PANELphysic';
import { VisualsPanel } from './PANEL/PANELvisuals';
import { ThemesPanel } from './PANEL/PANELthemes';
import { ColorMode } from './PARTICLESYSTEM/visuals/colormodes';
import { SoundReactivity } from './AUDIO/soundreactivity';
import type { AudioData } from './AUDIO/soundreactivity';
import { AudioReactiveBehavior } from './AUDIO/audioreactive';
import { AudioVisualizationManager } from './AUDIO/audiovisual';
import { AudioPanel } from './AUDIO/PANELsoundreactivity';
import { AdaptivePerformanceManager, type PerformanceChangeContext, type PerformanceTier } from './APP/performance';
import { GPUTextureManager } from './PARTICLESYSTEM/visuals/textures/proceduralGPU';

// Enhanced Audio Systems
import { EnhancedAudioAnalyzer, type EnhancedAudioData } from './AUDIO/core/enhanced-audio-analyzer';
import { GestureInterpreter, type GestureSelection } from './AUDIO/kinetic/gesture-interpreter';
import { EnsembleChoreographer, type EnsembleState } from './AUDIO/kinetic/ensemble-choreographer';
import { SpatialComposer, type SpatialState } from './AUDIO/kinetic/spatial-composer';
import { PersonalityEngine, type PersonalityBlendState } from './AUDIO/kinetic/personality-engine';
import { PersonalityType } from './AUDIO/kinetic/personality-profiles';
import { MacroControlSystem, getMacroPreset, MacroType } from './AUDIO/kinetic/macro-control';
import { SequenceRecorder, SequenceEventType } from './AUDIO/kinetic/sequence-recorder';
import { createKineticUniforms, type KineticUniforms } from './AUDIO/kinetic/particle-integration';

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
  private dashboard!: DashboardV2;

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
  private themesPanel!: ThemesPanel;  // NEW: Themes panel
  private audioPanel!: AudioPanel;

  // Audio reactivity
  private soundReactivity!: SoundReactivity;
  private audioReactiveBehavior!: AudioReactiveBehavior;
  private audioVisualizationManager!: AudioVisualizationManager;
  
  // Enhanced audio systems
  private enhancedAudioAnalyzer!: EnhancedAudioAnalyzer;
  private gestureInterpreter!: GestureInterpreter;
  private ensembleChoreographer!: EnsembleChoreographer;
  private spatialComposer!: SpatialComposer;
  private personalityEngine!: PersonalityEngine;
  private macroControl!: MacroControlSystem;
  private sequenceRecorder!: SequenceRecorder;
  private kineticUniforms!: KineticUniforms;

  // GPU Texture System
  private gpuTextureManager!: GPUTextureManager;

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
      { id: 'textures', label: 'GPU texture system', weight: 1, run: async () => this.initializeGPUTextures() },
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
    // Initialize unified panel system with modern glassmorphism theme
    this.dashboard = new DashboardV2({
      defaultDock: 'right',
      defaultTheme: 'cosmic-blue',
      defaultExpanded: true,
    });
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
        vignette: this.config.vignette,
        filmGrain: this.config.filmGrain,
        colorGrading: this.config.colorGrading,
      }
    );
    await this.postFX.init();
    this.scenery.disableToneMappingForPostFX();
    console.log('✨ PostFX initialized with enhanced effects (vignette, film grain, color grading)');
  }

  private async initializeGPUTextures(): Promise<void> {
    this.gpuTextureManager = new GPUTextureManager(this.renderer);
    console.log('🎨 GPU Texture Manager initialized - ready to generate procedural textures');
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
    // Initialize themes panel first (so theme applies to other panels)
    const { pane: themesPane } = this.dashboard.createPanel('themes', {
      title: '🎨 Themes',
      icon: '🎨',
    });
    
    this.themesPanel = new ThemesPanel(themesPane, this.dashboard.getThemeEngine(), {
      onThemeChange: (theme) => {
        console.log(`🎨 Theme changed to: ${theme.name}`);
      },
    });

    // Initialize physics panel
    const { pane: physicsPane } = this.dashboard.createPanel('physics', {
      title: '⚛️ Physics',
      icon: '⚛️',
    });
    
    this.physicPanel = new PhysicPanel(physicsPane, this.config, {
      onParticleCountChange: (_count) => {},
      onSimulationChange: (_simConfig) => {},
      onMaterialChange: () => {
        // Color mode is now controlled by visuals panel
        // Material change only affects physics properties
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

    // Initialize PostFX panel
    const { pane: postfxPane } = this.dashboard.createPanel('postfx', {
      title: '✨ Post-FX',
      icon: '✨',
    });
    
    this.postFXPanel = new PostFXPanel(postfxPane, this.config, {
      onBloomChange: (bloomConfig) => {
        this.postFX.updateBloom(bloomConfig);
      },
      onRadialFocusChange: (radialFocusConfig) => {
        this.postFX.updateRadialFocus(radialFocusConfig);
      },
      onRadialCAChange: (radialCAConfig) => {
        this.postFX.updateRadialCA(radialCAConfig);
      },
      onVignetteChange: (vignetteConfig) => {
        this.postFX.updateVignette(vignetteConfig);
      },
      onFilmGrainChange: (filmGrainConfig) => {
        this.postFX.updateFilmGrain(filmGrainConfig);
      },
      onColorGradingChange: (colorGradingConfig) => {
        this.postFX.updateColorGrading(colorGradingConfig);
      },
    });
    
    // ✨ FIX: Notify boundaries system that UI panels are now loaded
    // This ensures sphere and other boundaries adapt to UI layout
    if (this.boundaries) {
      this.boundaries.refreshViewport();
    }
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
    
    // Initialize enhanced audio systems
    this.enhancedAudioAnalyzer = new EnhancedAudioAnalyzer();
    this.gestureInterpreter = new GestureInterpreter();
    this.ensembleChoreographer = new EnsembleChoreographer();
    this.spatialComposer = new SpatialComposer();
    this.spatialComposer.setCamera(this.scenery.camera);
    this.personalityEngine = new PersonalityEngine({
      autoAdapt: true,
      globalInfluence: 0.5,
    });
    this.macroControl = new MacroControlSystem();
    this.sequenceRecorder = new SequenceRecorder();
    this.kineticUniforms = createKineticUniforms();
    
    // Connect kinetic uniforms to particle simulator
    this.mlsMpmSim.setKineticUniforms(this.kineticUniforms);
    
    // Setup sequence recorder event callback
    this.sequenceRecorder.setEventCallback((event) => {
      if (event.type === SequenceEventType.GESTURE_TRIGGER) {
        // Would trigger gesture in future integration
        console.log(`🎭 Sequence gesture: ${event.gesture}`);
      } else if (event.type === SequenceEventType.MACRO_CHANGE) {
        this.macroControl.setMacro(event.macro, event.value);
      } else if (event.type === SequenceEventType.PERSONALITY_CHANGE) {
        const personalityType = event.personality as PersonalityType;
        this.personalityEngine.setGlobalPersonality(personalityType);
      }
    });
    
    console.log('✨ Enhanced audio systems initialized (Groove, Gestures, Ensemble, Spatial, Personality, Macro, Sequence)');
  }

  private initializeVisualsPanel(): void {
    const { pane: visualsPane } = this.dashboard.createPanel('visuals', {
      title: '🎨 Visuals',
      icon: '🎨',
    });
    
    this.visualsPanel = new VisualsPanel(visualsPane, {
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
    const { pane: audioPane } = this.dashboard.createPanel('audio', {
      title: '🎵 Audio',
      icon: '🎵',
    });
    
    this.audioPanel = new AudioPanel(audioPane, this.config, {
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
      onPersonalityChange: (personality) => {
        this.personalityEngine?.setGlobalPersonality(personality);
        console.log(`🎭 Global personality changed to: ${personality}`);
      },
      onPersonalityAutoAdapt: (enabled) => {
        this.personalityEngine?.updateConfig({ autoAdapt: enabled });
        console.log(`🎭 Personality auto-adapt: ${enabled ? 'ON' : 'OFF'}`);
      },
      onMacroChange: (macro, value) => {
        this.macroControl?.setMacro(macro, value);
        
        // Record macro change if recording
        if (this.sequenceRecorder) {
          this.sequenceRecorder.recordMacro(macro, value);
        }
      },
      onMacroPresetApply: (presetName) => {
        const preset = getMacroPreset(presetName);
        if (preset) {
          this.macroControl?.applyPreset(preset);
          console.log(`🎹 Applied macro preset: ${presetName}`);
        }
      },
      onSequenceRecord: () => {
        if (this.sequenceRecorder.getRecorderState().isRecording) {
          const sequence = this.sequenceRecorder.stopRecording('Live Recording ' + new Date().toLocaleTimeString());
          console.log(`✅ Recording saved: ${sequence?.name} (${sequence?.events.length} events)`);
        } else {
          this.sequenceRecorder.startRecording();
          console.log('🔴 Recording started');
        }
      },
      onSequenceStop: () => {
        if (this.sequenceRecorder.getRecorderState().isRecording) {
          this.sequenceRecorder.cancelRecording();
          console.log('❌ Recording cancelled');
        } else if (this.sequenceRecorder.getPlaybackState().isPlaying) {
          this.sequenceRecorder.stop();
          console.log('⏹️ Playback stopped');
        }
      },
      onSequencePause: () => {
        const state = this.sequenceRecorder.getPlaybackState();
        if (state.isPlaying && !state.isPaused) {
          this.sequenceRecorder.pause();
          console.log('⏸️ Playback paused');
        } else if (state.isPaused) {
          this.sequenceRecorder.resume();
          console.log('▶️ Playback resumed');
        }
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
   * Setup window resize handler
   * ✨ SIMPLIFIED: Boundaries are now self-dependent with ViewportTracker
   * No manual grid size updates needed - boundaries handle everything automatically
   */
  private resizeHandler?: () => void;
  
  private setupResizeHandler(): void {
    this.resizeHandler = () => {
      // ✨ NEW: Boundaries are self-dependent with ViewportTracker
      // They automatically track viewport changes and update gridSize
      // No manual updates needed!
      
      // Just update simulator uniforms to sync with boundary changes
      this.mlsMpmSim.updateBoundaryUniforms();
      
      // Update viewport grid size for internal tracking
      const bounds = this.boundaries.getViewportBounds();
      this.viewportGridSize.set(bounds.grid.width, bounds.grid.height, bounds.grid.depth);
      
      console.log('📐 Viewport adapted (automatic):', this.viewportGridSize.toArray().map(v => v.toFixed(1)));
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

    // Update GPU texture manager for animated procedural textures
    if (this.gpuTextureManager) {
      this.gpuTextureManager.update(delta);
    }

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

    // Enhanced audio processing
    let enhancedAudioData: EnhancedAudioData | null = null;
    let gestureSelection: GestureSelection | null = null;
    let ensembleState: EnsembleState | null = null;
    let spatialState: SpatialState | null = null;
    let personalityState: PersonalityBlendState | null = null;
    
    if (audioData && audioEnabled) {
      // Update macro controls (smooth transitions)
      this.macroControl?.update(delta);
      
      // Update sequence recorder (playback)
      this.sequenceRecorder?.update();
      
      // Run enhanced analysis
      enhancedAudioData = this.enhancedAudioAnalyzer?.analyze(audioData);
      
      // Update kinetic uniforms with current state
      this.updateKineticUniforms(enhancedAudioData, gestureSelection, ensembleState, personalityState);
      
      if (enhancedAudioData && this.config.audioReactive.enabled) {
        // Update gesture system
        gestureSelection = this.gestureInterpreter?.update(
          enhancedAudioData,
          delta
        );
        
        // Convert gesture selection to active gestures array
        const activeGestures = [];
        if (gestureSelection?.primary) {
          activeGestures.push(gestureSelection.primary);
        }
        if (gestureSelection?.secondary) {
          activeGestures.push(...gestureSelection.secondary);
        }
        
        // Update ensemble choreography
        ensembleState = this.ensembleChoreographer?.update(
          enhancedAudioData,
          activeGestures,
          delta
        );
        
        // Update personality system
        this.personalityEngine?.update(
          enhancedAudioData,
          new Map(), // EnsembleState doesn't have roles property
          delta
        );
        
        // Update spatial composition (just get state)
        spatialState = this.spatialComposer?.getState();
      }
      
      // Update panel with enhanced metrics
      if (this.audioPanel?.updateEnhancedMetrics && enhancedAudioData) {
        this.audioPanel.updateEnhancedMetrics(
          enhancedAudioData,
          gestureSelection,
          ensembleState,
          spatialState,
          null // personalityState removed
        );
      } else if (this.audioPanel?.updateMetrics) {
        this.audioPanel.updateMetrics(audioData);
      }
    }

    if (audioData && this.config.audioReactive.enabled) {
      // Audio logging disabled to reduce console spam
      if (false && import.meta.env.DEV && Math.random() < 0.016) {
        console.log('🎵 Audio:', {
          bass: audioData!.smoothBass.toFixed(2),
          mid: audioData!.smoothMid.toFixed(2),
          treble: audioData!.smoothTreble.toFixed(2),
          beat: audioData!.isBeat ? '🔴' : '⚫',
          beatIntensity: audioData!.beatIntensity.toFixed(2),
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
    // NOTE: Color mode now controlled by visuals panel via callbacks
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
   * Get the GPU texture manager for external use
   */
  public getGPUTextureManager(): GPUTextureManager | undefined {
    return this.gpuTextureManager;
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
    this.gpuTextureManager?.dispose();  // NEW: Clean up GPU textures
    this.physicPanel?.dispose();
    this.visualsPanel?.dispose();  // NEW
    this.audioPanel?.dispose();
    this.soundReactivity?.dispose();
    this.audioReactiveBehavior?.dispose();
    this.audioVisualizationManager?.dispose();
    
    // Enhanced audio systems don't need explicit disposal (no resources to clean up)
    // but we'll null them for good measure
    this.enhancedAudioAnalyzer = null as any;
    this.gestureInterpreter = null as any;
    this.ensembleChoreographer = null as any;
    this.spatialComposer = null as any;
    this.personalityEngine = null as any;
    this.macroControl = null as any;
    this.sequenceRecorder = null as any;
    this.kineticUniforms = null as any;
  }
  
  /**
   * Update kinetic uniforms for particle integration
   */
  private updateKineticUniforms(
    audioData: EnhancedAudioData | null,
    gestureSelection: GestureSelection | null,
    ensembleState: EnsembleState | null,
    personalityState: any | null
  ): void {
    if (!audioData || !this.kineticUniforms) return;
    
    // Get macro state
    const macroState = this.macroControl?.computeState();
    
    // Update gesture uniforms
    if (gestureSelection && gestureSelection.primary) {
      const primary = gestureSelection.primary;
      // Gesture has a type property that's the name
      const gestureName = (primary.gesture as any).type || 'Swell';
      this.kineticUniforms.activeGesture.value = this.gestureTypeToInt(gestureName);
      this.kineticUniforms.gestureIntensity.value = primary.params.intensity;
      this.kineticUniforms.gestureProgress.value = (audioData.time - primary.startTime) / primary.duration;
      
      // Secondary gesture for blending
      if (gestureSelection.secondary.length > 0) {
        const secondary = gestureSelection.secondary[0];
        const secondaryName = (secondary.gesture as any).type || 'Swell';
        this.kineticUniforms.secondaryGesture.value = this.gestureTypeToInt(secondaryName);
        this.kineticUniforms.secondaryIntensity.value = secondary.params.intensity;
      } else {
        this.kineticUniforms.secondaryIntensity.value = 0;
      }
    } else {
      this.kineticUniforms.gestureIntensity.value = 0;
    }
    
    // Update personality uniforms
    if (personalityState) {
      this.kineticUniforms.globalPersonality.value = this.personalityTypeToInt(personalityState.globalPersonality);
      this.kineticUniforms.personalityTransition.value = personalityState.transitionProgress;
    }
    
    // Update macro uniforms
    if (macroState) {
      this.kineticUniforms.macroIntensity.value = macroState.intensity;
      this.kineticUniforms.macroChaos.value = macroState.chaos;
      this.kineticUniforms.macroSmoothness.value = macroState.smoothness;
      this.kineticUniforms.macroResponsiveness.value = macroState.responsiveness;
      this.kineticUniforms.macroEnergy.value = macroState.energy;
      this.kineticUniforms.macroCoherence.value = macroState.coherence;
    }
    
    // Update audio feature uniforms
    const groove = audioData.groove;
    const structure = audioData.structure;
    const timing = audioData.timing;
    
    if (groove) {
      this.kineticUniforms.grooveIntensity.value = groove.pocketTightness || 0;
      this.kineticUniforms.swingRatio.value = groove.swingRatio;
    }
    
    if (structure) {
      this.kineticUniforms.tension.value = structure.tension;
    }
    
    if (timing) {
      this.kineticUniforms.beatPhase.value = timing.beatPhase || 0;
      this.kineticUniforms.downbeatPhase.value = timing.beatPhase || 0;  // Use beatPhase for both
    }
    
    // Update ensemble ratios (approximations from state)
    if (ensembleState && ensembleState.roleAssignments) {
      // Count roles
      let leadCount = 0;
      let totalCount = 0;
      ensembleState.roleAssignments.forEach((assignment) => {
        totalCount++;
        if (assignment.role === 'lead') leadCount++;
      });
      this.kineticUniforms.leadRatio.value = totalCount > 0 ? leadCount / totalCount : 0.2;
    }
  }
  
  /**
   * Convert gesture type to integer for GPU
   */
  private gestureTypeToInt(gesture: string): number {
    const map: Record<string, number> = {
      'Swell': 0,
      'Attack': 1,
      'Release': 2,
      'Sustain': 3,
      'Accent': 4,
      'Breath': 5,
    };
    return map[gesture] || 0;
  }
  
  /**
   * Convert personality type to integer for GPU
   */
  private personalityTypeToInt(personality: PersonalityType): number {
    const map: Record<string, number> = {
      'calm': 0,
      'energetic': 1,
      'flowing': 2,
      'aggressive': 3,
      'gentle': 4,
      'chaotic': 5,
      'rhythmic': 6,
      'ethereal': 7,
    };
    return map[personality] || 0;
  }
}







