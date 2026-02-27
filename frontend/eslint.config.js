import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      // ── React hooks ────────────────────────────────────────────────────────
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',

      // ── React ──────────────────────────────────────────────────────────────
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react/button-has-type': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/self-closing-comp': 'error',
      'react/no-danger': 'error',

      // ── TypeScript ─────────────────────────────────────────────────────────
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',

      // ── Imports ────────────────────────────────────────────────────────────
      'import/no-duplicates': 'error',
      'import/order': [
        'error',
        {
          'newlines-between': 'always',
          groups: [
            ['builtin', 'external'],
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  },
);
