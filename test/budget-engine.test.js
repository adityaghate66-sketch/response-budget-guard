const test = require('node:test');
const assert = require('node:assert');
const { BudgetEngine } = require('../src/core/budget-engine.js');

test('BudgetEngine', async (t) => {
  const mockConfig = {
    defaultLimit: 1000,
    routes: {
      '/api/small': 500,
      '/api/large': 5000
    }
  };

  const engine = new BudgetEngine(mockConfig);

  await t.test('should return default limit for unknown routes', () => {
    assert.strictEqual(engine.getLimitForPath('/unknown'), 1000);
  });

  await t.test('should return specific limit for defined routes', () => {
    assert.strictEqual(engine.getLimitForPath('/api/small'), 500);
    assert.strictEqual(engine.getLimitForPath('/api/large'), 5000);
  });

  await t.test('should correctly identify when budget is exceeded', () => {
    const report = engine.check('/api/small', 600);
    assert.strictEqual(report.exceeded, true);
    assert.strictEqual(report.limit, 500);
    assert.strictEqual(report.utilization, 120);
  });

  await t.test('should correctly identify when budget is within limits', () => {
    const report = engine.check('/api/small', 400);
    assert.strictEqual(report.exceeded, false);
    assert.strictEqual(report.utilization, 80);
  });

  await t.test('should handle zero size responses', () => {
    const report = engine.check('/api/small', 0);
    assert.strictEqual(report.exceeded, false);
    assert.strictEqual(report.utilization, 0);
  });
});
