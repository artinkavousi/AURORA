import * as THREE from "three/webgpu";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import {Lights} from "./lights";
import hdri from "../assets/autumn_field_puresky_1k.hdr";

import {
    dot, float,
    Fn,
    fog, mat2,
    mix, mrt,
    normalView,
    normalWorld, output, pass,
    pmremTexture,
    rangeFogFactor,
    smoothstep,
    varying,
    vec3, vec4
} from "three/tsl";
import {conf} from "./conf";
import {Info} from "./info";
import MlsMpmSimulator from "./mls-mpm/mlsMpmSimulator";
import ParticleRenderer from "./mls-mpm/particleRenderer";
import BackgroundGeometry from "./backgroundGeometry";
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';

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

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 5);
        //this.camera.position.set(32,32, -64);
        this.camera.position.set(0, 0.5, -1);
        this.camera.updateProjectionMatrix()

        this.scene = new THREE.Scene();

        //this.scene.add(new THREE.Mesh(new THREE.BoxGeometry(64,64,64)), new THREE.MeshBasicNodeMaterial());

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0,0.5,0);
        this.controls.enableDamping = true;
        this.controls.enablePan = false;

        await progressCallback(0.1)

        const hdriTexture = await loadHdr(hdri);

        const bgNode = Fn(() => {
            const angle = -2.15;
            const s = Math.sin(angle), c = Math.cos(angle);
            const matrix = mat2(c,-s,s,c);
            const uvt = normalWorld.toVar();
            uvt.xz.mulAssign(matrix);
            return pmremTexture(hdriTexture, uvt).mul(0.51);
        })();

        this.scene.backgroundNode = bgNode.mul(2);
        this.scene.environmentNode = bgNode;
        //this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.66;

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        await progressCallback(0.5)

        this.mlsMpmSim = new MlsMpmSimulator(this.renderer);
        this.particleRenderer = new ParticleRenderer(this.mlsMpmSim);
        this.scene.add(this.particleRenderer.object);

        this.lights = new Lights();
        this.scene.add(this.lights.object);

        const backgroundGeometry = new BackgroundGeometry();
        await backgroundGeometry.init();
        this.scene.add(backgroundGeometry.object);


        const scenePass = pass(this.scene, this.camera);
        scenePass.setMRT( mrt( {
            output,
            bloomIntensity: float( 0 ) // default bloom intensity
        } ) );
        const outputPass = scenePass.getTextureNode();
        const bloomIntensityPass = scenePass.getTextureNode( 'bloomIntensity' );
        const bloomPass = bloom( outputPass.mul( bloomIntensityPass ) );
        const postProcessing = new THREE.PostProcessing(this.renderer);
        postProcessing.outputColorTransform = false;
        //postProcessing.outputNode = vec4(outputPass.rgb, 1).add( vec4(bloomPass.mul(bloomIntensityPass.sign().oneMinus()).rgb, 0.0) ).renderOutput();
        //postProcessing.outputNode = outputPass.renderOutput();
        //(1-2b)*a*a + 2ba
        postProcessing.outputNode = Fn(() => {
            const a = outputPass.rgb.clamp(0,1).toVar();
            const b = bloomPass.rgb.clamp(0,1).mul(bloomIntensityPass.r.sign().oneMinus()).toVar();
            //return vec4(vec3(1).sub(b).sub(b).mul(a).mul(a).mul(0.0),1.0);
            //return b;
            //return a.div(b.oneMinus().max(0.0001)).clamp(0,1);
            return vec4(vec3(1).sub(b).sub(b).mul(a).mul(a).add(b.mul(a).mul(2)).clamp(0,1),1.0);
        })().renderOutput();

        this.postProcessing = postProcessing;
        this.bloomPass = bloomPass;
        this.bloomPass.threshold.value = 0.001;
        this.bloomPass.strength.value = 0.94;
        this.bloomPass.radius.value = 0.8;


        this.raycaster = new THREE.Raycaster();
        this.plane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.2);
        this.renderer.domElement.addEventListener("mousemove", (event) => { this.onMouseMove(event); });

        await progressCallback(1.0, 100);
    }

    resize(width, height) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    onMouseMove(event) {
        const pointer = new THREE.Vector2();
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.raycaster.setFromCamera(pointer, this.camera);
        const intersect = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.plane, intersect);
        if (intersect) {
            this.mlsMpmSim.setMouseRay(this.raycaster.ray.origin, this.raycaster.ray.direction, intersect);
        }
    }


    async update(delta, elapsed) {
        conf.begin();
        this.controls.update(delta);
        this.lights.update(elapsed);
        this.particleRenderer.update();

        await this.mlsMpmSim.update(delta,elapsed);

        if (conf.bloom) {
            await this.postProcessing.renderAsync();
        } else {
            await this.renderer.renderAsync(this.scene, this.camera);
        }

        conf.end();
    }
}
export default WaterApp;
