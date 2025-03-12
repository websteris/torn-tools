/**
 * Request Handler for Torn API Client
 * 
 * Handles HTTP requests with retries, rate limiting, and
 * response processing.
 */

const axios = require('axios');
const { TornApiError, isRetryableError } = require('./error-handler');

// Rate limiter implementation using token bucket algorithm
class RateLimiter {
  /**
   * Create a new rate limiter
   * 
   * @param {number} limit - Maximum requests per minute
   */
  constructor(limit) {
    this.limit = limit;
    this.tokens = limit;
    this.lastRefill = Date.now();
    this.interval = 60 * 1000; // 1 minute in milliseconds
  }

  /**
   * Check if a request can be made
   * 
   * @returns {boolean} True if request can be made
   */
  canMakeRequest() {
    this.refillTokens();
    return this.tokens >= 1;
  }

  /**
   * Consume a token for a request
   * 
   * @returns {boolean} True if token consumed
   */
  consumeToken() {
    if (this.canMakeRequest()) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Refill tokens based on elapsed time
   */
  refillTokens() {
    const now = Date.now();
    const elapsedTime = now - this.lastRefill;
    
    if (elapsedTime > 0) {
      // Calculate tokens to add based on elapsed time
      const tokensToAdd = Math.floor((elapsedTime / this.interval) * this.limit);
      
      if (tokensToAdd > 0) {
        this.tokens = Math.min(this.limit, this.tokens + tokensToAdd);
        this.lastRefill = now;
      }
    }
  }

  /**
   * Get time until next token is available (in ms)
   * 
   * @returns {number} Time in milliseconds
   */
  getTimeUntilNextToken() {
    if (this.tokens >= 1) return 0;
    
    // Calculate time for 1 token
    const timePerToken = this.interval / this.limit;
    return timePerToken;
  }
}

class RequestHandler {
  /**
   * Create a new request handler
   * 
   * @param {Object} options - Handler options
   * @param {string} options.baseUrl - API base URL
   * @param {string} options.apiKey - Torn API key
   * @param {number} [options.maxRetries=3] - Maximum retry attempts
   * @param {number} [options.timeout=10000] - Request timeout in ms
   * @param {number} [options.rateLimit=100] - Rate limit per minute
   */
  constructor(options) {
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
    this.maxRetries = options.maxRetries || 3;
    this.timeout = options.timeout || 10000;
    
    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(options.rateLimit || 100);

    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Build URL with parameters
   * 
   * @param {string} endpoint - API endpoint
   * @param {string|number} id - Resource ID
   * @param {string[]} [selections] - Data selections
   * @returns {string} Full URL
   */
  buildUrl(endpoint, id, selections = []) {
    let url = `/${endpoint}/${id}`;
    
    // Add query parameters
    const params = new URLSearchParams();
    params.append('key', this.apiKey);
    
    if (selections && selections.length > 0) {
      params.append('selections', selections.join(','));
    }
    
    return `${url}?${params.toString()}`;
  }

  /**
   * Execute API request with retries and rate limiting
   * 
   * @param {string} endpoint - API endpoint
   * @param {string|number} id - Resource ID
   * @param {string[]} [selections] - Data selections
   * @returns {Promise<Object>} API response
   */
  async makeRequest(endpoint, id, selections = []) {
    let retries = 0;
    
    while (true) {
      // Check rate limiting
      if (!this.rateLimiter.consumeToken()) {
        const waitTime = this.rateLimiter.getTimeUntilNextToken();
        await new Promise(resolve => setTimeout(resolve, waitTime));

