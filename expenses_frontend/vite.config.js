import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const apiOrigin = new URL(env.VITE_API_URL || 'http://localhost:3000/api').origin
  const devWebSocketOrigin = mode === 'development' ? 'ws://localhost:5173' : ''
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }

  return {
    plugins: [
      react(),
      {
        name: 'content-security-policy',
        transformIndexHtml(html) {
          return html
            .replace('__API_ORIGIN__', apiOrigin)
            .replace('__DEV_WEBSOCKET_ORIGIN__', devWebSocketOrigin)
        },
      },
    ],
    server: { headers: securityHeaders },
    preview: { headers: securityHeaders },
  }
})
