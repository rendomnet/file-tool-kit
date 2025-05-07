import { defineConfig } from 'vite';

export default defineConfig({
  root: './examples/web',
  publicDir: '../documents',
  server: {
    open: true,
  },
}); 