/**
 * Jest configuration for Torn Dashboard
 */
module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  // Setup files to run before tests
  // setupFilesAfterEnv: ['./server/tests/setup.js'],
  // Mock implementations
  // moduleNameMapper: {}
};
