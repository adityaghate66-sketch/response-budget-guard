const test = require('node:test');
const assert = require('node:assert');
const { parseSize, validateConfig } = require('../src/core/config.js');

test('parseSize utility', async (t) => {
  await t.test('should parse simple numbers as bytes', () => {
    assert.strictEqual(parseSize(500), 500);
  });

  await t.test('should parse string sizes correctly', () => {
    assert.strictEqual(parseSize('1024'), 1024);
    assert.strictEqual(parseSize('1kb'), 1024);
    assert.strictEqual(parseSize('1.5kb'), 1536);
    assert.strictEqual(parseSize('1mb'), 1024 * 1024);
    assert.strictEqual(parseSize('1gb'), 1024 * 1024 * 1024);
  });

  await t.test('should handle units with spaces', () => {
    assert.strictEqual(parseSize('100 kb'), 100 * 1024);
  });

  await t.test('should throw on invalid units', () => {
    assert.throws(() => parseSize('100tb'), /Unsupported size unit/);
  });

  await t.test('should throw on invalid formats', () => {
    assert.throws(() => parseSize('abc'), /Invalid size format/);
    assert.throws(() => parseSize('10.10.10kb'), /Invalid size format/);
  });
});

test('validateConfig function', async (t) => {
  await t.test('should provide sensible defaults', () => {
    const config = validateConfig();
    assert.strictEqual(config.defaultLimit, 1024 * 1024); // 1mb
    assert.deepStrictEqual(config.routes, {});
    assert.strictEqual(config.onExceeded, null);
  });

  await t.test('should normalize user provided limits', () => {
    const config = validateConfig({
      defaultLimit: '500kb',
      routes: {
        '/api': '10kb'
      }
    });
    assert.strictEqual(config.defaultLimit, 500 * 1024);
    assert.strictEqual(config.routes['/api'], 10 * 1024);
  });

  await t.test('should accept onExceeded callback', () => {
    const fn = () => {};
    const config = validateConfig({ onExceeded: fn });
    assert.strictEqual(config.onExceeded, fn);
  });
});
