// SoundReactivitySystem: expressive, layered audio → simulation orchestrator

import { postFxState } from "../postfx/state.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (current, target, lambda, dt) => {
  if (!Number.isFinite(lambda) || lambda <= 0 || !Number.isFinite(dt) || dt <= 0) {
    return target;
  }
  const factor = 1 - Math.exp(-lambda * dt);
  return current + (target - current) * factor;
};
const clone = (value) => JSON.parse(JSON.stringify(value));

const buildBlueprints = () => ({
  pulseBloom: {
    label: "Pulse Bloom",
    description: "Cinematic surges with luminous bloom pulses and swirling orbit ribbons.",
    master: { intensity: 1.2, motion: 1.0, groove: 1.1, shimmer: 1.3, ambience: 0.9, texture: 0.65 },
    tempo: { weighting: 0.65, jitter: 0.12 },
    layers: [
      {
        key: "bassPulse",
        label: "Bass Pulse Jets",
        type: "jet",
        driver: { blend: { bass: 0.7, fluxBass: 0.3 } },
        weight: 1.15,
        accent: 0.65,
        curve: 1.25,
        jitter: 0.22,
        parameters: {
          strength: { amplitude: 2.6, baseBlend: 0.62, max: 4.6, beatLift: 0.7, smoothing: 7.2 },
          radius: { min: 4.5, max: 8.5, amplitude: 1.8, smoothing: 4.0 },
        },
        ui: {
          color: "#ffb347",
          description: "Low-end surges push fluid jets with beat-driven boosts and subtle sway.",
        },
      },
      {
        key: "midWeave",
        label: "Mid Orbit Weave",
        type: "orbit",
        driver: { blend: { mid: 0.6, fluxMid: 0.4 } },
        weight: 0.95,
        accent: 0.45,
        curve: 1.1,
        jitter: 0.18,
        parameters: {
          strength: { amplitude: 1.6, baseBlend: 0.74, max: 3.2, smoothing: 5.2 },
          radius: { min: 18, max: 32, amplitude: 4.6, smoothing: 2.9 },
          axisMode: "swirl",
        },
        ui: {
          color: "#7fd0ff",
          description: "Mid frequencies weave orbital ribbons that lean with groove accents.",
        },
      },
      {
        key: "trebleFilaments",
        label: "Treble Filaments",
        type: "curl",
        driver: { blend: { treble: 0.7, fluxTreble: 0.3 } },
        weight: 1.05,
        accent: 0.38,
        curve: 1.15,
        jitter: 0.35,
        parameters: {
          strength: { amplitude: 2.1, baseBlend: 0.64, max: 3.4, smoothing: 6.4 },
          scale: { min: 0.012, max: 0.048, amplitude: 0.016, smoothing: 3.4, center: 0.55 },
          time: { amplitude: 0.35, smoothing: 2.5 },
        },
        ui: {
          color: "#ffd0f5",
          description: "High frequency glitter excites filament curls and time-warped turbulence.",
        },
      },
      {
        key: "beatRipple",
        label: "Beat Ripple",
        type: "wave",
        driver: "beat",
        weight: 1.0,
        accent: 0.85,
        curve: 1.0,
        jitter: 0.25,
        parameters: {
          amplitude: { amplitude: 1.5, baseBlend: 0.72, max: 2.4, beatLift: 0.5, smoothing: 4.6 },
          speed: { min: 0.85, max: 1.9, amplitude: 0.4, smoothing: 3.2 },
          axisMode: "flip",
        },
        ui: {
          color: "#88f7ff",
          description: "Beats send ripples through the fluid, alternating axes for cinematic swells.",
        },
      },
      {
        key: "energyMist",
        label: "Energy Mist",
        type: "material",
        driver: { blend: { flux: 0.6, energy: 0.4 } },
        weight: 0.55,
        accent: 0.45,
        curve: 1.0,
        parameters: {
          viscosity: { amount: 0.08, invert: true, smoothing: 1.8, min: 0.04, max: 0.28 },
          apic: { amplitude: 0.35, baseBlend: 0.78, smoothing: 2.0, max: 0.65 },
          noise: { amplitude: 0.35, baseBlend: 0.85, smoothing: 2.6, min: 0.4, max: 1.8 },
        },
        ui: {
          color: "#f4ff8c",
          description: "Flux-driven mist softens material texture while keeping motion crisp.",
        },
      },
      {
        key: "atmoSway",
        label: "Atmospheric Sway",
        type: "environment",
        driver: { blend: { energy: 0.6, tempo: 0.4 } },
        weight: 0.7,
        accent: 0.6,
        curve: 1.0,
        parameters: { amplitude: 0.26, swirl: 0.34 },
        ui: {
          color: "#c0cfff",
          description: "Environment and camera sway breathe with the track's phrasing.",
        },
      },
      {
        key: "bloomPulse",
        label: "Bloom Pulse",
        type: "bloom",
        driver: { blend: { brightness: 0.7, beat: 0.3 } },
        weight: 0.8,
        accent: 0.55,
        curve: 1.0,
        parameters: {
          strength: { amplitude: 0.55, baseBlend: 0.58, beatLift: 0.3 },
          radius: { amplitude: 0.18 },
        },
        ui: {
          color: "#ffe6bb",
          description: "Highlights bloom and breathe with high-end shimmer and beats.",
        },
      },
      {
        key: "chromaticSwing",
        label: "Chromatic Swing",
        type: "color",
        driver: { blend: { spectral: 0.6, fluxTreble: 0.4 } },
        weight: 0.8,
        accent: 0.5,
        curve: 1.0,
        parameters: {
          saturation: { amplitude: 0.42, bias: 0.05 },
          contrast: { amplitude: 0.24 },
        },
        ui: {
          color: "#ff9ad6",
          description: "Spectral balance swings the saturation palette with treble sparkle.",
        },
      },
      {
        key: "grainShimmer",
        label: "Grain Shimmer",
        type: "grain",
        driver: { blend: { fluxTreble: 0.6, beat: 0.4 } },
        weight: 0.6,
        accent: 0.45,
        curve: 1.0,
        parameters: { amount: 0.08 },
        ui: {
          color: "#f1f2ff",
          description: "Micro-grain pulses glitter in sync with treble energy.",
        },
      },
    ],
  },
  nebulaWeave: {
    label: "Nebula Weave",
    description: "Ambient, weightless motions with ribbon-like swirls and deep space drift.",
    master: { intensity: 0.95, motion: 0.85, groove: 0.9, shimmer: 1.05, ambience: 1.2, texture: 0.55 },
    tempo: { weighting: 0.45, jitter: 0.2 },
    layers: [
      {
        key: "bassLift",
        label: "Bass Lift",
        type: "jet",
        driver: { blend: { bass: 0.6, energy: 0.4 } },
        weight: 0.8,
        accent: 0.4,
        curve: 1.0,
        parameters: {
          strength: { amplitude: 1.8, baseBlend: 0.55, max: 3.2, smoothing: 6.2 },
          radius: { min: 5.5, max: 9.5, amplitude: 1.4, smoothing: 3.8 },
        },
        ui: {
          color: "#ffc48f",
          description: "Soft but wide bass lifts breathe into gentle jet plumes.",
        },
      },
      {
        key: "ambientOrbits",
        label: "Ambient Orbits",
        type: "orbit",
        driver: { blend: { mid: 0.5, energy: 0.5 } },
        weight: 0.85,
        accent: 0.35,
        curve: 1.0,
        parameters: {
          strength: { amplitude: 1.2, baseBlend: 0.72, max: 2.5, smoothing: 4.2 },
          radius: { min: 22, max: 36, amplitude: 6.2, smoothing: 2.1 },
          axisMode: "tempo",
        },
        ui: {
          color: "#9fe3ff",
          description: "Ambient mids weave long orbits that follow tempo swells.",
        },
      },
      {
        key: "nebulaCurl",
        label: "Nebula Curl",
        type: "curl",
        driver: { blend: { treble: 0.4, flux: 0.6 } },
        weight: 0.9,
        accent: 0.35,
        curve: 1.0,
        parameters: {
          strength: { amplitude: 1.4, baseBlend: 0.6, max: 2.4, smoothing: 4.8 },
          scale: { min: 0.018, max: 0.06, amplitude: 0.02, smoothing: 2.6, center: 0.45 },
          time: { amplitude: 0.26, smoothing: 2.0 },
        },
        ui: {
          color: "#c5afff",
          description: "Ethereal curls shimmer with treble sheen and transient flux.",
        },
      },
      {
        key: "slowTide",
        label: "Slow Tide",
        type: "wave",
        driver: { blend: { energy: 0.5, tempo: 0.5 } },
        weight: 0.7,
        accent: 0.45,
        curve: 1.0,
        parameters: {
          amplitude: { amplitude: 1.0, baseBlend: 0.78, max: 2.0, smoothing: 3.0 },
          speed: { min: 0.6, max: 1.3, amplitude: 0.35, smoothing: 2.6 },
          axisMode: "ease",
        },
        ui: {
          color: "#a6ffdd",
          description: "Waves drift slowly, ideal for ambient or downtempo passages.",
        },
      },
      {
        key: "nebulaTexture",
        label: "Nebula Texture",
        type: "material",
        driver: { blend: { flux: 0.5, spectral: 0.5 } },
        weight: 0.6,
        accent: 0.4,
        parameters: {
          viscosity: { amount: 0.06, invert: false, smoothing: 1.4, min: 0.06, max: 0.32 },
          apic: { amplitude: 0.28, baseBlend: 0.82, smoothing: 1.7, max: 0.55 },
          noise: { amplitude: 0.28, baseBlend: 0.9, smoothing: 2.4, min: 0.35, max: 1.4 },
        },
        ui: {
          color: "#ffe0ff",
          description: "Nebula textures float with balanced spectral energy.",
        },
      },
      {
        key: "starlight",
        label: "Starlight",
        type: "bloom",
        driver: { blend: { brightness: 0.6, fluxTreble: 0.4 } },
        weight: 0.65,
        accent: 0.35,
        parameters: {
          strength: { amplitude: 0.4, baseBlend: 0.5 },
          radius: { amplitude: 0.12 },
        },
        ui: {
          color: "#fff7c0",
          description: "Ambient starlight pulses softly with shimmer.",
        },
      },
      {
        key: "auraColor",
        label: "Aura Color",
        type: "color",
        driver: { blend: { spectral: 0.5, centroid: 0.5 } },
        weight: 0.7,
        accent: 0.35,
        parameters: {
          saturation: { amplitude: 0.28, bias: 0.02 },
          contrast: { amplitude: 0.18 },
        },
        ui: {
          color: "#a6b9ff",
          description: "Color palette shifts to follow the tonal centroid drift.",
        },
      },
    ],
  },
  chromaticCascade: {
    label: "Chromatic Cascade",
    description: "High-energy club experience with kinetic bursts and bold chroma swings.",
    master: { intensity: 1.35, motion: 1.15, groove: 1.25, shimmer: 1.45, ambience: 0.75, texture: 0.8 },
    tempo: { weighting: 0.75, jitter: 0.08 },
    layers: [
      {
        key: "subLaunch",
        label: "Sub Launch",
        type: "jet",
        driver: { blend: { bass: 0.65, beat: 0.35 } },
        weight: 1.35,
        accent: 0.75,
        curve: 1.35,
        jitter: 0.28,
        parameters: {
          strength: { amplitude: 3.1, baseBlend: 0.6, max: 5.0, beatLift: 0.85, smoothing: 8.0 },
          radius: { min: 4.0, max: 7.4, amplitude: 2.2, smoothing: 4.8 },
        },
        ui: {
          color: "#ff8f6b",
          description: "Hard-hitting subs punch dramatic jet bursts.",
        },
      },
      {
        key: "spiralDrive",
        label: "Spiral Drive",
        type: "orbit",
        driver: { blend: { mid: 0.55, fluxMid: 0.45 } },
        weight: 1.2,
        accent: 0.6,
        curve: 1.2,
        parameters: {
          strength: { amplitude: 2.0, baseBlend: 0.7, max: 3.6, smoothing: 6.0 },
          radius: { min: 16, max: 28, amplitude: 5.2, smoothing: 3.3 },
          axisMode: "swirl",
        },
        ui: {
          color: "#9cfffa",
          description: "Midrange riffs spin aggressive spiral motions.",
        },
      },
      {
        key: "fracture",
        label: "Treble Fracture",
        type: "curl",
        driver: { blend: { treble: 0.65, fluxTreble: 0.35 } },
        weight: 1.3,
        accent: 0.5,
        parameters: {
          strength: { amplitude: 2.6, baseBlend: 0.6, max: 4.0, smoothing: 6.8 },
          scale: { min: 0.01, max: 0.045, amplitude: 0.022, smoothing: 3.8, center: 0.6 },
          time: { amplitude: 0.45, smoothing: 2.6 },
        },
        ui: {
          color: "#ffd4ff",
          description: "Treble shards fracture into electric filaments.",
        },
      },
      {
        key: "beatSlices",
        label: "Beat Slices",
        type: "wave",
        driver: { blend: { beat: 0.5, tempo: 0.5 } },
        weight: 1.15,
        accent: 0.9,
        parameters: {
          amplitude: { amplitude: 1.8, baseBlend: 0.65, max: 2.7, beatLift: 0.6, smoothing: 5.0 },
          speed: { min: 1.0, max: 2.4, amplitude: 0.65, smoothing: 3.7 },
          axisMode: "flip",
        },
        ui: {
          color: "#96ffa6",
          description: "Percussive slices carve through the volume with alternating axes.",
        },
      },
      {
        key: "hybridTexture",
        label: "Hybrid Texture",
        type: "material",
        driver: { blend: { flux: 0.6, beat: 0.4 } },
        weight: 0.9,
        accent: 0.6,
        parameters: {
          viscosity: { amount: 0.12, invert: true, smoothing: 2.2, min: 0.03, max: 0.25 },
          apic: { amplitude: 0.45, baseBlend: 0.7, smoothing: 2.4, max: 0.7 },
          noise: { amplitude: 0.5, baseBlend: 0.75, smoothing: 2.8, min: 0.6, max: 2.0 },
        },
        ui: {
          color: "#fff1a2",
          description: "Material grit responds aggressively to rhythmic flux.",
        },
      },
      {
        key: "envThrill",
        label: "Env Thrill",
        type: "environment",
        driver: { blend: { energy: 0.5, swirl: 0.5 } },
        weight: 0.9,
        accent: 0.75,
        parameters: { amplitude: 0.32, swirl: 0.45 },
        ui: {
          color: "#c3e0ff",
          description: "Camera and environment swing dramatically with swirl motion.",
        },
      },
      {
        key: "glowRush",
        label: "Glow Rush",
        type: "bloom",
        driver: { blend: { brightness: 0.6, beat: 0.4 } },
        weight: 1.0,
        accent: 0.7,
        parameters: {
          strength: { amplitude: 0.75, baseBlend: 0.6, beatLift: 0.4 },
          radius: { amplitude: 0.24 },
        },
        ui: {
          color: "#fff0c3",
          description: "Bright bloom rushes flare on every bar drop.",
        },
      },
      {
        key: "chromaticRain",
        label: "Chromatic Rain",
        type: "color",
        driver: { blend: { spectral: 0.4, brightness: 0.6 } },
        weight: 1.05,
        accent: 0.65,
        parameters: {
          saturation: { amplitude: 0.55, bias: 0.08 },
          contrast: { amplitude: 0.32 },
        },
        ui: {
          color: "#ff83c9",
          description: "Bold chroma swings follow treble sparkle and energy peaks.",
        },
      },
      {
        key: "strobeChroma",
        label: "Strobe Chroma",
        type: "chroma",
        driver: { blend: { beat: 0.6, fluxTreble: 0.4 } },
        weight: 0.8,
        accent: 0.7,
        parameters: { amount: 0.006 },
        ui: {
          color: "#ffe8ff",
          description: "Chromatic aberration flashes with treble-driven beats.",
        },
      },
    ],
  },
});

