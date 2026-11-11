const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const express = require('express');
const { budgetGuard } = require('../src/index.js');

test('Express Middleware Integration', async (t) => {
  await t.test('should trigger onExceeded when payload exceeds route limit', (t, done) => {
    let capturedReport = null;

    const app = express();
    app.use(budgetGuard({
      defaultLimit: '10kb',
      routes: {
        '/api/small': '100b'
      },
      onExceeded(report) {
        capturedReport = report;
      }
    }));

    app.get('/api/small', (req, res) => {
      // Send 200 bytes, which exceeds 100b limit
      res.send('A'.repeat(200));
    });

    const server = app.listen(0, () => {
      const port = server.address().port;
      http.get(`http://localhost:${port}/api/small`, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          server.close(() => {
            assert.ok(capturedReport !== null, 'onExceeded should have been called');
            assert.strictEqual(capturedReport.exceeded, true);
            assert.strictEqual(capturedReport.path, '/api/small');
            assert.strictEqual(capturedReport.limit, 100);
            assert.strictEqual(capturedReport.size, 200);
            done();
          });
        });
      });
    });
  });

  await t.test('should not trigger onExceeded when payload is within budget', (t, done) => {
    let capturedReport = null;

    const app = express();
    app.use(budgetGuard({
      defaultLimit: '10kb',
      routes: {
        '/api/small': '1kb'
      },
      onExceeded(report) {
        capturedReport = report;
      }
    }));

    app.get('/api/small', (req, res) => {
      res.send('OK');
    });

    const server = app.listen(0, () => {
      const port = server.address().port;
      http.get(`http://localhost:${port}/api/small`, (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          server.close(() => {
            assert.strictEqual(capturedReport, null, 'onExceeded should NOT be called');
            done();
          });
        });
      });
    });
  });

  await t.test('should correctly count bytes for JSON responses', (t, done) => {
    let capturedReport = null;

    const app = express();
    app.use(budgetGuard({
      defaultLimit: '50b',
      onExceeded(report) {
        capturedReport = report;
      }
    }));

    app.get('/api/json', (req, res) => {
      res.json({ message: 'This is a longer JSON message that exceeds 50 bytes limit' });
    });

    const server = app.listen(0, () => {
      const port = server.address().port;
      http.get(`http://localhost:${port}/api/json`, (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          server.close(() => {
            assert.ok(capturedReport !== null);
            assert.strictEqual(capturedReport.exceeded, true);
            assert.ok(capturedReport.size > 50);
            done();
          });
        });
      });
    });
  });
});
