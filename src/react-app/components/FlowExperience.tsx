import React, { useEffect, useRef, useState } from 'react';
import { FlowHud } from './hud/FlowHud';
import { LoadingOverlay } from './overlays/LoadingOverlay';
import { ErrorOverlay } from './overlays/ErrorOverlay';
import { FlowRuntime, type FlowRuntimeStatus } from '../runtime/FlowRuntime';

interface RuntimeErrorState {
  message: string;
}

export const FlowExperience: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<FlowRuntimeStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<RuntimeErrorState | null>(null);

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
    });

    runtime
      .start()
      .catch((runtimeError) => {
        if (mounted) {
          setError({ message: runtimeError.message });
        }
      });

    return () => {
      mounted = false;
      runtime.dispose().catch((disposeError) => {
        console.warn('[FlowExperience] Failed to dispose runtime cleanly', disposeError);
      });
    };
  }, []);

  return (
    <div className="flow-experience" ref={containerRef}>
      <canvas ref={canvasRef} className="flow-experience__canvas" />
      <FlowHud progress={progress} status={status} />
      <LoadingOverlay visible={status !== 'ready' && status !== 'error'} progress={progress} />
      <ErrorOverlay visible={status === 'error'} message={error?.message} />
    </div>
  );
};
