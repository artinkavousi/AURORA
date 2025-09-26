# PostFX Pipeline Refactor Plan

## Current Issues

- Post-processing parameters are scattered across `config.js`, renderers, and the post FX module, making the pipeline difficult to reason about or extend.
- Scene renderers conditionally write bloom mask data, coupling mesh materials with post effects and introducing redundant branching on every update.
- Camera, depth of field, and environment exposure controls live in the general dashboard, producing an overcrowded UI and unclear ownership of parameters.
- Lens automation writes back into the global config, further tangling responsibilities between rendering, camera control, and post-processing.

## Goals

1. Establish a standalone **PostFX pipeline** that owns every post effect parameter (bloom, DOF, chromatic aberration, grain, motion blur, grading, AA, SSR, GTAO, etc.) and camera exposure controls.
2. Remove bloom-related state from renderers and replace mask dependencies with a unified pipeline-controlled bloom pass.
3. Provide a left-aligned **PostFX panel** dedicated to camera/lens/post-processing controls for intuitive parameter discovery.
4. Offer a cohesive state container for PostFX with subscription support so render systems (stage, lens pipeline, renderer) can react without coupling to the app config.
5. Optimise updates by diffing state revisions and applying uniforms only when parameters change.

## Planned Architecture

- `src/postfx/state.js` exports a `PostFXState` singleton encapsulating all pipeline parameters, change notifications, and helpers.
- `PostFX` consumes this state, lazily applying updated uniforms and rebuilding optional nodes when state revisions change.
- `LensPipeline` reads/writes camera & DOF parameters through the shared state (including autofocus updates).
- Stage renders read camera/exposure/environment data from the PostFX state while retaining simulation/world settings in the main config.
- Renderers are simplified to always render their MRT outputs without bloom branching; the bloom mask is handled fully in post.
- A new `PostFXPanel` UI module (left-side layout) manipulates PostFX state exclusively and stays in sync via subscriptions.

## Implementation Steps

1. Introduce the `PostFXState` module with defaults, setters, and subscription API.
2. Refactor `PostFX` to consume the new state, remove config dependencies, and drop renderer-provided bloom masks.
3. Update `LensPipeline`, `Stage`, and `main` to reference the PostFX state for camera/lens/FX data.
4. Strip PostFX-related fields from `config.js` and simplify renderers to remove bloom toggles.
5. Replace dashboard bloom/DOF controls with the new `PostFXPanel` left-side UI.
6. Verify wiring end-to-end: state updates trigger post-processing, camera exposure, and UI refresh without touching the main config.

