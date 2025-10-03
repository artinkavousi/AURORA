/**
 * APP.ts - Main application orchestrator
 * Single responsibility: Lifecycle management and module coordination
 */

import * as THREE from "three/webgpu";
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
import { AudioReactiveBehavior } from './AUDIO/audioreactive';
import { AudioVisualizationManager } from './AUDIO/audiovisual';
import { AudioPanel } from './AUDIO/PANELsoundreactivity';

export type ProgressCallback = (frac: number, delay?: number) => Promise<void>;

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

  // Mouse interaction
  private raycaster!: THREE.Raycaster;
  private plane!: THREE.Plane;

  constructor(private renderer: THREE.WebGPURenderer) {}

  /**
   * Initialize all modules
   */
  public async init(progressCallback?: ProgressCallback): Promise<void> {
    const progress = progressCallback || (async () => {});

    // Initialize config
    updateParticleParams(this.config);

    // Initialize dashboard (UI framework) - FPS in PhysicPanel, Info panel removed
    this.dashboard = new Dashboard({ showInfo: false, showFPS: false });

    await progress(0.1);

    // Initialize scenery (scene, camera, lights, HDR environment)
    this.scenery = new Scenery(
      this.renderer, // Pass the renderer
      this.renderer.domElement, // And the DOM element for controls
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

    await progress(0.3);

    // Initialize PostFX (refined: bloom + radial focus + radial CA)
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
    
    // Disable scenery tone mapping - PostFX handles it
    this.scenery.disableToneMappingForPostFX();

    await progress(0.4);

    // Initialize particle boundaries (default: disabled for viewport mode)
    this.boundaries = new ParticleBoundaries({
      gridSize: new THREE.Vector3(64, 64, 64),
      wallThickness: 3,
      wallStiffness: 0.3,
      visualize: false,  // Hidden by default
      audioReactive: true,  // Enable audio-reactive animations
      audioPulseStrength: 0.15,  // Moderate pulse strength
    });
    await this.boundaries.init();
    this.scenery.add(this.boundaries.object);
    
    // Set boundaries to disabled (viewport mode) by default
    this.boundaries.setEnabled(false);

    await progress(0.5);

    // Initialize particle physics
    this.mlsMpmSim = new MlsMpmSimulator(this.renderer, {
      maxParticles: this.config.particles.maxCount,
      gridSize: new THREE.Vector3(64, 64, 64),
    });
    await this.mlsMpmSim.init();
    
    // Connect boundaries to physics simulator
    this.mlsMpmSim.setBoundaries(this.boundaries);

    await progress(0.7);

    // Initialize PRIMARY unified renderer system
    this.rendererManager = new RendererManager(this.mlsMpmSim, {
      mode: this.config.rendering.points ? ParticleRenderMode.POINT : ParticleRenderMode.MESH,
      quality: 2 as import('./PARTICLESYSTEM/RENDERER/renderercore').RenderQuality,  // HIGH = 2
      lodEnabled: false,
      sortingEnabled: false,
      cullingEnabled: false,
      maxParticles: this.config.particles.maxCount,
    });
    
    // Get renderer and add to scene (ACTIVE by default)
    this.currentRenderObject = this.rendererManager.getRenderer().object;
    this.currentRenderObject.visible = true;  // ✅ NEW SYSTEM IS PRIMARY
    this.scenery.add(this.currentRenderObject);
    
    // Initialize legacy renderers (for backward compatibility if needed)
    this.meshRenderer = new MeshRenderer(this.mlsMpmSim, {
      metalness: 0.900,
      roughness: 0.50,
    });
    this.pointRenderer = new PointRenderer(this.mlsMpmSim);
    
    // Add to scene but keep HIDDEN (legacy system disabled by default)
    this.meshRenderer.object.visible = false;
    this.pointRenderer.object.visible = false;
    this.scenery.add(this.meshRenderer.object);
    this.scenery.add(this.pointRenderer.object);

    await progress(0.8);

    // Initialize control panels (standalone draggable panes)
    this.physicPanel = new PhysicPanel(this.dashboard, this.config, {
      onParticleCountChange: (count) => {
        // Handled in update loop
      },
      onSizeChange: (size) => {
        // Handled in update loop
      },
      onSimulationChange: (simConfig) => {
        // Handled in update loop
      },
      onMaterialChange: () => {
        // Material type changed - update color mode if needed
        if (this.physicPanel.colorMode === ColorMode.MATERIAL) {
          this.mlsMpmSim.setColorMode(ColorMode.MATERIAL);
        }
      },
      onForceFieldsChange: () => {
        // Force fields updated - sync to simulator
        this.mlsMpmSim.updateForceFields(this.physicPanel.forceFieldManager);
      },
      onEmittersChange: () => {
        // Emitters updated
        // TODO: Future emitter particle injection
      },
      onBoundariesChange: () => {
        // Boundaries updated - sync to physics simulator
        this.mlsMpmSim.updateBoundaryUniforms();
      },
    });
    
    // Connect boundaries to panel
    this.physicPanel.boundaries = this.boundaries;

    // Initialize PostFX control panel (clean: bloom + radial blur + radial CA)
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

    // Initialize audio reactivity system (don't start by default)
    this.soundReactivity = new SoundReactivity(this.config.audio);
    
    // Actually initialize the audio context and request microphone permission
    if (this.config.audio.enabled) {
      try {
        await this.soundReactivity.init();
        console.log('🎤 SoundReactivity initialized successfully!');
      } catch (error) {
        console.warn('⚠️ Failed to initialize audio (microphone access denied?):', error);
      }
    }
    
    // Initialize audio-reactive behavior system
    console.log('🎵 Initializing AudioReactiveBehavior...', this.config.audioReactive);
    this.audioReactiveBehavior = new AudioReactiveBehavior(this.renderer, this.config.audioReactive);
    console.log('🎵 AudioReactiveBehavior created, setting force field manager...');
    this.audioReactiveBehavior.setForceFieldManager(this.physicPanel.forceFieldManager);
    console.log('🎵 Force field manager set successfully');
    
    // Initialize visualization manager (handles 8 visualization modes)
    console.log('🎵 Initializing AudioVisualizationManager...');
    this.audioVisualizationManager = new AudioVisualizationManager(
      this.renderer,
      new THREE.Vector3(64, 64, 64)
    );
    console.log('🎵 Setting visualization mode:', this.config.audioReactive.mode);
    this.audioVisualizationManager.setMode(this.config.audioReactive.mode);
    
    // Sync initial visualization mode to physics simulator
    this.mlsMpmSim.setAudioVisualizationMode(this.config.audioReactive.mode);
    
    console.log('🎵 Audio system initialized successfully!');
    
    // Initialize visuals control panel (NEW)
    this.visualsPanel = new VisualsPanel(this.dashboard, {
      onRenderModeChange: (mode) => {
        this.switchRenderMode(mode);
      },
      onMaterialPresetChange: (preset) => {
        console.log(`🎨 Applying preset: ${preset.name}`);
        
        // Update visuals panel settings
        this.visualsPanel.settings.metalness = preset.metalness;
        this.visualsPanel.settings.roughness = preset.roughness;
        this.visualsPanel.settings.emissive = preset.emissive;
        
        // Apply to active renderer if it's a mesh-based material
        const currentMode = this.rendererManager.getCurrentMode();
        if (currentMode === ParticleRenderMode.MESH) {
          const renderer = this.rendererManager.getRenderer() as MeshRenderer;
          if (renderer && renderer.material) {
            renderer.material.metalness = preset.metalness;
            renderer.material.roughness = preset.roughness;
            renderer.material.needsUpdate = true;
          }
        }
        
        // Also update legacy mesh renderer for compatibility
        if (this.meshRenderer && this.meshRenderer.material) {
          this.meshRenderer.material.metalness = preset.metalness;
          this.meshRenderer.material.roughness = preset.roughness;
          this.meshRenderer.material.needsUpdate = true;
        }
      },
      onColorModeChange: (mode) => {
        // Map new ColorMode to legacy ColorMode
        const legacyColorMode = mode as number;
        this.mlsMpmSim.setColorMode(legacyColorMode);
      },
      onColorGradientChange: (gradientName) => {
        console.log('🌈 Color gradient changed:', gradientName);
        // Gradient system will be fully integrated in Phase 2
        // For now, just acknowledge the change
      },
      onSizeChange: (size) => {
        this.rendererManager.update(this.mlsMpmSim.numParticles, size);
      },
      onMaterialPropertyChange: (property, value) => {
        console.log(`🎨 ${property}: ${value.toFixed(2)}`);
        
        // Apply to active renderer if it supports material properties
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
        
        // Also update legacy mesh renderer
        if (this.meshRenderer && this.meshRenderer.material) {
          const material = this.meshRenderer.material as any;
          if (property in material) {
            material[property] = value;
            material.needsUpdate = true;
          }
        }
      },
    });
    
    // Connect renderer manager to visuals panel
    this.visualsPanel.setRendererManager(this.rendererManager);
    
    // Initialize audio control panel
    this.audioPanel = new AudioPanel(this.dashboard, this.config, {
      onAudioConfigChange: (audioConfig) => {
        this.soundReactivity.updateConfig(audioConfig);
      },
      onAudioReactiveConfigChange: (audioReactiveConfig) => {
        this.audioReactiveBehavior.updateConfig(audioReactiveConfig);
        if (audioReactiveConfig.mode !== undefined) {
          this.audioVisualizationManager.setMode(audioReactiveConfig.mode);
          // Sync visualization mode to physics simulator for GPU forces
          this.mlsMpmSim.setAudioVisualizationMode(audioReactiveConfig.mode);
          console.log(`🎵 Visualization mode changed to: ${audioReactiveConfig.mode}`);
        }
      },
      onSourceChange: async (source) => {
        // Reinitialize audio with new source
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

    await progress(0.9);

    // Setup mouse interaction
    this.raycaster = this.scenery.createRaycaster();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.2);
    this.renderer.domElement.addEventListener("pointermove", (event) => {
      this.onMouseMove(event);
    });

    // Setup window resize handler for adaptive viewport boundaries
    this.setupResizeHandler();

    await progress(1.0, 100);
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
      const baseSize = 64;
      
      const newGridSize = new THREE.Vector3(
        baseSize * Math.max(1, aspect),      // Wider for landscape
        baseSize * Math.max(1, 1 / aspect),  // Taller for portrait
        baseSize
      );
      
      // Update boundaries gridSize
      this.boundaries.setGridSize(newGridSize);
      
      // Update simulator uniforms
      this.mlsMpmSim.updateBoundaryUniforms();
      
      console.log('📐 Viewport adapted:', newGridSize.toArray().map(v => v.toFixed(1)));
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
    // Begin FPS tracking (now in PhysicPanel)
    if (this.physicPanel?.fpsGraph) {
      this.physicPanel.fpsGraph.begin();
    }

    // Update scenery (camera controls, lights, etc.)
    this.scenery.update(delta, elapsed);

    // Update audio reactivity
    const audioData = this.soundReactivity.getAudioData();
    
    // Update boundaries with audio data (for audio-reactive animations)
    if (this.config.audio.enabled && this.config.audioReactive.enabled) {
      this.boundaries.update(elapsed, {
        bass: audioData.smoothBass,
        mid: audioData.smoothMid,
        treble: audioData.smoothTreble,
        beatIntensity: audioData.beatIntensity,
      });
    } else {
      this.boundaries.update(elapsed);
    }
    
    // Update audio panel metrics
    if (this.config.audio.enabled) {
      this.audioPanel.updateMetrics(audioData);
    }
    
    // Update audio-reactive behavior system
    if (this.config.audioReactive.enabled) {
      // Debug: Log audio values periodically (~1/sec at 60fps)
      if (Math.random() < 0.016) {
        console.log('🎵 Audio:', {
          bass: audioData.smoothBass.toFixed(2),
          mid: audioData.smoothMid.toFixed(2),
          treble: audioData.smoothTreble.toFixed(2),
          beat: audioData.isBeat ? '🔴' : '⚫',
          beatIntensity: audioData.beatIntensity.toFixed(2)
        });
      }
      
      // Upload audio data to GPU
      this.audioReactiveBehavior.updateAudioData(audioData);
      
      // Update beat-triggered effects (vortexes, etc.)
      this.audioReactiveBehavior.updateBeatEffects(
        audioData,
        delta,
        new THREE.Vector3(64, 64, 64)
      );
      
      // Update visualization mode
      this.audioVisualizationManager.update(audioData, delta);
      
      // Apply material modulation if enabled
      if (this.config.audioReactive.materialModulation) {
        const { viscosity, stiffness } = this.audioReactiveBehavior.getMaterialModulation(audioData);
        // Note: Material modulation will be applied in physics update below
        this.config.simulation.dynamicViscosity = viscosity;
        this.config.simulation.stiffness = stiffness;
      }
    }

    // ═══════════════════════════════════════════════════════════
    // UNIFIED RENDERER UPDATE - Primary System
    // ═══════════════════════════════════════════════════════════
    
    if (this.useLegacyRenderers) {
      // LEGACY PATH (deprecated, for compatibility only)
      this.meshRenderer.object.visible = !this.config.rendering.points;
      this.pointRenderer.object.visible = this.config.rendering.points;
      this.meshRenderer.update(this.config.particles.count, this.config.particles.actualSize);
      this.pointRenderer.update(this.config.particles.count);
      
      if (this.config.bloom.enabled) {
        this.meshRenderer.setBloomIntensity(1);
      } else {
        this.meshRenderer.setBloomIntensity(0);
      }
    } else {
      // NEW UNIFIED SYSTEM (default, always active)
      this.rendererManager.update(
        this.config.particles.count,
        this.visualsPanel?.settings.particleSize || this.config.particles.actualSize
      );
      
      // Update renderer with audio reactivity if enabled
      if (this.config.audio.enabled && this.config.audioReactive.enabled) {
        const renderer = this.rendererManager.getRenderer() as MeshRenderer;
        if (renderer && typeof (renderer as any).updateAudioReactivity === 'function') {
          (renderer as any).updateAudioReactivity({
            bass: audioData.smoothBass,
            mid: audioData.smoothMid,
            treble: audioData.smoothTreble,
            beatIntensity: audioData.beatIntensity,
          });
        }
      }
    }

    // Update physics simulation
    if (this.config.simulation.run) {
      // Update force fields
      this.mlsMpmSim.updateForceFields(this.physicPanel.forceFieldManager);
      
      // Update color mode
      this.mlsMpmSim.setColorMode(this.physicPanel.colorMode);
      
      // Update emitters
      const emittedParticles = this.physicPanel.emitterManager.update(delta);
      // TODO: Inject emitted particles into simulation
      
      const gravity = new THREE.Vector3();
      const gravityType = this.config.simulation.gravityType;

      if (gravityType === 0) {
        gravity.set(0, 0, 0.2);
      } else if (gravityType === 1) {
        gravity.set(0, -0.2, 0);
      } else if (gravityType === 3) {
        gravity.copy(this.config.gravitySensorReading).add(this.config.accelerometerReading);
      }

      // Apply audio influence to physics (if enabled)
      let audioInfluencedSpeed = this.config.simulation.speed;
      let audioInfluencedNoise = this.config.simulation.noise;
      
      if (this.config.audio.enabled && this.config.audio.particleInfluence > 0) {
        const influence = this.config.audio.particleInfluence;
        audioInfluencedSpeed *= (1.0 + audioData.smoothOverall * influence);
        audioInfluencedNoise *= (1.0 + audioData.smoothBass * influence * 0.5);
      }

      await this.mlsMpmSim.update(
        {
          numParticles: this.config.particles.count,
          dt: audioInfluencedSpeed,
          noise: audioInfluencedNoise,
          stiffness: this.config.simulation.stiffness,
          restDensity: this.config.simulation.restDensity,
          dynamicViscosity: this.config.simulation.dynamicViscosity,
          gravityType: this.config.simulation.gravityType,
          gravity,
          mouseRayOrigin: new THREE.Vector3(),
          mouseRayDirection: new THREE.Vector3(),
          mouseForce: new THREE.Vector3(),
          
          // FLIP/PIC Hybrid parameters
          transferMode: this.config.simulation.transferMode,
          flipRatio: this.config.simulation.flipRatio,
          
          // Vorticity confinement parameters
          vorticityEnabled: this.config.simulation.vorticityEnabled,
          vorticityEpsilon: this.config.simulation.vorticityEpsilon,
          
          // Surface tension parameters
          surfaceTensionEnabled: this.config.simulation.surfaceTensionEnabled,
          surfaceTensionCoeff: this.config.simulation.surfaceTensionCoeff,
          
          // Performance parameters
          sparseGrid: this.config.simulation.sparseGrid,
          adaptiveTimestep: this.config.simulation.adaptiveTimestep,
          cflTarget: this.config.simulation.cflTarget,
        },
        delta,
        elapsed,
        // Pass audio data if reactive is enabled
        this.config.audioReactive.enabled ? audioData : undefined
      );
      
      // Update performance metrics
      this.physicPanel.updateMetrics(
        this.config.particles.count,
        1 / delta,
        delta * 1000
      );
    }

    // Note: Audio influence on PostFX effects disabled until effects are re-implemented
    
    // Render with PostFX pipeline (simplified mode)
    await this.postFX.render();

    // End FPS tracking (now in PhysicPanel)
    if (this.physicPanel?.fpsGraph) {
      this.physicPanel.fpsGraph.end();
    }
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
    this.rendererManager.update(
      this.mlsMpmSim.numParticles,
      this.visualsPanel?.settings.particleSize || 1.0
    );
    
    console.log(`✅ Now rendering with: ${RendererManager.getModeName(mode)}`);
  }
  
  /**
   * Dispose of all resources
   */
  public dispose(): void {
    // Clean up resize handler
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    
    this.dashboard.dispose();
    this.scenery.dispose();
    this.postFX.dispose();  // RE-ENABLED
    this.boundaries.dispose();
    this.meshRenderer.dispose();
    this.pointRenderer.dispose();
    this.rendererManager.dispose();  // NEW
    // this.postFXPanel.dispose(); // PostFXPanel doesn't have dispose method
    this.physicPanel.dispose();
    this.visualsPanel.dispose();  // NEW
    this.audioPanel.dispose();
    this.soundReactivity.dispose();
    this.audioReactiveBehavior.dispose();
    this.audioVisualizationManager.dispose();
  }
}

