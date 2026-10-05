import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the @config, @core, @shared... aliases of tsconfig.json.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    // class-validator stores its rules in the metadata registry; a spec that
    // imports a decorated class on its own would otherwise lose them.
    setupFiles: ['reflect-metadata'],
    root: './',
    include: ['src/**/*.spec.ts'],
  },
});
