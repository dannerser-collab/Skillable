import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true, // accesible desde el celular (QR de sala 1v1) en la misma red
    // Permite dominios de túnel público (ngrok, cloudflared, localtunnel); sin esto Vite
    // responde "Blocked request. This host is not allowed".
    allowedHosts: true,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:3001', ws: true, changeOrigin: true },
    },
  },
});
