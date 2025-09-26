# Project Consolidation Refactor (Single-File Modules)

## 1. Deep Analysis

- **Current Structure Overview**
  - `src/app.js` is a monolithic orchestrator that instantiates stage, simulation, renderers, audio, UI, post-processing, config polling, and runtime loops, binding everything through globals.【F:src/app.js†L1-L359】
  - Configuration, UI scaffolding, presets, and runtime telemetry are co-mingled in `src/conf.js`, producing a ~900 line singleton that owns tweakpane wiring, preset IO, runtime counters, and router integration.【F:src/conf.js†L1-L907】
  - Scene management lives in `src/stage.js`, while rendering helpers (`ParticleRenderer`, `PointRenderer`, `GlyphRenderer`) sit under `src/mls-mpm`, duplicating life-cycle patterns and direct config coupling.【F:src/stage.js†L1-L96】【F:src/mls-mpm/particleRenderer.js†L92-L193】
  - Post-processing, lens mapping, audio, UI, and background assets each live in separate directories (`postfx.js`, `lens/LensPipeline.js`, `audio/*`, `ui/*`, `backgroundGeometry.js`) but depend heavily on the global `conf` singleton rather than declarative interfaces.【F:src/postfx.js†L1-L322】【F:src/lens/LensPipeline.js†L1-L56】【F:src/audio/audioEngine.js†L1-L205】【F:src/ui/audioPanel.js†L1-L200】【F:src/backgroundGeometry.js†L1-L128】

- **Redundancies & Fragmentation**
  - Renderers in `src/mls-mpm` repeat similar update logic (reading `conf`, rescaling objects, toggling bloom MRT) without a shared interface, inflating file count without modular reuse.【F:src/mls-mpm/particleRenderer.js†L175-L193】
  - `conf.js` embeds UI composition, presets, asset upload handlers, audio routing registration, and lifecycle hooks that should be split into config schema, dashboard module, and presets catalogue; currently everything is welded to DOM state and the router object.【F:src/conf.js†L198-L731】
  - Audio responsibilities are fragmented: `audioEngine`, `audio/router`, and `ui/audioPanel` exchange mutable objects and call methods imperatively, lacking a cohesive module boundary or lifecycle contract.【F:src/audio/audioEngine.js†L1-L205】【F:src/audio/router.js†L1-L136】【F:src/ui/audioPanel.js†L4-L176】
  - Stage/environment toggles, lens focus, and post-processing share duplicated smoothing and config syncing logic, each polling `conf` separately rather than responding to structured updates.【F:src/stage.js†L57-L83】【F:src/lens/LensPipeline.js†L25-L55】【F:src/postfx.js†L216-L279】

- **Interface Gaps & Coupling Issues**
  - Modules pull raw `conf` state directly (e.g., renderers, postFX, lens) instead of receiving typed options or callback hooks, preventing reuse outside this app and complicating hot-swapping.【F:src/mls-mpm/particleRenderer.js†L175-L193】【F:src/postfx.js†L216-L279】【F:src/lens/LensPipeline.js†L25-L55】
  - `App` mutates `conf` state for audio features and environment sway, then reuses the same object for simulation uniforms, coupling UI state, runtime metrics, and GPU uniforms tightly.【F:src/app.js†L257-L359】
  - Upload handlers and router registration are hidden inside `conf`, forcing other modules to mutate singleton internals for IO tasks.【F:src/app.js†L54-L113】【F:src/conf.js†L654-L731】

- **Performance & DX Pain Points**
  - Continuous polling via `setInterval` in `app.js` for glass and shape syncing adds redundant CPU work instead of reacting to dashboard events or config diffs.【F:src/app.js†L46-L88】
  - PostFX lazy imports are scattered inside render loops without caching strategy, risking redundant module loads on hot swaps.【F:src/postfx.js†L290-L319】
  - Lack of deterministic lifecycle (`init/update/dispose`) across modules (e.g., Stage, renderers, audio) complicates teardown and dynamic reloading, while `conf.begin/end` directly drive FPS graphs instead of a dedicated telemetry module.【F:src/stage.js†L18-L96】【F:src/mls-mpm/particleRenderer.js†L92-L193】【F:src/audio/audioEngine.js†L1-L205】【F:src/conf.js†L674-L679】

