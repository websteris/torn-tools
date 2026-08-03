/**
 * @jest-environment node
 *
 * The error taxonomy foundation (#40): AppError code→status mapping and the
 * central errorHandler's single envelope { success:false, error:{ code, message } }.
 * The security-critical guarantee — a 5xx never returns the raw cause — is asserted
 * directly here (a plain thrown Error and an INTERNAL AppError both yield only a
 * generic message, with the real detail logged, not sent).
 */
process.env.NODE_ENV = 'test';

jest.mock('../../../utils/logger', () => ({
  logger: { error: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const { logger } = require('../../../utils/logger');
const {
  AppError, ERROR_CODES, errorHandler, notFoundHandler,
  validationError, unauthenticated, notFound, rateLimited, internal,
} = require('../../../middleware/errors');

function mockRes() {
  const res = { headersSent: false };
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

describe('AppError', () => {
  test('each code maps to its HTTP status', () => {
    expect(new AppError('VALIDATION_ERROR').status).toBe(400);
    expect(new AppError('UNAUTHENTICATED').status).toBe(401);
    expect(new AppError('FORBIDDEN').status).toBe(403);
    expect(new AppError('NOT_FOUND').status).toBe(404);
    expect(new AppError('RATE_LIMITED').status).toBe(429);
    expect(new AppError('TORN_API_ERROR').status).toBe(502);
    expect(new AppError('INTERNAL').status).toBe(500);
  });

  test('an unknown code degrades to INTERNAL/500', () => {
    const e = new AppError('NONSENSE', 'x');
    expect(e.code).toBe('INTERNAL');
    expect(e.status).toBe(500);
  });

  test('validationError carries the field', () => {
    expect(validationError('bad', 'factionId')).toMatchObject({ code: 'VALIDATION_ERROR', field: 'factionId' });
  });
});

describe('errorHandler emits the single envelope', () => {
  test('a 4xx AppError exposes its code + message (+field)', () => {
    const res = mockRes();
    errorHandler(validationError('factionId: expected int', 'factionId'), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'factionId: expected int', field: 'factionId' },
    });
  });

  test('NOT_FOUND / UNAUTHENTICATED / RATE_LIMITED pass their message through', () => {
    for (const [factory, code, status] of [
      [notFound('gone'), 'NOT_FOUND', 404],
      [unauthenticated('nope'), 'UNAUTHENTICATED', 401],
      [rateLimited('slow'), 'RATE_LIMITED', 429],
    ]) {
      const res = mockRes();
      errorHandler(factory, {}, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json.mock.calls[0][0].error.code).toBe(code);
    }
  });

  test('a 5xx AppError returns a GENERIC message and logs the real cause (no leak)', () => {
    const res = mockRes();
    errorHandler(internal('sqlite: no such column secret_material'), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body).toEqual({ success: false, error: { code: 'INTERNAL', message: 'Internal server error' } });
    expect(JSON.stringify(body)).not.toContain('secret_material');
    expect(logger.error).toHaveBeenCalled();
  });

  test('an unexpected (non-AppError) throw becomes a generic 500, cause not leaked', () => {
    const res = mockRes();
    errorHandler(new Error('ECONNREFUSED 10.0.0.5:5432'), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.error).toEqual({ code: 'INTERNAL', message: 'Internal server error' });
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
    expect(logger.error).toHaveBeenCalled();
  });

  test('a body-parser entity.parse.failed becomes a 400 VALIDATION_ERROR', () => {
    const res = mockRes();
    const parseErr = Object.assign(new Error('Unexpected token'), { type: 'entity.parse.failed' });
    errorHandler(parseErr, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0]).toEqual({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'malformed or missing request body' },
    });
  });

  test('if headers are already sent it delegates to next (no double-send)', () => {
    const res = mockRes();
    res.headersSent = true;
    const next = jest.fn();
    const err = internal('x');
    errorHandler(err, {}, res, next);
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('notFoundHandler', () => {
  test('forwards a NOT_FOUND naming the method + path', () => {
    const next = jest.fn();
    notFoundHandler({ method: 'POST', originalUrl: '/api/nope' }, mockRes(), next);
    const err = next.mock.calls[0][0];
    expect(err).toMatchObject({ code: 'NOT_FOUND', status: 404 });
    expect(err.message).toContain('POST /api/nope');
  });
});

describe('ERROR_CODES export', () => {
  test('is the documented set of codes', () => {
    expect(Object.keys(ERROR_CODES).sort()).toEqual([
      'FORBIDDEN', 'INTERNAL', 'NOT_FOUND', 'RATE_LIMITED',
      'TORN_API_ERROR', 'UNAUTHENTICATED', 'VALIDATION_ERROR',
    ]);
  });
});
