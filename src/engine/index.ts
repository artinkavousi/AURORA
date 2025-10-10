import * as THREE from 'three/webgpu';
import { defaultConfig, type FlowConfig } from '../config';
import { init as pipelineInit, update as pipelineUpdate, dispose as pipelineDispose, type PipelineInitOptions } from './pipeline';
import type { EngineContext, EngineState, SceneGraphHooks } from './types';
import { ParticleRenderMode } from './renderers';

export interface EngineFactoryOptions {
  renderer: THREE.WebGPURenderer;
  config?: FlowConfig;
  hooks?: SceneGraphHooks;
  state?: Partial<EngineState>;
}

export interface EngineController {
  init: (options?: Partial<PipelineInitOptions>) => Promise<void>;
  update: (delta: number, elapsed: number) => Promise<void>;
  dispose: () => Promise<void>;
  resize: (width: number, height: number) => void;
  getContext: () => EngineContext;
}

export function createEngine(options: EngineFactoryOptions): EngineController {
  const { renderer, hooks = {}, state } = options;
  const config = options.config ?? { ...defaultConfig };
  const initialSize = renderer.getSize(new THREE.Vector2());

  const context: EngineContext = {
    renderer,
    hooks,
    config,
    state: {
      viewport: state?.viewport ?? { width: initialSize.x, height: initialSize.y },
      lastAudioData: state?.lastAudioData ?? null,
      preferredRenderMode:
        state?.preferredRenderMode ?? (config.rendering.points ? ParticleRenderMode.POINT : ParticleRenderMode.MESH),
    },
    modules: {},
    internals: {
      tmpGravity: new THREE.Vector3(),
      tmpMouseOrigin: new THREE.Vector3(),
      tmpMouseDirection: new THREE.Vector3(),
      tmpMouseForce: new THREE.Vector3(),
    },
  };

  return {
    async init(initOptions?: Partial<PipelineInitOptions>) {
      const merged: PipelineInitOptions = {
        renderer,
        config,
        hooks,
        state: { ...context.state, ...initOptions?.state },
      };
      await pipelineInit(context, merged);
    },
    update(delta: number, elapsed: number) {
      return pipelineUpdate(context, { delta, elapsed });
    },
    async dispose() {
      await pipelineDispose(context);
    },
    resize(width: number, height: number) {
      context.state.viewport = { width, height };
      context.modules.physics?.updateViewport(width, height);
      const transform = context.modules.physics?.boundaries.getSimulationTransform();
      if (transform) {
        context.modules.renderers?.manager.setSimulationTransform(transform);
      }
      context.modules.scenery?.resize(width, height);
    },
    getContext() {
      return context;
    },
  };
}

export type { EngineContext } from './types';
