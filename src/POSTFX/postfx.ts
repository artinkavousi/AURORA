/**
 * POSTFX/postfx.ts - Enhanced Post-Processing Pipeline
 * 
 * Production-Quality Effects:
 * 1. Bloom (HDR-aware with threshold knee)
 * 2. Radial Focus/Blur (DOF-style)
 * 3. Radial Chromatic Aberration
 * 4. Vignette (radial darkening)
 * 5. Film Grain (temporal noise)
 * 6. Color Grading (exposure, contrast, saturation, temperature)
 * 7. Tone Mapping (ACES, Reinhard, etc.)
 */

import * as THREE from "three/webgpu";
import { 
  Fn, pass, uniform, uv, vec2, vec3, vec4, float, 
  mix, length, pow, smoothstep, step, 
  min as tslMin, max as tslMax, clamp,
  dot, fract, sin, cos, mul, add, sub,
  abs, floor, mod
} from "three/tsl";
import type { AudioData } from '../AUDIO/soundreactivity';
// @ts-ignore
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
// @ts-ignore  
import { rgbShift } from 'three/examples/jsm/tsl/display/RGBShiftNode.js';
// @ts-ignore
import { gaussianBlur } from 'three/examples/jsm/tsl/display/GaussianBlurNode.js';

export interface BloomConfig {
  enabled: boolean;
  threshold: number;
  strength: number;
  radius: number;
  blendMode: 'add' | 'screen' | 'softlight';
}

export interface RadialFocusConfig {
  enabled: boolean;
  blurStrength: number;
  focusCenter: { x: number; y: number };
  focusRadius: number;
  falloffPower: number;
}

export interface RadialCAConfig {
  enabled: boolean;
  strength: number;
  angle: number;
  edgeIntensity: number;
  falloffPower: number;
}

export interface VignetteConfig {
  enabled: boolean;
  intensity: number;
  smoothness: number;
  roundness: number;
}

export interface FilmGrainConfig {
  enabled: boolean;
  intensity: number;
  size: number;
  speed: number;
}

export interface ColorGradingConfig {
  enabled: boolean;
  exposure: number;
  contrast: number;
  saturation: number;
  brightness: number;
  temperature: number; // -1 to 1 (cool to warm)
  tint: number; // -1 to 1 (green to magenta)
  shadows: THREE.Vector3; // RGB lift for shadows
  midtones: THREE.Vector3; // RGB gamma for midtones
  highlights: THREE.Vector3; // RGB gain for highlights
}

export interface PostFXOptions {
  bloom?: Partial<BloomConfig>;
  radialFocus?: Partial<RadialFocusConfig>;
  radialCA?: Partial<RadialCAConfig>;
  vignette?: Partial<VignetteConfig>;
  filmGrain?: Partial<FilmGrainConfig>;
  colorGrading?: Partial<ColorGradingConfig>;
}

/**
 * PostFX - Refined post-processing with radial effects
 */
export class PostFX {
  private renderer: THREE.WebGPURenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private postProcessing!: THREE.PostProcessing;
  private scenePass: any;
  private bloomPass: any;
  private blurPass: any;
  private rgbShiftPass: any;

  // Uniforms for dynamic control
  public uniforms = {
    // Bloom
    bloomEnabled: uniform(1.0),
    bloomBlendMode: uniform(0.0), // 0=add, 1=screen, 2=softlight
    bloomMixStrength: uniform(1.0),

    // Radial Focus/Blur
    focusEnabled: uniform(0.0),
    focusCenter: uniform(new THREE.Vector2(0.5, 0.5)),
    focusRadius: uniform(0.3),
    focusFalloffPower: uniform(2.0),
    focusBlendStrength: uniform(1.0),

    // Radial Chromatic Aberration
    caEnabled: uniform(0.0),
    caEdgeIntensity: uniform(1.5),
    caFalloffPower: uniform(2.5),
    caBlendStrength: uniform(1.0),
    
    // Vignette
    vignetteEnabled: uniform(0.0),
    vignetteIntensity: uniform(0.5),
    vignetteSmoothness: uniform(0.5),
    vignetteRoundness: uniform(1.0),
    
    // Film Grain
    filmGrainEnabled: uniform(0.0),
    filmGrainIntensity: uniform(0.05),
    filmGrainSize: uniform(1.5),
    filmGrainTime: uniform(0.0), // Updated each frame for animation
    
    // Color Grading
    colorGradingEnabled: uniform(0.0),
    cgExposure: uniform(1.0),
    cgContrast: uniform(1.0),
    cgSaturation: uniform(1.0),
    cgBrightness: uniform(0.0),
    cgTemperature: uniform(0.0),
    cgTint: uniform(0.0),
    cgShadows: uniform(new THREE.Vector3(1, 1, 1)),
    cgMidtones: uniform(new THREE.Vector3(1, 1, 1)),
    cgHighlights: uniform(new THREE.Vector3(1, 1, 1)),
  };

