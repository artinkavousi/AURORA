import * as THREE from "three/webgpu";
import {Fn, attribute, triNoise3D, time, vec3, float, varying,instanceIndex,mix,normalize,cross,mat3,normalLocal,transformNormalToView,mx_hsvtorgb,mrt,uniform} from "three/tsl";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {conf} from "../conf";


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
    bloom = false;
    uniforms = {};
    constructor(mlsMpmSim) {
        this.mlsMpmSim = mlsMpmSim;

        /*
        this.geometry = new THREE.InstancedBufferGeometry();
        const positionBuffer = new THREE.BufferAttribute(new Float32Array(3), 3, false);
        const material = new THREE.PointsNodeMaterial();
        this.geometry.setAttribute('position', positionBuffer);
        this.object = new THREE.Points(this.geometry, material);
        material.positionNode = Fn(() => {
            return this.mlsMpmSim.particleBuffer.element(instanceIndex).get('position').mul(vec3(1,1,0.4));
        })();
        */


        //const sphereGeometry = BufferGeometryUtils.mergeVertices(new THREE.IcosahedronGeometry(0.5, 1));
        const boxGeometry = BufferGeometryUtils.mergeVertices(new THREE.BoxGeometry(7, 7,30), 3.0);
        boxGeometry.attributes.position.array = boxGeometry.attributes.position.array.map(v => v*0.1);
        const roundedBoxGeometry = BufferGeometryUtils.mergeVertices(new RoundedBoxGeometry(0.7,0.7,3,1,0.1));

        this.defaultIndexCount = roundedBoxGeometry.index.count;
        this.shadowIndexCount = boxGeometry.index.count;

        const mergedGeometry = BufferGeometryUtils.mergeGeometries([roundedBoxGeometry, boxGeometry]);

        this.geometry = new THREE.InstancedBufferGeometry().copy(mergedGeometry);
        this.geometry.setDrawRange(0, this.defaultIndexCount);
        this.geometry.instanceCount = this.mlsMpmSim.numParticles;

        const positionAttribute = this.mlsMpmSim.particleBuffer.element(instanceIndex).get('position');
        const colorAttribute = this.mlsMpmSim.particleBuffer.element(instanceIndex).get('color');
        const directionAttribute = this.mlsMpmSim.particleBuffer.element(instanceIndex).get('direction');
        const densityAttribute = this.mlsMpmSim.particleBuffer.element(instanceIndex).get('density');
        this.material = new THREE.MeshPhysicalNodeMaterial({
            metalness: 0.970035,
            roughness: 0.5095,
            iridescence: 1.0,
        });

        this.uniforms.size = uniform(1);
        const vAo = varying(0, "vAo");
        const vNormal = varying(vec3(0), "v_normalView");
        const vColor = varying(vec3(0), "v_color");
        this.material.positionNode = Fn(() => {
            //return attribute("position").xyz.mul(0.1).add(positionAttribute.mul(vec3(1,1,0.4)));
            const mat = calcLookAtMatrix(directionAttribute.xyz);
            vNormal.assign(transformNormalToView(mat.mul(normalLocal)));
            vAo.assign(float(1.0).mul(positionAttribute.z.div(64).pow(2).oneMinus())); //sub(densityAttribute.mul(0.18)).max(0).
            return mat.mul(attribute("position").xyz.mul(this.uniforms.size)).mul(densityAttribute.mul(0.4).add(0.5).clamp(0,1)).mul(1).add(positionAttribute.mul(vec3(1,1,0.4)));
        })();
        this.material.colorNode = colorAttribute;
        this.material.aoNode = vAo;

        this.object = new THREE.Mesh(this.geometry, this.material);
        this.object.frustumCulled = false;

        const s = (1/64);
        const matrix = new THREE.Matrix4().makeScale(s,s,s);
        matrix.multiply(new THREE.Matrix4().makeTranslation(-32.0, -0, 0));
        const position = new THREE.Vector3();
        const rotation = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        matrix.decompose(position, rotation, scale);

        this.object.position.copy(position);
        this.object.scale.copy(scale);
        this.object.castShadow = true;
        this.object.receiveShadow = true;

        this.object.onBeforeShadow = () => { this.geometry.setDrawRange(this.defaultIndexCount, Infinity); }
        this.object.onAfterShadow = () => { this.geometry.setDrawRange(0, this.defaultIndexCount); }
    }
    update() {
        const { particles, bloom, actualSize, roughness, metalness } = conf;
        this.uniforms.size.value = actualSize;
        this.geometry.instanceCount = particles;
        //this.material.roughness = roughness;
        //this.material.metalness = metalness;

        if (bloom !== this.bloom) {
            this.bloom = bloom;
            this.material.mrtNode = bloom ? mrt( {
                bloomIntensity: 1
            } ) : null;
        }
    }
}
export default ParticleRenderer;