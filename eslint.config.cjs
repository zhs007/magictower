module.exports = [
  // files to ignore (replaces .eslintignore for ESLint v9+)
  {
    ignores: ['node_modules/**', 'dist/**', 'public/**', 'coverage/**'],
  },

  // Apply to TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
    },
    rules: {
      // keep project-friendly defaults from previous config
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
  // basic recommended ESLint rules (a small subset)
  'no-unused-vars': 'off',
      'no-undef': 'off'
    },
  },
];
