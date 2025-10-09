import React from 'react';

interface ErrorOverlayProps {
  visible: boolean;
  message?: string;
}

export const ErrorOverlay: React.FC<ErrorOverlayProps> = ({ visible, message }) => {
  return (
    <div className={`flow-overlay flow-overlay--error ${visible ? 'is-visible' : ''}`}>
      <div className="flow-overlay__veil flow-overlay__veil--error" />
      <div className="flow-overlay__content flow-overlay__content--error">
        <div className="flow-overlay__title">WebGPU unavailable</div>
        <div className="flow-overlay__subtitle">
          {message ?? 'Your browser does not expose the experimental WebGPU API required by Flow.'}
        </div>
        <div className="flow-overlay__hint">
          Try enabling WebGPU flags or switch to a compatible Chromium-based browser.
        </div>
      </div>
    </div>
  );
};
