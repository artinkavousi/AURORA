import * as THREE from "three/webgpu";
import {Fn, attribute, triNoise3D, time, vec3, float} from "three/tsl";

class ParticleRenderer {
    mlsMpmSim = null;
    object = null;
    constructor(mlsMpmSim) {
        this.mlsMpmSim = mlsMpmSim;

        const geometry = new THREE.IcosahedronGeometry(0.5, 2);
        this.geometry = new THREE.InstancedBufferGeometry().copy(geometry);
        this.geometry.instanceCount = this.mlsMpmSim.numParticles;


        const positionAttribute = this.mlsMpmSim.positionBuffer.toAttribute();
        const densityAttribute = this.mlsMpmSim.densityBuffer.toAttribute();
        this.material = new THREE.MeshStandardMaterial({
            metalness: 0.15,
            roughness: 0.95,
        });
        this.material.positionNode = Fn(() => {
            return attribute("position").mul(densityAttribute.mul(0.2)).add(positionAttribute.mul(vec3(1,1,0.4)));
        })();
        this.material.colorNode = Fn(() => {
            return float(1.0).sub(densityAttribute.mul(0.18)).mul(positionAttribute.z.div(64).oneMinus());
        })();
        /*this.material.emissiveNode = Fn(() => {
            return densityAttribute.mul(0.0);
            const noise = triNoise3D(positionAttribute.mul(0.01), time, 0.2);
            return noise;
        })();*/

        this.object = new THREE.Mesh(this.geometry, this.material);
        this.object.frustumCulled = false;
        this.object.position.set(-32,-32,0);
    }
}
export default ParticleRenderer;