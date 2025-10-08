# 🧪 Boundaries System - Quick Test Guide

## 🚀 Quick Start

### 1. Start the dev server
```bash
cd flow
npm run dev
```

### 2. Open browser
Navigate to `http://localhost:5173`

---

## 🎯 Test Cases

### Test 1: NONE Mode (Default - Floating Particles)

**Expected Behavior**:
- ✅ Particles float freely near center of viewport
- ✅ No visible boundary mesh
- ✅ Particles gently pulled toward center (soft forces)
- ✅ Particles stay visible even when moving
- ✅ No hard walls or sudden bounces

**How to Test**:
1. Launch app (NONE mode is default)
2. Observe particles - they should cluster near center
3. Resize window - particles should stay centered in new viewport
4. Move panels - particles should avoid panel areas
5. Add mouse force - particles should return to center gently

**Console Output**:
```
📐 Viewport adapted (automatic): [width, height, depth]
```

---

### Test 2: Viewport Resize (NONE Mode)

**Expected Behavior**:
- ✅ Particles remain visible when resizing
- ✅ Boundary adapts automatically to new viewport size
- ✅ Smooth transition (no sudden jumps)
- ✅ Particles recentered in new viewport

**How to Test**:
1. Resize browser window (drag corners)
2. Make window very wide (landscape)
3. Make window very tall (portrait)
4. Observe particles always stay in center

---

### Test 3: UI Panel Avoidance (NONE Mode)

**Expected Behavior**:
- ✅ Particles stay away from control panels
- ✅ Safe zone excludes panel areas
- ✅ Particles centered in remaining space

**How to Test**:
1. Open Physics panel (right side)
2. Open Audio panel (if available)
3. Drag panels to different positions
4. Observe particles stay in center of free space (not overlapping panels)

**Note**: Auto-detection happens via `MutationObserver` - panels with classes `.tp-dfwv`, `.tp-rotv`, `.panel-container`, `.unified-panel-system` are automatically detected.

---

### Test 4: SPHERE Mode (Glass Container)

**Expected Behavior**:
- ✅ Visible glass sphere appears
- ✅ Sphere centered in viewport (avoiding UI)
- ✅ Sphere scales to fit viewport
- ✅ Particles bounce off sphere walls
- ✅ Sphere resizes smoothly when viewport changes
- ✅ No clipping with UI panels

**How to Test**:
1. Open Physics Panel → Boundaries → Shape → Select "SPHERE"
2. Enable "Boundaries Enabled" checkbox
3. Observe glass sphere appears
4. Resize window - sphere should scale automatically
5. Particles should stay inside sphere (no escaping)
6. Sphere should avoid clipping with panels

**Console Output**:
```
✅ Boundary shape changed to sphere
📐 Viewport adapted (automatic): [...]
```

---

### Test 5: TUBE Mode (Cylindrical Container)

**Expected Behavior**:
- ✅ Visible glass cylinder appears (vertical orientation)
- ✅ Tube centered in viewport
- ✅ Tube scales to fit viewport (radius and height adapt)
- ✅ Particles bounce off tube walls and caps
- ✅ No clipping with UI

**How to Test**:
1. Physics Panel → Boundaries → Shape → Select "TUBE"
2. Enable boundaries
3. Observe cylindrical glass tube
4. Resize window - tube should scale
5. Particles should stay inside tube

---

### Test 6: DODECAHEDRON Mode (Polyhedron Container)

**Expected Behavior**:
- ✅ Visible glass dodecahedron appears
- ✅ Polyhedron centered in viewport
- ✅ Polyhedron scales to fit viewport
- ✅ Particles bounce off walls (spherical approximation)
- ✅ No clipping with UI

**How to Test**:
1. Physics Panel → Boundaries → Shape → Select "DODECAHEDRON"
2. Enable boundaries
3. Observe glass polyhedron
4. Resize window - polyhedron should scale
5. Particles should stay inside

---

### Test 7: BOX Mode (Concrete Container)

**Expected Behavior**:
- ✅ Textured concrete box appears
- ✅ Box centered in viewport
- ✅ Box size remains consistent (based on grid size)
- ✅ Particles bounce off box walls
- ✅ Visible texture (concrete with normal/AO maps)

**How to Test**:
1. Physics Panel → Boundaries → Shape → Select "BOX"
2. Enable boundaries
3. Observe concrete box with texture
4. Particles should bounce off walls
5. Box should maintain proper scale

---

### Test 8: Audio Reactivity (NONE Mode)

**Expected Behavior**:
- ✅ Boundaries expand/contract with audio
- ✅ Particles pushed outward on beats
- ✅ Smooth return to center after beat
- ✅ Pulse strength adjustable

**How to Test**:
1. Enable audio (if available)
2. Ensure Boundaries → Audio Reactive = ON
3. Play music with strong beats
4. Observe particles expand on beats
5. Boundary should pulse smoothly

---

### Test 9: Audio Reactivity (SPHERE Mode)

