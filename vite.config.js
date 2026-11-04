import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement, /api et /uploads sont redirigés vers le backend Express.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // ws : le temps réel (Socket.IO, /api/v1/realtime) passe aussi par ce proxy
      '/api': { target: 'http://localhost:5000', ws: true },
      '/uploads': 'http://localhost:5000',
      // Référencement : générés par l'API (en production, même règle de réécriture vers l'API)
      '/robots.txt': 'http://localhost:5000',
      '/sitemap.xml': 'http://localhost:5000',
    },
  },
});