const layerDefaults = (layer) => ({
  enabled: true,
  weight: 1.0,
  accent: 0.5,
  curve: 1.0,
  jitter: 0.0,
  parameters: {},
  ui: {},
  ...layer,
});

const resolveDriverValue = (driver, derived) => {
  const read = (key) => {
    switch (key) {
      case "bass": return derived.bassEnergy;
      case "mid": return derived.midEnergy;
      case "treble": return derived.trebleEnergy;
      case "energy": return derived.energy;
      case "beat": return derived.beatPulse;
      case "tempo": return derived.tempoPulse;
      case "flux": return derived.flux;
      case "fluxBass": return derived.fluxBass;
      case "fluxMid": return derived.fluxMid;
      case "fluxTreble": return derived.fluxTreble;
      case "brightness": return derived.brightness;
      case "spectral": return (derived.spectralBalance + 1) * 0.5;
      case "contrast": return derived.spectralContrast;
      case "swirl": return (derived.swirlSin + 1) * 0.5;
      case "centroid": return derived.centroid;
      default: return derived.energy;
    }
  };
  if (!driver) return derived.energy;
  if (typeof driver === "function") {
    try { return clamp(driver(derived) ?? 0, 0, 1); } catch { return derived.energy; }
  }
  if (Array.isArray(driver)) {
    if (!driver.length) return derived.energy;
    const sum = driver.reduce((acc, key) => acc + read(key), 0);
    return clamp(sum / driver.length, 0, 1);
  }
  if (typeof driver === "object") {
    const { blend } = driver;
    if (blend && typeof blend === "object") {
      let sum = 0; let weight = 0;
      Object.entries(blend).forEach(([key, w]) => {
        if (typeof w !== "number") return;
        sum += read(key) * w;
        weight += Math.abs(w);
      });
      if (weight <= 0) return derived.energy;
      return clamp(sum / weight, 0, 1);
    }
  }
  return read(driver);
};

