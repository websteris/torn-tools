/**
 * Secret resolution: no committed default secret may ever be used, and a
 * missing secret must be fatal in production.
 *
 * Regression guard for the JWT auth-bypass: the old code did
 *   const JWT_SECRET = process.env.JWT_SECRET || 'torn-dashboard-secret-key';
 * so a deployment with JWT_SECRET unset signed/verified tokens with a value
 * that is public in this repository — anyone could forge a token for any
 * player_id. These tests fail against that old form.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { requireSecret } = require('../utils/secret');

const OLD_DEFAULT = 'torn-dashboard-secret-key';

describe('requireSecret', () => {
  const saved = { val: process.env.JWT_SECRET, env: process.env.NODE_ENV };
  afterEach(() => {
    if (saved.val === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = saved.val;
    if (saved.env === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = saved.env;
  });

  test('returns the configured value verbatim when set', () => {
    process.env.JWT_SECRET = 'a-real-configured-secret';
    expect(requireSecret('JWT_SECRET')).toBe('a-real-configured-secret');
  });

  test('is FATAL in production when unset (no insecure default)', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';
    expect(() => requireSecret('JWT_SECRET')).toThrow(/JWT_SECRET is not set/);
  });

  test('dev/test fallback is random, never the old committed default', () => {
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'test';
    const a = requireSecret('JWT_SECRET');
    const b = requireSecret('JWT_SECRET');
    expect(a).not.toBe(OLD_DEFAULT); // the public default must be gone
    expect(a).not.toBe(b); // ephemeral, not a fixed constant
    expect(a.length).toBeGreaterThanOrEqual(32);
  });
});

describe('JWT verification hardening', () => {
  // A token forged under the old, publicly-known default must NOT verify under
  // a properly configured secret.
  test('a token signed with the old public default is rejected', () => {
    const goodSecret = crypto.randomBytes(32).toString('hex');
    const forged = jwt.sign({ player_id: 999 }, OLD_DEFAULT, { algorithm: 'HS256' });
    expect(() => jwt.verify(forged, goodSecret, { algorithms: ['HS256'] })).toThrow();
  });

  test('an alg:none token is rejected when the algorithm is pinned', () => {
    const secret = crypto.randomBytes(32).toString('hex');
    const noneTok = jwt.sign({ player_id: 999 }, '', { algorithm: 'none' });
    expect(() => jwt.verify(noneTok, secret, { algorithms: ['HS256'] })).toThrow();
  });
});
