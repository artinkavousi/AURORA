/**
 * AUDIO/audiovisual.ts - Audio visualization modes
 * Single responsibility: Creative audio-reactive particle visualizations (TSL/WebGPU)
 */

import * as THREE from "three/webgpu";
import {
  Fn,
  If,
  Loop,
  uniform,
  vec3,
  vec4,
  float,
  int,
  sin,
  cos,
  length,
  normalize,
  dot,
  cross,
  mix,
  smoothstep,
  pow,
  clamp,
  fract,
  mod,
  time,
  min as tslMin,
  max as tslMax,
} from "three/tsl";
import { triNoise3Dvec } from "../PARTICLESYSTEM/physic/noise";
import type { AudioData } from './soundreactivity';
import { AudioVisualizationMode } from './audioreactive';

/**
 * Base class for audio visualization modes
 */
abstract class AudioVisualizer {
  protected renderer: THREE.WebGPURenderer;
  protected gridSize: THREE.Vector3;
  
  constructor(renderer: THREE.WebGPURenderer, gridSize: THREE.Vector3) {
    this.renderer = renderer;
    this.gridSize = gridSize;
  }
  
  /**
   * Generate TSL force function for this visualization mode
   * Returns force to apply to particle based on audio data
   */
  abstract generateForceTSL(audioUniforms: any): any;
  
  /**
   * Update per-frame (for spawning effects, managing state, etc.)
   */
  update(audioData: AudioData, deltaTime: number): void {
    // Override in subclasses if needed
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    // Override in subclasses if needed
  }
}

/**
 * 1. WAVE FIELD MODE
 * Creates traveling wave patterns through the particle field
 */
export class WaveFieldVisualizer extends AudioVisualizer {
  private waveSpeed = uniform(5.0);
  private waveScale = uniform(2.0);
  
  generateForceTSL(audioUniforms: any) {
    return Fn(([particlePos, particleVel, gridSize]) => {
      const force = vec3(0).toVar('waveForce');

      // Normalized position
      const normPos = particlePos.div(gridSize).toConst('waveNormPos');
      const tempoWarp = audioUniforms.tempo.mul(0.015).add(0.35).toConst('waveTempoWarp');
      const rhythmGain = audioUniforms.rhythmConfidence.mul(1.5).add(0.5).toConst('waveRhythmGain');
      const shimmer = audioUniforms.modShimmer.add(0.1).toConst('waveShimmer');
      const warp = audioUniforms.modWarp.sub(0.5).mul(2.0).toConst('waveWarp');
      const flow = audioUniforms.modFlow.add(0.2).toConst('waveFlow');

      const temporalPhase = time.mul(this.waveSpeed).mul(tempoWarp.mul(rhythmGain))
        .add(audioUniforms.tempoPhase.mul(float(Math.PI * 2)))
        .toConst('waveTemporalPhase');

      // Bass wave (large wavelength, slow)
      const bassWavelength = float(8.0);
      const bassPhase = temporalPhase.mul(0.3)
        .add(dot(normPos, vec3(1, 0, 0)).mul(bassWavelength))
        .add(audioUniforms.stereoBalance.mul(2.0))
        .toConst('waveBassPhase');
      const bassWave = sin(bassPhase).mul(audioUniforms.smoothBass).mul(this.waveScale).toConst('waveBassWave');
      force.y.addAssign(bassWave);

      // Mid wave (medium wavelength, moderate speed)
      const midWavelength = float(4.0);
      const midPhase = temporalPhase.mul(0.6)
        .add(dot(normPos, vec3(0.7, 0, 0.7).normalize()).mul(midWavelength))
        .toConst('waveMidPhase');
      const midWave = sin(midPhase).mul(audioUniforms.smoothMid)
        .mul(this.waveScale.mul(0.7)).mul(flow)
        .toConst('waveMidWave');
      force.xz.addAssign(vec3(cos(midPhase), 0, sin(midPhase)).xz.mul(midWave));

      // Treble wave (small wavelength, fast)
      const trebleWavelength = float(2.0);
      const treblePhase = temporalPhase.mul(1.2)
        .add(length(normPos.xz).mul(trebleWavelength))
        .toConst('waveTreblePhase');
      const trebleWave = sin(treblePhase).mul(audioUniforms.smoothTreble)
        .mul(this.waveScale.mul(0.4)).mul(shimmer)
        .toConst('waveTrebleWave');
      force.addAssign(vec3(cos(treblePhase), sin(treblePhase.mul(2)), sin(treblePhase)).mul(trebleWave));

      const warpMotion = vec3(
        normPos.z.sub(0.5),
        sin(temporalPhase.mul(0.5)).mul(0.2),
        normPos.x.sub(0.5)
      ).mul(warp).mul(flow);
      force.addAssign(warpMotion);

      // Beat pulse (radial wave)
      const beatWavePulse = audioUniforms.beatIntensity.mul(
        sin(time.mul(10).sub(length(normPos.sub(vec3(0.5))).mul(20)))
      ).mul(audioUniforms.beatImpulse.mul(0.05)).mul(audioUniforms.modPulse.add(0.2)).toConst('waveBeatPulse');
      const beatDir = normalize(normPos.sub(vec3(0.5))).toConst('waveBeatDir');
      force.addAssign(beatDir.mul(beatWavePulse));

      return force;
    }).setLayout({
      name: 'waveFieldForce',
      type: 'vec3',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'particleVel', type: 'vec3' },
        { name: 'gridSize', type: 'vec3' },
      ],
    });
  }
}

