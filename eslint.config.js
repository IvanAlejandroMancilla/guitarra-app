import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'public/', '*.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    // La regla de booleanos de naming-convention (`types: ['boolean']`) requiere información de tipos.
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'interface', format: ['PascalCase'], prefix: ['I'] },
        { selector: 'typeAlias', format: ['PascalCase'], prefix: ['T'] },
        { selector: 'enum', format: ['PascalCase'], prefix: ['E'] },
        { selector: 'class', format: ['PascalCase'] },
        { selector: 'function', format: null, custom: { regex: '^[a-z0-9]{2,3}_[a-z][a-zA-Z0-9]*$', match: true } },
        { selector: 'variable', modifiers: ['const', 'global'], format: ['UPPER_CASE', 'camelCase'] },
        { selector: 'variable', types: ['boolean'], format: ['PascalCase'], prefix: ['es', 'tiene', 'puede'] },
      ],
    },
  },
);
