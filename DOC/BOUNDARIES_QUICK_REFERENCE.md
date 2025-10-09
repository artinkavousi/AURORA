# 🔲 Boundaries System - Quick Reference

## 🎯 Container Types at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│  CONTAINER SELECTOR (Control Panel → 🔲 Boundaries)           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ∞ None (Viewport)  ← Default, adaptive to page size          │
│  📦 Box             ← Concrete model with textures             │
│  ⚪ Sphere          ← Frosted glass sphere                     │
│  🛢️ Tube           ← Glass cylinder with caps                 │
│  🔷 Dodecahedron    ← 12-sided glass polyhedron                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🎨 Visual Comparison

### NONE (Viewport Mode)
```
┌─────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░░░░ Particles ░░░░░░░░ │  No visible container
│ ░░░ float freely ░░░░░░ │  Adapts to window size
│ ░░░░░ in page ░░░░░░░░░ │  Soft boundaries
│ ░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────┘
```

### BOX
```
┌═════════════════════════┐
║ ▓▓▓ Concrete  ▓▓▓▓▓▓▓▓ ║  Textured walls
║ ▓ Particles   ▓        ║  Normal maps
║ ▓ contained   ▓        ║  AO + Roughness
║ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ║  Hard collision
╚═════════════════════════╝
```

### SPHERE
```
       ╭───────────╮
     ╱   ░░░░░░░   ╲          Glass sphere
   ╱    ░ ◦ ◦ ░    ╲         Transparent
  │     ░ ◦ ◦ ░     │        Iridescent
   ╲    ░░░░░░░    ╱         Smooth
     ╲   Sphere   ╱
       ╰───────────╯
```

### TUBE
```
    ║ ░░░░░░░ ║
    ║ ░ ◦ ◦ ░ ║                Glass tube
    ║ ░ ◦ ◦ ░ ║                Vertical flow
    ║ ░ ◦ ◦ ░ ║                Cylinder + caps
    ║ ░░░░░░░ ║
    ╚═════════╝
```

### DODECAHEDRON
```
        ╱╲
       ╱  ╲                    12-sided polyhedron
      ╱ ░░ ╲                   Glass facets
     ╱ ░◦◦░ ╲                  Geometric beauty
    ╱ ░░░░░░ ╲
   ╱          ╲
  ╱____________╲
```

## ⚡ Quick Setup Examples

### 1. Viewport Mode (Default)
```typescript
// Particles float in page center, adapt to window resize
Container: ∞ None (Viewport)
Show Container: OFF
Collision: ↩️ Reflect
Stiffness: 0.2 (auto)
```

### 2. Concrete Box
```typescript
// Traditional box container with hard walls
Container: 📦 Box
Show Container: ON
Collision: ↩️ Reflect
Stiffness: 0.5
Bounce: 0.3
Friction: 0.1
```

### 3. Glass Sphere
```typescript
// Elegant spherical containment
Container: ⚪ Sphere
Show Container: ON
Collision: ↩️ Reflect
Stiffness: 0.4
Bounce: 0.5
Friction: 0.0
```

### 4. Vertical Tube
```typescript
// Particles flow up/down in tube
Container: 🛢️ Tube
Show Container: ON
Collision: ↩️ Reflect
Stiffness: 0.6
Bounce: 0.2
Friction: 0.1
```

### 5. Dodecahedron Art
```typescript
// Unique geometric container
Container: 🔷 Dodecahedron
Show Container: ON
Collision: ↩️ Reflect
Stiffness: 0.3
Bounce: 0.4
Friction: 0.05
```

## 🎮 Control Panel Layout

```
🔲 Boundaries
├─ Container: [∞ None (Viewport) ▼]  ← Primary control
├─ Collision: [↩️ Reflect ▼]
├─ 👁️ Show Container: [ ]
│
├─ 📁 Properties
│  ├─ Stiffness: ━━●━━━━━━ 0.30
│  ├─ Thickness: ━━━●━━━━━ 3.0
│  ├─ Bounce:    ━━●━━━━━━ 0.30
│  └─ Friction:  ━●━━━━━━━ 0.10
│
└─ 📁 Quick Presets
   ├─ [💧 Fluid Container]
   ├─ [🎈 Bouncy Ball]
   ├─ [🏖️ Sticky Sand]
   └─ [🌀 Free Flow (Viewport)]
```

## 🎯 Collision Modes

