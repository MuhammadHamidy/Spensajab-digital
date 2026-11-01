// eslint.config.mjs
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import { defineConfig, globalIgnores } from 'eslint/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default defineConfig([
  // ⬇️ ini lebih "keras" daripada ignores biasa
  globalIgnores([
    'node_modules/',
    '.next/',
    'out/',
    'build/',
    'dist/',
    'prisma/',
    '@prisma/client/',
    'src/generated/',
    'next-env.d.ts',
  ]),

  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-restricted-imports': 'off',
      'import/no-anonymous-default-export': 'off',
      'no-unused-expressions': 'off',
    },
  },
]);
