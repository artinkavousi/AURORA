// AudioRouter: map audio features to simulation and visual configuration with
// layered smoothing, stochastic motion, and preset support.

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

const ROUTE_DEFAULTS = {
  enable: true,
  source: 'level',
  sources: null,
  gain: 1.0,
  curve: 1.0,
  bias: 0.0,
  beatBoost: 0.0,
  floor: 0.0,
  ceiling: 1.0,
  attack: 0.25,
  release: 0.6,
  jitter: 0.0,
  jitterSpeed: 2.6,
  mix: 0.65,
  mode: 'auto',
  applyMaster: true,
};

const cloneRoutes = (routes) => JSON.parse(JSON.stringify(routes));

export class AudioRouter {
  constructor() {
    this.enabled = true;
    this.master = 1.0;
    this.intensity = 1.0;
    this.reactivity = 1.0;
    this.pulseSpread = 0.65;
    this.routes = {};
    this._routeState = {};
    this._lastElapsed = null;
    this._seed = Math.random() * 10;
    this._activePreset = null;

    const baseRoutes = {
      jetStrength: {
        enable: true,
        sources: [
          { id: 'bass', weight: 0.7 },
          { id: 'fluxBass', weight: 0.3, curve: 1.1 },
        ],
        gain: 1.4,
        curve: 1.2,
        bias: 0.45,
        beatBoost: 0.5,
        floor: 0.25,
        ceiling: 3.6,
        attack: 0.2,
        release: 0.6,
        jitter: 0.12,
        jitterSpeed: 2.1,
        mix: 0.7,
      },
      vortexStrength: {
        enable: true,
        sources: [
          { id: 'mid', weight: 0.7 },
          { id: 'fluxMid', weight: 0.3, curve: 1.1 },
        ],
        gain: 1.2,
        curve: 1.1,
        bias: 0.35,
        floor: 0.2,
        ceiling: 3.2,
        attack: 0.28,
        release: 0.7,
        jitter: 0.08,
        mix: 0.68,
      },
      curlStrength: {
        enable: true,
        sources: [
          { id: 'treble', weight: 0.6 },
          { id: 'fluxTreble', weight: 0.4, curve: 1.3 },
        ],
        gain: 1.45,
        curve: 1.25,
        bias: 0.32,
        floor: 0.15,
        ceiling: 3.0,
        attack: 0.18,
        release: 0.55,
        jitter: 0.16,
        jitterSpeed: 3.0,
        mix: 0.82,
      },
      orbitStrength: {
        enable: true,
        sources: [
          { id: 'mid', weight: 0.5 },
          { id: 'level', weight: 0.5 },
        ],
        gain: 0.9,
        curve: 1.0,
        bias: 0.38,
        floor: 0.1,
        ceiling: 2.4,
        attack: 0.3,
        release: 0.8,
        jitter: 0.05,
        mix: 0.62,
      },
      waveAmplitude: {
        enable: true,
        sources: [
          { id: 'beat', mode: 'raw' },
          { id: 'fluxBass', weight: 0.4 },
        ],
        gain: 1.8,
        curve: 1.0,
        bias: 0.4,
        floor: 0.15,
        ceiling: 2.6,
        attack: 0.14,
        release: 0.48,
        jitter: 0.14,
        jitterSpeed: 2.8,
        mix: 0.75,
      },
      apicBlend: {
        enable: true,
        sources: [
          { id: 'level', weight: 0.6 },
          { id: 'beat', weight: 0.4, mode: 'raw' },
        ],
        gain: 0.45,
        curve: 1.4,
        bias: 0.22,
        floor: 0.05,
        ceiling: 0.85,
        attack: 0.32,
        release: 0.78,
        jitter: 0.05,
        mix: 0.6,
      },
      noise: {
        enable: true,
        sources: [
          { id: 'treble', weight: 0.7 },
          { id: 'fluxTreble', weight: 0.3 },
        ],
        gain: 0.52,
        curve: 1.1,
        bias: 0.25,
        floor: 0.05,
        ceiling: 1.4,
        attack: 0.12,
        release: 0.42,
        jitter: 0.22,
        jitterSpeed: 3.4,
        mix: 0.78,
      },
      viscosity: {
        enable: false,
        source: 'level',
        gain: -0.08,
        curve: 1.0,
        bias: 0.1,
        floor: 0.02,
        ceiling: 0.45,
        attack: 0.6,
        release: 0.9,
        mix: 0.4,
      },
      colorSaturation: {
        enable: true,
        sources: [
          { id: 'level', weight: 0.4 },
          { id: 'beat', weight: 0.6, mode: 'raw' },
        ],
        gain: 0.65,
        curve: 1.05,
        bias: 0.55,
        floor: 0.3,
        ceiling: 1.8,
        attack: 0.22,
        release: 0.64,
        jitter: 0.06,
        mix: 0.7,
      },
      envSway: {
        enable: true,
        sources: [
          { id: 'level', weight: 0.5 },
          { id: 'beat', weight: 0.5, mode: 'raw' },
        ],
        gain: 0.08,
        curve: 1.0,
        bias: 0.0,
        floor: -0.18,
        ceiling: 0.18,
        attack: 0.4,
        release: 0.95,
        jitter: 0.05,
        mix: 0.55,
        applyMaster: false,
      },
    };

    this.setRoutes(baseRoutes);
    this.presets = this._buildPresetLibrary(baseRoutes);
    this.applyPreset('Nebula Bloom');
  }

