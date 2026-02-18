const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');
const tseslintPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  ...expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['node_modules/', '.expo/', 'dist/', 'web-build/', 'ios/', 'android/'],
  },
  {
    plugins: {
      '@typescript-eslint': tseslintPlugin,
    },
    settings: {
      'import/ignore': ['@expo/vector-icons', 'react-native'],
    },
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'import/order': 'off',
      'react/react-in-jsx-scope': 'off',
      'import/no-unresolved': ['error', { ignore: ['^@expo/vector-icons$'] }],
    },
  },
];
