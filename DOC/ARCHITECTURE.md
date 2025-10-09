# Flow - Modular Architecture Documentation

## 🏗️ Architecture Overview

This document describes the refactored modular architecture of the Flow project, implementing a clean, TypeScript-first, TSL/WebGPU-native design.

## 🎯 Design Philosophy

### Core Principles
1. **Single Responsibility** - Each module has exactly one job
2. **Separation of Concerns** - UI, rendering, physics, configuration all isolated
3. **Dependency Injection** - Modules receive dependencies explicitly
4. **No Cross-Contamination** - Renderers don't know about cameras, physics doesn't know about UI
5. **Hot-Swappable** - Clear interfaces allow module replacement
6. **Type Safety** - Full TypeScript with strict mode
7. **TSL/WebGPU First** - All GPU code uses Three.js TSL

## 📦 Module Structure

### **Configuration Layer** (`config.ts`)

**Purpose**: Pure data schema and defaults

**Responsibilities**:
- Define TypeScript interfaces for all configuration
- Provide sensible defaults
- Calculate derived parameters (particle size, rest density)
- Zero side effects

**Key Interfaces**:
```typescript
FlowConfig {
  particles: ParticleConfig
  simulation: SimulationConfig
  rendering: RenderingConfig
  camera: CameraConfig
  bloom: BloomConfig
  environment: EnvironmentConfig
}
```

**Why separate**: Configuration is data, not behavior. Keeping it pure makes it serializable, testable, and reusable.

---

### **STAGE Module** - Rendering Infrastructure

#### `STAGE/stage.ts`

**Purpose**: WebGPU renderer and scene management

**Responsibilities**:
- Create and initialize WebGPU renderer
- Manage Three.js scene
- Load and configure HDR environment
- Apply environment settings
- Provide render methods

**Public API**:
```typescript
class Stage {
  renderer: THREE.WebGPURenderer
  scene: THREE.Scene
  
  async init(): Promise<void>
  applyEnvironmentConfig(config): void
  add(object): void
  remove(object): void
  resize(width, height): void
  async render(camera): Promise<void>
}
```

**Why separate**: Renderer setup is complex and should be isolated. Stage manages the "where things appear", not "what appears".

#### `STAGE/cameralens.ts`

**Purpose**: Camera and controls lifecycle

**Responsibilities**:
- Create PerspectiveCamera
- Setup OrbitControls
- Handle camera updates
- Manage aspect ratio

**Public API**:
```typescript
class CameraLens {
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  
  update(delta): void
  resize(aspect): void
  updateCameraParams(config): void
}
```

**Why separate**: Camera is its own concern. It's not part of the stage (which is passive), nor part of the app logic.

#### `STAGE/scenery.ts`

**Purpose**: Static scene elements

**Responsibilities**:
- Configure spotlights
- Load background geometry
- Load textures
- Setup shadows

**Public API**:
```typescript
class Lights {
  object: THREE.Object3D
  update(elapsed): void
}

class BackgroundGeometry {
  object: THREE.Object3D
  async init(): Promise<void>
}
```

**Why separate**: Lights and background are scene dressing. They're not part of the core rendering or physics systems.

---

### **POSTFX Module** - Post-Processing

#### `POSTFX/postfx.ts`

**Purpose**: Post-processing pipeline

**Responsibilities**:
- Setup MRT (Multiple Render Targets)
- Configure bloom pass
- Implement custom blend modes
- Enable/disable post-processing

**Public API**:
```typescript
class PostFX {
  enabled: boolean
  
  updateBloom(config): void
  async render(): Promise<void>
}
```

**Key Features**:
- MRT with bloom intensity per-object
- Custom screen blend: `(1-2b)*a² + 2ba`
- Can bypass for direct rendering

**Why separate**: Post-processing is an optional enhancement. Core rendering should work without it.

#### `POSTFX/PANELpostfx.ts`

**Purpose**: UI controls for rendering

**Responsibilities**:
- Bloom parameter controls
- Environment intensity
- Tone mapping exposure

**Public API**:
```typescript
class PostFXPanel {
  constructor(parentPane, config, callbacks)
}
```

**Why separate**: UI is separate from implementation. This panel could control any post-processing system.

---

### **PANEL Module** - User Interface

#### `PANEL/dashboard.ts`

**Purpose**: Base UI framework

**Responsibilities**:
- Initialize Tweakpane
- FPS monitoring
- Info panel with credits
- Provide folder creation API

**Public API**:
```typescript
class Dashboard {
  pane: Pane
  
  begin(): void  // FPS tracking start
  end(): void    // FPS tracking end
  createFolder(title, expanded): Folder
}
```

