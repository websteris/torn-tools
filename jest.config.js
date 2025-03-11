/**
 * Jest configuration for Torn Dashboard
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
  // Setup files to run before tests
  // setupFilesAfterEnv: ['./server/tests/setup.js'],
  // Mock implementations
  // moduleNameMapper: {}
};