class SoundReactivitySystem {
  constructor() {
    this.enabled = true;
    this.master = { intensity: 1.0, motion: 1.0, groove: 1.0, shimmer: 1.0, ambience: 0.8, texture: 0.6 };
    this.tempo = { weighting: 0.6, jitter: 0.12 };
    this._blueprints = buildBlueprints();
    this._listeners = new Set();
    this._temporal = {};
    this._baseline = {};
    this._fxBaseline = null;
    this._lastTime = null;
    this.layers = {};
    this.currentBlueprint = null;
    this._context = { envOffset: 0, envSwing: 0, bloomStrength: 0, bloomRadius: 0, colorSaturation: 0, colorContrast: 0, chromaAmount: 0, grainAmount: 0 };
    this.setBlueprint("pulseBloom");
  }

  // Blueprint + master metadata -------------------------------------------------
  getBlueprintOptions() {
    return Object.entries(this._blueprints).map(([value, blueprint]) => ({
      value,
      text: blueprint.label || value,
    }));
  }

  getBlueprintDescription(name = this.currentBlueprint) {
    const bp = this._blueprints[name];
    return bp ? bp.description || "" : "";
  }

  getCurrentBlueprint() { return this.currentBlueprint; }

  setBlueprint(name) {
    const blueprint = this._blueprints[name];
    if (!blueprint) return;
    this.currentBlueprint = name;
    this.master = { ...this.master, ...(blueprint.master || {}) };
    this.tempo = { ...this.tempo, ...(blueprint.tempo || {}) };
    const nextLayers = {};
    (blueprint.layers || []).forEach((layer) => {
      const norm = layerDefaults(layer);
      nextLayers[norm.key] = norm;
    });
    this.layers = nextLayers;
    this._emit("blueprint", { name });
  }

