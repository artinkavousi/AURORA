# 🔌 Particle System Integration Guide

## Quick Start Integration

This guide shows how to integrate the new particle physics systems into your existing app.

---

## 📦 Step 1: Import New Systems in APP.ts

```typescript
// Add to imports in APP.ts
import { MaterialType, MaterialManager } from './PARTICLESYSTEM/physic/materials';
import { ForceFieldManager } from './PARTICLESYSTEM/physic/forcefields';
import { ParticleEmitterManager } from './PARTICLESYSTEM/physic/emitters';
import { PhysicPanel, ColorMode } from './PARTICLESYSTEM/PANELPHYSIC';
```

---

## ⚙️ Step 2: Update mls-mpm.ts Particle Buffer

### Add New Fields to Particle Structure

```typescript
// In MlsMpmSimulator constructor, update particleStruct:
const particleStruct = {
  position: { type: 'vec3' as const },
  density: { type: 'float' as const },
  velocity: { type: 'vec3' as const },
  mass: { type: 'float' as const },
  C: { type: 'mat3' as const },
  direction: { type: 'vec3' as const },
  color: { type: 'vec3' as const },
  
  // NEW FIELDS
  materialType: { type: 'int' as const },
  age: { type: 'float' as const },
  lifetime: { type: 'float' as const },
};
```

### Initialize Material Type

```typescript
// In particle initialization loop
for (let i = 0; i < config.maxParticles; i++) {
  // ... existing position/mass initialization ...
  
  // NEW: Initialize material type
  this.particleBuffer.set(i, "materialType", MaterialType.FLUID);
  this.particleBuffer.set(i, "age", 0);
  this.particleBuffer.set(i, "lifetime", 999999); // Infinite by default
}
```

---

## 🌀 Step 3: Add Force Fields to mls-mpm.ts

### Add Force Field Uniforms

```typescript
// In initUniforms() method
private initUniforms(): void {
  // ... existing uniforms ...
  
  // NEW: Force field uniforms
  this.uniforms.fieldCount = uniform(0, "int");
  this.uniforms.fieldTypes = uniform(new Int32Array(8));
  this.uniforms.fieldPositions = uniform(new Float32Array(8 * 3));
  this.uniforms.fieldStrengths = uniform(new Float32Array(8));
  this.uniforms.fieldRadii = uniform(new Float32Array(8));
  this.uniforms.fieldFalloffs = uniform(new Int32Array(8));
  this.uniforms.fieldDirections = uniform(new Float32Array(8 * 3));
  this.uniforms.fieldAxes = uniform(new Float32Array(8 * 3));
  this.uniforms.fieldTurbScales = uniform(new Float32Array(8));
  this.uniforms.fieldNoiseSpeeds = uniform(new Float32Array(8));
}
```

### Update G2P Kernel with Force Fields