/**
 * 2. FREQUENCY TOWERS MODE
 * Vertical columns forming a 3D audio equalizer
 */
export class FrequencyTowerVisualizer extends AudioVisualizer {
  private numBands = 16;
  private towerStrength = uniform(15.0);
  
  generateForceTSL(audioUniforms: any) {
    return Fn(([particlePos, particleVel, gridSize]) => {
      const force = vec3(0).toVar('towerForce');
      
      // Divide space into frequency bands along X axis
      const normX = particlePos.x.div(gridSize.x).toConst('towerNormX');
      const bandIndex = int(normX.mul(float(this.numBands))).toConst('towerBandIndex');
      const bandCenter = float(bandIndex).add(0.5).div(float(this.numBands)).toConst('towerBandCenter');

      // Distance from band center (for horizontal attraction)
      const distFromBandCenter = normX.sub(bandCenter).abs().mul(float(this.numBands)).toConst('towerDistFromCenter');

      // Frequency for this band (exponential distribution)
      const bandFreqNorm = float(bandIndex).div(float(this.numBands)).toConst('towerBandFreqNorm');
      const grooveBoost = audioUniforms.groove.add(0.2).toConst('towerGrooveBoost');
      const density = audioUniforms.modDensity.add(0.3).toConst('towerDensity');
      const shimmer = audioUniforms.modShimmer.add(0.1).toConst('towerShimmer');
      
      // Audio amplitude for this frequency range
      // Low bands = bass, mid bands = mid, high bands = treble
      const bassContrib = smoothstep(0.5, 0.0, bandFreqNorm).mul(audioUniforms.smoothBass).toConst('towerBassContrib');
      const midContrib = smoothstep(0.2, 0.5, bandFreqNorm).mul(smoothstep(0.8, 0.5, bandFreqNorm)).mul(audioUniforms.smoothMid).toConst('towerMidContrib');
      const trebleContrib = smoothstep(0.5, 1.0, bandFreqNorm).mul(audioUniforms.smoothTreble).toConst('towerTrebleContrib');
      const amplitude = bassContrib.add(midContrib).add(trebleContrib).toConst('towerAmplitude');
      
      // Vertical force (tower height)
      const targetHeight = amplitude.mul(gridSize.y).mul(0.8).toConst('towerTargetHeight');
      const verticalForce = targetHeight.sub(particlePos.y).mul(0.1).mul(grooveBoost).toConst('towerVerticalForce');
      force.y.assign(verticalForce);
      
      // Horizontal attraction to band center
      const horizontalDir = bandCenter.mul(gridSize.x).sub(particlePos.x).toConst('towerHorizontalDir');
      force.x.assign(horizontalDir.mul(0.2).mul(smoothstep(1.0, 0.0, distFromBandCenter)));
      force.z.addAssign(horizontalDir.mul(audioUniforms.stereoBalance).mul(0.05));
      
      // Beat pulse (all towers pulse together)
      const beatPulse = audioUniforms.beatIntensity
        .mul(sin(time.mul(15).add(bandFreqNorm.mul(6)).add(audioUniforms.tempoPhase.mul(8))))
        .mul(this.towerStrength.mul(0.3))
        .mul(grooveBoost)
        .toConst('towerBeatPulse');
      force.y.addAssign(beatPulse);

      const shimmerDrift = sin(time.mul(25).add(bandFreqNorm.mul(12)))
        .mul(shimmer)
        .mul(audioUniforms.spectralFlux.add(0.1))
        .toConst('towerShimmerDrift');
      force.z.addAssign(shimmerDrift.mul(0.15));

      return force.mul(this.towerStrength.mul(0.1).mul(density));
    }).setLayout({
      name: 'frequencyTowerForce',
      type: 'vec3',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'particleVel', type: 'vec3' },
        { name: 'gridSize', type: 'vec3' },
      ],
    });
  }
}