## 2. Architecture & Pipeline Proposal

```
src/
  main.ts                  # bootloader, module orchestrator
  config.ts                # schemas, defaults, validation, event emitter
  commons/assets.ts        # asset manifest + async loaders
  commons/types.ts         # shared interfaces (SimulationFrame, AudioFeatures, etc.)
  io/dashboard.ts          # tweakpane dashboard + bindings emitting typed patches
  io/inputRouter.ts        # pointer, window resize, focus dispatch
  presents/presents.ts     # preset catalog + loader/export helpers
  stage/stage.ts           # renderer, scene, controls, environment, resize
  stage/background.ts      # glass/floor geometry factory (optional worker-ready)
  physics/mls-mpm.ts       # simulator core + uniforms API
  renders/renderPipeline.ts# instantiate particle/point/glyph renderers via factory
  renders/materials.ts     # shared materials + MRT helpers
  postfx/postfx.ts         # composer, pass chain, quality controls
  postfx/cameralens.ts     # lens pipeline bridging stage & postfx
  audio/audio.ts           # audio engine + analysis lifecycle
  audio/reactivity.ts      # routing + mapping to config/sim uniforms
  audio/audioPanel.ts      # dashboard section hooking into io/dashboard
  runtime/app.ts           # orchestrates lifecycle, hot-swap manager
```

**Data/Flow**
- `main.ts` loads `config.ts` defaults, instantiates `runtime/app.ts`, and bridges DOM ready → `app.start()`. The app injects dependencies: `stage`, `physics`, `renderPipeline`, `postfx`, `audio`, `dashboard`.
- `config.ts` exposes an observable state object with typed slices (stage, physics, audio, postfx). Modules subscribe to diff streams instead of polling.
- `io/dashboard.ts` binds tweakpane to config slices; user actions emit patch events consumed by modules via `config.subscribe(section, listener)`.
- `physics/mls-mpm.ts` receives config-derived options on init/update; outputs uniforms and GPU buffers consumed by renderers.
- `renders/renderPipeline.ts` constructs renderable objects by combining `physics` buffers with `materials.ts`. It exposes `createRenderers(config, assets)` returning handles with `updateConfig`, `render`, `dispose`.
- `postfx/postfx.ts` builds the composer once, exposes `updateSettings`, `render`. `postfx/cameralens.ts` manages DOF + FOV interplay and pointer focus events.
- `audio/audio.ts` handles WebAudio context, analysis, and outputs `AudioFeatures`. `audio/reactivity.ts` maps features to config diffs and simulation uniforms. `audio/audioPanel.ts` plugs into dashboard events.
- `runtime/app.ts` sequences lifecycle: load assets → init modules → enter render loop calling `update(dt)` on physics, stage, audio, renderers, postfx.

