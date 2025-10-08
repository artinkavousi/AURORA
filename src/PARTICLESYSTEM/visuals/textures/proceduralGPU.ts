/**
 * PARTICLESYSTEM/visuals/textures/proceduralGPU.ts - GPU-based procedural texture generation
 * Single responsibility: Generate high-quality procedural textures on GPU using TSL
 */

import * as THREE from "three/webgpu";
import { 
  Fn, uniform, vec2, vec3, vec4, float,
  fract, sin, cos, atan2, dot, mul, add, sub, abs, floor, mod,
  length, smoothstep, step, mix, pow, clamp, min as tslMin, max as tslMax
} from "three/tsl";

/**
 * GPU Noise Functions (TSL-based)
 */

/**
 * Hash function for pseudo-random numbers
 */
export const hash2D = /*#__PURE__*/ Fn(([p_immutable]: any) => {
  const p = vec2(p_immutable).toVar();
  const h = dot(p, vec2(127.1, 311.7));
  return fract(sin(h).mul(43758.5453123));
}).setLayout({
  name: 'hash2D',
  type: 'float',
  inputs: [{ name: 'p', type: 'vec2' }],
});

/**
 * 2D Value Noise
 */
export const valueNoise2D = /*#__PURE__*/ Fn(([uv_immutable]: any) => {
  const uv = vec2(uv_immutable).toVar();
  const i = floor(uv).toVar();
  const f = fract(uv).toVar();
  
  // Four corners in 2D of a tile
  const a = hash2D(i);
  const b = hash2D(i.add(vec2(1.0, 0.0)));
  const c = hash2D(i.add(vec2(0.0, 1.0)));
  const d = hash2D(i.add(vec2(1.0, 1.0)));
  
  // Smooth interpolation
  const u = f.mul(f).mul(float(3.0).sub(f.mul(2.0)));
  
  // Mix 4 corners
  return mix(
    mix(a, b, u.x),
    mix(c, d, u.x),
    u.y
  );
}).setLayout({
  name: 'valueNoise2D',
  type: 'float',
  inputs: [{ name: 'uv', type: 'vec2' }],
});

/**
 * Fractal Brownian Motion (FBM) - layered noise
 */
export const fbm = /*#__PURE__*/ Fn(([uv_immutable, octaves_immutable]: any) => {
  const uv = vec2(uv_immutable).toVar();
  const octaves = float(octaves_immutable).toVar();
  
  let value = float(0.0).toVar();
  let amplitude = float(0.5).toVar();
  let frequency = float(1.0).toVar();
  
  // Loop through octaves
  for (let i = 0; i < 6; i++) {
    value.addAssign(amplitude.mul(valueNoise2D(uv.mul(frequency))));
    frequency.mulAssign(2.0);
    amplitude.mulAssign(0.5);
  }
  
  return value;
}).setLayout({
  name: 'fbm',
  type: 'float',
  inputs: [
    { name: 'uv', type: 'vec2' },
    { name: 'octaves', type: 'float' }
  ],
});

/**
 * Voronoi noise (cellular)
 */
export const voronoi = /*#__PURE__*/ Fn(([uv_immutable, scale_immutable]: any) => {
  const uv = vec2(uv_immutable).toVar();
  const scale = float(scale_immutable).toVar();
  const scaledUV = uv.mul(scale);
  
  const i = floor(scaledUV).toVar();
  const f = fract(scaledUV).toVar();
  
  let minDist = float(1.0).toVar();
  
  // Check 3x3 neighborhood
  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      const neighbor = vec2(float(x), float(y));
      const point = hash2D(i.add(neighbor));
      const diff = neighbor.add(point).sub(f);
      const dist = length(diff);
      minDist.assign(tslMin(minDist, dist));
    }
  }
  
  return minDist;
}).setLayout({
  name: 'voronoi',
  type: 'float',
  inputs: [
    { name: 'uv', type: 'vec2' },
    { name: 'scale', type: 'float' }
  ],
});

/**
 * Procedural Texture Generators (TSL-based shaders)
 */

/**
 * Advanced circle/sphere with soft edges and glow
 */
export const circleTexture = /*#__PURE__*/ Fn(([uv_immutable, softness_immutable, glow_immutable]: any) => {
  const uv = vec2(uv_immutable).toVar();
  const softness = float(softness_immutable).toVar();
  const glow = float(glow_immutable).toVar();
  
  const center = vec2(0.5);
  const dist = length(uv.sub(center)).mul(2.0);
  
  // Core circle
  const circle = smoothstep(
    float(1.0).sub(softness),
    float(1.0).add(softness),
    dist
  ).oneMinus();
  
  // Glow halo
  const halo = smoothstep(1.0, float(1.0).add(glow), dist).oneMinus();
  
  // Combine
  const alpha = tslMax(circle, halo.mul(0.3));
  
  return vec4(vec3(1.0), alpha);
}).setLayout({
  name: 'circleTexture',
  type: 'vec4',
  inputs: [
    { name: 'uv', type: 'vec2' },
    { name: 'softness', type: 'float' },
    { name: 'glow', type: 'float' }
  ],
});

