# React + React Three Fiber Migration & Pipeline Modernization Proposal

## 1. Executive Summary
The Flow WebGPU experience has matured into a sophisticated simulation stack that now needs a first-class application shell. Migrating to a React-based architecture powered by React Three Fiber (R3F) enables:

- **Declarative composition** of complex rendering, simulation, audio, and UX features.
- **Shared modular pipeline** where physics, rendering, audio, post-processing, and UI exchange data through well-defined, type-safe contracts.
- **Hot-swappable feature modules** with isolated concerns, live editing friendliness, and future-proofed package ecosystem (Three.js r168+, @react-three/fiber v9+, @react-three/drei v9+).
- **Unified control surfaces** that expose parameters consistently, support presets, and unlock collaboration-friendly workflows.

The proposal below outlines the target architecture, migration strategy, and tooling updates required to land this upgrade with minimal risk.

## 2. Current System Assessment

### 2.1 Architectural Highlights
- `FlowApp` (see `src/APP.ts`) orchestrates initialization of scenery, postFX, particle physics, renderers, audio subsystems, control panels, and adaptive performance.
- The project is moduleized by feature domains (`PARTICLESYSTEM`, `STAGE`, `POSTFX`, `AUDIO`, `PANEL`) with solid TypeScript boundaries already in place.
- UI and lifecycle currently run in imperative style (DOM manipulation, manual resize handling) without component-level composability.
- Control panels rely on bespoke managers under `src/PANEL`, yielding inconsistent parameter schemas and limited reuse.

### 2.2 Pain Points
- **Monolithic bootstrapping**: the imperative `FlowApp` constructor couples setup order, dependency injection, and render loop in one class.
- **Tight runtime wiring**: audio, physics, and render subsystems share mutable state with limited isolation, making feature swaps brittle.
- **Control surface inconsistency**: panels use ad-hoc structures per feature; presets and undo/redo are hard to implement.
- **Testing & story isolation gaps**: without component abstraction, validating sub-features or running headless tests is costly.
- **Package lag**: current project targets `three/webgpu` beta APIs but does not yet align with the R3F ecosystem or latest Three.js/TSL improvements.

## 3. Target Application Architecture

### 3.1 High-Level Layers
1. **React Shell** (`/src/app`) — routing, layout, UI chrome, global providers.
2. **Experience Scene** (`/src/features/experience`) — R3F `<Canvas>` composition housing simulation and visual layers.
3. **Simulation Pipeline** (`/src/features/simulation`) — physics kernels, material point solver, boundary conditions, data bridges.
4. **Rendering Pipeline** (`/src/features/rendering`) — mesh & point renderers, postFX chain, materials.
5. **Audio & Reactivity** (`/src/features/audio`) — shared analyser graph, reactive parameter emitters.
6. **Control Surfaces** (`/src/features/controls`) — schema-driven parameter panels, preset manager, keyboard/midi bindings.
7. **Shared Core** (`/src/shared`) — math helpers, config schemas, hook utilities, data stores.

### 3.2 Module Contracts
- **Config Schemas**: Define `zod`/TypeScript schemas for each subsystem (`SimulationConfig`, `RenderingConfig`, `AudioConfig`) exported from `@/shared/config`. Controls consume these schemas for UI generation.
- **Event Bus / Data Layers**: Use a lightweight observable store (e.g., `zustand` or `jotai`) with slices per subsystem (`useSimulationStore`, `useAudioStore`). React components subscribe declaratively; non-React workers communicate via typed messages.
- **Resource Managers**: Wrap WebGPU buffers/textures in self-contained hooks (`useSimulationBuffers`, `usePostFXTargets`) that expose `init/resize/dispose` lifecycle hooks called from R3F `useEffect` or `useFrame` contexts.

### 3.3 React Three Fiber Integration Strategy
- **Canvas Provider**: Replace manual `THREE.WebGPURenderer` bootstrapping with `<Canvas gl={{ antialias: true }} frameloop="demand" shadows camera={...}>` using `@react-three/fiber` WebGPU experimental renderer (or custom renderer adapter while upstream work stabilizes).
- **Custom Render Loop**: Use `useFrame((state, delta) => simulation.step(delta))` to call physics updates, feed GPU buffers, and trigger post-processing.
- **Port existing materials & passes** into declarative components (`<ParticleField />`, `<PostProcessing />`). R3F supports external render targets via `useThree` for imperative control when needed.
- **WebGPU/TSL Alignment**: Update to `three@>=0.168` to access the latest TSL modules; convert legacy shader chunks to node-based materials, enabling compatibility with R3F's `extend` API.

## 4. Unified Pipeline Enhancements

### 4.1 Simulation & Physics
- Abstract the MLS-MPM solver into a headless worker module communicating through transferable buffers. Provide React hooks for status (`useSimulationStatus`) and parameter injection.
- Introduce a `PipelineOrchestrator` service responsible only for dependency graph resolution (ensuring physics runs before render, audio events processed pre-frame).
- Support hot-swappable integrators (MLS-MPM, FLIP/PIC) by exporting a `SimulationDriver` interface with `init`, `step`, `applyEvent`, and `dispose` signatures.

