// AudioRouter: orchestrates layered sound-reactive choreography across motion, visuals, and post FX

import { postFxState } from "../postfx/state.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const TWO_PI = Math.PI * 2;

const clone = (obj) => JSON.parse(JSON.stringify(obj));

const deepMerge = (target, source) => {
  if (!source || typeof source !== 'object') return target;
  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = Array.isArray(value) ? [] : {};
      }
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  });
  return target;
};

export class AudioRouter {
  constructor() {
    this.enabled = true;
    this.master = 1.0;
    this.intensity = 1.0;
    this.reactivity = 1.0;
    this.scene = 'Neon Pulse';

    this._liftAvg = 0.0;
    this._hushAvg = 1.0;
    this._tempoPhase = 0.0;
    this._confBase = null;
    this._fxBase = null;

    this.sceneLibrary = this._createSceneLibrary();
    this.routes = this._createEmptyRoutes();
    this.setScene(this.scene);
  }

  _createEmptyRoutes() {
    return {
      motion: { enabled: true, entries: {} },
      visual: { enabled: true, entries: {} },
      atmos: { enabled: true, entries: {} },
    };
  }

  _createSceneLibrary() {
    return {
      'Neon Pulse': {
        macros: { master: 1.0, intensity: 1.15, reactivity: 1.1 },
        motion: {
          enabled: true,
          entries: {
            jetStrength: { enable: true, source: 'groove', curve: 1.2, add: 1.3, beatBoost: 0.45, smooth: 0.72, min: 0.0, max: 3.8 },
            vortexStrength: { enable: true, source: 'sway', curve: 1.05, add: 1.1, smooth: 0.74, min: 0.0, max: 3.4 },
            curlStrength: { enable: true, source: 'shimmer', curve: 1.2, add: 0.95, smooth: 0.72, min: 0.0, max: 3.0 },
            orbitStrength: { enable: true, source: 'tempoLfo', curve: 1.1, add: 0.85, smooth: 0.78, min: 0.0, max: 3.0 },
            waveAmplitude: { enable: true, source: 'punch', curve: 1.0, add: 1.0, smooth: 0.7, min: 0.2, max: 2.3 },
            apicBlend: { enable: true, source: 'lift', curve: 1.3, add: 0.22, smooth: 0.8, min: 0.0, max: 0.6 },
            viscosity: { enable: true, source: 'hush', curve: 1.05, add: -0.08, smooth: 0.82, min: 0.05, max: 0.35, scaleMaster: false },
          },
        },
        visual: {
          enabled: true,
          entries: {
            surfaceNoise: { enable: true, source: 'shimmer', curve: 1.0, add: 0.28, smooth: 0.8, min: 0.2, max: 1.4 },
            colorSaturation: { enable: true, source: 'groove', curve: 1.1, add: 0.35, smooth: 0.65, min: 0.75, max: 1.45, mode: 'symmetric', base: 1.0 },
            colorLift: { enable: true, source: 'lift', curve: 1.0, add: 0.12, smooth: 0.72, min: -0.18, max: 0.18, mode: 'symmetric', base: 0.0 },
            grain: { enable: false, source: 'shimmer', curve: 1.2, add: 0.05, smooth: 0.7, min: 0.0, max: 0.12 },
          },
        },
        atmos: {
          enabled: true,
          entries: {
            envSway: { enable: true, source: 'sway', curve: 1.0, add: 0.12, smooth: 0.82, mode: 'symmetric', beatBoost: 0.035 },
            bloom: { enable: true, source: 'groove', curve: 1.2, add: 0.45, smooth: 0.78, minStrength: 0.8, maxStrength: 1.65, thresholdAdd: -0.00025, thresholdMin: 0.00018, thresholdMax: 0.0009 },
            focus: { enable: true, source: 'lift', curve: 1.0, add: 0.18, smooth: 0.8, mode: 'symmetric', min: 0.6, max: 1.1 },
            chroma: { enable: false, source: 'shimmer', curve: 1.2, add: 0.0015, smooth: 0.75, min: 0.0, max: 0.003 },
          },
        },
      },
      'Velvet Swirl': {
        macros: { master: 0.95, intensity: 1.0, reactivity: 0.95 },
        motion: {
          enabled: true,
          entries: {
            jetStrength: { enable: true, source: 'lift', curve: 1.05, add: 0.9, beatBoost: 0.28, smooth: 0.78, min: 0.0, max: 3.2 },
            vortexStrength: { enable: true, source: 'sway', curve: 1.0, add: 1.2, smooth: 0.8, min: 0.0, max: 3.6 },
            curlStrength: { enable: true, source: 'groove', curve: 1.0, add: 0.7, smooth: 0.82, min: 0.0, max: 2.6 },
            orbitStrength: { enable: true, source: 'tempoLfo', curve: 1.0, add: 0.9, smooth: 0.82, min: 0.0, max: 3.0 },
            waveAmplitude: { enable: true, source: 'tempoLfo', curve: 1.0, add: 0.6, smooth: 0.8, min: 0.15, max: 1.8 },
            apicBlend: { enable: true, source: 'groove', curve: 1.1, add: 0.18, smooth: 0.85, min: 0.0, max: 0.5 },
            viscosity: { enable: true, source: 'hush', curve: 1.3, add: -0.05, smooth: 0.85, min: 0.08, max: 0.4, scaleMaster: false },
          },
        },
        visual: {
          enabled: true,
          entries: {
            surfaceNoise: { enable: true, source: 'shimmer', curve: 1.3, add: 0.18, smooth: 0.84, min: 0.15, max: 1.1 },
            colorSaturation: { enable: true, source: 'lift', curve: 1.0, add: 0.22, smooth: 0.7, min: 0.85, max: 1.35, mode: 'symmetric', base: 1.05 },
            colorLift: { enable: true, source: 'hush', curve: 1.0, add: 0.1, smooth: 0.78, min: -0.1, max: 0.2, mode: 'symmetric', base: 0.03 },
            grain: { enable: true, source: 'shimmer', curve: 1.0, add: 0.04, smooth: 0.7, min: 0.0, max: 0.1 },
          },
        },
        atmos: {
          enabled: true,
          entries: {
            envSway: { enable: true, source: 'tempoLfo', curve: 1.0, add: 0.08, smooth: 0.85, mode: 'symmetric', beatBoost: 0.025 },
            bloom: { enable: true, source: 'lift', curve: 1.0, add: 0.3, smooth: 0.8, minStrength: 0.75, maxStrength: 1.45, thresholdAdd: -0.00018, thresholdMin: 0.0002, thresholdMax: 0.0011 },
            focus: { enable: true, source: 'lift', curve: 1.05, add: 0.12, smooth: 0.82, mode: 'symmetric', min: 0.65, max: 1.05 },
            chroma: { enable: true, source: 'shimmer', curve: 1.2, add: 0.001, smooth: 0.78, min: 0.0, max: 0.0025 },
          },
        },
      },
      'Cascade Bloom': {
        macros: { master: 1.05, intensity: 1.22, reactivity: 1.2 },
        motion: {
          enabled: true,
          entries: {
            jetStrength: { enable: true, source: 'punch', curve: 1.25, add: 1.6, beatBoost: 0.6, smooth: 0.68, min: 0.0, max: 4.0 },
            vortexStrength: { enable: true, source: 'groove', curve: 1.1, add: 1.0, smooth: 0.72, min: 0.0, max: 3.5 },
            curlStrength: { enable: true, source: 'shimmer', curve: 1.2, add: 1.1, smooth: 0.7, min: 0.0, max: 3.2 },
            orbitStrength: { enable: true, source: 'tempoLfo', curve: 1.05, add: 0.95, smooth: 0.74, min: 0.0, max: 3.2 },
            waveAmplitude: { enable: true, source: 'punch', curve: 1.0, add: 1.4, smooth: 0.68, min: 0.2, max: 2.5 },
            apicBlend: { enable: true, source: 'groove', curve: 1.3, add: 0.28, smooth: 0.76, min: 0.0, max: 0.65 },
            viscosity: { enable: true, source: 'hush', curve: 1.2, add: -0.1, smooth: 0.8, min: 0.05, max: 0.32, scaleMaster: false },
          },
        },
        visual: {
          enabled: true,
          entries: {
            surfaceNoise: { enable: true, source: 'shimmer', curve: 1.1, add: 0.3, smooth: 0.78, min: 0.2, max: 1.6 },
            colorSaturation: { enable: true, source: 'shimmer', curve: 1.25, add: 0.4, smooth: 0.65, min: 0.85, max: 1.55, mode: 'symmetric', base: 1.1 },
            colorLift: { enable: true, source: 'lift', curve: 1.05, add: 0.14, smooth: 0.7, min: -0.05, max: 0.25, mode: 'symmetric', base: 0.05 },
            grain: { enable: false, source: 'shimmer', curve: 1.3, add: 0.05, smooth: 0.7, min: 0.0, max: 0.12 },
          },
        },
        atmos: {
          enabled: true,
          entries: {
            envSway: { enable: true, source: 'sway', curve: 1.0, add: 0.14, smooth: 0.78, mode: 'symmetric', beatBoost: 0.04 },
            bloom: { enable: true, source: 'punch', curve: 1.25, add: 0.55, smooth: 0.72, minStrength: 0.9, maxStrength: 1.75, thresholdAdd: -0.0003, thresholdMin: 0.00015, thresholdMax: 0.0009 },
            focus: { enable: true, source: 'lift', curve: 1.0, add: 0.2, smooth: 0.75, mode: 'symmetric', min: 0.58, max: 1.08 },
            chroma: { enable: true, source: 'shimmer', curve: 1.3, add: 0.0018, smooth: 0.7, min: 0.0, max: 0.0035 },
          },
        },
      },
    };
  }

