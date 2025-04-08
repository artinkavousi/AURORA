import * as THREE from "three/webgpu";
import {Fn, attribute, triNoise3D, time, positionLocal, smoothstep, vec3, pow, min, mat3} from "three/tsl";
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import boxObj from 'bundle-text:../assets/boxSlightlySmooth.obj';

import normalMapFile from '../assets/concrete_0016_normal_opengl_2k.png';
import aoMapFile from '../assets/concrete_0016_ao_2k.jpg';
import colorMapFile from '../assets/concrete_0016_color_2k.jpg';
import roughnessMapFile from '../assets/concrete_0016_roughness_2k.jpg';

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

class BackgroundGeometry {
    object = null;
    constructor() {
    }
    async init() {
        console.log(boxObj);
        const objectRaw = new OBJLoader().parse(boxObj);
        const geometry = BufferGeometryUtils.mergeVertices(objectRaw.children[0].geometry);
        const uvArray = geometry.attributes.uv.array;
        for (let i=0; i<uvArray.length; i++) {
            uvArray[i] *= 10;
        }


        const normalMap = await loadTexture(normalMapFile);
        const aoMap = await loadTexture(aoMapFile);
        const map = await loadTexture(colorMapFile);
        const roughnessMap = await loadTexture(roughnessMapFile);

        const material = new THREE.MeshStandardNodeMaterial({
            roughness: 0.9,
            metalness:0.0,
            normalScale: new THREE.Vector3(2.0, 2.0),
            normalMap,
            aoMap,
            map,
            roughnessMap,

        });

        /*material.colorNode = Fn(() => {
           const p = positionLocal.mul(0.004).add(vec3(0,0,positionLocal.x.mul(0.004).mul(0.2)));

            const matrix = mat3(-2/3,-1/3,2/3, 3/3,-2/3,1/3, 1/3,2/3,2/3);
            const water = vec3(p.mul(2)).toVar();
            //water.x.sub(positionWorld.y);
            //water.addAssign(sin(time.mul(0.2)));
            water.assign(matrix.mul(water));
            const a = vec3(0.5).sub(water.fract()).length().toVar();
            water.assign(matrix.mul(water));
            a.assign(min(a,vec3(0.5).sub(water.fract()).length()));

            return pow(a,4);
           const noise = triNoise3D(p,time,0.2)
           return noise.add(smoothstep(0.35, 0.4, noise).mul(0.3)).mul(1.0).oneMinus(); //noise.mul(smoothstep(noise,0.3,0.8).oneMinus());

        })();*/

        this.object = new THREE.Mesh(geometry, material);
        this.object.rotation.set(0, Math.PI, 0);
        this.object.position.set(0, -0.05, 0.22);
        this.object.castShadow = true;
        this.object.receiveShadow = true;
    }
}
export default BackgroundGeometry;