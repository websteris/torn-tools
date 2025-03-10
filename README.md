# Torn Dashboard Project: Current Status

## Project Overview
A modular dashboard for the Torn game with integrated tools and scripts. This dashboard will consolidate various existing scripts and tools into one cohesive interface.

## Technology Stack

- **Frontend**: Vue.js
- **Backend**: Node.js
- **Database**: SQLite3
- **API Integration**: Torn API + Custom API

## Core Development Principles

- **Modularity First**: All components must be self-contained with clear interfaces
- **Documentation Required**: Thorough documentation for all modules
- **Complete Code**: Always provide complete files, not snippets
- **Clear Interfaces**: Components should communicate through well-defined APIs
- **Test-Driven Development**: Each module requires test cases to validate functionality

## Project Status

### Current Focus

- Testing the faction tracker and war tracking functionality
- Setting up the frontend components
- Implementing user interface for faction tracking

### Completed Components

- Torn API client (with rate limiting, caching, and error handling)
- Database schema design and implementation
- User and API key models
- API routes for key management
- Project structure setup
- Server configuration
- Basic server setup
- Database initialization
- User authentication system
- Data polling service
- Data access API endpoints
- Faction tracker service (with member tracking and war monitoring)

### In-Progress Components

- Frontend dashboard layout

### Next Components to Implement

- User interface for faction tracker

## Component Details

### Torn API Client
- **Status**: Completed
- **Purpose**: Handles communication with Torn's API, including authentication, rate limiting, and caching
- **Current Challenges**: None - Implementation complete with proper rate limiting and error handling
- **Files**:
  - `server/services/torn-api/client.js`
  - `server/config/api-config.js`
  - `server/services/torn-api/example-service.js`
  - `server/tests/unit/services/torn-api/client.test.js`

### Database System
- **Status**: Implemented
- **Purpose**: Stores user data, API keys, and game information
- **Current Challenges**: Testing database concurrency and performance
- **Files**:
  - `server/db/schema.js`
  - `server/db/models/user.js`
  - `server/db/models/api-key.js`

### API Routes
- **Status**: Implemented
- **Purpose**: Provides endpoints for managing API keys and user data
- **Current Challenges**: Need to test with real Torn API data
- **Files**:
  - `server/api/index.js`
  - `server/api/api-keys.js`
  - `server/api/auth.js`
  - `server/api/data.js`
  - `server/api/test.js`

### Authentication System
- **Status**: Implemented, needs testing
- **Purpose**: Manages user registration and authentication using Torn API keys
- **Current Challenges**: Need to test the full authentication flow
- **Files**:
  - `server/services/auth/auth-service.js`
  - `server/api/auth.js`
  - `server/middleware/auth.js`

### Data Polling Service
- **Status**: Implemented
- **Purpose**: Regularly fetches and caches data from the Torn API
- **Current Challenges**: Need to tune polling intervals based on usage
- **Files**:
  - `server/services/polling/polling-service.js`
  - `server/services/data/data-service.js`

### Settings Management
- **Status**: Partially implemented (through API key model)
- **Purpose**: Securely stores user preferences and API keys
- **Current Challenges**: Needs integration with user authentication
- **Files**: 
  - `server/db/models/api-key.js` (encryption implemented)

### Faction Tracker System
- **Status**: Implemented, needs testing
- **Purpose**: Tracks faction data, members, and war activities
- **Current Challenges**: Testing with real Torn API data and optimizing polling frequency
- **Files**:
  - `server/services/faction-tracker/faction-tracker-service.js`
  - `server/services/faction-tracker/faction-poller.js`
  - `server/services/faction-tracker/api-key-manager.js`
  - `server/services/faction-tracker/data-processor.js`
  - `server/services/faction-tracker/war-tracker.js`
  - `server/api/faction-tracker.js`
  - `server/scripts/init-faction-db.js`

### Flight Tracker Module
- **Status**: Not started
- **Purpose**: Tracks and displays flight information in Torn
- **Current Challenges**: Needs to efficiently poll the API and visualize flight data
- **Files**: Not yet created

## Implementation Notes

### Important Considerations

- API calls need to be carefully managed due to rate limits
- SQLite should be configured for proper concurrency
- Frontend and backend need clear API contracts
- All modules must operate independently for maintainability

