'use strict';

// Inbound rate limiting. There is otherwise none — only the OUTBOUND Torn API
// client throttles (that protects Torn's quota, not this server). Two tiers:
//
//  - strict:  unauthenticated credential endpoints (/api/auth/login, /register)
//             and the unauthenticated Torn-API proxy (/api/test/*). These accept a
//             raw API key and/or fan out to the Torn API, so a brute-forcer both
//             hammers auth and drains the shared outbound quota. Low per-IP budget.
//  - general: every other /api route (incl. the Torn-API-fanout data / keys-verify
//             / faction-tracker routes). Moderate per-IP budget.
//
// Thresholds come from env with documented defaults (.env.example). Under
// NODE_ENV=test the defaults are effectively unlimited so the suite isn't tripped;
// the dedicated limiter tests set a low max explicitly to exercise the 429 path.

const rateLimit = require('express-rate-limit');

const TEST = process.env.NODE_ENV === 'test';
const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

const WINDOW_MS = int(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000); // 15 minutes
const STRICT_MAX = int(process.env.RATE_LIMIT_STRICT_MAX, TEST ? 1_000_000 : 10);
const GENERAL_MAX = int(process.env.RATE_LIMIT_MAX, TEST ? 1_000_000 : 100);

function make(limit) {
  return rateLimit({
    windowMs: WINDOW_MS,
    limit,
    standardHeaders: true, // emit RateLimit-* headers
    legacyHeaders: false,
    // Match the app's single JSON error envelope (#40): { success, error{code,message} }.
    handler: (req, res) => res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests — slow down and try again later.' },
    }),
  });
}

module.exports = {
  strictLimiter: make(STRICT_MAX),
  generalLimiter: make(GENERAL_MAX),
  // exposed for tests / diagnostics
  _config: { WINDOW_MS, STRICT_MAX, GENERAL_MAX },
};
