# Audio Reactivity Troubleshooting Guide

## Quick Diagnostic Steps

### 1. Check Browser Console
Press **F12** → **Console** tab. Look for errors related to:
- `AudioReactiveBehavior`
- `AudioVisualizationManager`
- `AudioPanel`
- Import/module errors

### 2. Verify App Loads
- Does the particle simulation appear?
- Can you see the UI panels (Physics, PostFX)?
- Does the Audio Panel appear on the right side?

### 3. Check Audio Panel
- Is the "🎵 Audio Reactivity" panel visible?
- Try enabling "Enable Audio" checkbox
- Try enabling "Enable Reactive" checkbox under Visualization Mode

### 4. Common Issues & Fixes

#### Issue: "Cannot read property 'updateConfig' of undefined"
**Cause**: `audioReactiveBehavior` not initialized  
**Fix**: Check APP.ts lines 215-223 for initialization

#### Issue: "Mode dropdown is empty"
**Cause**: Import issue with visualization mode names  
**Fix**: Verify imports in PANELsoundreactivity.ts

#### Issue: "Audio not reacting"
**Causes**:
1. Audio Reactive is disabled (check panel: Enable Reactive checkbox)
2. Audio source not configured (check: Enable Audio, select Microphone/File)
3. Browser blocked microphone access

**Fixes**:
1. Enable "Enable Reactive" in Audio Panel
2. Allow microphone permissions when prompted
3. Or load an audio file using "Load Audio File" button

#### Issue: "Particles don't move to audio"
**Cause**: Config settings  
**Fix**:
1. Check `beatImpulse` > 0 (default: 20)
2. Check frequency influences (bass/mid/treble) > 0
3. Try different visualization modes

### 5. Test Audio System

1. **Start Dev Server**:
   ```bash
   npm run dev
   ```

2. **Open Browser**: http://localhost:5173

3. **Enable Audio**:
   - Audio Panel → Enable Audio ✓
   - Allow microphone when prompted
   - Or: Load Audio File button → select music file

4. **Enable Reactivity**:
   - Audio Panel → Visualization Mode → Enable Reactive ✓

5. **Test Modes**:
   - Try "Wave Field" first (default, most stable)
   - Play music or make noise
   - Watch particles react

6. **Check Metrics**:
   - Audio Panel → Live Audio Metrics
   - Values should change with audio (bass, mid, treble, beat)

### 6. Verify Visualization Modes

Each mode should work when selected:
- **Wave Field**: Rippling wave patterns ✓
- **Frequency Towers**: Vertical EQ bars ✓
- **Vortex Dance**: Swirling vortexes on beats ✓
- **Morphological**: Shape-forming clusters ✓
- **Galaxy Spiral**: Orbital spiral patterns ✓
- **Kinetic Flow**: Fluid-like motion ✓
- **Fractal Burst**: Explosive bursts on beats ✓
- **Harmonic Lattice**: Oscillating grid ✓

### 7. Performance Check

- **FPS**: Should maintain 60 FPS with audio reactive enabled
- **GPU**: Check GPU usage (shouldn't exceed 80%)
- **Audio Latency**: Should be < 50ms (nearly instant response)

If FPS drops:
1. Reduce particle count (Physics Panel)
2. Disable force fields (Audio Panel → Force Field Generation → disable)
3. Disable material modulation

### 8. Reset to Defaults

If nothing works, try resetting:

1. **Clear Browser Cache**: Ctrl+Shift+Delete
2. **Hard Refresh**: Ctrl+F5
3. **Reset Config**: Delete browser localStorage
4. **Rebuild**: 
   ```bash
   npm run build
   npm run dev
   ```

### 9. Browser Compatibility

**Requirements**:
- WebGPU support required
- Chrome 113+ or Edge 113+
- Microphone permissions (for mic input)

**Check WebGPU**:
```javascript
// In browser console:
navigator.gpu ? "✓ WebGPU available" : "✗ WebGPU not available"
```

### 10. Error Messages Decode

| Error | Cause | Fix |
|-------|-------|-----|
| `THREE.WebGPURenderer is not a constructor` | Wrong Three.js version | Check package.json |
| `Cannot find module './audiovisual'` | Import path wrong | Check file exists |
| `Uncaught TypeError: ... is not a function` | Missing method | Check class implementation |
| `Failed to access microphone` | No permission | Grant mic access in browser |

### 11. Debug Mode

Add logging to track issues:

**In APP.ts** (line ~366):
```typescript
console.log('🎵 Audio Data:', audioData);
console.log('🎵 Reactive Enabled:', this.config.audioReactive.enabled);
console.log('🎵 Mode:', this.config.audioReactive.mode);
```

**In audioreactive.ts** (line ~267):
```typescript
console.log('🔊 Beat detected!', this.activeVortexes.length, 'vortexes');
```

### 12. Quick Test

**Minimal test** - Add to browser console:
```javascript
// Check if audio system exists
console.log(window.app?.soundReactivity); // Should show SoundReactivity instance
console.log(window.app?.audioReactiveBehavior); // Should show AudioReactiveBehavior
console.log(window.app?.audioVisualizationManager); // Should show Manager
```

## Still Not Working?

1. **Share Console Errors**: Copy exact error messages
2. **Share Browser Info**: Chrome version, GPU info (chrome://gpu)
3. **Share Behavior**: What exactly isn't working?
   - App won't load?
   - Panel missing?
   - No audio reaction?
   - Specific mode broken?

## Contact

If issues persist, provide:
- Browser console errors (F12 → Console)
- Browser/OS version
- GPU info (chrome://gpu → Copy Report)
- Description of what's not working