**Module Boundaries**
- **Stage**: owns renderer, camera, controls, environment textures, lights; listens to `config.stage` for exposure/fov/env and `io/inputRouter` events.【F:src/stage.js†L18-L96】
- **Physics**: encapsulates MLS-MPM compute, exposes `createPhysics(renderer, configSlice)` returning { uniforms, step(dt), setInput(options), dispose } with no direct `conf` dependency.【F:src/mls-mpm/mlsMpmSimulator.js†L1-L200】
- **Rendering**: `renderPipeline` wraps particle/point/glyph implementations, sharing `materials` helpers to eliminate duplicated config scaling logic.【F:src/mls-mpm/particleRenderer.js†L92-L193】
- **PostFX**: `postfx.ts` handles composer and effect nodes; `cameralens.ts` translates physical lens settings to DOF parameters and interacts with stage pointer events.【F:src/postfx.js†L1-L322】【F:src/lens/LensPipeline.js†L25-L55】
- **Audio**: `audio.ts` for engine + analysis; `reactivity.ts` for mapping features to config/uniform deltas; `audioPanel.ts` integrates with dashboard but only calls public audio/reactivity APIs.【F:src/audio/audioEngine.js†L1-L205】【F:src/audio/router.js†L5-L135】【F:src/ui/audioPanel.js†L4-L176】
- **IO/Dashboard**: `dashboard.ts` centralizes tweakpane creation, theming, and module sections; `audioPanel.ts` registers itself through a plugin API rather than manipulating DOM directly.【F:src/conf.js†L198-L621】【F:src/ui/audioPanel.js†L12-L123】
- **Presets**: `presents/presents.ts` exports typed preset objects, separated from dashboard instantiation to support hot-load, serialization, and reuse.【F:src/conf.js†L570-L905】

**Interfaces (public API)**
- `config.ts`
  ```ts
  export interface Config<T = ConfigShape> {
    readonly state: T;
    subscribe<K extends keyof T>(key: K, listener: (next: T[K]) => void): () => void;
    patch<K extends keyof T>(key: K, delta: Partial<T[K]>): void;
    reset(key?: keyof T): void;
  }
  export function createConfig(overrides?: Partial<ConfigShape>): Config;
  ```
- `stage/stage.ts`
  ```ts
  export interface StageModule {
    init(opts: StageInitOptions): Promise<StageContext>;
    update(dt: number): void;
    resize(size: { width: number; height: number }): void;
    dispose(): void;
  }
  ```
- `physics/mls-mpm.ts`
  ```ts
  export interface PhysicsModule {
    init(opts: PhysicsInitOptions): Promise<PhysicsHandle>;
    step(ctx: PhysicsHandle, dt: number): Promise<void>;
    applyConfig(ctx: PhysicsHandle, config: PhysicsConfig): void;
    dispose(ctx: PhysicsHandle): void;
  }
  ```
- `renders/renderPipeline.ts`
  ```ts
  export interface RenderPipeline {
    init(stage: StageContext, physics: PhysicsHandle): Promise<RenderContext>;
    update(config: RenderConfig, audio: AudioFeatures): void;
    render(stage: StageContext, post: PostChain): Promise<void>;
    dispose(): void;
  }
  ```
- `postfx/postfx.ts`
  ```ts
  export interface PostChain {
    init(stage: StageContext): Promise<PostContext>;
    update(config: PostFxConfig): void;
    render(stage: StageContext, target?: RenderTarget): Promise<void>;
    setFocusDistance(meters: number, smooth?: number): void;
    dispose(): void;
  }
  ```
- `postfx/cameralens.ts`
  ```ts
  export interface LensController {
    attach(stage: StageContext, post: PostChain): void;
    onPointerFocus(distance: number): void;
    update(config: LensConfig): void;
    dispose(): void;
  }
  ```
- `audio/audio.ts`
  ```ts
  export interface AudioModule {
    init(opts: AudioInitOptions): Promise<AudioHandle>;
    update(handle: AudioHandle, dt: number): AudioFeatures;
    connectSource(kind: 'mic'|'file', payload?: ArrayBuffer): Promise<void>;
    dispose(): void;
  }
  ```
- `audio/reactivity.ts`
  ```ts
  export interface ReactivityRouter {
    configure(routes: AudioRouteConfig): void;
    map(features: AudioFeatures, now: number): RoutedOutputs;
  }
  ```
- `io/dashboard.ts`
  ```ts
  export interface Dashboard {
    init(config: Config): Promise<void>;
    registerPanel(id: string, factory: (pane: Pane, config: Config) => void): void;
    dispose(): void;
  }
  ```