  getScenes() {
    return Object.keys(this.sceneLibrary);
  }

  getScene() {
    return this.scene;
  }

  setScene(name, conf) {
    const scene = this.sceneLibrary[name];
    if (!scene) return;
    this.scene = name;
    if (!this.routes) this.routes = this._createEmptyRoutes();
    if (scene.macros) {
      if (typeof scene.macros.master === 'number') this.master = scene.macros.master;
      if (typeof scene.macros.intensity === 'number') this.intensity = scene.macros.intensity;
      if (typeof scene.macros.reactivity === 'number') this.reactivity = scene.macros.reactivity;
    }
    this.routes.motion = clone(scene.motion ?? { enabled: true, entries: {} });
    this.routes.visual = clone(scene.visual ?? { enabled: true, entries: {} });
    this.routes.atmos = clone(scene.atmos ?? { enabled: true, entries: {} });
    if (conf) this._snapshotConfBase(conf, true);
    this._snapshotFxBase(true);
  }

  captureBaselines(conf) {
    if (conf) this._snapshotConfBase(conf, true);
    this._snapshotFxBase(true);
  }

  setMaster(v) {
    this.master = clamp(v ?? 1.0, 0.0, 2.5);
  }

  setEnabled(v) {
    this.enabled = !!v;
  }

