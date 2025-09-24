import Stage from '../../../src/stage.js';
import { conf } from '../../../src/conf.js';

/**
 * EnvironmentModule wraps the legacy Stage orchestration, keeping camera and
 * scene lifecycle isolated from the rest of the application.
 */
export class EnvironmentModule {
  constructor(renderer) {
    this.renderer = renderer;
    this.stage = null;
    this.environmentBase = null;
  }

  async init(progressCallback) {
    this.stage = new Stage(this.renderer);
    await this.stage.init(progressCallback);
    this.environmentBase = { bg: conf.bgRotY, env: conf.envRotY };
  }

  getStage() {
    return this.stage;
  }

  getEnvironmentBase() {
    return this.environmentBase;
  }

  resize(width, height) {
    if (!this.stage) return;
    this.stage.resize(width, height);
  }

  update(delta, elapsed) {
    if (!this.stage) return;
    this.stage.update(delta, elapsed);
  }
}
