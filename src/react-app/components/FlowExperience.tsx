import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlowHud } from './hud/FlowHud';
import { LoadingOverlay } from './overlays/LoadingOverlay';
import { ErrorOverlay } from './overlays/ErrorOverlay';
import { FlowControlBar } from './ui/FlowControlBar';
import { FlowRuntime, type FlowFrameMetrics, type FlowRuntimeStatus } from '../runtime/FlowRuntime';

interface RuntimeErrorState {
  message: string;
}

export const FlowExperience: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;

    if (!container || !canvas) {
      return;
    }

    let mounted = true;

    const handleStatusChange = (nextStatus: FlowRuntimeStatus) => {
      if (mounted) {
        setStatus(nextStatus);
      }
    };

    const handleProgress = (value: number) => {
      if (mounted) {
        setProgress(value);
      }
    };

    const runtime = new FlowRuntime({
      canvas,
      container,
      onProgress: handleProgress,
      onReady: () => {
        if (mounted) {
          setStatus('ready');
          setProgress(1);
        }
      },
      onStatusChange: handleStatusChange,
      onError: (runtimeError) => {
        console.error('[FlowExperience] Flow runtime failed to start', runtimeError);
        if (mounted) {
          setError({ message: runtimeError.message });
        }
      },
      onMetrics: (frameMetrics) => {
        latestMetricsRef.current = frameMetrics;
      },
    });

    runtimeRef.current = runtime;

    runtime
      .start()
      .catch((runtimeError) => {
        if (mounted) {
          setError({ message: runtimeError.message });
        }
      });

    return () => {
      mounted = false;
      runtimeRef.current = null;
      runtime.dispose().catch((disposeError) => {
        console.warn('[FlowExperience] Failed to dispose runtime cleanly', disposeError);
      });
    };
  }, []);

  const handleToggleDashboard = useCallback(() => {
    runtimeRef.current?.toggleDashboard();
  }, []);

  const handleOpenPanel = useCallback((panelId: string) => {
    runtimeRef.current?.activateDashboardTab(panelId);
  }, []);

  return (
    <div className="flow-experience" ref={containerRef}>
      <canvas ref={canvasRef} className="flow-experience__canvas" />
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
