# Testing Guide - Rendering Fix Verification

## 🎯 What Was Fixed

1. **Primary Error:** `outputNode.build is not a function` → Fixed by removing invalid MRT node assignment
2. **Overexposure:** Page white/blown out → Fixed by reducing exposure and environment intensity
3. **Architecture:** Unified all color/HDR/tone mapping in `Scenery.ts` (single source of truth)

## ✅ Quick Verification Steps

### 1. Check Console (DevTools)
Open browser DevTools (F12) and check the Console tab:

**Expected output:**
```
✅ Starting app initialization...
✅ GlassMorphism styles injected! flow.
✅ Applied frosted glass to panel: [panels]
✅ Applied frosted glass to panel: [panels]
✅ Applied frosted glass to panel: [panels]
✅ HDR environment loaded and configured
⚙️ Tone mapping: ACES, exposure: 0.50
📐 Viewport adapted: [...]
✅ App initialized successfully!
```

**Should NOT see:**
```
❌ Uncaught (in promise) TypeError: this.outputNode.build is not a function
```

### 2. Visual Inspection
The page should show:
- ✅ **Particles visible** (not white screen)
- ✅ **Proper lighting** (not overexposed/blown out)
- ✅ **HDR environment** visible in background
- ✅ **Natural exposure** (can see details, not washed out)
- ✅ **Control panels** visible (frosted glass effect)

### 3. Interactive Test
Test basic functionality:
- ✅ Camera rotation (mouse drag)
- ✅ Zoom (mouse wheel)
- ✅ Panel controls respond
- ✅ Particle simulation runs smoothly
- ✅ No console errors during interaction

## 🔍 Detailed Verification Checklist

### Console Output Verification

#### ✅ Initialization Messages
Look for these in console:
```
✅ Starting app initialization...
✅ GlassMorphism styles injected!
✅ Applied frosted glass to panel: 🔬 Performance
✅ Applied frosted glass to panel: 🔵 Particle Physics
✅ Applied frosted glass to panel: 🎵 Audio Reactivity
✅ HDR environment loaded and configured
⚙️ Tone mapping: ACES, exposure: 0.50
```

#### ✅ Scenery Configuration
Check that tone mapping is properly configured:
```
⚙️ Tone mapping: ACES, exposure: 0.50
```
- **Mode:** ACES (natural film-like curve)
- **Exposure:** 0.50 (conservative to prevent overexposure)

#### ❌ Error Messages to Watch For
If you see any of these, something is still wrong:
```
❌ TypeError: this.outputNode.build is not a function
❌ Cannot read property 'build' of undefined
❌ WebGPU context lost
❌ Shader compilation failed
```

### Visual Verification

#### Exposure Check
Compare what you see to this scale:
- **0 (Black):** Nothing visible → exposure too low
- **25% (Dark):** Can barely see particles → exposure low
- **50% (✅ Target):** Clear particles, good contrast, visible details
- **75% (Bright):** Particles very bright, environment washed out
- **100% (White):** Everything blown out, no detail → overexposed

**Target state:** Around 50% - particles clearly visible with good contrast

#### HDR Environment Check
- Background should show the autumn field HDR (golden/warm tones)
- Should NOT be pure white or blown out
- Should provide natural ambient lighting to particles

#### Particle Rendering
- Particles should have:
  - ✅ Visible shape (rounded boxes)
  - ✅ Proper shadows (cast and receive)
  - ✅ Smooth motion
  - ✅ Color variation based on physics
  - ✅ Depth (AO darkening at depth)

### Performance Verification

#### FPS Check
Open the Performance panel (top-left control panel):
- **Target:** 60 FPS (smooth)
- **Acceptable:** 30-60 FPS
- **Problem:** < 30 FPS (check particle count)

#### Memory Check (DevTools → Performance Monitor)
- **Memory:** Should be stable, not constantly growing
- **GPU:** Should show active utilization
- **Warning:** If memory grows continuously, there may be a leak

## 🐛 Troubleshooting

### Issue: Still seeing white screen

**Possible causes:**
1. Dev server not fully restarted
2. Browser cache not cleared
3. Changes not hot-reloaded

