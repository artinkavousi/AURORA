# 🎵 Audio Reactivity System

## Overview

A comprehensive, production-ready audio reactivity system with advanced frequency analysis, beat detection, and stunning volumetric visualizations powered by TSL shaders and WebGPU.

## Features

### 🎤 Audio Analysis Engine
- **Multi-source Support**: Microphone input or audio file playback
- **Advanced FFT Analysis**: Configurable FFT size (256-8192) for precise frequency detection
- **Frequency Band Detection**: 
  - Bass (20-250 Hz)
  - Mid (250-4000 Hz)
  - Treble (4000-20000 Hz)
- **Beat Detection**: Adaptive threshold algorithm with intensity tracking
- **Peak Frequency Detection**: Real-time peak frequency and intensity
- **Smoothing**: Exponential smoothing for fluid animations

### 🌟 Volumetric Visualizations
Five stunning visualization modes with GPU-accelerated TSL shaders:

1. **Sphere** - Pulsating sphere with audio-reactive displacement
2. **Cylinder** - Radial waves with frequency-based distortion
3. **Waves** - Rippling plane with wave interference patterns
4. **Particles** - Particle-like sphere with complex deformations
5. **Tunnel** - Immersive tunnel with flowing patterns

Each mode features:
- Real-time audio-reactive displacement
- Dynamic HSV-based coloring
- Fresnel glow effects
- Beat-synchronized pulsing
- Frequency band mapping

### 🎛️ Control Panel
Comprehensive Tweakpane interface with:

#### Audio Source
- Enable/disable toggle
- Source selection (Microphone/File)
- Volume control (0-1)
- File loader button
- Play/Pause controls

#### Analysis Settings
- FFT size selection (256-8192)
- Smoothing factor (0-0.99)
- Dynamic range (min/max decibels)
- Frequency band gains
- Beat detection configuration
- Reactivity influence mappings

#### Volumetric Settings
- Visualization mode selector
- Transform controls (scale, rotation)
- Appearance settings (complexity, speed, opacity, glow)
- Color controls (mode, hue, saturation, brightness)
- Animation parameters (pulse, wave amplitude)
- Frequency influence (bass/mid/treble)

#### Real-time Metrics
- Live frequency band displays
- Beat intensity indicator
- Peak frequency tracker

## Architecture

### File Structure
```
src/AUDIO/
├── soundreactivity.ts      # Core audio analysis engine
├── volumetric.ts            # Volumetric visualizer with TSL shaders
└── PANELsoundreactivity.ts  # Dedicated control panel
```

### Integration Flow
```
User Input (Mic/File)
        ↓
  SoundReactivity
  - Web Audio API
  - Frequency Analysis
  - Beat Detection
        ↓
    AudioData
        ↓
   ┌──────┴──────┐
   ↓             ↓
Volumetric    Particle
Visualizer    Physics
   ↓             ↓
 Scene      Simulation
```

## Usage

### Quick Start

1. **Start the Application**
   ```bash
   npm run dev
   ```

2. **Open Browser**
   Navigate to `http://localhost:5173`

3. **Enable Audio**
   - Open the "🎵 Audio Reactivity" panel
   - Toggle "Enabled" to ON
   - For microphone: Browser will prompt for permission
   - For file: Click "Load Audio File" and select an audio file

4. **Customize Visualization**
   - Select a visualization mode (Sphere, Cylinder, Waves, etc.)
   - Adjust frequency influence sliders
   - Modify appearance settings to taste

### Advanced Configuration

#### Microphone Setup
```typescript
const audioConfig = {
  enabled: true,
  source: 'microphone',
  fftSize: 2048,
  smoothing: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
  bassGain: 1.5,  // Emphasize bass
  midGain: 1.0,
  trebleGain: 0.8,
  beatDetectionEnabled: true,
  beatThreshold: 1.5,
  beatDecay: 4.0,
  volumetricInfluence: 1.0,
};
```

