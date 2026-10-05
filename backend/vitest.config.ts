import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // class-validator stores its rules in the metadata registry; a spec that
    // imports a decorated class on its own would otherwise lose them.
    setupFiles: ['reflect-metadata'],
    root: './',
    include: ['src/**/*.spec.ts'],
  },
});
