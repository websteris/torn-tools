# Torn Dashboard Project Status

## Project Overview
Torn Dashboard is a comprehensive web application designed to provide advanced tracking and data visualization for the online game Torn. The project aims to consolidate various existing scripts and tools into a cohesive, modular interface that helps players manage and analyze their game data.

## Technology Stack
- **Frontend**: Vue.js
- **Backend**: Node.js with Express.js
- **Database**: SQLite3
- **Authentication**: Custom JWT-based system
- **Logging**: Winston logger

## Core Development Principles
1. Modularity First: All components must be self-contained with clear interfaces
2. Comprehensive Documentation
3. Complete and Robust Code
4. Clear Component Interfaces
5. Test-Driven Development

## Architecture
### Backend
- **Framework**: Express.js
- **Database Connection**: SQLite with custom connection management
- **Authentication**: Custom middleware-based JWT authentication
- **Logging**: Centralized logging using Winston

### Key Components
1. User Management
2. API Key Management
3. Faction Tracker
4. Data Retrieval Services
5. War Tracking

## Current Project Status

### Completed Components
- Base Express server setup
- Database schema and initialization scripts
- User authentication system
- API key management
- Basic data retrieval endpoints
- User model with comprehensive CRUD operations
- Database connection and initialization logic
- API routes for various services

### Working Components
- User authentication
- API key storage and management
- Basic data retrieval
- Database schema initialization

### Temporarily Disabled Components
- Faction tracker service (currently commented out in server configuration)

### Recent Fixes
- Implemented class-based user model with robust methods
- Corrected database connection imports
- Enhanced error handling in database operations
- Improved database schema with more comprehensive table structures

### Pending Tasks
- Re-enable and thoroughly test faction tracker service
- Complete implementation of war tracking functionality
- Develop comprehensive test coverage
- Implement rate limiting for API requests
- Build frontend dashboard components

## Database Schema
The SQLite database includes tables for:
- Users
- API Keys
- Tracked Factions
- Cached Data
- User Settings
- Notification Configurations

### Key Tables Structure
1. **Users Table**
   - Unique identifiers
   - Authentication details
   - Torn game-specific information
   - Timestamps for tracking

2. **API Keys Table**
   - User association
   - Encrypted API key storage
   - Labeling and management features

3. **Tracked Factions Table**
   - User-specific faction tracking
   - Polling interval configurations
   - Target faction details

## Implementation Patterns

### Database Model Pattern
```javascript
class ModelName {
  async methodName() {
    return new Promise((resolve, reject) => {
      const db = getConnection();
      // Database operation implementation
      // Ensure db.close() is called
    });
  }
}
module.exports = new ModelName();
```

### Error Handling Approach
- Consistent error logging
- Informative error responses
- Use of try/catch blocks
- Centralized error management through Winston logger

## Dependency Overview
- **Database**: sqlite3
- **Logging**: winston
- **Web Server**: express
- **Security**: helmet, cors
- **Performance**: compression

## Testing Strategy
### Types of Testing
1. Unit Testing
   - Individual module functionality
   - Mock external dependencies
   - Aim for 80% coverage on critical modules

2. Integration Testing
   - Module interaction validation
   - API data fetching and storage
   - Authentication flows

3. End-to-End Testing
   - Complete user journey testing
   - Dashboard data visualization
   - Configuration change impacts

## Development Workflow
1. Modular development
2. Comprehensive documentation
3. Rigorous testing
4. Continuous integration
5. Performance optimization

## Next Development Priorities
1. Faction Tracker Reimplementation
2. Frontend Dashboard Development
3. Comprehensive Test Suite
4. Performance Optimization
5. Advanced Visualization Features

## Challenges and Considerations
- Torn API Rate Limiting
- Secure API Key Management
- Real-time Data Synchronization
- Cross-module Communication
- Performance Under Heavy Load

## Technology Decisions
- Chosen SQLite for lightweight, file-based storage
- Express.js for flexible, middleware-based routing
- Custom authentication for maximum control
- Modular service-based architecture