  setMaster(v) { this.master = clamp(v ?? 1.0, 0, 2); }
  setEnabled(v) { this.enabled = !!v; }
  setPulseSpread(v) { this.pulseSpread = clamp(v ?? 0.65, 0.2, 1.5); }
  setIntensity(v) { this.intensity = clamp(v ?? 1.0, 0.2, 2.0); }
  setReactivity(v) { this.reactivity = clamp(v ?? 1.0, 0.5, 2.0); }

  setRoutes(routes) {
    if (!routes) return;
    for (const key of Object.keys(routes)) {
      if (!this.routes[key]) this.routes[key] = { ...ROUTE_DEFAULTS };
      const dest = this.routes[key];
      const src = routes[key];
      if (src.sources && !Array.isArray(src.sources)) src.sources = [src.sources];
      Object.assign(dest, src);
      this._normalizeRoute(dest);
    }
    this._syncStateFromRoutes();
  }

  getRoutes() {
    return JSON.parse(JSON.stringify(this.routes));
  }

  getPresetOptions() {
    return Object.entries(this.presets).map(([value, meta]) => ({
      value,
      text: meta.label ?? value,
    }));
  }

  getPresetMeta(name) {
    const preset = this.presets[name];
    if (!preset) return null;
    return {
      name,
      label: preset.label ?? name,
      description: preset.description ?? '',
      tags: preset.tags ?? [],
    };
  }

  getActivePreset() {
    return this._activePreset;
  }

  applyPreset(name) {
    const preset = this.presets[name];
    if (!preset) return null;
    if (typeof preset.master === 'number') this.setMaster(preset.master);
    if (typeof preset.intensity === 'number') this.setIntensity(preset.intensity);
    if (typeof preset.reactivity === 'number') this.setReactivity(preset.reactivity);
    if (typeof preset.pulseSpread === 'number') this.setPulseSpread(preset.pulseSpread);
    if (preset.routes) this.setRoutes(preset.routes);
    this._activePreset = name;
    return this.getPresetMeta(name);
  }

  randomizePhase(seed = Math.random() * 10) {
    this._seed = seed;
    for (const key of Object.keys(this._routeState)) {
      const state = this._routeState[key];
      if (state) state.phase = Math.random() * Math.PI * 2;
    }
  }

  toJSON() {
    return {
      enabled: this.enabled,
      master: this.master,
      intensity: this.intensity,
      reactivity: this.reactivity,
      pulseSpread: this.pulseSpread,
      routes: this.getRoutes(),
      preset: this._activePreset,
    };
  }

  fromJSON(data) {
    if (!data) return;
    if (typeof data.enabled === 'boolean') this.enabled = data.enabled;
    if (typeof data.master === 'number') this.master = data.master;
    if (typeof data.intensity === 'number') this.intensity = data.intensity;
    if (typeof data.reactivity === 'number') this.reactivity = data.reactivity;
    if (typeof data.pulseSpread === 'number') this.pulseSpread = data.pulseSpread;
    if (data.routes) this.setRoutes(data.routes);
    if (data.preset) this.applyPreset(data.preset);
  }

  // pow curve: >1 emphasizes peaks, <1 flattens
  _shape(x, p) {
    return Math.pow(clamp(x, 0, 1), p * this.reactivity);
  }

