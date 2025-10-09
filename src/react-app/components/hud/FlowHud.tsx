import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { FlowRuntimeStatus } from '../../runtime/FlowRuntime';

interface FlowHudProps {
  progress: number;
  status: FlowRuntimeStatus;
}

const Halo: React.FC<{ progress: number; status: FlowRuntimeStatus }> = ({ progress, status }) => {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  const color = useMemo(() => {
    switch (status) {
      case 'ready':
        return new THREE.Color('#7cffe8');
      case 'error':
        return new THREE.Color('#ff6b6b');
      default:
        return new THREE.Color('#60a5fa');
    }
  }, [status]);

  useFrame((_, delta) => {
    const speed = status === 'ready' ? 0.35 : 0.6;
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z += delta * speed;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z -= delta * (speed * 0.6);
    }
    if (pulseRef.current) {
      const baseScale = 0.8 + progress * 0.4;
      const pulse = 0.02 * Math.sin(performance.now() * 0.003);
      pulseRef.current.scale.setScalar(baseScale + pulse);
      (pulseRef.current.material as THREE.MeshBasicMaterial).opacity = 0.25 + progress * 0.35;
    }
  });

  const outerScale = 1 + progress * 0.2;
  const innerScale = 0.6 + progress * 0.25;

  return (
    <group>
      <mesh ref={pulseRef}>
        <circleGeometry args={[1.05, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
      <mesh ref={outerRingRef} scale={outerScale}>
        <ringGeometry args={[0.8, 1, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
      <mesh ref={innerRingRef} scale={innerScale}>
        <ringGeometry args={[0.45, 0.55, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
    </group>
  );
};

const ProgressArc: React.FC<{ progress: number; status: FlowRuntimeStatus }> = ({ progress, status }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => new THREE.RingGeometry(0.58, 0.65, 128, 1, 0, Math.max(progress, 0.01) * Math.PI * 2), [progress]);

  React.useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z = -Math.PI / 2;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial color={status === 'error' ? '#ff6b6b' : '#c4f1ff'} transparent opacity={0.9} />
    </mesh>
  );
};

export const FlowHud: React.FC<FlowHudProps> = ({ progress, status }) => {
  const safeProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <Canvas
      className="flow-hud"
      orthographic
      camera={{ position: [0, 0, 10], zoom: 120 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.6} />
      <group rotation={[0, 0, 0]}>
        <Halo progress={safeProgress} status={status} />
        <ProgressArc progress={safeProgress} status={status} />
      </group>
    </Canvas>
  );
};