**Hot-Swap Strategy**
- Use `runtime/app.ts` hot-swap registry: each module exposes `dispose` to release resources; `app.hotSwap('postfx', async () => import('./postfx/postfx.ts'))` tears down current chain, loads new module via `dynamic import()`, replays init with existing contexts.
- For heavy compute (physics) and audio, support workerized variants by returning proxied handles that respect same interface (SFM parity). Dynamic imports allow swapping to worker-backed module without altering callers.

**Error Handling & Lifecycle**
- Standard lifecycle: `create` (module factory) → `init` (async resource loading) → `ready` (emit `InitComplete` event) → per-frame `update(dt)` (with guard rails) → `dispose()` (idempotent cleanup).
- Each module returns teardown closures capturing allocated resources (textures, geometries, event listeners). `runtime/app.ts` manages try/catch around dynamic imports; on failure, it logs and restores previous module instance.
- `config.ts` validates patches, rejects invalid values, and emits errors through an event bus consumed by dashboard toast notifications.

## 3. Consolidated File Map (Final)

| File | Purpose & API | Dependencies | Lifecycle |
| --- | --- | --- | --- |
| `src/main.ts` | Entry point; bootstraps `createConfig`, instantiates `App`, wires DOM ready & resize listeners. Exports nothing (runtime only). | `runtime/app.ts`, `config.ts`, `io/inputRouter.ts`. | `start()`, `stop()` wrappers. |
| `src/config.ts` | Typed schemas (zod or TS types), defaults, config store with observers, serialization helpers. Exports `createConfig`, `Config` types. | `commons/types.ts`. | `createConfig()`, `subscribe()`, `patch()`, `reset()`, `dispose()`. |
| `src/commons/assets.ts` | Asset registry for HDR, OBJ, textures. Provides `loadAssets(manifest)` and cached lookups. | `three`, optional `AssetManifest`. | `init(manifest)`, `get(name)`, `dispose()`. |
| `src/commons/types.ts` | Shared interfaces/enums for config slices, audio features, render uniforms. Pure types. | none. | n/a |
| `src/io/inputRouter.ts` | Normalizes pointer, keyboard, window events; exposes subscription API. | DOM APIs. | `attach(canvas)`, `subscribe(event, handler)`, `dispose()`. |
| `src/io/dashboard.ts` | Builds tweakpane UI shell, registers sections (stage, physics, postfx, audio). Emits config patches. | `tweakpane`, `config.ts`. | `init(config)`, `registerPanel(id, factory)`, `setTheme(theme)`, `dispose()`. |
| `src/presents/presents.ts` | Preset catalog & load/save/export utilities. Exports `listPresets()`, `applyPreset(name, config)`. | `config.ts`, optional `commons/types.ts`. | `applyPreset()`, `exportPreset()`, `importPreset(data)`. |
| `src/stage/stage.ts` | Manages renderer, scene, controls, lights, background injection. Exports `createStage(renderer, assets)`. | `three`, `commons/assets.ts`, `stage/background.ts`. | `init()`, `update(dt)`, `resize()`, `dispose()`. |
| `src/stage/background.ts` | Builds glass/floor geometry & handles glass params. Exports `createBackground(options)`. | `three`, `commons/assets.ts`. | `init()`, `updateConfig()`, `dispose()`. |
| `src/physics/mls-mpm.ts` | Encapsulates simulator (StructuredArray, kernels). Exports `createPhysics(renderer)`. | `three/tsl`, `commons/types.ts`. | `init(config)`, `step(dt)`, `applyAudio(features)`, `dispose()`. |
| `src/renders/materials.ts` | Shared node-material builders and MRT helpers for particle/point/glyph. Exports `createMaterial(kind, options)`. | `three/tsl`. | `createMaterial()`, `updateOptions()`. |
| `src/renders/renderPipeline.ts` | Creates renderers, attaches to scene, toggles modes. Exports `createRenderPipeline(stage, physics)`. | `materials.ts`, `physics/mls-mpm.ts`. | `init(config)`, `update(config, audio)`, `dispose()`. |
| `src/postfx/postfx.ts` | Post-processing composer, passes, lazy imports caching. Exports `createPostChain(renderer)`. | `three`, `three/tsl`. | `init(stage)`, `update(config)`, `render(stage)`, `setFocusDistance()`, `dispose()`. |
| `src/postfx/cameralens.ts` | Lens controller bridging config + postFX; handles pointer focus events. | `stage/stage.ts`, `postfx/postfx.ts`. | `attach(stage, post)`, `update(config)`, `onPointerFocus(d)`, `dispose()`. |
| `src/audio/audio.ts` | WebAudio engine + FFT features. Exports `createAudio()`. | WebAudio API. | `init(options)`, `connect(kind, payload)`, `update(dt)`, `configure(params)`, `dispose()`. |
| `src/audio/reactivity.ts` | Maps audio features to config deltas/uniforms. Exports `createRouter()`. | `commons/types.ts`. | `configure(routes)`, `map(features, config)`, `dispose()`. |
| `src/audio/audioPanel.ts` | Dashboard plug-in for audio controls, consumes audio/reactivity APIs. Exports `registerAudioPanel(dashboard, audio, router)`. | `io/dashboard.ts`, `audio/audio.ts`, `audio/reactivity.ts`. | `register()`, `dispose()`. |
| `src/runtime/app.ts` | Orchestrator: ties config, stage, physics, render pipeline, postfx, audio, dashboard. Handles hot swaps & lifecycle. | All modules above. | `init()`, `start()`, `update(dt)`, `swap(moduleId, loader)`, `dispose()`. |