  setIntensity(v) {
    this.intensity = clamp(v ?? 1.0, 0.2, 2.5);
  }

  setReactivity(v) {
    this.reactivity = clamp(v ?? 1.0, 0.4, 2.5);
  }

  setRoutes(routes) {
    if (!routes) return;
    if (!this.routes) this.routes = this._createEmptyRoutes();
    const ensureGroup = (group) => {
      if (!this.routes[group]) this.routes[group] = { enabled: true, entries: {} };
      if (!this.routes[group].entries) this.routes[group].entries = {};
    };
    ensureGroup('motion');
    ensureGroup('visual');
    ensureGroup('atmos');

    const mergeGroup = (target, source) => {
      if (!source) return;
      if (typeof source.enabled === 'boolean') target.enabled = source.enabled;
      const entries = source.entries || {};
      Object.entries(entries).forEach(([key, value]) => {
        if (!target.entries[key]) target.entries[key] = {};
        deepMerge(target.entries[key], value);
      });
      Object.entries(source).forEach(([key, value]) => {
        if (key === 'enabled' || key === 'entries') return;
        if (!target.entries[key]) target.entries[key] = {};
        deepMerge(target.entries[key], value);
      });
    };

    if (routes.motion || routes.visual || routes.atmos) {
      mergeGroup(this.routes.motion, routes.motion || {});
      mergeGroup(this.routes.visual, routes.visual || {});
      mergeGroup(this.routes.atmos, routes.atmos || {});
    } else {
      mergeGroup(this.routes.motion, { entries: routes });
    }
  }

