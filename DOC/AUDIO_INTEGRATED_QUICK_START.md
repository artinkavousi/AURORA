# 🎵 Audio Kinetic Performer - Quick Start Guide

## ✨ What's New

The audio reactivity system has been completely redesigned and unified into a single comprehensive panel called **"🎵 Audio Kinetic Performer"**.

## 🚀 Getting Started

### 1. Launch the App
```bash
cd flow
npm run dev
```

### 2. Open the Audio Panel
- Look for the **"🎵 Audio Kinetic Performer"** panel (top-right by default)
- It's draggable and collapsible

### 3. Enable Audio
In the **🎛️ Master** section:
- Toggle **"Enable Audio FX"** to ON
- Adjust **"Master Intensity"** slider (0-2)

### 4. Choose Audio Source
In the **🎤 Audio Source** section:
- Select **🎤 Microphone** for live input
- Or select **🎵 Audio File** and click **📂 Load Audio File**

## 📊 Understanding the Panel

### Core Sections (Always Visible)

#### 🎛️ Master
- **Enable Audio FX**: Master on/off switch
- **Master Intensity**: Scales all audio effects (0-2)

#### ⚡ Quick Toggles
Fast enable/disable for advanced systems:
- 🎵 **Groove Intelligence**: Swing & timing analysis
- 🎭 **Gesture System**: Expressive motion primitives
- 🎪 **Ensemble Choreography**: Particle roles & formations
- 📐 **Spatial Staging**: Depth layering

#### 📊 Live Overview
Real-time metrics:
- **Level**: Overall audio intensity (graph)
- **🔊 Bass / 🎸 Mid / 🎺 High**: Frequency bands
- **⚡ Beat Pulse**: Beat detection intensity
- **Tempo Phase**: Position in current beat cycle

#### 🎨 Visual Presets
Quick-access presets with unique characteristics:
1. **🌊 Gentle Waves** - Smooth, flowing (ambient music)
2. **💥 Energetic Dance** - High energy, strong beats
3. **🌀 Fluid Vortex** - Swirling, organic motion
4. **✨ Shimmer Burst** - Quick, sparkly response
5. **🌌 Galaxy Spiral** - Cosmic, expansive
6. **🌠 Aurora Veil** - Silky light curtains

### Advanced Sections (Collapsible)

#### 🎵 Groove Intelligence
Musical feel analysis:
- **Swing Ratio**: Straight vs swing feel
- **Groove Intensity**: Overall groove strength
- **Pocket Tightness**: Timing consistency
- **Syncopation**: Off-beat emphasis
- **Analysis Confidence**: Reliability %

#### 🎼 Musical Structure
Song section detection:
- **Current Section**: Verse/Chorus/Build-up/Drop/etc.
- **Section Progress**: How far through current section
- **Energy**: Overall energy level
- **Tension**: Musical tension/release
- **Anticipation**: Pre-drop anticipation

#### ⏱️ Predictive Timing
Beat prediction:
- **Detected Tempo**: BPM
- **Beat Phase**: Current position in beat (graph)
- **Next Beat In**: Milliseconds until next beat
- **Next Downbeat In**: Seconds until downbeat
- **Tempo Stable**: Is tempo detection stable?

#### 🎭 Gesture System
Motion primitives:
- **Active Gesture**: Current gesture (Swell/Attack/Release/etc.)
- **Gesture Phase**: Progress through gesture (graph)
- **Active Gestures**: Count of simultaneous gestures
- **Blend Mode**: How gestures are combined
- **Manual Triggers**: 6 buttons to manually trigger gestures

#### 🎪 Ensemble Choreography
Particle roles:
- **⭐ Lead**: High-energy, prominent particles
- **🎸 Support**: Mid-energy, supporting motion
- **🌫️ Ambient**: Low-energy, atmospheric
- **Current Formation**: Active formation type
- **Formation Transition**: Progress between formations (graph)

#### 📐 Spatial Staging
Depth layers:
- **▶️ Foreground**: Near camera particles
- **⏸️ Midground**: Main action particles
- **⏹️ Background**: Atmospheric particles

#### 🧠 Feature Insights
Advanced audio features:
- **Spectral Flux**: Rate of spectral change
- **Onset Energy**: Attack sharpness
- **Harmonic Ratio**: Harmonic vs noise content
- **Harmonic Energy**: Total harmonic strength
- **Rhythm Confidence**: Beat detection confidence
- **Tempo (BPM)**: Detected tempo
- **Stereo Balance**: Left/right balance
- **Stereo Width**: Stereo field width
- **Groove Index**: Overall groove quality
- **Energy Trend**: Rising/falling energy

