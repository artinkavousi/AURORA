# Aurora Sound Reactivity Renaissance Proposal

## 1. Vision & Objectives
Aurora's current audio reactivity pipeline provides functional parameter routing, yet it leaves a significant amount of visual and experiential potential on the table. The redesign aims to transform the “sound reactivity” feature from a utilitarian modulator into an expressive performance instrument. We will deliver a system that:

1. **Feels alive and choreographed** – motion evolves with musical phrasing, not only instantaneous energy.
2. **Captures the full spectrum of sound** – low-frequency weight, mid-range groove, high-frequency glitter, rhythmic structure, and timbral variance each get a dedicated role.
3. **Enables cinematic storytelling** – designer-curated blueprints, spatial gestures, and post-processing responses blend into cohesive scenes.
4. **Empowers performers** – a panel that reveals the creative vocabulary, encourages experimentation, and keeps diagnostics front-and-center.
5. **Is future-proof** – modular architecture for adding new simulation hooks, visual layers, and AI-driven adaptations.

## 2. Experience Pillars
- **Kinetic Choreography**: Audio drives layered motion archetypes (thrusts, ribbons, swirls, ripples) with temporal memory, accentuating beats and phrase changes.
- **Spectral Embodiment**: Bass, mid, treble, transient flux, and tonal centroid each control dedicated physical & visual responses.
- **Atmospheric Synesthesia**: Post-processing (bloom, chroma, DOF), environment rotations, and haze parameters pulse with harmonic content.
- **Interactive Narratives**: Blueprint presets encapsulate aesthetics (“Pulse Bloom”, “Nebula Weave”, etc.), while advanced users can sculpt each layer's intensity and nuance.
- **Responsive Diagnostics**: Real-time scope, energy & beat meters, and tempo locks reassure performers during live setups.

## 3. System Architecture Overview
```
┌──────────────┐   audio stream   ┌────────────────────┐   feature flow   ┌────────────────────────┐   choreography   ┌────────────────────┐
│ AudioEngine  │ ───────────────► │ Feature Extractors │ ───────────────► │ Sound Reactivity Core │ ───────────────► │ Render Domains     │
│  (existing)  │                  │  (FFT, flux, beat)  │                 │  (new architecture)    │                  │ (physics, postFX)  │
└──────────────┘                   └────────────────────┘                  └────────────────────────┘                  └────────────────────┘
```

### 3.1 Feature Extraction Enhancements
- Integrate multi-band energy envelopes, spectral centroid glide, transient flux per band, rhythmic confidence, and micro-onset detectors.
- Maintain WebAudio FFT but expose modular feature nodes for future ML/beat-tracking upgrades.

### 3.2 Sound Reactivity Core (new)
- **Layer Stack**: Composable layers (Jet Thrust, Orbit Weave, Curl Filament, Wave Ripple, Viscosity Fog, Bloom Pulse, Chromatic Swing, Atmosphere Sway). Each layer has drivers, curves, beat accents, jitter, and blend modes.
- **Temporal Memory**: State machine tracks smoothed energy, beat holds, tempo phase, spectral tilt, and phase accumulators for swirling gestures.
- **Blueprints**: Curated sets of layer weights, envelopes, and tempo behavior. (Pulse Bloom, Nebula Weave, Chromatic Cascade, Percussive Flux, Ambient Drift).
- **Master Controls**: Intensity, Motion Mix, Groove Tightness, Shimmer Bloom, Atmosphere Weight, and Blueprint morph.
- **Context-aware Outputs**: Each layer maps to simulation forces (jet, vortex, curl, orbit, wave), fluid material parameters, environment rotation, and PostFX (bloom, chroma, saturation).
- **Smoothing & Safety**: Adaptive smoothing per layer, gating for disabled emitters, master clamps to prevent runaway values, and base-state drift correction.

### 3.3 Rendering / Simulation Targets
- **Physics**: Jet strength/radius, vortex strength, curl scale & intensity, orbit strength/radius/axis, wave amplitude/speed/axis, viscosity, APIC blend.
- **Scene Atmospherics**: Background rotation, environment rotation, boundary glass dispersion, environment sway amplitude.
- **PostFX**: Bloom strength & radius, chromatic aberration amount, color saturation & contrast, DOF highlight gain, film grain pulses.
- **Renderer Hooks**: Particle color modulation (existing `_audio*` uniforms), glyph jitter amplitude, point-sprite size.