**Solution:**
```bash
# Stop the dev server (Ctrl+C)
# Clear browser cache (Ctrl+Shift+Delete)
# Restart dev server
npm run dev
# Hard refresh browser (Ctrl+Shift+R)
```

### Issue: Still seeing `outputNode.build` error

**This should be impossible now**, but if it happens:
1. Check `meshrenderer.ts` line 231 - should be empty method
2. Search codebase for `mrtNode` assignments
3. Check for any other plain object assignments to node properties

**Search command:**
```bash
grep -r "\.mrtNode\s*=" src/
grep -r "\.colorNode\s*=\s*{" src/
grep -r "\.positionNode\s*=\s*{" src/
```

### Issue: Page loads but particles not visible

**Possible causes:**
1. Exposure too low (< 0.3)
2. Environment intensity too low (< 0.1)
3. Particle count is 0
4. Camera too far away

**Solution:**
- Open Particle Physics panel
- Check particle count (should be > 0)
- Try increasing exposure in Scenery settings
- Reset camera position

### Issue: Particles visible but overexposed

**If still too bright:**
- Current exposure is 0.5
- Try reducing to 0.4 or 0.3
- Reduce environment intensity from 0.25 to 0.2

**Where to change:**
1. **Runtime (temporary):** Use PostFX panel (when re-enabled)
2. **Permanent:** Edit `src/STAGE/scenery.ts` lines 132 and 141

## 📊 Expected Console Output (Full)

```
[vite] connecting...
[vite] connected.

✅ Starting app initialization...
✅ GlassMorphism styles injected! flow.
⚙️ Dashboard initialized with info display and FPS counter
✅ Applied frosted glass to panel: 🔬 Performance
✅ Applied frosted glass to panel: 🔵 Particle Physics
✅ Applied frosted glass to panel: 🎵 Audio Reactivity
✅ HDR environment loaded and configured
⚙️ Viewport adapted: (3) ["90.7", "64.0", "64.0"]
⚙️ Tone mapping: ACES, exposure: 0.50
✅ App initialized successfully!

(Three.js info messages - normal)
THREE.TSL Declaration name 'ap' already in use. Renamed to 'ap_1'.
THREE.TSL Declaration name 'centep' of 'vec3' already in use. Renamed to 'centep_1'.
... (more TSL warnings - these are normal and harmless)
```

## 🎨 Visual Comparison

### Before (Broken)
- ⚠️ White screen / blown out
- ⚠️ Console error: `outputNode.build is not a function`
- ⚠️ Particles invisible or completely overexposed
- ⚠️ No detail visible

### After (Fixed)
- ✅ Proper exposure and contrast
- ✅ Particles clearly visible
- ✅ HDR environment visible (golden autumn field)
- ✅ Shadows and depth visible
- ✅ No console errors
- ✅ Smooth performance

## 📸 Screenshot Checklist

Take a screenshot and verify:
- [ ] Background shows HDR environment (not white)
- [ ] Particles visible with shape and detail
- [ ] Control panels visible (left side)
- [ ] Shadows under particles
- [ ] No bloom (currently disabled - expected)
- [ ] Smooth performance (FPS counter)

## ✅ Success Criteria

**All of these must be true:**
1. ✅ No `outputNode.build is not a function` error
2. ✅ Page loads and shows scene (not white)
3. ✅ Particles visible and rendering correctly
4. ✅ Proper exposure (not overexposed)
5. ✅ HDR environment visible
6. ✅ Camera controls work
7. ✅ Performance is smooth (> 30 FPS)
8. ✅ No console errors

## 📝 Reporting Results

If everything works:
```
✅ All tests passed!
- No outputNode error
- Proper exposure
- Particles visible
- Performance good
```

If issues remain:
```
❌ Issue: [describe what you see]
Console output: [paste relevant errors]
Screenshot: [attach if possible]
FPS: [number]
Particle count: [number from Performance panel]
```

---

**Next Steps After Verification:**
1. If all tests pass → Ready to re-enable PostFX system
2. If bloom needed → Implement proper TSL-based bloom in PostFX
3. If exposure adjustment needed → Tweak in `scenery.ts`

