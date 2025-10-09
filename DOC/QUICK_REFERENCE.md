# Flow - Quick Reference Guide

## 🚀 Getting Started

```bash
npm install        # Install dependencies
npm run dev        # Start development server (http://localhost:5173)
npm run build      # Build for production
npm run preview    # Preview production build
```

## 📁 Project Structure

```
flow/
├── src/
│   ├── config.ts                          # Configuration schema
│   ├── APP.ts                             # Main orchestrator
│   ├── STAGE/
│   │   ├── stage.ts                       # Renderer + scene + HDR
│   │   ├── cameralens.ts                  # Camera + controls
│   │   └── scenery.ts                     # Lights + background
│   ├── POSTFX/
│   │   ├── postfx.ts                      # Bloom pipeline
│   │   └── PANELpostfx.ts                 # Rendering controls
│   ├── PANEL/
│   │   └── dashboard.ts                   # UI framework
│   └── PARTICLESYSTEM/
│       ├── PHYSIC/
│       │   └── mls-mpm.ts                 # Physics simulator
│       ├── physic/
│       │   ├── structuredarray.ts         # GPU buffer helper
│       │   ├── noise.ts                   # TSL noise
│       │   └── hsv.ts                     # TSL color conversion
│       ├── RENDERER/
│       │   ├── meshrenderer.ts            # Mesh renderer
│       │   └── pointrenderer.ts           # Point renderer
│       └── PANELPHYSIC.ts                 # Particle controls
├── index.js                               # Entry point
├── tsconfig.json                          # TypeScript config
└── vite.config.js                         # Vite config
```

## 🎯 Module Quick Reference

### Configuration (`config.ts`)
```typescript
import { defaultConfig, updateParticleParams } from './config';

const config = { ...defaultConfig };
config.particles.count = 8192;
updateParticleParams(config);  // Updates derived params
```

### Stage (`STAGE/stage.ts`)
```typescript
import { Stage } from './STAGE/stage';

const stage = new Stage({ shadowMap: true });
await stage.init();
stage.applyEnvironmentConfig(config.environment);
stage.add(myObject);
await stage.render(camera);
```

### Camera (`STAGE/cameralens.ts`)
```typescript
import { CameraLens } from './STAGE/cameralens';

const camera = new CameraLens(domElement, config.camera, {
  maxDistance: 2.0,
  minPolarAngle: 0.2 * Math.PI
});
camera.update(delta);
camera.resize(aspect);
```

### Post-Processing (`POSTFX/postfx.ts`)
```typescript
import { PostFX } from './POSTFX/postfx';

const postFX = new PostFX(renderer, scene, camera, {
  enabled: true,
  bloom: { threshold: 0.001, strength: 0.94, radius: 0.8 }
});
postFX.updateBloom({ strength: 1.2 });
await postFX.render();
```

### Physics (`PARTICLESYSTEM/PHYSIC/mls-mpm.ts`)
```typescript
import { MlsMpmSimulator } from './PARTICLESYSTEM/PHYSIC/mls-mpm';

const sim = new MlsMpmSimulator(renderer, {
  maxParticles: 131072,
  gridSize: new THREE.Vector3(64, 64, 64)
});
await sim.init();
sim.setMouseRay(origin, direction, pos);
await sim.update(params, deltaTime, elapsed);
```

### Renderers (`PARTICLESYSTEM/RENDERER/`)
```typescript
import { MeshRenderer } from './PARTICLESYSTEM/RENDERER/meshrenderer';
import { PointRenderer } from './PARTICLESYSTEM/RENDERER/pointrenderer';

const meshRenderer = new MeshRenderer(simulator, {
  metalness: 0.9,
  roughness: 0.5
});
meshRenderer.update(particleCount, size);
meshRenderer.setBloomIntensity(1);

const pointRenderer = new PointRenderer(simulator);
pointRenderer.update(particleCount);
```

### UI Dashboard (`PANEL/dashboard.ts`)
```typescript
import { Dashboard } from './PANEL/dashboard';

const dashboard = new Dashboard({ showInfo: true, showFPS: true });
dashboard.begin();  // Start frame
// ... render ...
dashboard.end();    // End frame
```

### Main App (`APP.ts`)
```typescript
import { FlowApp } from './APP';

const app = new FlowApp(renderer);
await app.init((frac) => console.log(`Loading ${frac * 100}%`));
app.resize(width, height);
await app.update(delta, elapsed);
app.dispose();
```

## 🔧 Common Tasks

### Change Particle Count
```typescript
config.particles.count = 16384;
updateParticleParams(config);
```

### Toggle Bloom
```typescript
config.rendering.bloom = !config.rendering.bloom;
```

### Switch Renderer
```typescript
config.rendering.points = true;  // Use point renderer
config.rendering.points = false; // Use mesh renderer
```

