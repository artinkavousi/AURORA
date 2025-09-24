import * as THREE from 'three/webgpu';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { conf } from '../../../src/conf.js';
import BackgroundGeometry from '../../../src/backgroundGeometry.js';
import MlsMpmSimulator from '../../../src/mls-mpm/mlsMpmSimulator.js';
import ParticleRenderer from '../../../src/mls-mpm/particleRenderer.js';
import PointRenderer from '../../../src/mls-mpm/pointRenderer.js';
import GlyphRenderer from '../../../src/mls-mpm/glyphRenderer.js';

const SIM_SCALE = 1 / 64;

export class SimulationModule {
  constructor(renderer, stage) {
    this.renderer = renderer;
    this.stage = stage;

    this.simulator = null;
    this.particleRenderer = null;
    this.pointRenderer = null;
    this.glyphRenderer = null;

    this.background = null;
    this.boundaryMesh = null;

    this._glassSync = null;
    this._shapeSync = null;
  }

  async init() {
    this.simulator = new MlsMpmSimulator(this.renderer);
    await this.simulator.init();

    this.particleRenderer = new ParticleRenderer(this.simulator);
    this.pointRenderer = new PointRenderer(this.simulator);
    this.glyphRenderer = new GlyphRenderer(this.simulator);

    this.stage.scene.add(this.particleRenderer.object);
    this.stage.scene.add(this.pointRenderer.object);
    if (this.glyphRenderer) this.stage.scene.add(this.glyphRenderer.object);

    this.background = new BackgroundGeometry();
    await this.background.init();
    this.stage.scene.add(this.background.object);
    this.boundaryMesh = this.background.glass;

    this._startGlassSync();
    this._startShapeSync();
    this._registerBoundaryUpload();
  }

  _startGlassSync() {
    if (this._glassSync) window.clearInterval(this._glassSync);
    const updateGlass = () => {
      if (!this.background) return;
      this.background.setGlassParams({
        ior: conf.glassIor,
        thickness: conf.glassThickness,
        roughness: conf.glassRoughness,
        dispersion: conf.glassDispersion,
        attenuationDistance: conf.glassAttenuationDistance,
        attenuationColor: conf.glassAttenuationColor,
      });
    };

    updateGlass();
    this._glassSync = window.setInterval(updateGlass, 150);
  }

  _startShapeSync() {
    if (this._shapeSync) window.clearInterval(this._shapeSync);
    const updateShape = () => {
      if (!this.background || !this.simulator) return;

      if (this.background.object) {
        this.background.object.visible = !!conf.boundariesEnabled;
      }

      this.background.setShape(conf.boundaryShape);
      this._syncSimulationSdf();
    };

    updateShape();
    this._shapeSync = window.setInterval(updateShape, 200);
  }

  _syncSimulationSdf() {
    const uniforms = this.simulator?.uniforms;
    if (!uniforms) return;

    const mesh = this.background?.glass;
    const shrink = conf.collisionShrink || 0.98;

    if (conf.boundariesEnabled && conf.boundaryShape === 'dodeca') {
      uniforms.sdfSphere.value = 2;
      if (mesh && mesh.geometry) {
        if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
        const worldRadius = mesh.geometry.boundingSphere.radius;
        const gridRadius = worldRadius / SIM_SCALE;
        uniforms.sdfRadius.value = gridRadius * 0.8 * shrink;
        uniforms.sdfCenter.value.set(
          uniforms.gridSize.value.x * 0.5,
          uniforms.gridSize.value.y * 0.5,
          uniforms.gridSize.value.z * 0.5,
        );
      }
    } else if (conf.boundariesEnabled && conf.boundaryShape === 'sphere') {
      uniforms.sdfSphere.value = 1;
      if (mesh && mesh.geometry) {
        if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
        const worldRadius = mesh.geometry.boundingSphere.radius;
        const gridRadius = worldRadius / SIM_SCALE;
        uniforms.sdfRadius.value = gridRadius * shrink;
        uniforms.sdfCenter.value.set(
          uniforms.gridSize.value.x * 0.5,
          uniforms.gridSize.value.y * 0.5,
          uniforms.gridSize.value.z * 0.5,
        );
      }
    } else {
      if ((conf.borderMode || 'bounce') === 'bounce') {
        uniforms.sdfSphere.value = 0;
      } else {
        uniforms.sdfSphere.value = 3;
      }
    }
  }

