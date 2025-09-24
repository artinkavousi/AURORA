import { conf } from '../../../src/conf.js';

export class PerformanceGovernor {
  constructor() {
    this._accumulator = 0;
    this._frames = 0;
    this._fps = 60;
    this._lastAdjust = 0;
  }

  update(delta) {
    this._accumulator += delta;
    this._frames += 1;

    if (this._accumulator >= 0.5) {
      const fps = this._frames / this._accumulator;
      this._fps = this._fps * 0.6 + fps * 0.4;
      this._accumulator = 0;
      this._frames = 0;
    }

    if (!conf.autoPerf) return;

    const now = performance.now() / 1000;
    if (now - this._lastAdjust <= 1.2) return;

    if (this._fps < conf.perfMinFps && conf.particles > 4096) {
      conf.particles = Math.max(4096, conf.particles - conf.perfStep);
      conf.updateParams();
      if (conf.gui) conf.gui.refresh();
      this._lastAdjust = now;
      return;
    }

    if (this._fps > conf.perfMaxFps && conf.particles + conf.perfStep <= conf.maxParticles) {
      conf.particles = Math.min(conf.maxParticles, conf.particles + conf.perfStep);
      conf.updateParams();
      if (conf.gui) conf.gui.refresh();
      this._lastAdjust = now;
    }
  }
}
