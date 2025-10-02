# 🎯 Coordinate System Analysis & Fix

## Problem Identified

### Current Coordinate System

**Grid Space** (Particle simulation):
- Range: (0-64, 0-64, 0-64)
- Particles initialized at center: (32, 32, 32)

**World Space** (Rendering):
- Mesh/Point renderers apply transformation:
  - Scale: 1/64 (grid → world)
  - Position: (-32/64, 0, 0) = (-0.5, 0, 0)
  - Z compression: 0.4 (in shader)
- Result: Particles at (32, 32, 32) → (0, 0.5, ~0.2) in world

**Camera** (Correct):
- Position: (0, 0.5, -1)
- Target: (0, 0.5, 0.2)
- ✅ Looking at particle center correctly!

### Issues Found

1. **Box Boundary**: Hardcoded legacy position `(0, -0.05, 0.22)` - NOT aligned
2. **Other Containers**: No transformation applied - positioned at (0,0,0) in grid space
3. **Scaling Mismatch**: Containers not scaled to match particle world space

## Solution

All boundary containers must be transformed like particle renderers:
```typescript
const s = 1 / 64;  // Grid to world scale
object.scale.set(s, s, s * 0.4);  // Z compression
object.position.set(0, 0.5, 0.2);  // Particle center in world space
```

OR center in grid space and let parent transform:
```typescript
// Center container mesh at gridSize/2
object.position.copy(gridCenter);  // (32, 32, 32)
// Parent scales grid→world
```