  // Store config for rebuild
  private currentConfig: PostFXOptions;
  private baseMix = { bloom: 1, focus: 0, ca: 0 };
  private baseEnabled = { bloom: 1, focus: 0, ca: 0 };
  private audioResponse = { bloom: 1, focus: 0, ca: 0 };
  private dynamicEnabled = { bloom: 1, focus: 0, ca: 0 };

  constructor(
    renderer: THREE.WebGPURenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: PostFXOptions = {}
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.currentConfig = options;

    // Apply initial config
    this.applyConfig(options);

    // Build pipeline
    this.buildPipeline(options);

    this.initializeAudioDynamicsState();

    console.log('✅ PostFX: Refined pipeline with radial effects initialized');
  }

  private applyConfig(options: PostFXOptions): void {
    // Bloom
    if (options.bloom?.enabled !== undefined) {
      this.uniforms.bloomEnabled.value = options.bloom.enabled ? 1.0 : 0.0;
    }
    if (options.bloom?.blendMode !== undefined) {
      const modes = { 'add': 0, 'screen': 1, 'softlight': 2 };
      this.uniforms.bloomBlendMode.value = modes[options.bloom.blendMode] || 0;
    }

    // Radial Focus
    if (options.radialFocus?.enabled !== undefined) {
      this.uniforms.focusEnabled.value = options.radialFocus.enabled ? 1.0 : 0.0;
    }
    if (options.radialFocus?.focusCenter) {
      this.uniforms.focusCenter.value.set(
        options.radialFocus.focusCenter.x,
        options.radialFocus.focusCenter.y
      );
    }
    if (options.radialFocus?.focusRadius !== undefined) {
      this.uniforms.focusRadius.value = options.radialFocus.focusRadius;
    }
    if (options.radialFocus?.falloffPower !== undefined) {
      this.uniforms.focusFalloffPower.value = options.radialFocus.falloffPower;
    }

    // Radial CA
    if (options.radialCA?.enabled !== undefined) {
      this.uniforms.caEnabled.value = options.radialCA.enabled ? 1.0 : 0.0;
    }
    if (options.radialCA?.edgeIntensity !== undefined) {
      this.uniforms.caEdgeIntensity.value = options.radialCA.edgeIntensity;
    }
    if (options.radialCA?.falloffPower !== undefined) {
      this.uniforms.caFalloffPower.value = options.radialCA.falloffPower;
    }
    
    // Vignette
    if (options.vignette?.enabled !== undefined) {
      this.uniforms.vignetteEnabled.value = options.vignette.enabled ? 1.0 : 0.0;
    }
    if (options.vignette?.intensity !== undefined) {
      this.uniforms.vignetteIntensity.value = options.vignette.intensity;
    }
    if (options.vignette?.smoothness !== undefined) {
      this.uniforms.vignetteSmoothness.value = options.vignette.smoothness;
    }
    if (options.vignette?.roundness !== undefined) {
      this.uniforms.vignetteRoundness.value = options.vignette.roundness;
    }
    
    // Film Grain
    if (options.filmGrain?.enabled !== undefined) {
      this.uniforms.filmGrainEnabled.value = options.filmGrain.enabled ? 1.0 : 0.0;
    }
    if (options.filmGrain?.intensity !== undefined) {
      this.uniforms.filmGrainIntensity.value = options.filmGrain.intensity;
    }
    if (options.filmGrain?.size !== undefined) {
      this.uniforms.filmGrainSize.value = options.filmGrain.size;
    }
    
    // Color Grading
    if (options.colorGrading?.enabled !== undefined) {
      this.uniforms.colorGradingEnabled.value = options.colorGrading.enabled ? 1.0 : 0.0;
    }
    if (options.colorGrading?.exposure !== undefined) {
      this.uniforms.cgExposure.value = options.colorGrading.exposure;
    }
    if (options.colorGrading?.contrast !== undefined) {
      this.uniforms.cgContrast.value = options.colorGrading.contrast;
    }
    if (options.colorGrading?.saturation !== undefined) {
      this.uniforms.cgSaturation.value = options.colorGrading.saturation;
    }
    if (options.colorGrading?.brightness !== undefined) {
      this.uniforms.cgBrightness.value = options.colorGrading.brightness;
    }
    if (options.colorGrading?.temperature !== undefined) {
      this.uniforms.cgTemperature.value = options.colorGrading.temperature;
    }
    if (options.colorGrading?.tint !== undefined) {
      this.uniforms.cgTint.value = options.colorGrading.tint;
    }
    if (options.colorGrading?.shadows) {
      this.uniforms.cgShadows.value.copy(options.colorGrading.shadows);
    }
    if (options.colorGrading?.midtones) {
      this.uniforms.cgMidtones.value.copy(options.colorGrading.midtones);
    }
    if (options.colorGrading?.highlights) {
      this.uniforms.cgHighlights.value.copy(options.colorGrading.highlights);
    }
  }