  getRoutes() {
    return clone(this.routes);
  }

  toJSON() {
    return {
      enabled: this.enabled,
      master: this.master,
      intensity: this.intensity,
      reactivity: this.reactivity,
      scene: this.scene,
      routes: this.getRoutes(),
    };
  }

  fromJSON(data) {
    if (!data) return;
    if (typeof data.enabled === 'boolean') this.enabled = data.enabled;
    if (typeof data.master === 'number') this.master = data.master;
    if (typeof data.intensity === 'number') this.intensity = data.intensity;
    if (typeof data.reactivity === 'number') this.reactivity = data.reactivity;
    if (data.scene) this.setScene(data.scene);
    if (data.routes) this.setRoutes(data.routes);
  }

  _snapshotConfBase(conf, force = false) {
    if (!conf) return;
    if (this._confBase && !force) return;
    this._confBase = {
      jetStrength: conf.jetStrength ?? 0.6,
      vortexStrength: conf.vortexStrength ?? 0.4,
      curlStrength: conf.curlStrength ?? 0.6,
      orbitStrength: conf.orbitStrength ?? 0.5,
      waveAmplitude: conf.waveAmplitude ?? 0.35,
      apicBlend: conf.apicBlend ?? 0.0,
      dynamicViscosity: conf.dynamicViscosity ?? 0.1,
      noise: conf.noise ?? 1.0,
    };
  }

  _snapshotFxBase(force = false) {
    const fx = postFxState.value;
    if (!fx) return;
    if (this._fxBase && !force) return;
    this._fxBase = {
      bloomStrength: fx.bloom?.strength ?? 1.2,
      bloomThreshold: fx.bloom?.threshold ?? 0.0005,
      focus: fx.dof?.focus ?? 0.8,
      chroma: fx.chroma?.amount ?? 0.0,
      colorSaturation: fx.color?.saturation ?? 1.0,
      colorLift: fx.color?.lift ?? 0.0,
      grainAmount: fx.grain?.amount ?? 0.0,
      grainEnabled: fx.grain?.enabled ?? false,
    };
  }

