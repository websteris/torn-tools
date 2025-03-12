const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const userAccountModel = require('../../models/userAccount');
const logger = require('../../utils/logger');

// Secret keys for JWT tokens - should be stored in env variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'torn-dashboard-jwt-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'torn-dashboard-jwt-refresh-secret-key';

// Token expiration times
const TOKEN_EXPIRATION = '1h';
const REFRESH_TOKEN_EXPIRATION = '7d';

/**
 * Generates a JWT token for a user
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.player_id,
      username: user.username
    }, 
    JWT_SECRET, 
    { expiresIn: TOKEN_EXPIRATION }
  );
}

/**
 * Generates a refresh token for a user
 * @param {Object} user - User object
 * @returns {String} Refresh token
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { 
      id: user.player_id,
      username: user.username,
      tokenType: 'refresh'
    }, 
    JWT_REFRESH_SECRET, 
    { expiresIn: REFRESH_TOKEN_EXPIRATION }
  );
}

/**
 * Verifies a JWT token
 * @param {String} token - JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
async function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    logger.error(`Error verifying token: ${error.message}`);
    return null;
  }
}

/**
 * Verifies a refresh token
 * @param {String} token - Refresh token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
async function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    if (decoded.tokenType !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    logger.error(`Error verifying refresh token: ${error.message}`);
    return null;
  }
}

/**
 * Registers a new user account
 * @param {Object} userData - User data including username, password, etc.
 * @returns {Object} User account object and tokens
 */
async function registerUser(userData) {
  try {
    // Check if username already exists
    const users = await userAccountModel.getAllUsers();
    const existingUser = users.find(u => u.username === userData.username);
    
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(userData.password, salt);
    
    // Create user account
    const user = await userAccountModel.createUserAccount({
      player_id: userData.player_id,
      username: userData.username,
      name: userData.name || userData.username,
      password_hash: passwordHash,
      preferences: userData.preferences || { theme: 'light', notifications: true },
      raw_data: userData.raw_data || {}
    });
    
    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    return {
      user: {
        player_id: user.player_id,
        username: user.username,
        name: user.name,
        preferences: user.preferences
      },
      tokens: {
        token,
        refreshToken
      }
    };
  } catch (error) {
    logger.error(`Error registering user: ${error.message}`);
    throw error;
  }
}

/**
 * Logs in a user with username and password
 * @param {Object} credentials - Object containing username and password
 * @returns {Object} User account object and tokens
 */
async function loginUser(credentials) {
  try {
    // Find user by username
    const users = await userAccountModel.getAllUsers();
    const user = users.find(u => u.username === credentials.username);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Compare passwords
    const isMatch = await bcrypt.compare(credentials.password, user.password_hash);
    
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }
    
    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    
    return {
      user: {
        player_id: user.player_id,
        username: user.username,
        name: user.name,
        preferences: user.preferences
      },
      tokens: {
        token,
        refreshToken
      }
    };
  } catch (error) {
    logger.error(`Error logging in user: ${error.message}`);
    throw error;
  }
}

/**
 * Changes a user's password
 * @param {Number} player_id - Player ID
 * @param {String} oldPassword - Old password
 * @param {String} newPassword - New password
 * @returns {Boolean} Success or failure
 */
