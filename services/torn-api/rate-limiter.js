const logger = require('../../utils/logger');

/**
 * TokenBucket implementation for rate limiting API requests
 * Uses the token bucket algorithm to manage request rates
 */
class RateLimiter {
  /**
   * Creates a new rate limiter
   * @param {number} maxTokens - Maximum number of tokens in bucket (max requests in burst)
   * @param {number} refillRate - Rate of token refill per second
   * @param {number} refillInterval - Interval in ms at which tokens are added
   */
  constructor(maxTokens = 100, refillRate = 10, refillInterval = 1000) {
    // Validate input parameters
    if (maxTokens <= 0 || refillRate <= 0 || refillInterval <= 0) {
      throw new Error('Rate limiter parameters must be positive numbers');
    }

    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.refillInterval = refillInterval;
    this.tokens = maxTokens; // Start with a full bucket
    this.lastRefillTimestamp = Date.now();
    
    // Lock to protect against concurrent access to tokens
    this.lock = false;
    
    logger.info(`Rate limiter initialized with max ${maxTokens} tokens, refill rate ${refillRate}/s`);
  }

  /**
   * Refills the token bucket based on elapsed time since last refill
   * @private
   */
  _refillTokens() {
    const now = Date.now();
    const elapsedMs = now - this.lastRefillTimestamp;
    
    if (elapsedMs < this.refillInterval) {
      return; // Not enough time has passed to add tokens
    }
    
    // Calculate how many tokens to add based on elapsed time
    const tokensToAdd = (elapsedMs / 1000) * this.refillRate;
    
    // Update tokens (never exceed max capacity)
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTimestamp = now;
    
    logger.debug(`Token bucket refilled with ${tokensToAdd.toFixed(2)} tokens, now ${this.tokens.toFixed(2)}`);
  }

  /**
   * Acquires the internal lock to ensure thread safety
   * @private
   * @returns {Promise<void>}
   */
  async _acquireLock() {
    // Simple spin lock with timeout
    const startTime = Date.now();
    const TIMEOUT = 5000; // 5 seconds timeout
    
    while (this.lock) {
      if (Date.now() - startTime > TIMEOUT) {
        throw new Error('Timeout acquiring rate limiter lock');
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    this.lock = true;
  }

  /**
   * Releases the internal lock
   * @private
   */
  _releaseLock() {
    this.lock = false;
  }

  /**
   * Checks if a request can be made and consumes a token if available
   * @param {number} [tokensToConsume=1] - Number of tokens to consume
   * @returns {Promise<boolean>} True if the request can proceed, false if rate limited
   */
  async tryAcquire(tokensToConsume = 1) {
    try {
      if (tokensToConsume <= 0) {
        throw new Error('Tokens to consume must be greater than zero');
      }
      
      await this._acquireLock();
      
      try {
        // Refill tokens based on elapsed time
        this._refillTokens();
        
        // Check if we have enough tokens
        if (this.tokens < tokensToConsume) {
          logger.warn(`Rate limit exceeded: ${this.tokens.toFixed(2)} tokens available, ${tokensToConsume} required`);
          return false;
        }
        
        // Consume tokens and allow request
        this.tokens -= tokensToConsume;
        logger.debug(`Consumed ${tokensToConsume} token(s), ${this.tokens.toFixed(2)} remaining`);
        return true;
      } finally {
        this._releaseLock();
      }
    } catch (error) {
      logger.error(`Error in rate limiter: ${error.message}`);
      // In case of error, we allow the request to proceed to avoid blocking the system
      return true;
    }
  }

  /**
   * Gets the current number of tokens in the bucket
   * @returns {Promise<number>} The current number of tokens
   */
  async getAvailableTokens() {
    try {
      await this._acquireLock();
      
      try {
        this._refillTokens();
        return this.tokens;
      } finally {
        this._releaseLock();
      }
    } catch (error) {
      logger.error(`Error getting available tokens: ${error.message}`);
      return 0;
    }
  }

  /**
   * Resets the token bucket to full capacity
   * @returns {Promise<void>}
   */
  async reset() {
    try {
      await this._acquireLock();
      
      try {
        this.tokens = this.maxTokens;
        this.lastRefillTimestamp = Date.now();
        logger.info(`Rate limiter reset to max capacity (${this.maxTokens} tokens)`);
      } finally {
        this._releaseLock();
      }
    } catch (error) {
      logger.error(`Error resetting rate limiter: ${error.message}`);
    }
  }

  /**
   * Waits until tokens are available and then consumes them
   * @param {number} [tokensToConsume=1] - Number of tokens to consume
   * @param {number} [maxWaitMs=30000] - Maximum time to wait in milliseconds
   * @returns {Promise<boolean>} True if tokens were acquired, false if timed out
   */
  async waitAndAcquire(tokensToConsume = 1, maxWaitMs = 30000) {
    try {
      if (tokensToConsume <= 0) {
        throw new Error('Tokens to consume must be greater than zero');
      }
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWaitMs) {
        const acquired = await this.tryAcquire(tokensToConsume);
        
        if (acquired) {
          return true;
        }
        
        // Calculate how long we need to wait for at least one token
        const secondsToWait = tokensToConsume / this.refillRate;
        const waitMs = Math.min(secondsToWait * 1000, 1000); // Cap at 1 second
        
        logger.debug(`Waiting ${waitMs}ms for rate limit to refresh`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
      
      logger.warn(`Timeout waiting for rate limit: waited ${maxWaitMs}ms`);
      return false;
    } catch (error) {
      logger.error(`Error in waitAndAcquire: ${error.message}`);
      return false;
    }
  }
}

module.exports = RateLimiter;

'use strict';

const logger = require('../../utils/logger');

/**
 * RateLimiter - Token bucket implementation for API rate limiting
 */
class RateLimiter {
  /**
   * RateLimiter constructor
   * @param {number} limit - Maximum requests allowed in the interval
   * @param {number} interval - Time interval in milliseconds
   */
  constructor(limit, interval) {
    this.limit = limit;
    this.interval = interval;
    this.tokens = limit;
    this.lastRefill = Date.now();
    this.logger = logger.child({ component: 'RateLimiter' });
    this.queue = [];
  }
  
  /**
   * Refill tokens based on time elapsed
   * @private
   */
  _refillTokens() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    
    if (elapsed >= this.interval) {
      // If a full interval has passed, reset to full capacity
      this.tokens = this.limit;
      this.lastRefill = now;
    } else {
      // Otherwise, add proportional number of tokens
      const tokensToAdd = Math.floor((elapsed / this.interval) * this.limit);
      if (tokensToAdd > 0) {
        this.tokens = Math.min(this.limit, this.tokens + tokensToAdd);
        this.lastRefill += Math.floor((tokensToAdd / this.limit) * this.interval);
      }
    }
  }
  
  /**
   * Acquire a token, waiting if necessary
   * @returns {Promise<void>} Resolves when a token is available
   */
  acquire() {
    return new Promise(resolve => {
      this._refillTokens();
      
      if (this.tokens > 0) {
        this.tokens--;
        resolve();
      } else {
        // Calculate wait time until next token is available
        const waitTime = Math.ceil(this.interval / this.limit);
        this.logger.debug(`Rate limit reached, waiting ${waitTime}ms for next token`);
        
        // Queue this request
        this.queue.push(resolve);
        
        // Schedule processing

