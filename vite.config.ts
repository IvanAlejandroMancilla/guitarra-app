import { defineConfig } from 'vite';
import { alphaTab } from '@coderline/alphatab-vite';

// En GitHub Pages la app vive en https://<usuario>.github.io/guitarra-app/; en desarrollo, en la raíz.
const BASE_PAGES = '/guitarra-app/';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview === true ? BASE_PAGES : '/',
  // Empaqueta los workers, el audio worklet, la fuente y el SoundFont de alphaTab.
  plugins: [alphaTab()],
  server: { port: 5173, open: true },
  optimizeDeps: { exclude: ['@coderline/alphatab'] },
}));