  getMasterSchema() {
    return [
      { key: "intensity", label: "intensity", min: 0.3, max: 2.5, step: 0.01 },
      { key: "motion", label: "motion mix", min: 0.2, max: 2.0, step: 0.01 },
      { key: "groove", label: "groove", min: 0.2, max: 2.0, step: 0.01 },
      { key: "shimmer", label: "shimmer", min: 0.2, max: 2.5, step: 0.01 },
      { key: "ambience", label: "atmosphere", min: 0.0, max: 2.0, step: 0.01 },
      { key: "texture", label: "texture", min: 0.0, max: 2.0, step: 0.01 },
    ];
  }

  getTempoSchema() {
    return [
      { key: "weighting", label: "tempo weight", min: 0.0, max: 1.0, step: 0.01 },
      { key: "jitter", label: "tempo jitter", min: 0.0, max: 0.5, step: 0.01 },
    ];
  }

  getMasterState() { return { ...this.master }; }
  getTempoState() { return { ...this.tempo }; }

  setMaster(key, value) {
    if (!(key in this.master)) return;
    const meta = this.getMasterSchema().find((m) => m.key === key);
    const min = meta ? meta.min : 0;
    const max = meta ? meta.max : 2;
    this.master[key] = clamp(value ?? this.master[key], min, max);
    this._emit("master", { key, value: this.master[key] });
  }

  setTempoState(patch) {
    Object.entries(patch || {}).forEach(([key, value]) => {
      if (!(key in this.tempo)) return;
      const meta = this.getTempoSchema().find((m) => m.key === key);
      const min = meta ? meta.min : 0;
      const max = meta ? meta.max : 1;
      this.tempo[key] = clamp(value ?? this.tempo[key], min, max);
    });
    this._emit("tempo", { ...this.tempo });
  }

  setEnabled(v) {
    this.enabled = !!v;
    this._emit("enabled", { enabled: this.enabled });
  }

  describeLayers() {
    return Object.values(this.layers).map((layer) => ({
      key: layer.key,
      label: layer.label,
      type: layer.type,
      driver: layer.driver,
      enabled: layer.enabled !== false,
      weight: layer.weight,
      accent: layer.accent,
      curve: layer.curve,
      jitter: layer.jitter ?? 0,
      ui: layer.ui || {},
    }));
  }

  getLayerState(key) {
    const layer = this.layers[key];
    return layer ? clone(layer) : null;
  }

  updateLayer(key, patch) {
    const layer = this.layers[key];
    if (!layer) return;
    Object.assign(layer, patch);
    this._emit("layer", { key, patch });
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  toJSON() {
    return {
      enabled: this.enabled,
      master: { ...this.master },
      tempo: { ...this.tempo },
      blueprint: this.currentBlueprint,
      layers: clone(this.layers),
    };
  }

  fromJSON(data) {
    if (!data || typeof data !== "object") return;
    if (typeof data.enabled === "boolean") this.enabled = data.enabled;
    if (data.master) Object.assign(this.master, data.master);
    if (data.tempo) Object.assign(this.tempo, data.tempo);
    if (data.blueprint && this._blueprints[data.blueprint]) {
      this.setBlueprint(data.blueprint);
    }
    if (data.layers) {
      const restored = {};
      Object.values(data.layers).forEach((layer) => {
        if (!layer || !layer.key) return;
        restored[layer.key] = layerDefaults(layer);
      });
      if (Object.keys(restored).length) this.layers = restored;
    }
    this._emit("restore", this.toJSON());
  }

  // Runtime application ---------------------------------------------------------
  apply(features, conf, elapsed, envBase) {
    if (!this.enabled || !features || !conf) return;

    const now = Number.isFinite(elapsed) ? elapsed : performance.now() / 1000;
    let dt = 1 / 60;
    if (this._lastTime != null) {
      dt = clamp(now - this._lastTime, 1 / 240, 0.25);
    }
    this._lastTime = now;

    this._updateBaselines(conf);
    this._updateFxBaselines();

    const derived = this._computeDerived(features, dt);
    const context = this._resetContext();

    Object.values(this.layers).forEach((layer) => {
      if (!layer || layer.enabled === false) return;
      const handler = this._layerHandlers[layer.type];
      if (handler) {
        try {
          handler.call(this, layer, derived, conf, dt, context);
        } catch (err) {
          if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
            console.warn("audio layer error", layer.key, err);
          }
        }
      }
    });

    this._applyGlobalTexture(derived, conf, dt);
    this._applyEnvironment(context, envBase);
    this._applyPostFx(context);
  }