**Expected Behavior**:
- ✅ Sphere scales with audio (bass)
- ✅ Sphere opacity pulses on beats
- ✅ Smooth pulsing animation
- ✅ Returns to base size smoothly

**How to Test**:
1. SPHERE mode enabled
2. Audio reactive ON
3. Play music
4. Observe sphere pulsing with bass
5. Opacity should flash on beats

---

### Test 10: Dynamic Shape Switching

**Expected Behavior**:
- ✅ Smooth transition between shapes
- ✅ Old mesh disposed properly
- ✅ New mesh positioned correctly
- ✅ Particles adapt to new container
- ✅ No memory leaks

**How to Test**:
1. Start with NONE mode
2. Switch to SPHERE → observe transition
3. Switch to TUBE → observe transition
4. Switch to BOX → observe transition
5. Switch back to NONE → boundaries disappear
6. Check browser DevTools memory - no leaks

---

### Test 11: Collision Physics (Hard Container)

**Expected Behavior**:
- ✅ Particles bounce off walls realistically
- ✅ No particles escaping container
- ✅ Smooth collision response
- ✅ Wall stiffness adjustable

**How to Test**:
1. SPHERE mode enabled
2. Add strong mouse force to push particles
3. Observe particles bounce back from walls
4. Adjust Wall Stiffness slider → test different bounce strengths
5. No particles should escape

---

### Test 12: Collision Physics (Soft Container - NONE)

**Expected Behavior**:
- ✅ Gentle forces pull particles toward center
- ✅ Forces increase smoothly with distance
- ✅ No sudden "wall hits"
- ✅ Natural floating behavior

**How to Test**:
1. NONE mode
2. Push particles to edges with mouse
3. Release - particles should drift back to center gently
4. No sudden snaps or hard collisions
5. Natural, organic movement

---

## 📊 Performance Checks

### Check 1: Resize Performance
- Resize window rapidly
- FPS should remain stable (60fps target)
- No stuttering or lag
- Viewport updates should be smooth

### Check 2: Panel Detection Performance
- Open/close multiple panels
- No significant FPS drop
- UI detection should be efficient (debounced)

### Check 3: Memory Usage
1. Open DevTools → Performance/Memory
2. Switch shapes multiple times
3. Observe memory usage - should not increase significantly
4. Old meshes should be properly disposed

---

## 🐛 Common Issues & Solutions

### Issue: Particles escaping container
**Check**:
- `boundaryEnabled` uniform is set correctly
- `updateBoundaryUniforms()` is called
- Wall stiffness is not too low

### Issue: Sphere clipping with UI
**Check**:
- ViewportTracker is detecting panels (check console)
- Panels have proper classes (`.tp-dfwv`, etc.)
- Safe zone calculation is correct

### Issue: Boundaries not updating on resize
**Check**:
- ResizeObserver is active (not disposed)
- `setupResizeHandler()` was called in APP.ts
- Console shows "📐 Viewport adapted" messages

### Issue: NONE mode has hard walls
**Check**:
- `boundaryEnabled` should be `0` for NONE mode
- Soft radial containment code is active
- Check GPU shader compilation (no errors)

---

## ✅ Success Criteria

All tests pass if:
- ✅ NONE mode: Smooth floating, centered particles
- ✅ SPHERE mode: Proper scaling, no UI clipping
- ✅ TUBE mode: Proper scaling and positioning
- ✅ All shapes: Smooth resize adaptation
- ✅ Collision physics: Realistic and smooth
- ✅ UI avoidance: Particles stay in safe zones
- ✅ Audio reactivity: Smooth pulsing (if enabled)
- ✅ Performance: 60fps maintained
- ✅ No memory leaks on shape switching

---

## 📝 Testing Notes Template

```
Date: [Date]
Browser: [Chrome/Firefox/Edge/Safari]
Screen Size: [Resolution]
Performance Tier: [High/Medium/Low]

Test Results:
- [ ] NONE mode floating: Pass/Fail
- [ ] Viewport resize: Pass/Fail
- [ ] UI avoidance: Pass/Fail
- [ ] SPHERE scaling: Pass/Fail
- [ ] TUBE scaling: Pass/Fail
- [ ] Collision physics: Pass/Fail
- [ ] Audio reactivity: Pass/Fail
- [ ] Shape switching: Pass/Fail
- [ ] Performance: Pass/Fail
- [ ] Memory: Pass/Fail

Issues Found:
1. [Description]
2. [Description]

Notes:
[Additional observations]
```

---

## 🎯 Next Steps After Testing

If all tests pass:
1. ✅ Mark todos as complete
2. ✅ Commit changes
3. ✅ Update main README if needed
4. ✅ Consider additional boundary shapes (optional)

If issues found:
1. 🐛 Document specific failures
2. 🔍 Check console for errors
3. 🛠️ Debug with browser DevTools
4. 📝 Report findings

---

**Ready to test?** Run `npm run dev` and work through the test cases above! 🚀



