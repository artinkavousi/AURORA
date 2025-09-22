# Flow — Next-Generation Sound Reactivity Vision

## 1. Current Baseline Snapshot
- Web Audio engine already captures FFT magnitudes, coarse bands (bass/mid/treble), centroid, flux, beat gate, and optional tempo probe. The signal is smoothed with shared attack/release envelopes.
- Audio router modulates key simulation fields (jet, vortex, curl, orbit, viscosity, etc.) and some environment motion. Visual post-processing hooks exist but are mostly dormant.
- A dedicated audio panel exposes high-level sensitivity controls, routing presets, basic diagnostics, and file selection. Per-feature smoothing and deeper diagnostics are not yet available.
- Visual feedback largely leans on bulk band energy; higher-order descriptors (spectral tilt, texture, transient density) and per-parameter baselines are absent, making fine art direction difficult.

## 2. North-Star Experience
Deliver a "living instrument" that responds like a seasoned VJ: music carves the flow volume, sculpts light and glass, and breathes through camera motion. The system should:
1. **Hear like a musician** – multi-resolution analysis with confident beat, tempo, and tonal balance understanding.
2. **Move like choreography** – fluid fields, emitters, and particle kinematics reshape with intent rather than jitter.
3. **Glow like cinema** – post FX and color grading pulse with restraint, keeping clarity and avoiding fatigue.
4. **Feel playable** – creators remix mappings instantly, save/load setups, and trust meters & presets for guidance.

## 3. Upgrade Pillars
- **Signal Intelligence**: Expand features to multi-band (sub, presence, air), tonal tilt, transient density, and timbral texture while keeping CPU cost low through shared FFT passes.
- **Kinematic Orchestration**: Introduce baseline-aware routing so physics parameters swing around art-directed anchors (radius, viscosity, emitter cadence) without runaway feedback.
- **Atmospheric Dynamics**: Drive bloom, exposure, saturation, DOF, and camera/environment sway with tempo-aware envelopes for cinematic pacing.
- **Creative Surface**: Elevate the audio panel with per-feature envelopes, richer diagnostics (tempo, multi-band meters), and deeper routing options packaged in themed styles.

## 4. System Design
### 4.1 Signal & Feature Pipeline
- Maintain current analyser chain with optional AGC/gating. Add log-spaced sub/low-mid/high-mid/presence/air averages, brightness ratio, roughness (spectral derivative), and transient density (flux vs. energy).
- Provide individual attack/release envelopes per feature plus global smoothing. Allow on-the-fly FFT size and threshold tuning.
- Track tempo phase & confidence; expose a sine/ramp helper for tempo-locked modulations.

### 4.2 Motion, Physics & Emitters
- Route sub bass to emitter radius/strength to punch fluid ejections while preserving average radius via baseline tracking.
- Use presence/air energy and spectral brightness to modulate curl/noise intensity and noise grain.
- Map transient density and beat envelopes to viscosity, APIC blend, and newly introduced orbit/curl accelerations with hard clamps.
- Tempo phase feeds slow breathing loops on vortex rotation/orbit as well as camera/environment sway.

### 4.3 Visual & Atmospheric Layer
- Bloom strength and exposure respond to presence/brightness with baseline blending, preventing washout.
- Color saturation & hue leverage spectral tilt; chroma/grain/DOF amounts track transient texture for cinematic grit when percussion hits.
- Introduce optional camera micro-roll/orbit tied to tempo for spatial storytelling.

### 4.4 Interaction & Panel Experience
- Expand meters: multi-band levels, tilt/texture readouts, tempo BPM + confidence.
- Provide envelope editor folders per feature, gating & AGC controls, and routing presets that cover cinematic, nebula, glitch, and ambient archetypes.
- Allow re-basing of controlled parameters so manual tweaks reset the "home" around which audio modulations oscillate.

### 4.5 Performance & Safety
- Keep analyser work allocation-free (reuse typed arrays) and maintain <0.5ms/frame on desktop.
- Hard clamp all routed parameters; store untouched baselines and smoothly restore when audio disables.
- Offer master intensity/reactivity multipliers for emergency tames during performance.

## 5. Roadmap & Milestones
1. **Foundation (this pass)**
   - Implement extended feature set (sub/presence/air, tilt, roughness, transient, brightness) with per-feature envelopes.
   - Upgrade router with baseline tracking, new visual/physics routes (bloom, exposure, DOF, radii) and tempo-aware sway.
   - Enhance audio panel for new controls, per-feature envelope editor, and enriched diagnostics.
2. **Expressive Motion**
   - Add particle emitter pulses, orbit path modulation, and camera micro-roll driven by tempo & tilt.
   - Introduce curve editors (pow/s-curve) per route plus stochastic offsets for organic feel.
3. **Cinematic Atmosphere**
   - Integrate LUT/grade presets, light linking, and dynamic volumetrics keyed to brightness & texture.
4. **Creative UX**
   - Preset browser with preview thumbnails, MIDI/OSC bindings, and session logging for later playback.

## 6. Success Rubric
| Pillar | Excellent | Acceptable | Needs Work |
| --- | --- | --- | --- |
| Musicality | Beat & tempo within ±2 BPM, tilt tracks tonal shifts, transient meter stable | Minor drift or occasional false positives | Frequent misfires or lag |
| Motion & Physics | Audio pushes jets/vortex within safe bounds, no numerical blowups | Rare clamped spikes, system self-recovers | Visible instability or flat response |
| Visual Atmosphere | Bloom/exposure breathe without clipping; saturation resets when audio stops | Occasional over-bright frames | Persistent washout or dullness |
| UX & Panel | Multi-band meters reliable, envelope editor intuitive, presets save/load | Minor UI quirks | Controls confusing or mis-synced |

## 7. Immediate Next Steps
- Ship extended feature extraction & envelope control, update router/panel (in progress with this implementation).
- Capture feedback on artistic feel, retune gains/curves, and line up emitter/camera choreography for the following pass.
