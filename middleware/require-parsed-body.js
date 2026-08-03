/**
 * Guard against an unparsed request body.
 *
 * express 5 leaves `req.body` `undefined` when no body-parser matched — a
 * POST/PUT/PATCH with a missing/unsupported `Content-Type`, or no body at all —
 * whereas express 4 defaulted it to `{}`. Handlers under `api/` destructure
 * `req.body` directly, so without this guard such a request throws
 * (`Cannot destructure property … of undefined`) and surfaces as a 500 from the
 * error handler instead of a 400 — the wrong status, and an easy unauthenticated
 * way to generate server errors.
 *
 * Convention: any body-carrying method whose body wasn't parsed → **400**. We use
 * 400 uniformly (rather than splitting 400 vs 415 on Content-Type) so callers get
 * one predictable "fix your request body" signal. Valid parsed bodies — including
 * `{}` for an empty JSON payload — pass through untouched; no-body methods
 * (GET/DELETE/HEAD/OPTIONS) are ignored.
 *
 * Version-agnostic: on express 4 `req.body` is always defined so this is a no-op;
 * on express 5 it converts the 500 into a 400. Mount it after the body parsers
 * and before the routers.
 */
const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

function requireParsedBody(req, res, next) {
  if (BODY_METHODS.has(req.method) && req.body === undefined) {
    return res.status(400).json({ error: 'malformed or missing request body' });
  }
  return next();
}

module.exports = { requireParsedBody };
