import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '',
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate', // Atualiza o SW automaticamente sem perguntar
      injectRegister: 'auto',
      workbox: {
        // Mantém apenas o precache do build para evitar versões misturadas
        // entre HTML novo e bundles antigos durante deploys.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Chamadas de API: sempre busca na rede, sem cache
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
        // Pula a fase de "waiting" — aplica a nova versão imediatamente
        skipWaiting: true,
        // Assume controle de todas as abas imediatamente
        clientsClaim: true,
        // Aumentar limite para arquivos grandes (bundle JS > 2MB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
      manifest: {
        name: 'Synapse',
        short_name: 'Synapse',
        description: 'Sistema de Gestão Empresarial Synapse',
        theme_color: '#1e40af',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, 'packages/services/legacy-api/shared'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
  },
});
