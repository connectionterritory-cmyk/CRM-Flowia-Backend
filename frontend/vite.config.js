import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devPort = Number(process.env.PORT || env.PORT || 5173)

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: devPort,
      proxy: {
        '/api': {
          target: process.env.VITE_API_TARGET || env.VITE_API_TARGET || 'http://localhost:3001',
          changeOrigin: true,
        }
      }
    },
    css: {
      devSourcemap: false,
    },
    build: {
      sourcemap: false,
    }
  }
})