## File Structure
```
/torn-dashboard/
│
├── /server/                # Backend Node.js application
│   ├── /api/               # API endpoint routes
│   │   ├── auth.js         # Authentication routes
│   │   ├── api-keys.js     # API key management routes
│   │   ├── faction-tracker.js  # Faction tracking routes
│   │   ├── data.js         # Data retrieval routes
│   │   └── index.js        # Main API router
│   │
│   ├── /db/                # Database management
│   │   ├── models/         # Database models
│   │   │   ├── user.js     # User model
│   │   │   └── api-key.js  # API key model
│   │   ├── schema.js       # Database schema and connection
│   │   └── connection.js   # Database connection utilities
│   │
│   ├── /services/          # Business logic services
│   │   ├── /torn-api/      # Torn API client
│   │   ├── /auth/          # Authentication services
│   │   ├── /faction-tracker/  # Faction tracking services
│   │   │   ├── faction-tracker-service.js
│   │   │   ├── war-tracker.js
│   │   │   └── data-processor.js
│   │   ├── /polling/       # Data polling service
│   │   └── /data/          # Data management services
│   │
│   ├── /middleware/        # Express middleware
│   │   └── auth.js         # Authentication middleware
│   │
│   ├── /utils/             # Utility functions
│   │   └── logger.js       # Logging utility
│   │
│   ├── /config/            # Configuration files
│   │   └── api-config.js   # API configuration
│   │
│   ├── /scripts/           # Utility scripts
│   │   ├── init-db.js      # Database initialization
│   │   └── reset-db.js     # Database reset utility
│   │
│   ├── /tests/             # Server-side tests
│   │   ├── /unit/          # Unit tests
│   │   ├── /integration/   # Integration tests
│   │   └── /mocks/         # Test mocks and fixtures
│   │
│   └── server.js           # Main server entry point
│
├── /client/                # Frontend Vue.js application
│   ├── /src/
│   │   ├── /components/    # Reusable Vue components
│   │   ├── /views/         # Page components
│   │   ├── /store/         # Vuex state management
│   │   ├── /services/      # Frontend service layer
│   │   ├── /utils/         # Frontend utilities
│   │   └── /assets/        # Static assets
│   │
│   ├── /tests/             # Frontend tests
│   │   ├── /unit/          # Component unit tests
│   │   └── /e2e/           # End-to-end tests
│   │
│   ├── vue.config.js       # Vue CLI configuration
│   └── package.json        # Frontend dependencies
│
├── /docs/                  # Project documentation
├── /data/                  # Local data storage (SQLite DB)
├── .env                    # Environment configuration
├── package.json            # Project-wide dependencies
└── README.md               # Project overview and setup instructions
```

## Future Expansion Potential
- Multi-game Dashboard Concept
- Advanced Analytics
- Machine Learning Integration
- Community Features

Last Updated: March 10, 2025  
Current Focus: Faction Tracker System Testing and Frontend Development

## Database and API Integration

This project now includes a centralized data access layer using Knex for database operations. The following modules have been added:

- **server/db/index.js**: Manages the database connection using Knex with a PostgreSQL client.
- **server/models/faction.js**: Handles CRUD operations for faction data.
- **server/models/user.js**: Manages basic user data interactions.
- **server/models/factionWar.js**: Processes and stores detailed faction war data from the Torn API.
- **server/models/userDetail.js**: Stores detailed user data retrieved from the Torn API, including full API payloads.
- **server/models/userAccount.js**: Manages additional user account information such as settings, preferences, and login credentials (username and hashed password).
- **server/services/torn-api/validateKey.js**: Validates Torn API keys to ensure only keys with "Public Only" access type are accepted.

These modules help maintain a clean, modular architecture for our project and facilitate future enhancements, such as adding a Vue front end and switching databases if needed.

## Testing with Torn API Keys

This project includes tests that can interact with the Torn API. These tests can run in two modes:

### Mock Mode (Default)
By default, tests use mock API responses and don't make actual API calls. This is suitable for:
- CI/CD environments
- Development without an API key
- Quick test runs without API rate limiting concerns

### Real API Mode
For more thorough testing, you can configure real API keys:

1. **Create a test configuration file**:
   Create a file at `server/config/test-config.js` with your API keys:
   ```javascript
   module.exports = {
     apiKeys: {
       publicOnly: 'your-public-only-key',
       higherAccess: 'your-higher-access-key' // Optional, for testing key validation
     }
   };
   ```

2. **Or set environment variables**:
   ```bash
   export TORN_API_KEY_PUBLIC_ONLY=your-public-only-key
   export TORN_API_KEY_HIGHER_ACCESS=your-higher-access-key # Optional
   ```

3. **For GitHub Actions**:
   Add your API key as a repository secret named `TORN_API_KEY_PUBLIC_ONLY`

### Running Tests
- Run all tests: `npm test`
- Run only unit tests: `npm test -- --testPathPattern=unit`
- Run only integration tests: `npm test -- --testPathPattern=integration`

### API Usage Considerations
- Tests are designed to minimize API calls
- Integration tests that make real API calls have longer timeouts (10 seconds)
- Tests will skip in CI environments unless explicitly enabled with `RUN_API_TESTS=true`
- The Torn API has a limit of 100 requests per minute per key