## 4. Refactor Plan (Step-by-Step)

1. **Config Split**
   - Move schema/defaults/UI wiring out of `src/conf.js` into `config.ts`, `io/dashboard.ts`, `presents/presents.ts`.
   - Introduce typed slices (stage, physics, render, postfx, audio) with patch events; replace direct property mutations in modules with subscriptions.
   - Migration: replace `conf.` usages in modules with injected config slices; update imports accordingly.

2. **Runtime Shell**
   - Replace `src/app.js` with `runtime/app.ts` implementing module registry, update loop, and hot-swap hooks. Ensure init/resume/resume path emits events rather than using `setInterval` watchers.
   - Migration: all references to `new App(renderer)` switch to `createApp(renderer, config)` returning lifecycle object.

3. **Stage Consolidation**
   - Merge `stage.js`, `lights.js`, and `backgroundGeometry.js` into `stage/stage.ts` & `stage/background.ts`, exposing config-driven update methods.
   - Replace `setInterval` config syncs with config subscriptions; remove DOM coupling from stage.

4. **Physics Module Upgrade**
   - Convert `mlsMpmSimulator.js`, `structuredArray.js`, and renderer-specific config pulls into `physics/mls-mpm.ts` with exported API. Provide `applyConfig` for parameters and `applyAudio` for reactive uniforms.
   - Normalize naming (`MlsMpmSimulator` → `createPhysics`). Update renderers to call new API.

5. **Renderer Pipeline Merge**
   - Combine `particleRenderer.js`, `pointRenderer.js`, `glyphRenderer.js`, and `backgroundGeometry` scaling logic into `renders/renderPipeline.ts` with shared `materials.ts` for MRT toggles and scaling.
   - Provide `setMode('surface'|'points'|'glyphs')` to toggle visibility without direct config reads.

6. **PostFX & Lens**
   - Split `postfx.js` into `postfx/postfx.ts` (composer + passes) and `postfx/cameralens.ts` (lens mapping). Cache dynamic imports; expose `update` for config diff to avoid polling.
   - Migration: `lens.update()` becomes `lensController.update(config.lens)`; pointer focus events forwarded through `LensController`.

7. **Audio System Modularization**
   - Merge `audio/audioEngine.js` and `audio/router.js` into `audio/audio.ts` and `audio/reactivity.ts` with explicit APIs (init, connect, update, configureRoutes).
   - Rebuild `ui/audioPanel.js` as `audio/audioPanel.ts`, registering with `dashboard` to avoid DOM duplication.

