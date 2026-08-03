/**
 * @jest-environment node
 *
 * Regression for #28 (Lyra): Express 5 leaves `req.body` undefined when no
 * body-parser matched, so a malformed POST to a handler that destructures
 * req.body threw and surfaced as a 500. requireParsedBody must turn that into a
 * 400, while leaving valid (including empty-object) bodies untouched — proven
 * end-to-end over a real socket, mirroring server.js's parser chain, with a
 * route that destructures req.body and an error handler that 500s like
 * server.js's, so any thrown body access would show up as a 500.
 */
const http = require('http');
const express = require('express');
const requireParsedBody = require('../../../middleware/require-parsed-body');

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requireParsedBody);
  app.post('/echo', (req, res) => {
    const { value } = req.body; // direct destructure — the pattern that used to 500
    res.status(200).json({ value: value === undefined ? null : value });
  });
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ error: 'server error' }));
  return app;
}

function request({ port, method = 'POST', path = '/echo', headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

describe('Middleware: requireParsedBody (express 5 undefined body -> 400 not 500)', () => {
  let server;
  let port;

  beforeAll((done) => {
    server = makeApp().listen(0, () => {
      port = server.address().port;
      done();
    });
  });
  afterAll((done) => {
    server.close(done);
  });

  test('POST with no Content-Type -> 400 (not 500)', async () => {
    const r = await request({ port, headers: {}, body: 'anything' });
    expect(r.status).toBe(400);
  });

  test('POST with text/plain -> 400 (not 500)', async () => {
    const r = await request({ port, headers: { 'Content-Type': 'text/plain' }, body: 'hello' });
    expect(r.status).toBe(400);
  });

  test('POST with empty body and no Content-Type -> 400 (not 500)', async () => {
    const r = await request({ port, headers: {} });
    expect(r.status).toBe(400);
  });

  test('POST with valid JSON -> 200, body preserved (destructure works)', async () => {
    const r = await request({
      port,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 42 }),
    });
    expect(r.status).toBe(200);
    expect(JSON.parse(r.body).value).toBe(42);
  });

  test('POST with an empty JSON object {} -> 200 (valid empty body untouched)', async () => {
    const r = await request({
      port,
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(r.status).toBe(200);
  });

  test('no malformed-body case ever returns 500', async () => {
    const cases = [
      { headers: {}, body: 'x' },
      { headers: { 'Content-Type': 'text/plain' }, body: 'x' },
      { headers: {} },
    ];
    for (const c of cases) {
      const r = await request({ port, ...c });
      expect(r.status).not.toBe(500);
    }
  });

  test('GET/DELETE (no body) pass through untouched even with undefined body', () => {
    for (const method of ['GET', 'DELETE', 'HEAD']) {
      const next = jest.fn();
      const res = { status: jest.fn(() => res), json: jest.fn() };
      requireParsedBody({ method, body: undefined }, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    }
  });
});
