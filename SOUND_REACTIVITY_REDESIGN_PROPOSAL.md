# Aurora Sound Reactivity Redesign Proposal

## 1. Vision
The current sound reactivity stack (audio engine, router, and control panel) does a good job of exposing Web Audio features, but it feels primarily technical. The next iteration should feel like a creative instrument: lush, kinetic, and choreographed. The redesign will introduce layered motion grammars, cinematic presets, and a design system that makes sculpting the response to music intuitive for both performers and curious newcomers.

## 2. Objectives
- **Expressive Motion Vocabulary** – Expand the feature set beyond static gain mapping so different musical fingerprints (bass drops, syncopated mids, shimmering highs) choreograph particle physics, color harmonics, and camera staging in complementary ways.
- **Layered Reactivity Architecture** – Introduce macro/meso/micro reactivity lanes with dedicated smoothing, bias, and jitter controls so designers can mix long arcs with crisp transients.
- **Visual-first UX** – Replace the utilitarian tweak panel with a “reactivity studio” palette that groups controls by creative intent (Input Sculpting, Motion Choreography, Atmosphere) and exposes live meters with motion history.
- **Preset Ecosystem** – Ship curated “Moods” that encapsulate tuned mappings and expose morph handles (Intensity, Reactivity, Pulse Spread) to encourage improvisation without overwhelming the user.
- **Future-readiness** – Provide extension points for physics fields, post-processing and camera behaviors so future renders can subscribe to the same musical grammar.

## 3. Current Assessment
| Layer | Today | Pain Points |
|-------|-------|-------------|
| **Audio Engine** | Reliable FFT, envelope, beat detection. | Single smoothing envelope per feature, lacks transient biasing and cross-band expressive metrics (tilt, warmth, motion history). |
| **Audio Router** | Direct mapping of single features to parameters with static curves. | No temporal shaping, no multi-source blending, limited range controls, little coherence between physics/visual layers. |
| **Audio Panel** | Flat tweakpane folder with technical labels. | Hard to reason about creatively, presets are simple list without previews, no quick morph controls, no animated feedback. |

## 4. Proposed Architecture
```
AudioEngine
  ↳ FeatureExtractor (level, bass/mid/treble, flux, centroid, warmth, transient, swing)
  ↳ TemporalLanes (macro, meso, micro envelopes with attack/release)
AudioReactivityHub
  ↳ Routes (per target) = {sources[], bias, gain, curve, attack, release, jitter, floor, ceiling}
  ↳ LayerState cache for smoothing + stochastic jitter phase
  ↳ MoodLibrary (preset definitions + descriptive metadata)
Control Surface (Reactivity Studio)
  ↳ Input Sculpting (source selection, band gains, AGC)
  ↳ Motion Choreography (macro/meso/micro sliders, route inspector)
  ↳ Atmosphere & Color (postFX hooks, environment sway)
  ↳ Mood Bar (preset carousel, morph handles, randomizer)
Renderer Integrations
  ↳ Physics fields, shader uniforms, postFX pulses subscribe to hub outputs
```

## 5. Key Features & Visual Concepts
- **Macro / Meso / Micro timelines** – Three envelope lanes with distinct smoothing (4–12s, 0.5–2s, 1–4 frames) modulate global arcs, physics pulses, and high-frequency shimmer.
- **Dynamic Range Sculpting** – Per-route floors, ceilings, and bias allow subtle ambient motion when music is quiet while still exploding on peaks.
- **Jitter & Swing** – Controlled stochastic modulation and tempo-synced phase offsets keep repeating beats feeling alive.
- **Spatial Mirrors** – Reactivity outputs drive camera dolly, environment rotation, and volumetric fog pulses to visualize energy in space.
- **Mood DNA** – Presets like *Nebula Bloom*, *Voltage Runway*, *Lunar Tidal* described by tags (genre fit, energy, color story) and exposing morph axes.
- **Panel Motion Language** – Gradient-backed sections, responsive meters, and inline sparkline previews emphasize creativity.

## 6. Implementation Roadmap
1. **Foundation (This PR & next)**
   - Introduce layered route model (attack/release/jitter/floor/ceiling/bias) and stateful smoothing in `AudioRouter`.
   - Build mood library + API (`getPresets`, `applyPreset`, `randomizePhase`).
   - Redesign audio panel layout with creative sections, morph sliders, and route inspector supporting new parameters.
2. **Engine Enhancements**
   - Extend `AudioEngine` with warmth/tilt/transient metrics and multi-lane envelopes.
   - Expose macro/meso/micro outputs to renderer.
3. **Visual + Physics Integration**
   - Map new router outputs to camera, environment, postFX, and shader hooks.
   - Add spatial visualization helpers (e.g., beat-synced volumetric flashes).
4. **Experience Polish**
   - Animated preset carousel with thumbnail previews.
   - Reactive onboarding hints + shareable preset JSON.

## 7. Risks & Mitigations
- **Complexity overload** – Mitigated by curating defaults, providing morph macros, and layering advanced controls under collapsible panels.
- **Performance regressions** – Router smoothing uses lightweight exponential filters; additional metrics computed in AudioWorklet can be gated by `audioPerformanceMode` flag.
- **User confusion** – Provide descriptive copy, icons, and tooltips; ensure presets are musical out of the box.

## 8. Next Steps After This Commit
- Instrument new router outputs throughout physics/visual subsystems.
- Prototype inline spectral sparkline component for the panel.
- User test the new presets with varied genres (ambient, techno, pop) and tweak parameters accordingly.

