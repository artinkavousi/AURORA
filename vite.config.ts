import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tslOperatorPlugin from 'vite-plugin-tsl-operator';
import plainText from 'vite-plugin-plain-text';

export default defineConfig({
  base: './',
  assetsInclude: ['**/*.hdr'],
  server: {
    port: 1234,
  },
  plugins: [
    react({
      include: [/\.[jt]sx?$/],
    }),
    tslOperatorPlugin({ logs: false }),
    plainText([/\.obj$/], { namedExport: false }),
  ],
});
