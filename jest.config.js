/**
 * Jest configuration for Torn Dashboard (project-wide fallback)
 */
module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/tests/**/*.test.js'], // Broad match for all tests
  testPathIgnorePatterns: ['/node_modules/', '/api/test.js'],
  // No coverage settings here—handle via scripts
};