  _normalizeRoute(route) {
    for (const prop of Object.keys(ROUTE_DEFAULTS)) {
      if (route[prop] === undefined) route[prop] = ROUTE_DEFAULTS[prop];
    }
    if (route.sources && !Array.isArray(route.sources)) route.sources = [route.sources];
    if (!route.sources || route.sources.length === 0) route.sources = [route.source];
    route.mix = clamp(route.mix ?? ROUTE_DEFAULTS.mix, 0, 1);
    if (typeof route.floor !== 'number') route.floor = ROUTE_DEFAULTS.floor;
    if (typeof route.ceiling !== 'number') route.ceiling = ROUTE_DEFAULTS.ceiling;
    if (route.floor > route.ceiling) {
      const tmp = route.floor;
      route.floor = route.ceiling;
      route.ceiling = tmp;
    }
    route.bias = clamp(route.bias ?? 0, route.floor, route.ceiling);
  }

  _syncStateFromRoutes() {
    for (const key of Object.keys(this.routes)) {
      const route = this.routes[key];
      if (!this._routeState[key]) {
        this._routeState[key] = {
          value: clamp(route.bias ?? 0, route.floor ?? 0, route.ceiling ?? 4),
          phase: Math.random() * Math.PI * 2,
        };
      } else {
        const state = this._routeState[key];
        state.value = clamp(state.value ?? route.bias ?? 0, route.floor ?? 0, route.ceiling ?? 4);
        if (state.phase === undefined) state.phase = Math.random() * Math.PI * 2;
      }
    }
  }

  _computeDt(elapsed) {
    if (typeof elapsed !== 'number') return 0.016;
    if (this._lastElapsed == null) {
      this._lastElapsed = elapsed;
      return 0.016;
    }
    const dt = clamp(elapsed - this._lastElapsed, 0.001, 0.1);
    this._lastElapsed = elapsed;
    return dt;
  }

  _sample(src, features) {
    return clamp(features[src] ?? 0, -1, 1);
  }

  _shapeFeature(src, features, curve, mode = 'auto') {
    if (!src) return 0;
    let value = 0;
    if (mode === 'raw') {
      value = this._sample(src, features);
    } else if (mode === 'pulse') {
      value = this._pulse(features, src);
    } else {
      if (src === 'bass' || src === 'mid' || src === 'treble') value = this._pulse(features, src);
      else if (typeof src === 'string' && src.startsWith('flux')) value = clamp((features[src] ?? 0) * 0.8, 0, 1);
      else if (src === 'beat') value = clamp(features.beat ?? 0, 0, 1);
      else value = this._sample(src, features);
    }
    return this._shape(value, curve ?? 1.0);
  }

  _pulse(f, src) {
    const val = clamp((f[src] ?? 0), 0, 1);
    const t = (x) => Math.tanh(x);
    let onset = 0;
    if (src === 'bass') onset = (f.fluxBass || 0);
    else if (src === 'mid') onset = (f.fluxMid || 0);
    else if (src === 'treble') onset = (f.fluxTreble || 0);
    const onsetN = clamp(0.6 * t((onset || 0) * 0.8), 0, 1);
    return clamp(val * 0.7 + onsetN * 0.3 + (f.beat || 0) * 0.08 * this.pulseSpread, 0, 1);
  }

  _mixSources(route, features) {
    const entries = route.sources && route.sources.length ? route.sources : [route.source];
    if (!entries) return 0;
    let sum = 0;
    let weightTotal = 0;
    for (const entry of entries) {
      if (!entry) continue;
      let src = entry;
      let weight = 1;
      let curve = route.curve ?? 1.0;
      let mode = route.mode ?? 'auto';
      if (typeof entry === 'object') {
        src = entry.id ?? entry.source;
        weight = entry.weight ?? 1;
        if (entry.curve) curve = entry.curve;
        if (entry.mode) mode = entry.mode;
      }
      const shaped = this._shapeFeature(src, features, curve, mode);
      sum += shaped * weight;
      weightTotal += weight;
    }
    return weightTotal > 0 ? sum / weightTotal : 0;
  }

