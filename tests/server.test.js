import { describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';

let baseUrl;
let server;

before(async () => {
  process.env.DEEPSEEK_API_KEY = 'test-key-123';

  const mod = await import('../server.js');
  server = mod.default;

  await new Promise((resolve, reject) => {
    if (server.listening) return resolve();
    server.on('error', reject);
    server.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server && server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
  delete process.env.DEEPSEEK_API_KEY;
});

function request(method, path, body, rawBody) {
  return new Promise((resolve, reject) => {
    const opts = new URL(baseUrl + path);
    opts.method = method;
    if (!rawBody) opts.headers = { 'Content-Type': 'application/json' };

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);

    if (rawBody) {
      req.write(rawBody);
    } else if (body !== undefined) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

describe('POST /api/grammar', () => {
  it('returns corrected text on success', async () => {
    mock.method(global, 'fetch', () => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'She went to the store yesterday.' } }],
        }),
      });
    });

    const { status, body } = await request('POST', '/api/grammar', { text: 'She go to the store yesterday.' });
    assert.equal(status, 200);
    assert.equal(body.original, 'She go to the store yesterday.');
    assert.equal(body.corrected, 'She went to the store yesterday.');
    mock.reset();
  });

  it('returns 400 for invalid JSON', async () => {
    const { status, body } = await request('POST', '/api/grammar', null, 'not-json');
    assert.equal(status, 400);
    assert.equal(body.error, 'Invalid JSON body.');
  });

  it('returns 400 for missing text', async () => {
    const { status, body } = await request('POST', '/api/grammar', {});
    assert.equal(status, 400);
    assert.equal(body.error, "Missing 'text' field.");
  });

  it('returns 400 for empty text', async () => {
    const { status, body } = await request('POST', '/api/grammar', { text: '   ' });
    assert.equal(status, 400);
    assert.equal(body.error, 'Text cannot be empty.');
  });

  it('returns 400 for HTML content', async () => {
    const { status, body } = await request('POST', '/api/grammar', { text: '<b>test</b>' });
    assert.equal(status, 400);
    assert.equal(body.error, 'HTML tags are not allowed.');
  });

  it('returns 400 for text over limit', async () => {
    const { status, body } = await request('POST', '/api/grammar', { text: 'a'.repeat(2001) });
    assert.equal(status, 400);
    assert.ok(body.error.includes('character limit'));
  });

  it('returns 204 for OPTIONS preflight', async () => {
    const { status } = await request('OPTIONS', '/api/grammar');
    assert.equal(status, 204);
  });

  it('returns index.html fallback for unknown route (SPA)', async () => {
    const { status, body } = await request('GET', '/nonexistent');
    assert.equal(status, 200);
    assert.match(String(body), /GrammarFix/);
  });
});
