import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tslOperatorPlugin from 'vite-plugin-tsl-operator';
import plainText from 'vite-plugin-plain-text';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: dirname,
  base: './',
  assetsInclude: ['**/*.hdr'],
  build: {
    outDir: path.join(dirname, 'dist'),
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) return 'vendor-three';
            if (id.includes('tweakpane')) return 'vendor-tweakpane';
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1600,
  },
  server: {
    port: 4321,
  },
  plugins: [
    tslOperatorPlugin({ logs: false }),
    plainText([
      /\.obj$/,
    ], {
      namedExport: false,
    }),
  ],
});
