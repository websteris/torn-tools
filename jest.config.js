/**
 * Jest configuration for Torn Dashboard Server
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  // Integration tests require a live database / network / real API key and are
  // NOT run by the default `npm test` (and therefore CI). Run them explicitly
  // with `npm run test:integration` in an environment that provides those.
  testPathIgnorePatterns: ['/node_modules/', '.*\\.integration\\.test\\.js$'],
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