#### File Playback
```typescript
const audioConfig = {
  enabled: true,
  source: 'file',
  fftSize: 4096,  // Higher resolution for music
  smoothing: 0.85,
  // ... other settings
};
```

#### Custom Visualization
```typescript
const volumetricConfig = {
  enabled: true,
  mode: 'tunnel',
  scale: 1.5,
  complexity: 12,
  speed: 1.2,
  colorMode: 'frequency',
  hue: 0.6,
  saturation: 0.9,
  brightness: 1.2,
  rotationSpeed: 0.8,
  pulseIntensity: 1.5,
  waveAmplitude: 1.2,
  glowIntensity: 3.0,
  opacity: 0.7,
  bassInfluence: 2.0,  // Strong bass reaction
  midInfluence: 1.0,
  trebleInfluence: 0.5,
};
```

## Technical Details

### Audio Analysis

**Frequency Band Calculation**
```typescript
// Define frequency ranges
const bassRange = { min: 20, max: 250 };      // Sub-bass to bass
const midRange = { min: 250, max: 4000 };     // Midrange frequencies
const trebleRange = { min: 4000, max: 20000 }; // High frequencies

// Calculate average amplitude per band
const bass = calculateBandAverage(bassBins) * bassGain;
const mid = calculateBandAverage(midBins) * midGain;
const treble = calculateBandAverage(trebleBins) * trebleGain;
```

**Beat Detection Algorithm**
```typescript
// Adaptive threshold based on history
const average = history.reduce((a, b) => a + b) / history.length;
const variance = history.reduce((a, b) => a + Math.pow(b - average, 2)) / history.length;
const threshold = average + Math.sqrt(variance) * beatThreshold;

// Detect beats above threshold
const isBeat = currentIntensity > threshold && timeSinceLastBeat > minInterval;
```

**Exponential Smoothing**
```typescript
// Smooth factor based on delta time
const smoothingFactor = Math.exp(-deltaTime * 8);
smoothedValue = lerp(rawValue, smoothedValue, smoothingFactor);
```

### Volumetric Shaders

**Sphere Displacement**
```glsl
// Spherical coordinates
theta = atan(pos.z, pos.x)
phi = atan(length(pos.xz), pos.y)

// Audio-reactive displacement
displacement = sin(theta * complexity + time * speed) *
               cos(phi * complexity - time * speed) *
               audioIntensity * waveAmplitude

// Final position
finalPos = pos * (scale + displacement + beatPulse)
```

**HSV Color Mapping**
```glsl
// Map audio to hue
hue = baseHue + audioIntensity * 0.5

// Convert HSV to RGB
K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0)
p = abs(fract(hue + K.xyz) * 6.0 - K.www)
rgb = value * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), saturation)
```

**Fresnel Glow**
```glsl
// View direction
viewDir = normalize(cameraPos - worldPos)

// Fresnel term
fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.0)

// Audio-modulated glow
glow = fresnel * glowIntensity * (1.0 + audioIntensity)
```

### System Integration

**Particle Physics Influence**
```typescript
if (audio.enabled && audio.particleInfluence > 0) {
  simulationSpeed *= (1.0 + audioData.smoothOverall * influence);
  simulationNoise *= (1.0 + audioData.smoothBass * influence * 0.5);
}
```

**Post-FX Modulation**
```typescript
if (audio.enabled && audio.postFXInfluence > 0) {
  bloomStrength *= (1.0 + audioData.smoothBass * influence);
  chromaticAberration *= (1.0 + audioData.beatIntensity * influence * 2.0);
}
```

## Performance

- **GPU-Accelerated**: All visualizations run on GPU via TSL/WebGPU
- **Efficient Analysis**: Web Audio API AnalyserNode for real-time FFT
- **Optimized Geometry**: LOD-appropriate tessellation (32-128 segments)
- **Smart Smoothing**: Adaptive smoothing prevents visual jitter
- **Zero Overhead**: Disabled audio has no performance impact