  _resetContext() {
    return this._context = {
      envOffset: 0,
      envSwing: 0,
      bloomStrength: 0,
      bloomRadius: 0,
      colorSaturation: 0,
      colorContrast: 0,
      chromaAmount: 0,
      grainAmount: 0,
    };
  }

  _computeDerived(features, dt) {
    const clamp01 = (v) => clamp(Number.isFinite(v) ? v : 0, 0, 1);
    const energy = clamp01(features.level);
    const bass = clamp01(features.bass);
    const mid = clamp01(features.mid);
    const treble = clamp01(features.treble);
    const beat = clamp01(features.beat);
    const flux = clamp01(features.flux);
    const fluxBass = clamp01(features.fluxBass);
    const fluxMid = clamp01(features.fluxMid);
    const fluxTreble = clamp01(features.fluxTreble);
    const centroid = clamp(features.centroid ?? 0.5, 0, 1);

    const state = this._temporal;
    if (!state.initialized) {
      state.energy = energy;
      state.bass = bass;
      state.mid = mid;
      state.treble = treble;
      state.momentum = flux;
      state.spark = fluxTreble;
      state.beatHold = 0;
      state.beatCooldown = 0;
      state.swirlPhase = 0;
      state.tempoPhase = features.tempoPhase01 ?? 0;
      state.tempoBpm = features.tempoBpm || 120;
      state.tempoConfidence = clamp01(features.tempoConf);
      state.initialized = true;
    }

    const smoothing = (speed, current, target) => lerp(current, target, clamp(dt * speed, 0, 1));
    state.energy = smoothing(4.5, state.energy, energy);
    state.bass = smoothing(4.0, state.bass, bass);
    state.mid = smoothing(4.0, state.mid, mid);
    state.treble = smoothing(4.0, state.treble, treble);
    state.momentum = smoothing(6.0, state.momentum, flux);
    state.spark = smoothing(6.5, state.spark, fluxTreble);

    if (beat > 0.6) {
      if (state.beatCooldown <= 0.01) {
        state.beatHold = 1.0;
        state.beatCooldown = 0.18;
      } else {
        state.beatHold = Math.max(state.beatHold, (beat - 0.6) / 0.4);
      }
    }
    state.beatHold = Math.max(0, state.beatHold - dt * (2.2 - this.master.groove * 0.7));
    state.beatCooldown = Math.max(0, state.beatCooldown - dt);

    const tempoConfidence = clamp01(features.tempoConf ?? state.tempoConfidence ?? 0);
    state.tempoConfidence = smoothing(2.5, state.tempoConfidence || tempoConfidence, tempoConfidence);
    const bpm = features.tempoBpm || state.tempoBpm || 120;
    state.tempoBpm = smoothing(1.5, state.tempoBpm || bpm, bpm);

    let tempoPhase = features.tempoPhase01;
    if (!Number.isFinite(tempoPhase)) {
      const tempoSpeed = clamp(state.tempoBpm / 60, 0.4, 4.0);
      state.tempoPhase = (state.tempoPhase + dt * tempoSpeed) % 1;
      tempoPhase = state.tempoPhase;
    } else {
      state.tempoPhase = tempoPhase;
    }

    state.swirlPhase += dt * (0.6 + state.energy * 1.4 + this.master.groove * 0.5);
    const swirlSin = Math.sin(state.swirlPhase);

    const tempoPulse = Math.pow(Math.max(0, Math.sin(tempoPhase * Math.PI)), 1.5) * (this.tempo.weighting);
    const brightness = clamp(0.35 * mid + 0.65 * treble + fluxTreble * 0.35, 0, 1);
    const spectralBalance = clamp((bass * 0.6 + mid * 0.3) - (treble * 0.8), -1, 1);
    const spectralContrast = clamp(Math.abs(spectralBalance), 0, 1);

    return {
      dt,
      energy,
      energyAvg: state.energy,
      bassEnergy: state.bass,
      midEnergy: state.mid,
      trebleEnergy: state.treble,
      beat,
      beatPulse: Math.max(state.beatHold, beat),
      tempoPulse,
      tempoConfidence: state.tempoConfidence,
      tempoPhase,
      flux,
      fluxBass,
      fluxMid,
      fluxTreble,
      brightness,
      spectralBalance,
      spectralContrast,
      centroid,
      swirlSin,
      swirlPhase: state.swirlPhase,
      master: { ...this.master },
      ambience: this.master.ambience,
    };
  }