#### 🎚️ Modulation Lab
Control signal routing:
- **Live Modulators**: Real-time modulator values (Pulse, Flow, Shimmer, Warp, Density, Aura)
- **Routing Intensities**: How strongly each modulator affects its target
  - Pulse → Forces
  - Flow → Fluidity
  - Shimmer → Color
  - Warp → Spatial
  - Density → Emit
  - Aura → Bloom
- **Temporal Sculpting**: Timeline smoothing and transition agility

#### 🗂️ Motion History
Visual sparklines:
- **Loudness**: Historical loudness graph
- **Flux**: Spectral flux history
- **Beat Grid**: Beat pattern visualization

#### 🎚️ Manual Override
Manual control:
- **Manual Tempo**: Override detected tempo (60-200 BPM)
- **🎯 Align to Beat**: Sync to current beat
- **Force Formation**: Override automatic formation selection

#### ⚙️ Advanced
Fine-tuning:
- **Visualization**: Choose visualization mode
- **Frequency Balance**: Adjust bass/mid/treble influence
- **Smoothness**: Audio smoothing (0.5-0.95)
- **Beat Sensitivity**: Beat detection threshold (0.8-2.0)

## 🎯 Usage Tips

### For Live Music Input
1. Use **🎤 Microphone** source
2. Start with **"💥 Energetic Dance"** preset
3. Adjust **Master Intensity** to taste
4. Watch the **Groove Intelligence** section to see swing and syncopation

### For Chill/Ambient Music
1. Use **"🌊 Gentle Waves"** or **"🌠 Aurora Veil"** preset
2. Lower **Master Intensity** to 0.8-1.2
3. Enable **📐 Spatial Staging** for depth
4. Watch the **Musical Structure** for energy flow

### For Electronic/Dance Music
1. Use **"🌀 Fluid Vortex"** or **"✨ Shimmer Burst"** preset
2. Higher **Master Intensity** (1.2-1.8)
3. Enable all **Quick Toggles** for maximum expressiveness
4. Watch **Predictive Timing** for beat anticipation

### For Experimental/Creative Work
1. Load an audio file with interesting structure
2. Use **Manual Override** to force specific formations
3. Manually trigger gestures with **🎭 Gesture System** buttons
4. Adjust **Modulation Lab** routing for custom mappings

## 🔧 Technical Details

### Data Flow
```
Microphone/File 
    ↓
SoundReactivity (FFT, beat detection)
    ↓
EnhancedAudioAnalyzer (groove, structure, timing)
    ↓
┌─────────────────────────────────┐
│ Gesture Interpreter             │ → 6 expressive motion types
├─────────────────────────────────┤
│ Ensemble Choreographer          │ → Particle roles & formations
├─────────────────────────────────┤
│ Spatial Composer                │ → Depth layering
└─────────────────────────────────┘
    ↓
Particle System (forces, motion, rendering)
```

### Performance
- **Low CPU Impact**: Analysis runs only when audio is enabled
- **GPU Acceleration**: TSL-based gesture implementations (Phase 2)
- **Adaptive**: Automatically adjusts to song tempo and structure
- **Real-time**: All metrics update 60 times per second

### Compatibility
- **WebGPU Required**: Core rendering engine
- **Modern Browsers**: Chrome 113+, Edge 113+, Safari 18+ (with WebGPU)
- **Microphone Access**: Requires HTTPS or localhost

## 🐛 Troubleshooting

### No Audio Detected
1. Check browser microphone permissions
2. Verify **Enable Audio FX** is ON
3. Ensure correct **Audio Source** selected
4. Try increasing **Beat Sensitivity** in Advanced

### Choppy Performance
1. Lower **Master Intensity**
2. Disable some **Quick Toggles**
3. Use a simpler **Visual Preset**
4. Check browser GPU acceleration is enabled

### Metrics Not Updating
1. Ensure audio is playing (file) or input is active (mic)
2. Check **📊 Live Overview** for activity
3. Try different **Advanced → Smoothness** value
4. Reload the page

## 📚 Further Reading

- [Full Redesign Proposal](./AUDIO_REACTIVITY_REDESIGN_PROPOSAL_V2.md)
- [Implementation Status](./AUDIO_REDESIGN_IMPLEMENTATION_STATUS.md)
- [Panel Unification Details](./AUDIO_PANEL_UNIFIED_COMPLETE.md)
- [Phase 3 Complete Report](./AUDIO_REDESIGN_PHASE3_COMPLETE.md)

## 🎉 Have Fun!

This system analyzes music in real-time across multiple dimensions (groove, structure, gestures, ensemble, spatial) and translates it into expressive particle motion. Experiment with different music genres, adjust parameters, and discover what combinations create the most compelling visuals!

---

**Questions? Issues?** Check the troubleshooting section or consult the technical documentation.

