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
        // Split heavy dependencies into their own files so the initial load
        // chunk stays small. A FUNCTION (not the object form) is used on
        // purpose: it lets us route shared low-level deps (react-is,
        // @babel/runtime, prop-types…) explicitly into the always-loaded
        // vendor-react/vendor-utils chunks. Otherwise the object form lets
        // such a shared dep land inside vendor-charts / vendor-pdf, which then
        // forces the entry to statically import that heavy chunk — pulling
        // ~1 MB of charts/pdf code onto every page (incl. the public landing,
        // which uses neither). Keeping the heavy chunks "pure" makes them
        // load only when a lazy dashboard/export route actually needs them.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          const pkg = (id.split('node_modules/').pop() || '').replace(/^\.pnpm\/[^/]+\/node_modules\//, '');

          // Shared runtime + React family — must stay with the core so heavy
          // libs can't drag a shared symbol into the entry.
          if (/^(@babel\/runtime|tslib|regenerator-runtime|scheduler|react-is|prop-types|object-assign|use-sync-external-store)(\/|$)/.test(pkg)) return 'vendor-react';
          if (/^(react|react-dom|react-router|react-router-dom)(\/|$)/.test(pkg)) return 'vendor-react';

          // NOTE: recharts / jspdf / html2canvas / xlsx are deliberately NOT
          // force-grouped here. They are only ever pulled in via dynamic
          // import() (export actions) or lazy() route pages, so Vite already
          // emits them as async chunks loaded on demand. Manually grouping them
          // used to let one of their shared low-level deps land in the heavy
          // chunk, which then forced the *entry* to import it statically —
          // dragging ~1 MB of pdf/charts code onto every page (incl. the
          // landing). Leaving them to Vite keeps them out of the entry.

          if (/^lucide-react(\/|$)/.test(pkg)) return 'vendor-icons';
          if (/^date-fns(\/|$)/.test(pkg)) return 'vendor-dates';
          if (/^(react-i18next|i18next|i18next-browser-languagedetector)(\/|$)/.test(pkg)) return 'vendor-i18n';
          if (/^(axios|react-hot-toast|@reduxjs\/toolkit|react-redux|redux|immer|reselect|redux-thunk)(\/|$)/.test(pkg)) return 'vendor-utils';

          return undefined; // everything else: let Vite decide (entry or per-route)
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
