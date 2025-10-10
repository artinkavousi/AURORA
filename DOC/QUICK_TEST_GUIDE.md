# ⚡ Quick Test Guide - Refactored Pipeline

**2-Minute Smoke Test** - Verify everything works!

---

## 🚀 Start Application

```bash
cd flow
npm run dev
```

Open: http://localhost:5173

---

## ✅ Test Checklist

### **1. Visuals Panel Opens** (10 seconds)
- [ ] Look for 🎨 **Visuals** panel in top-right
- [ ] Click to expand
- [ ] Panel opens without errors

### **2. Render Mode Switching** (20 seconds)
- [ ] **Mode: Point** → See small dots
- [ ] **Mode: Mesh** → See 3D rounded boxes
- [ ] **Mode: Sprite** → See billboard particles
- [ ] **Mode: Trail** → See line structure
- [ ] Each switch is instant, no lag

### **3. Material Properties** (30 seconds)
- [ ] Switch to **Mesh** mode
- [ ] **Metalness** slider → 1.0 → See shiny metal
- [ ] **Roughness** slider → 0.1 → See mirror-like
- [ ] **Emissive** slider → 3.0 → See glowing
- [ ] All changes apply in real-time

### **4. Material Presets** (20 seconds)
- [ ] Click 🔥 **Fire** → Orange glow
- [ ] Click 💧 **Water** → Blue glass
- [ ] Click ✨ **Magic** → Purple iridescent
- [ ] Each preset transforms particles

### **5. Particle Size** (15 seconds)
- [ ] **Size** slider → 3.0 → Particles huge
- [ ] **Size** slider → 0.5 → Particles tiny
- [ ] Works in all render modes

### **6. Color Modes** (15 seconds)
- [ ] **Color Mode: Velocity** → Rainbow colors
- [ ] **Color Mode: Density** → Heatmap colors
- [ ] **Color Mode: Material** → Per-material colors
- [ ] Colors change smoothly

### **7. Console Check** (10 seconds)
- [ ] Open browser console (F12)
- [ ] No red errors
- [ ] Only blue/green info messages
- [ ] "🎨 Switching render mode" messages appear

---

## ✅ Expected Results

### **✓ Everything Works:**
- Visuals panel opens
- Mode switching is instant
- Material sliders work
- Presets apply correctly
- Size control works
- Color modes work
- No errors in console
- 60 FPS performance

---

## ❌ If Something Fails

### **Panel Doesn't Open:**
1. Check console for errors
2. Verify build succeeded: `npm run build`
3. Clear browser cache (Ctrl+Shift+Del)

### **Mode Switch Doesn't Work:**
1. Check console for "🎨 Switching render mode" message
2. Verify current mode in console
3. Check that `useLegacyRenderers = false` in APP.ts

### **Material Properties Don't Update:**
1. Ensure you're in **Mesh** mode
2. Check console for "🎨 Updated [property]" messages
3. Verify `meshRenderer.material` is public

### **Performance Issues:**
1. Check particle count (32k default)
2. Reduce count in Physics Panel
3. Switch to Point mode for maximum FPS
4. Check GPU usage (should be 40-75%)

---

## 🎯 Success = All Checkboxes ✅

If all tests pass:
- **🟢 System is working perfectly!**
- **🟢 Refactor was successful!**
- **🟢 Ready for production use!**

---

**Total Time:** ~2 minutes  
**Expected Outcome:** All features working with no errors! 🎉

