# 🚀 Boundaries Module - Quick Start

## TL;DR

The particle boundaries system is now a **single, self-contained module** that handles all container walls, collision detection, and visual representation.

## 📦 What Changed

### Before
```typescript
// Boundaries scattered across multiple files
import { BackgroundGeometry } from './STAGE/scenery';
// + hardcoded collision in mls-mpm.ts
// + manual mesh setup
```

### After
```typescript
// Everything in one module
import { ParticleBoundaries } from './PARTICLESYSTEM/physic/boundaries';
```

## ⚡ Quick Usage

### Basic Setup (30 seconds)

```typescript
import { ParticleBoundaries } from './PARTICLESYSTEM/physic/boundaries';

// 1. Create boundaries
const boundaries = new ParticleBoundaries({
  gridSize: new THREE.Vector3(64, 64, 64),
  visualize: true,
});

// 2. Initialize
await boundaries.init();

// 3. Add to scene
scene.add(boundaries.object);

// 4. Connect to physics
mlsMpmSim.setBoundaries(boundaries);
```

**Done!** Your particles now have boundaries with collision detection.

## 🎨 Common Configurations

### Bouncy Box
```typescript
const boundaries = new ParticleBoundaries({
  wallStiffness: 0.8,
  restitution: 0.9,  // Very bouncy!
});
```

### Invisible Walls
```typescript
const boundaries = new ParticleBoundaries({
  visualize: false,  // No mesh rendering
});
```

### Sphere Container
```typescript
import { BoundaryShape } from './PARTICLESYSTEM/physic/boundaries';

const boundaries = new ParticleBoundaries({
  shape: BoundaryShape.SPHERE,
});
```

### Wrap-Around (Torus)
```typescript
import { CollisionMode } from './PARTICLESYSTEM/physic/boundaries';

const boundaries = new ParticleBoundaries({
  collisionMode: CollisionMode.WRAP,  // Teleport to opposite side
});
```

## 🎯 Key Features

| Feature | Description |
|---------|-------------|
| **Shapes** | Box, Sphere, Cylinder, Custom |
| **Collision Modes** | Reflect, Clamp, Wrap, Kill |
| **GPU Collision** | Automatic TSL integration |
| **CPU Collision** | For emitters/effects |
| **Visual** | Optional textured mesh |
| **Physics** | Stiffness, restitution, friction |

## 📚 Full Documentation

- **BOUNDARIES_GUIDE.md** - Complete API reference
- **BOUNDARIES_REFACTOR_SUMMARY.md** - Technical details

## 🐛 Troubleshooting

**Particles escaping?**
```typescript
wallStiffness: 0.5  // Increase this
```

**No boundaries visible?**
```typescript
visualize: true,  // Enable this
await boundaries.init()  // Call this
scene.add(boundaries.object)  // Add to scene
```

**Build errors?**
```bash
npm run build  # Should pass ✅
```

## ✅ Status

- **Module:** `src/PARTICLESYSTEM/physic/boundaries.ts`
- **Build:** ✅ Passing
- **Linter:** ✅ Clean
- **Integration:** ✅ Complete
- **Documentation:** ✅ Complete

---

**Ready to use!** 🎉

