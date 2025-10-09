/**
 * index.ts - Application Bootstrap
 * Handles WebGPU initialization and main loop
 */

import * as THREE from "three/webgpu";
import { FlowApp, type ProgressCallback } from "./src/APP";

THREE.ColorManagement.enabled = true;

// ==================== UI Helpers ====================

const updateProgress: ProgressCallback = async (frac, delay = 0) => {
  return new Promise((resolve) => {
    const bar = document.getElementById("progress");
    if (bar) bar.style.width = `${frac * 200}px`;
    delay > 0 ? setTimeout(resolve, delay) : resolve();
  });
};

const showError = (msg: string) => {
  const progressBar = document.getElementById("progress-bar");
  const error = document.getElementById("error");
  if (progressBar) progressBar.style.opacity = "0";
  if (error) {
    error.style.visibility = "visible";
    error.innerText = "Error: " + msg;
  }
};

const hideLoading = () => {
  const veil = document.getElementById("veil");
  const progressBar = document.getElementById("progress-bar");
  if (veil) veil.style.opacity = "0";
  if (progressBar) progressBar.style.opacity = "0";
};

// ==================== Main ====================

const run = async () => {
  // Check WebGPU
  if (!navigator.gpu) {
    showError("WebGPU not supported");
    return;
  }

  // Init renderer
  const renderer = new THREE.WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  await renderer.init();

  if (!renderer.backend || !(renderer.backend as any).isWebGPUBackend) {
    showError("WebGPU initialization failed");
    return;
  }

  // Mount to DOM
  document.getElementById("container")?.appendChild(renderer.domElement);

  // Init app
  const app = new FlowApp(renderer);
  try {
    await app.init(updateProgress);
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error));
    throw error;
  }

  // Setup resize
  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    app.resize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", resize);
  resize();

  // Hide loading
  hideLoading();

  // Animation loop
  const clock = new THREE.Clock();
  const animate = async () => {
    await app.update(clock.getDelta(), clock.getElapsedTime());
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
};

run().catch(error => {
  console.error("💥 App error:", error);
  showError(error instanceof Error ? error.message : "Unexpected error");
});

// ==================== HMR Support ====================
// Hot Module Replacement for development
if (import.meta.hot) {
  console.log('[HMR] Hot module replacement enabled');
  
  // Accept updates to the dashboard module
  import.meta.hot.accept('./src/PANEL/dashboard.ts', (newModule) => {
    console.log('[HMR] Dashboard module updated - reloading...');
    // Force page reload to apply new dashboard styles
    window.location.reload();
  });
  
  // Accept updates to any panel modules
  import.meta.hot.accept(['./src/PANEL/UnifiedPanelManager.ts', './src/PANEL/types.ts'], () => {
    console.log('[HMR] Panel module updated - reloading...');
    window.location.reload();
  });
}