  private initializeAudioDynamicsState(): void {
    this.baseEnabled = {
      bloom: this.uniforms.bloomEnabled.value,
      focus: this.uniforms.focusEnabled.value,
      ca: this.uniforms.caEnabled.value,
    };

    this.baseMix = {
      bloom: this.baseEnabled.bloom > 0 ? 1 : 0,
      focus: this.baseEnabled.focus > 0 ? 1 : 0,
      ca: this.baseEnabled.ca > 0 ? 1 : 0,
    };

    this.audioResponse = { ...this.baseMix };
    this.dynamicEnabled = { ...this.baseEnabled };

    this.uniforms.bloomMixStrength.value = this.audioResponse.bloom || 1;
    this.uniforms.focusBlendStrength.value = this.audioResponse.focus || 1;
    this.uniforms.caBlendStrength.value = this.audioResponse.ca || 1;
  }

  private updateBaseState(effect: 'bloom' | 'focus' | 'ca', enabled: boolean): void {
    const enabledValue = enabled ? 1 : 0;
    this.baseEnabled[effect] = enabledValue;
    this.baseMix[effect] = enabledValue ? 1 : 0;
    this.dynamicEnabled[effect] = enabledValue;
    this.audioResponse[effect] = enabledValue ? Math.max(this.audioResponse[effect], 1) : 0;

    if (effect === 'bloom') {
      this.uniforms.bloomMixStrength.value = this.audioResponse[effect] || 1;
    } else if (effect === 'focus') {
      this.uniforms.focusBlendStrength.value = this.audioResponse[effect] || 1;
    } else {
      this.uniforms.caBlendStrength.value = this.audioResponse[effect] || 1;
    }
  }

