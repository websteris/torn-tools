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
 *
 * `bodyParseErrorHandler` covers the second half of the same bug: a body that IS
 * routed to a parser but fails to parse (e.g. malformed JSON sent WITH
 * `Content-Type: application/json`) makes body-parser throw
 * (`type: 'entity.parse.failed'`, `status: 400`) — that error never reaches
 * `requireParsedBody`; it lands in the app's error-handling chain, where the
 * generic catch-all would turn it into a 500. Mount `bodyParseErrorHandler`
 * after the routers and BEFORE the generic error handler so parse failures get
 * the same uniform 400.
 */
const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);
const BODY_ERROR = { error: 'malformed or missing request body' };

function requireParsedBody(req, res, next) {
  if (BODY_METHODS.has(req.method) && req.body === undefined) {
    return res.status(400).json(BODY_ERROR);
  }
  return next();
}

function bodyParseErrorHandler(err, req, res, next) {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json(BODY_ERROR);
  }
  return next(err);
}

module.exports = { requireParsedBody, bodyParseErrorHandler };
