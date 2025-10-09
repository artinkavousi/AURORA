import React, { useMemo } from 'react';
import type { FlowFrameMetrics, FlowRuntimeStatus } from '../../runtime/FlowRuntime';

interface FlowControlBarProps {
  status: FlowRuntimeStatus;
  metrics: FlowFrameMetrics | null;
  onToggleDashboard: () => void;
  onOpenPanel: (panelId: string) => void;
}

const STATUS_LABEL: Record<FlowRuntimeStatus, string> = {
  idle: 'Idle',
  initializing: 'Booting WebGPU…',
  ready: 'Running',
  error: 'Unavailable',
};

const PANEL_SHORTCUTS: Array<{ id: string; label: string; hint: string }> = [
  { id: 'physics', label: 'Physics', hint: 'Particle forces & solvers' },
  { id: 'visuals', label: 'Visuals', hint: 'Rendering & materials' },
  { id: 'audio', label: 'Audio', hint: 'Audio-reactive controls' },
  { id: 'postfx', label: 'Post FX', hint: 'Bloom & aberration stack' },
];

export const FlowControlBar: React.FC<FlowControlBarProps> = ({
  status,
  metrics,
  onToggleDashboard,
  onOpenPanel,
}) => {
  const formattedMetrics = useMemo(() => {
    if (!metrics) {
      return {
        fps: '--',
        frame: '--',
        particles: '--',
        tier: '—',
      };
    }

    return {
      fps: metrics.fps.toFixed(0),
      frame: `${metrics.frameTime.toFixed(1)} ms`,
      particles: metrics.particleCount.toLocaleString(),
      tier: metrics.performanceTier.toUpperCase(),
    };
  }, [metrics]);

  const statusLabel = STATUS_LABEL[status];

  return (
    <div className="flow-control-bar">
      <div className="flow-control-bar__status">
        <span className={`flow-control-bar__status-indicator flow-control-bar__status-indicator--${status}`} />
        <span className="flow-control-bar__status-text">{statusLabel}</span>
      </div>
      <div className="flow-control-bar__metrics">
        <span title="Frames per second">FPS {formattedMetrics.fps}</span>
        <span title="Frame time">Frame {formattedMetrics.frame}</span>
        <span title="Simulated particle instances">Particles {formattedMetrics.particles}</span>
        <span title="Adaptive performance tier">Tier {formattedMetrics.tier}</span>
      </div>
      <div className="flow-control-bar__actions">
        <button type="button" className="flow-control-bar__action" onClick={onToggleDashboard}>
          Panels
        </button>
        {PANEL_SHORTCUTS.map((panel) => (
          <button
            key={panel.id}
            type="button"
            className="flow-control-bar__action flow-control-bar__action--ghost"
            onClick={() => onOpenPanel(panel.id)}
            title={panel.hint}
          >
            {panel.label}
          </button>
        ))}
      </div>
    </div>
  );
};

