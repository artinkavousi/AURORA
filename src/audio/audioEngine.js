// Simple Web Audio engine with FFT features and smoothing

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.source = null;
    this.freq = null;
    this.time = null;
    this.inputGain = 1.0;
    this.sourceKind = null; // 'mic' | 'file'
    this.monitorGain = null;
    this.monitorEnabled = false;
    this.monitorLevel = 0.0;
    this._prevMag = null;
    this._features = {
      level: 0,
      bass: 0,
      mid: 0,
      treble: 0,
      centroid: 0,
      flux: 0,
      beat: 0,
      tempoBpm: 0,
      tempoPhase01: 0,
      tempoConf: 0,
      fluxBass: 0,
      fluxMid: 0,
      fluxTreble: 0,
    };
    // Per-feature envelopes
    this._env = { level: 0, bass: 0, mid: 0, treble: 0, beat: 0 };
    this._envCfg = { attack: 0.5, release: 0.2 };
    this._envCfgMap = {
      level: { attack: 0.5, release: 0.2 },
      bass: { attack: 0.5, release: 0.2 },
      mid: { attack: 0.5, release: 0.2 },
      treble: { attack: 0.5, release: 0.2 },
      beat: { attack: 0.6, release: 0.2 },
    };
    // Beat / flux state
    this._beatState = { thr: 0.0, avg: 0.0, last: 0, hold: 0.12 };
    this._fluxWindow = new Float32Array(64);
    this._fluxIdx = 0; this._fluxCount = 0;
    this._thrMethod = 'median';
    this._thrK = 1.8;
    // AGC / gate
    this._agcAmount = 0.0; // 0..1
    this._agcLevel = 0.2; // running average level
    this._gateLevel = 0.003; // below → gate
    this._gateHold = 0.2; // seconds
    this._gateTimer = 0;
    // Tempo
    this._tempoEnabled = false;
    this._tempoBpm = 0; this._tempoPhase01 = 0; this._tempoConf = 0;
    this._fluxHist = new Float32Array(256);
    this._fluxHistCount = 0; this._fluxHistIdx = 0;
    this._lastUpdate = 0;
  }

  async ensureContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!this.analyser) {
      const a = this.ctx.createAnalyser();
      a.fftSize = 2048;
      a.smoothingTimeConstant = 0.6;
      this.analyser = a;
      this.freq = new Float32Array(a.frequencyBinCount);
      this.time = new Float32Array(a.fftSize);
      this._prevMag = new Float32Array(a.frequencyBinCount);
    }
    if (!this.monitorGain) {
      this.monitorGain = this.ctx.createGain();
      this.monitorGain.gain.value = this.monitorLevel;
    }
  }

  async connectMic() {
    await this.ensureContext();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 2,
      },
      video: false,
    });
    const src = this.ctx.createMediaStreamSource(stream);
    this.sourceKind = 'mic';
    this._connectSource(src);
  }

  async connectFile(arrayBuffer) {
    await this.ensureContext();
    const buf = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    this.sourceKind = 'file';
    this._connectSource(src);
    src.start();
  }

  _connectSource(src) {
    if (this.source) {
      try { this.source.disconnect(); } catch {}
    }
    this.source = src;
    // Analysis branch (no auto monitor)
    this.source.connect(this.analyser);
    // Playback/monitor branches
    try { this.monitorGain.disconnect(); } catch {}
    if (this.sourceKind === 'file') {
      // Hear files by default
      this.source.connect(this.ctx.destination);
    } else if (this.sourceKind === 'mic') {
      // Avoid echo by default; optionally monitor at low gain
      if (this.monitorEnabled && this.monitorGain) {
        this.monitorGain.gain.value = this.monitorLevel;
        this.source.connect(this.monitorGain);
        this.monitorGain.connect(this.ctx.destination);
      }
    }
  }

  setSmoothing(attack, release) {
    this._envCfg.attack = Math.max(0.01, Math.min(0.99, attack));
    this._envCfg.release = Math.max(0.01, Math.min(0.99, release));
  }

  setFeatureSmoothing(map) {
    // map: { level:{attack,release}, bass:{...}, ... }
    for (const k in map) {
      if (!this._envCfgMap[k]) this._envCfgMap[k] = { attack: 0.5, release: 0.2 };
      const src = map[k];
      if (typeof src.attack === 'number') this._envCfgMap[k].attack = Math.max(0.01, Math.min(0.99, src.attack));
      if (typeof src.release === 'number') this._envCfgMap[k].release = Math.max(0.01, Math.min(0.99, src.release));
    }
  }

  setFluxThreshold({ method = 'median', k = 1.8 } = {}) {
    this._thrMethod = method;
    this._thrK = k;
  }

  setAgc(amount = 0.0) { this._agcAmount = Math.max(0, Math.min(1, amount)); }
  setGate(level = 0.003, hold = 0.2) { this._gateLevel = level; this._gateHold = hold; }
  enableTempo(v = true) { this._tempoEnabled = !!v; }
  setFftSize(size = 2048) {
    if (!this.analyser) return;
    size = Math.max(32, Math.min(32768, size));
    // Must be power of two between 32 and 32768
    const pow2 = 1 << Math.round(Math.log2(size));
    this.analyser.fftSize = pow2;
    this.freq = new Float32Array(this.analyser.frequencyBinCount);
    this.time = new Float32Array(this.analyser.fftSize);
    this._prevMag = new Float32Array(this.analyser.frequencyBinCount);
  }
  setInputGain(g = 1.0) { this.inputGain = Math.max(0.01, Math.min(4.0, g)); }
  setMonitorEnabled(v) { this.monitorEnabled = !!v; if (this.sourceKind === 'mic' && this.source) this._connectSource(this.source); }
  setMonitorLevel(g) { this.monitorLevel = Math.max(0, Math.min(1, g)); if (this.monitorGain) this.monitorGain.gain.value = this.monitorLevel; }

  update(dt) {
    if (!this.analyser) return this._features;
    this.analyser.getFloatFrequencyData(this.freq);
    this.analyser.getFloatTimeDomainData(this.time);

    // Convert dBFS bins to magnitudes 0..1
    const mag = this.freq;
    const N = mag.length;
    let sum = 0;
    for (let i = 0; i < N; i++) {
      // from ~-140..0 dBFS to 0..1
      mag[i] = Math.max(0, (mag[i] + 120) / 120) * this.inputGain;
      sum += mag[i];
    }
    // Level and AGC
    let level = sum / N;
    this._agcLevel = this._agcLevel * 0.995 + level * 0.005;
    if (this._agcAmount > 0) {
      const t = this._agcLevel > 1e-5 ? (0.2 / this._agcLevel) : 1.0; // target ~0.2 average
      const g = 1.0 + (t - 1.0) * this._agcAmount;
      level *= g;
      for (let i = 0; i < N; i++) mag[i] *= g;
    }
    // Silence gate
    if (level < this._gateLevel) {
      this._gateTimer += dt;
    } else {
      this._gateTimer = 0;
    }

    // Bands using sampleRate
    const sr = this.ctx.sampleRate || 48000;
    const ny = sr / 2;
    const hzPerBin = ny / N;
    const toBin = (hz) => Math.max(0, Math.min(N - 1, Math.floor(hz / hzPerBin)));

    const b0 = toBin(20), b1 = toBin(150);
    const m0 = toBin(150), m1 = toBin(2000);
    const t0 = toBin(2000), t1 = toBin(8000);

    const avgBand = (lo, hi) => {
      let s = 0, c = 0;
      for (let i = lo; i <= hi; i++) { s += mag[i]; c++; }
      return c ? s / c : 0;
    };
    const bass = avgBand(b0, b1);
    const mid = avgBand(m0, m1);
    const treble = avgBand(t0, t1);

    // Spectral centroid
    let num = 0, den = 0;
    for (let i = 0; i < N; i++) { num += i * hzPerBin * mag[i]; den += mag[i] + 1e-6; }
    const centroid = num / den / ny; // 0..1

    // Spectral flux and simple beat gate
    let flux = 0;
    let fluxBass = 0, fluxMid = 0, fluxTreble = 0;
    for (let i = 0; i < N; i++) {
      const d = mag[i] - this._prevMag[i];
      if (d > 0) {
        flux += d;
        if (i >= b0 && i <= b1) fluxBass += d;
        else if (i >= m0 && i <= m1) fluxMid += d;
        else if (i >= t0 && i <= t1) fluxTreble += d;
      }
      this._prevMag[i] = mag[i];
    }
    // Store flux for median/avg threshold
    this._fluxWindow[this._fluxIdx] = flux; this._fluxIdx = (this._fluxIdx + 1) % this._fluxWindow.length;
    this._fluxCount = Math.min(this._fluxWindow.length, this._fluxCount + 1);
    let thr = 0;
    if (this._thrMethod === 'median' && this._fluxCount > 8) {
      const tmp = Array.from(this._fluxWindow.slice(0, this._fluxCount));
      tmp.sort((a,b)=>a-b);
      const m = tmp[Math.floor(tmp.length * 0.5)];
      thr = m * this._thrK;
    } else {
      const alpha = 0.9;
      this._beatState.avg = this._beatState.avg * alpha + flux * (1 - alpha);
      thr = this._beatState.avg * this._thrK;
    }
    this._beatState.thr = thr;
    let beat = 0;
    if (flux > thr && this._gateTimer < this._gateHold) {
      const now = (performance.now() || 0) / 1000;
      if (now - this._beatState.last > this._beatState.hold) {
        beat = 1;
        this._beatState.last = now;
      }
    }

    // Envelope smoothing
    const applyEnv = (name, val) => {
      const per = this._envCfgMap[name] || this._envCfg;
      const a = per.attack ?? this._envCfg.attack;
      const r = per.release ?? this._envCfg.release;
      const cur = this._env[name];
      const target = val;
      const k = target > cur ? a : r;
      this._env[name] = cur * (1 - k) + target * k;
      return this._env[name];
    };

    this._features.level = applyEnv('level', level);
    this._features.bass = applyEnv('bass', bass);
    this._features.mid = applyEnv('mid', mid);
    this._features.treble = applyEnv('treble', treble);
    this._features.centroid = centroid;
    this._features.flux = flux;
    this._features.beat = applyEnv('beat', beat);
    this._features.fluxBass = fluxBass;
    this._features.fluxMid = fluxMid;
    this._features.fluxTreble = fluxTreble;

    // Tempo estimation (simple ACF over recent flux)
    if (this._tempoEnabled) {
      this._fluxHist[this._fluxHistIdx] = flux;
      this._fluxHistIdx = (this._fluxHistIdx + 1) % this._fluxHist.length;
      this._fluxHistCount = Math.min(this._fluxHist.length, this._fluxHistCount + 1);
      if (this._fluxHistCount > 64) {
        // Build contiguous buffer in order
        const len = this._fluxHistCount;
        const buf = new Float32Array(len);
        for (let i = 0; i < len; i++) buf[i] = this._fluxHist[(this._fluxHistIdx + i) % this._fluxHist.length];
        // Remove mean
        let mean = 0; for (let i = 0; i < len; i++) mean += buf[i]; mean /= len;
        for (let i = 0; i < len; i++) buf[i] -= mean;
        // Autocorrelation
        let bestLag = 0, bestVal = -1;
        // Assume ~60 FPS sampling
        const fps = 60;
        const bpmMin = 80, bpmMax = 180;
        const lagMin = Math.floor((fps * 60) / bpmMax);
        const lagMax = Math.floor((fps * 60) / bpmMin);
        for (let lag = lagMin; lag <= lagMax; lag++) {
          let acc = 0;
          for (let i = 0; i < len - lag; i++) acc += buf[i] * buf[i + lag];
          // Harmonic weighting prefers integers 2x/3x of fundamental
          const bpm = 60 * fps / lag;
          const weight = 1.0 - Math.abs(Math.round(bpm / 60) * 60 - bpm) / 60; // rough
          acc *= 0.5 + 0.5 * weight;
          if (acc > bestVal) { bestVal = acc; bestLag = lag; }
        }
        const bpm = 60 * fps / Math.max(1, bestLag);
        // Smooth BPM
        this._tempoBpm = this._tempoBpm ? (this._tempoBpm * 0.9 + bpm * 0.1) : bpm;
        this._tempoConf = Math.max(0, Math.min(1, bestVal / (len * 0.5 + 1e-6)));
        // Phase advance
        this._tempoPhase01 = (this._tempoPhase01 + dt * this._tempoBpm / 60) % 1;
      }
      this._features.tempoBpm = this._tempoBpm;
      this._features.tempoPhase01 = this._tempoPhase01;
      this._features.tempoConf = this._tempoConf;
    } else {
      this._features.tempoBpm = 0; this._features.tempoPhase01 = 0; this._features.tempoConf = 0;
    }

    return this._features;
  }

  features() {
    return this._features;
  }
}

export default AudioEngine;
