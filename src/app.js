import * as THREE from "three/webgpu";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import {conf} from "./conf";
import {Info} from "./info";
import MlsMpmSimulator from "./mls-mpm/mlsMpmSimulator";
import ParticleRenderer from "./mls-mpm/particleRenderer";
import GlyphRenderer from "./mls-mpm/glyphRenderer";
import BackgroundGeometry from "./backgroundGeometry";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import PointRenderer from "./mls-mpm/pointRenderer.js";
import Stage from "./stage";
import AudioEngine from "./audio/audioEngine";
import AudioRouter from "./audio/router";
import AudioPanel from "./ui/audioPanel";
import LensSystem from "./lens/LensSystem";
// PostFX pipeline is initialized dynamically inside init

// Stage handles camera/scene/environment & controls

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

class App {
    renderer = null;

    stage = null;
    audio = null;
    lens = null;
    router = null;
    audioPanel = null;

    constructor(renderer) {
        this.renderer = renderer;
    }

    async init(progressCallback) {
        this.info = new Info();
        conf.init();

        this.stage = new Stage(this.renderer);
        await this.stage.init(progressCallback);
        // Store environment rotation base for audio sway
        this._envBase = { bg: conf.bgRotY, env: conf.envRotY };

        await progressCallback(0.5)

        this.mlsMpmSim = new MlsMpmSimulator(this.renderer);
        await this.mlsMpmSim.init();
        this.particleRenderer = new ParticleRenderer(this.mlsMpmSim);
        this.stage.scene.add(this.particleRenderer.object);
        this.pointRenderer = new PointRenderer(this.mlsMpmSim);
        this.stage.scene.add(this.pointRenderer.object);
        this.glyphRenderer = new GlyphRenderer(this.mlsMpmSim);
        this.stage.scene.add(this.glyphRenderer.object);

        // Stage already adds lights

        const backgroundGeometry = new BackgroundGeometry();
        await backgroundGeometry.init();
        this.stage.scene.add(backgroundGeometry.object);
        this.boundary = backgroundGeometry;

        // Wire glass parameter live updates
        const updateGlass = () => {
            backgroundGeometry.setGlassParams({
                ior: conf.glassIor,
                thickness: conf.glassThickness,
                roughness: conf.glassRoughness,
                dispersion: conf.glassDispersion,
                attenuationDistance: conf.glassAttenuationDistance,
                attenuationColor: conf.glassAttenuationColor,
            });
        };
        updateGlass();
        // Set up a small interval to reflect control changes without heavy listeners
        this._glassSync = setInterval(updateGlass, 150);

        // Shape sync
        const updateShape = () => {
            // Toggle all boundary visuals
            if (this.boundary && this.boundary.object) {
                this.boundary.object.visible = !!conf.boundariesEnabled;
            }
            backgroundGeometry.setShape(conf.boundaryShape);
            // Bind collision mode: 0 box, 1 sphere, 2 dodeca planes
            if (conf.boundariesEnabled && conf.boundaryShape === 'dodeca') {
                this.mlsMpmSim.uniforms.sdfSphere.value = 2; // dodeca planes
                const mesh = backgroundGeometry.glass;
                if (mesh && mesh.geometry) {
                    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
                    const worldR = mesh.geometry.boundingSphere.radius;
                    const s = 1/64; // simulation to world scale used in renderers
                    const gridR = worldR / s;
                    const shrink = conf.collisionShrink || 0.98;
                    this.mlsMpmSim.uniforms.sdfRadius.value = gridR * 0.8 * shrink; // inradius with shrink
                    this.mlsMpmSim.uniforms.sdfCenter.value.set(
                        this.mlsMpmSim.uniforms.gridSize.value.x * 0.5,
                        this.mlsMpmSim.uniforms.gridSize.value.y * 0.5,
                        this.mlsMpmSim.uniforms.gridSize.value.z * 0.5,
                    );
                }
            } else if (conf.boundariesEnabled && conf.boundaryShape === 'sphere') {
                this.mlsMpmSim.uniforms.sdfSphere.value = 1; // sphere
                const mesh = backgroundGeometry.glass;
                if (mesh && mesh.geometry) {
                    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
                    const worldR = mesh.geometry.boundingSphere.radius;
                    const s = 1/64;
                    const gridR = worldR / s;
                    const shrink = conf.collisionShrink || 0.98;
                    this.mlsMpmSim.uniforms.sdfRadius.value = gridR * shrink;
                    this.mlsMpmSim.uniforms.sdfCenter.value.set(
                        this.mlsMpmSim.uniforms.gridSize.value.x * 0.5,
                        this.mlsMpmSim.uniforms.gridSize.value.y * 0.5,
                        this.mlsMpmSim.uniforms.gridSize.value.z * 0.5,
                    );
                }
            } else {
                // Boundaries disabled: choose world border behavior
                if ((conf.borderMode || 'bounce') === 'bounce') {
                    this.mlsMpmSim.uniforms.sdfSphere.value = 0; // use box wall bounce at grid edges
                } else {
                    this.mlsMpmSim.uniforms.sdfSphere.value = 3; // wrap: no collisions
                }
            }
        };
        updateShape();
        this._shapeSync = setInterval(updateShape, 200);

        // Upload hook: open file input and load as boundary mesh
        conf.registerBoundaryUpload(() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.obj,.glb,.gltf,.fbx,.ply,.stl';
            input.onchange = async () => {
                const file = input.files && input.files[0];
                if (!file) return;
                try {
                    const ext = file.name.split('.').pop().toLowerCase();
                    let newMesh = null;
                    if (ext === 'obj') {
                        const text = await file.text();
                        const obj = new (await import('three/examples/jsm/loaders/OBJLoader.js')).OBJLoader().parse(text);
                        const geo = BufferGeometryUtils.mergeVertices(obj.children[0].geometry);
                        newMesh = new THREE.Mesh(geo, this.boundary.glass.material);
                    } else if (ext === 'gltf' || ext === 'glb') {
                        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
                        const loader = new GLTFLoader();
                        const arrayBuffer = await file.arrayBuffer();
                        const gltf = await new Promise((resolve, reject) => loader.parse(arrayBuffer, '', resolve, reject));
                        const mesh = gltf.scene.getObjectByProperty('type', 'Mesh') || gltf.scene.children.find(c => c.isMesh);
                        const geo = mesh.geometry;
                        newMesh = new THREE.Mesh(geo, this.boundary.glass.material);
                    } else if (ext === 'ply') {
                        const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader.js');
                        const loader = new PLYLoader();
                        const arrayBuffer = await file.arrayBuffer();
                        const geometry = loader.parse(arrayBuffer);
                        geometry.computeVertexNormals();
                        const geo = BufferGeometryUtils.mergeVertices(geometry);
                        newMesh = new THREE.Mesh(geo, this.boundary.glass.material);
                    } else if (ext === 'stl') {
                        const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
                        const loader = new STLLoader();
                        const arrayBuffer = await file.arrayBuffer();
                        const geometry = loader.parse(arrayBuffer);
                        geometry.computeVertexNormals();
                        const geo = BufferGeometryUtils.mergeVertices(geometry);
                        newMesh = new THREE.Mesh(geo, this.boundary.glass.material);
                    } else {
                        alert('Unsupported file type');
                        return;
                    }
                    if (newMesh) {
                        if (this.boundary.glass.parent) this.boundary.glass.parent.remove(this.boundary.glass);
                        newMesh.castShadow = true;
                        newMesh.receiveShadow = true;
                        this.boundary.glass = newMesh;
                        this.boundary.object.add(newMesh);
                        updateGlass();
                        // After custom upload, switch to sphere SDF bound and recompute radius
                        conf.boundaryShape = 'sphere';
                        updateShape();
                    }
                } catch (e) {
                    console.error(e);
                }
            };
            input.click();
        });
        // Old audio upload hook removed; AudioPanel handles file input

