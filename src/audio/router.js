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
      vortexStrength: { enable: true, source: 'mid', gain: 1.0, curve: 1.0 },
      noise: { enable: true, source: 'treble', gain: 0.3, curve: 1.0 },
      apicBlend: { enable: true, source: 'level', gain: 0.3, curve: 1.5 },
      viscosity: { enable: false, source: 'level', gain: -0.1, curve: 1.0 },
      colorSaturation: { enable: true, source: 'level', gain: 0.5, curve: 1.0 },
      envSway: { enable: true, source: 'level', gain: 0.06, curve: 1.0 },
      curlStrength: { enable: true, source: 'treble', gain: 1.2, curve: 1.2 },
      orbitStrength: { enable: true, source: 'mid', gain: 1.0, curve: 1.0 },
      waveAmplitude: { enable: true, source: 'beat', gain: 1.2, curve: 1.0 },
      jetRadius: { enable: false, source: 'sub', gain: 6.0, curve: 1.0 },
      vortexRadius: { enable: false, source: 'presence', gain: 5.0, curve: 1.0 },
      bloomStrength: { enable: true, source: 'presence', gain: 0.6, curve: 1.1 },
      exposure: { enable: false, source: 'brightness', gain: 0.35, curve: 1.0 },
      postSaturation: { enable: true, source: 'tilt', gain: 0.6, curve: 1.0 },
      postContrast: { enable: false, source: 'transient', gain: 0.4, curve: 1.0 },
      dofAmount: { enable: false, source: 'roughness', gain: 0.5, curve: 1.0 },
    };
    this._bases = {};
    this._lastApplied = {};
  }

  setMaster(v) { this.master = clamp(v ?? 1.0, 0, 2); }
  setEnabled(v) { this.enabled = !!v; }
  setRoutes(routes) {
    if (!routes) return;
    const next = { ...this.routes };
    Object.keys(routes).forEach((key) => {
      const current = next[key] || {};
      next[key] = { ...current, ...routes[key] };
    });
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

  setIntensity(v) { this.intensity = clamp(v ?? 1.0, 0.2, 2.0); }
  setReactivity(v) { this.reactivity = clamp(v ?? 1.0, 0.5, 2.0); }

  _ensureBase(conf, key) {
    if (!conf || !key) return this._bases[key];
    const cur = conf[key];
    if (cur === undefined || cur === null || Number.isNaN(cur)) return this._bases[key];
    if (this._bases[key] === undefined) this._bases[key] = cur;
    const last = this._lastApplied[key];
    if (last !== undefined && Math.abs(cur - last) > 0.01) {
      this._bases[key] = cur;
    }
    return this._bases[key];
  }

  _setConf(conf, key, value) {
    if (value === undefined || value === null || Number.isNaN(value)) return;
    conf[key] = value;
    this._lastApplied[key] = value;
  }

  _restoreTowardsBase(conf, key) {
    if (!conf || !key) return;
    const base = this._bases[key];
    if (base === undefined) return;
    const cur = conf[key];
    if (cur === undefined || cur === null || Number.isNaN(cur)) return;
    if (Math.abs(cur - base) > 0.001) {
      this._setConf(conf, key, base);
    } else {
      this._lastApplied[key] = cur;
    }
  }

  reset(conf, envBase) {
    if (!conf) return;
    if (envBase) {
      conf.bgRotY = envBase.bg;
      conf.envRotY = envBase.env;
    }
    Object.keys(this._bases).forEach((key) => {
      if (this._bases[key] !== undefined) {
        this._setConf(conf, key, this._bases[key]);
      }
    });
  }

  _pulse(f, src) {
    const val = clamp((f[src] ?? 0), 0, 1);
    const t = (x) => Math.tanh(x);
    let onset = 0;
    if (src === 'bass' || src === 'sub') onset = (f.fluxBass || 0);
    else if (src === 'mid' || src === 'lowMid' || src === 'highMid') onset = (f.fluxMid || 0);
    else if (src === 'treble' || src === 'presence' || src === 'air') onset = (f.fluxTreble || 0);
    const onsetN = clamp(0.6 * t((onset || 0) * 0.8), 0, 1);
    return clamp(val * 0.7 + onsetN * 0.3 + (f.beat || 0) * 0.1, 0, 1);
  }

  apply(features, conf, elapsed, envBase) {
    if (!this.enabled) return;
    const g = this.master * this.intensity;
    const f = features || {};
    const tempoPhase = clamp((f.tempoPhase01 ?? 0), 0, 1);
    const tempoConf = clamp((f.tempoConf ?? 0), 0, 1);
    const tempoWave = tempoConf > 0.25 ? Math.sin(tempoPhase * Math.PI * 2) : Math.sin(elapsed * 1.2);
    const tempoPulse = clamp(0.5 + 0.5 * tempoWave, 0, 1);

    const get = (src) => {
      if (src === 'tempoWave') return tempoPulse;
      if (src === 'tempoPhase01') return tempoPhase;
      return clamp((f[src] ?? 0), 0, 1);
    };
    const shaped = (src, curve) => (src === 'bass' || src === 'mid' || src === 'treble' || src === 'sub' || src === 'lowMid' || src === 'highMid' || src === 'presence' || src === 'air')
      ? this._shape(this._pulse(f, src), curve)
      : this._shape(get(src), curve);

    if (conf.jetEnabled && this.routes.jetStrength.enable) {
      const r = this.routes.jetStrength;
      let v = conf.jetStrength * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15;
      if (f.beat > 0.6 && r.beatBoost) v += r.beatBoost * 0.05;
      conf.jetStrength = clamp(v * g, 0, 4.0);
    }

    if (this.routes.jetRadius) {
      this._ensureBase(conf, 'jetRadius');
      if (conf.jetEnabled && this.routes.jetRadius.enable) {
        const r = this.routes.jetRadius;
        const base = this._bases.jetRadius;
        if (base !== undefined) {
          const delta = (shaped(r.source, r.curve) - 0.5) * r.gain * g * 0.4;
          const target = clamp(base + delta, 2.0, 30.0);
          this._setConf(conf, 'jetRadius', target);
        }
      } else {
        this._restoreTowardsBase(conf, 'jetRadius');
      }
    }

    if (conf.vortexEnabled && this.routes.vortexStrength.enable) {
      const r = this.routes.vortexStrength;
      const v = conf.vortexStrength * 0.85 + shaped(r.source, r.curve) * r.gain * 0.15;
      conf.vortexStrength = clamp(v * g, 0, 4.0);
    }

    if (this.routes.vortexRadius) {
      this._ensureBase(conf, 'vortexRadius');
      if (conf.vortexEnabled && this.routes.vortexRadius.enable) {
        const r = this.routes.vortexRadius;
        const base = this._bases.vortexRadius;
        if (base !== undefined) {
          const delta = (shaped(r.source, r.curve) - 0.5) * r.gain * g * 0.4;
          const target = clamp(base + delta, 4.0, 48.0);
          this._setConf(conf, 'vortexRadius', target);
        }
      } else {
        this._restoreTowardsBase(conf, 'vortexRadius');
      }
    }

    if (this.routes.noise.enable) {
      const r = this.routes.noise;
      const v = conf.noise * 0.9 + shaped(r.source, r.curve) * r.gain * 0.1;
      conf.noise = clamp(v * g, 0, 2.0);
    }

    if (this.routes.apicBlend.enable) {
      const r = this.routes.apicBlend;
      const base = conf.apicBlend ?? 0.0;
      const target = clamp(base * 0.9 + shaped(r.source, r.curve) * r.gain * 0.1, 0.0, 0.6);
      conf.apicBlend = target;
    }

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
      let srcVal;
      if (r.source === 'beat') {
        srcVal = Math.max(f.beat || 0, tempoConf > 0.25 ? tempoPulse : 0);
      } else if (r.source === 'fluxBass' || r.source === 'fluxMid' || r.source === 'fluxTreble') {
        srcVal = clamp((f[r.source] || 0) * 0.8, 0, 1);
      } else {
        srcVal = get(r.source);
      }
      const shapedVal = this._shape(srcVal, r.curve);
      const base = conf.waveAmplitude ?? 0.35;
      conf.waveAmplitude = clamp(base * 0.85 + shapedVal * r.gain * 0.15, 0.0, 2.0);
    }

    if (this.routes.viscosity.enable) {
      const r = this.routes.viscosity;
      const delta = shaped(r.source, r.curve) * r.gain * 0.02;
      conf.dynamicViscosity = clamp((conf.dynamicViscosity ?? 0.1) + delta, 0.02, 0.6);
    }

    if (this.routes.bloomStrength) {
      this._ensureBase(conf, 'bloomStrength');
      if (this.routes.bloomStrength.enable) {
        const r = this.routes.bloomStrength;
        const base = this._bases.bloomStrength;
        if (base !== undefined) {
          const delta = (shaped(r.source, r.curve) - 0.5) * r.gain * g * 0.5;
          const target = clamp(base + delta, 0.0, 4.0);
          this._setConf(conf, 'bloomStrength', target);
        }
      } else {
        this._restoreTowardsBase(conf, 'bloomStrength');
      }
    }

    if (this.routes.exposure) {
      this._ensureBase(conf, 'exposure');
      if (this.routes.exposure.enable) {
        const r = this.routes.exposure;
        const base = this._bases.exposure;
        if (base !== undefined) {
          const delta = (shaped(r.source, r.curve) - 0.5) * r.gain * g * 0.4;
          const target = clamp(base + delta, 0.2, 1.8);
          this._setConf(conf, 'exposure', target);
        }
      } else {
        this._restoreTowardsBase(conf, 'exposure');
      }
    }

    if (this.routes.postSaturation) {
      this._ensureBase(conf, 'postSaturation');
      if (this.routes.postSaturation.enable) {
        const r = this.routes.postSaturation;
        const base = this._bases.postSaturation;
        if (base !== undefined) {
          const delta = (shaped(r.source, r.curve) - 0.5) * r.gain * g * 0.45;
          const target = clamp(base + delta, 0.3, 2.2);
          this._setConf(conf, 'postSaturation', target);
        }
      } else if (!this.routes.colorSaturation || !this.routes.colorSaturation.enable) {
        this._restoreTowardsBase(conf, 'postSaturation');
      }
    }

    if (this.routes.postContrast) {
      this._ensureBase(conf, 'postContrast');
      if (this.routes.postContrast.enable) {
        const r = this.routes.postContrast;
        const base = this._bases.postContrast;
        if (base !== undefined) {
          const delta = (shaped(r.source, r.curve) - 0.5) * r.gain * g * 0.4;
          const target = clamp(base + delta, 0.6, 1.8);
          this._setConf(conf, 'postContrast', target);
        }
      } else {
        this._restoreTowardsBase(conf, 'postContrast');
      }
    }

    if (this.routes.dofAmount) {
      this._ensureBase(conf, 'dofAmount');
      if (conf.dofEnabled && this.routes.dofAmount.enable) {
        const r = this.routes.dofAmount;
        const base = this._bases.dofAmount;
        if (base !== undefined) {
          const delta = (shaped(r.source, r.curve) - 0.5) * r.gain * g * 0.4;
          const target = clamp(base + delta, 0.4, 1.8);
          this._setConf(conf, 'dofAmount', target);
        }
      } else {
        this._restoreTowardsBase(conf, 'dofAmount');
      }
    }

    if (this.routes.envSway.enable && envBase) {
      const r = this.routes.envSway;
      const swayBase = get(r.source) * r.gain;
      const sway = swayBase * tempoWave + (f.beat || 0) * 0.05;
      conf.bgRotY = envBase.bg + sway;
      conf.envRotY = envBase.env - sway * 0.8;
    }

    if (this.routes.colorSaturation.enable && conf.colorMode === 'audio' && (!this.routes.postSaturation || !this.routes.postSaturation.enable)) {
      this._ensureBase(conf, 'postSaturation');
      const base = this._bases.postSaturation;
      if (base !== undefined) {
        const r = this.routes.colorSaturation;
        const delta = (shaped(r.source, r.curve) - 0.5) * r.gain * g * 0.4;
        const target = clamp(base + delta, 0.3, 2.2);
        this._setConf(conf, 'postSaturation', target);
      }
    }
  }
}

export default AudioRouter;