/**
 * 3. VORTEX DANCE MODE
 * Multiple beat-triggered vortexes (implemented via force field manager)
 * This mode primarily uses the AudioReactiveBehavior's vortex spawning
 */
export class VortexDanceVisualizer extends AudioVisualizer {
  private danceIntensity = uniform(10.0);
  
  generateForceTSL(audioUniforms: any) {
    return Fn(([particlePos, particleVel, gridSize]) => {
      const force = vec3(0).toVar('vortexDanceForce');
      
      const balance = audioUniforms.stereoBalance.toConst('stereoBalance');
      const flow = audioUniforms.modFlow.add(0.2).toConst('flowMod');
      const pulse = audioUniforms.modPulse.add(0.2).toConst('pulseMod');
      const shimmer = audioUniforms.modShimmer.add(0.1).toConst('shimmerMod');
      const width = audioUniforms.stereoWidth.add(0.1).toConst('widthMod');

      // Additional swaying motion based on audio
      const sway = vec3(
        sin(time.mul(2).add(particlePos.z.mul(0.1))).mul(flow),
        cos(time.mul(1.5).add(particlePos.x.mul(0.1))).mul(flow),
        sin(time.mul(1.8).add(particlePos.y.mul(0.1))).add(balance.mul(0.5))
      ).mul(audioUniforms.smoothOverall).mul(this.danceIntensity.mul(0.25)).toConst('sway');
      force.addAssign(sway);

      const spin = vec3(
        particleVel.z.mul(-1),
        particleVel.y.mul(0.5).add(balance.mul(0.3)),
        particleVel.x
      ).mul(audioUniforms.beatIntensity).mul(this.danceIntensity.mul(0.35)).mul(pulse).toConst('spin');
      force.addAssign(spin);

      const lift = vec3(0, audioUniforms.smoothMid.mul(2.0).mul(flow), 0).toConst('lift');
      force.addAssign(lift);

      const bounce = audioUniforms.beatIntensity.mul(sin(time.mul(12))).mul(this.danceIntensity.mul(0.5)).mul(pulse).toConst('bounce');
      force.y.addAssign(bounce);

      const spiral = vec3(
        particlePos.z.sub(gridSize.z.mul(0.5)).mul(-1),
        0,
        particlePos.x.sub(gridSize.x.mul(0.5))
      ).mul(width).mul(shimmer).mul(0.08).toConst('spiral');
      force.addAssign(spiral);

      const aura = vec3(
        sin(time.mul(6).add(particlePos.y.mul(0.2))).mul(0.1),
        sin(time.mul(5).add(particlePos.x.mul(0.15))).mul(0.1),
        sin(time.mul(4).add(particlePos.z.mul(0.12))).mul(0.1)
      ).mul(audioUniforms.modAura.add(0.1)).toConst('aura');
      force.addAssign(aura);

      return force;
    }).setLayout({
      name: 'vortexDanceForce',
      type: 'vec3',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'particleVel', type: 'vec3' },
        { name: 'gridSize', type: 'vec3' },
      ],
    });
  }
}

/**
 * 4. MORPHOLOGICAL MODE
 * Particles form dynamic shapes based on spectral content
 */
