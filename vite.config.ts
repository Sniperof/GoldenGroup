import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    server: {
        host: '0.0.0.0',
        port: 5000,
        allowedHosts: true,
        watch: {
            ignored: ['**/.local/**', '**/.cache/**', '**/.git/**', '**/server/**'],
        },
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
})
