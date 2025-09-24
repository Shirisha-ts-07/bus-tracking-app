import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_BACKEND_URL || 'http://127.0.0.1:5002'

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Backend API
        '/api': {
          target: backend,
          changeOrigin: true,
        },
        '/healthz': {
          target: backend,
          changeOrigin: true,
        },
        '/version': {
          target: backend,
          changeOrigin: true,
        },
        // External local journey service on :8080
        '/ext': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ext/, ''),
        },
      },
    },
    define: {
      __BACKEND_URL__: JSON.stringify(backend),
    },
  }
})