| Mode | Symbol | Behavior | Use Case |
|------|--------|----------|----------|
| **Reflect** | ↩️ | Bounce off walls | Most natural, default |
| **Clamp** | 🛑 | Stop at walls | Sticky particles |
| **Wrap** | 🔄 | Teleport to opposite side | Endless flow |
| **Kill** | 💀 | Delete particles | Future feature |

## 🎨 Glass Material Properties

All glass containers use this material:
```
Color:         Light blue tint (#aaccff)
Transmission:  90% transparent
Roughness:     10% (smooth)
IOR:           1.5 (realistic glass)
Iridescence:   20% (subtle rainbow)
Clearcoat:     100% (glossy finish)
```

## 📐 Automatic Viewport Sizing

**NONE (Viewport)** mode adapts to page dimensions:

```javascript
Landscape:  [═══════════════════]  ← Wider grid
            [     Particles     ]
            [═══════════════════]

Portrait:   [═══════════]         ← Taller grid
            [  Particles ]
            [           ]
            [═══════════]

Square:     [══════════]          ← Balanced
            [ Particles ]
            [══════════]
```

## 🚀 Performance Tips

### Best Performance
1. **NONE (Viewport)**: Fastest - soft collision, no mesh
2. **BOX**: Fast - 6 plane checks
3. **SPHERE**: Medium - radial distance
4. **TUBE**: Medium - radial + caps
5. **DODECAHEDRON**: Medium - spherical approximation

### Visual Quality
- **High**: Show Container ON, 64 segments
- **Medium**: Show Container ON, 32 segments
- **Low**: Show Container OFF (collision only)

## 🎯 Common Workflows

### Workflow 1: Start Simple
```
1. Start with NONE (default)
2. Adjust particle settings
3. Switch to BOX when ready for containment
4. Fine-tune wall properties
```

### Workflow 2: Immediate Container
```
1. Select container type (BOX/SPHERE/TUBE)
2. Show Container automatically enabled
3. Adjust stiffness/bounce
4. Apply preset (Fluid/Bouncy/Sticky)
```

### Workflow 3: Artistic Setup
```
1. Select DODECAHEDRON or SPHERE
2. Show Container ON
3. Enable Bloom in PostFX
4. Set particles to metallic material
5. Adjust camera for best angle
```

## 🔧 Keyboard Shortcuts (Future)

```
Planned shortcuts:
V - Toggle Viewport mode
B - Switch to Box
S - Switch to Sphere
T - Switch to Tube
D - Switch to Dodecahedron
H - Hide/Show container
```

## 📊 Technical Specs

| Property | Range | Default | Description |
|----------|-------|---------|-------------|
| **Stiffness** | 0.0 - 1.0 | 0.3 | Wall collision strength |
| **Thickness** | 1 - 10 | 3 | Wall depth (grid units) |
| **Bounce** | 0.0 - 1.0 | 0.3 | Restitution coefficient |
| **Friction** | 0.0 - 1.0 | 0.1 | Surface friction |

### Grid Size
- **Viewport Mode**: Adaptive (based on aspect ratio)
- **Container Mode**: Fixed 64×64×64 (customizable)
- **Units**: Grid space (normalized)

## 🎬 Animation Ideas

### Idea 1: Morphing Container
```
Start: BOX → Animate to: SPHERE
Effect: Particles reorganize smoothly
```

### Idea 2: Explosive Reveal
```
Start: Particles in SPHERE
Action: Switch to NONE
Effect: Particles explode outward
```

### Idea 3: Tube Flow
```
Container: TUBE (vertical)
Emitter: Top of tube
Effect: Particles fall through tube
```

## 🌟 Best Practices

### ✅ DO
- Start with NONE for testing
- Use BOX for contained simulations
- Use SPHERE/TUBE/DODECAHEDRON for visual appeal
- Show containers when enabled for clarity
- Adjust stiffness based on particle behavior
- Use presets as starting points

### ❌ DON'T
- Don't hide important container interactions
- Don't set stiffness too high (causes jitter)
- Don't use NONE if you need true containment
- Don't forget to update uniforms after changes

## 📚 Related Systems

- **Force Fields**: Work with all container types
- **Emitters**: Spawn particles inside containers
- **Materials**: Affect particle appearance
- **Audio**: Can modulate boundary properties
- **PostFX**: Enhances glass material visuals

---

**Quick Start**: Select a container from the dropdown, toggle "Show Container", and adjust properties! 🚀

