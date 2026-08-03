'use strict';

// Per-route request validation (#38). #28 fixed the transport (an unparsed body
// 400s instead of 500ing); this validates the *parsed* values against a schema so
// a handler can trust its inputs — a bad type/range is rejected with a 400 naming
// the field, and never reaches the service layer.
//
// `validate({ params, body, query })` — each is an optional zod schema. On the
// first failure it forwards a VALIDATION_ERROR to the central error handler (#40),
// which emits the single { success:false, error:{ code, message, field } } envelope.
// Note: we validate in place and don't reassign req.query (a read-only getter in
// express 5) — handlers keep reading the (now-validated) values.

const { z } = require('zod');
const { validationError } = require('./errors');

function validate(schemas) {
  return (req, res, next) => {
    for (const key of ['params', 'query', 'body']) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        const issue = result.error.issues[0];
        const field = issue.path.length ? issue.path.join('.') : key;
        return next(validationError(`${field}: ${issue.message}`, field));
      }
    }
    return next();
  };
}

module.exports = { validate, z };
