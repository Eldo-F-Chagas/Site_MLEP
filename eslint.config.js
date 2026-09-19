export default [
  {
    files: ['web/assets/js/**/*.js', 'web/sw.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-constant-condition': 'warn',
      'no-extra-semi': 'error',
    },
  },
];
