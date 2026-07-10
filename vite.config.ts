import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/pumabroker-api': {
        target: 'https://trade.pumabroker.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pumabroker-api/, ''),
        secure: false
      }
    }
  },
  plugins: [
    dyadComponentTagger(), 
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['robot-icon.svg'],
      manifest: {
        name: 'Rico 2.0',
        short_name: 'Rico 2.0',
        description: 'Bot de operações para Deriv.',
        theme_color: '#0a192f',
        background_color: '#0a192f',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/robot-icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/robot-icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
  },
});