/**
 * require-parsed-body — reject requests whose body could not be parsed.
 *
 * Express 5 leaves `req.body` `undefined` when no body-parser matched (a
 * POST/PUT/PATCH with a missing/unsupported Content-Type, or no body at all),
 * whereas Express 4 defaulted it to `{}`. Route handlers under `api/` destructure
 * `req.body` directly, so an unparsed body would throw and surface as a **500**
 * from the error handler — the wrong status, and an easy unauthenticated way to
 * generate server errors.
 *
 * Convention: on body-carrying methods (POST/PUT/PATCH), an `undefined` body is
 * rejected as **400** ("malformed or missing request body"). Valid parsed bodies
 * — including an empty JSON object `{}` — are left untouched, as are methods that
 * don't carry a body (GET/DELETE/HEAD/OPTIONS). Mount it after the body parsers
 * and before the routers.
 */
function requireParsedBody(req, res, next) {
  const carriesBody =
    req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH';
  if (carriesBody && req.body === undefined) {
    return res.status(400).json({ error: 'malformed or missing request body' });
  }
  return next();
}

module.exports = requireParsedBody;
