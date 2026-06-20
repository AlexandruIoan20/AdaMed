import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // port fix, ca sa corespunda cu FRONTEND_PORT din .env si cu
  // quarkus.http.cors.origins din backend (application.properties)
  server: {
    port: 3000,
  },
})