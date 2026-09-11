import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

/**
 * Static analysis only. Formatting stays with Prettier: `eslint-config-prettier`
 * disables every stylistic rule that would otherwise fight the formatter.
 */
export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      'no-unused-vars': [
        'error',
        { args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      eqeqeq: ['error', 'smart'],
      'no-implicit-coercion': ['error', { boolean: false }],
      'no-return-assign': ['error', 'always'],
      'no-self-compare': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-promise-executor-return': 'error',
      'require-atomic-updates': 'error',
      'no-constant-binary-expression': 'error',
      'no-template-curly-in-string': 'error',
      'prefer-promise-reject-errors': 'error',
      'no-throw-literal': 'error',
      'symbol-description': 'error',
      'no-lonely-if': 'error',
      'object-shorthand': ['error', 'properties'],
      'prefer-arrow-callback': 'error',
      'no-useless-rename': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Browser runtime: the game, its UI and the rendering layer.
    files: ['src/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    // Node runtime: build tooling and the native test runner.
    files: ['scripts/**/*.{js,mjs}', 'tests/**/*.js', '*.config.js', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
  {
    // Playwright specs run in Node, but page.evaluate callbacks run in the browser.
    files: ['tests/e2e/**/*.js', 'playwright.config.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  prettier,
];