  _composePrimitives(features, elapsed = 0) {
    const level = clamp(features.level ?? 0, 0, 1);
    const bass = clamp(features.bass ?? 0, 0, 1);
    const mid = clamp(features.mid ?? 0, 0, 1);
    const treble = clamp(features.treble ?? 0, 0, 1);
    const beat = clamp(features.beat ?? 0, 0, 1);
    const flux = clamp(features.flux ?? 0, 0, 1);

    const groove = clamp(0.6 * level + 0.3 * bass + 0.1 * mid, 0, 1);
    const punch = clamp(0.65 * beat + 0.35 * flux, 0, 1);
    const shimmer = clamp(0.55 * treble + 0.25 * clamp(features.fluxTreble ?? 0, 0, 1) + 0.2 * clamp(features.centroid ?? 0, 0, 1), 0, 1);
    this._liftAvg = this._liftAvg * 0.985 + level * 0.015;
    const lift = clamp(this._liftAvg * 1.1, 0, 1);

    const hushRaw = clamp(1 - groove * 1.05, 0, 1);
    this._hushAvg = this._hushAvg * 0.96 + hushRaw * 0.04;
    const hush = clamp(this._hushAvg, 0, 1);

    const tempoPhase = clamp(features.tempoPhase01 ?? this._tempoPhase ?? 0, 0, 1);
    this._tempoPhase = tempoPhase;
    const tempoStrength = clamp(features.tempoConf ?? 0, 0, 1);
    const tempoLfo = 0.5 + 0.5 * Math.sin((tempoPhase * TWO_PI) + (tempoStrength < 0.15 ? elapsed * 0.6 : 0));
    const sway = clamp(0.5 + 0.5 * Math.sin(tempoPhase * TWO_PI + tempoStrength * 0.65), 0, 1);

    return {
      groove,
      punch,
      shimmer,
      lift,
      hush,
      sway,
      tempoPhase,
      tempoStrength,
      tempoLfo,
      level,
      beat,
      bass,
      mid,
      treble,
    };
  }

  _sampleSource(src, primitives, features) {
    switch (src) {
      case 'groove': return primitives.groove;
      case 'punch': return primitives.punch;
      case 'shimmer': return primitives.shimmer;
      case 'lift': return primitives.lift;
      case 'hush': return primitives.hush;
      case 'sway': return primitives.sway;
      case 'tempoLfo': return primitives.tempoLfo ?? 0.5;
      case 'tempoStrength': return primitives.tempoStrength ?? 0.0;
      case 'beat': return primitives.beat ?? clamp(features.beat ?? 0, 0, 1);
      case 'level': return primitives.level ?? clamp(features.level ?? 0, 0, 1);
      case 'bass': return primitives.bass ?? clamp(features.bass ?? 0, 0, 1);
      case 'mid': return primitives.mid ?? clamp(features.mid ?? 0, 0, 1);
      case 'treble': return primitives.treble ?? clamp(features.treble ?? 0, 0, 1);
      default:
        return clamp(features[src] ?? primitives[src] ?? 0, 0, 1);
    }
  }

  _shape(value, curve) {
    const exponent = clamp(curve ?? 1.0, 0.2, 3.0) * clamp(this.reactivity, 0.25, 2.5);
    return Math.pow(clamp(value ?? 0, 0, 1), exponent);
  }

  _routeSignal(route, primitives, features) {
    if (!route) return 0;
    return this._shape(this._sampleSource(route.source, primitives, features), route.curve);
  }

  _smooth(value, prev, smooth = 0.7) {
    const s = clamp(smooth ?? 0.7, 0.0, 0.995);
    return prev * s + value * (1 - s);
  }

  _mixHush(value, rest, hush, mix = 0.4) {
    if (!hush) return value;
    const m = clamp(mix ?? 0.4, 0.0, 1.0);
    return value * (1 - hush * m) + rest * hush * m;
  }

  _computeTarget(restValue, prevValue, signal, route, masterGain, hush, extra = 0) {
    const scale = route?.scaleMaster === false ? 1 : masterGain;
    const amplitude = (route?.add ?? 0) * scale;
    let delta = 0;
    const mode = route?.mode || 'add';
    if (mode === 'symmetric') {
      delta = (signal - 0.5) * 2 * amplitude;
    } else if (mode === 'inverted') {
      delta = (1 - signal) * amplitude;
    } else {
      delta = signal * amplitude;
    }
    let target = restValue + delta + extra;
    target = this._smooth(target, prevValue, route?.smooth);
    target = this._mixHush(target, restValue, hush, route?.hushMix);
    return target;
  }

