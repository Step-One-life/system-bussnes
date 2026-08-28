// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

/**
 * Гейт бэкенда. Ключевое правило — no-floating-promises: незаваленный промис
 * здесь означает потерянную денежную операцию (именно так исторически терялись
 * платежи и откаты). Раньше линтера на бэкенде не было вовсе.
 */
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'database/migrations/**', '**/*.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // Sequelize и Nest активно используют any в типах моделей/декораторов —
      // включим отдельным шагом, чтобы гейт завёлся уже сейчас.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    // В спеках моки моделей объявлены async ради совпадения сигнатур —
    // await внутри им не нужен.
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
)
