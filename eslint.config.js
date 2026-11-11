import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import boundaries from 'eslint-plugin-boundaries';

/** Paketlar orasidagi chegaralar (03-architecture.md §2, §4). */
const forbid = (files, patterns, message) => ({
  files,
  rules: {
    'no-restricted-imports': ['error', { patterns: [{ group: patterns, message }] }],
  },
});

const DB_LAYER = ['@lg/db', '@lg/db/*', 'drizzle-orm', 'drizzle-orm/*', 'postgres'];
const APPS = ['@lg/api', '@lg/api/*', '@lg/worker', '@lg/bot', '@lg/web', '@lg/miniapp'];

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
      // T-004: apps/api/src/modules/* orasidagi chegaralar shu plugin bilan sozlanadi.
      boundaries,
    },
    rules: {
      ...tsPlugin.configs['strict'].rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
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
  forbid(
    ['packages/**/*.ts', 'packages/**/*.tsx'],
    APPS,
    "Paketlar ilovalarni import qilmaydi (bog'liqlik faqat apps → packages).",
  ),
  forbid(
    ['packages/domain/**/*.ts'],
    [...DB_LAYER, '@nestjs/*', 'node:*', 'fs', 'path', 'grammy', 'bullmq', 'ioredis'],
    "packages/domain — sof funksiyalar: DB, framework va I/O yo'q (03 §2).",
  ),
  forbid(
    ['packages/contracts/**/*.ts'],
    [...DB_LAYER, '@lg/domain', '@nestjs/*', 'node:*'],
    'packages/contracts — faqat sxema va tiplar (Zod).',
  ),
  forbid(
    [
      'apps/bot/**/*.ts',
      'apps/web/**/*.{ts,tsx}',
      'apps/miniapp/**/*.{ts,tsx}',
      'packages/ui-*/**/*.{ts,tsx}',
    ],
    [...DB_LAYER, '@lg/domain'],
    'Bot va UI DB yoki domen mantiqiga murojaat qilmaydi — faqat API orqali (03 §2).',
  ),
  {
    // Testlar uchun funksiya uzunligi cheklanmaydi, `!` (non-null) ruxsat.
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.stories.tsx'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': ['error', 500],
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
];
