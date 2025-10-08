# ⚡ Adaptive Time Stepping Implementation

**Goal**: Dynamically adjust timestep based on particle velocities for optimal stability and performance

---

## 📊 Problem Analysis

### Current Implementation
```typescript
dt = speed * 0.016  // Fixed timestep based on user speed setting
```

**Issues**:
- Too large dt → instability, particles tunneling
- Too small dt → wasted computation, slower than necessary
- One-size-fits-all doesn't adapt to actual physics

### CFL Condition
**Courant-Friedrichs-Lewy Condition**: Particles shouldn't move more than one grid cell per timestep

```
CFL = (v_max * dt) / grid_spacing

Safe: CFL < 1.0
Ideal: CFL ≈ 0.5-0.8
```

---

## 🎯 Solution: Adaptive Timestep

### Algorithm
1. **Find Max Velocity**: Scan all particles, find fastest one
2. **Calculate Safe DT**: `dt_safe = CFL_target * grid_spacing / v_max`
3. **Clamp DT**: `dt = clamp(dt_safe, dt_min, dt_max)`
4. **Use Adaptive DT**: Update simulation with safe timestep

### Benefits
- ✅ **Stability**: Never exceed CFL limit
- ✅ **Performance**: Use larger dt when safe
- ✅ **Quality**: Smoother motion at high speeds

---

## 🔧 Implementation Plan

### Phase 1: Max Velocity Reduction
**Challenge**: Find max across 32K+ particles on GPU

**Solution**: Parallel reduction
```glsl
// Pass 1: Local max per workgroup
shared float localMax[256];
localMax[threadIdx] = length(particle.velocity);
barrier();
// Reduce within workgroup
for (stride = 128; stride > 0; stride /= 2) {
  if (threadIdx < stride)
    localMax[threadIdx] = max(localMax[threadIdx], localMax[threadIdx + stride]);
}

// Pass 2: Global max (CPU-side, read back single value)
```

**Simpler Alternative**: Sample subset of particles
```typescript
// Check every 64th particle (512 samples for 32K particles)
// Good enough estimate, much faster
```

### Phase 2: Adaptive DT Calculation
```typescript
const v_max = getMaxVelocity();  // From reduction
const grid_spacing = 1.0;
const CFL_target = 0.7;  // Conservative
const dt_safe = CFL_target * grid_spacing / (v_max + 1e-6);
const dt_min = 0.001;
const dt_max = 0.1;
const dt_adaptive = clamp(dt_safe, dt_min, dt_max);
```

### Phase 3: User Control
```typescript
config.simulation.adaptiveTimestep: boolean
config.simulation.cflTarget: number  // 0.3-1.0
```

---

## 📈 Expected Results

### Stability
- **Before**: Can explode at high speeds
- **After**: Always stable, auto-adjusts

### Performance
- **Slow motion**: Larger dt → fewer substeps needed
- **Fast motion**: Smaller dt → maintain stability
- **Optimal**: Always using best possible dt

### Use Cases
```
Low velocity (v < 5):  dt = 0.016 (max)
Medium velocity (v ≈ 20): dt = 0.008 (adaptive)
High velocity (v > 50):  dt = 0.003 (clamped to min)
```

---

## 🎛️ Control Panel

```typescript
advFolder.addBinding(config.simulation, "adaptiveTimestep", {
  label: "🎯 Adaptive DT",
});

advFolder.addBinding(config.simulation, "cflTarget", {
  label: "CFL Target",
  min: 0.3,
  max: 1.0,
  step: 0.05,
});
```

---

## ✅ Success Criteria

- [ ] Max velocity calculation implemented
- [ ] CFL-based dt calculation added
- [ ] Timestep clamping implemented
- [ ] UI controls added
- [ ] No instability at any speed
- [ ] Performance improved at low speeds
- [ ] Documentation complete

Let's implement! ⚡

