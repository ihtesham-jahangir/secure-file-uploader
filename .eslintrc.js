// .eslintrc.js
module.exports = {
    root: true,  // Ensure ESLint stops looking in parent directories for configs
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    env: {
      browser: true,
      node: true,
      es6: true,
    },
    extends: [
      'eslint:recommended',
      'plugin:react/recommended',
      'plugin:@typescript-eslint/recommended',
      'next/core-web-vitals',  // Recommended for Next.js projects
    ],
    parser: '@typescript-eslint/parser',  // Use TypeScript parser
    plugins: ['react', '@typescript-eslint'],
    rules: {
      'react/react-in-jsx-scope': 'off', // No longer needed with React 17+
      'react/prop-types': 'off',          // Disable prop-types with TypeScript
    },
  };
  