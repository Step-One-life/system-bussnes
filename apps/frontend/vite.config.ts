import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const r = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      app: r('app'),
      common: r('common'),
      entities: r('entities'),
      pages: r('pages'),
    },
  },
  server: {
    port: 3020,
    strictPort: true,
  },
  preview: {
    port: 3020,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          antd: ['antd', '@ant-design/icons'],
          charts: ['chart.js', 'react-chartjs-2'],
          vendor: ['lodash', 'dayjs', 'i18next', 'react-i18next', '@tanstack/react-query'],
        },
      },
    },
  },
})
