import * as THREE from "three/webgpu";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import {Lights} from "./lights";
import hdri from "../assets/autumn_field_puresky_1k.hdr";

import {
    dot, float,
    Fn,
    fog,
    mix,
    normalView,
    normalWorld,
    pmremTexture,
    rangeFogFactor,
    smoothstep,
    varying,
    vec3
} from "three/tsl";
import {conf} from "./conf";
import {Info} from "./info";
import MlsMpmSimulator from "./mls-mpm/mlsMpmSimulator";
import ParticleRenderer from "./mls-mpm/particleRenderer";

const loadHdr = async (file) => {
    const texture = await new Promise(resolve => {
        new RGBELoader().load(file, result => { resolve(result); });
    });
    return texture;
}
const textureLoader = new THREE.TextureLoader();
const loadTexture = (file) => {
    return new Promise(resolve => {
        textureLoader.load(file, texture => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            resolve(texture);
        });
    });
}

class WaterApp {
    renderer = null;

    camera = null;

    scene = null;

    controls = null;

    lights = null;

    constructor(renderer) {
        this.renderer = renderer;
    }

    async init(progressCallback) {
        conf.init();
        this.info = new Info();

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 120);
        this.camera.position.set(32,32, -64);
        this.camera.updateProjectionMatrix()

        this.scene = new THREE.Scene();

        //this.scene.add(new THREE.Mesh(new THREE.BoxGeometry(64,64,64)), new THREE.MeshBasicNodeMaterial());

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(32,32,32);
        this.controls.enableDamping = true;

        await progressCallback(0.1)

        const hdriTexture = await loadHdr(hdri);
        this.scene.backgroundNode = pmremTexture(hdriTexture, normalWorld);
        this.scene.environmentNode = pmremTexture(hdriTexture, normalWorld);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;

        await progressCallback(0.5)

        this.mlsMpmSim = new MlsMpmSimulator(this.renderer, 8192* 8);
        this.particleRenderer = new ParticleRenderer(this.mlsMpmSim);
        this.scene.add(this.particleRenderer.object);

        this.lights = new Lights();
        this.scene.add(this.lights.object);

        await progressCallback(1.0, 100);
    }

    resize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    async update(delta, elapsed) {
        conf.begin();
        this.controls.update(delta);
        this.lights.update(elapsed);

        await this.mlsMpmSim.update(delta,elapsed);

        await this.renderer.renderAsync(this.scene, this.camera);
        conf.end();
    }
}
export default WaterApp;
