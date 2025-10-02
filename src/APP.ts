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
import { PhysicPanel, ColorMode } from './PARTICLESYSTEM/PANELphysic';
import { SoundReactivity } from './AUDIO/soundreactivity';
import { VolumetricVisualizer } from './AUDIO/volumetric';
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
  private meshRenderer!: MeshRenderer;
  private pointRenderer!: PointRenderer;

  // UI Panels
  private postFXPanel!: PostFXPanel;  // RE-ENABLED
  private physicPanel!: PhysicPanel;
  private audioPanel!: AudioPanel;

  // Audio reactivity
  private soundReactivity!: SoundReactivity;
  private volumetricVisualizer!: VolumetricVisualizer;

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

    // Initialize PostFX (clean: bloom + radial blur + radial CA)
    this.postFX = new PostFX(
      this.renderer,
      this.scenery.scene,
      this.scenery.camera,
      {
        bloom: this.config.bloom,
        radialBlur: this.config.radialBlur,
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

    // Initialize particle renderers
    this.meshRenderer = new MeshRenderer(this.mlsMpmSim, {
      metalness: 0.900,
      roughness: 0.50,
    });
    this.scenery.add(this.meshRenderer.object);

    this.pointRenderer = new PointRenderer(this.mlsMpmSim);
    this.scenery.add(this.pointRenderer.object);

    // Set initial visibility
    this.meshRenderer.object.visible = !this.config.rendering.points;
    this.pointRenderer.object.visible = this.config.rendering.points;

    // Set initial bloom intensity
    if (this.config.bloom.enabled) {
      this.meshRenderer.setBloomIntensity(1);
    }

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
      onRadialBlurChange: (radialBlurConfig) => {
        this.postFX.updateRadialBlur(radialBlurConfig);
      },
      onRadialCAChange: (radialCAConfig) => {
        this.postFX.updateRadialCA(radialCAConfig);
      },
    });

    // Initialize audio reactivity system (don't start by default)
    this.soundReactivity = new SoundReactivity(this.config.audio);
    
    // Initialize volumetric visualizer
    this.volumetricVisualizer = new VolumetricVisualizer(this.config.volumetric);
    this.scenery.add(this.volumetricVisualizer.object);
    
    // Initialize audio control panel
    this.audioPanel = new AudioPanel(this.dashboard, this.config, {
      onAudioConfigChange: (audioConfig) => {
        this.soundReactivity.updateConfig(audioConfig);
      },
      onVolumetricConfigChange: (volumetricConfig) => {
        this.volumetricVisualizer.updateConfig(volumetricConfig);
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
    
    // Update audio panel metrics
    if (this.config.audio.enabled) {
      this.audioPanel.updateMetrics(
        audioData.smoothBass,
        audioData.smoothMid,
        audioData.smoothTreble,
        audioData.smoothOverall,
        audioData.beatIntensity,
        audioData.peakFrequency
      );
    }
    
    // Update volumetric visualizer with audio data
    this.volumetricVisualizer.update(audioData, elapsed);

    // Update renderer visibility based on config
    this.meshRenderer.object.visible = !this.config.rendering.points;
    this.pointRenderer.object.visible = this.config.rendering.points;

    // Update renderers
    this.meshRenderer.update(
      this.config.particles.count,
      this.config.particles.actualSize
    );
    this.pointRenderer.update(this.config.particles.count);

    // Update bloom intensity
    if (this.config.bloom.enabled) {
      this.meshRenderer.setBloomIntensity(1);
    } else {
      this.meshRenderer.setBloomIntensity(0);
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
        },
        delta,
        elapsed
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
    // this.postFXPanel.dispose(); // PostFXPanel doesn't have dispose method
    this.physicPanel.dispose();
    this.audioPanel.dispose();
    this.soundReactivity.dispose();
    this.volumetricVisualizer.dispose();
  }
}

