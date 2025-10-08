# 🎵 Audio Reactivity - Quick Start Guide

## 🚀 Getting Started (60 seconds)

### Step 1: Start the App
```bash
cd flow
npm run dev
```

### Step 2: Open in Browser
Navigate to `http://localhost:5173`

### Step 3: Enable Audio
1. Look for the **"🎵 Audio Reactivity"** panel (top right)
2. Toggle **"Enabled"** to ON
3. Choose your audio source:
   - **Microphone**: Click "Allow" when browser prompts
   - **Audio File**: Click "Load Audio File" and select a music file

### Step 4: Experience the Magic! ✨
Your screen will now show beautiful volumetric visualizations reacting to audio in real-time!

---

## 🎨 Visual Modes

Try different visualization modes in the panel:

| Mode | Description | Best For |
|------|-------------|----------|
| **Sphere** | Pulsating sphere with audio displacement | General music, balanced |
| **Cylinder** | Radial waves with frequency distortion | Bass-heavy music, EDM |
| **Waves** | Rippling plane with interference patterns | Ambient, classical |
| **Particles** | Complex particle-like deformations | Experimental, glitch |
| **Tunnel** | Immersive flowing tunnel | Trance, psychedelic |

---

## 🎛️ Essential Controls

### Quick Tweaks

**For Bass-Heavy Music** (EDM, Hip-Hop):
- Set **Bass Influence** to 2.0
- Set **Bass Gain** to 1.5
- Enable **Beat Detection**
- Choose **Tunnel** or **Cylinder** mode

**For Ambient/Classical**:
- Set **Smoothing** to 0.85
- Reduce **Pulse Intensity** to 0.5
- Choose **Waves** or **Sphere** mode
- Lower **Speed** to 0.7

**For Live Performance**:
- Enable **Beat Detection**
- Set **Beat Threshold** to 1.3 (more sensitive)
- Max out **Glow Intensity** (3.0+)
- Choose **Rainbow** color mode

---

## 🎵 Audio Source Guide

### Using Microphone
1. Select **Source**: Microphone
2. Click "Allow" in browser prompt
3. Play music near your microphone
4. Adjust **Volume** slider if needed

**Tips**:
- Works great for live instruments/vocals
- Position mic near speaker for music playback
- Adjust **Min dB** / **Max dB** for sensitivity

### Using Audio Files
1. Select **Source**: Audio File
2. Click **"Load Audio File"**
3. Choose an MP3, WAV, or other audio file
4. Click **▶️ Play / ⏸️ Pause** to control

**Supported Formats**: MP3, WAV, OGG, FLAC, AAC

---

## 🎨 Color Customization

### Color Modes
- **Rainbow**: Full spectrum shift
- **Bass**: Hue driven by bass frequencies
- **Frequency**: Hue mapped to peak frequency
- **Gradient**: Custom hue + audio modulation

### Manual Color Control
1. Set **Hue** (0-1): 
   - 0.0 = Red
   - 0.33 = Green
   - 0.66 = Blue
2. Adjust **Saturation** (0-1): Color intensity
3. Modify **Brightness** (0-2): Overall luminance

---

## ⚡ Performance Tips

### If Frame Rate Drops:
1. Lower **Complexity** (5 → 3)
2. Reduce **FFT Size** (2048 → 1024)
3. Decrease particle count (Physic panel)
4. Use **Sphere** mode (fastest)

### If Audio Lags:
1. Reduce **Smoothing** (0.8 → 0.6)
2. Lower **FFT Size** (4096 → 2048)

---

## 🎯 Real-time Metrics

Monitor audio analysis in real-time:

- **Bass** (0-1): Low frequency energy (20-250 Hz)
- **Mid** (0-1): Mid frequency energy (250-4000 Hz)
- **Treble** (0-1): High frequency energy (4000-20000 Hz)
- **Overall** (0-1): Average across all bands
- **Beat** (0-1): Beat detection intensity
- **Peak (Hz)**: Dominant frequency

---

## 🔧 Advanced Features

### System Integration

The audio system influences:

1. **Particle Physics**
   - Simulation speed scales with audio intensity
   - Noise increases with bass
   - Control via **Particle Influence** slider

2. **Post-Processing Effects**
   - Bloom pulses with bass
   - Chromatic aberration spikes on beats
   - Control via **Post-FX Influence** slider

3. **Color System**
   - Particle colors shift with audio
   - Control via **Color Influence** slider

### Frequency Band Gains

Fine-tune frequency response:

- **Bass Gain**: Amplify bass (0-2)
- **Mid Gain**: Amplify mid frequencies (0-2)
- **Treble Gain**: Amplify treble (0-2)

Example: For bass-focused visualization, set Bass Gain to 2.0, others to 0.5

---

## 🎪 Preset Suggestions

### "Club Night"
```
Mode: Tunnel
Bass Influence: 2.0
Glow Intensity: 4.0
Rotation Speed: 1.0
Beat Detection: ON
Color Mode: Rainbow
```

### "Chill Vibes"
```
Mode: Sphere
Complexity: 5
Speed: 0.5
Pulse Intensity: 0.7
Smoothing: 0.9
Color Mode: Gradient
```

### "Psychedelic Trip"
```
Mode: Waves
Complexity: 15
Wave Amplitude: 1.5
Speed: 1.2
Color Mode: Frequency
Glow: 5.0
```

### "Concert Hall"
```
Mode: Cylinder
Scale: 1.3
Bass Influence: 1.0
Mid Influence: 1.2
Treble Influence: 0.8
Color Mode: Bass
```

---

## 🐛 Common Issues

### "No visualization showing"
✅ Check "Enabled" is toggled ON in Audio panel
✅ Check "Enabled" in Volumetric Visualization section
✅ Increase frequency gain sliders

### "Microphone permission denied"
✅ Click browser address bar lock icon
✅ Allow microphone access
✅ Reload page

### "Audio file won't play"
✅ Check file format (MP3/WAV recommended)
✅ Click Play/Pause button after loading
✅ Check browser console for errors

### "Visualization is jittery"
✅ Increase **Smoothing** (0.8-0.9)
✅ Reduce **FFT Size**
✅ Lower **Complexity**

---

## 🎓 Pro Tips

1. **Layer Multiple Influences**: Combine particle + volumetric + post-FX influences for maximum impact

2. **Match Music Genre**: 
   - Electronic → Tunnel/Cylinder + High Bass
   - Classical → Sphere/Waves + Balanced
   - Rock → Particles + Beat Detection

3. **Performance Mode**: Disable post-FX influence and use Sphere mode for 60+ FPS on lower-end hardware

4. **Recording Setup**: Use audio file source + loop for consistent recordings

5. **Live DJ**: Use microphone + beat detection + tunnel mode for reactive visuals

---

## 📚 Learn More

- **Full Documentation**: See `AUDIO_SYSTEM.md`
- **Architecture Guide**: See `ARCHITECTURE.md`
- **Project README**: See `README.md`

---

**Start creating amazing audio visualizations in seconds!** 🎵✨

*Built with Three.js WebGPU, TSL Shaders, and Web Audio API*

