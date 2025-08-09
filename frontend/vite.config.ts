import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        // Configure Lit for production mode
        'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        port: Math.floor(Math.random() * (9999 - 3000 + 1)) + 3000,
        strictPort: false,
        open: true
      }
    };
});