### 4.2 Rendering & PostFX
- Convert renderer selection into plug-ins (`MeshRendererPlugin`, `PointRendererPlugin`). Each registers a `registerRenderer()` factory returning R3F components and uniforms.
- Wrap post-processing with `@react-three/postprocessing` or custom composer tied to WebGPU `EffectComposer`. Provide dynamic graph editing through config-driven pipelines (JSON describing pass order, parameters, toggles).
- Enforce ESM-first build output by ensuring all renderer modules export tree-shakable factories without side-effects.

### 4.3 Audio Reactivity
- Standardize audio events via `AudioEvent` types (`spectrum`, `beat`, `envelope`). Create `useAudioAnalysis` hook providing derived metrics; simulation and UI subscribe independently.
- Implement worker-based audio analyser to avoid blocking main thread. Provide parameterizable smoothing kernels and band mappings stored in config.

### 4.4 Control Panels & Parameter Management
- Adopt a **schema-driven control system** using `@tanstack/react-form` + `leva` (or custom UI) where each parameter is defined once and consumed by both UI and runtime.
- Store parameter metadata (`label`, `range`, `step`, `group`, `hotkey`, `presetCategory`) alongside defaults to auto-generate consistent panels.
- Introduce a `PresetManager` with JSON export/import, versioned with semver, enabling hot swapping across modules.
- Provide `CommandPalette` for quick parameter search and toggling.

### 4.5 Hot-Swappability & Modularity
- All feature modules expose `init`, `suspend`, `resume`, and `dispose` to support runtime replacement. React Suspense boundaries can pause rendering when swapping modules.
- Embrace dynamic import chunks for heavy modules (`import('./features/simulation/mls-mpm')`). Use React lazy + suspense to progressively load features.
- Provide CLI scaffolds (`npm run generate:feature`) to enforce consistent structure for new modules (component, store slice, config, tests).

## 5. Tooling & Package Updates
- Upgrade to **Vite 5 + React 18** template with TypeScript strict mode.
- Update dependencies:
  - `three` → latest stable (r168+ once WebGPU branch merges).
  - `@react-three/fiber` v9 with WebGPU renderer support.
  - `@react-three/drei` for helpers (camera controls, loaders, postprocessing shorthands).
  - `zustand`/`jotai` for state, `leva` for control panels, `zod` for schemas.
  - `vitest` + `@testing-library/react` for component/unit tests.
- Configure **path aliases** via `tsconfig.json` (`@/shared`, `@/features/...`). Ensure ESM compatibility by enabling `"module": "esnext"` and bundling as ESM.
- Integrate **Storybook 8 (WebGPU mode)** to document components and control panels in isolation.
- Add **ESLint + Prettier** with `typescript-eslint` flat config for consistent code style.

## 6. Migration Roadmap

### Phase 0 — Preparation
- Freeze current main branch, document parity baseline, extract golden recordings of simulation presets.
- Introduce feature flag system (e.g., URL query `?shell=react`) to run legacy app alongside new shell during migration.

### Phase 1 — React Shell & Controls
- Scaffold Vite React app structure under `/src/app` while keeping existing simulation modules untouched.
- Implement shared stores and control schema definitions; port existing panel logic into React components backed by the schema.
- Deliver parity for parameter editing, preset loading, and responsive layout.

### Phase 2 — R3F Scene Integration
- Wrap existing Three.js scene creation into R3F components, bridging `FlowApp` modules incrementally (start with camera + stage, then particle renderer, then postFX).
- Replace manual render loop with `useFrame`. Validate resizing, DPR handling, and SSR safety for controls shell.

### Phase 3 — Simulation & Audio Modularization
- Extract physics + audio pipelines into worker-driven modules with typed message contracts. Introduce hot-swappable integrator interface.
- Ensure audio reactivity events feed both simulation and UI via store updates.

### Phase 4 — Advanced Features & Polish
- Add preset manager, command palette, analytics hooks, multi-scene routing (e.g., gallery of experiences).
- Harden error boundaries, fallback UI, telemetry, performance dashboards (frame time graphs via `drei/Perf`).
- Finalize documentation, developer onboarding, and automation (CI with lint/test/build, bundle size checks).

### Phase 5 — Decommission Legacy Shell
- Remove imperative bootstrap once React version reaches feature parity and stability.
- Archive legacy modules, maintain compatibility layer for saved presets if needed.

## 7. Risk & Mitigation
- **WebGPU support in R3F**: actively track upstream progress; maintain fallback path using manual renderer injection if necessary.
- **Performance regression**: use `react-three-fiber` `frameloop="demand"` and selective suspense to avoid extra renders. Add automated performance benchmarks comparing legacy vs. new shell.
- **State desynchronization**: rely on single-source-of-truth stores and typed events; include devtools for time-travel debugging.
- **Team onboarding**: deliver documentation updates, architecture diagrams, and pair programming sessions to acclimate contributors to React + R3F patterns.

## 8. Deliverables
- Updated repository structure with React app entrypoint and modular feature folders.
- Comprehensive configuration schema library powering runtime + UI.
- R3F-based scene composition with hot-swappable pipelines.
- Unified control panel system with presets, parameter metadata, and hotkeys.
- Tooling upgrades (linting, testing, Storybook, CI) and dependency refresh to latest stable releases.
- Migration checklist, troubleshooting guide, and architecture diagrams.

---
**Outcome**: This migration will yield a cohesive, modular, and future-ready Flow experience that leverages modern React ecosystems, accelerates feature development, and ensures all visual, audio, and simulation features share a robust, composable pipeline.