/**
 * Spark/star burst with rays
 */
export const sparkTexture = /*#__PURE__*/ Fn(([uv_immutable, rays_immutable, intensity_immutable]: any) => {
  const uv = vec2(uv_immutable).toVar();
  const rays = float(rays_immutable).toVar();
  const intensity = float(intensity_immutable).toVar();
  
  const center = vec2(0.5);
  const dir = uv.sub(center);
  const dist = length(dir).mul(2.0);
  const angle = atan2(dir.y, dir.x);
  
  // Core glow
  const core = smoothstep(1.0, 0.0, dist);
  
  // Rays pattern
  const rayPattern = abs(sin(angle.mul(rays))).pow(2.0);
  const rayGlow = smoothstep(1.0, 0.3, dist).mul(rayPattern);
  
  // Combine
  const alpha = core.add(rayGlow.mul(intensity)).clamp(0.0, 1.0);
  
  return vec4(vec3(1.0), alpha);
}).setLayout({
  name: 'sparkTexture',
  type: 'vec4',
  inputs: [
    { name: 'uv', type: 'vec2' },
    { name: 'rays', type: 'float' },
    { name: 'intensity', type: 'float' }
  ],
});

/**
 * Wispy smoke/cloud texture
 */
export const smokeTexture = /*#__PURE__*/ Fn(([uv_immutable, time_immutable, turbulence_immutable]: any) => {
  const uv = vec2(uv_immutable).toVar();
  const time = float(time_immutable).toVar();
  const turbulence = float(turbulence_immutable).toVar();
  
  // Animated noise layers
  const noise1 = fbm(uv.add(time.mul(0.1)), 5.0);
  const noise2 = fbm(uv.mul(2.0).add(time.mul(0.15)), 4.0);
  const noise3 = fbm(uv.mul(4.0).sub(time.mul(0.2)), 3.0);
  
  // Combine layers with turbulence
  const combined = noise1.mul(0.5)
    .add(noise2.mul(0.3))
    .add(noise3.mul(0.2).mul(turbulence));
  
  // Radial falloff
  const center = vec2(0.5);
  const dist = length(uv.sub(center)).mul(2.0);
  const radialMask = smoothstep(1.0, 0.3, dist);
  
  const alpha = combined.mul(radialMask).clamp(0.0, 1.0);
  
  return vec4(vec3(1.0), alpha);
}).setLayout({
  name: 'smokeTexture',
  type: 'vec4',
  inputs: [
    { name: 'uv', type: 'vec2' },
    { name: 'time', type: 'float' },
    { name: 'turbulence', type: 'float' }
  ],
});

/**
 * Electric/plasma texture
 */
export const electricTexture = /*#__PURE__*/ Fn(([uv_immutable, time_immutable, complexity_immutable]: any) => {
  const uv = vec2(uv_immutable).toVar();
  const time = float(time_immutable).toVar();
  const complexity = float(complexity_immutable).toVar();
  
  // Create electric arc pattern
  const center = vec2(0.5);
  const toCenter = uv.sub(center);
  const dist = length(toCenter).mul(2.0);
  const angle = atan2(toCenter.y, toCenter.x);
  
  // Animated noise for arc distortion
  const noise = fbm(
    uv.mul(complexity).add(time.mul(0.5)),
    4.0
  );
  
  // Arc pattern with distortion
  const arcDist = abs(dist.sub(0.5).add(noise.mul(0.3)));
  const arc = smoothstep(0.3, 0.0, arcDist);
  
  // Branches
  const branchNoise = valueNoise2D(
    vec2(angle.mul(10.0), dist.mul(5.0)).add(time.mul(2.0))
  );
  const branches = step(0.7, branchNoise).mul(arc);
  
  // Core glow
  const core = smoothstep(1.0, 0.0, dist).mul(0.5);
  
  const alpha = tslMax(tslMax(arc, branches), core);
  
  return vec4(vec3(1.0), alpha);
}).setLayout({
  name: 'electricTexture',
  type: 'vec4',
  inputs: [
    { name: 'uv', type: 'vec2' },
    { name: 'time', type: 'float' },
    { name: 'complexity', type: 'float' }
  ],
});

/**
 * Cellular/organic texture
 */
export const cellularTexture = /*#__PURE__*/ Fn(([uv_immutable, scale_immutable, sharpness_immutable]: any) => {
  const uv = vec2(uv_immutable).toVar();
  const scale = float(scale_immutable).toVar();
  const sharpness = float(sharpness_immutable).toVar();
  
  // Voronoi pattern
  const cells = voronoi(uv, scale);
  
  // Edge detection (where cells meet)
  const edges = smoothstep(0.0, 0.1, cells);
  
  // Interior pattern
  const interior = float(1.0).sub(edges);
  
  // Sharpen edges
  const sharpened = pow(interior, sharpness);
  
  // Radial falloff
  const center = vec2(0.5);
  const dist = length(uv.sub(center)).mul(2.0);
  const radialMask = smoothstep(1.0, 0.3, dist);
  
  const alpha = sharpened.mul(radialMask).clamp(0.0, 1.0);
  
  return vec4(vec3(1.0), alpha);
}).setLayout({
  name: 'cellularTexture',
  type: 'vec4',
  inputs: [
    { name: 'uv', type: 'vec2' },
    { name: 'scale', type: 'float' },
    { name: 'sharpness', type: 'float' }
  ],
});

