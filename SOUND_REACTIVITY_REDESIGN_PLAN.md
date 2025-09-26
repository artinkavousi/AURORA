# Aurora Sound Reactivity Redesign Blueprint

## Vision
Deliver a state-of-the-art musical visualizer that feels choreographed instead of parameter-driven. The refactor should transform the current audio hooks into a multi-layer system that reacts with intention: fluid motion that breathes, spatial gestures that dance through the stage, and post effects that glow with musical phrasing. The new experience must feel like an expressive instrument—confident, dynamic, and easy to steer.

## Current Pain Points
- **Fragmented mapping** – jet/vortex/visual routing lives in a flat dictionary; no hierarchy to coordinate motion, shading, and post FX.
- **Limited expressiveness** – responses are largely gain-scaled band envelopes, producing repetitive motion and little long-term phrasing.
- **UI overload** – current panel mixes engine knobs, mappings, and presets without narrative guidance. Discoverability is low.
- **No choreography memory** – system lacks temporal motifs (swells, drops, call-and-response) and spatial staging.
- **Post FX disconnect** – bloom, chromatic aberration, and exposure do not share the same musical cues as physics.

## Design Pillars
1. **Choreographed Layers** – separate motion, shading, and spatial/post layers, each with its own vocabulary but all driven by shared musical primitives (groove, shimmer, lift, sway).
2. **Blueprint Library** – expressive presets built around scenes (e.g., “Neon Pulse”, “Velvet Swirl”, “Cascade Bloom”) that configure routing, easing curves, and temporal motifs.
3. **Adaptive Dynamics** – tempo-aware envelopes, transient detectors, and loudness normalization that hold up across genres and volumes.
4. **Instrumental UI** – a left-aligned sound-reactivity studio with tabs for Source, Dynamics, Choreography, Visual Mood, and Diagnostics. Each tab explains its intent and offers macro/micro sliders.
5. **PostFX Cohesion** – post-processing knobs subscribe to the same musical primitives, ensuring camera sway, bloom, lens breathing, and color grading stay in sync with motion.

## Target Architecture
```
AudioEngine (features)
   ↓
FeatureComposer — derives primitives { groove, punch, shimmer, lift, sway, hush }
   ↓
ReactivityDirector
   ├── MotionLayerController → jet/vortex/curl/wave/apic/viscosity
   ├── VisualLayerController → color, noise, emissive accents, glyph motion
   └── AtmosLayerController → environment sway, camera micro-moves, postFX breath
   ↓
PostFxState & Conf mutations
```

### Feature Composer
- Extend existing feature extraction with rolling averages and beat-tracking confidence.
- Derive primitives:
  - **Groove**: weighted mix of level, bass envelope, and tempo-synced LFO.
  - **Punch**: transient energy (flux + beat envelope).
  - **Shimmer**: treble energy blended with spectral centroid.
  - **Lift**: long-term loudness trend (slow RMS rise).
  - **Sway**: mid-band pendulum using tempo phase.
  - **Hush**: inverse of groove for breakdowns.
- Provide smoothing and look-ahead to avoid latency while preventing jitter.

### Reactivity Director
- Holds a `scene` blueprint describing all layers (routes, easings, clamps, choreography curves).
- Maintains temporal state: phrase timers, drop detectors, accent counters.
- Applies motion/visual/atmos layers every frame via declarative route definitions.
- Supports blending between scenes for live switching.

### Motion Layer Controller
- Routes primitives to physics knobs with advanced behavior (e.g., logistic ramps for jets, beat-triggered wave bursts, swirl-phase modulation).
- Enforces safety bounds using global headroom heuristics (respecting `physMaxVelocity`, `dynamicViscosity`, etc.).
- Provides spatial choreography (rotating jet orientation, orbit axis morphing) tied to tempo phase.

### Visual Layer Controller
- Modulates color palettes, glyph sparkle, volumetric noise, and emissive thresholds using groove/shimmer/lift.
- Supports additive accents (strobe, glint trails) with user-defined ceiling to avoid fatigue.
- Hooks into post-processing via shared primitives.

### Atmos Layer Controller
- Orchestrates environment rotation, camera dolly/roll, depth-of-field breathing, bloom threshold/gain, chromatic aberration, and vignette exposure.
- Maintains rest states and applies easing when music quiets down (hush).
- Utilizes tempo phase to sync camera sway with downbeats.

## UI / UX Blueprint
- **Layout**: glass pane pinned to left center, width 380px, scrollable, with tabs.
- **Tabs**:
  1. **Source** – enable, input selection, gain, AGC, monitoring, FFT size.
  2. **Dynamics** – attack/release per primitive, transient threshold, tempo tools.
  3. **Choreography** – scene selector, intensity/reactivity macros, per-layer toggles, motion routing matrix.
  4. **Visual Mood** – controls for postFX breathing, color bloom, lens flare, camera sway.
  5. **Diagnostics** – mini spectrum, level meters, beat/tempo indicators.
- Provide inline helper text and icons for clarity.

## PostFX Integration
- Introduce `audioPrimitives` channel in `postFxState` so bloom/DOF/CA share groove/punch metrics.
- Define safe modulation ranges (e.g., bloom gain ±0.35, focus shift ±0.4m, CA ±0.002).
- Sync environment rotation offsets with camera sway to avoid disorientation.

## Implementation Roadmap
1. **Planning & Scaffolding (current)**
   - Create redesign doc, add FeatureComposer + ReactivityDirector scaffolding.
   - Restructure router into layered controllers with scene blueprints.
   - Move panel to left-aligned studio layout with tabbed UX.
2. **Engine Enhancements**
   - Expand `AudioEngine` outputs (lift, shimmer, hush) and expose smoothing controls.
3. **Visual & Motion Hooks**
   - Implement advanced physics modulation (logistic ramps, orbit choreography) and PostFX breathing.
4. **Preset Library & Diagnostics**
   - Ship curated scenes and upgrade diagnostics visualizations.
5. **Polish & QA**
   - Stress-test across genres, ensure safe parameter ranges, profile performance.

## Initial Deliverables (Sprint 1)
- `FeatureComposer` scaffold producing musical primitives.
- Layered `AudioRouter` refactor supporting scenes and postFX modulation hooks.
- Left-aligned Audio panel with Scene selection and reorganized controls.
- Baseline scene presets: "Neon Pulse", "Velvet Swirl", "Cascade Bloom".
