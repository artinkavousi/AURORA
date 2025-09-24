/**
 * LoadingOverlay encapsulates the bootstrapping veil used while the engine loads.
 * It provides a progress API and exposes a small error surface that mirrors
 * the behaviour of the legacy entrypoint without leaking DOM queries elsewhere.
 */
export default class LoadingOverlay {
  constructor(root = document) {
    this.root = root;
    this.veil = root.getElementById('loading-veil');
    this.progressTrack = root.getElementById('progress-track');
    this.progressValue = root.getElementById('progress-value');
    this.errorMessage = root.getElementById('error-message');

    if (!this.veil || !this.progressValue || !this.errorMessage) {
      throw new Error('LoadingOverlay: required DOM nodes are missing');
    }
  }

  /**
   * Update the progress bar to the given fraction. Optionally delays resolution
   * which helps mimic the timing of the legacy progress animation.
   */
  updateProgress(fraction, delayMs = 0) {
    const clamped = Math.max(0, Math.min(1, fraction ?? 0));
    this.progressValue.style.width = `${(this.progressTrack.offsetWidth || 240) * clamped}px`;

    return new Promise((resolve) => {
      if (!delayMs) {
        resolve();
        return;
      }
      window.setTimeout(resolve, delayMs);
    });
  }

  fadeOut() {
    this.veil.style.opacity = '0';
    window.setTimeout(() => {
      this.veil.style.display = 'none';
      this.veil.style.pointerEvents = 'none';
    }, 850);
  }

  showError(message) {
    this.progressValue.style.width = '0px';
    this.veil.style.opacity = '1';
    this.veil.style.pointerEvents = 'auto';
    this.errorMessage.textContent = message;
    this.errorMessage.style.visibility = 'visible';
  }
}
