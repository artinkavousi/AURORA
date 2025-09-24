import PostFX from '../../../src/postfx.js';
import LensSystem from '../../../src/lens/LensSystem.js';

export class EffectsModule {
  constructor(renderer) {
    this.renderer = renderer;
    this.postFX = null;
    this.lens = null;
    this._previousCameraPosition = null;
  }

  async init(stage) {
    this.postFX = new PostFX(this.renderer);
    await this.postFX.init(stage);
    this.lens = new LensSystem(stage, this.postFX);
    this._previousCameraPosition = stage.camera.position.clone();
  }

  resize(width, height) {
    if (this.postFX) this.postFX.resize(width, height);
  }

  updateFromConfig(conf) {
    if (this.postFX) this.postFX.updateFromConf(conf);
    if (this.lens) this.lens.update();
  }

  updateMotion(stage) {
    if (!this.postFX || !stage?.camera) return;
    if (!this._previousCameraPosition) {
      this._previousCameraPosition = stage.camera.position.clone();
    }

    this.postFX.updateMotionDirection(stage.camera, this._previousCameraPosition);
    this._previousCameraPosition.copy(stage.camera.position);
  }

  async render(stage, conf) {
    if (conf.postFxEnabled && this.postFX) {
      await this.postFX.renderAsync();
      return;
    }

    await this.renderer.renderAsync(stage.scene, stage.camera);
  }

  autoFocus(distance) {
    if (this.lens && distance != null) {
      this.lens.focusFromPointer(distance);
    }
  }
}
