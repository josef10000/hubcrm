import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.HubCrm': JSON.stringify(env.HubCrm),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@crm': path.resolve(__dirname, './src/domains/crm'),
        '@chat': path.resolve(__dirname, './src/domains/chat'),
        '@nexus': path.resolve(__dirname, './src/domains/nexus'),
        '@wiki': path.resolve(__dirname, './src/domains/wiki'),
        '@finance': path.resolve(__dirname, './src/domains/finance'),
        '@people': path.resolve(__dirname, './src/domains/people'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@core': path.resolve(__dirname, './src/core'),
        '@auth': path.resolve(__dirname, './src/core/auth'),
        '@admin': path.resolve(__dirname, './src/core/admin'),
        '@portal': path.resolve(__dirname, './src/domains/portal'),
        '@support': path.resolve(__dirname, './src/domains/support'),
        '@store': path.resolve(__dirname, './src/store'),
        '@domains': path.resolve(__dirname, './src/domains'),
        '@commercial': path.resolve(__dirname, './src/domains/commercial'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage'],
            ui: ['lucide-react', 'motion', 'sonner'],
            tldraw: ['tldraw'],
            three: ['three', '@react-three/fiber', '@react-three/drei'],
            charts: ['recharts'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'https://hub-central-crm.vercel.app',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