/**
 * Lens flare texture
 */
export const flareTexture = /*#__PURE__*/ Fn(([uv_immutable, rays_immutable, rings_immutable]: any) => {
  const uv = vec2(uv_immutable).toVar();
  const rays = float(rays_immutable).toVar();
  const rings = float(rings_immutable).toVar();
  
  const center = vec2(0.5);
  const toCenter = uv.sub(center);
  const dist = length(toCenter).mul(2.0);
  const angle = atan2(toCenter.y, toCenter.x);
  
  // Core bright spot
  const core = smoothstep(0.3, 0.0, dist);
  
  // Rays
  const rayPattern = cos(angle.mul(rays)).mul(0.5).add(0.5);
  const rayMask = smoothstep(1.0, 0.2, dist);
  const rayGlow = rayPattern.mul(rayMask).mul(0.6);
  
  // Rings
  const ringPattern = sin(dist.mul(rings).mul(Math.PI * 2.0)).mul(0.5).add(0.5);
  const ringMask = smoothstep(1.0, 0.0, dist);
  const ringGlow = ringPattern.mul(ringMask).mul(0.3);
  
  // Combine all elements
  const alpha = core.add(rayGlow).add(ringGlow).clamp(0.0, 1.0);
  
  return vec4(vec3(1.0), alpha);
}).setLayout({
  name: 'flareTexture',
  type: 'vec4',
  inputs: [
    { name: 'uv', type: 'vec2' },
    { name: 'rays', type: 'float' },
    { name: 'rings', type: 'float' }
  ],
});

/**
 * GPU Texture Manager
 * Creates render targets and generates procedural textures on GPU
 */
export class GPUTextureManager {
  private renderer: THREE.WebGPURenderer;
  private textures: Map<string, THREE.Texture> = new Map();
  private renderTargets: Map<string, THREE.RenderTarget> = new Map();
  private time: number = 0;
  
  constructor(renderer: THREE.WebGPURenderer) {
    this.renderer = renderer;
  }
  
  /**
   * Generate a procedural texture on GPU
   */
  generateTexture(
    type: 'circle' | 'spark' | 'smoke' | 'electric' | 'cellular' | 'flare',
    size: number = 512,
    params: Record<string, number> = {}
  ): THREE.Texture {
    const key = `${type}_${size}_${JSON.stringify(params)}`;
    
    // Check cache
    if (this.textures.has(key)) {
      return this.textures.get(key)!;
    }
    
    // Create render target
    const renderTarget = new THREE.RenderTarget(size, size, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: true,
    });
    
    // Create quad material with TSL shader
    const material = new THREE.MeshBasicNodeMaterial();
    
    // Set shader based on type
    switch (type) {
      case 'circle':
        material.colorNode = circleTexture(
          /* uv */ null as any, // Will use built-in uv
          float(params.softness ?? 0.3),
          float(params.glow ?? 0.5)
        );
        break;
      
      case 'spark':
        material.colorNode = sparkTexture(
          null as any,
          float(params.rays ?? 6),
          float(params.intensity ?? 0.8)
        );
        break;
      
      case 'smoke':
        material.colorNode = smokeTexture(
          null as any,
          float(this.time),
          float(params.turbulence ?? 1.0)
        );
        break;
      
      case 'electric':
        material.colorNode = electricTexture(
          null as any,
          float(this.time),
          float(params.complexity ?? 2.0)
        );
        break;
      
      case 'cellular':
        material.colorNode = cellularTexture(
          null as any,
          float(params.scale ?? 8.0),
          float(params.sharpness ?? 2.0)
        );
        break;
      
      case 'flare':
        material.colorNode = flareTexture(
          null as any,
          float(params.rays ?? 8),
          float(params.rings ?? 4)
        );
        break;
    }
    
    material.transparent = true;
    material.side = THREE.DoubleSide;
    
    // Create quad and render
    const quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      material
    );
    
    const scene = new THREE.Scene();
    scene.add(quad);
    
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Render to target
    const oldTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(renderTarget);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(oldTarget);
    
    // Cache texture
    const texture = renderTarget.texture;
    this.textures.set(key, texture);
    this.renderTargets.set(key, renderTarget);
    
    // Cleanup
    material.dispose();
    quad.geometry.dispose();
    
    return texture;
  }
  
  /**
   * Update time for animated textures
   */
  update(deltaTime: number): void {
    this.time += deltaTime;
  }
  
  /**
   * Dispose all textures
   */
  dispose(): void {
    this.textures.forEach(texture => texture.dispose());
    this.renderTargets.forEach(rt => rt.dispose());
    this.textures.clear();
    this.renderTargets.clear();
  }
}

