/**
 * @module Secret
 * @description Resolve required secrets from the environment without ever
 * falling back to a hardcoded, publicly-known default.
 *
 * A committed `process.env.X || 'some-literal'` fallback means any deployment
 * that forgets to set `X` runs with a secret that is public in the repo. For a
 * JWT signing key that is an authentication bypass: anyone can forge a valid
 * token. This helper refuses that failure mode.
 */

const crypto = require('crypto');
const { logger } = require('./logger');

/**
 * Resolve a required secret.
 *
 * - If the environment variable is set (non-empty), use it.
 * - In production (`NODE_ENV === 'production'`) a missing secret is fatal: we
 *   throw rather than start with an insecure default.
 * - In development/test a missing secret yields a random, per-process ephemeral
 *   value (never a committed constant) plus a warning. Sign/verify within one
 *   process still works; values simply do not persist across restarts.
 *
 * @param {string} name - Environment variable name, e.g. `JWT_SECRET`.
 * @param {Object} [options]
 * @param {number} [options.bytes=32] - Ephemeral fallback size (hex-encoded, so
 *   the returned string is `2 * bytes` characters).
 * @returns {string} The resolved secret.
 * @throws {Error} If unset in production.
 */
function requireSecret(name, { bytes = 32 } = {}) {
  const value = process.env[name];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `${name} is not set. Refusing to start in production with an insecure ` +
        `default. Set ${name} to a strong random value.`
    );
  }

  const ephemeral = crypto.randomBytes(bytes).toString('hex');
  // Startup warning: tolerate a logger without a `warn` level (e.g. a partial
  // test mock) rather than crashing module load on it.
  const warn =
    typeof logger.warn === 'function' ? logger.warn.bind(logger) : console.warn;
  warn(
    `${name} is not set; using a random ephemeral value for this ` +
      `${process.env.NODE_ENV || 'development'} process. Tokens/data signed ` +
      `with it will not survive a restart. Set ${name} in your environment.`
  );
  return ephemeral;
}

module.exports = { requireSecret };
