import * as THREE from "three/webgpu";
import {Fn, attribute} from "three/tsl";

class ParticleRenderer {
    mlsMpmSim = null;
    object = null;
    constructor(mlsMpmSim) {
        this.mlsMpmSim = mlsMpmSim;

        const geometry = new THREE.IcosahedronGeometry(0.5, 0);
        this.geometry = new THREE.InstancedBufferGeometry().copy(geometry);
        this.geometry.instanceCount = this.mlsMpmSim.numParticles;


        const positionAttribute = this.mlsMpmSim.positionBuffer.toAttribute();
        this.material = new THREE.MeshStandardMaterial();
        this.material.positionNode = Fn(() => {
            return attribute("position").add(positionAttribute);
        })();

        this.object = new THREE.Mesh(this.geometry, this.material);
        this.object.frustumCulled = false;
    }
}
export default ParticleRenderer;