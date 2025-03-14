import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/TAWI-transcribe-and-translate/',
  plugins: [react()],
  worker: {
    format: 'es',
    plugins: []
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'transformers': ['@xenova/transformers']
        }
      }
    }
  }
});