  apply(features, conf, elapsed, envBase) {
    if (!this.enabled) return;
    if (!this.routes) this.routes = this._createEmptyRoutes();
    if (!this._confBase) this._snapshotConfBase(conf);
    if (!this._fxBase) this._snapshotFxBase();

    const primitives = this._composePrimitives(features, elapsed);
    postFxState.set(['audio', 'primitives'], {
      groove: primitives.groove,
      punch: primitives.punch,
      shimmer: primitives.shimmer,
      lift: primitives.lift,
      sway: primitives.sway,
      hush: primitives.hush,
      tempoPhase: primitives.tempoPhase,
      tempoStrength: primitives.tempoStrength,
    }, { notify: false });

    const masterGain = clamp(this.master * this.intensity, 0, 3.0);
    const fxQueue = [];

    this._applyMotion(primitives, features, conf, masterGain);
    this._applyVisual(primitives, features, conf, masterGain, fxQueue);
    this._applyAtmos(primitives, features, conf, elapsed, envBase, masterGain, fxQueue);

    if (fxQueue.length) {
      fxQueue.forEach((item, idx) => {
        postFxState.set(item.path, item.value, { notify: idx === fxQueue.length - 1 });
      });
    }
  }

  _applyMotion(primitives, features, conf, masterGain) {
    const group = this.routes.motion;
    if (!group || group.enabled === false) return;
    const entries = group.entries || {};
    const hush = primitives.hush ?? 0;
    const rest = this._confBase || {};

    const prev = {
      jetStrength: conf.jetStrength ?? rest.jetStrength ?? 0.6,
      vortexStrength: conf.vortexStrength ?? rest.vortexStrength ?? 0.4,
      curlStrength: conf.curlStrength ?? rest.curlStrength ?? 0.6,
      orbitStrength: conf.orbitStrength ?? rest.orbitStrength ?? 0.5,
      waveAmplitude: conf.waveAmplitude ?? rest.waveAmplitude ?? 0.35,
      apicBlend: conf.apicBlend ?? rest.apicBlend ?? 0.0,
      dynamicViscosity: conf.dynamicViscosity ?? rest.dynamicViscosity ?? 0.1,
    };

    const apply = (key, fn) => {
      const route = entries[key];
      if (!route || route.enable === false) return;
      fn(route);
    };

    apply('jetStrength', (route) => {
      if (!conf.jetEnabled) return;
      const restValue = route.base ?? rest.jetStrength ?? prev.jetStrength;
      const signal = this._routeSignal(route, primitives, features);
      const extra = route.beatBoost ? primitives.punch * route.beatBoost : 0;
      let target = this._computeTarget(restValue, prev.jetStrength, signal, route, masterGain, hush, extra);
      conf.jetStrength = clamp(target, route.min ?? 0.0, route.max ?? 4.0);
    });

    apply('vortexStrength', (route) => {
      if (!conf.vortexEnabled) return;
      const restValue = route.base ?? rest.vortexStrength ?? prev.vortexStrength;
      const signal = this._routeSignal(route, primitives, features);
      let target = this._computeTarget(restValue, prev.vortexStrength, signal, route, masterGain, hush);
      conf.vortexStrength = clamp(target, route.min ?? 0.0, route.max ?? 4.0);
    });

    apply('curlStrength', (route) => {
      if (!conf.curlEnabled) return;
      const restValue = route.base ?? rest.curlStrength ?? prev.curlStrength;
      const signal = this._routeSignal(route, primitives, features);
      let target = this._computeTarget(restValue, prev.curlStrength, signal, route, masterGain, hush);
      conf.curlStrength = clamp(target, route.min ?? 0.0, route.max ?? 3.0);
    });

    apply('orbitStrength', (route) => {
      if (!conf.orbitEnabled) return;
      const restValue = route.base ?? rest.orbitStrength ?? prev.orbitStrength;
      const signal = this._routeSignal(route, primitives, features);
      let target = this._computeTarget(restValue, prev.orbitStrength, signal, route, masterGain, hush);
      conf.orbitStrength = clamp(target, route.min ?? 0.0, route.max ?? 3.0);
    });

    apply('waveAmplitude', (route) => {
      if (!conf.waveEnabled) return;
      const restValue = route.base ?? rest.waveAmplitude ?? prev.waveAmplitude;
      const signal = this._routeSignal(route, primitives, features);
      let target = this._computeTarget(restValue, prev.waveAmplitude, signal, route, masterGain, hush);
      conf.waveAmplitude = clamp(target, route.min ?? 0.2, route.max ?? 2.5);
    });

    apply('apicBlend', (route) => {
      const restValue = route.base ?? rest.apicBlend ?? prev.apicBlend;
      const signal = this._routeSignal(route, primitives, features);
      let target = this._computeTarget(restValue, prev.apicBlend, signal, route, masterGain, hush);
      conf.apicBlend = clamp(target, route.min ?? 0.0, route.max ?? 0.7);
    });

    apply('viscosity', (route) => {
      const restValue = route.base ?? rest.dynamicViscosity ?? prev.dynamicViscosity;
      const signal = this._routeSignal(route, primitives, features);
      let target = this._computeTarget(restValue, prev.dynamicViscosity, signal, route, masterGain, hush);
      conf.dynamicViscosity = clamp(target, route.min ?? 0.05, route.max ?? 0.45);
    });
  }

