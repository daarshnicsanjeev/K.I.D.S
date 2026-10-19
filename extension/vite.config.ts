import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  test: {
    testTimeout: 20000
  },
  build: {
    outDir: 'dist',
    minify: false,
    modulePreload: {
      polyfill: false
    },
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/serviceWorker.ts'),
        whatsappExtractor: resolve(__dirname, 'src/content/whatsappExtractor.ts'),
        universalDomExtractor: resolve(__dirname, 'src/content/universalDomExtractor.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
});
