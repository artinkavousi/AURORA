import * as THREE from "three/webgpu";
import { conf } from "../conf";

// Manages physical lens parameters and maps them onto the post processing pipeline.
// Handles FOV driving, focus smoothing and automatic pointer focus integration.
export default class LensSystem {
  constructor(stage, postFX) {
    this.stage = stage;
    this.postFX = postFX;
    this._focus = conf.lensFocusDistance || 1.0;
  }

  static _focalToFov(sensorSizeMm, focalLengthMm) {
    const focal = Math.max(0.1, focalLengthMm || 35.0);
    const sensor = Math.max(0.1, sensorSizeMm || 36.0);
    const fovRad = 2 * Math.atan((sensor * 0.5) / focal);
    return THREE.MathUtils.radToDeg(fovRad);
  }

  _clampFocus(distance) {
    const min = Math.max(0.01, conf.lensFocusNear || 0.1);
    const max = Math.max(min + 0.01, conf.lensFocusFar || 8.0);
    return THREE.MathUtils.clamp(distance, min, max);
  }

  focusFromPointer(viewDistance) {
    if (!conf.lensEnabled) return;
    if ((conf.lensFocusMode || "auto") !== "auto") return;
    const smoothing = THREE.MathUtils.clamp(conf.lensFocusSmoothing ?? 0.2, 0.0, 1.0);
    const target = this._clampFocus(Math.abs(viewDistance));
    this._focus = THREE.MathUtils.lerp(this._focus, target, smoothing);
    conf.lensFocusReadout = this._focus;
  }

  update() {
    if (!this.postFX) return;

    if (!conf.lensEnabled) {
      this.postFX.setLensState({ enabled: false });
      conf.lensFocusReadout = conf.lensFocusDistance;
      return;
    }

    const mode = conf.lensFocusMode || "auto";
    if (mode === "manual") {
      this._focus = this._clampFocus(conf.lensFocusDistance || 1.0);
      conf.lensFocusDistance = this._focus;
    }
    this._focus = this._clampFocus(this._focus);
    conf.lensFocusReadout = this._focus;

    if (conf.lensDriveFov && this.stage?.camera) {
      const fov = LensSystem._focalToFov(conf.lensSensorSize, conf.lensFocalLength);
      conf.fov = THREE.MathUtils.clamp(fov, 20, 120);
    }

    const focusDistance = this._focus;
    const focusRange = Math.max(0.01, conf.lensFocusRange || 0.12);
    const sensor = Math.max(4.0, conf.lensSensorSize || 36.0);
    const focal = Math.max(1.0, conf.lensFocalLength || 35.0);
    const aperture = Math.max(0.7, conf.lensAperture || 2.4);
    const baseScale = Math.max(0.05, conf.lensBokehScale || 1.0);
    const crop = 36.0 / sensor;
    const apertureTerm = (focal / aperture) * crop;
    const bokehScale = THREE.MathUtils.clamp(baseScale * (0.6 + apertureTerm * 0.02), 0.05, 3.5);

    this.postFX.setLensState({
      enabled: true,
      focusDistance,
      focusRange,
      bokehScale,
      anamorphic: conf.lensAnamorphic || 0.0,
      resolutionScale: conf.lensResolutionScale || 0.85,
    });
  }
}