  _computeLayerDrive(layer, derived) {
    const driverValue = resolveDriverValue(layer.driver, {
      energy: derived.energy,
      bassEnergy: derived.bassEnergy,
      midEnergy: derived.midEnergy,
      trebleEnergy: derived.trebleEnergy,
      beatPulse: derived.beatPulse,
      tempoPulse: derived.tempoPulse,
      flux: derived.flux,
      fluxBass: derived.fluxBass,
      fluxMid: derived.fluxMid,
      fluxTreble: derived.fluxTreble,
      brightness: derived.brightness,
      spectralBalance: derived.spectralBalance,
      spectralContrast: derived.spectralContrast,
      swirlSin: derived.swirlSin,
      centroid: derived.centroid,
    });
    const curve = clamp(layer.curve ?? 1.0, 0.25, 4.0);
    const weight = clamp(layer.weight ?? 1.0, 0, 3.0);
    const accent = clamp(layer.accent ?? 0.5, 0, 2.0);
    const jitter = clamp(layer.jitter ?? 0, 0, 1.0);

    const curved = Math.pow(clamp(driverValue, 0, 1), curve);
    const base = curved * weight * this.master.motion * this.master.intensity;
    const accentBoost = derived.beatPulse * accent * this.master.groove;
    const tempoBoost = derived.tempoPulse * (accent * 0.6) * this.master.groove;
    const jitterTerm = jitter > 0
      ? ((Math.sin(derived.swirlPhase * (1.6 + jitter * 2.4)) + Math.cos(derived.swirlPhase * 0.6 + jitter * 1.3)) * 0.25 + 0.5) * jitter
      : 0;
    const total = base + accentBoost + tempoBoost + jitterTerm;
    return clamp(total, 0, 6);
  }

  _applyJetLayer(layer, derived, conf, dt) {
    if (!conf.jetEnabled) return;
    const drive = this._computeLayerDrive(layer, derived);
    const cfg = layer.parameters?.strength || {};
    const base = this._baseline.jetStrength ?? conf.jetStrength ?? 0.6;
    const blend = clamp(cfg.baseBlend ?? 0.7, 0, 1.2);
    const amplitude = cfg.amplitude ?? 2.0;
    let target = base * blend + drive * amplitude;
    if (cfg.beatLift) target += derived.beatPulse * cfg.beatLift * this.master.groove;
    target *= clamp(this.master.motion, 0.2, 2.5);
    const max = cfg.max ?? 4.5;
    target = clamp(target, 0, max);
    conf.jetStrength = damp(conf.jetStrength, target, cfg.smoothing ?? 7.0, dt);

    const radiusCfg = layer.parameters?.radius;
    if (radiusCfg && typeof conf.jetRadius === "number") {
      const baseRadius = this._baseline.jetRadius ?? conf.jetRadius;
      const amplitudeR = radiusCfg.amplitude ?? 1.5;
      let radiusTarget = baseRadius + drive * amplitudeR;
      if (radiusCfg.min !== undefined) radiusTarget = Math.max(radiusCfg.min, radiusTarget);
      if (radiusCfg.max !== undefined) radiusTarget = Math.min(radiusCfg.max, radiusTarget);
      conf.jetRadius = damp(conf.jetRadius, radiusTarget, radiusCfg.smoothing ?? 4.5, dt);
    }

    if (conf.jetDir && typeof conf.jetDir === "object" && layer.parameters?.tilt) {
      const tilt = layer.parameters.tilt;
      const amount = (tilt.amount ?? 0.12) * drive;
      conf.jetDir.x = clamp(conf.jetDir.x + Math.sin(derived.swirlPhase) * amount, -1, 1);
      conf.jetDir.z = clamp(conf.jetDir.z + Math.cos(derived.swirlPhase * 0.7) * amount * 0.6, -1, 1);
    }
  }

  _applyOrbitLayer(layer, derived, conf, dt) {
    if (!conf.orbitEnabled) return;
    const drive = this._computeLayerDrive(layer, derived);
    const cfg = layer.parameters?.strength || {};
    const base = this._baseline.orbitStrength ?? conf.orbitStrength ?? 0.5;
    const blend = clamp(cfg.baseBlend ?? 0.72, 0, 1.2);
    let target = base * blend + drive * (cfg.amplitude ?? 1.6);
    target = clamp(target, 0, cfg.max ?? 3.5);
    conf.orbitStrength = damp(conf.orbitStrength, target, cfg.smoothing ?? 5.5, dt);

    const radiusCfg = layer.parameters?.radius;
    if (radiusCfg && typeof conf.orbitRadius === "number") {
      const baseRadius = this._baseline.orbitRadius ?? conf.orbitRadius ?? 22;
      let rTarget = baseRadius + drive * (radiusCfg.amplitude ?? 4.0);
      if (radiusCfg.min !== undefined) rTarget = Math.max(radiusCfg.min, rTarget);
      if (radiusCfg.max !== undefined) rTarget = Math.min(radiusCfg.max, rTarget);
      conf.orbitRadius = damp(conf.orbitRadius, rTarget, radiusCfg.smoothing ?? 3.0, dt);
    }

    const axisMode = layer.parameters?.axisMode;
    if (axisMode === "swirl") {
      conf.orbitAxis = derived.swirlSin > 0.35 ? "x" : derived.swirlSin < -0.35 ? "y" : "z";
    } else if (axisMode === "tempo") {
      conf.orbitAxis = derived.tempoPulse > 0.5 ? "x" : "z";
    }
  }

  _applyCurlLayer(layer, derived, conf, dt) {
    if (!conf.curlEnabled) return;
    const drive = this._computeLayerDrive(layer, derived);
    const cfg = layer.parameters?.strength || {};
    const base = this._baseline.curlStrength ?? conf.curlStrength ?? 0.6;
    let target = base * (cfg.baseBlend ?? 0.68) + drive * (cfg.amplitude ?? 1.8) * this.master.motion;
    target = clamp(target, 0, cfg.max ?? 3.4);
    conf.curlStrength = damp(conf.curlStrength, target, cfg.smoothing ?? 5.8, dt);

    const scaleCfg = layer.parameters?.scale;
    if (scaleCfg && typeof conf.curlScale === "number") {
      const baseScale = this._baseline.curlScale ?? conf.curlScale ?? 0.02;
      const center = clamp(scaleCfg.center ?? 0.5, 0, 1);
      let targetScale = baseScale + (drive - center) * (scaleCfg.amplitude ?? 0.015);
      if (scaleCfg.min !== undefined) targetScale = Math.max(scaleCfg.min, targetScale);
      if (scaleCfg.max !== undefined) targetScale = Math.min(scaleCfg.max, targetScale);
      conf.curlScale = damp(conf.curlScale, targetScale, scaleCfg.smoothing ?? 3.5, dt);
    }

    const timeCfg = layer.parameters?.time;
    if (timeCfg && typeof conf.curlTime === "number") {
      const baseTime = this._baseline.curlTime ?? conf.curlTime ?? 0.6;
      let targetTime = baseTime + drive * (timeCfg.amplitude ?? 0.3);
      conf.curlTime = damp(conf.curlTime, targetTime, timeCfg.smoothing ?? 2.2, dt);
    }
  }

