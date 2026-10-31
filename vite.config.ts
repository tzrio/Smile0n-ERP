import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Gunakan '/' untuk Cloudflare Pages / custom domain, atau fallback ke subpath jika diset
  const base = env.VITE_ROUTER_BASE || '/'

  return {
    base,
    plugins: [react()],
  }
})
