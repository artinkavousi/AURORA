import * as THREE from "three/webgpu";
import {Fn, attribute, triNoise3D, time, vec3, float, varying,instanceIndex,mix,normalize,cross,mat3,normalLocal,transformNormalToView,mx_hsvtorgb} from "three/tsl";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';


export const calcLookAtMatrix = /*#__PURE__*/ Fn( ( [ target_immutable ] ) => {

    const target = vec3( target_immutable ).toVar();
    const rr = vec3( 0,0,1.0 ).toVar();
    const ww = vec3( normalize( target ) ).toVar();
    const uu = vec3( normalize( cross( ww, rr ) ).negate() ).toVar();
    const vv = vec3( normalize( cross( uu, ww ) ).negate() ).toVar();

    return mat3( uu, vv, ww );

} ).setLayout( {
    name: 'calcLookAtMatrix',
    type: 'mat3',
    inputs: [
        { name: 'direction', type: 'vec3' },
    ]
} );


class ParticleRenderer {
    mlsMpmSim = null;
    object = null;
    constructor(mlsMpmSim) {
        this.mlsMpmSim = mlsMpmSim;

        const sphereGeometry = BufferGeometryUtils.mergeVertices(new THREE.IcosahedronGeometry(0.5, 1));
        const boxGeometry = new THREE.BoxGeometry(1,1,4);
        const roundedBoxGeometry = new RoundedBoxGeometry(1,1,4,1,0.2);
        this.geometry = new THREE.InstancedBufferGeometry().copy(roundedBoxGeometry);
        this.geometry.instanceCount = this.mlsMpmSim.numParticles;


        const positionAttribute = this.mlsMpmSim.positionBuffer.toAttribute();
        const velocityAttribute = this.mlsMpmSim.velocityBuffer.toAttribute();
        const directionAttribute = this.mlsMpmSim.directionBuffer.toAttribute();
        const densityAttribute = this.mlsMpmSim.densityBuffer.toAttribute().mul(4);
        this.material = new THREE.MeshStandardNodeMaterial({
            metalness: 0.0035,
            roughness: 0.95,
        });
        const vAo = varying(0, "vAo");
        const vNormal = varying(vec3(0), "v_normalView");
        const vColor = varying(vec3(0), "v_color");
        this.material.positionNode = Fn(() => {
            //const color = mix(vec3(0.9,0.9,0.1), vec3(velocityAttribute.length().mul(0.5),0,1), densityAttribute.sub(1.0).mul(0.25).clamp(0,1));
            const color = mx_hsvtorgb(vec3(densityAttribute.mul(0.05).add(time.mul(0.05)), velocityAttribute.length().mul(0.5).clamp(0,1).mul(0.3).add(0.7), 0.7 ));
            vColor.assign(color);
            const mat = calcLookAtMatrix(directionAttribute.xyz);
            vNormal.assign(transformNormalToView(mat.mul(normalLocal)));
            vAo.assign(float(1.0).mul(positionAttribute.z.div(64).pow(2).oneMinus())); //sub(densityAttribute.mul(0.18)).max(0).
            return mat.mul(attribute("position").xyz).mul(densityAttribute.mul(0.1).add(0.5).clamp(0,1)).mul(1).add(positionAttribute.mul(vec3(1,1,0.4)));
        })();
        this.material.colorNode = vColor;
        this.material.aoNode = vAo;
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

        const s = (1/64);
        const matrix = new THREE.Matrix4().makeScale(s,s,s);
        matrix.multiply(new THREE.Matrix4().makeTranslation(-32.0, -0, 0));
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