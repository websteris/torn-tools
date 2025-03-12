/**
 * Jest configuration for Torn Dashboard Server
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!jest.config.js'
  ],
  // Use the correct property name for coverage reporters
  coverageReporters: ['text', 'lcov'],
  // Set a longer timeout for integration tests that make API calls
  testTimeout: 30000,
  // Setup files if needed
  // setupFilesAfterEnv: ['./tests/setup.js'],
};
