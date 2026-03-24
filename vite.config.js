import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/', // ✅ important pour Vercel
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: {
        // Ne précache pas les fichiers > 1 Mo (évite de saturer le mobile)
        maximumFileSizeToCacheInBytes: 1 * 1024 * 1024,
      },
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'logo192x192.png',
        'logo512x512.png',
      ],
      manifest: {
        name: 'Grega Play',
        short_name: 'Grega',
        description: 'Créez et partagez des vidéos d’événements 🎉',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/logo192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/logo512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Dépendances stables → chunk séparé, mis en cache longtemps par le navigateur
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          // Libs lourdes chargées uniquement sur certaines pages
          'vendor-motion': ['framer-motion'],
          'vendor-phone': ['libphonenumber-js', 'world-countries', 'country-telephone-data'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
});
