import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { FlowHud } from './hud/FlowHud';
import { LoadingOverlay } from './overlays/LoadingOverlay';
import { ErrorOverlay } from './overlays/ErrorOverlay';
import { FlowControlBar } from './ui/FlowControlBar';
import { FlowRuntime, type FlowFrameMetrics, type FlowRuntimeStatus } from '../runtime/FlowRuntime';
import { FlowSceneBridge } from './experience/FlowSceneBridge';

interface RuntimeErrorState {
  message: string;
}

export const FlowExperience: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<FlowRuntime | null>(null);
  const [status, setStatus] = useState<FlowRuntimeStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<RuntimeErrorState | null>(null);
  const [metrics, setMetrics] = useState<FlowFrameMetrics | null>(null);
  const latestMetricsRef = useRef<FlowFrameMetrics | null>(null);
  const metricsIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    metricsIntervalRef.current = window.setInterval(() => {
      if (latestMetricsRef.current) {
        setMetrics(latestMetricsRef.current);
      }
    }, 250);

    return () => {
      if (metricsIntervalRef.current !== null) {
        window.clearInterval(metricsIntervalRef.current);
        metricsIntervalRef.current = null;
      }
    };
  }, []);

  const handleRuntimeError = useCallback((runtimeError: Error) => {
    console.error('[FlowExperience] Flow runtime failed', runtimeError);
    setStatus('error');
    setError({ message: runtimeError.message });
    const runtime = runtimeRef.current;
    if (runtime) {
      runtime
        .dispose()
        .catch((disposeError) => {
          console.warn('[FlowExperience] Failed to dispose runtime after error', disposeError);
        });
      runtimeRef.current = null;
    }
  }, []);

  const handleStatusChange = useCallback((nextStatus: FlowRuntimeStatus) => {
    setStatus(nextStatus);
  }, []);

  const handleProgress = useCallback((value: number) => {
    setProgress(value);
  }, []);

  const handleReady = useCallback(() => {
    setProgress(1);
  }, []);

  const handleMetrics = useCallback((frameMetrics: FlowFrameMetrics) => {
    latestMetricsRef.current = frameMetrics;
  }, []);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const runtime = new FlowRuntime({
      container,
      useExternalRenderLoop: true,
      onProgress: handleProgress,
      onReady: handleReady,
      onStatusChange: handleStatusChange,
      onError: handleRuntimeError,
      onMetrics: handleMetrics,
    });

    runtimeRef.current = runtime;

    return () => {
      runtimeRef.current = null;
      runtime.dispose().catch((disposeError) => {
        console.warn('[FlowExperience] Failed to dispose runtime cleanly', disposeError);
      });
    };
  }, [handleProgress, handleReady, handleStatusChange, handleRuntimeError, handleMetrics]);

  const handleToggleDashboard = useCallback(() => {
    runtimeRef.current?.toggleDashboard();
  }, []);

  const handleOpenPanel = useCallback((panelId: string) => {
    runtimeRef.current?.activateDashboardTab(panelId);
  }, []);

  const canvasRendererFactory = useMemo(
    () =>
      function createRenderer(canvas: HTMLCanvasElement) {
        const renderer = new THREE.WebGPURenderer({
          canvas,
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        return renderer;
      },
    [],
  );

  return (
    <div className="flow-experience" ref={containerRef}>
      <Canvas
        className="flow-experience__canvas"
        dpr={[1, 2]}
        gl={canvasRendererFactory}
      >
        {runtimeRef.current && status !== 'error' ? (
          <FlowSceneBridge runtime={runtimeRef.current} onError={handleRuntimeError} />
        ) : null}
      </Canvas>
      <FlowHud progress={progress} status={status} />
      <FlowControlBar
        status={status}
        metrics={metrics}
        onToggleDashboard={handleToggleDashboard}
        onOpenPanel={handleOpenPanel}
      />
      <LoadingOverlay visible={status !== 'ready' && status !== 'error'} progress={progress} />
      <ErrorOverlay visible={status === 'error'} message={error?.message} />
    </div>
  );
};