async function changePassword(player_id, oldPassword, newPassword) {
  try {
    // Get user account
    const user = await userAccountModel.getUserAccountById(player_id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    
    if (!isMatch) {
      throw new Error('Invalid current password');
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    
    // Update user account
    await userAccountModel.updateUserAccount(player_id, {
      password_hash: passwordHash
    });
    
    return true;
  } catch (error) {
    logger.error(`Error changing password: ${error.message}`);
    throw error;
  }
}

/**
 * Updates a user's preferences
 * @param {Number} player_id - Player ID
 * @param {Object} preferences - User preferences
 * @returns {Object} Updated user account
 */
async function updateUserPreferences(player_id, preferences) {
  try {
    // Get user account
    const user = await userAccountModel.getUserAccountById(player_id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Merge existing preferences with new ones
    const mergedPreferences = {
      ...(user.preferences || {}),
      ...preferences
    };
    
    // Update user account
    const updatedUser = await userAccountModel.updateUserAccount(player_id, {
      preferences: mergedPreferences
    });
    
    return {
      player_id: updatedUser.player_id,
      username: updatedUser.username,
      name: updatedUser.name,
      preferences: updatedUser.preferences
    };
  } catch (error) {
    logger.error(`Error updating user preferences: ${error.message}`);
    throw error;
  }
}

/**
 * Refreshes an access token using a refresh token
 * @param {String} refreshToken - Refresh token
 * @returns {Object} New tokens
 */
async function refreshToken(refreshToken) {
  try {
    // Verify refresh token
    const decoded = await verifyRefreshToken(refreshToken);
    
    if (!decoded) {
      throw new Error('Invalid refresh token');
    }
    
    // Get user account
    const user = await userAccountModel.getUserAccountById(decoded.id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Generate new tokens
    const token = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);
    
    return {
      token,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    logger.error(`Error refreshing token: ${error.message}`);
    throw error;
  }
}

module.exports = {
  registerUser,
  loginUser,
  verifyToken,
  changePassword,
  updateUserPreferences,
  refreshToken
};

/**
 * @module AuthService
 * @description Service for user authentication, registration, and token management
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userAccountModel = require('../../models/userAccount');
const logger = require('../../utils/logger').logger;

// JWT secret key - should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'torn-dashboard-secret-key';
const JWT_EXPIRATION = '24h';
const SALT_ROUNDS = 10;

/**
 * Register a new user
 * @param {Object} userData - User data
 * @param {number} userData.player_id - Torn player ID
 * @param {string} userData.name - User's name
 * @param {string} userData.username - Username for login
 * @param {string} userData.password - Password (will be hashed)
 * @param {Object} [userData.preferences] - User preferences
 * @returns {Promise<Object>} Created user (without password)
 * @throws {Error} If user already exists or username is taken
 */
async function registerUser(userData) {
  try {
    // Check if user already exists by player_id
    const existingUserById = await userAccountModel.getUserAccountById(userData.player_id);
    if (existingUserById) {
      throw new Error(`User with player ID ${userData.player_id} already exists`);
    }
    
    // Check if username is already taken
    const existingUserByName = await userAccountModel.getUserAccountByUsername(userData.username);
    if (existingUserByName) {
      throw new Error(`Username "${userData.username}" is already taken`);
    }
    
    // Validate password complexity
    if (!userData.password || userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    // Hash the password with bcrypt
    const password_hash = await bcrypt.hash(userData.password, SALT_ROUNDS);
    
    // Create the user account
    const user = await userAccountModel.createUserAccount({
      player_id: userData.player_id,
      name: userData.name,
      username: userData.username,
      password_hash,
      preferences: userData.preferences || {},
      raw_data: { player_id: userData.player_id, name: userData.name }
    });
    
    // Remove sensitive data before returning
    const { password_hash: _, ...userWithoutPassword } = user;
    
    logger.info(`User registered: ${userData.username} (ID: ${userData.player_id})`);
    return userWithoutPassword;
  } catch (error) {
    logger.error(`Error registering user: ${error.message}`);
    throw error;
  }
}

/**
 * Login a user
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.username - Username
 * @param {string} credentials.password - Password
 * @returns {Promise<Object>} Token and user data
 * @throws {Error} If credentials are invalid
 */
async function loginUser(credentials) {
  try {
    // Validate input
    if (!credentials.username || !credentials.password) {
      throw new Error('Username and password are required');
    }
    
    // Find user by username - more efficient than getting all users
    const user = await userAccountModel.getUserAccountByUsername(credentials.username);
    
    // If user not found, throw error with generic message for security
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
    if (!isPasswordValid) {
      logger.warn(`Failed login attempt for user: ${credentials.username}`);
      throw new Error('Invalid credentials');
    }
    
    // Generate both access and refresh tokens
    const tokens = generateTokens(user);
    
    // Remove sensitive data before returning
    const { password_hash, ...userWithoutPassword } = user;
    
    logger.info(`User logged in: ${credentials.username} (ID: ${user.player_id})`);
    return {
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: userWithoutPassword
    };
  } catch (error) {
    logger.error(`Error logging in user: ${error.message}`);
    throw error;
  }
}
/**
 * Verify a JWT token
 * @param {string} token - JWT token
 * @returns {Promise<Object>} User data
 * @throws {Error} If token is invalid or user not found
 */
async function verifyToken(token) {
  try {
    if (!token) {
      throw new Error('Token is required');
    }
    
    // Verify token and catch specific JWT errors
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      // Provide more specific error messages based on JWT error type
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new Error('Authentication token has expired');
      } else if (jwtError instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid authentication token');
      } else {
        throw jwtError;
      }
    }
    
    // Get user data
    const user = await userAccountModel.getUserAccountById(decoded.player_id);
    if (!user) {
      logger.warn(`Token verification failed: User with ID ${decoded.player_id} not found`);
      throw new Error('User not found');
    }
    
    // Remove sensitive data before returning
    const { password_hash, ...userWithoutPassword } = user;
    
    return userWithoutPassword;
  } catch (error) {
    logger.error(`Error verifying token: ${error.message}`);
    throw error;
  }
}

/**
 * Update user preferences
 * @param {number} player_id - User ID
 * @param {Object} preferences - User preferences
 * @returns {Promise<Object>} Updated user
 * @throws {Error} If user not found
 */
async function updateUserPreferences(player_id, preferences) {
  try {
    // Check if user exists
    const user = await userAccountModel.getUserAccountById(player_id);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Merge with existing preferences if they exist
    const updatedPreferences = {
      ...(user.preferences || {}),
      ...preferences
    };
    
    // Update preferences
    const updatedUser = await userAccountModel.updateUserAccount(player_id, {
      preferences: updatedPreferences
    });
    
    // Remove sensitive data before returning
    const { password_hash, ...userWithoutPassword } = updatedUser;
    
    logger.info(`Updated preferences for user ID: ${player_id}`);
    return userWithoutPassword;
  } catch (error) {
    logger.error(`Error updating user preferences: ${error.message}`);
    throw error;
  }
}

/**
 * Change user password
 * @param {number} player_id - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} Success indicator
 * @throws {Error} If user not found or current password is invalid
async function changePassword(player_id, currentPassword, newPassword) {
  try {
    // Validate input
    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required');
    }
    
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }
    
    // Get user account
    const user = await userAccountModel.getUserAccountById(player_id);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isPasswordValid) {
      logger.warn(`Failed password change attempt for user ID: ${player_id}`);
      throw new Error('Current password is incorrect');
    }

    // Check if new password is the same as current
    if (currentPassword === newPassword) {
      throw new Error('New password must be different from current password');
    }

    // Hash the new password
    const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // Update the user's password
    await userAccountModel.updateUserAccount(player_id, { password_hash });

    logger.info(`Password changed successfully for user ID: ${player_id}`);
    return true;
  } catch (error) {
    logger.error(`Error changing password: ${error.message}`);
    throw error;
  }
}

/**
 * Refresh user token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New access token and refresh token
 * @throws {Error} If token is invalid
 */
async function refreshToken(refreshToken) {
  try {
    // Validate input
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token has expired, please login again');
      } else {
        throw new Error('Invalid refresh token');
      }
    }

    // Check if the token is a refresh token
    if (!decoded.refresh) {
      throw new Error('Invalid refresh token');
    }

    // Get user data
    const user = await userAccountModel.getUserAccountById(decoded.player_id);
    if (!user) {
      logger.warn(`Token refresh failed: User with ID ${decoded.player_id} not found`);
      throw new Error('User not found');
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        player_id: user.player_id,
        username: user.username
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRATION
      }
    );

    // Generate new refresh token
    const newRefreshToken = jwt.sign(
      {
        player_id: user.player_id,
        username: user.username,
        refresh: true
      },
      JWT_SECRET,
      {
        expiresIn: '7d' // Refresh tokens last longer
      }
    );

    logger.info(`Token refreshed for user: ${user.username} (ID: ${user.player_id})`);
    return {
      accessToken,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    logger.error(`Error refreshing token: ${error.message}`);
    throw error;
  }
}

/**
 * Generate tokens for user
 * @param {Object} user - User data
 * @returns {Object} Access token and refresh token
 */
function generateTokens(user) {
  // Validate input
  if (!user || !user.player_id || !user.username) {
    throw new Error('Valid user data is required to generate tokens');
  }

  // Generate access token
  const accessToken = jwt.sign(
    {
      player_id: user.player_id,
      username: user.username
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRATION
    }
  );

  // Generate refresh token with longer expiration
  const refreshToken = jwt.sign(
    {
      player_id: user.player_id,
      username: user.username,
      refresh: true // Flag to identify refresh tokens
    },
    JWT_SECRET,
    {
      expiresIn: '7d' // Refresh tokens last longer
    }
  );

  return {
    accessToken,
    refreshToken
  };
}

/**
 * Validate user input for registration
 * @param {Object} userData - User data
 * @returns {Object|Error} Validated user data or throws error
 */
function validateUserRegistration(userData) {
  // Check required fields
  if (!userData.player_id || !userData.username || !userData.password) {
    throw new Error('Player ID, username, and password are required');
  }

  // Validate player_id is a number
  if (isNaN(userData.player_id)) {
    throw new Error('Player ID must be a number');
  }

  // Validate username format
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(userData.username)) {
    throw new Error('Username must be 3-20 characters and contain only letters, numbers, and underscores');
  }

  // Validate password complexity
  if (userData.password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Additional password complexity requirements if needed
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(userData.password)) {
    throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
  }

  return userData;
}

// Export all auth service methods
module.exports = {
  registerUser,
  loginUser,
  verifyToken,
  updateUserPreferences,
  changePassword,
  refreshToken,
  generateTokens,
  validateUserRegistration
};
