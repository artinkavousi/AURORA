import * as THREE from "three/webgpu";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";

const hdrLoader = new HDRLoader();
const textureLoader = new THREE.TextureLoader();

/**
 * Load an HDR environment texture and configure it for scene use.
 * @param {string} url
 * @returns {Promise<THREE.DataTexture>}
 */
export const loadHdrTexture = (url) =>
  new Promise((resolve, reject) => {
    hdrLoader.load(
      url,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });

/**
 * Load a standard color texture with repeat wrapping.
 * @param {string} url
 * @param {THREE.LoadingManager} [manager]
 * @returns {Promise<THREE.Texture>}
 */
export const loadRepeatTexture = (url, manager) =>
  new Promise((resolve, reject) => {
    const loader = manager ? new THREE.TextureLoader(manager) : textureLoader;
    loader.load(
      url,
      (texture) => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        resolve(texture);
      },
      undefined,
      reject,
    );
  });

/**
 * Utility to dispose textures loaded through this module.
 * @param {THREE.Texture | THREE.Texture[]} resource
 */
export const disposeTexture = (resource) => {
  const items = Array.isArray(resource) ? resource : [resource];
  items.forEach((texture) => {
    if (texture && typeof texture.dispose === "function") {
      texture.dispose();
    }
  });
};
