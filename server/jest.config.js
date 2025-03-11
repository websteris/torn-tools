/**
 * Jest configuration for Torn Dashboard Server
 */
module.exports = {
  testEnvironment: 'node',
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/tests/**/*.test.js'],  // Only look for tests in the tests directory
  testPathIgnorePatterns: [
    '/node_modules/',
    '/api/test.js'        // Specifically ignore the api/test.js file
  ],
  // Default timeout for tests (10 seconds instead of 5)
  testTimeout: 10000,
  // Setup files to run before tests
  // setupFilesAfterEnv: ['./tests/setup.js'],
  // Mock implementations
  // moduleNameMapper: {}
};
