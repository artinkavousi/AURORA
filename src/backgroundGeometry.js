import * as THREE from "three/webgpu";
import {
    Fn,
    attribute,
    triNoise3D,
    time,
    positionLocal,
    smoothstep,
    vec3,
    pow,
    min,
    mat3,
    mrt,
    texture,
    uv,
    positionWorld,
    lights,
    reflector, positionView
} from "three/tsl";
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
//import { RectAreaLightTexturesLib } from 'three/examples/jsm/lights/RectAreaLightTexturesLib.js';
import boxObj from './assets/boxSlightlySmooth.obj';

import normalMapFile from './assets/concrete_0016_normal_opengl_1k.png';
import aoMapFile from './assets/concrete_0016_ao_1k.jpg';
import colorMapFile from './assets/concrete_0016_color_1k.jpg';
import roughnessMapFile from './assets/concrete_0016_roughness_1k.jpg';

/*import metalNormalMapFile from '../assets/metal_0056_normal_opengl_1k.png';
import metalAoMapFile from '../assets/metal_0056_ao_1k.jpg';
import metalColorMapFile from '../assets/metal_0056_color_1k.jpg';
import metalRoughnessMapFile from '../assets/metal_0056_roughness_1k.jpg';
import metalMetalnessMapFile from '../assets/metal_0056_metallic_1k.jpg';*/

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
        /*material.mrtNode = mrt( {
            bloomIntensity: 0
        } );*/
        material.aoNode = Fn(() => {
            return texture(aoMap, uv()).mul(positionWorld.z.div(0.4).mul(0.95).oneMinus());
        })();
        material.colorNode = Fn(() => {
            return texture(map, uv()).mul(positionWorld.z.div(0.4).mul(0.5).oneMinus().mul(0.7));
        })();


        this.box = new THREE.Mesh(geometry, material);
        this.box.rotation.set(0, Math.PI, 0);
        this.box.position.set(0, -0.05, 0.22);
        this.box.castShadow = true;
        this.box.receiveShadow = true;

        this.object = new THREE.Object3D();
        //this.object.add(this.box);

        /*
        const mnormalMap = await loadTexture(metalNormalMapFile);
        const maoMap = await loadTexture(metalAoMapFile);
        const mmap = await loadTexture(metalColorMapFile);
        const mroughnessMap = await loadTexture(metalRoughnessMapFile);
        const mmetalnessMap = await loadTexture(metalMetalnessMapFile);

        const planeMaterial = new THREE.MeshStandardNodeMaterial({
            normalMap: mnormalMap,
            aoMap: maoMap,
            map: mmap,
            roughnessMap: mroughnessMap,
            metalnessMap: mmetalnessMap,
            normalScale: new THREE.Vector3(6.0, 6.0),
            //transparent: true,
           // lights: false,
        });
        planeMaterial.receivedShadowNode = Fn( ( [shadow]) => {
            return vec3(0);
        });

        const planeGeometry = new THREE.PlaneGeometry(10, 10);
        const planeUvArray = planeGeometry.attributes.uv.array;
        for (let i=0; i<planeUvArray.length; i++) {
            planeUvArray[i] *= 10;
        }
        this.plane = new THREE.Mesh(planeGeometry, planeMaterial);
        this.plane.rotation.set(-Math.PI*0.5,0,0);
        this.plane.position.set(0, -0.05, 0);
        this.plane.receiveShadow = true;
        this.plane.renderOrder = 20;
        this.object.add(this.plane);*/


        /*THREE.RectAreaLightNode.setLTC( RectAreaLightTexturesLib.init() );
        const rectLight1 = new THREE.RectAreaLight( 0xff0000, 1, 1, 1.1 );
        rectLight1.position.set( 0, 0.55, 0.0 );
        this.object.add( rectLight1 );*/


        /*const reflection = reflector( { resolution: 0.5 } ); // 0.5 is half of the rendering view
        reflection.target.rotateX( - Math.PI / 2 );
        reflection.target.position.setY(-0.05);
        this.object.add(reflection.target);
        const floorNormalOffset = texture( mnormalMap, uv() ).xy.mul( 2 ).sub( 1 ).mul( .5 ).mul(texture( mroughnessMap, uv() ));
        reflection.uvNode = reflection.uvNode.add( floorNormalOffset );
        planeMaterial.colorNode = texture( mmap, uv() ).add( reflection.mul(texture( mmetalnessMap, uv() )).mul(1.0) );*/

    }
}
export default BackgroundGeometry;