8. **Dashboard & Presets**
   - Recreate tweakpane setup in `io/dashboard.ts`, exposing plugin registration. Move presets into `presents/presents.ts`, referencing config slices; remove preset persistence from config singleton.
   - Migration: `conf.registerBoundaryUpload` becomes `dashboard.on('boundaryUpload', handler)` using event emitters.

9. **Lifecycle & Hot-Swap**
   - Implement `runtime/app.ts` hot-swap manager to dispose & reload modules using dynamic imports. Ensure modules implement `dispose()` releasing event listeners, textures, workers.
   - Provide sample hot swap (postFX) hooking into `dashboard` for demonstration.

10. **Types & Build Alignment**
    - Convert modules to `.ts` for typed APIs; use `three` ESM imports (no `/webgpu` path alias) with bundler config adjustments.
    - Update `vite.config.js` if needed for TS/ESM path resolution.

## 5. Performance & Optimization Checklist

- **Frame Budget**: Target <4 ms physics step, <3 ms render, <2 ms postFX at 60 FPS by batching uniform updates and caching render passes.
- **Frame Graph**: Stage update → Physics step → Renderer update → PostFX render; ensure each module records timings to shared profiler for dashboard display.
- **Memory Strategy**: Centralize GPU buffer allocation inside physics module; reuse render targets with pooled `WebGLRenderTarget`/WebGPU textures. Dispose on hot swap.
- **Lazy Imports**: Cache dynamic imports (e.g., SMAA, FilmNode) in module scope to prevent duplicate loads during `renderAsync` hot swaps.【F:src/postfx.js†L290-L319】
- **Workerization**: Prepare optional worker build for physics (`physics/mls-mpm.worker.ts`) to offload heavy compute if main thread budget exceeded.
- **Profiling**: Integrate simple telemetry collector (performance.now deltas) with dashboard graphs replacing `conf.begin/end`. Provide dev command to log frame breakdown.
- **Auto-Scaling**: Keep adaptive particle count logic but relocate to `physics` module using measured frame times instead of `setInterval` watchers.【F:src/app.js†L332-L358】

## 6. Coding Standard & Conventions

- **Module Format**: Pure ESM + TypeScript; named exports for factories/interfaces; avoid default exports except runtime entry.
- **Typing**: Use strict TS config (`"strict": true`). Provide exported interfaces for each module; use `Readonly` types for immutable slices.
- **Structure**: One module per file following SFM; use internal sections with `//#region` comments for readability; keep helper functions file-private.
- **Lifecycle**: Each module exposes `init/update/dispose`; no implicit globals; event listeners must be registered/unregistered within lifecycle.
- **Error Handling**: Wrap async operations in `try/catch`, returning descriptive `ModuleInitError` objects up to `runtime/app.ts`.
- **Imports**: No try/catch around imports (per coding guideline); use dynamic `await import()` only for optional features.
- **Style**: Prefer `camelCase` for methods, `PascalCase` for factories returning module handles, consistent naming across config slices (`StageConfig`, `PhysicsConfig`, etc.).

## 7. Acceptance Criteria & Tests

- Project builds via `npm run build` and runs in dev via `npm run dev` without runtime errors.
- Each module can be imported independently, initialized with mock config, updated, and disposed without accessing global singletons.
- Demonstrate hot swap by dynamically reloading `postfx/postfx.ts` at runtime through `app.hotSwap('postfx', loader)` without restarting the entire app.
- TypeScript passes (`npm run typecheck`) and ESLint (if configured) are clean; add lint script if missing.
- Bundle size remains within acceptable delta (<10% increase) compared to current build; FPS meets or exceeds baseline (60 FPS on reference hardware).
- Provide automated smoke test: instantiate `runtime/app.ts` with mock canvas, simulate 3 frames, verify lifecycle hooks invoked; integrate into CI.
