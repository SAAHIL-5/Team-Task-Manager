import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  plugins: [react(), tailwindcss()],
  preview: {
    host: true,
    port: 8080,
    allowedHosts: [
      'team-task-manager-production-4ba6.up.railway.app'
    ]
  }
})