# BudgetGuard API Reference

## Functions

### `budgetGuard(options)`

Express.js middleware factory that monitors response sizes.

**Parameters:**
- `options` (Object): Configuration options
  - `defaultLimit` (string|number): Default budget for all routes
  - `routes` (Object): Path-to-limit mapping
  - `onExceeded` (Function): Callback when budget exceeded
  - `storage` (Object): Storage configuration

**Returns:** Express middleware function

**Example:**
```javascript
app.use(budgetGuard({
  defaultLimit: '100kb',
  routes: { '/api/users': '10kb' },
  onExceeded: (report) => console.warn(report)
}));
```

---

### `parseSize(size)`

Converts human-readable size strings to bytes.

**Parameters:**
- `size` (string|number): Size value (e.g., `'1.5mb'`, `1024`)

**Returns:** number (bytes)

**Throws:** Error if invalid format

**Example:**
```javascript
parseSize('1kb');     // 1024
parseSize('1.5mb');   // 1572864
parseSize(500);       // 500
```

---

### `validateConfig(config)`

Validates and normalizes configuration object.

**Parameters:**
- `config` (Object): User-provided config

**Returns:** Normalized config object with defaults applied

**Example:**
```javascript
const normalized = validateConfig({ defaultLimit: '500kb' });
// { defaultLimit: 512000, routes: {}, onExceeded: null, ... }
```

---

## Classes

### `BudgetEngine`

Evaluates response sizes against configured limits.

#### Constructor

```javascript
const engine = new BudgetEngine(config);
```

**Parameters:**
- `config` (Object): Normalized configuration from `validateConfig()`

#### Methods

##### `getLimitForPath(path)`

Returns the applicable limit for a given path.

**Parameters:**
- `path` (string): Request URL path

**Returns:** number (limit in bytes)

##### `check(path, size)`

Evaluates a size against the budget and returns a report.

**Parameters:**
- `path` (string): Request path
- `size` (number): Measured size in bytes

**Returns:** Object
```javascript
{
  path: string,
  size: number,
  limit: number,
  exceeded: boolean,
  utilization: number,  // percentage
  timestamp: string       // ISO date string
}
```

---

### `SizeTracker`

Monitors bytes written to a response object.

#### Methods

##### `start(res)`

Hooks into response object's `write` and `end` methods.

**Parameters:**
- `res` (http.ServerResponse): Express response object

##### `cleanup()`

Restores original response methods.

---

### `Reporter`

Manages persistent response budget reports.

#### Constructor

```javascript
const reporter = new Reporter(storagePath);
```

**Parameters:**
- `storagePath` (string): Directory for storing report files

#### Methods

##### `saveReport(report)`

Saves a report entry. Merges with existing report if path already exists.

**Parameters:**
- `report` (Object)
  - `path` (string): Route path
  - `size` (number): Response size in bytes
  - `limit` (number): Budget limit in bytes
  - `exceeded` (boolean): Whether budget exceeded

##### `getSummary()`

Returns array of all saved reports with aggregated statistics.

**Returns:** Array<Object>

```javascript
[
  {
    path: '/api/users',
    lastSize: 42000,
    totalSize: 84000,     // sum of all sizes
    count: 2,             // number of requests
    violations: 0,
    utilization: 42,
    limit: 100000,
    exceeded: false,
    timestamp: '...',
    updatedAt: '...'
  }
]
```

##### `clear()`

Removes all stored reports and clears storage directory.

---

## Type Definitions

### Report Object

```typescript
interface Report {
  path: string;
  size: number;
  limit: number;
  exceeded: boolean;
  utilization: number;
  timestamp: string;
}
```

### Config Object

```typescript
interface Config {
  defaultLimit: number;  // bytes
  routes: Record<string, number>;  // path -> bytes
  onExceeded: ((report: Report) => void) | null;
  storage: {
    type: string;
    path: string;
  };
}
```

---

## CLI Commands

See CLI documentation for command-line usage.