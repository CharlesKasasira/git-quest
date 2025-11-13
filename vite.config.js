import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  optimizeDeps: {
    exclude: ['socket.io-client', 'uuid'],
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react'],
        },
      },
      external: (id) => {
        // Don't externalize these, but allow them to be optional
        if (id === 'socket.io-client' || id === 'uuid') {
          return false;
        }
        return false;
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
