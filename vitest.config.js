import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.config.*',
        '**/mockData/**',
        'scripts/**',
        '.vault/**',
        'main.js' // This is the bundled output
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60
      }
    },
    include: ['tests/**/*.test.js'],
    watchExclude: ['node_modules/**', '.vault/**', 'main.js']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'obsidian': path.resolve(__dirname, './tests/mocks/obsidian.js'),
      'virtual:release-notes': path.resolve(__dirname, './tests/mocks/virtual-release-notes.js')
    }
  }
});