  _smoothRoute(key, target, route, dt) {
    const state = this._routeState[key] || (this._routeState[key] = { value: target, phase: Math.random() * Math.PI * 2 });
    const current = state.value ?? target;
    const rising = target > current;
    const tau = rising ? clamp(route.attack ?? ROUTE_DEFAULTS.attack, 0.01, 2.5) : clamp(route.release ?? ROUTE_DEFAULTS.release, 0.01, 3.0);
    const alpha = 1 - Math.exp(-dt / Math.max(0.001, tau));
    let next = current + (target - current) * alpha;
    if (route.jitter) {
      state.phase = (state.phase ?? Math.random() * Math.PI * 2) + dt * (route.jitterSpeed ?? ROUTE_DEFAULTS.jitterSpeed);
      const jitter = (Math.sin(state.phase + this._seed) * 0.6 + Math.sin(state.phase * 1.7 + this._seed * 0.37) * 0.4) * 0.5;
      next += jitter * route.jitter * 0.12;
    }
    state.value = clamp(next, route.floor ?? 0, route.ceiling ?? 10);
    return state.value;
  }

  _computeRouteValue(key, features, dt, opts = {}) {
    const route = this.routes[key];
    if (!route || !route.enable) return null;
    const mixValue = this._mixSources(route, features);
    const ambient = route.bias ?? 0;
    let dynamic = mixValue * (route.gain ?? 1);
    if (route.beatBoost) dynamic += (features.beat ?? 0) * route.beatBoost * this.pulseSpread;
    let target = ambient + dynamic * (route.mix ?? 1);
    target = clamp(target, route.floor ?? 0, route.ceiling ?? 10);
    const smoothed = this._smoothRoute(key, target, route, dt);
    const applyMaster = opts.applyMaster ?? (route.applyMaster !== false);
    const master = applyMaster ? (this.master * this.intensity) : 1.0;
    const final = ambient + (smoothed - ambient) * master;
    return clamp(final, route.floor ?? 0, route.ceiling ?? 10);
  }

  apply(features = {}, conf, elapsed = 0, envBase) {
    if (!this.enabled) return;
    const f = features || {};
    const dt = this._computeDt(elapsed);

    const jetVal = this._computeRouteValue('jetStrength', f, dt);
    if (jetVal != null && conf.jetEnabled) conf.jetStrength = clamp(jetVal, 0, 4.0);

    const vortexVal = this._computeRouteValue('vortexStrength', f, dt);
    if (vortexVal != null && conf.vortexEnabled) conf.vortexStrength = clamp(vortexVal, 0, 4.0);

    const curlVal = this._computeRouteValue('curlStrength', f, dt);
    if (curlVal != null && conf.curlEnabled) conf.curlStrength = clamp(curlVal, 0, 3.5);

    const orbitVal = this._computeRouteValue('orbitStrength', f, dt);
    if (orbitVal != null && conf.orbitEnabled) conf.orbitStrength = clamp(orbitVal, 0, 3.0);

    const waveVal = this._computeRouteValue('waveAmplitude', f, dt);
    if (waveVal != null && conf.waveEnabled) conf.waveAmplitude = clamp(waveVal, 0, 3.0);

    const noiseVal = this._computeRouteValue('noise', f, dt);
    if (noiseVal != null) conf.noise = clamp(noiseVal, 0, 2.0);

    const apicVal = this._computeRouteValue('apicBlend', f, dt, { applyMaster: false });
    if (apicVal != null) conf.apicBlend = clamp(apicVal, 0.0, 0.9);

    const viscVal = this._computeRouteValue('viscosity', f, dt);
    if (viscVal != null) conf.dynamicViscosity = clamp(viscVal, 0.02, 0.6);

    const envVal = this._computeRouteValue('envSway', f, dt, { applyMaster: false });
    if (envVal != null && envBase) {
      conf.bgRotY = envBase.bg + envVal;
      conf.envRotY = envBase.env - envVal * 0.82;
    }

    const colorVal = this._computeRouteValue('colorSaturation', f, dt);
    if (colorVal != null && conf.colorMode === 'audio') {
      conf.postSaturation = clamp(colorVal, 0.2, 2.2);
    }
  }

