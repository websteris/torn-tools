/**
 * Jest configuration for Torn Dashboard Server
 */
module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/tests/**/*.test.js'],  // Only look for tests in the tests directory
  testPathIgnorePatterns: [
    '/node_modules/',
    '/api/test.js'        // Specifically ignore the api/test.js file
  ]
};
