import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [],
    exclude: ['tests/**', 'node_modules/**'],
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
      '@support': path.resolve(__dirname, './src/domains/support'),
      '@store': path.resolve(__dirname, './src/store'),
    },
  },
});