export class MorphologicalVisualizer extends AudioVisualizer {
  private shapeStrength = uniform(8.0);
  
  generateForceTSL(audioUniforms: any) {
    return Fn(([particlePos, particleVel, gridSize]) => {
      const force = vec3(0).toVar('morphForce');
      const center = gridSize.mul(0.5).toConst('center');
      const toCenter = center.sub(particlePos).toConst('toCenter');
      const distFromCenter = length(toCenter).toConst('distFromCenter');
      const dirToCenter = normalize(toCenter).toConst('dirToCenter');
      
      // Target shape based on frequency content
      // Bass → Sphere
      const sphereRadius = gridSize.x.mul(0.25).mul(audioUniforms.bassInfluence).toConst('sphereRadius');
      const sphereForce = dirToCenter.mul(distFromCenter.sub(sphereRadius).mul(0.2)).mul(audioUniforms.smoothBass).toConst('sphereForce');
      
      // Mid → Torus
      const torusRadius = gridSize.x.mul(0.3).mul(audioUniforms.midInfluence).toConst('torusRadius');
      const torusHeight = particlePos.y.sub(center.y).toConst('torusHeight');
      const horizontalDist = length(particlePos.xz.sub(center.xz)).toConst('horizontalDist');
      const torusForce = vec3(
        dirToCenter.x,
        torusHeight.negate().mul(0.3),
        dirToCenter.z
      ).mul(horizontalDist.sub(torusRadius).mul(0.15)).mul(audioUniforms.smoothMid).toConst('torusForce');
      
      // Treble → Spiral
      const spiralAngle = time.mul(2).add(distFromCenter.mul(0.5)).toConst('spiralAngle');
      const spiralTarget = vec3(
        cos(spiralAngle).mul(distFromCenter),
        distFromCenter.mul(0.5),
        sin(spiralAngle).mul(distFromCenter)
      ).add(center).toConst('spiralTarget');
      const spiralForce = spiralTarget.sub(particlePos).mul(0.1).mul(audioUniforms.smoothTreble).toConst('spiralForce');
      
      // Combine shapes
      force.assign(sphereForce.add(torusForce).add(spiralForce).mul(this.shapeStrength.mul(0.2)));
      
      // Beat → shape pulse
      const beatPulse = dirToCenter.mul(audioUniforms.beatIntensity).mul(sin(time.mul(20))).mul(this.shapeStrength.mul(0.5)).toConst('beatPulse');
      force.addAssign(beatPulse);
      
      return force;
    }).setLayout({
      name: 'morphologicalForce',
      type: 'vec3',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'particleVel', type: 'vec3' },
        { name: 'gridSize', type: 'vec3' },
      ],
    });
  }
}

/**
 * 5. GALAXY SPIRAL MODE
 * Particles orbit in spiral patterns like a galaxy
 */
export class GalaxySpiralVisualizer extends AudioVisualizer {
  private orbitalStrength = uniform(12.0);
  private spiralTightness = uniform(0.3);
  
