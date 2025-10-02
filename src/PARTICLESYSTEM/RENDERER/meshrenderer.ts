/**
 * PARTICLESYSTEM/RENDERER/meshrenderer.ts - Mesh-based particle renderer (clean, no bloom logic)
 * Single responsibility: Render particles as instanced mesh geometry
 */

import * as THREE from "three/webgpu";
import {
  Fn,
  attribute,
  vec3,
  float,
  varying,
  instanceIndex,
  cross,
  mat3,
  normalize,
  normalLocal,
  transformNormalToView,
  uniform,
} from "three/tsl";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MlsMpmSimulator } from '../physic/mls-mpm';

/**
 * Calculate look-at matrix for particle orientation
 */
const calcLookAtMatrix = /*#__PURE__*/ Fn(([target_immutable]: any) => {
  const target = vec3(target_immutable).toVar();
  const rr = vec3(0, 0, 1.0).toVar();
  const ww = vec3(normalize(target)).toVar();
  const uu = vec3(normalize(cross(ww, rr)).negate()).toVar();
  const vv = vec3(normalize(cross(uu, ww)).negate()).toVar();
  return mat3(uu, vv, ww);
}).setLayout({
  name: 'calcLookAtMatrix',
  type: 'mat3',
  inputs: [{ name: 'direction', type: 'vec3' }],
});

/**
 * Create rounded box geometry with beveled edges
 */
function createRoundedBox(width: number, height: number, depth: number, radius: number): THREE.BufferGeometry {
  const box = new THREE.BoxGeometry(width - radius * 2, height - radius * 2, depth - radius * 2);
  const epsilon = Math.min(width, height, depth) * 0.01;
  const positionArray = box.attributes.position.array as Float32Array;
  const normalArray = box.attributes.normal.array as Float32Array;
  const indices = [...box.getIndex()!.array];
  const vertices: any[] = [];
  const posMap: Record<string, any[]> = {};
  const edgeMap: Record<string, any[]> = {};

  for (let i = 0; i < positionArray.length / 3; i++) {
    const oldPosition = new THREE.Vector3(positionArray[i * 3], positionArray[i * 3 + 1], positionArray[i * 3 + 2]);
    positionArray[i * 3 + 0] += normalArray[i * 3 + 0] * radius;
    positionArray[i * 3 + 1] += normalArray[i * 3 + 1] * radius;
    positionArray[i * 3 + 2] += normalArray[i * 3 + 2] * radius;
    const vertex: any = new THREE.Vector3(positionArray[i * 3], positionArray[i * 3 + 1], positionArray[i * 3 + 2]);
    vertex.normal = new THREE.Vector3(normalArray[i * 3], normalArray[i * 3 + 1], normalArray[i * 3 + 2]);
    vertex.id = i;
    vertex.faces = [];
    vertex.posHash = oldPosition.toArray().map(v => Math.round(v / epsilon)).join("_");
    posMap[vertex.posHash] = [...(posMap[vertex.posHash] || []), vertex];
    vertices.push(vertex);
  }

  vertices.forEach(vertex => {
    const face = vertex.normal.toArray().map((v: number) => Math.round(v)).join("_");
    vertex.face = face;
    posMap[vertex.posHash].forEach((vertex: any) => { vertex.faces.push(face); });
  });

  vertices.forEach(vertex => {
    const addVertexToEdgeMap = (vertex: any, entry: string) => {
      edgeMap[entry] = [...(edgeMap[entry] || []), vertex];
    };
    vertex.faces.sort();
    const f0 = vertex.faces[0];
    const f1 = vertex.faces[1];
    const f2 = vertex.faces[2];
    const face = vertex.face;
    if (f0 === face || f1 === face) addVertexToEdgeMap(vertex, f0 + "_" + f1);
    if (f0 === face || f2 === face) addVertexToEdgeMap(vertex, f0 + "_" + f2);
    if (f1 === face || f2 === face) addVertexToEdgeMap(vertex, f1 + "_" + f2);
  });

  const addFace = (v0: any, v1: any, v2: any) => {
    const a = v1.clone().sub(v0);
    const b = v2.clone().sub(v0);
    if (a.cross(b).dot(v0) > 0) {
      indices.push(v0.id, v1.id, v2.id);
    } else {
      indices.push(v0.id, v2.id, v1.id);
    }
  };

  Object.keys(posMap).forEach(key => {
    const vertices = posMap[key];
    if (vertices.length >= 3) {
      addFace(vertices[0], vertices[1], vertices[2]);
    }
  });

  Object.keys(edgeMap).forEach(key => {
    const edgeVertices = edgeMap[key];
    const v0 = edgeVertices[0];
    edgeVertices.sort((v1: any, v2: any) => v1.distanceTo(v0) - v2.distanceTo(v0));
    if (edgeVertices.length >= 3) {
      const slice1 = edgeVertices.slice(0, 3);
      addFace(slice1[0], slice1[1], slice1[2]);
    }
    if (edgeVertices.length >= 4) {
      const slice2 = edgeVertices.slice(1, 4);
      addFace(slice2[0], slice2[1], slice2[2]);
    }
  });

  box.setIndex(indices);
  return box;
}

