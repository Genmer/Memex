import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss()
  ],



  define: {
    'process.env': {}
  },
  server: {
    proxy: {
      '/proxy-github': {
        target: 'https://github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-github/, ''),
        headers: {
          Origin: 'https://github.com'
        }
      },
      '/proxy-github-api': {
        target: 'https://api.github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-github-api/, ''),
        headers: {
          Origin: 'https://api.github.com'
        }
      },
      '/proxy-gitee': {
        target: 'https://gitee.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-gitee/, '')
      }
    }
  }
})



