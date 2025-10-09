import React from 'react';

interface LoadingOverlayProps {
  visible: boolean;
  progress: number;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, progress }) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <div className={`flow-overlay flow-overlay--loading ${visible ? 'is-visible' : ''}`}>
      <div className="flow-overlay__veil" />
      <div className="flow-overlay__content">
        <div className="flow-overlay__title">Booting Flow runtime</div>
        <div className="flow-overlay__subtitle">Preparing WebGPU simulation modules…</div>
        <div className="flow-overlay__progress">
          <div className="flow-overlay__progress-bar" style={{ transform: `scaleX(${clampedProgress || 0.02})` }} />
        </div>
        <div className="flow-overlay__hint">React 18 + React Three Fiber control shell</div>
      </div>
    </div>
  );
};
