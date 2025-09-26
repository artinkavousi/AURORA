// AudioRouter: map audio features to simulation and visual configuration safely

import { postFxState } from "../postfx/state.js";

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

export class AudioRouter {
  constructor() {
    // Master enables and gains per route
    this.enabled = true;
    this.master = 1.0;
    this.intensity = 1.0;
    this.reactivity = 1.0;
    this.routes = {
      jetStrength: { enable: true, source: 'bass', gain: 1.2, curve: 1.2, beatBoost: 0.5 },
      vortexStrength: { enable: true, source: 'mid', gain: 1.0, curve: 1.0 },
      noise: { enable: true, source: 'treble', gain: 0.3, curve: 1.0 },
      apicBlend: { enable: true, source: 'level', gain: 0.3, curve: 1.5 },
      viscosity: { enable: false, source: 'level', gain: -0.1, curve: 1.0 },
      colorSaturation: { enable: true, source: 'level', gain: 0.5, curve: 1.0 },
      envSway: { enable: true, source: 'level', gain: 0.06, curve: 1.0 },
      curlStrength: { enable: true, source: 'treble', gain: 1.2, curve: 1.2 },
      orbitStrength: { enable: true, source: 'mid', gain: 1.0, curve: 1.0 },
      waveAmplitude: { enable: true, source: 'beat', gain: 1.2, curve: 1.0 },
    };
  }

  setMaster(v) { this.master = clamp(v ?? 1.0, 0, 2); }
  setEnabled(v) { this.enabled = !!v; }
  setRoutes(routes) { this.routes = { ...this.routes, ...routes }; }
  getRoutes() { return JSON.parse(JSON.stringify(this.routes)); }
  toJSON() { return { enabled: this.enabled, master: this.master, intensity: this.intensity, reactivity: this.reactivity, routes: this.getRoutes() }; }
  fromJSON(data) {
    if (!data) return;
    if (typeof data.enabled === 'boolean') this.enabled = data.enabled;
    if (typeof data.master === 'number') this.master = data.master;
    if (typeof data.intensity === 'number') this.intensity = data.intensity;
    if (typeof data.reactivity === 'number') this.reactivity = data.reactivity;
    if (data.routes) this.setRoutes(data.routes);
  }

  // pow curve: >1 emphasizes peaks, <1 flattens
  _shape(x, p) { return Math.pow(clamp(x, 0, 1), p * this.reactivity); }

  setIntensity(v) { this.intensity = clamp(v ?? 1.0, 0.2, 2.0); }
  setReactivity(v) { this.reactivity = clamp(v ?? 1.0, 0.5, 2.0); }

  _pulse(f, src) {
    const val = clamp((f[src] ?? 0), 0, 1);
    const t = (x) => Math.tanh(x);
    let onset = 0;
    if (src === 'bass') onset = (f.fluxBass || 0);
    else if (src === 'mid') onset = (f.fluxMid || 0);
    else if (src === 'treble') onset = (f.fluxTreble || 0);
    const onsetN = clamp(0.6 * t((onset || 0) * 0.8), 0, 1);
    return clamp(val * 0.7 + onsetN * 0.3 + (f.beat || 0) * 0.1, 0, 1);
  }

  apply(features, conf, elapsed, envBase) {
    if (!this.enabled) return;
    const g = this.master * this.intensity;
    const f = features;

    // Map helpers
    const get = (src) => clamp((f[src] ?? 0), 0, 1);
    const shaped = (src, curve) => (src === 'bass' || src === 'mid' || src === 'treble') ? this._shape(this._pulse(f, src), curve) : this._shape(get(src), curve);

    // Jet strength
    if (conf.jetEnabled && this.routes.jetStrength.enable) {
      const r = this.routes.jetStrength;
      let v = conf.jetStrength * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15;
      if (f.beat > 0.6 && r.beatBoost) v += r.beatBoost * 0.05;
      conf.jetStrength = clamp(v * g, 0, 4.0);
    }

    // Vortex strength
    if (conf.vortexEnabled && this.routes.vortexStrength.enable) {
      const r = this.routes.vortexStrength;
      const v = conf.vortexStrength * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15;
      conf.vortexStrength = clamp(v * g, 0, 4.0);
    }

    // Noise
    if (this.routes.noise.enable) {
      const r = this.routes.noise;
      const v = conf.noise * 0.9 + shaped(r.source, r.curve) * r.gain * 0.1;
      conf.noise = clamp(v * g, 0, 2.0);
    }

    // APIC blend
    if (this.routes.apicBlend.enable) {
      const r = this.routes.apicBlend;
      const base = conf.apicBlend ?? 0.0;
      const target = clamp(base * 0.9 + shaped(r.source, r.curve) * r.gain * 0.1, 0.0, 0.6);
      conf.apicBlend = target;
    }

    // New volumetric fields
    if (conf.curlEnabled && this.routes.curlStrength.enable) {
      const r = this.routes.curlStrength;
      const base = conf.curlStrength ?? 0.5;
      conf.curlStrength = clamp(base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15, 0.0, 3.0);
    }
    if (conf.orbitEnabled && this.routes.orbitStrength.enable) {
      const r = this.routes.orbitStrength;
      const base = conf.orbitStrength ?? 0.5;
      conf.orbitStrength = clamp(base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15, 0.0, 3.0);
    }
    if (conf.waveEnabled && this.routes.waveAmplitude.enable) {
      const r = this.routes.waveAmplitude;
      const src = r.source === 'beat' ? f.beat : ((r.source === 'fluxBass' || r.source === 'fluxMid' || r.source === 'fluxTreble') ? clamp((f[r.source] || 0) * 0.8, 0, 1) : get(r.source));
      const shapedVal = this._shape(src, r.curve);
      const base = conf.waveAmplitude ?? 0.35;
      conf.waveAmplitude = clamp(base * 0.85 + shapedVal * r.gain * 0.15, 0.0, 2.0);
    }

    // Viscosity (invert small range)
    if (this.routes.viscosity.enable) {
      const r = this.routes.viscosity;
      const delta = shaped(r.source, r.curve) * r.gain * 0.02;
      conf.dynamicViscosity = clamp((conf.dynamicViscosity ?? 0.1) + delta, 0.02, 0.6);
    }

    // Environment micro-sway
    if (this.routes.envSway.enable && envBase) {
      const r = this.routes.envSway;
      const sway = (get(r.source) * r.gain) * Math.sin(elapsed * 1.6) + (f.beat * 0.06);
      postFxState.set(['camera', 'bgRotation'], envBase.bg + sway);
      postFxState.set(['camera', 'envRotation'], envBase.env - sway * 0.8);
    }

    // Color mode: audio saturation boost
    if (this.routes.colorSaturation.enable && conf.colorMode === 'audio') {
      // Keep using conf._audio* for renderers, router just ensures they're updated
      // Additional hooks for postFX can be placed in postfx.js
    }
  }
}

export default AudioRouter;
