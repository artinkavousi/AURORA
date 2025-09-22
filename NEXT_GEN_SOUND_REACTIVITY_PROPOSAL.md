# Aurora Flow — Next-Generation Sound Reactivity Vision

## Vision
Deliver a flagship audio-reactive experience that feels alive, cinematic, and adaptive across genres. The system should translate sound into spatial motion, color, and post-processing nuance with minimal setup while remaining deeply craftable for advanced creators.

## Experience Goals
- **Immersive Motion:** Music should sculpt the fluid as if it were a living instrument—jets, vortices, and waves breathing in sync with rhythm and tonality.
- **Spatial Musicality:** Stereo balance, tempo, and tonal shifts should rotate, orbit, and fold the scene in three dimensions without disorienting the viewer.
- **Expressive Visual Tone:** Color, bloom, focus, and grain respond musically, producing shots that feel authored rather than procedurally random.
- **Guided Creativity:** Provide presets, smart defaults, and contextual diagnostics so both casual and expert users can dial in reactions quickly.
- **Performance Resilience:** Remain stable and performant on modern desktops with graceful fallback for laptops and web audio quirks.

## Pillars & Rubric
| Pillar | Target Rubric |
| --- | --- |
| **Musical Fidelity** | Beats align within ±25 ms. Tempo locks within ±3 BPM on steady material. Stereo balance and tonal tilt accurately reflect source. |
| **Motion Quality** | Fluid fields remain stable, never explode, and exhibit believable inertia. Audio-driven modulation uses eased transitions and clamps. |
| **Visual Polish** | PostFX modulation never clips or blinds; color reactions respect saturation and brightness limits. |
| **Control & Discovery** | Panel exposes master enable, intensity, per-route enables, preset styles, feature meters, and envelope tuning in <2 clicks. |
| **Performance** | Audio analysis <1 ms/frame @ 60 FPS; routing cost negligible; UI updates without layout thrash. |

## System Overview
1. **Perceptual Audio Analysis**
   - Wideband FFT (1024–4096) with Hann window and floating RMS.
   - Seven perceptual bands: sub, bass, low-mid, mid, high-mid, presence, air.
   - Dynamic descriptors: RMS/loudness, crest factor, flux, beat confidence, spectral centroid, dominant frequency, stereo width/balance.
   - Adaptive median gating, per-feature attack/release, AGC and silence gate to stabilize output.
   - Tempo tracking via autocorrelation with harmonic weighting and rolling confidence.

2. **Dynamic Mapping Core**
   - Routing matrix maps any feature to physics, kinematics, camera, and postFX parameters with pow/smooth shaping.
   - Multi-pass smoothing: base parameter inertia + feature envelope + tempo-aware easing.
   - Stereo-aware spatial controls (pan environment, orbit axis wobble).
   - Safety clamps for physical stability (jet radius/strength, viscosity, wave speed) and postFX ceilings.

3. **Reactive Visual Toolkit**
   - Physics: jets inhale sub energy, vortices dance with mids, curl noise sparkles with presence/air, orbit radius breathes with tempo.
   - PostFX: bloom, vignette, chroma, grain, and DOF animate subtly with loudness/tilt/air; motion blur pulses with beat confidence.
   - Camera & Environment: environment sway/pan, DOF focus shift, slight FOV breathing tied to tempo.

4. **Audio Command Center Panel**
   - Glassmorphic dock with sections for Input, Engine, Envelopes, Routing Presets, Physics, Spatial, PostFX, Diagnostics.
   - Graph monitors for level, band stack, flux vs. threshold, tempo confidence, stereo balance.
   - Quick routing presets (“Groovefield”, “Cinematic Orbit”, “Glitch Bloom”, “Ambient Drift”).
   - Export/import of routing setups via Conf presets.

5. **Evaluation & Tooling**
   - Debug overlay toggles for feature curves, beat locks, tempo timeline.
   - Logging hooks for QA to capture outliers (NaNs, BPM thrash, gate misfires).
   - Automated smoke check: run canned audio clips (drum loop, ambient pad, speech) and assert rubric metrics.

## Implementation Phases
1. **Audio Engine Upgrade**
   - Extend feature extraction to include perceptual bands, stereo metrics, crest, tempo normalization.
   - Expose `setFeatureSmoothing`, AGC, gate, tempo controls, and provide typed arrays for UI monitors.

2. **Advanced Routing Matrix**
   - Expand `AudioRouter` with new route types (jet radius, curl scale/time, orbit radius, wave speed/scale, bloom, vignette, grain, chroma, DOF focus/range, motion blur, environment pan).
   - Support new sources (`sub`, `lowMid`, `presence`, `air`, `tempo`, `tempoPulse`, `stereoSigned`, `crest`, `dynamics`).
   - Bake in safety clamps and combine sway/pan for environment rotation.

3. **Audio Panel 2.0**
   - Add master enable/master gain/reactivity sliders, per-feature envelope controls, routing folders (Physics, Spatial, PostFX, Environment).
   - Embed live monitors (graph meters, BPM readout, stereo meter) and improved file/mic management.
   - Ship enriched style presets using new routes.

4. **Integration & Polish**
   - Feed new features to `conf` mirrors for shaders/UI; update simulation to consume new modulation (curl scale/time, orbit radius, wave speed, postFX).
   - Refresh default “Audio Showcase” to leverage upgraded routing while maintaining safe defaults.
   - QA with sample tracks ensuring rubric targets and adjust clamps/presets accordingly.

## Deliverables
- Updated documentation & presets describing routing philosophy.
- Enhanced audio engine (`src/audio/audioEngine.js`), router (`src/audio/router.js`), panel (`src/ui/audioPanel.js`), and app wiring.
- Visual regression videos for major presets under different music genres.
- Metrics log demonstrating CPU overhead, beat accuracy, and tempo stability.

## Risks & Mitigations
- **Tempo jitter on sparse material:** fade confidence into routing, allow manual override in panel.
- **Physics blow-up:** enforce headroom clamps, blend audio influence vs. base values, expose master kill switch.
- **UI overload:** use grouped folders, tooltips, and presets; default to expanded Diagnostics for quick feedback.
- **Browser audio quirks:** handle autoplay restrictions gracefully, expose retry prompts, provide fallback sample clip.

## Success Criteria
- Users report the fluid feels “connected” to the music with no setup friction.
- Cinematic captures show coordinated physics + color + postFX breathing with track structure.
- Audio panel becomes primary creative surface for live shows and content creators.
- System remains stable during extended sessions (>30 minutes) with varied inputs.

