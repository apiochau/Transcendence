import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://localhost:8443', // Points to your Nginx gateway
        secure: false,                   // Ignore SSL certificate issues for localhost self-signed certs
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'https://localhost:8443',
        secure: false,
        ws: true,                        // CRITICAL: Enable WebSocket proxying
        changeOrigin: true,
      }
    }
  }
});