  generateForceTSL(audioUniforms: any) {
    return Fn(([particlePos, particleVel, gridSize]) => {
      const force = vec3(0).toVar('galaxyForce');
      const center = gridSize.mul(0.5).toConst('center');
      const toCenter = center.sub(particlePos).toConst('toCenter');
      const radiusXZ = length(particlePos.xz.sub(center.xz)).add(0.1).toConst('radiusXZ');
      const dirToCenter = normalize(toCenter).toConst('dirToCenter');
      
      // Orbital velocity (tangent to radius)
      const up = vec3(0, 1, 0).toConst('up');
      const radialDir = normalize(vec3(toCenter.x, 0, toCenter.z)).toConst('radialDir');
      const tangent = cross(up, radialDir).toConst('tangent');
      
      // Orbital speed modulated by audio (tempo/rhythm)
      const orbitalSpeed = audioUniforms.smoothOverall.mul(2).add(1.0).toConst('orbitalSpeed');
      const orbitalForce = tangent.mul(this.orbitalStrength).mul(orbitalSpeed).toConst('orbitalForce');
      force.addAssign(orbitalForce);
      
      // Spiral inward (density wave)
      const spiralAngle = time.mul(orbitalSpeed).add(radiusXZ.mul(this.spiralTightness)).toConst('spiralAngle');
      const spiralPhase = sin(spiralAngle).toConst('spiralPhase');
      const spiralInward = radialDir.negate().mul(spiralPhase).mul(audioUniforms.smoothBass).mul(this.orbitalStrength.mul(0.3)).toConst('spiralInward');
      force.addAssign(spiralInward);
      
      // Vertical modulation (disk thickness)
      const heightForce = center.y.sub(particlePos.y).mul(0.2).mul(audioUniforms.smoothMid).toConst('heightForce');
      force.y.addAssign(heightForce);
      
      // Beat pulse (spiral wave)
      const beatWave = audioUniforms.beatIntensity.mul(sin(spiralAngle.sub(time.mul(5)))).toConst('beatWave');
      force.addAssign(radialDir.mul(beatWave).mul(this.orbitalStrength.mul(0.5)));
      
      return force;
    }).setLayout({
      name: 'galaxySpiralForce',
      type: 'vec3',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'particleVel', type: 'vec3' },
        { name: 'gridSize', type: 'vec3' },
      ],
    });
  }
}

/**
 * 6. KINETIC FLOW MODE
 * Velocity field visualization shaped by audio
 */
export class KineticFlowVisualizer extends AudioVisualizer {
  private flowStrength = uniform(10.0);
  
  generateForceTSL(audioUniforms: any) {
    return Fn(([particlePos, particleVel, gridSize]) => {
      const force = vec3(0).toVar('flowForce');
      const normPos = particlePos.div(gridSize).toConst('normPos');
      
      // Bass: broad, slow flows (horizontal)
      const bassFlow = vec3(
        sin(normPos.z.mul(3).add(time.mul(0.5))),
        0,
        cos(normPos.x.mul(3).add(time.mul(0.5)))
      ).mul(audioUniforms.smoothBass).mul(this.flowStrength).toConst('bassFlow');
      force.addAssign(bassFlow);
      
      // Mid: swirling flows
      const center = vec3(0.5).toConst('center');
      const toCenter = normPos.sub(center).toConst('toCenter');
      const midSwirl = cross(vec3(0, 1, 0), toCenter).mul(audioUniforms.smoothMid).mul(this.flowStrength.mul(0.8)).toConst('midSwirl');
      force.addAssign(midSwirl);
      
      // Treble: chaotic turbulent flows
      const trebleTurbulence = triNoise3Dvec(
        particlePos.mul(0.05),
        time.mul(audioUniforms.smoothTreble.add(0.1)),
        0.15
      ).sub(0.5).mul(2).mul(audioUniforms.smoothTreble).mul(this.flowStrength.mul(0.5)).toConst('trebleTurbulence');
      force.addAssign(trebleTurbulence);
      
      // Beat: vorticity bursts
      const beatVorticity = cross(
        normalize(particlePos.sub(gridSize.mul(0.5))),
        vec3(0, 1, 0)
      ).mul(audioUniforms.beatIntensity).mul(sin(time.mul(10))).mul(this.flowStrength.mul(0.7)).toConst('beatVorticity');
      force.addAssign(beatVorticity);
      
      return force;
    }).setLayout({
      name: 'kineticFlowForce',
      type: 'vec3',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'particleVel', type: 'vec3' },
        { name: 'gridSize', type: 'vec3' },
      ],
    });
  }
}

/**
 * 7. FRACTAL BURST MODE
 * Beat-triggered particle emission in fractal patterns
 */
export class FractalBurstVisualizer extends AudioVisualizer {
  private burstStrength = uniform(20.0);
  private lastBeatTime = 0;
  
