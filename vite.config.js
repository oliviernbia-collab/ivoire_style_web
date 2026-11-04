import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement, /api et /uploads sont redirigés vers le backend Express.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
});
