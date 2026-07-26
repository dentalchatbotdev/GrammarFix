import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { validateText, cleanResponse, callDeepSeek, MAX_CHARS, SYSTEM_PROMPT } from '../lib/grammar.js';

describe('validateText', () => {
  it('rejects missing text', () => {
    const result = validateText();
    assert.equal(result.valid, false);
    assert.equal(result.error, "Missing 'text' field.");
  });

  it('rejects non-string text', () => {
    const result = validateText(42);
    assert.equal(result.valid, false);
    assert.equal(result.error, "Missing 'text' field.");
  });

  it('rejects empty string', () => {
    const result = validateText('   ');
    assert.equal(result.valid, false);
    assert.equal(result.error, 'Text cannot be empty.');
  });

  it('rejects text over limit', () => {
    const text = 'a'.repeat(MAX_CHARS + 1);
    const result = validateText(text);
    assert.equal(result.valid, false);
    assert.ok(result.error.includes('character limit'));
  });

  it('rejects HTML content', () => {
    const result = validateText('Hello <b>world</b>');
    assert.equal(result.valid, false);
    assert.equal(result.error, 'HTML tags are not allowed.');
  });

  it('rejects HTML content with attributes', () => {
    const result = validateText('<a href="x">link</a>');
    assert.equal(result.valid, false);
    assert.equal(result.error, 'HTML tags are not allowed.');
  });

  it('passes valid text at limit', () => {
    const text = 'a'.repeat(MAX_CHARS);
    const result = validateText(text);
    assert.equal(result.valid, true);
    assert.equal(result.trimmed, text);
  });

  it('passes valid text and trims it', () => {
    const result = validateText('  hello world  ');
    assert.equal(result.valid, true);
    assert.equal(result.trimmed, 'hello world');
  });

  it('allows text with <  and > but not HTML', () => {
    const result = validateText('2 > 1 and 1 < 2');
    assert.equal(result.valid, true);
  });
});

describe('cleanResponse', () => {
  it('removes leading and trailing double quotes', () => {
    assert.equal(cleanResponse('"corrected text"'), 'corrected text');
  });

  it('removes leading and trailing single quotes', () => {
    assert.equal(cleanResponse("'corrected text'"), 'corrected text');
  });

  it('does not remove inner quotes', () => {
    assert.equal(cleanResponse('he said "hello"'), 'he said "hello"');
  });

  it('returns text unchanged if no surrounding quotes', () => {
    assert.equal(cleanResponse('corrected text'), 'corrected text');
  });
});

describe('callDeepSeek', () => {
  it('returns corrected text on success', async () => {
    mock.method(global, 'fetch', () => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'She went to the store.' } }],
        }),
      });
    });

    const result = await callDeepSeek('She go to the store.', 'fake-key');
    assert.equal(result, 'She went to the store.');
    assert.equal(fetch.mock.calls.length, 1);

    const callArgs = fetch.mock.calls[0].arguments;
    assert.equal(callArgs[0], 'https://api.deepseek.com/chat/completions');
    const body = JSON.parse(callArgs[1].body);
    assert.equal(body.messages[1].content, 'She go to the store.');
    assert.equal(body.model, 'deepseek-chat');

    mock.reset();
  });

  it('handles quoted response from AI', async () => {
    mock.method(global, 'fetch', () => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '"Corrected text."' } }],
        }),
      });
    });

    const result = await callDeepSeek('text', 'key');
    assert.equal(result, 'Corrected text.');
    mock.reset();
  });

  it('throws on API error', async () => {
    mock.method(global, 'fetch', () => {
      return Promise.resolve({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });
    });

    await assert.rejects(
      () => callDeepSeek('text', 'bad-key'),
      { message: 'API error: 401' }
    );
    mock.reset();
  });

  it('throws on empty AI response', async () => {
    mock.method(global, 'fetch', () => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '' } }],
        }),
      });
    });

    await assert.rejects(
      () => callDeepSeek('text', 'key'),
      { message: 'Empty response from AI.' }
    );
    mock.reset();
  });
});