        // Audio engine + router + dedicated panel
        this.audio = new AudioEngine();
        this.router = new AudioRouter();
        // Register router with conf so presets can include routing
        if (conf.registerRouter) conf.registerRouter(this.router);
        this.audioPanel = new AudioPanel(this.audio, conf, this.router);
        this.audioPanel.init('bottom-right');

        this.postFX = new (await import('./postfx')).default(this.renderer);
        await this.postFX.init(this.stage);
        this.lens = new LensSystem(this.stage, this.postFX);


        this.raycaster = new THREE.Raycaster();
        this.renderer.domElement.addEventListener("pointermove", (event) => { this.onMouseMove(event); });

        await progressCallback(1.0, 100);
    }

    resize(width, height) {
        this.stage.resize(width, height);
        if (this.postFX) this.postFX.resize(width, height);
    }

    onMouseMove(event) {
        const pointer = new THREE.Vector2();
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        const camera = this.stage.camera;
        this.raycaster.setFromCamera(pointer, camera);

        const s = (1/64) * (conf.worldScale || 1);
        const zScale = conf.zScale || 0.4;
        // Domain center at world origin
        const centerWorld = new THREE.Vector3(0, 0, 0);
        const normal = new THREE.Vector3();
        camera.getWorldDirection(normal);
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, centerWorld);
        const intersect = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, intersect);
        if (!intersect) return;

        // Map world -> simulation-projected space used in compute (0..64, with z compressed by zScale)
        const worldToSimProjected = (v) => {
            const out = v.clone().divideScalar(s);
            out.z /= zScale;
            out.add(new THREE.Vector3(32,32,32));
            return out;
        };
        const originSim = worldToSimProjected(this.raycaster.ray.origin);
        const posSim = worldToSimProjected(intersect);
        const dirSim = this.raycaster.ray.direction.clone();
        dirSim.divideScalar(s); dirSim.z /= zScale; dirSim.normalize();

        this.mlsMpmSim.setMouseRay(originSim, dirSim, posSim);

        // Auto focus DOF to pointer via LensPipeline
        if (conf.lensEnabled && (conf.lensFocusMode || 'auto') === 'auto' && this.lens) {
            const camSpace = intersect.clone().applyMatrix4(camera.matrixWorldInverse);
            const viewDist = Math.abs(camSpace.z);
            this.lens.focusFromPointer(viewDist);
        }
    }


    async update(delta, elapsed) {
        conf.begin();

        // Render mode visibility control
        const mode = conf.renderMode || 'surface';
        this.particleRenderer.object.visible = (mode === 'surface');
        this.pointRenderer.object.visible = (mode === 'points');
        if (this.glyphRenderer) this.glyphRenderer.object.visible = (mode === 'glyphs');

        this.stage.update(delta, elapsed);
        this.particleRenderer.update();
        this.pointRenderer.update();
        if (this.glyphRenderer) this.glyphRenderer.update();

        // Audio update and mapping
        if (conf.audioEnabled) {
            try {
                // Start mic if needed
                if (!this._audioStarted) {
                    if (conf.audioSource === 'mic') {
                        await this.audio.connectMic();
                    }
                    this._audioStarted = true;
                }
                this.audio.setSmoothing(conf.audioAttack, conf.audioRelease);
                const f = this.audio.update(delta);
                // Normalize features and apply user gains
                const sens = conf.audioSensitivity;
                const clamp01 = (v) => clamp(v ?? 0, 0, 1);
                const bassGain = conf.audioBassGain * sens;
                const midGain = conf.audioMidGain * sens;
                const trebleGain = conf.audioTrebleGain * sens;
                conf._audioLevel = clamp01(f.level * sens);
                conf._audioBeat = clamp01(f.beat * conf.audioBeatBoost);
                conf._audioBass = clamp01(f.bass * bassGain);
                conf._audioMid = clamp01(f.mid * midGain);
                conf._audioTreble = clamp01(f.treble * trebleGain);
                conf._audioSub = clamp01((f.sub ?? f.bass) * bassGain);
                conf._audioLowMid = clamp01((f.lowMid ?? f.mid) * midGain);
                conf._audioHighMid = clamp01((f.highMid ?? f.mid) * midGain);
                conf._audioPresence = clamp01((f.presence ?? f.treble) * trebleGain);
                conf._audioAir = clamp01((f.air ?? f.treble) * trebleGain);
                conf._audioFlux = Math.max(0, f.flux || 0);
                conf._audioFluxNorm = clamp01(f.fluxNorm ?? 0);
                conf._audioDynamics = clamp01(f.dynamics ?? 0);
                conf._audioCrest = clamp01(f.crest ?? 0);
                conf._audioRms = clamp01(f.rms ?? 0);
                conf._audioLoudness = clamp01(f.loudness ?? f.level ?? 0);
                conf._audioTilt = clamp01(f.tilt ?? 0.5);
                conf._audioStereo = clamp01(f.stereo ?? 0.5);
                conf._audioStereoSigned = Math.max(-1, Math.min(1, f.stereoSigned ?? 0));
                conf._audioStereoWidth = clamp01(f.stereoWidth ?? 0);
                conf._audioBeatConfidence = clamp01(f.beatConfidence ?? 0);
                conf._audioDominant = clamp01(f.dominant ?? 0);
                conf._audioTempoPhase = f.tempoPhase01 || 0.0;
                conf._audioTempoBpm = f.tempoBpm || 0.0;
                conf._audioTempoConf = f.tempoConf || 0.0;
                conf._audioTempoNorm = clamp01(f.tempoNorm ?? 0);
                // Router applies mappings and environment sway
                this.router.apply({
                    level: conf._audioLevel,
                    beat: conf._audioBeat,
                    bass: conf._audioBass,
                    mid: conf._audioMid,
                    treble: conf._audioTreble,
                    sub: conf._audioSub,
                    lowMid: conf._audioLowMid,
                    highMid: conf._audioHighMid,
                    presence: conf._audioPresence,
                    air: conf._audioAir,
                    centroid: f.centroid,
                    tilt: f.tilt,
                    tiltSigned: f.tiltSigned,
                    flux: f.flux,
                    fluxNorm: f.fluxNorm,
                    fluxBass: f.fluxBass,
                    fluxMid: f.fluxMid,
                    fluxTreble: f.fluxTreble,
                    beatConfidence: f.beatConfidence,
                    rms: f.rms,
                    loudness: f.loudness,
                    crest: f.crest,
                    dynamics: f.dynamics,
                    stereo: f.stereo,
                    stereoSigned: f.stereoSigned,
                    stereoWidth: f.stereoWidth,
                    dominant: f.dominant,
                    tempoBpm: f.tempoBpm,
                    tempoPhase01: f.tempoPhase01,
                    tempoConf: f.tempoConf,
                    tempoNorm: f.tempoNorm,
                    tempoPulse: f.tempoPulse,
                    bandEnergies: f.bandEnergies,
                }, conf, elapsed, this._envBase);
            } catch (e) { /* noop */ }
        } else {
            conf._audioLevel = conf._audioBeat = conf._audioBass = conf._audioMid = conf._audioTreble = 0;
            conf._audioSub = conf._audioLowMid = conf._audioHighMid = conf._audioPresence = conf._audioAir = 0;
            conf._audioFlux = conf._audioFluxNorm = conf._audioDynamics = conf._audioCrest = 0;
            conf._audioRms = conf._audioLoudness = 0;
            conf._audioTilt = 0.5;
            conf._audioStereo = 0.5; conf._audioStereoSigned = 0; conf._audioStereoWidth = 0;
            conf._audioDominant = 0; conf._audioBeatConfidence = 0;
            conf._audioTempoPhase = conf._audioTempoBpm = 0;
            conf._audioTempoConf = conf._audioTempoNorm = 0;
            // Reset environment rotations when audio off
            if (this._envBase) { conf.bgRotY = this._envBase.bg; conf.envRotY = this._envBase.env; }
        }

        await this.mlsMpmSim.update(delta,elapsed);

        // Sync post FX from control panel and motion direction
        if (this.postFX) this.postFX.updateFromConf(conf);
        if (this.lens) this.lens.update();
        if (!this._prevCamPos) this._prevCamPos = this.stage.camera.position.clone();
        if (this.postFX) this.postFX.updateMotionDirection(this.stage.camera, this._prevCamPos);
        this._prevCamPos.copy(this.stage.camera.position);

        if (conf.postFxEnabled && this.postFX) {
            await this.postFX.renderAsync();
        } else {
            await this.renderer.renderAsync(this.stage.scene, this.stage.camera);
        }

        conf.end();

        // Auto performance governor: adapt particle count
        if (!this._perf) this._perf = { t: 0, frames: 0, fps: 60, lastAdjust: 0 };
        this._perf.t += delta;
        this._perf.frames += 1;
        if (this._perf.t >= 0.5) {
            const fps = this._perf.frames / this._perf.t;
            // simple smoothing
            this._perf.fps = this._perf.fps * 0.6 + fps * 0.4;
            this._perf.t = 0;
            this._perf.frames = 0;
        }
        if (conf.autoPerf) {
            const now = performance.now() / 1000;
            if (now - this._perf.lastAdjust > 1.2) {
                if (this._perf.fps < conf.perfMinFps && conf.particles > 4096) {
                    conf.particles = Math.max(4096, conf.particles - conf.perfStep);
                    conf.updateParams();
                    if (conf.gui) conf.gui.refresh();
                    this._perf.lastAdjust = now;
                } else if (this._perf.fps > conf.perfMaxFps && conf.particles + conf.perfStep <= conf.maxParticles) {
                    conf.particles = Math.min(conf.maxParticles, conf.particles + conf.perfStep);
                    conf.updateParams();
                    if (conf.gui) conf.gui.refresh();
                    this._perf.lastAdjust = now;
                }
            }
        }
    }
}
export default App;
