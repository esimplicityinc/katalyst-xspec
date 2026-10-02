import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/steps/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: false,
  splitting: true,
  clean: true,
  target: 'node18',
  outDir: 'dist',
});
