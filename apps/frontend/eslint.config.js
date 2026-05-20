import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import importPlugin from 'eslint-plugin-import'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettier],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'simple-import-sort': simpleImportSort,
      import: importPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Import order per plans/default.md:
      // 1. React/libs  2. UI libs/icons  3. lodash  4. i18n/routing
      // 5. common/*    6. local relative  7. type imports
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            ['^react', '^@tanstack'],
            ['^antd', '^@ant-design'],
            ['^lodash'],
            ['^i18next', '^react-i18next', '^react-router'],
            ['^app/', '^common/', '^entities/', '^pages/'],
            ['^\\.'],
            ['^.+\\u0000$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'error',
    },
  },
)
