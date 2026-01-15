import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
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
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Separa as dependências do node_modules em chunks separados
          if (id.includes('node_modules')) {
            // Agrupa as dependências do React em um chunk
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            // Agrupa a biblioteca de gráficos em um chunk
            if (id.includes('recharts')) {
              return 'vendor-recharts';
            }
            // Agrupa o Supabase em um chunk
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Agrupa os ícones em um chunk
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            // Todas as outras dependências do node_modules vão para um chunk 'vendor' genérico
            return 'vendor';
          }
        },
      },
    },
  },
}));