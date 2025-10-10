import * as THREE from 'three/webgpu';
import type { FlowConfig } from '../config';
import type { AudioData } from '../AUDIO/soundreactivity';
import type { ParticleRenderMode } from './renderers';

export interface SceneGraphHooks {
  /** Called when the primary scene is ready. */
  onSceneReady?: (scene: THREE.Scene) => void;
  /** Called when the primary camera is created. */
  onCameraReady?: (camera: THREE.PerspectiveCamera) => void;
  /**
   * Optional DOM element to wire pointer events/controls against.
   * When omitted, the renderer's DOM element should be used.
   */
  getDomElement?: () => HTMLElement | null;
  /** Attach the given object to the render graph. */
  addObject?: (object: THREE.Object3D) => void;
  /** Remove the given object from the render graph. */
  removeObject?: (object: THREE.Object3D) => void;
}

export interface EngineState {
  viewport: { width: number; height: number };
  lastAudioData: AudioData | null;
  preferredRenderMode: ParticleRenderMode;
}

export interface EngineContext {
  renderer: THREE.WebGPURenderer;
  hooks: SceneGraphHooks;
  state: EngineState;
  config: FlowConfig;
  modules: Partial<EngineModules>;
  internals: EngineInternals;
}

export interface EngineModules {
  scenery: import('./scenery').ScenerySystem;
  postfx: import('./postfx').PostFXSystem;
  physics: import('./physics').PhysicsSystem;
  renderers: import('./renderers').RendererSystem;
  audio?: import('./audio').AudioSystem;
}

export interface EngineInternals {
  tmpGravity: THREE.Vector3;
  tmpMouseOrigin: THREE.Vector3;
  tmpMouseDirection: THREE.Vector3;
  tmpMouseForce: THREE.Vector3;
}

export interface EngineUpdateParams {
  delta: number;
  elapsed: number;
}
