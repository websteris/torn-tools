'use strict';

// CSRF defense for cookie-session state-changing requests (#49, CodeQL alert 19,
// js/missing-token-validation). Since #41 the session rides an httpOnly cookie
// the browser attaches automatically, so a hostile page could forge
// POST/PUT/DELETE against the API. The cookie is already `sameSite:'strict'`;
// this adds explicit server-side origin validation as defense-in-depth (and the
// validation CodeQL looks for) by confirming a state-changing request actually
// came from our own app:
//
//   - Sec-Fetch-Site: set by the browser and NOT forgeable by page JS. `same-origin`
//     and `none` (address-bar / bookmark) pass; `same-site`/`cross-site` are blocked.
//   - Origin (fallback for browsers without Sec-Fetch metadata): must be in the
//     configured allowlist (CORS_ORIGIN).
//   - Neither header present: a browser CSRF attack always carries one of them, so
//     a request with neither is a non-browser/API client, not a CSRF vector — allowed
//     (this keeps server-to-server callers and existing tests working).

const { forbidden } = require('./errors');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Origins the app itself is served from — same source as the CORS config so the
// two can't drift. Comma-separated list supported (see README).
function allowedOrigins() {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:8080';
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

// Rejections flow through the central errorHandler (#40) so the 403 leaves in
// the single { success:false, error:{ code:'FORBIDDEN', message } } envelope.
function blocked(next) {
  return next(forbidden('Cross-site request blocked'));
}

function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const site = req.get('sec-fetch-site');
  if (site) {
    return (site === 'same-origin' || site === 'none') ? next() : blocked(next);
  }

  const origin = req.get('origin');
  if (origin) {
    return allowedOrigins().includes(origin) ? next() : blocked(next);
  }

  // No browser-set cross-site signal → not a forgeable CSRF request.
  return next();
}

module.exports = { verifyCsrf, allowedOrigins, SAFE_METHODS };
