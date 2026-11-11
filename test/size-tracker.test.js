const test = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const { SizeTracker } = require('../src/core/size-tracker.js');

test('SizeTracker', async (t) => {
  // Mock response object
  const createMockRes = () => {
    const res = new EventEmitter();
    res.write = (chunk, encoding, cb) => {
      if (typeof cb === 'function') cb();
      return true;
    };
    res.end = (chunk, encoding, cb) => {
      if (typeof cb === 'function') cb();
      return true;
    };
    return res;
  };

  await t.test('should accurately track bytes for string chunks', () => {
    const res = createMockRes();
    const tracker = new SizeTracker();
    tracker.start(res);

    res.write('hello'); // 5 bytes
    res.write(' world'); // 6 bytes
    res.end('!'); // 1 byte

    assert.strictEqual(tracker.bytes, 12);
    tracker.cleanup();
  });

  await t.test('should accurately track bytes for Buffer chunks', () => {
    const res = createMockRes();
    const tracker = new SizeTracker();
    tracker.start(res);

    res.write(Buffer.from('hello')); // 5 bytes
    res.end(Buffer.from(' world')); // 6 bytes

    assert.strictEqual(tracker.bytes, 11);
    tracker.cleanup();
  });

  await t.test('should restore original methods after cleanup', () => {
    const res = createMockRes();
    const originalWrite = res.write;
    const tracker = new SizeTracker();
    tracker.start(res);
    tracker.cleanup();

    assert.strictEqual(res.write, originalWrite);
  });
});