  private buildPipeline(options: PostFXOptions): void {
    // Scene pass
    this.scenePass = pass(this.scene, this.camera);
    
    // Bloom (built-in, HDR-aware)
    this.bloomPass = bloom(
      this.scenePass,
      options.bloom?.threshold ?? 0.8,
      options.bloom?.strength ?? 0.5,
      options.bloom?.radius ?? 0.8
    );

    // Gaussian blur for radial focus effect - blur the scene (always visible)
    this.blurPass = gaussianBlur(
      this.scenePass,
      options.radialFocus?.blurStrength ?? 0.3
    );

    // RGB shift for chromatic aberration - on scene
    this.rgbShiftPass = rgbShift(
      this.scenePass,
      options.radialCA?.strength ?? 0.005,
      options.radialCA?.angle ?? 0.0
    );

    // Final composition shader with enhanced effects
    const finalOutput = Fn(() => {
      const uvCoord = uv();
      
      // Get effect outputs
      const sceneColor = this.scenePass.toVec3().toVar();
      const bloomedColor = this.bloomPass.toVec3().toVar();
      const blurredScene = this.blurPass.toVec3().toVar();
      const rgbShiftedScene = this.rgbShiftPass.toVec3().toVar();
      
      // ========================================
      // 1. BLOOM (HDR-aware blending)
      // ========================================
      const bloomBlend = Fn(() => {
        const mode = this.uniforms.bloomBlendMode;
        const base = sceneColor;
        const glow = bloomedColor;
        
        // Additive (default)
        const addBlend = base.add(glow);
        
        // Screen blend (softer, prevents over-bright)
        const screenBlend = vec3(1.0).sub(
          vec3(1.0).sub(base).mul(vec3(1.0).sub(glow))
        );
        
        // Soft light (most natural with HDR)
        const softLight = mix(
          base.mul(glow.add(0.5)),
          screenBlend,
          step(0.5, glow)
        );
        
        // Mix based on mode
        let result = addBlend.toVar();
        result.assign(mix(result, screenBlend, step(0.9, mode).mul(step(mode, 1.1))));
        result.assign(mix(result, softLight, step(1.9, mode)));
        
        return result;
      })();
      
      // Start with bloom or scene based on enable
      const bloomWeight = tslMin(
        float(1.0),
        this.uniforms.bloomEnabled.mul(this.uniforms.bloomMixStrength)
      );
      let finalColor = mix(sceneColor, bloomBlend, bloomWeight).toVar();
      
      // ========================================
      // 2. RADIAL FOCUS/BLUR
      // ========================================
      const offset = uvCoord.sub(this.uniforms.focusCenter);
      const dist = length(offset);
      
      // Calculate blur amount: 0 at center (sharp), 1 at edges (blurred)
      // Clamp distance to 0-1 range
      const normalizedDist = dist.mul(2.0); // Scale for viewport
      const blurMask = smoothstep(
        this.uniforms.focusRadius,
        float(1.0),
        normalizedDist
      ).pow(this.uniforms.focusFalloffPower);
      
      // Mix sharp with blurred based on distance
      const focusMix = tslMin(
        float(1.0),
        blurMask.mul(this.uniforms.focusEnabled).mul(this.uniforms.focusBlendStrength)
      );
      finalColor.assign(
        mix(finalColor, blurredScene, focusMix)
      );
      
      // ========================================
      // 3. RADIAL CHROMATIC ABERRATION
      // ========================================
      // Increase CA strength based on distance from center
      const caDist = normalizedDist; // Reuse normalized distance
      const caAmount = caDist.pow(this.uniforms.caFalloffPower).mul(this.uniforms.caEdgeIntensity);
      
      // Mix RGB shifted color based on radial distance
      const caMix = tslMin(
        float(1.0),
        caAmount.mul(this.uniforms.caEnabled).mul(this.uniforms.caBlendStrength)
      );
      finalColor.assign(
        mix(finalColor, rgbShiftedScene, caMix)
      );
      
      // ========================================
      // 4. COLOR GRADING (Lift-Gamma-Gain + Temperature/Tint)
      // ========================================
      const colorGraded = Fn(() => {
        let color = finalColor.toVar();
        
        // Exposure
        color.assign(color.mul(this.uniforms.cgExposure));
        
        // Brightness (additive)
        color.assign(color.add(this.uniforms.cgBrightness));
        
        // Contrast (around mid-gray 0.5)
        color.assign(
          mix(
            vec3(0.5),
            color,
            this.uniforms.cgContrast
          )
        );
        
        // Saturation
        const luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
        color.assign(
          mix(vec3(luminance), color, this.uniforms.cgSaturation)
        );
        
        // Temperature (cool to warm)
        const tempShift = this.uniforms.cgTemperature;
        const warmth = vec3(
          float(1.0).add(tempShift.mul(0.15)),
          float(1.0).add(tempShift.mul(0.05)),
          float(1.0).sub(tempShift.mul(0.15))
        );
        color.assign(color.mul(warmth));
        
        // Tint (green to magenta)
        const tintShift = this.uniforms.cgTint;
        const tintColor = vec3(
          float(1.0).add(tintShift.mul(0.1)),
          float(1.0).sub(abs(tintShift).mul(0.05)),
          float(1.0).add(tintShift.mul(0.1))
        );
        color.assign(color.mul(tintColor));
        
        // Lift-Gamma-Gain (shadows, midtones, highlights)
        // Lift (shadows)
        color.assign(color.add(this.uniforms.cgShadows.sub(1.0).mul(0.2)));
        
        // Gamma (midtones) - power curve
        const gammaPower = float(1.0).div(this.uniforms.cgMidtones);
        color.assign(pow(clamp(color, 0.0, 1.0), gammaPower));
        
        // Gain (highlights)
        color.assign(color.mul(this.uniforms.cgHighlights));
        
        return color;
      })();
      
      finalColor.assign(
        mix(finalColor, colorGraded, this.uniforms.colorGradingEnabled)
      );
      
      // ========================================
      // 5. VIGNETTE (radial darkening)
      // ========================================
      const vignette = Fn(() => {
        // Distance from center with roundness control
        const vignetteUV = uvCoord.sub(0.5).mul(2.0);
        const vignetteDist = pow(
          pow(abs(vignetteUV.x), this.uniforms.vignetteRoundness)
          .add(pow(abs(vignetteUV.y), this.uniforms.vignetteRoundness)),
          float(1.0).div(this.uniforms.vignetteRoundness)
        );
        
        // Smooth falloff
        const vignetteMask = smoothstep(
          float(1.0).sub(this.uniforms.vignetteIntensity),
          float(1.0).sub(this.uniforms.vignetteIntensity).add(this.uniforms.vignetteSmoothness),
          vignetteDist
        ).oneMinus();
        
        return vignetteMask;
      })();
      
      finalColor.assign(
        mix(
          finalColor,
          finalColor.mul(vignette),
          this.uniforms.vignetteEnabled
        )
      );
      
      // ========================================
      // 6. FILM GRAIN (temporal noise)
      // ========================================
      const filmGrain = Fn(() => {
        // High-frequency temporal noise
        const grainCoord = uvCoord.mul(this.uniforms.filmGrainSize).mul(800.0);
        const grainTime = this.uniforms.filmGrainTime;
        
        // Hash-based noise (pseudo-random)
        const grainHash = fract(
          sin(
            dot(
              grainCoord.add(grainTime.mul(0.1)),
              vec2(12.9898, 78.233)
            )
          ).mul(43758.5453)
        );
        
        // Centered around 0.5 for symmetric noise
        const grainNoise = grainHash.sub(0.5).mul(this.uniforms.filmGrainIntensity);
        
        return grainNoise;
      })();
      
      finalColor.assign(
        mix(
          finalColor,
          finalColor.add(filmGrain),
          this.uniforms.filmGrainEnabled
        )
      );
      
      return vec4(finalColor, 1.0);
    });

    // Setup post-processing
    this.postProcessing = new THREE.PostProcessing(this.renderer);
    this.postProcessing.outputNode = finalOutput();
    
    // Let Three.js handle tone mapping and color space
    this.postProcessing.outputColorTransform = true;
  }