  _applyWaveLayer(layer, derived, conf, dt) {
    if (!conf.waveEnabled) return;
    const drive = this._computeLayerDrive(layer, derived);
    const ampCfg = layer.parameters?.amplitude || {};
    const base = this._baseline.waveAmplitude ?? conf.waveAmplitude ?? 0.35;
    let target = base * (ampCfg.baseBlend ?? 0.75) + drive * (ampCfg.amplitude ?? 1.2);
    if (ampCfg.beatLift) target += derived.beatPulse * ampCfg.beatLift;
    target = clamp(target, 0, ampCfg.max ?? 3.0);
    conf.waveAmplitude = damp(conf.waveAmplitude, target, ampCfg.smoothing ?? 4.4, dt);

    const speedCfg = layer.parameters?.speed;
    if (speedCfg && typeof conf.waveSpeed === "number") {
      const baseSpeed = this._baseline.waveSpeed ?? conf.waveSpeed ?? 1.2;
      let speedTarget = baseSpeed + (drive - 0.5) * (speedCfg.amplitude ?? 0.4);
      if (speedCfg.min !== undefined) speedTarget = Math.max(speedCfg.min, speedTarget);
      if (speedCfg.max !== undefined) speedTarget = Math.min(speedCfg.max, speedTarget);
      conf.waveSpeed = damp(conf.waveSpeed, speedTarget, speedCfg.smoothing ?? 3.2, dt);
    }

    const axisMode = layer.parameters?.axisMode;
    if (axisMode === "flip") {
      conf.waveAxis = derived.swirlSin > 0.33 ? "x" : derived.swirlSin < -0.33 ? "z" : "y";
    }
  }

  _applyMaterialLayer(layer, derived, conf, dt) {
    const drive = this._computeLayerDrive(layer, derived);
    const viscosity = layer.parameters?.viscosity;
    if (viscosity && typeof conf.dynamicViscosity === "number") {
      const baseVisc = this._baseline.dynamicViscosity ?? conf.dynamicViscosity ?? 0.1;
      const amount = viscosity.amount ?? 0.06;
      let target = baseVisc + (drive - 0.5) * amount * (viscosity.invert ? -1 : 1) * this.master.texture;
      if (viscosity.min !== undefined) target = Math.max(viscosity.min, target);
      if (viscosity.max !== undefined) target = Math.min(viscosity.max, target);
      conf.dynamicViscosity = damp(conf.dynamicViscosity, clamp(target, 0.01, 0.8), viscosity.smoothing ?? 1.6, dt);
    }

    const apic = layer.parameters?.apic;
    if (apic && typeof conf.apicBlend === "number") {
      const baseApic = this._baseline.apicBlend ?? conf.apicBlend ?? 0;
      let target = baseApic * (apic.baseBlend ?? 0.8) + drive * (apic.amplitude ?? 0.3) * this.master.texture;
      if (apic.max !== undefined) target = Math.min(apic.max, target);
      conf.apicBlend = clamp(damp(conf.apicBlend, target, apic.smoothing ?? 1.8, dt), 0, 1);
    }

    const noise = layer.parameters?.noise;
    if (noise && typeof conf.noise === "number") {
      const baseNoise = this._baseline.noise ?? conf.noise ?? 1.0;
      let target = baseNoise * (noise.baseBlend ?? 0.9) + drive * (noise.amplitude ?? 0.4) * this.master.texture;
      if (noise.min !== undefined) target = Math.max(noise.min, target);
      if (noise.max !== undefined) target = Math.min(noise.max, target);
      conf.noise = damp(conf.noise, target, noise.smoothing ?? 2.2, dt);
    }
  }

  _applyEnvironmentLayer(layer, derived, _conf, _dt, context) {
    const drive = this._computeLayerDrive(layer, derived);
    const amplitude = (layer.parameters?.amplitude ?? 0.2) * this.master.ambience;
    const swirl = (layer.parameters?.swirl ?? 0.3) * derived.swirlSin * this.master.ambience;
    context.envOffset += (drive - 0.5) * amplitude;
    context.envSwing += swirl;
  }

  _applyBloomLayer(layer, derived, _conf, _dt, context) {
    const drive = this._computeLayerDrive(layer, derived);
    const strengthCfg = layer.parameters?.strength || {};
    const radiusCfg = layer.parameters?.radius;
    const strength = drive * (strengthCfg.amplitude ?? 0.4) * this.master.shimmer + (strengthCfg.baseBlend ?? 0.5) * 0.02;
    const beatLift = strengthCfg.beatLift ? derived.beatPulse * strengthCfg.beatLift * this.master.shimmer : 0;
    context.bloomStrength += strength + beatLift;
    if (radiusCfg) {
      context.bloomRadius += (drive - 0.5) * (radiusCfg.amplitude ?? 0.15) * this.master.shimmer;
    }
  }

  _applyColorLayer(layer, derived, _conf, _dt, context) {
    const drive = this._computeLayerDrive(layer, derived);
    const sat = layer.parameters?.saturation;
    const contrast = layer.parameters?.contrast;
    if (sat) {
      context.colorSaturation += (drive * (sat.amplitude ?? 0.3) + (sat.bias ?? 0)) * this.master.shimmer;
    }
    if (contrast) {
      context.colorContrast += (drive - 0.5) * (contrast.amplitude ?? 0.2) * this.master.shimmer;
    }
  }

