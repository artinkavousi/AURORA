import * as THREE from 'three/webgpu';

import { conf } from '../../../src/conf.js';

const BASE_SIM_SCALE = 1 / 64;

export class InteractionModule {
  constructor(stage, simulation, effects, domElement) {
    this.stage = stage;
    this.simulation = simulation;
    this.effects = effects;
    this.domElement = domElement;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this._onPointerMove = this._onPointerMove.bind(this);
  }

  bind() {
    if (!this.domElement) return;
    this.domElement.addEventListener('pointermove', this._onPointerMove);
  }

  dispose() {
    if (!this.domElement) return;
    this.domElement.removeEventListener('pointermove', this._onPointerMove);
  }

  _onPointerMove(event) {
    if (!this.stage?.camera) return;

    const width = window.innerWidth || this.domElement.clientWidth;
    const height = window.innerHeight || this.domElement.clientHeight;

    this.pointer.x = (event.clientX / width) * 2 - 1;
    this.pointer.y = -(event.clientY / height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.stage.camera);

    const normal = new THREE.Vector3();
    this.stage.camera.getWorldDirection(normal);

    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(0, 0, 0));
    const intersect = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersect);
    if (!intersect) return;

    const worldScale = BASE_SIM_SCALE * (conf.worldScale || 1);
    const zScale = conf.zScale || 0.4;

    const worldToSim = (vector) => {
      const out = vector.clone().divideScalar(worldScale);
      out.z /= zScale;
      out.add(new THREE.Vector3(32, 32, 32));
      return out;
    };

    const originSim = worldToSim(this.raycaster.ray.origin);
    const posSim = worldToSim(intersect);

    const dirSim = this.raycaster.ray.direction.clone();
    dirSim.divideScalar(worldScale);
    dirSim.z /= zScale;
    dirSim.normalize();

    this.simulation.setMouseRay(originSim, dirSim, posSim);

    if (conf.lensEnabled && (conf.lensFocusMode || 'auto') === 'auto') {
      const camSpace = intersect.clone().applyMatrix4(this.stage.camera.matrixWorldInverse);
      const viewDist = Math.abs(camSpace.z);
      this.effects.autoFocus(viewDist);
    }
  }
}
