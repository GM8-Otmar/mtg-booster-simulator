import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cloudflare()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    allowedHosts: ['.ngrok-free.dev', '.trycloudflare.com'],
    hmr: {
      // Use 443 + wss when using a tunnel (ngrok, Cloudflare, etc.)
      clientPort: 443,
      protocol: 'wss',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
      },
    },
  },
})