  generateForceTSL(audioUniforms: any) {
    return Fn(([particlePos, particleVel, gridSize]) => {
      const force = vec3(0).toVar('fractalForce');
      const center = gridSize.mul(0.5).toConst('center');
      const toCenter = center.sub(particlePos).toConst('toCenter');
      const distFromCenter = length(toCenter).toConst('distFromCenter');
      
      // Fractal branching pattern (simplified L-system)
      // Uses noise to create self-similar branching
      const branchAngle = triNoise3Dvec(
        particlePos.mul(0.1),
        time.mul(0.1),
        0.2
      ).toConst('branchNoise');
      
      // Beat pulse (explosive outward burst)
      const burstPhase = audioUniforms.beatIntensity.mul(
        float(1).sub(smoothstep(0.0, 0.5, time.mod(2.0)))
      ).toConst('burstPhase');
      
      const burstDir = normalize(branchAngle.sub(0.5).mul(2)).toConst('burstDir');
      const burstForce = burstDir.mul(burstPhase).mul(this.burstStrength).toConst('burstForce');
      force.addAssign(burstForce);
      
      // Return to center (gravity)
      const returnForce = toCenter.mul(0.05).mul(audioUniforms.smoothOverall).toConst('returnForce');
      force.addAssign(returnForce);
      
      // Secondary fractal branches (based on distance)
      const branchLevel = int(distFromCenter.div(gridSize.x.mul(0.1))).toConst('branchLevel');
      const branchScale = float(1).div(pow(float(2), float(branchLevel))).toConst('branchScale');
      const secondaryBranch = branchAngle.mul(branchScale).mul(audioUniforms.smoothTreble).mul(this.burstStrength.mul(0.3)).toConst('secondaryBranch');
      force.addAssign(secondaryBranch);
      
      return force;
    }).setLayout({
      name: 'fractalBurstForce',
      type: 'vec3',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'particleVel', type: 'vec3' },
        { name: 'gridSize', type: 'vec3' },
      ],
    });
  }
  
  update(audioData: AudioData, deltaTime: number): void {
    // Track beat timing for burst synchronization
    if (audioData.isBeat) {
      this.lastBeatTime = performance.now();
    }
  }
}

/**
 * 8. HARMONIC LATTICE MODE
 * Particles in oscillating harmonic grid arrangement
 */
export class HarmonicLatticeVisualizer extends AudioVisualizer {
  private latticeStrength = uniform(15.0);
  private latticeSpacing = uniform(4.0);

  generateForceTSL(audioUniforms: any) {
    return Fn(([particlePos, particleVel, gridSize]) => {
      const force = vec3(0).toVar('harmonicForce');
      
      // Calculate nearest lattice point
      const latticePos = particlePos.div(this.latticeSpacing).floor().mul(this.latticeSpacing).add(this.latticeSpacing.mul(0.5)).toConst('latticePos');
      const toLattice = latticePos.sub(particlePos).toConst('toLattice');
      const distToLattice = length(toLattice).toConst('distToLattice');
      
      // Harmonic oscillator: natural frequency based on lattice position
      const omega0 = length(latticePos.div(gridSize)).mul(5).add(1).toConst('omega0'); // Natural frequency
      
      // Driving force from audio (resonance when audio freq matches omega0)
      // Bass = low freq, Treble = high freq
      const audioFreq = audioUniforms.smoothBass.mul(0.2).add(audioUniforms.smoothTreble.mul(2.0)).add(1.0).toConst('audioFreq');
      const resonanceFactor = float(1).div(
        float(1).add(pow(audioFreq.sub(omega0).abs(), float(2)))
      ).toConst('resonanceFactor');
      
      // Oscillation amplitude = audio intensity * resonance
      const amplitude = audioUniforms.smoothOverall.mul(resonanceFactor).mul(this.latticeStrength.mul(0.5)).toConst('amplitude');
      
      // Oscillate around lattice point
      const oscillation = sin(time.mul(omega0)).mul(amplitude).toConst('oscillation');
      const oscillationDir = normalize(toLattice).toConst('oscillationDir');
      force.addAssign(oscillationDir.mul(oscillation));
      
      // Spring force back to lattice point
      const springForce = toLattice.mul(0.3).toConst('springForce');
      force.addAssign(springForce);
      
      // Beat pulse (synchronized lattice pulse)
      const beatPulse = audioUniforms.beatIntensity.mul(sin(time.mul(15).sub(omega0))).mul(this.latticeStrength.mul(0.4)).toConst('beatPulse');
      force.addAssign(oscillationDir.mul(beatPulse));
      
      // Damping (based on audio dampening config)
      const damping = particleVel.mul(-0.2).toConst('damping');
      force.addAssign(damping);
      
      return force;
    }).setLayout({
      name: 'harmonicLatticeForce',
      type: 'vec3',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'particleVel', type: 'vec3' },
        { name: 'gridSize', type: 'vec3' },
      ],
    });
  }
}

