// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'src/worklet.bundle.js', '.expo/*', 'ios/*', 'android/*'],
  },
  {
    plugins: {
      prettier: require('eslint-plugin-prettier'),
    },
    rules: {
      'prettier/prettier': 'error',
      'import/no-named-as-default': 'off',
    },
  },
  {
    files: [
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.tsx',
      '**/jest.setup.js',
      '**/jest.setup.ts',
    ],
    env: {
      jest: true,
    },
  },
]);
