import * as THREE from 'three/webgpu';
import { FlowApp, type ProgressCallback, type FlowFrameMetrics } from '../../APP';

export type { FlowFrameMetrics };

export type FlowRuntimeStatus = 'idle' | 'initializing' | 'ready' | 'error';

export interface FlowRuntimeOptions {
  readonly canvas?: HTMLCanvasElement;
  readonly container: HTMLElement;
  readonly renderer?: THREE.WebGPURenderer;
  readonly useExternalRenderLoop?: boolean;
  readonly onProgress?: (value: number) => void;
  readonly onReady?: () => void;
  readonly onError?: (error: Error) => void;
  readonly onStatusChange?: (status: FlowRuntimeStatus) => void;
  readonly onMetrics?: (metrics: FlowFrameMetrics) => void;
}

export class FlowRuntime {
  private renderer: THREE.WebGPURenderer | null = null;
  private app: FlowApp | null = null;
  private frameHandle: number | null = null;
  private readonly clock = new THREE.Clock();
  private readonly options: FlowRuntimeOptions;
  private readonly container: HTMLElement;
  private resizeObserver: ResizeObserver | null = null;
  private started = false;
  private disposed = false;
  private latestMetrics: FlowFrameMetrics | null = null;
  private readonly externalRenderLoop: boolean;
  private accumulatedElapsed = 0;
  private canvas: HTMLCanvasElement | null = null;
  private ownsRenderer = true;

  constructor(options: FlowRuntimeOptions) {
    this.options = options;
    this.container = options.container;
    this.externalRenderLoop = Boolean(options.useExternalRenderLoop);
    if (options.canvas) {
      this.canvas = options.canvas;
    }
    if (options.renderer) {
      this.attachRenderer(options.renderer, options.canvas ?? null, false);
    }
  }

  public async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.started = true;
    this.disposed = false;

    try {
      if (!('gpu' in navigator)) {
        throw new Error('WebGPU is not supported on this device.');
      }

      this.options.onStatusChange?.('initializing');

      if (!this.renderer) {
        if (!this.canvas) {
          throw new Error('A canvas element is required to initialize the Flow runtime.');
        }

        const renderer = new THREE.WebGPURenderer({
          canvas: this.canvas,
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        });

        renderer.setPixelRatio(window.devicePixelRatio);
        this.applySize(renderer);
        await renderer.init();

        if (!renderer.backend || !(renderer.backend as any).isWebGPUBackend) {
          throw new Error('WebGPU backend failed to initialize.');
        }

        this.renderer = renderer;
        this.ownsRenderer = true;
      } else {
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.applySize(this.renderer);
        if (typeof this.renderer.init === 'function') {
          await this.renderer.init();
        }

        if (!this.renderer.backend || !(this.renderer.backend as any).isWebGPUBackend) {
          throw new Error('WebGPU backend failed to initialize.');
        }
      }

      const renderer = this.renderer;
      const app = new FlowApp(renderer);
      this.app = app;

      const progressCallback: ProgressCallback = async (fraction, delay = 0) => {
        this.options.onProgress?.(fraction);
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      };

      await app.init(progressCallback);
      if (!this.externalRenderLoop) {
        this.attachResizeListener();
      }
      this.options.onProgress?.(1);
      this.options.onStatusChange?.('ready');
      this.options.onReady?.();

      if (!this.externalRenderLoop) {
        this.frameHandle = requestAnimationFrame(this.step);
      }
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.options.onStatusChange?.('error');
      this.options.onError?.(normalizedError);
      await this.disposeInternal();
      throw normalizedError;
    }
  }

  private readonly step = async () => {
    if (!this.renderer || !this.app || this.disposed) {
      return;
    }

    try {
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime();
      await this.advanceFrame(delta, elapsed);
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      this.options.onStatusChange?.('error');
      this.options.onError?.(normalizedError);
      await this.disposeInternal();
      return;
    }

    this.frameHandle = requestAnimationFrame(this.step);
  };

  private attachResizeListener(): void {
    const handleResize = () => {
      if (!this.renderer || !this.app) {
        return;
      }

      this.applySize(this.renderer);
      const { clientWidth, clientHeight } = this.container;
      if (clientWidth > 0 && clientHeight > 0) {
        this.app.resize(clientWidth, clientHeight);
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(handleResize);
      this.resizeObserver.observe(this.container);
    }

    const cleanup = () => {
      window.removeEventListener('resize', handleResize);
      this.resizeObserver?.disconnect();
    };

    this.disposeCleanup = cleanup;
  }

  private disposeCleanup: (() => void) | null = null;

  private applySize(renderer: THREE.WebGPURenderer): void {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    if (width === 0 || height === 0) {
      return;
    }

    renderer.setSize(width, height, false);
  }

  public async dispose(): Promise<void> {
    await this.disposeInternal();
    this.options.onStatusChange?.('idle');
  }

  private async disposeInternal(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle);
      this.frameHandle = null;
    }

    if (this.disposeCleanup) {
      this.disposeCleanup();
      this.disposeCleanup = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.app) {
      this.app.dispose();
      this.app = null;
    }

    if (this.renderer && this.ownsRenderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    this.started = false;
    this.latestMetrics = null;
    this.accumulatedElapsed = 0;
  }

  public toggleDashboard(): void {
    this.app?.toggleDashboard();
  }

  public activateDashboardTab(id: string): void {
    this.app?.activateDashboardTab(id);
  }

  public getMetrics(): FlowFrameMetrics | null {
    return this.latestMetrics ?? this.app?.getFrameMetrics() ?? null;
  }

  public attachRenderer(
    renderer: THREE.WebGPURenderer,
    canvas: HTMLCanvasElement | null = null,
    ownsRenderer: boolean = false,
  ): void {
    this.renderer = renderer;
    this.ownsRenderer = ownsRenderer;
    if (canvas) {
      this.canvas = canvas;
    } else if (!this.canvas) {
      this.canvas = renderer.domElement;
    }
  }

  public async advanceFrame(delta: number, elapsedOverride?: number): Promise<void> {
    if (!this.app || !this.renderer || this.disposed) {
      return;
    }

    const elapsed = elapsedOverride ?? (this.accumulatedElapsed += delta);
    const metrics = await this.app.update(delta, elapsed);
    this.latestMetrics = metrics;
    this.options.onMetrics?.(metrics);
  }

  public resize(width: number, height: number): void {
    if (!this.renderer || !this.app) {
      return;
    }

    this.renderer.setSize(width, height, false);
    this.app.resize(width, height);
  }
}
