/**
 * @module Logger
 * @description Logging utility for consistent logging throughout the application
 */

// Simple logger implementation
// In a production app, you might want to use a more robust solution like winston or pino

/**
 * Format a log message with timestamp and level
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} [data] - Additional data to log
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, message, data) {
  const timestamp = new Date().toISOString();
  let formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    try {
      formattedMessage += ` ${JSON.stringify(data)}`;
    } catch (error) {
      formattedMessage += ` [Error stringifying data: ${error.message}]`;
    }
  }
  
  return formattedMessage;
}

/**
 * Log a message to the console
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} [data] - Additional data to log
 */
function log(level, message, data) {
  const formattedMessage = formatLogMessage(level, message, data);
  
  switch (level.toLowerCase()) {
    case 'error':
      console.error(formattedMessage);
      break;
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'info':
      console.info(formattedMessage);
      break;
    case 'debug':
      console.debug(formattedMessage);
      break;
    default:
      console.log(formattedMessage);
  }
}

// Logger instance
const logger = {
  error: (message, data) => log('error', message, data),
  warn: (message, data) => log('warn', message, data),
  info: (message, data) => log('info', message, data),
  debug: (message, data) => log('debug', message, data),
  log: (message, data) => log('log', message, data)
};

// Export logger
module.exports = {
  logger
};
