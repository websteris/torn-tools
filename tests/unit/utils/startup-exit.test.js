/**
 * A fatal error at startup must end the process with a non-zero exit code and
 * show on stderr. The logger handles uncaught exceptions outside tests and,
 * with a plain `exitOnError: false`, a missing JWT_SECRET/ENCRYPTION_KEY in
 * production ended the process with exit code 0 and wrote only to
 * logs/exceptions.log, so a supervisor saw a clean exit and nothing on the
 * console. A server that hits an uncaught exception later keeps running.
 *
 * Each case runs in a child node process (the logger only installs its
 * exception handler outside NODE_ENV=test) with a temp cwd, so the log files
 * land there and not in the repo.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');

function runNode(code, env) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'torn-startup-'));
  try {
    const childEnv = { ...process.env, ...env };
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined) delete childEnv[k];
    }
    return spawnSync(process.execPath, ['-e', code], {
      cwd,
      env: childEnv,
      encoding: 'utf8',
      timeout: 20000
    });
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}

const requireFrom = (rel) => `require(${JSON.stringify(path.join(ROOT, rel))});`;

describe('startup failures exit non-zero', () => {
  test('missing ENCRYPTION_KEY in production exits 1 with the reason on stderr', () => {
    const r = runNode(requireFrom('db/models/api-key.js'), {
      NODE_ENV: 'production',
      ENCRYPTION_KEY: '',
      JWT_SECRET: 'x'.repeat(40)
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/ENCRYPTION_KEY is not set/);
  });

  test('missing JWT_SECRET in production exits 1 with the reason on stderr', () => {
    const r = runNode(requireFrom('utils/secret.js').replace(/;$/, '') +
      ".requireSecret('JWT_SECRET');", {
      NODE_ENV: 'production',
      JWT_SECRET: undefined
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/JWT_SECRET is not set/);
  });

  test('a 32-byte ENCRYPTION_KEY in production loads and exits 0', () => {
    const r = runNode(requireFrom('db/models/api-key.js'), {
      NODE_ENV: 'production',
      ENCRYPTION_KEY: 'k'.repeat(32)
    });
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  test('a running process survives a later uncaught exception, then exits 1', () => {
    const code = requireFrom('utils/logger.js') + `
      setTimeout(() => { throw new Error('boom in a callback'); }, 10);
      setTimeout(() => { console.log('still alive'); }, 300);`;
    const r = runNode(code, { NODE_ENV: 'production' });
    expect(r.stdout).toMatch(/still alive/);
    expect(r.stderr).toMatch(/boom in a callback/);
    expect(r.status).toBe(1);
  });
});
