import prettier from 'eslint-config-prettier';
import chaiFriendly from 'eslint-plugin-chai-friendly';
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  prettier,
  chaiFriendly.configs.recommendedFlat,
  {
    files: ['**/*.ts'],
    rules: {
      'max-len': ['error', 150, 2],
      camelcase: [
        'error',
        {
          ignoreImports: true
        }
      ],
      indent: [
        'error',
        2,
        {
          SwitchCase: 1
        }
      ],
      semi: ['error', 'always'],
      quotes: ['error', 'single', { avoidEscape: true }],
      'no-plusplus': 'off',
      'no-await-in-loop': 'off',
      'no-restricted-syntax': 'off',
      'no-continue': 'off',
      'arrow-body-style': 'off',
      'no-loop-func': 'off',
      'no-unused-expressions': 'off',
      'chai-friendly/no-unused-expressions': 'error',
      'require-await': 'error',
      'no-return-await': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-expressions': 'off'
    },
    languageOptions: {
      globals: {
        assert: true,
        expect: true,
        artifacts: true,
        contract: true
      }
    }
  }
];