```typescript
// In G2P kernel, after grid interpolation and before wall collision
import { calculateForceFieldForce } from './forcefields';

// Inside the G2P kernel Fn()
// After: particleVelocity.addAssign(weightedVelocity);

// NEW: Apply force fields
Loop({ start: 0, end: this.uniforms.fieldCount, type: 'int', name: 'fieldIdx' }, ({ fieldIdx }) => {
  const fieldType = this.uniforms.fieldTypes.element(fieldIdx);
  const fieldPos = vec3(
    this.uniforms.fieldPositions.element(fieldIdx.mul(3).add(0)),
    this.uniforms.fieldPositions.element(fieldIdx.mul(3).add(1)),
    this.uniforms.fieldPositions.element(fieldIdx.mul(3).add(2))
  );
  const fieldDir = vec3(
    this.uniforms.fieldDirections.element(fieldIdx.mul(3).add(0)),
    this.uniforms.fieldDirections.element(fieldIdx.mul(3).add(1)),
    this.uniforms.fieldDirections.element(fieldIdx.mul(3).add(2))
  );
  const fieldAxis = vec3(
    this.uniforms.fieldAxes.element(fieldIdx.mul(3).add(0)),
    this.uniforms.fieldAxes.element(fieldIdx.mul(3).add(1)),
    this.uniforms.fieldAxes.element(fieldIdx.mul(3).add(2))
  );
  const strength = this.uniforms.fieldStrengths.element(fieldIdx);
  const radius = this.uniforms.fieldRadii.element(fieldIdx);
  const falloff = this.uniforms.fieldFalloffs.element(fieldIdx);
  const turbScale = this.uniforms.fieldTurbScales.element(fieldIdx);
  const noiseSpeed = this.uniforms.fieldNoiseSpeeds.element(fieldIdx);
  
  const fieldForce = calculateForceFieldForce(
    particlePosition,
    fieldType,
    fieldPos,
    fieldDir,
    fieldAxis,
    strength,
    radius,
    falloff,
    turbScale,
    noiseSpeed
  );
  
  particleVelocity.addAssign(fieldForce.mul(this.uniforms.dt));
});
```

### Add Method to Update Force Fields

```typescript
// Add to MlsMpmSimulator class
public updateForceFields(forceFieldManager: ForceFieldManager): void {
  forceFieldManager.updateUniforms();
  
  // Copy uniforms to simulator
  this.uniforms.fieldCount.value = forceFieldManager.fieldCountUniform.value;
  this.uniforms.fieldTypes.value = forceFieldManager.fieldTypesUniform.value;
  this.uniforms.fieldPositions.value = forceFieldManager.fieldPositionsUniform.value;
  this.uniforms.fieldStrengths.value = forceFieldManager.fieldStrengthsUniform.value;
  this.uniforms.fieldRadii.value = forceFieldManager.fieldRadiiUniform.value;
  this.uniforms.fieldFalloffs.value = forceFieldManager.fieldFalloffsUniform.value;
  this.uniforms.fieldDirections.value = forceFieldManager.fieldDirectionsUniform.value;
  this.uniforms.fieldAxes.value = forceFieldManager.fieldAxesUniform.value;
  this.uniforms.fieldTurbScales.value = forceFieldManager.fieldTurbScalesUniform.value;
  this.uniforms.fieldNoiseSpeeds.value = forceFieldManager.fieldNoiseSpeedsUniform.value;
}
```

---

## 💫 Step 4: Add Emitter System to APP.ts

### Update FlowApp.update() Method

```typescript
// In FlowApp.update() method, before physics simulation
public async update(delta: number, elapsed: number): Promise<void> {
  this.dashboard.begin();
  this.camera.update(delta);
  this.lights.update(elapsed);
  
  // NEW: Update emitters and spawn particles
  const emittedParticles = this.physicPanel.emitterManager.update(delta);
  
  // TODO: Add logic to inject emitted particles into simulation
  // This requires adding a spawn queue to mls-mpm.ts
  
  // ... rest of update loop ...
}
```

---

## 🎨 Step 5: Update Renderers with Material Colors

### Update meshrenderer.ts Color Node

```typescript
// Import at top
import { getMaterialColor } from '../physic/materials';

// In MeshRenderer constructor, update colorNode
const particleMaterialType = particle.get("materialType");

this.material.colorNode = Fn(() => {
  const matColor = getMaterialColor(particleMaterialType);
  const densityColor = particle.get("color");
  
  // Mix between material color and density color
  const colorMode = uniform(0, "int"); // You'll need to pass this in
  const result = vec3().toVar();
  
  If(colorMode.equal(int(ColorMode.MATERIAL)), () => {
    result.assign(matColor);
  }).Else(() => {
    result.assign(densityColor);
  });
  
  return result;
})();
```

---

## 🎛️ Step 6: Wire Up Panel Callbacks

### In APP.ts, update PhysicPanel initialization

