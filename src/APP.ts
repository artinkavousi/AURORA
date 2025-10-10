import type * as THREE from 'three/webgpu';
import { createEngine, type EngineController } from './engine';
import type { ProgressCallback } from './APP/types';
import { defaultConfig, type FlowConfig } from './config';

export class FlowApp {
  private engine: EngineController;
  private config: FlowConfig;

  constructor(private readonly renderer: THREE.WebGPURenderer, config: FlowConfig = { ...defaultConfig }) {
    this.config = config;
    this.engine = createEngine({ renderer: this.renderer, config: this.config });
  }

  public async init(progressCallback?: ProgressCallback): Promise<void> {
    if (progressCallback) {
      await progressCallback(0);
    }
    await this.engine.init();
    if (progressCallback) {
      await progressCallback(1);
    }
  }

  public update(delta: number, elapsed: number): Promise<void> {
    return this.engine.update(delta, elapsed);
  }

  public resize(width: number, height: number): void {
    this.engine.resize(width, height);
  }

  public dispose(): Promise<void> {
    return this.engine.dispose();
  }
}

export type { ProgressCallback } from './APP/types';
