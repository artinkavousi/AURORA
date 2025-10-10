import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState, type FC } from 'react';
import * as THREE from 'three/webgpu';
import { FlowApp, type ProgressCallback } from '../APP';

THREE.ColorManagement.enabled = true;

interface SimulationHostProps {
  renderer: THREE.WebGPURenderer;
  onProgress: ProgressCallback;
  onReady: () => void;
  onError: (message: string) => void;
}

const SimulationHost: FC<SimulationHostProps> = ({ renderer, onProgress, onReady, onError }) => {
  const appRef = useRef<FlowApp | null>(null);
  const initializedRef = useRef(false);
  const updatePromiseRef = useRef<Promise<void> | null>(null);
  const failedRef = useRef(false);
  const size = useThree((state) => state.size);

  useEffect(() => {
    failedRef.current = false;
    const app = new FlowApp(renderer);
    appRef.current = app;
    let cancelled = false;

    const bootstrap = async (): Promise<void> => {
      try {
        await app.init(onProgress);
        if (cancelled) {
          return;
        }

        initializedRef.current = true;
        app.resize(size.width, size.height);
        onReady();
      } catch (error) {
        if (cancelled) {
          return;
        }

        failedRef.current = true;
        const message = error instanceof Error ? error.message : String(error);
        onError(message);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
      initializedRef.current = false;
      updatePromiseRef.current = null;
      app.dispose();
      appRef.current = null;
    };
  }, [renderer, onProgress, onReady, onError]);

  useEffect(() => {
    if (!initializedRef.current || !appRef.current) {
      return;
    }

    appRef.current.resize(size.width, size.height);
  }, [size.width, size.height]);

  useFrame((state, delta) => {
    const app = appRef.current;
    if (!app || !initializedRef.current || failedRef.current) {
      return;
    }

    if (updatePromiseRef.current) {
      return;
    }

    const elapsed = state.clock.getElapsedTime();
    const updatePromise = app.update(delta, elapsed);
    updatePromiseRef.current = updatePromise;

    updatePromise
      .catch((error) => {
        failedRef.current = true;
        const message = error instanceof Error ? error.message : String(error);
        onError(message);
      })
      .finally(() => {
        updatePromiseRef.current = null;
      });
  });

  return null;
};

export const CanvasHost: FC = () => {
  const [renderer, setRenderer] = useState<THREE.WebGPURenderer | null>(null);
  const [progress, setProgress] = useState(0);
  const [veilVisible, setVeilVisible] = useState(true);
  const [progressVisible, setProgressVisible] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleProgress = useCallback<ProgressCallback>((fraction, delay = 0) => {
    const clamped = Math.min(Math.max(fraction, 0), 1);
    setProgress(clamped);

    return new Promise<void>((resolve) => {
      if (delay > 0) {
        window.setTimeout(resolve, delay);
      } else {
        resolve();
      }
    });
  }, []);

  const handleReady = useCallback(() => {
    setProgress(1);
    setProgressVisible(false);
    setVeilVisible(false);
    setErrorMessage(null);
  }, []);

  const handleError = useCallback((message: string) => {
    const formatted = message || 'An unexpected error occurred';
    console.error('💥 Application error:', formatted);
    setErrorMessage(`Error: ${formatted}`);
    setProgressVisible(false);
    setVeilVisible(true);
  }, []);

  useEffect(() => {
    let disposed = false;
    let rendererInstance: THREE.WebGPURenderer | null = null;

    setVeilVisible(true);
    setProgressVisible(true);
    setProgress(0);
    setErrorMessage(null);

    if (!navigator.gpu) {
      handleError('Your device does not support WebGPU.');
      return undefined;
    }

    const setupRenderer = async (): Promise<void> => {
      try {
        const webgpuRenderer = new THREE.WebGPURenderer();
        rendererInstance = webgpuRenderer;
        webgpuRenderer.setPixelRatio(window.devicePixelRatio);
        webgpuRenderer.setSize(window.innerWidth, window.innerHeight);
        await webgpuRenderer.init();

        if (!webgpuRenderer.backend.isWebGPUBackend) {
          throw new Error("Couldn't initialize WebGPU. Make sure WebGPU is supported by your Browser!");
        }

        if (disposed) {
          webgpuRenderer.dispose();
          return;
        }

        // React Three Fiber maintains its own render loop. Override the default
        // renderer.render to a no-op so R3F doesn't clear the frame after the
        // headless engine finishes rendering via renderAsync.
        webgpuRenderer.render = (() => {
          /* noop - FlowApp drives rendering */
        }) as typeof webgpuRenderer.render;

        setRenderer(webgpuRenderer);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!disposed) {
          handleError(message);
        }

        if (rendererInstance) {
          rendererInstance.dispose();
          rendererInstance = null;
        }
      }
    };

    void setupRenderer();

    return () => {
      disposed = true;
      setRenderer(null);
      if (rendererInstance) {
        rendererInstance.dispose();
        rendererInstance = null;
      }
    };
  }, [handleError]);

  const progressWidth = useMemo(() => `${Math.round(progress * 200)}px`, [progress]);

  return (
    <div id="container">
      {renderer ? (
        <Canvas gl={renderer} dpr={[1, window.devicePixelRatio]}>
          <SimulationHost renderer={renderer} onProgress={handleProgress} onReady={handleReady} onError={handleError} />
        </Canvas>
      ) : null}

      <div
        id="veil"
        style={{
          opacity: veilVisible ? 1 : 0,
        }}
      >
        <div
          id="progress-bar"
          style={{
            opacity: progressVisible ? 1 : 0,
          }}
        >
          <div id="progress" style={{ width: progressWidth }} />
        </div>
        <div
          id="error"
          style={{
            visibility: errorMessage ? 'visible' : 'hidden',
            pointerEvents: errorMessage ? 'auto' : 'none',
          }}
        >
          {errorMessage}
        </div>
      </div>
    </div>
  );
};
