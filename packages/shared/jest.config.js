/** @type {import('jest').Config} */
module.exports = {
  displayName: 'shared',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/index.ts',
    '!src/types/**/*.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov'],
};
