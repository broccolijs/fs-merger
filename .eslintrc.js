'use strict';

module.exports = {
  root: true,
  parserOptions: {
    sourceType: 'module',
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'node', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:prettier/recommended',
    'plugin:node/recommended',
    'prettier',
  ],
  rules: {},
  overrides: [
    {
      parserOptions: {
        project: './tsconfig.json',
        // allows eslint from any dir
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
      files: ['src/**/*.ts'],
      settings: {
        node: {
          tryExtensions: ['.js', '.json', '.d.ts', '.ts'],

          convertPath: [
            {
              include: ['src/**/*.ts'],
              replace: ['^src/(.+)\\.ts$', 'dist/$1.js'],
            },
          ],
        },
      },
      extends: [],
      rules: {
        'node/no-unsupported-features/es-syntax': [
          'error',
          { ignores: ['modules'] },
        ],
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'error',
      },
    },
    {
      env: {
        node: true,
        mocha: true,
      },
      files: ['tests/**/*.js'],
    },
  ],
};
