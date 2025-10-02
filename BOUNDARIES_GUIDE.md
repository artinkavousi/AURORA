# 🔲 Particle Boundaries System Guide

## Overview

The **ParticleBoundaries** module provides a comprehensive, self-contained system for managing particle container boundaries, walls, collision detection, and visual representation in the Flow particle system.

## 📁 Module Location

```
flow/src/PARTICLESYSTEM/physic/boundaries.ts
```

## ✨ Features

- ✅ **Self-contained ESM module** - Single file, zero external configuration
- ✅ **Multiple boundary shapes** - Box, Sphere, Cylinder, Custom mesh
- ✅ **Flexible collision modes** - Reflect, Clamp, Wrap, Kill
- ✅ **TSL GPU integration** - Generates TSL code for compute shaders
- ✅ **CPU-side collision detection** - For emitters and CPU-based systems
- ✅ **Visual representation** - Optional mesh rendering with materials
- ✅ **Customizable physics** - Wall stiffness, restitution, friction
- ✅ **Dynamic boundaries** - Support for animated/moving boundaries

## 🎯 Architecture

### Boundary Shapes

```typescript
enum BoundaryShape {
  BOX = 'box',        // Axis-aligned box container
  SPHERE = 'sphere',  // Spherical container
  CYLINDER = 'cylinder', // Cylindrical container
  CUSTOM = 'custom',  // Custom mesh boundary
}
```

### Collision Modes

```typescript
enum CollisionMode {
  REFLECT = 'reflect', // Bounce off walls with restitution
  CLAMP = 'clamp',     // Stop at walls (no bounce)
  WRAP = 'wrap',       // Wrap around to opposite side
  KILL = 'kill',       // Delete particles at boundary
}
```

## 🚀 Usage

### Basic Setup

```typescript
import { ParticleBoundaries, BoundaryShape, CollisionMode } from './PARTICLESYSTEM/physic/boundaries';

// Create boundaries
const boundaries = new ParticleBoundaries({
  shape: BoundaryShape.BOX,
  gridSize: new THREE.Vector3(64, 64, 64),
  wallThickness: 3,
  wallStiffness: 0.3,
  collisionMode: CollisionMode.REFLECT,
  restitution: 0.3,  // Bounciness
  friction: 0.1,     // Wall friction
  visualize: true,   // Show boundary mesh
});

// Initialize (loads geometry/textures)
await boundaries.init();

// Add to scene
scene.add(boundaries.object);

// Connect to physics simulator
mlsMpmSim.setBoundaries(boundaries);
```

### Advanced Configuration

```typescript
// Sphere boundary
const sphereBoundaries = new ParticleBoundaries({
  shape: BoundaryShape.SPHERE,
  gridSize: new THREE.Vector3(64, 64, 64),
  wallThickness: 2,
  wallStiffness: 0.5,
  collisionMode: CollisionMode.REFLECT,
  restitution: 0.8,  // Very bouncy
  friction: 0.0,     // Frictionless
  visualize: true,
});

// Custom mesh boundary
const customBoundaries = new ParticleBoundaries({
  shape: BoundaryShape.CUSTOM,
  customMesh: myCustomMesh,
  wallThickness: 3,
  wallStiffness: 0.3,
  visualize: true,
});

// Wrap-around boundaries (torus topology)
const wrapBoundaries = new ParticleBoundaries({
  shape: BoundaryShape.BOX,
  gridSize: new THREE.Vector3(64, 64, 64),
  collisionMode: CollisionMode.WRAP,
  visualize: false,  // Invisible boundaries
});
```

## 🔧 API Reference

### Constructor

```typescript
constructor(config: BoundaryConfig)
```

**BoundaryConfig:**
- `shape?: BoundaryShape` - Boundary shape type (default: BOX)
- `gridSize?: Vector3` - Grid dimensions (default: 64x64x64)
- `wallThickness?: number` - Wall thickness in grid units (default: 3)
- `wallStiffness?: number` - Collision response strength (default: 0.3)
- `collisionMode?: CollisionMode` - How particles interact with walls (default: REFLECT)
- `restitution?: number` - Bounciness coefficient 0-1 (default: 0.3)
- `friction?: number` - Wall friction coefficient 0-1 (default: 0.1)
- `visualize?: boolean` - Show boundary mesh (default: true)
- `customMesh?: Mesh` - Custom boundary mesh (for CUSTOM shape)

### Methods

#### `async init(): Promise<void>`
Initialize boundary geometry and textures. Must be called before use.

#### `getTSLCollisionCode(): Function`
Returns a TSL function for GPU-based collision detection in compute shaders.

**Usage in compute kernel:**
```typescript
const boundaryCollision = boundaries.getTSLCollisionCode();

// In your compute shader
boundaryCollision(particlePosition, particleVelocity);
```

#### `checkCollision(position: Vector3, velocity: Vector3, dt: number): CollisionResult`
CPU-side collision detection for a single particle.

**Returns:**
```typescript
{
  collided: boolean,
  normal: Vector3,
  penetrationDepth: number
}
```

#### `applyCollisionResponse(position: Vector3, velocity: Vector3, dt: number): void`
Apply collision response to particle velocity (CPU-side).

#### `update(elapsed: number): void`
Update boundaries (for animated/dynamic boundaries).

#### `setVisible(visible: boolean): void`
Show/hide boundary visualization.

#### `setGridSize(gridSize: Vector3): void`
Update boundary dimensions dynamically.

#### `dispose(): void`
Clean up resources (geometry, materials, textures).

### Properties