```typescript
// In FlowApp.init()
this.physicPanel = new PhysicPanel(this.dashboard.pane, this.config, {
  onParticleCountChange: (count) => {
    // Already handled
  },
  onSizeChange: (size) => {
    // Already handled
  },
  onSimulationChange: (simConfig) => {
    // Already handled
  },
  
  // NEW CALLBACKS
  onMaterialChange: () => {
    // Update current material type in simulation
    const matType = this.physicPanel.getCurrentMaterialType();
    // TODO: Set material type for new particles
    console.log("Material changed to:", matType);
  },
  
  onForceFieldsChange: () => {
    // Update force fields in simulator
    this.mlsMpmSim.updateForceFields(this.physicPanel.forceFieldManager);
  },
  
  onEmittersChange: () => {
    // Emitters update automatically in update loop
    console.log("Emitters updated");
  },
});
```

---

## 🧪 Step 7: Material-Specific Physics (Optional)

### Update P2G2 Kernel for Material-Specific Stress

```typescript
// In P2G2 kernel, replace stress calculation
import { calculateMaterialStress } from './materials';

// Replace existing stress calculation with:
const particleMaterialType = this.particleBuffer.element(instanceIndex).get('materialType');
const stress = calculateMaterialStress(
  particleMaterialType,
  pressure,
  strain,
  density,
  this.uniforms.restDensity
);

// Continue with existing momentum transfer
```

---

## ✅ Quick Testing Checklist

After integration, test these scenarios:

### 1. Material System
- [ ] Can select different materials in panel
- [ ] Material affects particle behavior
- [ ] Material colors are visible

### 2. Force Fields
- [ ] Can add force fields via panel
- [ ] Force fields affect particle motion
- [ ] Multiple force fields work simultaneously
- [ ] Preset force fields work (tornado, vortex, etc.)

### 3. Emitters
- [ ] Can add emitters via panel
- [ ] Emitters spawn particles
- [ ] Different emission patterns work
- [ ] Preset emitters work (fountain, explosion, etc.)

### 4. Scene Presets
- [ ] Water fountain preset works
- [ ] Snow storm preset works
- [ ] Tornado preset works
- [ ] Explosion preset works
- [ ] Galaxy preset works

---

## 🚨 Common Issues & Solutions

### Issue 1: Particles Not Affected by Force Fields
**Solution:** Ensure `updateForceFields()` is called in APP update loop and uniforms are properly connected.

### Issue 2: Emitted Particles Not Appearing
**Solution:** Implement particle spawn queue in mls-mpm.ts to inject new particles.

### Issue 3: Material Colors Not Showing
**Solution:** Update renderer colorNode to use `getMaterialColor()` function.

### Issue 4: Performance Drop
**Solution:** Reduce max force fields to 4, or reduce particle count.

---

## 📊 Performance Tips

1. **Force Fields:** Keep count ≤ 4 for best performance
2. **Emitters:** Limit emission rate to 500 particles/sec per emitter
3. **Materials:** Material switching is free (GPU-side)
4. **Particle Count:** Test with 8K-16K particles on desktop, 4K on mobile

---

## 🎯 Minimal Integration (Just to See It Work)

If you want to see the new systems working ASAP:

```typescript
// In APP.ts init(), after existing physicPanel setup
this.physicPanel.forceFieldManager.addPreset('TORNADO');
this.physicPanel.emitterManager.addPreset('FOUNTAIN');

// In APP.ts update(), add this line
this.mlsMpmSim.updateForceFields(this.physicPanel.forceFieldManager);
```

This will add a tornado force field that immediately affects existing particles!

---

## 📚 Next Steps

1. Follow steps 1-3 for basic force field integration
2. Test with tornado preset
3. Add material-specific physics (Step 7)
4. Implement emitter particle injection
5. Update renderers with material colors

**Estimated Integration Time:** 2-3 hours

---

Good luck! 🚀

