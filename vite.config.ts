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
    'process.env.NODE_ENV': JSON.stringify('production'),
    'import.meta.env.VITE_API_URL': JSON.stringify('https://ai-engagement-widget.vercel.app/api'),
  },
});
