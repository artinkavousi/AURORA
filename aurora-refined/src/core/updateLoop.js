import * as THREE from 'three/webgpu';

/**
 * UpdateLoop standardises the animation frame lifecycle for the application.
 * It exposes start/stop controls and guarantees delta/elapsed timestamps that
 * mirror the behaviour of Three.js' legacy clock usage.
 */
export class UpdateLoop {
  constructor(step) {
    this.step = step;
    this.clock = new THREE.Clock();
    this.running = false;
    this._frameHandle = null;
    this._tick = this._tick.bind(this);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this._frameHandle = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    if (this._frameHandle) {
      cancelAnimationFrame(this._frameHandle);
      this._frameHandle = null;
    }
  }

  async _tick() {
    if (!this.running) return;

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    try {
      await this.step(delta, elapsed);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[aurora-refined] update loop error', error);
      this.stop();
      return;
    }

    this._frameHandle = requestAnimationFrame(this._tick);
  }
}
