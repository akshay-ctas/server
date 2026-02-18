// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true, // ✅ Fixed: auto-detects tsconfig
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      // Fix unused vars errors
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      // // Allow any in error handlers only
      // '@typescript-eslint/no-explicit-any': 'warn', // Less strict
    },
  },
];