### Update Gravity
```typescript
config.simulation.gravityType = 1;  // 0=back, 1=down, 2=center, 3=device
```

### Adjust Bloom
```typescript
postFX.updateBloom({
  threshold: 0.01,
  strength: 1.5,
  radius: 1.0
});
```

## 🎨 TSL Examples

### Custom Color Node
```typescript
material.colorNode = Fn(() => {
  return vec3(1, 0, 0);  // Red
})();
```

### Noise-based Position
```typescript
const noise = triNoise3Dvec(position, time, 0.1);
position.addAssign(noise);
```

### HSV to RGB
```typescript
const color = hsvtorgb(vec3(hue, saturation, value));
```

## 🐛 Debugging

### Enable WebGPU Logging
```typescript
// In Stage constructor
this.renderer = new THREE.WebGPURenderer({ 
  trackTimestamp: true 
});
```

### Check Particle Count
```typescript
console.log('Active particles:', simulator.numParticles);
console.log('Buffer size:', simulator.particleBuffer.length);
```

### Monitor FPS
```typescript
// FPS graph automatically shown in dashboard
// Access via dashboard.fpsGraph
```

### Verify Compute Shaders
```typescript
// Check kernel execution
console.log('p2g1 count:', simulator.kernels.p2g1.count);
```

## 📊 Performance Tips

1. **Reduce particle count** for better FPS
   ```typescript
   config.particles.count = 4096;
   ```

2. **Disable bloom** if not needed
   ```typescript
   config.rendering.bloom = false;
   ```

3. **Use point renderer** for maximum performance
   ```typescript
   config.rendering.points = true;
   ```

4. **Lower simulation speed** to reduce compute load
   ```typescript
   config.simulation.speed = 0.5;
   ```

5. **Pause simulation** when not needed
   ```typescript
   config.simulation.run = false;
   ```

## 🔍 Type Information

All modules are fully typed. Use your IDE's autocomplete:

```typescript
// Hover over any type to see definition
const config: FlowConfig = defaultConfig;
const stage: Stage = new Stage();
const camera: CameraLens = new CameraLens(...);
```

## 📦 Adding Custom Modules

1. Create module file: `src/MYMODULE/myfeature.ts`
2. Define interface and class
3. Add to `APP.ts` initialization
4. Update `config.ts` if needed
5. Create panel in `PANEL/` if UI needed

Example:
```typescript
// src/MYMODULE/myfeature.ts
export class MyFeature {
  async init(): Promise<void> { /* ... */ }
  update(delta: number): void { /* ... */ }
  dispose(): void { /* ... */ }
}

// src/APP.ts
private myFeature!: MyFeature;

async init() {
  // ... other modules ...
  this.myFeature = new MyFeature();
  await this.myFeature.init();
}

async update(delta, elapsed) {
  // ...
  this.myFeature.update(delta);
}
```

## 🎓 Learning Path

1. **Start**: Read `config.ts` to understand data structures
2. **Basics**: Study `STAGE/stage.ts` for rendering fundamentals
3. **Physics**: Dive into `PARTICLESYSTEM/PHYSIC/mls-mpm.ts`
4. **TSL**: Explore `PARTICLESYSTEM/physic/noise.ts` for GPU shaders
5. **Integration**: See how `APP.ts` coordinates everything
6. **UI**: Check `PANEL/dashboard.ts` for control panels

## 🔗 Key Dependencies

- **three** (^0.176.0) - WebGPU rendering
- **tweakpane** (^4.0.5) - UI controls
- **@tweakpane/plugin-essentials** (^0.2.1) - FPS graph
- **is-mobile** (^5.0.0) - Device detection

## 📝 Configuration Schema

```typescript
FlowConfig {
  particles: {
    count: number;
    maxCount: number;
    size: number;
    actualSize: number;  // Derived
  };
  simulation: {
    run: boolean;
    noise: number;
    speed: number;
    stiffness: number;
    restDensity: number;  // Derived
    density: number;
    dynamicViscosity: number;
    gravityType: number;
  };
  rendering: {
    bloom: boolean;
    points: boolean;
  };
  camera: {
    fov: number;
    near: number;
    far: number;
    position: Vector3;
    targetPosition: Vector3;
  };
  bloom: {
    threshold: number;
    strength: number;
    radius: number;
  };
  environment: {
    backgroundRotation: Euler;
    environmentRotation: Euler;
    environmentIntensity: number;
    toneMappingExposure: number;
  };
}
```

## 🎉 Enjoy!

This modular architecture makes the codebase:
- ✅ Easy to understand
- ✅ Easy to extend
- ✅ Easy to test
- ✅ Easy to maintain
- ✅ Production-ready

For detailed documentation, see `ARCHITECTURE.md`.

