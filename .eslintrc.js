module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  settings: { react: { version: 'detect' } },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/consistent-type-imports': 'warn',
    // Regression guard: the fake "scenario" demo copy (FE #40) must never
    // reappear as a user-visible string literal. These were hardcoded Today
    // preset titles/signals; real copy now comes from the API or neutral
    // localized product copy.
    'no-restricted-syntax': [
      'error',
      {
        selector:
          'Literal[value=/雨天通勤|银蓝冷调|防潮外层|Rainy commute|Silver-blue cool|Water-resistant layer/]',
        message:
          'Mock scenario copy is banned (FE #40). Drive this from the API or use neutral localized product copy, do not hardcode demo scenarios.',
      },
    ],
  },
  ignorePatterns: [
    'node_modules/',
    'ios/',
    'android/',
    '.expo/',
    'dist/',
    'babel.config.js',
    'metro.config.js',
    'tailwind.config.js',
  ],
};