/**
 * 9. AURORA VEIL MODE
 * Ethereal curtains of light that sway with stereo shimmer
 */
export class AuroraVeilVisualizer extends AudioVisualizer {
  private curtainDrift = uniform(6.0);
  private liftStrength = uniform(12.0);

  generateForceTSL(audioUniforms: any) {
    return Fn(([particlePos, particleVel, gridSize]) => {
      const force = vec3(0).toVar('auroraForce');

      const normPos = particlePos.div(gridSize).toConst('normPos');
      const curtainPhase = normPos.x.mul(8.0)
        .add(time.mul(audioUniforms.tempo.mul(0.02).add(0.8)))
        .add(audioUniforms.stereoBalance.mul(2.0))
        .toConst('curtainPhase');

      const swayX = sin(curtainPhase).mul(audioUniforms.modWarp.add(0.6)).mul(this.curtainDrift).toConst('swayX');
      const swayZ = cos(curtainPhase).mul(audioUniforms.modFlow.add(0.5)).mul(this.curtainDrift.mul(0.6)).toConst('swayZ');
      force.x.addAssign(swayX);
      force.z.addAssign(swayZ);

      const heightMask = smoothstep(0.15, 0.85, normPos.y).toConst('heightMask');
      const lift = heightMask
        .mul(audioUniforms.smoothMid.mul(0.6).add(audioUniforms.smoothTreble.mul(0.9)))
        .mul(this.liftStrength)
        .toConst('lift');
      force.y.addAssign(lift);

      const shimmerNoise = triNoise3Dvec(
        vec3(normPos.x.mul(5.0), normPos.y.mul(10.0), time.mul(0.8)),
        time.mul(audioUniforms.modShimmer.add(0.4)),
        0.32
      ).sub(0.5).mul(2).toConst('shimmerNoise');
      const shimmer = shimmerNoise
        .mul(audioUniforms.modShimmer.add(audioUniforms.smoothTreble))
        .mul(6.0)
        .toConst('shimmer');
      force.addAssign(vec3(shimmer.mul(0.25), shimmer, shimmer.mul(0.2)));

      const beatPulse = audioUniforms.beatIntensity
        .mul(audioUniforms.modPulse.add(0.4))
        .mul(18.0)
        .toConst('beatPulse');
      const curtainCenter = vec3(0.5, smoothstep(0.2, 0.8, normPos.y), 0.5).toConst('curtainCenter');
      force.addAssign(normalize(curtainCenter.sub(normPos)).mul(beatPulse));

      return force;
    }).setLayout({
      name: 'auroraVeilForce',
      type: 'vec3',
      inputs: [
        { name: 'particlePos', type: 'vec3' },
        { name: 'particleVel', type: 'vec3' },
        { name: 'gridSize', type: 'vec3' },
      ],
    });
  }
}

/**
 * Visualization Mode Factory
 * Creates and manages visualizer instances
 */
export class AudioVisualizationManager {
  private visualizers: Map<AudioVisualizationMode, AudioVisualizer> = new Map();
  private currentMode: AudioVisualizationMode = AudioVisualizationMode.WAVE_FIELD;
  private renderer: THREE.WebGPURenderer;
  private gridSize: THREE.Vector3;
  
  constructor(renderer: THREE.WebGPURenderer, gridSize: THREE.Vector3) {
    this.renderer = renderer;
    this.gridSize = gridSize;
    this.initializeVisualizers();
  }
  
