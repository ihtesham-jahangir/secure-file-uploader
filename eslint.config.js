// .eslintrc.js
module.exports = {
  root: true,  // Ensures ESLint stops looking in parent directories for configs
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',  // Use TypeScript parser
  plugins: ['@typescript-eslint', 'react'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'next/core-web-vitals', // For Next.js projects
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',  // Not needed in Next.js
  },
};
