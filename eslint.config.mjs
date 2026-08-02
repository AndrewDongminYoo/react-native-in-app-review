import { fixupConfigRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';
import { defineConfig } from 'eslint/config';
import * as espree from 'espree';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  {
    extends: fixupConfigRules(compat.extends('@react-native', 'prettier')),
    plugins: { prettier },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'prettier/prettier': 'error',
    },
  },
  {
    ignores: ['.yarn/', 'eslint.config.mjs', 'node_modules/', 'lib/'],
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      parser: espree,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  // @babel/eslint-parser (pulled in by @react-native's eslintrc config) ships an
  // eslint-scope@5 ScopeManager without `addGlobals`, which ESLint 10 requires.
  // No .js here needs Flow/JSX parsing, so use espree instead.
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      parser: espree,
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },
  },
  {
    files: ['example/index.js'],
    languageOptions: { sourceType: 'module' },
  },
]);
