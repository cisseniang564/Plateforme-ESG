import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Ne pas exposer le code source TypeScript en production
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Manual chunks split heavy dependencies away from the app shell so
        // the initial load chunk stays small. Each entry below is a list of
        // imports that will go into its own file (cached separately by the
        // browser).
        manualChunks: {
          // Heavy report-export libraries — only loaded when a user exports
          'vendor-pdf':      ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'vendor-xlsx':     ['xlsx'],

          // Charting (Recharts) — heavy, used in dashboards only
          'vendor-charts':   ['recharts'],

          // Core React (always loaded — small but isolated for caching)
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],

          // Icon library — large (hundreds of icons), used across every page
          'vendor-icons':    ['lucide-react'],

          // Date manipulation — used in many places
          'vendor-dates':    ['date-fns'],

          // i18n stack
          'vendor-i18n':     ['react-i18next', 'i18next', 'i18next-browser-languagedetector'],

          // HTTP + state + toast — small but isolated for cache stability
          'vendor-utils':    ['axios', 'react-hot-toast', '@reduxjs/toolkit', 'react-redux'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    include: ['src/tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/services/**', 'src/lib/**', 'src/components/**', 'src/pages/**', 'src/hooks/**'],
      exclude: ['src/tests/**', 'node_modules/**'],
    },
  },
});
