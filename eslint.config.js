import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import boundaries from 'eslint-plugin-boundaries';

export default [
  js.configs.recommended,
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.d.ts',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      boundaries,
    },
    rules: {
      ...tsPlugin.configs['recommended'].rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      // TypeScript o'zi aniqlanmagan nomlarni tekshiradi; `no-undef` TS'da noto'g'ri xato beradi.
      'no-undef': 'off',
      // Fayl hajmi chegarasi: katta fayl — bo'lish signali (docs/12-ai-playbook.md §4).
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 12],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
    },
  },
  {
    // Testlar va generatsiya qilingan/ma'lumot fayllari uchun funksiya uzunligi cheklanmaydi.
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.stories.tsx'],
    rules: { 'max-lines-per-function': 'off', 'max-lines': ['error', 500] },
  },
];
