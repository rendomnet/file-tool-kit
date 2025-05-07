import { defineConfig } from 'vite';

export default async () => {
  const { default: tsconfigPaths } = await import('vite-tsconfig-paths');
  return defineConfig({
    root: './examples/web',
    publicDir: '../documents',
    plugins: [tsconfigPaths()],
    server: {
      open: true,
    },
  });
}; 