export interface MeshRendererConfig {
  metalness?: number;
  roughness?: number;
}

/**
 * MeshRenderer - Instanced mesh particle renderer
 * Renders particles as oriented rounded boxes with dynamic coloring
 */
export class MeshRenderer {
  public readonly object: THREE.Mesh;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.MeshStandardNodeMaterial;
  private readonly simulator: MlsMpmSimulator;
  private readonly sizeUniform: any;
  private readonly defaultIndexCount: number;
  private readonly shadowIndexCount: number;

  constructor(simulator: MlsMpmSimulator, config: MeshRendererConfig = {}) {
    this.simulator = simulator;

    const {
      metalness = 0.900,
      roughness = 0.50,
    } = config;

    // Create geometries
    const boxGeometry = BufferGeometryUtils.mergeVertices(new THREE.BoxGeometry(7, 7, 30), 3.0);
    const posArray = boxGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < posArray.length; i++) {
      posArray[i] *= 0.1;
    }
    const roundedBoxGeometry = createRoundedBox(0.7, 0.7, 3, 0.1);

    this.defaultIndexCount = roundedBoxGeometry.index!.count;
    this.shadowIndexCount = boxGeometry.index!.count;

    const mergedGeometry = BufferGeometryUtils.mergeGeometries([roundedBoxGeometry, boxGeometry])!;
    this.geometry = new THREE.InstancedBufferGeometry().copy(mergedGeometry as any);
    this.geometry.setDrawRange(0, this.defaultIndexCount);
    this.geometry.instanceCount = this.simulator.numParticles;

    // Create material
    this.material = new THREE.MeshStandardNodeMaterial({
      metalness,
      roughness,
    });

    this.sizeUniform = uniform(1);
    const vAo = varying(0, "vAo");
    const vNormal = varying(vec3(0), "v_normalView");

    const particle = this.simulator.particleBuffer.element(instanceIndex);

    // Position node
    this.material.positionNode = Fn(() => {
      const particlePosition = particle.get("position");
      const particleDensity = particle.get("density");
      const particleDirection = particle.get("direction");

      const mat = calcLookAtMatrix(particleDirection.xyz);
      vNormal.assign(transformNormalToView(mat.mul(normalLocal)));
      vAo.assign(particlePosition.z.div(64));
      vAo.assign(vAo.mul(vAo).oneMinus());

      return mat
        .mul(attribute("position").xyz.mul(this.sizeUniform))
        .mul(particleDensity.mul(0.4).add(0.5).clamp(0, 1))
        .add(particlePosition.mul(vec3(1, 1, 0.4)));
    })();

    // Color and AO
    this.material.colorNode = particle.get("color");
    this.material.aoNode = vAo;

    // Create mesh
    this.object = new THREE.Mesh(this.geometry, this.material);

    // Shadow callbacks
    this.object.onBeforeShadow = () => {
      this.geometry.setDrawRange(this.defaultIndexCount, Infinity);
    };
    this.object.onAfterShadow = () => {
      this.geometry.setDrawRange(0, this.defaultIndexCount);
    };

    this.object.frustumCulled = false;

    // Transform to simulation space
    const s = 1 / 64;
    this.object.position.set(-32.0 * s, 0, 0);
    this.object.scale.set(s, s, s);
    this.object.castShadow = true;
    this.object.receiveShadow = true;
  }

  /**
   * Update renderer (particle count, size)
   */
  public update(particleCount: number, size: number): void {
    this.geometry.instanceCount = particleCount;
    this.sizeUniform.value = size;
  }

  /**
   * Set bloom intensity via MRT
   * DISABLED: MRT-based bloom was causing outputNode.build errors
   * Bloom should be handled by post-processing pipeline instead
   */
  public setBloomIntensity(intensity: number): void {
    // MRT bloom disabled - this was causing the "outputNode.build is not a function" error
    // The mrtNode expects proper TSL nodes, not plain objects
    // Bloom will be handled by the post-processing system when re-enabled
    
    // Intentionally empty - no MRT manipulation
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

