import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Import pages/components from admin and coordinator folders
      { find: '@admin', replacement: path.resolve(__dirname, 'admin/src') },
      { find: '@coordinator', replacement: path.resolve(__dirname, 'coordinator/src') },
      // Redirect AuthContext imports so ALL components share our single provider
      { find: '../context/AuthContext', replacement: path.resolve(__dirname, 'src/context/AuthContext.jsx') },
      // Redirect api imports to our shared copy
      { find: '../services/api', replacement: path.resolve(__dirname, 'src/services/api.js') },
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
