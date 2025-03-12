# Torn Dashboard Server

## Overview
The Torn Dashboard Server is a backend application designed to interact with the Torn API, manage user and faction data, and provide authentication services. It supports periodic data pulling from the Torn API, storing and updating data in a database, and handling user authentication and preferences.

## Features
- **User Management**: CRUD operations for user data.
- **Authentication**: User registration, login, and JWT token management.
- **Faction Management**: CRUD operations for faction data.
- **Faction War Tracking**: Manage and track faction wars.
- **Data Pulling**: Periodically fetches data from the Torn API and updates the database.
- **Background Services**: Polling-service and faction-tracker-service for automatic data collection.
- **Security**: Implements Helmet for HTTP header security, CORS protection, and response compression.
## Technologies Used
- **Express**: Web server framework.
- **Knex**: SQL query builder for database operations.
- **SQLite3**: Database for development and testing.
- **PostgreSQL**: Database for production.
- **Axios**: HTTP client for API requests.
- **Bcrypt**: Password hashing.
- **Jsonwebtoken**: JWT token management.
- **Node-cache**: Caching.
- **Node-fetch**: HTTP requests.

## Services
The application includes several background services:

- **Polling Service**: Automatically fetches updates from the Torn API on a scheduled basis, ensuring data is fresh without requiring manual updates.
- **Faction Tracker Service**: Monitors faction activities and wars, keeping the database updated with the latest faction information.

These services run in the background when the server is started and do not require additional configuration.

## Setup Instructions

### Prerequisites
- Node.js and npm installed
- PostgreSQL for production environment

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd torn-dashboard-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   - For development and testing, SQLite is used by default.
   - For production, set the `DATABASE_URL` environment variable to your PostgreSQL connection string.

4. Run database migrations:
   ```bash
   npm run migrate
   ```

5. Seed the database (if necessary):
   ```bash
   npm run seed
   ```

### Running the Server
- **Development**: 
  ```bash
  npm run dev
  ```
- **Production**:
  ```bash
  npm start
  ```

### Running Tests
- Run all tests:
  ```bash
  npm test
  ```
- Run tests with coverage:
  ```bash
  npm run test:coverage
  ```

## Environment Variables
- `NODE_ENV`: Set to `development`, `test`, or `production`.
- `PORT`: Port number for the server to listen on (defaults to 3000 if not specified).
- `DATABASE_URL`: PostgreSQL connection string for production.
- `JWT_SECRET`: Secret key for JWT token signing.
- `TORN_API_KEY`: API key for accessing the Torn API.
91|- `CORS_ORIGIN`: Allowed origins for CORS (can be a comma-separated list).

## API Documentation

### Authentication Endpoints

#### Register
- **Method**: POST
- **URL**: `/api/auth/register`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword",
    "tornId": "12345",
    "tornApiKey": "your_torn_api_key"
  }
  ```
- **Response**: 
  ```json
  {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "tornId": "12345"
    },
    "token": "jwt_token_here"
  }
  ```
- **Authentication**: None required

#### Login
- **Method**: POST
- **URL**: `/api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Response**: 
  ```json
  {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "tornId": "12345"
    },
    "token": "jwt_token_here"
  }
  ```
- **Authentication**: None required

#### Logout
- **Method**: POST
- **URL**: `/api/auth/logout`
- **Request Body**: None
- **Response**: 
  ```json
  {
    "message": "Logged out successfully"
  }
  ```
- **Authentication**: JWT token required

#### Get Profile
- **Method**: GET
- **URL**: `/api/auth/profile`
- **Response**: 
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "tornId": "12345",
    "preferences": { /* user preferences */ }
  }
  ```
- **Authentication**: JWT token required

### API Keys Management

#### Add API Key
- **Method**: POST
- **URL**: `/api/keys`
- **Request Body**:
  ```json
  {
    "key": "your_torn_api_key",
    "description": "My primary API key"
  }
  ```
- **Response**: 
  ```json
  {
    "id": 1,
    "key": "****hidden****", 
    "description": "My primary API key",
    "createdAt": "2023-11-10T12:00:00Z"
  }
  ```
- **Authentication**: JWT token required

#### List API Keys
- **Method**: GET
- **URL**: `/api/keys`
- **Response**: 
  ```json
  [
    {
      "id": 1,
      "key": "****hidden****", 
      "description": "My primary API key",
      "createdAt": "2023-11-10T12:00:00Z"
    }
  ]
  ```
- **Authentication**: JWT token required

#### Delete API Key
- **Method**: DELETE
- **URL**: `/api/keys/:id`
- **Response**: 
  ```json
  {
    "message": "API key deleted successfully"
  }
  ```
- **Authentication**: JWT token required

### Data Endpoints

#### Get Player Data
- **Method**: GET
- **URL**: `/api/data/player/:tornId`
- **Response**: JSON object with player data from Torn API
- **Authentication**: JWT token required

#### Get Faction Data
- **Method**: GET
- **URL**: `/api/data/faction/:factionId`
- **Response**: JSON object with faction data from Torn API
- **Authentication**: JWT token required

#### Get Item Market Data
- **Method**: GET
- **URL**: `/api/data/market/:itemId`
- **Response**: JSON object with market data for the specified item
- **Authentication**: JWT token required

### Faction Tracker Endpoints

#### Add Faction to Track
- **Method**: POST
- **URL**: `/api/factions/track`
- **Request Body**:
  ```json
  {
    "factionId": "12345"
  }
  ```
- **Response**: 
  ```json
  {
    "id": 1,
    "factionId": "12345",
    "name": "Faction Name",
    "createdAt": "2023-11-10T12:00:00Z"
  }
  ```
- **Authentication**: JWT token required

#### List Tracked Factions
- **Method**: GET
- **URL**: `/api/factions/tracked`
- **Response**: Array of tracked faction objects
- **Authentication**: JWT token required

#### Get Faction War Data
- **Method**: GET
- **URL**: `/api/factions/wars/:factionId`
- **Response**: Array of war data for the specified faction
- **Authentication**: JWT token required

#### Stop Tracking Faction
- **Method**: DELETE
- **URL**: `/api/factions/track/:factionId`
- **Response**: 
  ```json
  {
    "message": "Faction removed from tracking"
  }
  ```
- **Authentication**: JWT token required

## Deployment

### Production Environment Setup

1. **Server Requirements**:
   - Ubuntu 20.04 LTS or newer
   - Node.js 16.x or newer
   - PostgreSQL 13 or newer
   - Nginx for reverse proxy

2. **Initial Server Setup**:
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js and npm
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install PostgreSQL
   sudo apt install -y postgresql postgresql-contrib
   
   # Install Nginx
   sudo apt install -y nginx
   
   # Install PM2 globally
   sudo npm install -g pm2
   ```

