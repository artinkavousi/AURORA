// AudioRouter: map audio features to simulation and visual configuration safely

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
      jetRadius: { enable: true, source: 'sub', gain: 6.0, curve: 1.1 },
      vortexStrength: { enable: true, source: 'mid', gain: 1.0, curve: 1.0 },
      vortexRadius: { enable: true, source: 'tempo', gain: 6.0, curve: 1.0 },
      noise: { enable: true, source: 'treble', gain: 0.3, curve: 1.0 },
      apicBlend: { enable: true, source: 'level', gain: 0.3, curve: 1.5 },
      viscosity: { enable: false, source: 'level', gain: -0.1, curve: 1.0 },
      curlStrength: { enable: true, source: 'treble', gain: 1.2, curve: 1.2 },
      curlScale: { enable: true, source: 'presence', gain: 0.012, curve: 1.0 },
      curlTime: { enable: true, source: 'tempoPulse', gain: 0.6, curve: 1.0 },
      orbitStrength: { enable: true, source: 'mid', gain: 1.0, curve: 1.0 },
      orbitRadius: { enable: true, source: 'tempo', gain: 5.5, curve: 1.0 },
      waveAmplitude: { enable: true, source: 'beat', gain: 1.2, curve: 1.0 },
      waveScale: { enable: false, source: 'dynamics', gain: 0.08, curve: 1.0 },
      waveSpeed: { enable: true, source: 'air', gain: 1.0, curve: 1.0 },
      bloomStrength: { enable: true, source: 'loudness', gain: 0.4, curve: 1.0 },
      postSaturation: { enable: true, source: 'presence', gain: 0.3, curve: 1.1 },
      postContrast: { enable: false, source: 'dynamics', gain: 0.15, curve: 1.0 },
      postLift: { enable: true, source: 'tilt', gain: 0.1, curve: 1.0 },
      vignetteAmount: { enable: false, source: 'tilt', gain: 0.18, curve: 1.0 },
      grainAmount: { enable: false, source: 'dynamics', gain: 0.3, curve: 1.0 },
      chromaAmount: { enable: true, source: 'air', gain: 0.006, curve: 1.1 },
      motionBlur: { enable: false, source: 'beatConfidence', gain: 0.4, curve: 1.0 },
      envSway: { enable: true, source: 'level', gain: 0.06, curve: 1.0 },
      envPan: { enable: true, source: 'stereoSigned', gain: 0.45, curve: 1.0 },
      dofFocus: { enable: true, source: 'tempoPulse', gain: 0.35, curve: 1.0 },
      dofRange: { enable: false, source: 'dynamics', gain: 0.12, curve: 1.0 },
    };
  }

  setMaster(v) { this.master = clamp(v ?? 1.0, 0, 2); }
  setEnabled(v) { this.enabled = !!v; }
  setRoutes(routes) {
    const next = { ...this.routes };
    for (const key in routes) {
      const current = next[key] || {};
      next[key] = { ...current, ...routes[key] };
    }
    this.routes = next;
  }
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

  _sourceValue(f, src) {
    if (!src) return 0;
    switch (src) {
      case 'tempo':
      case 'tempoNorm':
        return clamp(f.tempoNorm ?? 0, 0, 1);
      case 'tempoPhase':
      case 'tempoPhase01':
        return ((f.tempoPhase01 ?? 0) % 1 + 1) % 1;
      case 'tempoPulse':
        if (typeof f.tempoPulse === 'number') return clamp(f.tempoPulse, 0, 1);
        return clamp((0.5 + 0.5 * Math.sin(((f.tempoPhase01 ?? 0) * Math.PI * 2))) * clamp(f.tempoConf ?? 0, 0, 1), 0, 1);
      case 'tempoConf':
        return clamp(f.tempoConf ?? 0, 0, 1);
      case 'beatConfidence':
        return clamp(f.beatConfidence ?? f.beat ?? 0, 0, 1);
      case 'flux':
      case 'fluxNorm':
        return clamp(f.fluxNorm ?? f.flux ?? 0, 0, 1);
      case 'rms':
        return clamp(f.rms ?? 0, 0, 1);
      case 'loudness':
        return clamp(f.loudness ?? 0, 0, 1);
      case 'crest':
        return clamp(f.crest ?? 0, 0, 1);
      case 'dynamics':
        return clamp(f.dynamics ?? 0, 0, 1);
      case 'dominant':
        return clamp(f.dominant ?? 0, 0, 1);
      case 'tilt':
        return clamp(f.tilt ?? 0.5, 0, 1);
      case 'stereo':
      case 'stereoPos':
        return clamp(f.stereo ?? 0.5, 0, 1);
      case 'stereoSigned':
        return clamp((f.stereoSigned ?? 0) * 0.5 + 0.5, 0, 1);
      case 'stereoWidth':
        return clamp(f.stereoWidth ?? 0, 0, 1);
      default: {
        if (f.bandEnergies && typeof src === 'string' && src.startsWith('band')) {
          const idx = parseInt(src.slice(4), 10);
          if (!Number.isNaN(idx)) return clamp(f.bandEnergies[idx] ?? 0, 0, 1);
        }
        return clamp((f[src] ?? 0), 0, 1);
      }
    }
  }

  setIntensity(v) { this.intensity = clamp(v ?? 1.0, 0.2, 2.0); }
  setReactivity(v) { this.reactivity = clamp(v ?? 1.0, 0.5, 2.0); }

  _pulse(f, src) {
    const val = this._sourceValue(f, src);
    const t = (x) => Math.tanh(x);
    let onset = 0;
    if (src === 'bass' || src === 'sub') onset = (f.fluxBass || 0);
    else if (src === 'mid' || src === 'lowMid' || src === 'highMid') onset = (f.fluxMid || 0);
    else if (src === 'treble' || src === 'presence' || src === 'air') onset = (f.fluxTreble || 0);
    const onsetN = clamp(0.6 * t((onset || 0) * 0.8), 0, 1);
    const beatMix = Math.max(f.beat || 0, f.beatConfidence || 0);
    return clamp(val * 0.65 + onsetN * 0.25 + beatMix * 0.1, 0, 1);
  }

  apply(features, conf, elapsed, envBase) {
    if (!this.enabled) {
      if (envBase) {
        conf.bgRotY = envBase.bg;
        conf.envRotY = envBase.env;
      }
      return;
    }
    const g = this.master * this.intensity;
    const f = features || {};
    const spectral = new Set(['bass', 'mid', 'treble', 'sub', 'lowMid', 'highMid', 'presence', 'air']);
    const get = (src) => this._sourceValue(f, src);
    const shaped = (src, curve) => spectral.has(src) ? this._shape(this._pulse(f, src), curve) : this._shape(get(src), curve);

    if (conf.jetEnabled && this.routes.jetStrength?.enable) {
      const r = this.routes.jetStrength;
      let v = conf.jetStrength * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15;
      if (f.beat > 0.6 && r.beatBoost) v += r.beatBoost * 0.05;
      conf.jetStrength = clamp(v * g, 0, 4.0);
    }
    if (conf.jetEnabled && this.routes.jetRadius?.enable) {
      const r = this.routes.jetRadius;
      const base = conf.jetRadius ?? 12.0;
      const target = base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15;
      conf.jetRadius = clamp(target * (0.8 + 0.2 * g), 2.0, 36.0);
    }

    if (conf.vortexEnabled && this.routes.vortexStrength?.enable) {
      const r = this.routes.vortexStrength;
      const v = conf.vortexStrength * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15;
      conf.vortexStrength = clamp(v * g, 0, 4.0);
    }
    if (conf.vortexEnabled && this.routes.vortexRadius?.enable) {
      const r = this.routes.vortexRadius;
      const base = conf.vortexRadius ?? 20.0;
      const target = base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15;
      conf.vortexRadius = clamp(target, 6.0, 48.0);
    }

    if (this.routes.noise?.enable) {
      const r = this.routes.noise;
      const v = conf.noise * 0.9 + shaped(r.source, r.curve) * r.gain * 0.1;
      conf.noise = clamp(v * g, 0, 2.0);
    }

    if (this.routes.apicBlend?.enable) {
      const r = this.routes.apicBlend;
      const base = conf.apicBlend ?? 0.0;
      const target = clamp(base * 0.9 + shaped(r.source, r.curve) * r.gain * 0.1, 0.0, 0.6);
      conf.apicBlend = target;
    }

    if (conf.curlEnabled && this.routes.curlStrength?.enable) {
      const r = this.routes.curlStrength;
      const base = conf.curlStrength ?? 0.5;
      conf.curlStrength = clamp(base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15, 0.0, 3.0);
    }
    if (conf.curlEnabled && this.routes.curlScale?.enable) {
      const r = this.routes.curlScale;
      const base = conf.curlScale ?? 0.02;
      conf.curlScale = clamp(base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15, 0.005, 0.08);
    }
    if (conf.curlEnabled && this.routes.curlTime?.enable) {
      const r = this.routes.curlTime;
      const base = conf.curlTime ?? 0.6;
      conf.curlTime = clamp(base * 0.85 + this._shape(get(r.source), r.curve) * r.gain * 0.15, 0.1, 2.0);
    }

    if (conf.orbitEnabled && this.routes.orbitStrength?.enable) {
      const r = this.routes.orbitStrength;
      const base = conf.orbitStrength ?? 0.5;
      conf.orbitStrength = clamp(base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15, 0.0, 3.0);
    }
    if (conf.orbitEnabled && this.routes.orbitRadius?.enable) {
      const r = this.routes.orbitRadius;
      const base = conf.orbitRadius ?? 22.0;
      conf.orbitRadius = clamp(base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15, 4.0, 48.0);
    }

    if (conf.waveEnabled && this.routes.waveAmplitude?.enable) {
      const r = this.routes.waveAmplitude;
      let srcVal;
      if (r.source === 'beat') srcVal = clamp(f.beat ?? 0, 0, 1);
      else if (r.source === 'fluxBass' || r.source === 'fluxMid' || r.source === 'fluxTreble') srcVal = clamp((f[r.source] || 0) * 0.8, 0, 1);
      else srcVal = get(r.source);
      const shapedVal = this._shape(srcVal, r.curve);
      const base = conf.waveAmplitude ?? 0.35;
      conf.waveAmplitude = clamp(base * 0.85 + shapedVal * r.gain * 0.15, 0.0, 2.0);
    }
    if (conf.waveEnabled && this.routes.waveScale?.enable) {
      const r = this.routes.waveScale;
      const base = conf.waveScale ?? 0.12;
      conf.waveScale = clamp(base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15, 0.04, 0.3);
    }
    if (conf.waveEnabled && this.routes.waveSpeed?.enable) {
      const r = this.routes.waveSpeed;
      const base = conf.waveSpeed ?? 1.2;
      conf.waveSpeed = clamp(base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15, 0.2, 2.5);
    }

    if (this.routes.viscosity?.enable) {
      const r = this.routes.viscosity;
      const delta = shaped(r.source, r.curve) * r.gain * 0.02;
      conf.dynamicViscosity = clamp((conf.dynamicViscosity ?? 0.1) + delta, 0.02, 0.6);
    }

    if (conf.bloom && this.routes.bloomStrength?.enable) {
      const r = this.routes.bloomStrength;
      const base = conf.bloomStrength ?? 1.0;
      const target = base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15 * g;
      conf.bloomStrength = clamp(target, 0.2, 2.0);
    }
    if (this.routes.postSaturation?.enable) {
      const r = this.routes.postSaturation;
      const base = conf.postSaturation ?? 1.0;
      const target = base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15 * g;
      conf.postSaturation = clamp(target, 0.5, 1.6);
    }
    if (this.routes.postContrast?.enable) {
      const r = this.routes.postContrast;
      const base = conf.postContrast ?? 1.0;
      const target = base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15 * g;
      conf.postContrast = clamp(target, 0.6, 1.6);
    }
    if (this.routes.postLift?.enable) {
      const r = this.routes.postLift;
      const base = conf.postLift ?? 0.0;
      const target = base * 0.85 + (this._shape(get(r.source), r.curve) - 0.5) * r.gain * 0.3;
      conf.postLift = clamp(target, -0.25, 0.25);
    }
    if (conf.vignetteEnabled && this.routes.vignetteAmount?.enable) {
      const r = this.routes.vignetteAmount;
      const base = conf.vignetteAmount ?? 0.25;
      const target = base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15;
      conf.vignetteAmount = clamp(target, 0.0, 0.6);
    }
    if (conf.grainEnabled && this.routes.grainAmount?.enable) {
      const r = this.routes.grainAmount;
      const base = conf.grainAmount ?? 0.08;
      const target = base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15;
      conf.grainAmount = clamp(target, 0.0, 0.35);
    }
    if (conf.chromaEnabled && this.routes.chromaAmount?.enable) {
      const r = this.routes.chromaAmount;
      const base = conf.chromaAmount ?? 0.0025;
      const target = base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15;
      conf.chromaAmount = clamp(target, 0.0, 0.01);
    }
    if (conf.motionBlurEnabled && this.routes.motionBlur?.enable) {
      const r = this.routes.motionBlur;
      const base = conf.motionBlurAmount ?? 0.35;
      const target = base * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15;
      conf.motionBlurAmount = clamp(target, 0.0, 0.9);
    }
    if (conf.dofEnabled && this.routes.dofFocus?.enable) {
      const r = this.routes.dofFocus;
      const base = conf.dofFocus ?? 1.0;
      const target = base * 0.85 + this._shape(get(r.source), r.curve) * r.gain * 0.15;
      conf.dofFocus = clamp(target, 0.4, 2.2);
    }
    if (conf.dofEnabled && this.routes.dofRange?.enable) {
      const r = this.routes.dofRange;
      const base = conf.dofRange ?? 0.08;
      const target = base * 0.85 + this._shape(get(r.source), r.curve) * r.gain * 0.15;
      conf.dofRange = clamp(target, 0.03, 0.6);
    }

    if (envBase) {
      let bgRot = envBase.bg;
      let envRot = envBase.env;
      if (this.routes.envSway?.enable) {
        const r = this.routes.envSway;
        const sway = (get(r.source) * r.gain) * Math.sin(elapsed * 1.6) + (f.beat || 0) * 0.06;
        bgRot = envBase.bg + sway;
        envRot = envBase.env - sway * 0.8;
      }
      if (this.routes.envPan?.enable) {
        const r = this.routes.envPan;
        let panRaw = 0;
        if (r.source === 'stereoSigned') panRaw = clamp(f.stereoSigned ?? 0, -1, 1);
        else panRaw = clamp(get(r.source) * 2 - 1, -1, 1);
        const amount = clamp(panRaw * (r.gain ?? 0.3), -1.5, 1.5);
        bgRot += amount;
        envRot -= amount * 0.75;
      }
      conf.bgRotY = bgRot;
      conf.envRotY = envRot;
    }
  }
}

export default AudioRouter;