  _applyChromaLayer(layer, derived, _conf, _dt, context) {
    const drive = this._computeLayerDrive(layer, derived);
    const amount = layer.parameters?.amount ?? 0.004;
    context.chromaAmount += drive * amount * this.master.shimmer;
  }

  _applyGrainLayer(layer, derived, _conf, _dt, context) {
    const drive = this._computeLayerDrive(layer, derived);
    const amount = layer.parameters?.amount ?? 0.05;
    context.grainAmount += drive * amount * this.master.texture;
  }

  _applyGlobalTexture(derived, conf, dt) {
    if (typeof conf.apicBlend === "number") {
      const baseApic = this._baseline.apicBlend ?? conf.apicBlend ?? 0;
      const target = clamp(baseApic + (derived.energyAvg - 0.4) * 0.18 * this.master.texture, 0, 1);
      conf.apicBlend = damp(conf.apicBlend, target, 1.4, dt);
    }
    if (typeof conf.noise === "number") {
      const baseNoise = this._baseline.noise ?? conf.noise ?? 1.0;
      const target = clamp(baseNoise + (derived.flux - 0.5) * 0.25 * this.master.texture, 0, 2.5);
      conf.noise = damp(conf.noise, target, 2.0, dt);
    }
  }

  _applyEnvironment(context, envBase) {
    if (!envBase) return;
    const offset = clamp(context.envOffset + context.envSwing, -Math.PI * 0.45, Math.PI * 0.45);
    postFxState.set(["camera", "bgRotation"], envBase.bg + offset);
    postFxState.set(["camera", "envRotation"], envBase.env - offset * 0.85);
  }

  _applyPostFx(context) {
    if (!this._fxBaseline) return;
    const base = this._fxBaseline;
    const bloomStrength = clamp(base.bloomStrength + context.bloomStrength, 0, 5);
    const bloomRadius = clamp(base.bloomRadius + context.bloomRadius, 0.2, 3);
    postFxState.set(["bloom", "strength"], bloomStrength);
    postFxState.set(["bloom", "radius"], bloomRadius);

    if (context.colorSaturation !== 0 || context.colorContrast !== 0) {
      const sat = clamp(base.colorSaturation + context.colorSaturation, 0.2, 2.5);
      const contrast = clamp(base.colorContrast + context.colorContrast, 0.4, 1.9);
      postFxState.set(["color", "saturation"], sat);
      postFxState.set(["color", "contrast"], contrast);
    }

    if (context.chromaAmount !== 0) {
      const amount = clamp(base.chromaAmount + context.chromaAmount, 0, 0.02);
      postFxState.set(["chroma", "amount"], amount);
      if (amount > 0) postFxState.set(["chroma", "enabled"], true);
    }

    if (context.grainAmount !== 0) {
      const grain = clamp(base.grainAmount + context.grainAmount, 0, 0.4);
      postFxState.set(["grain", "amount"], grain);
      postFxState.set(["grain", "enabled"], grain > 0.01);
    }
  }

  _updateBaselines(conf) {
    const keys = [
      "jetStrength", "jetRadius", "vortexStrength", "curlStrength", "curlScale", "curlTime",
      "orbitStrength", "orbitRadius", "waveAmplitude", "waveSpeed", "dynamicViscosity", "apicBlend", "noise",
    ];
    const follow = 0.92;
    keys.forEach((key) => {
      const value = conf[key];
      if (typeof value !== "number" || Number.isNaN(value)) return;
      if (!(key in this._baseline)) this._baseline[key] = value;
      else this._baseline[key] = this._baseline[key] * follow + value * (1 - follow);
    });
  }

  _updateFxBaselines() {
    const fx = postFxState?.value;
    if (!fx) return;
    if (!this._fxBaseline) {
      this._fxBaseline = {
        bloomStrength: fx.bloom?.strength ?? 1.2,
        bloomRadius: fx.bloom?.radius ?? 1.0,
        colorSaturation: fx.color?.saturation ?? 1.0,
        colorContrast: fx.color?.contrast ?? 1.0,
        chromaAmount: fx.chroma?.amount ?? 0.0,
        grainAmount: fx.grain?.amount ?? 0.0,
      };
      return;
    }
    const follow = 0.95;
    const update = (key, value) => {
      if (typeof value !== "number" || Number.isNaN(value)) return;
      this._fxBaseline[key] = this._fxBaseline[key] * follow + value * (1 - follow);
    };
    update("bloomStrength", fx.bloom?.strength);
    update("bloomRadius", fx.bloom?.radius);
    update("colorSaturation", fx.color?.saturation);
    update("colorContrast", fx.color?.contrast);
    update("chromaAmount", fx.chroma?.amount);
    update("grainAmount", fx.grain?.amount);
  }

  _emit(reason, payload) {
    const snapshot = this.toJSON();
    this._listeners.forEach((listener) => {
      try {
        listener({ reason, payload, state: snapshot });
      } catch (err) {
        console.warn("SoundReactivitySystem listener error", err);
      }
    });
  }
}

SoundReactivitySystem.prototype._layerHandlers = {
  jet: SoundReactivitySystem.prototype._applyJetLayer,
  orbit: SoundReactivitySystem.prototype._applyOrbitLayer,
  curl: SoundReactivitySystem.prototype._applyCurlLayer,
  wave: SoundReactivitySystem.prototype._applyWaveLayer,
  material: SoundReactivitySystem.prototype._applyMaterialLayer,
  viscosity: SoundReactivitySystem.prototype._applyMaterialLayer,
  environment: SoundReactivitySystem.prototype._applyEnvironmentLayer,
  bloom: SoundReactivitySystem.prototype._applyBloomLayer,
  color: SoundReactivitySystem.prototype._applyColorLayer,
  chroma: SoundReactivitySystem.prototype._applyChromaLayer,
  grain: SoundReactivitySystem.prototype._applyGrainLayer,
};

export { SoundReactivitySystem as AudioRouter };
export default SoundReactivitySystem;