**Why separate**: UI framework is infrastructure. Other modules use it but don't need to know how it works.

---

### **PARTICLESYSTEM Module** - Physics and Rendering

#### `PARTICLESYSTEM/PHYSIC/mls-mpm.ts`

**Purpose**: MLS-MPM physics simulation (CLEAN - no UI/camera/bloom)

**Responsibilities**:
- Initialize particle and grid buffers
- Implement MLS-MPM compute kernels:
  - `clearGrid` - Reset grid
  - `p2g1` - Particle to grid (momentum)
  - `p2g2` - Particle to grid (stress)
  - `updateGrid` - Grid boundary conditions
  - `g2p` - Grid to particle (advection)
- Handle mouse interaction forces
- Update uniforms from config

**Public API**:
```typescript
class MlsMpmSimulator {
  particleBuffer: StructuredArray
  numParticles: number
  
  async init(): Promise<void>
  setMouseRay(origin, direction, pos): void
  async update(params, deltaTime, elapsed): Promise<void>
}
```

**Key Isolation**:
- ❌ No references to camera
- ❌ No references to bloom
- ❌ No references to UI
- ✅ Pure computational physics

**Why separate**: Physics is computation. It shouldn't know about rendering or UI. This makes it testable and reusable.

#### `PARTICLESYSTEM/RENDERER/meshrenderer.ts`

**Purpose**: Mesh-based particle rendering (CLEAN - no bloom logic)

**Responsibilities**:
- Create instanced geometry (rounded boxes)
- Setup material and TSL nodes
- Orient particles based on velocity
- Scale by density
- Apply colors from simulation

**Public API**:
```typescript
class MeshRenderer {
  object: THREE.Mesh
  
  update(particleCount, size): void
  setBloomIntensity(intensity): void
}
```

**Key Features**:
- Look-at matrix for particle orientation
- Depth-based ambient occlusion
- Shadow optimizations

**Key Isolation**:
- ❌ No bloom enable/disable logic (handled externally)
- ✅ Only `setBloomIntensity()` method

**Why separate**: Rendering is presentation. The renderer receives data (particle positions, colors) and displays it. It doesn't decide when to bloom.

#### `PARTICLESYSTEM/RENDERER/pointrenderer.ts`

**Purpose**: Lightweight point rendering

**Responsibilities**:
- Render particles as GPU points
- Minimal overhead

**Public API**:
```typescript
class PointRenderer {
  object: THREE.Points
  update(particleCount): void
}
```

**Why separate**: Alternative rendering mode. Easy to switch between mesh and points.

#### `PARTICLESYSTEM/PANELPHYSIC.ts`

**Purpose**: UI controls for particle system

**Responsibilities**:
- Particle count slider
- Size slider
- Simulation parameters (noise, speed, gravity)
- Gravity sensor setup

**Public API**:
```typescript
class PhysicPanel {
  constructor(parentPane, config, callbacks)
}
```

**Why separate**: UI for physics is separate from physics implementation.

#### Physics Helpers

**`physic/structuredarray.ts`**:
- GPU buffer management
- Alignment handling
- Atomic operations

**`physic/noise.ts`**:
- TSL noise functions
- Triangle wave primitives
- Fractal noise

**`physic/hsv.ts`**:
- TSL HSV to RGB conversion
- GPU-side color space math

**Why separate**: Reusable utilities used by physics. Small, focused, portable.

---

### **APP Module** - Orchestration

#### `APP.ts`

**Purpose**: Application lifecycle and module coordination

**Responsibilities**:
- Initialize all modules in correct order
- Coordinate module communication
- Update loop orchestration
- Event handling (mouse, resize)
- FPS tracking

**Public API**:
```typescript
class FlowApp {
  async init(progressCallback): Promise<void>
  async update(delta, elapsed): Promise<void>
  resize(width, height): void
  dispose(): void
}
```

**Initialization Order**:
1. Dashboard (UI framework)
2. Stage (renderer, scene, HDR)
3. Camera (camera + controls)
4. PostFX (bloom pipeline)
5. Scenery (lights, background)
6. Physics (MLS-MPM simulator)
7. Renderers (mesh, point)
8. Panels (controls)
9. Event listeners

**Update Loop Flow**:
1. Begin FPS tracking
2. Update camera controls
3. Update renderer visibility (mesh vs points)
4. Update renderer parameters
5. Update bloom intensity
6. Run physics simulation (if enabled)
7. Render (with or without post-processing)
8. End FPS tracking

**Why this design**: The app is the conductor. It knows about all modules but doesn't implement their logic. It just coordinates.

