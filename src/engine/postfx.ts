import type * as THREE from 'three/webgpu';
import { PostFX } from '../POSTFX/postfx';
import type { FlowConfig } from '../config';
import type { ScenerySystem } from './scenery';

export interface PostFXSystem {
  instance: PostFX;
  render: () => Promise<void>;
  dispose: () => void;
}

export interface PostFXSetupOptions {
  renderer: THREE.WebGPURenderer;
  config: FlowConfig;
  scenery: ScenerySystem;
}

export async function setupPostFX({ renderer, config, scenery }: PostFXSetupOptions): Promise<PostFXSystem> {
  const postFX = new PostFX(renderer, scenery.instance.scene, scenery.instance.camera, {
    bloom: config.bloom,
    radialFocus: config.radialFocus,
    radialCA: config.radialCA,
  });
  await postFX.init();
  scenery.instance.disableToneMappingForPostFX();

  return {
    instance: postFX,
    render: () => postFX.render(),
    dispose: () => postFX.dispose(),
  };
}
