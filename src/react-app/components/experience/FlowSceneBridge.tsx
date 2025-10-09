import React, { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import type { FlowRuntime } from '../../runtime/FlowRuntime';

interface FlowSceneBridgeProps {
  runtime: FlowRuntime;
  onError: (error: Error) => void;
}

export const FlowSceneBridge: React.FC<FlowSceneBridgeProps> = ({ runtime, onError }) => {
  const { gl, size } = useThree();
  const renderer = gl as THREE.WebGPURenderer;

  useEffect(() => {
    runtime.attachRenderer(renderer, renderer.domElement, false);
    let disposed = false;
    const initialWidth = size.width;
    const initialHeight = size.height;

    runtime
      .start()
      .then(() => {
        runtime.resize(initialWidth, initialHeight);
      })
      .catch((error) => {
        if (!disposed) {
          onError(error);
        }
      });

    return () => {
      disposed = true;
    };
  }, [runtime, renderer, onError]);

  useEffect(() => {
    runtime.resize(size.width, size.height);
  }, [runtime, size.width, size.height]);

  useFrame((state, delta) => {
    void runtime.advanceFrame(delta, state.clock.elapsedTime).catch(onError);
  });

  return null;
};