## Browser Compatibility

- **Chrome/Edge**: Full support (WebGPU + Web Audio API)
- **Firefox**: Full support
- **Safari**: Requires WebGPU flag enabled
- **Mobile**: Supported (reduced particle counts recommended)

## Tips & Tricks

### Best Practices

1. **FFT Size Selection**
   - Small (256-512): Low latency, less frequency resolution
   - Medium (1024-2048): Balanced (recommended)
   - Large (4096-8192): High resolution, more latency

2. **Smoothing Factor**
   - Low (0.0-0.5): Responsive but jittery
   - Medium (0.6-0.8): Balanced (recommended)
   - High (0.9+): Smooth but laggy

3. **Beat Detection**
   - Increase threshold for less sensitive detection
   - Decrease decay for longer beat sustain
   - Adjust frequency gains to emphasize desired range

4. **Visualization Performance**
   - Start with "Sphere" mode (best performance)
   - Reduce complexity for smoother framerate
   - Lower opacity for subtle effects

### Creative Uses

- **Music Videos**: Use "Tunnel" mode with high bass influence
- **Live Performances**: "Cylinder" mode with beat-reactive pulsing
- **Ambient Visualization**: "Waves" mode with low influence
- **DJ Booth Display**: "Sphere" mode with rainbow colors
- **Gaming**: Real-time music visualization during gameplay

## Troubleshooting

### Microphone Not Working
1. Check browser permissions (allow microphone access)
2. Verify microphone is not in use by another app
3. Try reloading the page
4. Check browser console for errors

### No Audio Visualization
1. Ensure "Enabled" is toggled ON
2. Check that source is selected correctly
3. Verify audio is playing (for file source)
4. Increase frequency band gains if visualization is too subtle

### Poor Performance
1. Reduce FFT size (e.g., 1024 instead of 4096)
2. Lower volumetric complexity
3. Decrease particle count in physics settings
4. Reduce post-FX quality settings

### Audio Lag
1. Reduce smoothing factor
2. Decrease FFT size
3. Lower browser audio buffer size (advanced)

## API Reference

### SoundReactivity

```typescript
class SoundReactivity {
  constructor(config: AudioConfig)
  
  async init(): Promise<void>
  getAudioData(): AudioData
  updateConfig(config: Partial<AudioConfig>): void
  loadAudioFile(url: string): void
  togglePlayback(): void
  setVolume(volume: number): void
  dispose(): void
}
```

### VolumetricVisualizer

```typescript
class VolumetricVisualizer {
  constructor(config: VolumetricConfig)
  readonly object: THREE.Mesh
  
  update(audioData: AudioData, elapsed: number): void
  updateConfig(config: Partial<VolumetricConfig>): void
  dispose(): void
}
```

### AudioPanel

```typescript
class AudioPanel {
  constructor(
    parentPane: Pane,
    config: FlowConfig,
    callbacks: AudioPanelCallbacks
  )
  
  updateMetrics(
    bass: number,
    mid: number,
    treble: number,
    overall: number,
    beatIntensity: number,
    peakFrequency: number
  ): void
  
  dispose(): void
}
```

## Future Enhancements

- [ ] MIDI input support
- [ ] Multiple simultaneous visualizers
- [ ] Custom shader editor
- [ ] Preset system with save/load
- [ ] Waveform display
- [ ] Spectrogram visualization
- [ ] Audio recording/export
- [ ] Multi-channel analysis
- [ ] WebRTC audio streaming
- [ ] VR/AR visualization modes

## Credits

Built with:
- [Three.js](https://threejs.org) - WebGPU renderer and TSL shaders
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) - Audio analysis
- [Tweakpane](https://cocopon.github.io/tweakpane/) - Control panel UI

## License

See main project LICENSE file.

---

**Enjoy creating stunning audio-reactive visualizations!** 🎵✨🎨

