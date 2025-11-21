import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/', // Producción en la raíz
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['Icono.png'],
      manifest: {
        name: 'Recordatorios',
        short_name: 'Recordatorios',
        description: 'Aplicación de recordatorios offline',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1976d2',
        icons: [
          { src: 'Icono.png', sizes: '192x192', type: 'image/png' },
          { src: 'Icono.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      // Workbox solo se activa en build
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json,ico}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: { cacheName: 'html-cache' }
          },
          {
            urlPattern: ({ request }) =>
              request.destination === 'script' || request.destination === 'style',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'static-resources' }
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: { cacheName: 'image-cache', expiration: { maxEntries: 50 } }
          }
        ]
      }
    })
  ],

  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: { protocol: 'ws', host: 'localhost', port: 5173 },
    // Evita 404 en rutas de React Router
    historyApiFallback: true,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