- `object: Object3D` - Three.js object containing boundary mesh
- `gridSize: Vector3` - Current grid dimensions
- `min: Vector3` - Minimum boundary position (in grid space)
- `max: Vector3` - Maximum boundary position (in grid space)
- `wallThickness: number` - Wall thickness
- `wallStiffness: number` - Collision response strength
- `shape: BoundaryShape` - Current boundary shape
- `collisionMode: CollisionMode` - Current collision mode

## 🎨 Visual Customization

### Box Boundary
The default box boundary uses:
- **Model:** `boxSlightlySmooth.obj`
- **Material:** Concrete textures with TSL nodes
- **Features:** Depth fade AO, tiled UVs, shadows

### Sphere/Cylinder Boundaries
- Semi-transparent visualization
- Back-side rendering only
- No textures (simple material)

### Custom Boundaries
Provide your own mesh with custom materials.

## 🔄 Integration with Physics

The boundaries module integrates seamlessly with the MLS-MPM simulator:

```typescript
// Create simulator
const mlsMpmSim = new MlsMpmSimulator(renderer, {
  maxParticles: 100000,
  gridSize: new THREE.Vector3(64, 64, 64),
});

// Create boundaries
const boundaries = new ParticleBoundaries({
  gridSize: mlsMpmSim.gridSize,
  wallThickness: 3,
  wallStiffness: 0.3,
});

// Connect them
mlsMpmSim.setBoundaries(boundaries);

// Boundaries are now used for collision detection
```

## 📊 Performance Considerations

### GPU-Based Collision (Recommended)
- Uses TSL compute shaders
- Handles millions of particles
- Zero CPU overhead
- Integrated into particle update kernel

### CPU-Based Collision
- Useful for emitters and special effects
- Per-particle queries
- Lower particle counts (<10k)
- Good for prototyping

## 🎮 Use Cases

### Standard Box Container
```typescript
// Default physics sandbox
const boundaries = new ParticleBoundaries({
  shape: BoundaryShape.BOX,
  wallStiffness: 0.3,
  restitution: 0.2,
});
```

### Bouncy Sphere
```typescript
// Marble/ball pit simulation
const boundaries = new ParticleBoundaries({
  shape: BoundaryShape.SPHERE,
  restitution: 0.9,
  friction: 0.0,
});
```

### Infinite Torus (Wrap-around)
```typescript
// Seamless looping particles
const boundaries = new ParticleBoundaries({
  shape: BoundaryShape.BOX,
  collisionMode: CollisionMode.WRAP,
  visualize: false,
});
```

### Particle Emitter Boundary
```typescript
// Fountain with boundaries
const boundaries = new ParticleBoundaries({
  shape: BoundaryShape.CYLINDER,
  wallStiffness: 0.5,
  restitution: 0.1,
});

// Use CPU-side collision for emitted particles
emitter.onEmit = (particle) => {
  const collision = boundaries.checkCollision(
    particle.position,
    particle.velocity,
    dt
  );
  if (collision.collided) {
    boundaries.applyCollisionResponse(
      particle.position,
      particle.velocity,
      dt
    );
  }
};
```

## 🔮 Future Enhancements

Potential additions to the boundaries system:

- **SDF-based collision** - Signed distance fields for complex shapes
- **Dynamic obstacles** - Moving/animated boundaries
- **Multiple boundaries** - Nested or segmented containers
- **Portal boundaries** - Teleportation between regions
- **Force fields at boundaries** - Wind, attractors at walls
- **Temperature boundaries** - Heat sources/sinks
- **Material-specific boundaries** - Different response per material type

## 🐛 Troubleshooting

### Particles escaping boundaries
- Increase `wallStiffness` (try 0.5-1.0)
- Decrease simulation `dt` timestep
- Check `gridSize` matches simulator

### Poor collision response
- Adjust `restitution` for bounciness
- Increase `wallThickness` (3-5 units)
- Use `CollisionMode.CLAMP` for sticky walls

### Performance issues
- Disable `visualize` if not needed
- Use GPU-based collision (TSL)
- Simplify custom meshes

### Boundary not visible
- Check `visualize: true` in config
- Ensure `init()` was called
- Verify object added to scene

## 📚 Related Modules

- **mls-mpm.ts** - Physics simulator that uses boundaries
- **emitters.ts** - Particle emitters with boundary checks
- **forcefields.ts** - Force fields that respect boundaries
- **scenery.ts** - Scene lighting (boundary visuals moved here)

## 🎓 Example: Complete Setup

```typescript
import * as THREE from 'three/webgpu';
import { ParticleBoundaries, BoundaryShape, CollisionMode } from './PARTICLESYSTEM/physic/boundaries';
import { MlsMpmSimulator } from './PARTICLESYSTEM/physic/mls-mpm';

// Scene setup
const scene = new THREE.Scene();
const renderer = new THREE.WebGPURenderer();
await renderer.init();

// Create boundaries
const boundaries = new ParticleBoundaries({
  shape: BoundaryShape.BOX,
  gridSize: new THREE.Vector3(64, 64, 64),
  wallThickness: 3,
  wallStiffness: 0.4,
  collisionMode: CollisionMode.REFLECT,
  restitution: 0.3,
  friction: 0.1,
  visualize: true,
});

await boundaries.init();
scene.add(boundaries.object);

// Create physics simulator
const simulator = new MlsMpmSimulator(renderer, {
  maxParticles: 100000,
  gridSize: boundaries.gridSize,
});
await simulator.init();

// Connect them
simulator.setBoundaries(boundaries);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Update boundaries (for dynamic boundaries)
  boundaries.update(elapsed);
  
  // Physics simulation (uses boundaries automatically)
  await simulator.update(params, dt, elapsed);
  
  // Render
  await renderer.renderAsync(scene, camera);
}

animate();
```

---

**Module Status:** ✅ Production Ready  
**Version:** 1.0.0  
**Last Updated:** 2025-01-10

