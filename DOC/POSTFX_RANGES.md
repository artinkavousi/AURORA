# 🎚️ PostFX Dynamic Range Guide

## 📊 Expanded Parameter Ranges

All parameter ranges have been significantly expanded to allow more dramatic and creative effects.

---

## ✨ Bloom

### Old Ranges → New Ranges

| Parameter | Old Range | New Range | Change |
|-----------|-----------|-----------|--------|
| **Threshold** | 0.0 - 1.0 | 0.0 - 1.5 | +50% |
| **Strength** | 0.0 - 3.0 | 0.0 - 5.0 | +67% |
| **Radius** | 0.0 - 2.0 | 0.0 - 4.0 | +100% |

### What This Enables:

**Threshold (0.0 - 1.5)**:
- `0.0` - Everything glows (extreme bloom)
- `0.5` - Moderate bloom (most bright areas)
- `0.8` - Subtle bloom (only very bright)
- `1.0` - Minimal bloom (HDR peaks only)
- `1.5` - Ultra-selective (extreme highlights only)

**Strength (0.0 - 5.0)**:
- `0.5` - Subtle glow
- `1.0` - Standard bloom
- `2.0` - Strong ethereal glow
- `3.5` - Dramatic/dreamy
- `5.0` - Extreme explosive glow

**Radius (0.0 - 4.0)**:
- `0.5` - Tight glow around bright areas
- `1.0` - Standard spread
- `2.0` - Wide soft glow
- `3.0` - Very wide halo
- `4.0` - Extreme diffusion

---

## 🎯 Radial Focus/Blur

### Old Ranges → New Ranges

| Parameter | Old Range | New Range | Change |
|-----------|-----------|-----------|--------|
| **Focus Radius** | 0.0 - 0.8 | 0.0 - 1.0 | +25% |
| **Falloff Power** | 0.5 - 4.0 | 0.1 - 8.0 | +100% |
| **Blur Strength** | 0.0 - 0.3 | 0.0 - 0.5 | +67% |

### What This Enables:

**Focus Radius (0.0 - 1.0)**:
- `0.0` - Entire screen blurred (no focus area)
- `0.1` - Tiny sharp spot (tunnel vision)
- `0.3` - Small focus area (dramatic)
- `0.5` - Medium focus (cinematic)
- `0.8` - Large focus (subtle)
- `1.0` - Full screen sharp (blur disabled)

**Falloff Power (0.1 - 8.0)**:
- `0.1` - Ultra-gradual blur transition (very soft)
- `1.0` - Linear falloff
- `2.0` - Standard smooth transition
- `4.0` - Sharp transition
- `6.0` - Very sharp edge
- `8.0` - Extreme hard edge (almost binary)

**Blur Strength (0.0 - 0.5)**:
- `0.05` - Slight softness
- `0.1` - Moderate blur
- `0.2` - Strong blur
- `0.3` - Very blurred edges
- `0.5` - Extreme blur (abstract)

---

## 🔴 Radial Chromatic Aberration

### Old Ranges → New Ranges

| Parameter | Old Range | New Range | Change |
|-----------|-----------|-----------|--------|
| **Strength** | 0.0 - 0.05 | 0.0 - 0.1 | +100% |
| **Edge Intensity** | 0.0 - 3.0 | 0.0 - 10.0 | +233% |
| **Falloff Power** | 1.0 - 5.0 | 0.5 - 10.0 | +100% |

### What This Enables:

**Strength (0.0 - 0.1)**:
- `0.005` - Subtle lens-like fringing
- `0.01` - Visible color separation
- `0.02` - Strong chromatic effect
- `0.05` - Dramatic RGB shift
- `0.1` - Extreme color splitting

**Edge Intensity (0.0 - 10.0)**:
- `0.5` - Barely visible at edges
- `1.5` - Subtle lens effect
- `3.0` - Strong edge fringing
- `5.0` - Dramatic color separation
- `8.0` - Extreme stylized effect
- `10.0` - Maximum RGB shift at edges

**Falloff Power (0.5 - 10.0)**:
- `0.5` - Fringing spreads across entire image
- `1.0` - Linear falloff from center
- `2.5` - Standard lens-like behavior
- `5.0` - Edge-focused effect
- `8.0` - Very sharp edge-only fringing
- `10.0` - Extreme edge concentration

---

## 🎨 Creative Presets with Expanded Ranges

### Subtle Enhancement
```typescript
bloom: { threshold: 0.8, strength: 0.6, radius: 1.0 }
radialFocus: { disabled }
radialCA: { disabled }
```
**Use**: Professional, clean look

---

### Cinematic Standard
```typescript
bloom: { threshold: 0.7, strength: 1.2, radius: 1.5 }
radialFocus: { 
  focusRadius: 0.4,
  falloffPower: 2.5,
  blurStrength: 0.12
}
radialCA: { 
  strength: 0.01,
  edgeIntensity: 2.0,
  falloffPower: 3.0
}
```
**Use**: Balanced cinematic look

---

### Dramatic Focus
```typescript
bloom: { threshold: 0.6, strength: 2.0, radius: 2.5 }
radialFocus: { 
  focusRadius: 0.2,
  falloffPower: 4.0,
  blurStrength: 0.25
}
radialCA: { disabled }
```
**Use**: Draw extreme attention to center

