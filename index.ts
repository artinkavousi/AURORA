/**
 * index.ts - Main Application Entry Point
 * 
 * Responsibilities:
 * - WebGPU initialization and validation
 * - Application bootstrap and lifecycle management
 * - Error handling and user feedback
 * - Animation loop
 * 
 * @module index
 */

import * as THREE from "three/webgpu";
import { FlowApp } from "./src/APP";

// Enable Three.js color management
THREE.ColorManagement.enabled = true;

// ==================== Type Definitions ====================

type ProgressCallback = (fraction: number, delay?: number) => Promise<void>;

// ==================== UI Helper Functions ====================

/**
 * Update loading progress bar
 * @param frac - Progress fraction (0-1)
 * @param delay - Optional delay in ms before resolving
 */
const updateLoadingProgressBar: ProgressCallback = async (frac: number, delay = 0): Promise<void> => {
  return new Promise((resolve) => {
    const progress = document.getElementById("progress");
    if (progress) {
      // 200px is the width of the progress bar defined in index.html
      progress.style.width = `${frac * 200}px`;
    }
    if (delay === 0) {
      resolve();
    } else {
      setTimeout(resolve, delay);
    }
  });
};

/**
 * Display error message to user
 * @param msg - Error message to display
 */
const showError = (msg: string): void => {
  const progressBar = document.getElementById("progress-bar");
  if (progressBar) progressBar.style.opacity = "0";

  const errorElement = document.getElementById("error");
  if (errorElement) {
    errorElement.style.visibility = "visible";
    errorElement.innerText = "Error: " + msg;
    errorElement.style.pointerEvents = "auto";
  }
};

/**
 * Hide loading screen
 */
const hideLoadingScreen = (): void => {
  const veil = document.getElementById("veil");
  if (veil) veil.style.opacity = "0";

  const progressBar = document.getElementById("progress-bar");
  if (progressBar) progressBar.style.opacity = "0";
};

// ==================== WebGPU Renderer Setup ====================

/**
 * Create WebGPU renderer
 * Note: Scenery.ts will configure tone mapping and color space
 * @returns Configured but uninitialized WebGPU renderer
 */
const createRenderer = (): THREE.WebGPURenderer => {
  const renderer = new THREE.WebGPURenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Don't set outputColorSpace here - Scenery handles it!
  return renderer;
};

// ==================== Main Application Bootstrap ====================

/**
 * Main application entry point
 * Handles WebGPU initialization, app bootstrap, and animation loop
 */
const run = async (): Promise<void> => {
  // Check WebGPU support
  if (!navigator.gpu) {
    showError("Your device does not support WebGPU.");
    return;
  }

  // Create and initialize renderer
  const renderer = createRenderer();
  await renderer.init();

  // Verify WebGPU backend
  if (!renderer.backend.isWebGPUBackend) {
    showError("Couldn't initialize WebGPU. Make sure WebGPU is supported by your Browser!");
    return;
  }

  // Mount renderer to DOM
  const container = document.getElementById("container");
  if (container) {
    container.appendChild(renderer.domElement);
  }

  // Create and initialize app
  const app = new FlowApp(renderer);
  console.log('🚀 Starting app initialization...');
  
  try {
    await app.init(updateLoadingProgressBar);
    console.log('✅ App initialized successfully!');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ App initialization error:', error);
    showError('Initialization failed: ' + errorMessage);
    throw error;
  }

  // Setup resize handler
  const resize = (): void => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    app.resize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", resize);
  resize();

  // Hide loading screen
  hideLoadingScreen();

  // Start animation loop
  const clock = new THREE.Clock();
  const animate = async (): Promise<void> => {
    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    await app.update(delta, elapsed);
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
};

// ==================== Application Launch ====================

// Run application
run().catch((error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error("💥 Application error:", error);
  showError(errorMessage || "An unexpected error occurred");
});

