module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/tests/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    // Ignore all node_modules except packages that use ESM or need to be transpiled
    // This allows Jest to process modern Expo/React Native packages correctly
    'node_modules/(?!(react-native|@react-native|expo|@expo|@tetherto/wdk-uikit-react-native|expo-modules-core)/)',
  ],
};