  async init(): Promise<void> {
    // Pipeline built in constructor
  }

  // ========================================
  // PUBLIC API - Real-time controls
  // ========================================

  updateBloom(config: Partial<BloomConfig>): void {
    if (config.enabled !== undefined) {
      this.uniforms.bloomEnabled.value = config.enabled ? 1.0 : 0.0;
      this.updateBaseState('bloom', config.enabled);
    }
    if (config.blendMode !== undefined) {
      const modes = { 'add': 0, 'screen': 1, 'softlight': 2 };
      this.uniforms.bloomBlendMode.value = modes[config.blendMode] || 0;
    }
    // Note: threshold, strength, radius require restart
  }

  updateRadialFocus(config: Partial<RadialFocusConfig>): void {
    if (config.enabled !== undefined) {
      this.uniforms.focusEnabled.value = config.enabled ? 1.0 : 0.0;
      this.updateBaseState('focus', config.enabled);
    }
    if (config.focusCenter) {
      this.uniforms.focusCenter.value.set(config.focusCenter.x, config.focusCenter.y);
    }
    if (config.focusRadius !== undefined) {
      this.uniforms.focusRadius.value = config.focusRadius;
    }
    if (config.falloffPower !== undefined) {
      this.uniforms.focusFalloffPower.value = config.falloffPower;
    }
    // Note: blurStrength requires restart
  }

