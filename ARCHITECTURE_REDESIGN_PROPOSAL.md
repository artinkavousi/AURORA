# Aurora Architecture Redesign Proposal

## Executive Summary

The legacy Flow/WebGPU project delivers an impressive real-time liquid
simulation, yet most orchestration lives in a single 400+ line `App` class.
Rendering, audio reactivity, simulation control, and UI concerns are tightly
coupled, which makes it hard to extend features, test isolated subsystems, or
reason about performance bottlenecks. This proposal introduces **Aurora
Refined**, a modular rebuild living inside `aurora-refined/`. The new structure
splits responsibilities into explicit modules, formalises lifecycle boundaries,
and establishes a predictable pipeline from boot to render. The design keeps all
existing simulation and audio capabilities but exposes them through a cleaner,
extendable API surface.

## Current State Assessment

| Area                | Challenges observed |
| ------------------- | ------------------- |
| **Lifecycle**       | `index.js` performs renderer creation, error handling, and animation loop wiring inline. Resizing, error rendering, and animation management are scattered. |
| **Application core**| `src/app.js` manages configuration, simulation, audio, environment geometry, post-processing, UI listeners, and performance logic. Cross-cutting concerns (e.g. boundary uploads, audio normalisation) interleave in the render loop. |
| **Configuration**   | `conf` is mutated across subsystems without clear ownership. Audio router, simulation uniforms, and UI panels all write into the same object during a single frame. |
| **Testability**     | The monolithic update loop makes it difficult to unit-test or profile discrete behaviours. Side-effects (DOM mutations, router operations) cannot be exercised in isolation. |
| **Extensibility**   | Adding a new post-processing pass or analytics hook requires editing the central `App` class and threading state manually. |

## Architectural Goals

1. **Modularity** – Decompose orchestration into well-named modules (`Environment`,
   `Simulation`, `Audio`, `Effects`, `Interaction`, `Performance`).
2. **Lifecycle clarity** – Standardise boot, resize, update, and teardown entry
   points so that features can hook into predictable events.
3. **UI separation** – Encapsulate DOM access for loading overlays and panels,
   making it easier to swap UI shells or integrate with React/Svelte later.
4. **Performance governance** – Preserve the automatic particle governor but
   isolate its heuristics for future tuning or data collection.
5. **Compatibility** – Continue to consume the proven simulation/audio
   primitives without rewriting core maths or shaders.

## Proposed Structure (Implemented in `aurora-refined/`)

```
aurora-refined/
├── index.html           # Minimal shell with a LoadingOverlay-friendly veil
├── main.js              # Entrypoint calling bootstrap()
├── vite.config.js       # Vite config scoped to the new root
├── src/
│   ├── core/
│   │   ├── Application.js   # High-level orchestrator
│   │   ├── bootstrap.js     # Renderer creation + lifecycle wiring
│   │   └── updateLoop.js    # RAF-driven async update loop helper
│   ├── modules/
│   │   ├── AudioModule.js
│   │   ├── EnvironmentModule.js
│   │   ├── EffectsModule.js
│   │   ├── InteractionModule.js
│   │   ├── PerformanceGovernor.js
│   │   └── SimulationModule.js
│   ├── ui/
│   │   └── LoadingOverlay.js
│   └── utils/
│       └── math.js
└── README.md
```

### Module Responsibilities

- **EnvironmentModule** – Owns `Stage` lifecycle (camera, scene, lighting) and
  stores the baseline environment rotation for audio sway calculations.
- **SimulationModule** – Creates the MLS-MPM simulator, particle/point/glyph
  renderers, and boundary geometry. Handles glass material sync, SDF updates,
  and boundary upload ingestion without polluting the main loop.
- **AudioModule** – Wraps `AudioEngine`, `AudioRouter`, and `AudioPanel`.
  Normalises spectral bands, writes back to `conf._audio*`, and defers mapping to
  the router with environment sway context.
- **EffectsModule** – Manages post-processing (PostFX pipeline) and depth of
  field (LensSystem). Provides motion vector updates and pointer-based autofocus.
- **InteractionModule** – Centralises pointer raycasting, simulation ray updates,
  and optional DOF autofocus, ensuring these concerns do not leak into
  simulation logic.
- **PerformanceGovernor** – Keeps the adaptive particle-count governor focused
  and inspectable, ready for future telemetry.
- **LoadingOverlay** – Offers a declarative progress/error API for bootstrap,
  replacing ad-hoc DOM manipulation.

## Pipeline Overview

1. **Bootstrap** (`bootstrap.js`)
   - Validates WebGPU support, creates the renderer, and mounts the canvas.
   - Instantiates `Application`, feeding a shared progress callback to the
     loading overlay.
   - Subscribes to `resize` and starts the asynchronous `UpdateLoop`.

2. **Initialisation** (`Application.init`)
   - `conf.init()` primes configuration defaults.
   - Environment, simulation, audio, and effects modules initialise sequentially
     with explicit progress milestones.
   - Interaction module attaches pointer listeners; performance governor begins
     tracking frame statistics.

3. **Per-frame Update** (`Application.update`)
   - `conf.begin()`/`conf.end()` bracket the frame.
   - Stage update → renderer visibility selection → audio feature extraction →
     simulation step → post-processing update → render dispatch.
   - Performance governor adjusts `conf.particles` when FPS deviates from the
     configured range.

## Configuration & Data Flow

- `conf` remains the canonical shared configuration object, but only the
  relevant module mutates its slice. For instance, `AudioModule` is solely
  responsible for `_audio*` fields, while `SimulationModule` handles SDF
  uniforms.
- Router application now receives a well-typed payload generated inside
  `AudioModule`, reducing duplicate logic across modules.
- Interaction and effects modules collaborate to translate pointer movement
  into both simulation rays and DOF updates, eliminating repeated coordinate
  conversion code.

## Migration & Follow-up Tasks

1. **Unit testing** – With modules isolated, introduce targeted tests (e.g.
   verifying audio normalisation or performance governor thresholds).
2. **Type safety** – Adopt TypeScript or JSDoc typings in `aurora-refined/` to
   formally document module contracts.
3. **Configuration bridge** – Gradually move from the shared `conf` singleton to
   an evented settings service, enabling undo/redo and preset comparison.
4. **Telemetry hooks** – Expose frame timing data from `PerformanceGovernor`
   through a lightweight observer API for analytics dashboards.
5. **UI re-skin** – Replace the bespoke DOM overlay with a component framework
   (React, Svelte) now that rendering and state are decoupled.

## Conclusion

The refactored structure in `aurora-refined/` proves that the Flow experience
can run on top of a maintainable, modular foundation. The proposal lays out the
paths to extend the architecture further—introducing automated tests, typed
configuration, and richer tooling—without sacrificing the artistry of the
simulation itself.
