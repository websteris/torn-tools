/**
 * API-key encryption at rest — exercised against REAL crypto (only the DB and
 * logger are mocked). Guards the secret-handling hardening:
 *   - no committed default key (the old `|| 'your-secure-encryption-key...'`),
 *   - a wrong-length key fails fast with a clear message at load,
 *   - the raw-key AES semantics are unchanged so existing ciphertext round-trips.
 */

// DB + logger are mocked so requiring the model has no side effects; crypto is
// intentionally NOT mocked here (unlike tests/unit/models/api-key.test.js).
jest.mock('../db/schema', () => ({ getConnection: jest.fn() }));
jest.mock('../utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn(), debug: jest.fn(), warn: jest.fn() }
}));

const crypto = require('crypto');

const K32 = 'unit-test-encryption-key-32byte!'; // exactly 32 bytes

function loadModelWith(env) {
  const savedKey = process.env.ENCRYPTION_KEY;
  const savedEnv = process.env.NODE_ENV;
  if ('ENCRYPTION_KEY' in env) {
    if (env.ENCRYPTION_KEY === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = env.ENCRYPTION_KEY;
  }
  if ('NODE_ENV' in env) process.env.NODE_ENV = env.NODE_ENV;
  let model;
  try {
    jest.isolateModules(() => { model = require('../db/models/api-key'); });
  } finally {
    if (savedKey === undefined) delete process.env.ENCRYPTION_KEY;
    else process.env.ENCRYPTION_KEY = savedKey;
    process.env.NODE_ENV = savedEnv;
  }
  return model;
}

describe('api-key encryption (real crypto)', () => {
  test('round-trips an API key with a valid 32-byte ENCRYPTION_KEY', () => {
    expect(Buffer.from(K32, 'utf8').length).toBe(32);
    const model = loadModelWith({ ENCRYPTION_KEY: K32, NODE_ENV: 'test' });
    const enc = model._encryptApiKey('torn-api-key-abcdef');
    expect(enc).toContain(':'); // iv:ciphertext
    expect(enc).not.toContain('torn-api-key-abcdef'); // actually encrypted
    expect(model._decryptApiKey(enc)).toBe('torn-api-key-abcdef');
  });

  test('existing raw-key ciphertext still decrypts (semantics unchanged)', () => {
    // Build ciphertext exactly the way the model did before this change: raw
    // key bytes as the AES key. The hardened model must still read it.
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(K32, 'utf8'), iv);
    let ct = cipher.update('legacy-value-xyz', 'utf8', 'hex');
    ct += cipher.final('hex');
    const blob = iv.toString('hex') + ':' + ct;

    const model = loadModelWith({ ENCRYPTION_KEY: K32, NODE_ENV: 'test' });
    expect(model._decryptApiKey(blob)).toBe('legacy-value-xyz');
  });

  test('a wrong-length ENCRYPTION_KEY fails fast at load with a clear message', () => {
    expect(() => loadModelWith({ ENCRYPTION_KEY: 'too-short', NODE_ENV: 'test' }))
      .toThrow(/must be exactly 32 bytes/);
  });

  test('missing ENCRYPTION_KEY in production is fatal (no committed default)', () => {
    expect(() => loadModelWith({ ENCRYPTION_KEY: undefined, NODE_ENV: 'production' }))
      .toThrow(/ENCRYPTION_KEY is not set/);
  });

  test('the former committed default is no longer accepted (wrong length)', () => {
    // 'your-secure-encryption-key-min-32-chars' is 39 bytes — must be rejected,
    // not silently used.
    expect(() => loadModelWith({
      ENCRYPTION_KEY: 'your-secure-encryption-key-min-32-chars', NODE_ENV: 'test'
    })).toThrow(/must be exactly 32 bytes/);
  });
});
