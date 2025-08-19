// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // --- Main Configuration for your TypeScript files ---
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'error'
    }
  },

  // --- OVERRIDE: For your LoggingService ---
  {
    files: ['**/services/LoggingService.ts'],
    rules: {
      'no-console': 'off'
    }
  },

  // --- OVERRIDE: For Test Files ---
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off'
    }
  },

  // --- OVERRIDE: For Middleware Files ---
  {
    files: ['**/middleware/**/*.ts'],
    rules: {
      '@typescript-eslint/no-namespace': 'off'
    }
  },

  {
    ignores: [
      'node_modules', 
      'dist',
      '**/dist',
      'coverage',
      'docs',
      'ecosystem.config.js'
    ]
  }
);