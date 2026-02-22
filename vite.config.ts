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
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/widget/main.tsx'),
      name: 'AIWidget',
      fileName: 'widget-bundle',
      formats: ['iife'],
    },
    outDir: 'public',
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: 'widget-bundle.js',
        assetFileNames: 'widget-bundle.[ext]',
      },
    },
    minify: true,
    sourcemap: false,
  },
  define: {
    __DEV__: false,
    'process.env': '{}',
    global: 'window',
  },
});
