import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  envDir: '..',
  envPrefix: 'VITE_',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        signup: resolve(__dirname, 'signup.html'),
        profiles: resolve(__dirname, 'profiles.html'),
        events: resolve(__dirname, 'events.html'),
        interests: resolve(__dirname, 'interests.html'),
        locations: resolve(__dirname, 'locations.html'),
        debug: resolve(__dirname, 'debug.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
