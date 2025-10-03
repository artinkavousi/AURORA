# 🎨 Visuals Panel - Quick Test Guide

## ✅ Test These Features Right Now!

### **1. Material Sliders (2 minutes)** ✅

**Steps:**
1. Open **🎨 Visuals** panel (top-right)
2. Expand **🎭 Material** section
3. Slide **Metalness** to 1.0
   - ✅ Particles become shiny/metallic
4. Slide **Roughness** to 0.1
   - ✅ Particles become mirror-like
5. Slide **Emissive** to 3.0
   - ✅ Particles start glowing

**Expected:** Particles change appearance in real-time! ✨

---

### **2. Quick Action Buttons (1 minute)** ✅

**Steps:**
1. In **⚡ Quick Actions** section
2. Click **🔥 Fire Preset**
   - ✅ Material changes to fire-like appearance
3. Click **💧 Water Preset**
   - ✅ Material changes to water-like appearance
4. Click **✨ Magic Preset**
   - ✅ Material changes to magical appearance

**Expected:** Each button instantly changes particle look! 🎭

---

### **3. Render Mode Switching (30 seconds)** ✅

**Steps:**
1. In **🖼️ Renderer** section
2. Change **Mode** to **Point**
   - ✅ Particles become simple dots (faster)
3. Change **Mode** back to **Mesh**
   - ✅ Particles become 3D boxes again

**Expected:** Render style changes instantly! 🎬

---

### **4. Color Mode (30 seconds)** ✅

**Steps:**
1. In **🌈 Color** section
2. Change **Mode** to **Density**
   - ✅ Particles show blue→red heatmap
3. Change **Mode** to **Material Type**
   - ✅ Particles show material-based colors
4. Change back to **Velocity (HSV)**
   - ✅ Particles show rainbow based on speed

**Expected:** Particle colors change! 🌈

---

### **5. Particle Size (30 seconds)** ✅

**Steps:**
1. In **✨ Particles** section
2. Slide **Size** to 3.0
   - ✅ Particles become larger
3. Slide **Size** to 0.5
   - ✅ Particles become smaller

**Expected:** Particle size changes! 📏

---

## 🎯 Recommended Test Sequence

### **Beautiful Water Effect:**
```
1. Click 💧 Water Preset
2. Set Transmission: 0.9
3. Set IOR: 1.33
4. Set Color Mode: Gradient (Density)
5. Select Gradient: OCEAN
```
**Result:** Transparent, water-like particles! 💧

### **Glowing Fire Effect:**
```
1. Click 🔥 Fire Preset
2. Set Emissive: 5.0
3. Set Metalness: 0.0
4. Set Color Mode: Velocity (HSV)
```
**Result:** Bright, glowing fire particles! 🔥

### **Metallic/Chrome Effect:**
```
1. Set Metalness: 1.0
2. Set Roughness: 0.0
3. Set Emissive: 0.0
4. Set Color Mode: Material Type
```
**Result:** Mirror-like chrome particles! ✨

---

## 🐛 If Something Doesn't Work

### **Panel Not Visible?**
- Refresh the page (Ctrl+R / Cmd+R)
- Check browser console for errors
- Look in top-right corner for collapsed panel

### **Sliders Don't Change Anything?**
- Make sure you're using **Mesh** render mode (not Point)
- Check that particles are visible
- Try clicking a Quick Action button first

### **Console Shows Errors?**
- Refresh the page
- Check `VISUALS_PANEL_STATUS.md` for known issues
- TypeScript server might need restart

---

## 📊 Performance Check

**Fast Mode (Point):**
- Click **🎬 Performance Mode**
- Expect: 60 FPS, simple dots

**Quality Mode (Mesh):**
- Click **💎 Quality Mode**
- Expect: 30-60 FPS, 3D geometry

---

## ✅ Features That Work

| Feature | Status | Test Time |
|---------|--------|-----------|
| Material Sliders | ✅ Works | 2 min |
| Quick Actions | ✅ Works | 1 min |
| Render Mode Switch | ✅ Works | 30 sec |
| Color Mode | ✅ Works | 30 sec |
| Particle Size | ✅ Works | 30 sec |
| Material Presets | ✅ Works | 1 min |
| Performance Mode | ✅ Works | 10 sec |
| Quality Mode | ✅ Works | 10 sec |

**Total Test Time:** ~5 minutes for all features! ⚡

---

## 🚀 Next: Advanced Features (Phase 2)

These will be completed in the next phase:
- ⏳ Sprite textures (billboards)
- ⏳ Trail motion history
- ⏳ Color gradient shaders
- ⏳ Custom mesh import

---

**Have Fun!** 🎨✨

Try combining different settings to create unique effects!

