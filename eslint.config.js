// .eslintrc.js

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
    ecmaFeatures: {
      jsx: true, // Allows for the parsing of JSX
    },
  },
  settings: {
    react: {
      version: 'detect', // Automatically detects the React version
    },
  },
  env: {
    browser: true, // Enables browser globals like window and document
    node: true, // Enables Node.js globals
    es6: true, // Enables ES6 globals
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'next', // Uses Next.js ESLint rules
    'next/core-web-vitals', // Enforces Next.js Core Web Vitals
  ],
  plugins: ['@typescript-eslint', 'react'],
  rules: {
    // Disable prop-types as TypeScript handles type checking
    'react/prop-types': 'off',
    // Ensure 'react/react-in-jsx-scope' rule is disabled if using React 17+
    'react/react-in-jsx-scope': 'off',
    // You can add more custom rules here
  },
};
