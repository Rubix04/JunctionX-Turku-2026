// Unit tests for the app (npm test). jest-expo runs them with React Native and Expo's native
// modules mocked. Tests live in __tests__/ and import app code through the same "@/" alias.
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/__tests__'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleNameMapper: {
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
};
