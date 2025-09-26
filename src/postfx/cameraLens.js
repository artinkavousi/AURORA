import * as THREE from "three/webgpu";
import { postFxState } from "./state.js";

// Centralizes camera + lens + DOF control
// - Maps physical-ish lens params -> DOF controls
// - Optionally drives camera FOV from sensor/focal
// - Manages smoothed focus distance updates

export default class LensPipeline {
  constructor(stage, postFX) {
    this.stage = stage;
    this.postFX = postFX;
    this.state = postFxState;
    this._focus = this.state.value.dof.focus || 1.0;
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
    const { lens } = this.state.value;
    if (lens.enabled && lens.driveFov) {
      const fov = this._focalToFov(lens.sensorWidth || 36.0, lens.focalLength || 35.0);
      this.state.set(['camera', 'fov'], THREE.MathUtils.clamp(fov, 10, 140));
    }
  }

  _mapLensToDOF() {
    const { lens } = this.state.value;
    if (!lens.enabled) return;
    const crop = 36.0 / Math.max(1e-3, lens.sensorWidth || 36.0);
    const focal = lens.focalLength || 35.0;
    const N = Math.max(0.1, lens.fStop || 2.8);
    const blurProxy = (focal / N) * crop; // larger == stronger blur
    this.state.set(['dof', 'amount'], THREE.MathUtils.clamp(blurProxy * 0.02, 0.2, 2.0));
    this.state.set(['dof', 'range'], THREE.MathUtils.clamp(blurProxy * 0.015, 0.02, 2.0));
    this.state.set(['dof', 'farBoost'], THREE.MathUtils.clamp(blurProxy * 0.03, 1.0, 3.0));
    this.state.set(['dof', 'nearBoost'], THREE.MathUtils.clamp(blurProxy * 0.015, 0.8, 2.0));
  }

  onPointerFocus(viewDist) {
    // Feed smoothed focus distance to PostFX
    const { lens, dof } = this.state.value;
    const s = THREE.MathUtils.clamp(lens.focusSmooth ?? 0.2, 0.0, 1.0);
    this._focus = this._focus * (1 - s) + Math.abs(viewDist) * s;
    if (this.postFX && dof.autoFocus) this.postFX.setFocusDistance(this._focus, 0);
  }

  update() {
    this._applyLensToCamera();
    this._mapLensToDOF();
  }
}

