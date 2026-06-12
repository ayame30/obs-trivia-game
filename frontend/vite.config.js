import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiPort = process.env.PORT || 4000;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/graphql': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