---

### Dream/Fantasy
```typescript
bloom: { threshold: 0.5, strength: 3.5, radius: 3.0 }
radialFocus: { 
  focusRadius: 0.3,
  falloffPower: 1.5,
  blurStrength: 0.2
}
radialCA: { 
  strength: 0.02,
  edgeIntensity: 4.0,
  falloffPower: 2.0
}
```
**Use**: Ethereal, dreamy atmosphere

---

### Explosive Energy
```typescript
bloom: { threshold: 0.3, strength: 5.0, radius: 4.0 }
radialFocus: { disabled }
radialCA: { 
  strength: 0.05,
  edgeIntensity: 8.0,
  falloffPower: 3.0
}
```
**Use**: High-energy, explosive visuals

---

### Abstract/Stylized
```typescript
bloom: { threshold: 0.4, strength: 4.0, radius: 3.5 }
radialFocus: { 
  focusRadius: 0.15,
  falloffPower: 6.0,
  blurStrength: 0.35
}
radialCA: { 
  strength: 0.08,
  edgeIntensity: 10.0,
  falloffPower: 8.0
}
```
**Use**: Artistic, abstract, stylized looks

---

### Lens Simulation (Extreme)
```typescript
bloom: { threshold: 0.75, strength: 1.5, radius: 2.0 }
radialFocus: { 
  focusRadius: 0.25,
  falloffPower: 5.0,
  blurStrength: 0.3
}
radialCA: { 
  strength: 0.03,
  edgeIntensity: 6.0,
  falloffPower: 7.0
}
```
**Use**: Realistic vintage/wide-angle lens

---

### Tunnel Vision
```typescript
bloom: { threshold: 0.8, strength: 1.0, radius: 1.5 }
radialFocus: { 
  focusRadius: 0.1,
  falloffPower: 8.0,
  blurStrength: 0.4
}
radialCA: { 
  strength: 0.015,
  edgeIntensity: 5.0,
  falloffPower: 6.0
}
```
**Use**: Focus extreme attention, action intensity

---

### Soft Vignette Bloom
```typescript
bloom: { threshold: 0.65, strength: 2.5, radius: 3.0 }
radialFocus: { 
  focusRadius: 0.6,
  falloffPower: 3.0,
  blurStrength: 0.15
}
radialCA: { disabled }
```
**Use**: Soft, gentle attention direction

---

## ⚡ Performance Notes

### Low Cost (Real-time adjustable)
- ✅ Focus Radius
- ✅ Falloff Power (both)
- ✅ Edge Intensity
- ✅ Blend Mode

**Impact**: ~0.1ms additional cost
**Safe Range**: Adjust freely in real-time

---

### Medium Cost (Requires restart)
- ⚠️ Blur Strength
- ⚠️ CA Strength
- ⚠️ CA Angle

**Impact**: Affects shader compilation
**Note**: Higher values = slightly more GPU work

---

### High Cost (Requires restart, significant impact)
- ⚠️ Bloom Threshold
- ⚠️ Bloom Strength (above 3.0)
- ⚠️ Bloom Radius (above 2.5)

**Impact**: Multi-scale blur cost increases
**Note**: Radius 4.0 ≈ 2x cost vs Radius 1.0

---

## 🎯 Recommended Workflow

### 1. Start with Defaults
Begin with moderate values, enable effects one at a time

### 2. Adjust Real-time Parameters
- Focus radius and falloff
- CA edge intensity and falloff
- Bloom blend mode

### 3. Fine-tune Construction Parameters
- Adjust bloom threshold/strength/radius
- Adjust blur strength
- Adjust CA strength/angle
- **Restart** to see changes

### 4. Polish
- Use blend modes for HDR integration
- Balance radial effects
- Test at different HDR intensities

---

## 📏 Range Summary Table

| Effect | Parameter | Min | Max | Default | Step |
|--------|-----------|-----|-----|---------|------|
| **Bloom** | Threshold | 0.0 | 1.5 | 0.7 | 0.01 |
| | Strength | 0.0 | 5.0 | 0.8 | 0.05 |
| | Radius | 0.0 | 4.0 | 1.0 | 0.05 |
| **Focus** | Radius | 0.0 | 1.0 | 0.25 | 0.01 |
| | Falloff | 0.1 | 8.0 | 2.0 | 0.1 |
| | Blur Strength | 0.0 | 0.5 | 0.08 | 0.01 |
| **CA** | Strength | 0.0 | 0.1 | 0.008 | 0.001 |
| | Edge Intensity | 0.0 | 10.0 | 1.5 | 0.1 |
| | Falloff | 0.5 | 10.0 | 2.5 | 0.1 |

---

## 🎉 Summary

✅ **Bloom**: 50-100% wider ranges for extreme glow  
✅ **Focus**: 100% wider ranges for tunnel vision to full screen  
✅ **CA**: 100-233% wider ranges for extreme color fringing  
✅ **All effects**: More creative control and extreme looks  
✅ **Performance**: Still optimized, higher values = slightly more cost  

The expanded ranges enable everything from subtle enhancements to extreme stylized looks! 🚀