  _buildPresetLibrary(baseRoutes) {
    return {
      'Nebula Bloom': {
        label: 'Nebula Bloom',
        description: 'Slow blooming arcs with shimmering highs and gentle sway.',
        tags: ['ambient', 'cinematic'],
        intensity: 1.2,
        reactivity: 1.1,
        pulseSpread: 0.65,
        routes: cloneRoutes(baseRoutes),
      },
      'Voltage Runway': {
        label: 'Voltage Runway',
        description: 'High energy runway pulses with aggressive treble shimmer.',
        tags: ['techno', 'energy'],
        intensity: 1.4,
        reactivity: 1.2,
        pulseSpread: 0.9,
        routes: cloneRoutes({
          jetStrength: { gain: 1.9, mix: 0.88, attack: 0.12, release: 0.45, jitter: 0.2, beatBoost: 0.7, bias: 0.5 },
          vortexStrength: { gain: 1.35, mix: 0.78, attack: 0.18, release: 0.52, jitter: 0.12, bias: 0.4 },
          curlStrength: { gain: 1.8, mix: 0.92, attack: 0.14, release: 0.4, jitter: 0.24, bias: 0.28 },
          orbitStrength: { gain: 1.2, mix: 0.7, attack: 0.22, release: 0.62, jitter: 0.08, bias: 0.42 },
          waveAmplitude: { gain: 2.3, mix: 0.95, attack: 0.1, release: 0.32, jitter: 0.22, bias: 0.35, beatBoost: 0.8 },
          apicBlend: { gain: 0.55, mix: 0.7, bias: 0.25, attack: 0.28, release: 0.6 },
          noise: { gain: 0.7, mix: 0.86, jitter: 0.3, attack: 0.08, release: 0.28 },
          colorSaturation: { gain: 0.85, mix: 0.82, bias: 0.6, attack: 0.16, release: 0.45 },
          envSway: { gain: 0.12, mix: 0.62, attack: 0.32, release: 0.82, jitter: 0.08 },
          viscosity: { enable: false },
        }),
      },
      'Lunar Tidal': {
        label: 'Lunar Tidal',
        description: 'Wide, breathing swells and tidal orbit motion.',
        tags: ['downtempo', 'organic'],
        intensity: 0.95,
        reactivity: 0.9,
        pulseSpread: 0.55,
        routes: cloneRoutes({
          jetStrength: { gain: 1.0, mix: 0.52, attack: 0.35, release: 1.1, jitter: 0.06, bias: 0.5 },
          vortexStrength: { gain: 0.95, mix: 0.55, attack: 0.45, release: 1.2, jitter: 0.05, bias: 0.38 },
          curlStrength: { gain: 1.1, mix: 0.58, attack: 0.4, release: 1.0, jitter: 0.1 },
          orbitStrength: { gain: 0.85, mix: 0.6, attack: 0.48, release: 1.3, jitter: 0.04 },
          waveAmplitude: { gain: 1.5, mix: 0.58, attack: 0.28, release: 0.9, jitter: 0.08, bias: 0.42 },
          apicBlend: { gain: 0.38, mix: 0.5, bias: 0.26, attack: 0.5, release: 1.4 },
          noise: { gain: 0.35, mix: 0.45, attack: 0.3, release: 0.75, jitter: 0.12 },
          colorSaturation: { gain: 0.55, mix: 0.55, attack: 0.34, release: 1.0 },
          envSway: { gain: 0.06, mix: 0.5, attack: 0.62, release: 1.4, jitter: 0.06 },
          viscosity: { enable: true, gain: -0.12, mix: 0.45, bias: 0.12, attack: 0.5, release: 1.3 },
        }),
      },
      'Particle Ballet': {
        label: 'Particle Ballet',
        description: 'Playful treble-forward choreography with glittered curls.',
        tags: ['house', 'sparkle'],
        intensity: 1.1,
        reactivity: 1.25,
        pulseSpread: 0.72,
        routes: cloneRoutes({
          jetStrength: { gain: 1.25, mix: 0.62, attack: 0.18, release: 0.58, jitter: 0.18, bias: 0.38 },
          vortexStrength: { gain: 1.05, mix: 0.64, attack: 0.2, release: 0.68, jitter: 0.1 },
          curlStrength: { gain: 1.6, mix: 0.88, attack: 0.16, release: 0.44, jitter: 0.28 },
          orbitStrength: { gain: 0.95, mix: 0.62, attack: 0.24, release: 0.72, jitter: 0.1 },
          waveAmplitude: { gain: 2.0, mix: 0.82, attack: 0.12, release: 0.38, jitter: 0.18 },
          apicBlend: { gain: 0.48, mix: 0.66, attack: 0.24, release: 0.66, bias: 0.24 },
          noise: { gain: 0.78, mix: 0.88, attack: 0.1, release: 0.32, jitter: 0.36 },
          colorSaturation: { gain: 0.75, mix: 0.74, attack: 0.18, release: 0.5, jitter: 0.1 },
          envSway: { gain: 0.09, mix: 0.58, attack: 0.28, release: 0.82, jitter: 0.09 },
          viscosity: { enable: false },
        }),
      },
    };
  }
}

export default AudioRouter;