  updateRadialCA(config: Partial<RadialCAConfig>): void {
    if (config.enabled !== undefined) {
      this.uniforms.caEnabled.value = config.enabled ? 1.0 : 0.0;
      this.updateBaseState('ca', config.enabled);
    }
    if (config.edgeIntensity !== undefined) {
      this.uniforms.caEdgeIntensity.value = config.edgeIntensity;
    }
    if (config.falloffPower !== undefined) {
      this.uniforms.caFalloffPower.value = config.falloffPower;
    }
    // Note: strength and angle require restart
  }
  
  updateVignette(config: Partial<VignetteConfig>): void {
    if (config.enabled !== undefined) {
      this.uniforms.vignetteEnabled.value = config.enabled ? 1.0 : 0.0;
    }
    if (config.intensity !== undefined) {
      this.uniforms.vignetteIntensity.value = config.intensity;
    }
    if (config.smoothness !== undefined) {
      this.uniforms.vignetteSmoothness.value = config.smoothness;
    }
    if (config.roundness !== undefined) {
      this.uniforms.vignetteRoundness.value = config.roundness;
    }
  }
  
  updateFilmGrain(config: Partial<FilmGrainConfig>): void {
    if (config.enabled !== undefined) {
      this.uniforms.filmGrainEnabled.value = config.enabled ? 1.0 : 0.0;
    }
    if (config.intensity !== undefined) {
      this.uniforms.filmGrainIntensity.value = config.intensity;
    }
    if (config.size !== undefined) {
      this.uniforms.filmGrainSize.value = config.size;
    }
  }
  
  updateColorGrading(config: Partial<ColorGradingConfig>): void {
    if (config.enabled !== undefined) {
      this.uniforms.colorGradingEnabled.value = config.enabled ? 1.0 : 0.0;
    }
    if (config.exposure !== undefined) {
      this.uniforms.cgExposure.value = config.exposure;
    }
    if (config.contrast !== undefined) {
      this.uniforms.cgContrast.value = config.contrast;
    }
    if (config.saturation !== undefined) {
      this.uniforms.cgSaturation.value = config.saturation;
    }
    if (config.brightness !== undefined) {
      this.uniforms.cgBrightness.value = config.brightness;
    }
    if (config.temperature !== undefined) {
      this.uniforms.cgTemperature.value = config.temperature;
    }
    if (config.tint !== undefined) {
      this.uniforms.cgTint.value = config.tint;
    }
    if (config.shadows) {
      this.uniforms.cgShadows.value.copy(config.shadows);
    }
    if (config.midtones) {
      this.uniforms.cgMidtones.value.copy(config.midtones);
    }
    if (config.highlights) {
      this.uniforms.cgHighlights.value.copy(config.highlights);
    }
  }

  private smoothTowards(current: number, target: number, deltaTime: number, attackRate = 10, releaseRate = 4): number {
    const rate = target > current ? attackRate : releaseRate;
    const factor = 1 - Math.exp(-Math.max(deltaTime, 0) * rate);
    return THREE.MathUtils.lerp(current, target, factor);
  }