  /**
   * Initialize all visualizer modes
   */
  private initializeVisualizers(): void {
    this.visualizers.set(AudioVisualizationMode.WAVE_FIELD, new WaveFieldVisualizer(this.renderer, this.gridSize));
    this.visualizers.set(AudioVisualizationMode.FREQUENCY_TOWERS, new FrequencyTowerVisualizer(this.renderer, this.gridSize));
    this.visualizers.set(AudioVisualizationMode.VORTEX_DANCE, new VortexDanceVisualizer(this.renderer, this.gridSize));
    this.visualizers.set(AudioVisualizationMode.MORPHOLOGICAL, new MorphologicalVisualizer(this.renderer, this.gridSize));
    this.visualizers.set(AudioVisualizationMode.GALAXY_SPIRAL, new GalaxySpiralVisualizer(this.renderer, this.gridSize));
    this.visualizers.set(AudioVisualizationMode.KINETIC_FLOW, new KineticFlowVisualizer(this.renderer, this.gridSize));
    this.visualizers.set(AudioVisualizationMode.FRACTAL_BURST, new FractalBurstVisualizer(this.renderer, this.gridSize));
    this.visualizers.set(AudioVisualizationMode.HARMONIC_LATTICE, new HarmonicLatticeVisualizer(this.renderer, this.gridSize));
    this.visualizers.set(AudioVisualizationMode.AURORA_VEIL, new AuroraVeilVisualizer(this.renderer, this.gridSize));
  }
  
  /**
   * Set active visualization mode
   */
  setMode(mode: AudioVisualizationMode): void {
    this.currentMode = mode;
  }
  
  /**
   * Get current visualizer
   */
  getCurrentVisualizer(): AudioVisualizer | undefined {
    return this.visualizers.get(this.currentMode);
  }
  
  /**
   * Get force TSL for current mode
   */
  getCurrentForceTSL(audioUniforms: any): any {
    const visualizer = this.getCurrentVisualizer();
    return visualizer ? visualizer.generateForceTSL(audioUniforms) : null;
  }
  
  /**
   * Update current visualizer
   */
  update(audioData: AudioData, deltaTime: number): void {
    const visualizer = this.getCurrentVisualizer();
    if (visualizer) {
      visualizer.update(audioData, deltaTime);
    }
  }
  
  /**
   * Dispose all visualizers
   */
  dispose(): void {
    this.visualizers.forEach(v => v.dispose());
    this.visualizers.clear();
  }
}

/**
 * Mode display names
 */
export const VISUALIZATION_MODE_NAMES: Record<AudioVisualizationMode, string> = {
  [AudioVisualizationMode.WAVE_FIELD]: 'Wave Field',
  [AudioVisualizationMode.FREQUENCY_TOWERS]: 'Frequency Towers',
  [AudioVisualizationMode.VORTEX_DANCE]: 'Vortex Dance',
  [AudioVisualizationMode.MORPHOLOGICAL]: 'Morphological',
  [AudioVisualizationMode.GALAXY_SPIRAL]: 'Galaxy Spiral',
  [AudioVisualizationMode.KINETIC_FLOW]: 'Kinetic Flow',
  [AudioVisualizationMode.FRACTAL_BURST]: 'Fractal Burst',
  [AudioVisualizationMode.HARMONIC_LATTICE]: 'Harmonic Lattice',
  [AudioVisualizationMode.AURORA_VEIL]: 'Aurora Veil',
};

/**
 * Mode descriptions
 */
export const VISUALIZATION_MODE_DESCRIPTIONS: Record<AudioVisualizationMode, string> = {
  [AudioVisualizationMode.WAVE_FIELD]: 'Traveling wave patterns ripple through particles',
  [AudioVisualizationMode.FREQUENCY_TOWERS]: '3D audio equalizer with vertical frequency columns',
  [AudioVisualizationMode.VORTEX_DANCE]: 'Beat-triggered vortexes create swirling particle dances',
  [AudioVisualizationMode.MORPHOLOGICAL]: 'Particles cluster into dynamic audio-driven shapes',
  [AudioVisualizationMode.GALAXY_SPIRAL]: 'Majestic spiral patterns orbit like a galaxy',
  [AudioVisualizationMode.KINETIC_FLOW]: 'Fluid-like velocity fields shaped by audio',
  [AudioVisualizationMode.FRACTAL_BURST]: 'Explosive fractal patterns bloom on beats',
  [AudioVisualizationMode.HARMONIC_LATTICE]: 'Crystalline grid with resonant oscillations',
  [AudioVisualizationMode.AURORA_VEIL]: 'Floating aurora curtains shimmer with stereo energy',
};

