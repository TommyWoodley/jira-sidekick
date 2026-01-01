import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../../out/webview-ui',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        issue: resolve(__dirname, 'src/issue/index.tsx'),
        config: resolve(__dirname, 'src/config/index.tsx'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
});
