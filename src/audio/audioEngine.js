// Simple Web Audio engine with FFT features and smoothing

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.source = null;
    this.freq = null;
    this.time = null;
    this._prevMag = null;
    this._features = {
      level: 0,
      bass: 0,
      mid: 0,
      treble: 0,
      centroid: 0,
      flux: 0,
      beat: 0,
    };
    this._env = { level: 0, bass: 0, mid: 0, treble: 0, beat: 0 };
    this._envCfg = { attack: 0.5, release: 0.2 };
    this._beatState = { thr: 0.0, avg: 0.0, last: 0, hold: 0.12 };
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
  }

  async connectMic() {
    await this.ensureContext();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const src = this.ctx.createMediaStreamSource(stream);
    this._connectSource(src);
  }

  async connectFile(arrayBuffer) {
    await this.ensureContext();
    const buf = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    this._connectSource(src);
    src.start();
  }

  _connectSource(src) {
    if (this.source) {
      try { this.source.disconnect(); } catch {}
    }
    this.source = src;
    this.source.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  setSmoothing(attack, release) {
    this._envCfg.attack = Math.max(0.01, Math.min(0.99, attack));
    this._envCfg.release = Math.max(0.01, Math.min(0.99, release));
  }

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
      mag[i] = Math.max(0, (mag[i] + 120) / 120);
      sum += mag[i];
    }
    const level = sum / N;

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
    for (let i = 0; i < N; i++) {
      const d = mag[i] - this._prevMag[i];
      if (d > 0) flux += d;
      this._prevMag[i] = mag[i];
    }
    // Running average threshold
    const alpha = 0.9;
    this._beatState.avg = this._beatState.avg * alpha + flux * (1 - alpha);
    const thr = this._beatState.avg * 1.8;
    this._beatState.thr = thr;
    let beat = 0;
    if (flux > thr) {
      const now = (performance.now() || 0) / 1000;
      if (now - this._beatState.last > this._beatState.hold) {
        beat = 1;
        this._beatState.last = now;
      }
    }

    // Envelope smoothing
    const applyEnv = (name, val) => {
      const a = this._envCfg.attack, r = this._envCfg.release;
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

    return this._features;
  }

  features() {
    return this._features;
  }
}

export default AudioEngine;