### Database Migration Steps

1. **Create PostgreSQL Database**:
   ```bash
   sudo -u postgres psql
   
   CREATE DATABASE torn_dashboard;
   CREATE USER torn_user WITH ENCRYPTED PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE torn_dashboard TO torn_user;
   \q
   ```

2. **Set Up Environment Variables**:
   Create a `.env` file in your project root with production settings:
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://torn_user:your_password@localhost:5432/torn_dashboard
   JWT_SECRET=your_very_secure_jwt_secret
   TORN_API_KEY=your_torn_api_key
   CORS_ORIGIN=https://your-frontend-domain.com
   ```

3. **Run Migrations**:
   ```bash
   # Install dependencies
   npm ci --production
   
   # Run migrations
   NODE_ENV=production npm run migrate
   ```

### Process Management (PM2)

1. **Start Application with PM2**:
   ```bash
   pm2 start npm --name "torn-dashboard" -- start
   ```

2. **Configure PM2 to Start on Boot**:
   ```bash
   pm2 startup
   # Follow the instructions output by PM2
   
   # Save current PM2 configuration
   pm2 save
   ```

3. **Common PM2 Commands**:
   ```bash
   # Check application status
   pm2 status
   
   # View logs
   pm2 logs torn-dashboard
   
   # Restart application
   pm2 restart torn-dashboard
   
   # Stop application
   pm2 stop torn-dashboard
   ```

### Nginx Reverse Proxy Setup

1. **Create Nginx Configuration**:
   ```bash
   sudo nano /etc/nginx/sites-available/torn-dashboard
   ```
   
   Add the following configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
   
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

2. **Enable the Site and Restart Nginx**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/torn-dashboard /etc/nginx/sites-enabled/
   sudo nginx -t  # Test the configuration
   sudo systemctl restart nginx
   ```

3. **Set Up SSL with Certbot (Let's Encrypt)**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## Troubleshooting

### Database Connection Issues

1. **Connection Refused**:
   - Verify PostgreSQL is running: `sudo systemctl status postgresql`
   - Check connection string in `.env` file
   - Ensure database user has correct permissions
   - Check firewall settings: `sudo ufw status`

2. **Migrations Failing**:
   - Ensure your database is empty before initial migration
   - Run with verbose flag for detailed errors: `npm run migrate -- --verbose`
   - Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-<version>-main.log`

### Authentication Problems

1. **Cannot Register New Users**:
   - Check if email already exists in the database
   - Ensure all required fields are provided in registration request
   - Verify email format is valid

2. **JWT Token Issues**:
   - Ensure `JWT_SECRET` is properly set in environment variables
   - Check token expiration time (default is 24 hours)
   - Verify that token is included in Authorization header as `Bearer <token>`

3. **Login Failures**:
   - Verify email and password combination
   - Check if user account is active/not suspended
   - Look for database connection issues

### API Rate Limiting Issues

1. **Torn API Rate Limits**:
   - Default rate limit is 100 requests per minute per API key
   - Use multiple API keys for higher throughput
   - Implement staggered requests in high-demand scenarios
   - Check rate limit headers in Torn API responses

2. **Application Rate Limiting**:
   - Default rate limit is 100 requests per minute per IP
   - Adjust in `api/index.js` if needed for specific use cases

### Environment Setup Problems

1. **Missing Environment Variables**:
   - Ensure all required variables are defined in `.env` file
   - Check that the `.env` file is in the root directory
   - Verify that environment variables are loaded correctly

2. **Node Version Compatibility**:
   - Ensure you're using Node.js 16.x or newer
   - Check for deprecation warnings in logs
   - Verify package compatibility with `npm ls`

### Known Limitations

1. **Data Freshness**:
   - Torn API data is cached for up to 5 minutes
   - Some endpoints have longer cache periods (faction data: 15 minutes)
   - Polling service minimum interval is 5 minutes to avoid rate limiting

2. **API Key Permissions**:
   - Some endpoints require specific API key permissions in Torn
   - Check that your API key has the necessary scopes
   - Use dedicated API keys for specific purposes (e.g., one for player data, one for faction data)

3. **Database Performance**:
   - Indexes may need optimization for large datasets
   - Consider database connection pooling for high traffic
   - Monitor query performance in production

## Contributing
Contributions are welcome! Please fork the repository and submit a pull request.

## License
This project is licensed under the MIT License. 