---

## 🔄 Data Flow

```
User Input (Mouse/UI)
    ↓
Config (updated by UI panels)
    ↓
APP (reads config)
    ↓
Physics Simulator (receives params)
    ↓
Particle Buffer (GPU)
    ↓
Renderers (read buffer, render)
    ↓
PostFX (optional bloom)
    ↓
Stage (final render to screen)
```

## 🎨 Module Dependencies

```
APP
├── config.ts (data only)
├── PANEL/dashboard.ts
├── STAGE/stage.ts
│   └── config.ts
├── STAGE/cameralens.ts
│   └── config.ts
├── STAGE/scenery.ts
├── POSTFX/postfx.ts
│   └── config.ts
├── POSTFX/PANELpostfx.ts
│   ├── PANEL/dashboard.ts (via Pane)
│   └── config.ts
├── PARTICLESYSTEM/PHYSIC/mls-mpm.ts
│   ├── physic/structuredarray.ts
│   ├── physic/noise.ts
│   ├── physic/hsv.ts
│   └── config.ts (types only)
├── PARTICLESYSTEM/RENDERER/meshrenderer.ts
│   └── PARTICLESYSTEM/PHYSIC/mls-mpm.ts (for particle buffer)
├── PARTICLESYSTEM/RENDERER/pointrenderer.ts
│   └── PARTICLESYSTEM/PHYSIC/mls-mpm.ts (for particle buffer)
└── PARTICLESYSTEM/PANELPHYSIC.ts
    ├── PANEL/dashboard.ts (via Pane)
    └── config.ts
```

**Key**: No circular dependencies, clear hierarchy.

## 🧪 Testing Strategy

Each module can be tested independently:

- **config.ts**: Unit test derived calculations
- **Stage**: Test WebGPU initialization, scene management
- **CameraLens**: Test camera positioning, controls
- **PostFX**: Test bloom parameters, MRT setup
- **MlsMpmSimulator**: Test compute kernels, particle updates
- **Renderers**: Test instance counts, transforms
- **Panels**: Test UI bindings, callbacks

## 🔮 Extension Points

### Adding a New Module

Example: Audio Reactivity

1. Create `AUDIO/soundreactivity.ts`:
```typescript
export class SoundReactivity {
  async init(): Promise<void>
  update(): AudioData
}
```

2. Create `AUDIO/PANELsoundreactivity.ts`:
```typescript
export class SoundReactivityPanel {
  constructor(parentPane, config, callbacks)
}
```

3. Wire up in `APP.ts`:
```typescript
this.soundReactivity = new SoundReactivity();
await this.soundReactivity.init();

const audioData = this.soundReactivity.update();
// Feed audioData to physics or renderers
```

4. Update `config.ts`:
```typescript
interface FlowConfig {
  // ... existing
  audio: AudioConfig;
}
```

That's it! The module is integrated.

## 📊 Performance Considerations

- **GPU-First**: All particle updates on GPU (compute shaders)
- **Instanced Rendering**: Single draw call for all particles
- **Shadow Optimization**: Separate geometry for shadow pass
- **Conditional Post-Processing**: Can bypass bloom for performance
- **Efficient Uniforms**: Minimal CPU→GPU transfers

## 🎓 Learning Resources

- **TSL**: [Three.js Shading Language](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language)
- **MLS-MPM**: [Material Point Method Paper](https://www.math.ucla.edu/~jteran/papers/SSCTS13.pdf)
- **WebGPU**: [WebGPU Fundamentals](https://webgpufundamentals.org/)

## 📝 Code Standards

- TypeScript strict mode
- JSDoc comments on public APIs
- Explicit return types
- No `any` types (except legacy TSL compatibility)
- Single file per class (SRP)
- Pure functions for utilities
- Explicit dispose methods

## 🎉 Benefits of This Architecture

1. **Maintainability**: Easy to find and fix issues
2. **Testability**: Each module can be tested in isolation
3. **Reusability**: Modules are portable to other projects
4. **Scalability**: Easy to add new features
5. **Type Safety**: Catch errors at compile time
6. **Performance**: Clean separation allows targeted optimization
7. **Documentation**: Structure is self-documenting

## 🤝 Contributing

When adding new features:
1. Identify the correct layer (STAGE, POSTFX, PARTICLESYSTEM, etc.)
2. Create a focused module with clear responsibility
3. Define TypeScript interfaces
4. Add panel controls if needed
5. Wire up in APP.ts
6. Document in this file

---

**Architecture designed for**: Maintainability, Modularity, Performance, Type Safety

