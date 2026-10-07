// @ts-check
import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Typed linting: rules such as no-floating-promises need the type checker,
// which `projectService` wires from tsconfig.json.
export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'drizzle/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        // eslint.config.mjs is outside tsconfig.json: use the default project.
        projectService: { allowDefaultProject: ['*.mjs'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Outside the current folder, import through an alias (@shared/...).
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^\\.\\./',
              message:
                'Use an alias (@config, @core, @shared, @modules, @database, @src) instead of ../',
            },
          ],
        },
      ],
      // Domain values come from their enum (UserRole, SessionChannel), never
      // from a string written by hand.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value=/^(intervenant|responsable|super_admin|mobile|backoffice)$/]',
          message:
            'Use the enum (UserRole, SessionChannel) instead of a hard-coded value.',
        },
      ],
      // Casing rules of docs/conventions.md#naming. The most specific
      // selector wins, whatever the order.
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'default', format: ['camelCase'] },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        // UPPER_CASE for constants and tokens, PascalCase for decorators.
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
          // `_name`: deliberately unused, as in no-unused-vars below.
          leadingUnderscore: 'allow',
        },
        { selector: 'variable', modifiers: ['destructured'], format: null },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        { selector: 'typeLike', format: ['PascalCase'] },
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: { regex: '^I[A-Z]', match: false },
        },
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        // UPPER_CASE only for the environment contract and static constants.
        { selector: 'classProperty', format: ['camelCase', 'UPPER_CASE'] },
        // Shapes owned by others: HTTP headers, payloads, computed keys.
        {
          selector: ['objectLiteralProperty', 'typeProperty'],
          format: null,
        },
        { selector: 'import', format: null },
      ],
    },
  },
  {
    // Where the values are defined.
    files: ['src/shared/enums/*.enum.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // Nest modules are decorated empty classes by design.
    files: ['src/**/*.module.ts'],
    rules: { '@typescript-eslint/no-extraneous-class': 'off' },
  },
);