  applyAudioDynamics(audioData: AudioData | null, influence: number, deltaTime: number): void {
    const normalizedInfluence = THREE.MathUtils.clamp(influence ?? 0, 0, 1);

    let bloomMixTarget = this.baseEnabled.bloom > 0 ? Math.max(this.baseMix.bloom, 1) : 0;
    let focusMixTarget = this.baseEnabled.focus > 0 ? Math.max(this.baseMix.focus, 1) : 0;
    let caMixTarget = this.baseEnabled.ca > 0 ? Math.max(this.baseMix.ca, 1) : 0;

    let bloomEnableTarget = this.baseEnabled.bloom;
    let focusEnableTarget = this.baseEnabled.focus;
    let caEnableTarget = this.baseEnabled.ca;

    if (audioData && normalizedInfluence > 0) {
      const modulators = audioData.modulators ?? ({} as AudioData['modulators']);
      const aura = modulators.aura ?? audioData.smoothOverall;
      const flow = modulators.flow ?? audioData.smoothMid;
      const shimmer = modulators.shimmer ?? audioData.smoothTreble;
      const pulse = modulators.pulse ?? audioData.beatIntensity;
      const warp = modulators.warp ?? 0;

      bloomMixTarget = Math.max(bloomMixTarget, 0.6) + aura * 0.9 * normalizedInfluence;
      focusMixTarget = Math.max(focusMixTarget, 0.4) + (flow * 0.7 + pulse * 0.3) * normalizedInfluence;
      caMixTarget = Math.max(caMixTarget, 0.35) + (shimmer * 0.85 + warp * 0.2) * normalizedInfluence;

      if (this.baseEnabled.bloom < 0.5) {
        bloomEnableTarget = Math.min(1, aura * 1.25 * normalizedInfluence);
      }
      if (this.baseEnabled.focus < 0.5) {
        focusEnableTarget = Math.min(1, flow * 1.15 * normalizedInfluence);
      }
      if (this.baseEnabled.ca < 0.5) {
        caEnableTarget = Math.min(1, shimmer * 1.25 * normalizedInfluence);
      }
    }

    this.audioResponse.bloom = THREE.MathUtils.clamp(
      this.smoothTowards(this.audioResponse.bloom, bloomMixTarget, deltaTime, 12, 4),
      0,
      3
    );
    this.audioResponse.focus = THREE.MathUtils.clamp(
      this.smoothTowards(this.audioResponse.focus, focusMixTarget, deltaTime, 9, 3),
      0,
      2.5
    );
    this.audioResponse.ca = THREE.MathUtils.clamp(
      this.smoothTowards(this.audioResponse.ca, caMixTarget, deltaTime, 11, 4),
      0,
      2.5
    );

    this.dynamicEnabled.bloom = THREE.MathUtils.clamp(
      this.smoothTowards(this.dynamicEnabled.bloom, bloomEnableTarget, deltaTime, 10, 3),
      0,
      1
    );
    this.dynamicEnabled.focus = THREE.MathUtils.clamp(
      this.smoothTowards(this.dynamicEnabled.focus, focusEnableTarget, deltaTime, 8, 3),
      0,
      1
    );
    this.dynamicEnabled.ca = THREE.MathUtils.clamp(
      this.smoothTowards(this.dynamicEnabled.ca, caEnableTarget, deltaTime, 9, 3),
      0,
      1
    );

    this.uniforms.bloomMixStrength.value = this.audioResponse.bloom;
    this.uniforms.focusBlendStrength.value = this.audioResponse.focus;
    this.uniforms.caBlendStrength.value = this.audioResponse.ca;
    this.uniforms.bloomEnabled.value = this.dynamicEnabled.bloom;
    this.uniforms.focusEnabled.value = this.dynamicEnabled.focus;
    this.uniforms.caEnabled.value = this.dynamicEnabled.ca;
  }

  async render(): Promise<void> {
      // Update film grain time for temporal animation
      this.uniforms.filmGrainTime.value = performance.now() * 0.001;
      await this.postProcessing.renderAsync();
  }

  dispose(): void {
    this.postProcessing.dispose();
  }
}