  _registerBoundaryUpload() {
    if (!conf.registerBoundaryUpload) return;

    conf.registerBoundaryUpload(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.obj,.glb,.gltf,.fbx,.ply,.stl';

      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;

        try {
          const ext = file.name.split('.').pop().toLowerCase();
          const mesh = await this._loadBoundaryMesh(file, ext);
          if (!mesh) return;

          mesh.castShadow = true;
          mesh.receiveShadow = true;

          if (this.background.glass.parent) {
            this.background.glass.parent.remove(this.background.glass);
          }

          this.background.glass = mesh;
          this.boundaryMesh = mesh;
          this.background.object.add(mesh);

          this._startGlassSync();
          this._syncSimulationSdf();

          conf.boundaryShape = 'sphere';
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[aurora-refined] boundary upload failed', error);
        }
      };

      input.click();
    });
  }

  async _loadBoundaryMesh(file, extension) {
    const ext = extension || '';

    if (ext === 'obj') {
      const text = await file.text();
      const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
      const obj = new OBJLoader().parse(text);
      const geo = BufferGeometryUtils.mergeVertices(obj.children[0].geometry);
      return new THREE.Mesh(geo, this.background.glass.material);
    }

    if (ext === 'gltf' || ext === 'glb') {
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();
      const arrayBuffer = await file.arrayBuffer();
      const gltf = await new Promise((resolve, reject) => loader.parse(arrayBuffer, '', resolve, reject));
      const mesh = gltf.scene.getObjectByProperty('type', 'Mesh') || gltf.scene.children.find((c) => c.isMesh);
      const geo = mesh.geometry;
      return new THREE.Mesh(geo, this.background.glass.material);
    }

    if (ext === 'ply') {
      const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader.js');
      const loader = new PLYLoader();
      const arrayBuffer = await file.arrayBuffer();
      const geometry = loader.parse(arrayBuffer);
      geometry.computeVertexNormals();
      const geo = BufferGeometryUtils.mergeVertices(geometry);
      return new THREE.Mesh(geo, this.background.glass.material);
    }

    if (ext === 'stl') {
      const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
      const loader = new STLLoader();
      const arrayBuffer = await file.arrayBuffer();
      const geometry = loader.parse(arrayBuffer);
      geometry.computeVertexNormals();
      const geo = BufferGeometryUtils.mergeVertices(geometry);
      return new THREE.Mesh(geo, this.background.glass.material);
    }

    alert('Unsupported file type');
    return null;
  }

  setRenderMode(mode) {
    const renderMode = mode || 'surface';
    if (this.particleRenderer) this.particleRenderer.object.visible = renderMode === 'surface';
    if (this.pointRenderer) this.pointRenderer.object.visible = renderMode === 'points';
    if (this.glyphRenderer) this.glyphRenderer.object.visible = renderMode === 'glyphs';
  }

  updateRenderers() {
    if (this.particleRenderer) this.particleRenderer.update();
    if (this.pointRenderer) this.pointRenderer.update();
    if (this.glyphRenderer) this.glyphRenderer.update();
  }

  async updateSimulation(delta, elapsed) {
    if (this.simulator) {
      await this.simulator.update(delta, elapsed);
    }
  }

  setMouseRay(origin, direction, position) {
    if (this.simulator) {
      this.simulator.setMouseRay(origin, direction, position);
    }
  }

  get simulatorUniforms() {
    return this.simulator?.uniforms;
  }

  dispose() {
    if (this._glassSync) window.clearInterval(this._glassSync);
    if (this._shapeSync) window.clearInterval(this._shapeSync);
    this._glassSync = null;
    this._shapeSync = null;
  }
}
