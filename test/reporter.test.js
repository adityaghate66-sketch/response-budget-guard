const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { Reporter } = require('../src/reports/reporter.js');

test('Reporter', async (t) => {
  const testStorage = './test-reports';
  const reporter = new Reporter(testStorage);

  // Cleanup helper
  const cleanup = () => {
    if (fs.existsSync(testStorage)) {
      fs.rmSync(testStorage, { recursive: true });
    }
  };

  t.after(() => cleanup());

  await t.test('should save and retrieve reports', () => {
    const report = { path: '/api/test', size: 100, exceeded: false };
    reporter.saveReport(report);

    const summary = reporter.getSummary();
    assert.strictEqual(summary.length, 1);
    assert.strictEqual(summary[0].path, '/api/test');
    assert.strictEqual(summary[0].lastSize, 100);
  });

  await t.test('should aggregate violations', () => {
    reporter.saveReport({ path: '/api/test', size: 600, exceeded: true });

    const summary = reporter.getSummary();
    assert.strictEqual(summary[0].violations, 1);
  });
});
