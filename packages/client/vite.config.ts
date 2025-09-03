import { defineConfig } from 'vite'
import path from 'path' 

export default defineConfig({
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  resolve: {
    alias: {
      'shared': path.resolve(__dirname, '../shared/src')
    }
  }
}) 