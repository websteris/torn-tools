'use strict';

// One error taxonomy for the whole API (#40). Before this, error responses came
// in three shapes ({status:'error',...}, {success:false,message}, and a leaking
// {error: error.message}) with no machine-readable codes. Now every error — from
// a route, a middleware, the 404 handler, or an unexpected throw — is emitted by
// the central errorHandler in the single envelope:
//
//   { success: false, error: { code, message } }        // + `field` for validation
//
// Handlers/middleware signal an error by throwing (Express 5 forwards thrown/
// rejected async errors to the error middleware) or calling next() with an
// AppError; they never hand-roll res.status(...).json(...) for errors.

const { logger } = require('../utils/logger');

// Stable, machine-readable codes → HTTP status. Clients branch on `code`, not prose.
const ERROR_CODES = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  TORN_API_ERROR: 502,
  INTERNAL: 500,
};

// Generic client-facing messages for 5xx — the raw cause is logged server-side,
// never returned (no DB/crypto internals leak to the client).
const GENERIC_5XX = {
  INTERNAL: 'Internal server error',
  TORN_API_ERROR: 'Upstream Torn API error',
};

class AppError extends Error {
  /**
   * @param {string} code - one of ERROR_CODES
   * @param {string} [message] - client-facing message (4xx) / logged cause (5xx)
   * @param {object} [opts]
   * @param {string} [opts.field] - offending field, for VALIDATION_ERROR
   */
  constructor(code, message, opts = {}) {
    super(message || code);
    this.name = 'AppError';
    this.code = ERROR_CODES[code] ? code : 'INTERNAL';
    this.status = ERROR_CODES[this.code];
    if (opts.field !== undefined) this.field = opts.field;
  }
}

// Typed factories — routes/middleware use these instead of new AppError(...).
const validationError = (message, field) => new AppError('VALIDATION_ERROR', message, { field });
const unauthenticated = (message = 'Authentication required') => new AppError('UNAUTHENTICATED', message);
const forbidden = (message = 'Forbidden') => new AppError('FORBIDDEN', message);
const notFound = (message = 'Resource not found') => new AppError('NOT_FOUND', message);
const rateLimited = (message = 'Too many requests') => new AppError('RATE_LIMITED', message);
const tornApiError = (message = 'Upstream Torn API error') => new AppError('TORN_API_ERROR', message);
const internal = (message = 'Internal server error') => new AppError('INTERNAL', message);

// Central error middleware — MUST be mounted last (after the routers). Every error
// funnels here and leaves as the single envelope.
function errorHandler(err, req, res, next) {
  // A body-parser failure (malformed JSON WITH Content-Type: application/json)
  // lands here as a thrown error, not an AppError — normalise it to a 400.
  if (err && err.type === 'entity.parse.failed') {
    err = validationError('malformed or missing request body');
  }

  const appErr = err instanceof AppError ? err : internal(err && err.message);

  if (res.headersSent) return next(err);

  if (appErr.status >= 500) {
    // Log the real cause; return only a generic message + code.
    logger.error(`[${appErr.code}] ${err && err.message}`, { stack: err && err.stack });
    return res.status(appErr.status).json({
      success: false,
      error: { code: appErr.code, message: GENERIC_5XX[appErr.code] || 'Internal server error' },
    });
  }

  const error = { code: appErr.code, message: appErr.message };
  if (appErr.field !== undefined) error.field = appErr.field;
  return res.status(appErr.status).json({ success: false, error });
}

// 404 for any unmatched API route — funnels through the same envelope.
function notFoundHandler(req, res, next) {
  next(notFound(`API endpoint not found: ${req.method} ${req.originalUrl}`));
}

module.exports = {
  AppError,
  ERROR_CODES,
  errorHandler,
  notFoundHandler,
  validationError,
  unauthenticated,
  forbidden,
  notFound,
  rateLimited,
  tornApiError,
  internal,
};
