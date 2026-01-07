import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // This is needed for hot-reloading to work
    // correctly inside a Docker container.
    watch: {
      usePolling: true,
    },
    port: 3000,
    // The --host flag in package.json (or here)
    // makes the server accessible from outside the container
    host: true, 
  },
})