## 4. Control Panel Redesign
### 4.1 Layout & Styling
- **Glass Control Dock**: Split vertical stack with glowing blueprint header, kinetic metrics row, and collapsible expert sections.
- **Live Diagnostics Row**: Multi-band energy meters, beat indicator, tempo readout, and waveform strip.
- **Blueprint Carousel**: Large preset selector with descriptive copy, preview icons, and morph slider to blend between adjacent blueprints (future extension).
- **Master Groove Controls**: Intensity, Motion, Groove tightness, Shimmer (color), Atmosphere (environment), Texture (material/viscosity).
- **Layer Matrix**: Each layer card shows driver source, icon, enable toggle, energy slider, accent slider, advanced options (curve, jitter, gating).
- **Input Section**: Audio enable/source, smoothing, sensitivity, AGC/gate, monitor, file drop zone with waveform preview.
- **Tempo Assistant**: Toggle to lock onto detected BPM, subdivide/double, manual tap tempo (phase align), shuffle accent.
- **Snapshots**: Save/recall layer mixes separate from global presets.

### 4.2 Interaction Design Principles
- High-frequency adjustments use horizontal sliders; toggles for enabling layers.
- Tooltips describing the sonic intent and recommended genres.
- Visual feedback (glow) when a layer is actively responding.
- All controls route through router API for undo/preset compatibility.

## 5. Implementation Plan
| Phase | Sprint Goals | Key Deliverables |
|-------|--------------|------------------|
| **Phase 1 – Foundation** | • Build SoundReactivitySystem core<br>• Implement blueprint definitions<br>• Replace legacy AudioRouter<br>• Create new router API (master controls, layer stack, JSON serialization) | • `src/audio/reactivity/` module<br>• Updated `audioRouter.js` exporting new system<br>• Derived metric utilities<br>• Unit-style runtime assertions |
| **Phase 2 – Panel Renaissance** | • Rebuild panel UI<br>• Integrate diagnostics row<br>• Expose blueprint + layer controls<br>• Improve audio input UX (monitoring, file, smoothing) | • Overhauled `audio/audioPanel.js`<br>• Style assets (icons, gradients)<br>• `router.subscribe` event wiring |
| **Phase 3 – Spatial & PostFX Coupling** | • Tie router outputs to post-processing (bloom, chroma, DOF highlights)<br>• Add environment sway & kinematic gestures (orbit axis flips, wave axis breathing) | • Extended apply() hooking to `postFxState`<br>• Config baselines for FX/scene |
| **Phase 4 – Advanced Dynamics** | • Tempo assistant, manual tap input<br>• Blueprint morphing + snapshots<br>• Optional ML onset classifier hook | • Additional router modules<br>• Panel snapshot manager |
| **Phase 5 – Polish & QA** | • Performance profiling, smoothing tweaks<br>• UX copywriting, tutorials<br>• Accessibility & theming review | • Documentation updates<br>• Demo video script |

## 6. Technical Details & Considerations
- **Baseline Tracking**: Router keeps drifting baselines for any parameter it touches to respect manual user tweaks.
- **Time Management**: Router stores timestamps to compute delta time and tempo-phase smoothing when audio is momentarily silent.
- **Safety**: Hard clamps on strengths, fallback when FFT data missing, gating to revert PostFX states when audio disabled.
- **Extensibility**: All layer definitions JSON-serializable; panel reads schema to auto-generate controls.
- **Testing**: Add runtime assertions for NaN/Infinity, logging toggles, ability to freeze audio input for deterministic testing.

## 7. Milestones & Success Metrics
- **M1 (Foundation)**: Audio-driven choreography matches or exceeds current responsiveness without regressions; blueprint swap yields noticeably different motion.
- **M2 (Panel)**: Designers prefer new panel in user study; average configuration time reduced by 30%.
- **M3 (Visual Impact)**: Demo sequences show synchronized environment + postFX pulses; watchers highlight micro-detail.
- **M4 (Performance)**: Router adds <0.2ms per frame on desktop, <0.35ms on mobile.
- **M5 (Documentation)**: Updated README + in-app hints reduce onboarding friction for new performers.

## 8. Next Steps
1. Land core router rewrite (in progress with this commit).
2. Wire blueprint metadata into panel auto-layout.
3. Expand diagnostics instrumentation (mini waveform & beat LEDs).
4. User testing loops with performers, gather feedback for blueprint tuning.

---
This proposal serves as the guiding document for the complete renaissance of Aurora’s sound reactivity system, aligning engineering tasks with experiential goals.

