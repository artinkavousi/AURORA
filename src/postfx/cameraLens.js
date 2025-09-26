import * as THREE from "three/webgpu";
import { conf } from "../config.js";

// Centralizes camera + lens + DOF control
// - Maps physical-ish lens params -> DOF controls
// - Optionally drives camera FOV from sensor/focal
// - Manages smoothed focus distance updates

export default class LensPipeline {
  constructor(stage, postFX) {
    this.stage = stage;
    this.postFX = postFX;
    this._focus = conf.dofFocus || 1.0;
  }

  // Convert sensor/focal to vertical FOV in degrees
  // Uses sensorWidth as horizontal width; approximate vertical by same (artistic)
  _focalToFov(sensorWidth, focal) {
    const f = Math.max(0.001, focal);
    const sw = Math.max(1e-3, sensorWidth);
    const fovRad = 2 * Math.atan(sw / (2 * f));
    return THREE.MathUtils.radToDeg(fovRad);
  }

  _applyLensToCamera() {
    if (!this.stage || !this.stage.camera) return;
    if (conf.lensEnabled && conf.lensDriveFov) {
      const fov = this._focalToFov(conf.sensorWidth || 36.0, conf.focalLength || 35.0);
      conf.fov = Math.max(10, Math.min(140, fov));
    }
  }

  _mapLensToDOF() {
    if (!conf.lensEnabled) return;
    const crop = 36.0 / Math.max(1e-3, conf.sensorWidth || 36.0);
    const focal = conf.focalLength || 35.0;
    const N = Math.max(0.1, conf.fStop || 2.8);
    const blurProxy = (focal / N) * crop; // larger == stronger blur
    conf.dofAmount = Math.max(0.2, Math.min(2.0, blurProxy * 0.02));
    conf.dofRange = Math.max(0.02, Math.min(2.0, blurProxy * 0.015));
    conf.dofFarBoost = Math.max(1.0, Math.min(3.0, blurProxy * 0.03));
    conf.dofNearBoost = Math.max(0.8, Math.min(2.0, blurProxy * 0.015));
  }

  onPointerFocus(viewDist) {
    // Feed smoothed focus distance to PostFX
    const s = Math.max(0.0, Math.min(1.0, conf.focusSmooth || 0.2));
    this._focus = this._focus * (1 - s) + Math.abs(viewDist) * s;
    if (this.postFX && conf.dofAutoFocus) this.postFX.setFocusDistance(this._focus, 0);
  }

  update() {
    this._applyLensToCamera();
    this._mapLensToDOF();
  }
}