### Recent Decisions

- Decided to rebuild from scratch focusing on modularity
- Implemented secure encryption for API keys
- Created a flexible database schema supporting multiple modules
- Implemented proper error handling throughout the system

## Code Example Structure
When providing code, please follow this structure:
```javascript
/**
 * @module ModuleName
 * @description Brief description of this module's purpose
 */

// Dependencies
const dependencyOne = require('dependency-one');
const dependencyTwo = require('dependency-two');

/**
 * @function functionName
 * @description What this function does
 * @param {Type} paramName - Parameter description
 * @returns {Type} Return value description
 */
function functionName(paramName) {
  // Implementation
  return result;
}

// Exports
module.exports = {
  functionName,
  // Other exports
};
```

## Test Example Structure
When providing test cases, please follow this structure:
```javascript
/**
 * @jest-environment node
 */

const moduleName = require('../path/to/module');
const { mockFunction } = require('../path/to/mocks');

// Mock dependencies
jest.mock('../path/to/dependency', () => ({
  someFunction: jest.fn(),
}));

describe('Module: ModuleName', () => {
  beforeEach(() => {
    // Setup for each test
    jest.clearAllMocks();
  });

  test('should perform expected behavior when given valid input', () => {
    // Arrange
    const testInput = 'test value';
    const expectedOutput = 'expected result';
    
    // Act
    const result = moduleName.functionName(testInput);
    
    // Assert
    expect(result).toBe(expectedOutput);
  });

  test('should handle error cases appropriately', () => {
    // Arrange
    const invalidInput = null;
    
    // Act & Assert
    expect(() => {
      moduleName.functionName(invalidInput);
    }).toThrow('Expected error message');
  });
});
```

## File Structure
```
/torn-dashboard/
│
├── /server/                # Backend Node.js application
│   ├── /api/               # API endpoints
│   ├── /db/                # Database models and migrations
│   ├── /services/          # Business logic services
│   │   ├── /torn-api/      # Torn API client
│   │   ├── /polling/       # Data polling service (to be implemented)
│   │   └── /auth/          # Authentication service (to be implemented)
│   ├── /utils/             # Utility functions
│   ├── /config/            # Configuration files
│   ├── /tests/             # Test cases for server components
│   │   ├── /unit/          # Unit tests for individual modules
│   │   ├── /integration/   # Integration tests across modules
│   │   └── /mocks/         # Mock data and services for testing
│   └── server.js           # Main server file
│
├── /client/                # Vue frontend application (to be implemented)
│   ├── /src/
│   │   ├── /components/    # Vue components
│   │   ├── /views/         # Page views
│   │   ├── /store/         # Vuex state management
│   │   ├── /services/      # Frontend services
│   │   └── /assets/        # Static assets
│   ├── /tests/             # Test cases for frontend components
│   │   ├── /unit/          # Unit tests for Vue components
│   │   └── /e2e/           # End-to-end tests for user flows
│   └── /public/            # Public static files
```

## Testing Strategy

### Unit Testing

- Each module requires comprehensive unit tests using Jest
- Mock external dependencies to isolate functionality
- Coverage target: 80% minimum for critical modules
- Examples of tests to create:
  - API client rate limiting functionality (completed)
  - Data model validation
  - Authentication logic
  - Configuration loading

### Integration Testing

- Test interactions between connected modules
- Focus on key workflows:
  - API data fetching and storage
  - User authentication flow
  - Data polling and processing

### End-to-End Testing

- Test complete user flows through the application
- Validate dashboard visualization of data
- Test configuration changes and their effects
- Simulate API failures and rate limiting

## Test Command Examples
```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration 

# Run all tests with coverage report
npm run test:all

# Run specific test file
npm run test -- --testPathPattern=torn-api-client.test.js
```

## Next Steps

1. Initialize the faction tracking database tables
2. Test the faction tracker system with real API data
3. Set up the Vue.js frontend environment
4. Create the dashboard layout
5. Implement the faction tracking visualization components

## Conversation Instructions

- Review this document to understand the project status
- Ask me for any specific files you need to help with the current focus
- Please provide complete implementations following the documented structure
- Update this document with any progress made at the end of our conversation

Last Updated: March 10, 2025  
Current Priority: Testing the faction tracker system and developing the frontend interface
