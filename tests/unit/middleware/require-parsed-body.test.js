/**
 * @jest-environment node
 */

const { requireParsedBody } = require('../../../middleware/require-parsed-body');

// Regression tests for issue #28 (Orion): express 5 leaves req.body undefined
// when no body-parser matched, so a body-carrying request must 400 here rather
// than reach a handler that destructures req.body and 500s. Drives the guard
// with an explicit `body: undefined` so it holds regardless of the installed
// express version (on express 4 the body is always defined -> the guard is a
// no-op; these cases simulate express 5's behavior directly).
describe('Module: requireParsedBody middleware', () => {
  let req, res, next;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  function make(method, body) {
    return { method, body };
  }

  test.each(['POST', 'PUT', 'PATCH'])(
    '%s with an unparsed (undefined) body -> 400, never reaches the route',
    (method) => {
      requireParsedBody(make(method, undefined), res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'malformed or missing request body' });
      expect(next).not.toHaveBeenCalled();
    }
  );

  test('POST with a parsed empty object ({}) passes through untouched', () => {
    const body = {};
    requireParsedBody(make('POST', body), res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('POST with a valid parsed body passes through untouched', () => {
    requireParsedBody(make('POST', { apiKey: 'x', keyName: 'y' }), res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test.each(['GET', 'DELETE', 'HEAD', 'OPTIONS'])(
    '%s (no-body method) is ignored even when body is undefined',
    (method) => {
      requireParsedBody(make(method, undefined), res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    }
  );
});