  _applyVisual(primitives, features, conf, masterGain, fxQueue) {
    const group = this.routes.visual;
    if (!group || group.enabled === false) return;
    const entries = group.entries || {};
    const hush = primitives.hush ?? 0;
    const rest = this._confBase || {};
    const fx = postFxState.value;
    const fxBase = this._fxBase || {};

    const apply = (key, fn) => {
      const route = entries[key];
      if (!route || route.enable === false) return;
      fn(route);
    };

    apply('surfaceNoise', (route) => {
      const restValue = route.base ?? rest.noise ?? conf.noise ?? 1.0;
      const prevValue = conf.noise ?? restValue;
      const signal = this._routeSignal(route, primitives, features);
      let target = this._computeTarget(restValue, prevValue, signal, route, masterGain, hush);
      conf.noise = clamp(target, route.min ?? 0.1, route.max ?? 2.0);
    });

    apply('colorSaturation', (route) => {
      const restValue = route.base ?? fxBase.colorSaturation ?? fx.color?.saturation ?? 1.0;
      const prevValue = fx.color?.saturation ?? restValue;
      const signal = this._routeSignal(route, primitives, features);
      let target = this._computeTarget(restValue, prevValue, signal, route, masterGain, hush);
      target = clamp(target, route.min ?? 0.6, route.max ?? 1.6);
      fxQueue.push({ path: ['color', 'saturation'], value: target });
    });

    apply('colorLift', (route) => {
      const restValue = route.base ?? fxBase.colorLift ?? fx.color?.lift ?? 0.0;
      const prevValue = fx.color?.lift ?? restValue;
      const signal = this._routeSignal(route, primitives, features);
      let target = this._computeTarget(restValue, prevValue, signal, route, masterGain, hush);
      target = clamp(target, route.min ?? -0.25, route.max ?? 0.25);
      fxQueue.push({ path: ['color', 'lift'], value: target });
    });

    apply('grain', (route) => {
      const restValue = route.base ?? fxBase.grainAmount ?? fx.grain?.amount ?? 0.0;
      const prevValue = fx.grain?.amount ?? restValue;
      const signal = this._routeSignal(route, primitives, features);
      let target = this._computeTarget(restValue, prevValue, signal, route, masterGain, hush);
      target = clamp(target, route.min ?? 0.0, route.max ?? 0.2);
      const enabled = route.enable && target > 0.0001;
      fxQueue.push({ path: ['grain', 'enabled'], value: enabled });
      fxQueue.push({ path: ['grain', 'amount'], value: enabled ? target : 0.0 });
    });
  }

