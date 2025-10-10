# Aurora Refactor Plan

## Migration Workflow
1. **Analyze**
   - Audit existing Three.js scene graph construction, animation loops, and control surfaces.
   - Document implicit contracts (e.g., global uniforms, shared shader chunks) and log feature parity requirements.
   - Capture baseline performance metrics (fps, CPU/GPU utilization) to compare post-migration.
2. **Extract**
   - Carve out a headless simulation engine that encapsulates physics, timeline progression, and data transforms.
   - Define TypeScript interfaces for engine inputs/outputs and add Jest-based snapshot or numerical regression tests.
   - Isolate side effects (timers, DOM queries) behind adapters to simplify downstream composition.
3. **Wrap**
   - Build a compatibility layer that presents the headless engine contract to both the legacy Three.js renderer and the new R3F stack.
   - Introduce Zustand/Jotai stores that mirror engine outputs and expose selectors for view-layer components.
   - Add Tweakpane bindings that proxy to engine setters without mutating legacy globals.
4. **Replace**
   - Implement R3F components for each legacy mesh/material group, replacing imperative constructors with declarative JSX.
   - Rewire render/update loops to use `@react-three/fiber`'s `Canvas`, `useFrame`, and suspense-ready loaders.
   - Gradually switch routes or feature flags to point to the R3F presenter while keeping the compatibility layer active.
5. **Verify**
   - Run automated visual regression (Chromatic or Playwright + WebGL snapshots) alongside unit/integration suites.
   - Perform load testing and profiling; compare against Analyze-phase baselines.
   - Remove legacy renderer paths once acceptance criteria are met and documentation is updated.

## Headless Engine Contract
```ts
export interface AuroraEngineConfig {
  clock: 'internal' | 'external';
  tickRate: number;
  initialState: SceneState;
}

export interface AuroraEngine {
  configure(config: AuroraEngineConfig): void;
  getState(): SceneState;
  subscribe(listener: (state: SceneState) => void): () => void;
  advance(deltaMs: number): void;
  setControl(path: string, value: unknown): void;
}
```
- **Inputs**: configuration, control events (from Tweakpane/UI), timeline ticks.
- **Outputs**: serializable `SceneState` describing camera, lights, meshes, and materials for rendering.
- **Determinism**: no direct DOM or renderer references; pure data flow to ease testing and multi-renderer support.

## React Three Fiber Wiring
- Host a single `<Canvas>` root configured for Three r180 and WebGL2/WebGPU fallback once stabilized.
- Use context providers for Zustand/Jotai stores so nested components can pull engine state via hooks.
- Map engine entities to R3F primitives (e.g., `<mesh>` with `<bufferGeometry>` and `<meshStandardMaterial>`), memoizing heavy assets with `useMemo` and suspense loaders.
- Drive animations via `useFrame`, reading from store selectors to minimize renders.
- Register Tweakpane panels within a React boundary that dispatches to the engine's `setControl` API.

## Legacy to Modern Module Mapping
| Legacy Module | New Location | Notes |
| --- | --- | --- |
| `src/three/SceneManager.ts` | `src/engine/core/sceneEngine.ts` | Moves imperative scene logic into headless engine. |
| `src/three/loaders/*` | `src/engine/loaders/` | Standardize asset loading with async factories returning serializable descriptors. |
| `src/three/components/OrbitControls.ts` | `src/view/r3f/controls/OrbitControls.tsx` | Replace manual control wiring with R3F-compatible controls. |
| `src/ui/panels/DebugPanel.ts` | `src/view/controls/tweakpane/debugPanel.ts` | Rebuild with Tweakpane and store-driven bindings. |
| `src/state/index.ts` | `src/store/` | Consolidate Zustand/Jotai stores shared between engine and views. |

## Verification Checklist
- ✅ Engine contract covered by unit tests and snapshot outputs.
- ✅ Visual parity established through dual-render comparison.
- ✅ Performance within ±5% of baseline metrics.
- ✅ Documentation updated for onboarding, including File Map and migration notes.
