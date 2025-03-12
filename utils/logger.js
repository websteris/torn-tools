/**
 * Logger configuration module
 * 
 * This module sets up a singleton Winston logger with appropriate transports, formats, and levels.
 * It provides a unified API for logging across both test and production environments.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Define log directory with fallback paths for different environments
const LOG_DIR = path.join(process.cwd(), 'logs');

// Create log directory if it doesn't exist
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch (error) {
  console.error(`Error creating log directory: ${error.message}`);
}

// Define log format with enhanced metadata support
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, component = '', ...metadata }) => {
    const metadataStr = Object.keys(metadata).length > 0 && 
                        metadata.service !== 'torn-dashboard' ? 
                        ` ${JSON.stringify(metadata)}` : '';
    
    const componentPrefix = component ? `[${component}] ` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${component ? ` [${component}]` : ''} ${message}${metadataStr}`;
  })
);

// Create singleton Winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'torn-dashboard' },
  transports: [
    // Console transport with colorization
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ],
  exitOnError: false
});

// Add file transports in non-test environments
if (process.env.NODE_ENV !== 'test') {
  logger.add(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  );
  
  logger.add(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
  
  // Handle uncaught exceptions
  logger.exceptions.handle(
    new winston.transports.File({ 
      filename: path.join(LOG_DIR, 'exceptions.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

/**
 * Creates a child logger with component context
 * @param {string} component - Component name to include in logs
 * @returns {object} Logger instance with component context
 */
function createLogger(component) {
  if (!component) return logger;
  
  const childLogger = logger.child({ component });
  
  // Create a simplified API that matches the existing usage in the codebase
  return {
    error: (message, meta = {}) => childLogger.error(message, meta),
    warn: (message, meta = {}) => childLogger.warn(message, meta),
    info: (message, meta = {}) => childLogger.info(message, meta),
    debug: (message, meta = {}) => childLogger.debug(message, meta),
    log: (message, meta = {}) => childLogger.info(message, meta),
    child: (subComponent) => createLogger(`${component}:${subComponent}`)
  };
}

// Create main logger API that's compatible with existing code
const loggerApi = {
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  log: (message, meta = {}) => logger.info(message, meta),
  
  // Allow direct access to the winston logger for advanced usage
  winston: logger,
  
  // Factory function for creating component-specific loggers
  createLogger,
  
  // Legacy API support
  child: createLogger
};

// Make logger compatible with both default and named imports
module.exports = loggerApi;
module.exports.default = loggerApi;
module.exports.logger = loggerApi;
