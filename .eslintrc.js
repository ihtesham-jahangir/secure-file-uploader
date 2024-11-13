// .eslintrc.js
module.exports = {
    root: true,
    parserOptions: {
      ecmaVersion: 12,
      sourceType: 'module',
    },
    env: {
      browser: true,
      es2021: true,
    },
    extends: [
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:next/recommended',
    ],
    parser: '@typescript-eslint/parser',
    plugins: ['react', '@typescript-eslint'],
    rules: {},
  };
  