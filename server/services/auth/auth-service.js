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
 * @throws {Error} If user already exists
 */
async function registerUser(userData) {
  try {
    // Check if user already exists
    const existingUser = await userAccountModel.getUserAccountById(userData.player_id);
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    // Hash the password
    const password_hash = await bcrypt.hash(userData.password, SALT_ROUNDS);
    
    // Create the user
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
    // Find user by username
    const users = await userAccountModel.getAllUsers();
    const user = users.find(u => u.username === credentials.username);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { player_id: user.player_id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRATION }
    );
    
    // Remove sensitive data before returning
    const { password_hash, ...userWithoutPassword } = user;
    
    logger.info(`User logged in: ${credentials.username} (ID: ${user.player_id})`);
    return {
      token,
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
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user data
    const user = await userAccountModel.getUserAccountById(decoded.player_id);
    if (!user) {
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
    
    // Update preferences
    const updatedUser = await userAccountModel.updateUserAccount(player_id, {
      preferences
    });
    
    logger.info(`Updated preferences for user ID: ${player_id}`);
    return updatedUser;
  } catch (error) {
    logger.error(`Error updating user preferences: ${error.message}`);
    throw error;
  }
}

module.exports = {
  registerUser,
  loginUser,
  verifyToken,
  updateUserPreferences
};
