# BudgetGuard

A lightweight Node.js middleware and CLI tool for monitoring and enforcing HTTP API response size budgets.

## Installation

```bash
npm install budgetguard
```

## Quick Start

### Express Integration

```javascript
const express = require('express');
const { budgetGuard } = require('budgetguard');

const app = express();

// Apply globally with default budget
app.use(budgetGuard({
  defaultLimit: '100kb',
  onExceeded: (report) => {
    console.warn(`Budget exceeded: ${report.path} at ${report.utilization}%`);
  }
}));

app.get('/users', (req, res) => {
  res.json([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
});

app.listen(3000);
```

### Route-Specific Budgets

```javascript
// Apply only to specific routes
app.get('/products', budgetGuard({
  defaultLimit: '50kb',
  onExceeded: (report) => console.warn(report)
}), (req, res) => {
  res.json(products);
});
```

## Configuration

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultLimit` | string \| number | `'1mb'` | Global response size limit |
| `routes` | object | `{}` | Per-route limits (path → limit) |
| `onExceeded` | function | `null` | Callback when budget exceeded |
| `storage` | object | `{ type: 'json', path: './reports' }` | Report storage config |

### Size Units

All size values accept either numbers (bytes) or human-readable strings:

- `'100kb'` or `102400` — 100 KB
- `'1.5mb'` — 1.5 MB
- `'1gb'` — 1 GB
- `'1024'` — 1024 bytes (no unit = bytes)

```javascript
app.use(budgetGuard({
  defaultLimit: '1mb',  // or 1048576 (number)
  routes: {
    '/api/users': '10kb',
    '/api/products': '50kb',
    '/api/large': '5mb'
  },
  onExceeded: (report) => {
    // report: { path, size, limit, exceeded, utilization, timestamp }
    console.warn(`Response too large!`);
  }
}));
```

## How It Works

BudgetGuard hooks into `res.write()` and `res.end()` to measure actual bytes written. It tracks each chunk and calculates the total response size when the request completes.

**Important:** BudgetGuard measures the *uncompressed* response size - the actual bytes your application sends before any compression middleware (like `compression`) is applied.

## CLI Usage

### report

Display response size reports:

```bash
budgetguard report                     # Table format
budgetguard report --format json       # JSON format
budgetguard report -o ./custom.json    # Specify output file
```

### compare

Compare current vs historical response sizes:

```bash
budgetguard compare
budgetguard compare --format json
```

### check

CI-friendly check with exit codes:

```bash
budgetguard check                      # Exit 0 if all pass, 1 if any exceeded
budgetguard check -t 90                # Warn if >= 90% of budget
budgetguard check -f ./test-report.json
```

Exit codes:
- `0` — All budgets within limits
- `1` — One or more budgets exceeded
- `2` — Report file not found

## Reporter Module

For programmatic access:

```javascript
const { Reporter } = require('budgetguard');

const reporter = new Reporter('./my-reports');

// Track an endpoint
reporter.saveReport({
  path: '/api/users',
  size: 42000,
  limit: 100000,
  exceeded: false
});

// Get summary
const summary = reporter.getSummary();
console.log(summary); // [{ path, lastSize, violations, utilization, ... }]
```

### Reporter Methods

| Method | Description |
|--------|-------------|
| `saveReport(report)` | Save a report entry for a path |
| `getSummary()` | Get all reports as array |
| `clear()` | Clear all stored reports |

## Examples

See the `examples/` directory for complete examples.

## API Reference

See [docs/api.md](docs/api.md) for detailed API documentation.

## License

MIT