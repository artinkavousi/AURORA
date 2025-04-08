import * as THREE from "three/webgpu";
import {Fn, attribute, triNoise3D, time, vec3, float, varying,instanceIndex} from "three/tsl";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

class ParticleRenderer {
    mlsMpmSim = null;
    object = null;
    constructor(mlsMpmSim) {
        this.mlsMpmSim = mlsMpmSim;

        const sphereGeometry = BufferGeometryUtils.mergeVertices(new THREE.IcosahedronGeometry(0.5, 1));
        this.geometry = new THREE.InstancedBufferGeometry().copy(sphereGeometry);
        this.geometry.instanceCount = this.mlsMpmSim.numParticles;


        const positionAttribute = this.mlsMpmSim.positionBuffer.toAttribute();
        const densityAttribute = this.mlsMpmSim.densityBuffer.toAttribute().mul(4);
        this.material = new THREE.MeshStandardNodeMaterial({
            metalness: 0.15,
            roughness: 0.95,
        });
        const color = varying(0, "vColor");
        this.material.positionNode = Fn(() => {
            color.assign(float(1.0).sub(densityAttribute.mul(0.18)).mul(positionAttribute.z.div(64).oneMinus()));
            return attribute("position").mul(densityAttribute.mul(0.1).add(0.5)).add(positionAttribute.mul(vec3(1,1,0.4)));
        })();
        this.material.colorNode = Fn(() => {
            return color.mul(vec3(1,0,1));
        })();
        /*this.material.roughnessNode = Fn(() => {
            return densityAttribute.mul(0.23).oneMinus();
        })();*/
        /*this.material.emissiveNode = Fn(() => {
            return densityAttribute.mul(0.03).mul(vec3(1,0,1));
            const noise = triNoise3D(positionAttribute.mul(0.01), time, 0.2);
            return noise;
        })();*/

        this.object = new THREE.Mesh(this.geometry, this.material);
        this.object.frustumCulled = false;

        const s = (1/60);
        const matrix = new THREE.Matrix4().makeScale(s,s,s);
        matrix.multiply(new THREE.Matrix4().makeTranslation(-32.0, -2, 0));
        const position = new THREE.Vector3();
        const rotation = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        matrix.decompose(position, rotation, scale);
        console.log(position);


        this.object.position.copy(position);
        this.object.scale.copy(scale);
        this.object.castShadow = true;
        this.object.receiveShadow = true;
    }
}
export default ParticleRenderer;