import * as THREE from 'three/webgpu';

import LoadingOverlay from '../ui/LoadingOverlay.js';
import { Application } from './Application.js';
import { UpdateLoop } from './updateLoop.js';

THREE.ColorManagement.enabled = true;

function createRenderer() {
  const renderer = new THREE.WebGPURenderer({});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export async function bootstrap() {
  const overlay = new LoadingOverlay();

  try {
    if (!navigator.gpu) {
      overlay.showError('Your device does not support WebGPU.');
      return;
    }

    const renderer = createRenderer();
    await renderer.init();

    if (!renderer.backend.isWebGPUBackend) {
      overlay.showError("Couldn't initialize WebGPU. Make sure WebGPU is supported by your browser.");
      return;
    }

    const container = document.getElementById('app-root');
    container.appendChild(renderer.domElement);

    const application = new Application(renderer);
    await application.init((fraction, delay) => overlay.updateProgress(fraction, delay));

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      application.resize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    overlay.fadeOut();

    const loop = new UpdateLoop((delta, elapsed) => application.update(delta, elapsed));
    loop.start();
  } catch (error) {
    overlay.showError('An unexpected error occurred while loading Aurora.');
    throw error;
  }
}