  _applyAtmos(primitives, features, conf, elapsed, envBase, masterGain, fxQueue) {
    const group = this.routes.atmos;
    if (!group || group.enabled === false) return;
    const entries = group.entries || {};
    const hush = primitives.hush ?? 0;
    const fx = postFxState.value;
    const fxBase = this._fxBase || {};

    const apply = (key, fn) => {
      const route = entries[key];
      if (!route || route.enable === false) return;
      fn(route);
    };

    apply('envSway', (route) => {
      if (!envBase) return;
      const signal = this._routeSignal(route, primitives, features);
      const scale = route.scaleMaster === false ? 1 : masterGain;
      let delta = (route.mode === 'symmetric' ? (signal - 0.5) * 2 : signal) * (route.add ?? 0) * scale;
      delta *= 1 - hush * (route.hushMix ?? 0.35);
      if (route.beatBoost) delta += primitives.punch * route.beatBoost;
      const smooth = clamp(route.smooth ?? 0.82, 0, 0.98);
      const prevEnv = fx.camera?.envRotation ?? envBase.env;
      const prevBg = fx.camera?.bgRotation ?? envBase.bg;
      const targetEnv = prevEnv * smooth + (envBase.env + delta) * (1 - smooth);
      const targetBg = prevBg * smooth + (envBase.bg - delta * 0.85) * (1 - smooth);
      fxQueue.push({ path: ['camera', 'envRotation'], value: targetEnv });
      fxQueue.push({ path: ['camera', 'bgRotation'], value: targetBg });
    });

    apply('bloom', (route) => {
      if (!fx.bloom?.enabled) return;
      const restStrength = route.base ?? fxBase.bloomStrength ?? fx.bloom.strength ?? 1.2;
      const prevStrength = fx.bloom.strength ?? restStrength;
      const signal = this._routeSignal(route, primitives, features);
      let strength = this._computeTarget(restStrength, prevStrength, signal, route, masterGain, hush);
      strength = clamp(strength, route.minStrength ?? 0.6, route.maxStrength ?? 1.8);
      fxQueue.push({ path: ['bloom', 'strength'], value: strength });

      const thresholdBase = route.thresholdBase ?? fxBase.bloomThreshold ?? fx.bloom.threshold ?? 0.0005;
      const prevThreshold = fx.bloom.threshold ?? thresholdBase;
      let threshold = thresholdBase + signal * (route.thresholdAdd ?? 0);
      threshold = this._smooth(threshold, prevThreshold, route.smooth ?? 0.78);
      threshold = this._mixHush(threshold, thresholdBase, hush, route.hushMix ?? 0.35);
      threshold = clamp(threshold, route.thresholdMin ?? 0.0002, route.thresholdMax ?? 0.0012);
      fxQueue.push({ path: ['bloom', 'threshold'], value: threshold });
    });

    apply('focus', (route) => {
      if (!fx.dof?.enabled) return;
      const restValue = route.base ?? fxBase.focus ?? fx.dof.focus ?? 0.8;
      const prevValue = fx.dof.focus ?? restValue;
      const signal = this._routeSignal(route, primitives, features);
      let target = this._computeTarget(restValue, prevValue, signal, { ...route, mode: route.mode || 'symmetric' }, masterGain, hush);
      target = clamp(target, route.min ?? 0.5, route.max ?? 1.2);
      fxQueue.push({ path: ['dof', 'focus'], value: target });
    });

    apply('chroma', (route) => {
      const restValue = route.base ?? fxBase.chroma ?? fx.chroma?.amount ?? 0.0;
      const prevValue = fx.chroma?.amount ?? restValue;
      const signal = this._routeSignal(route, primitives, features);
      let target = this._computeTarget(restValue, prevValue, signal, route, masterGain, hush);
      target = clamp(target, route.min ?? 0.0, route.max ?? 0.004);
      const enabled = route.enable && target > 0.00005;
      fxQueue.push({ path: ['chroma', 'enabled'], value: enabled });
      fxQueue.push({ path: ['chroma', 'amount'], value: enabled ? target : 0.0 });
    });
  }
}

export default AudioRouter;
