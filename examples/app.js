/**
 * BudgetGuard Example Application
 *
 * This example demonstrates how to integrate BudgetGuard
 * into an Express.js API for response size monitoring.
 */

const express = require('express');
const { budgetGuard } = require('../src/index.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure reports directory exists
const reportsDir = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Middleware to simulate different response sizes
app.use('/api/large', budgetGuard({
  defaultLimit: '10kb',
  onExceeded: (report) => {
    console.warn(`[WARN] Budget exceeded: ${report.path}`);
    console.warn(`  Size: ${report.size} bytes`);
    console.warn(`  Limit: ${report.limit} bytes`);
    console.warn(`  Utilization: ${report.utilization}%`);
  }
}));

// Global middleware with default budget
app.use('/api/', budgetGuard({
  defaultLimit: '50kb',
  onExceeded: (report) => {
    console.log(`[ALERT] ${report.path} exceeded budget`);
  }
}));

// Small data endpoint - should pass
app.get('/api/users', (req, res) => {
  const users = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' }
  ];
  res.json(users);
});

// Medium data endpoint - should pass
app.get('/api/products', (req, res) => {
  const products = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    name: `Product ${i + 1}`,
    price: Math.floor(Math.random() * 100) + 10,
    description: 'A sample product description for testing response sizes'
  }));
  res.json(products);
});

// Large data endpoint - will likely exceed 10KB budget
app.get('/api/large/data', (req, res) => {
  const largeData = {
    message: 'This is a large response',
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    },
    records: Array.from({ length: 200 }, (_, i) => ({
      id: i,
      name: `Record ${i}`,
      value: Math.random() * 1000,
      nested: {
        field1: 'value1',
        field2: 'value2',
        field3: 'value3'
      },
      tags: ['tag1', 'tag2', 'tag3', `tag${i}`]
    }))
  };
  res.json(largeData);
});

// Tiny endpoint - demonstrates per-route budget override
app.get('/api/health', budgetGuard({
  defaultLimit: '1kb',  // Very small for health check
  onExceeded: (report) => {
    console.error(`Health check response too large!`);
  }
}), (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error endpoint
app.get('/api/error', (req, res) => {
  res.status(500).json({ error: 'Something went wrong' });
});

// Health check (no budget limit)
app.get('/health', (req, res) => {
  res.send('OK');
});

// Start server
app.listen(PORT, () => {
  console.log(`BudgetGuard Example API running on port ${PORT}`);
  console.log(`Try these endpoints:`);
  console.log(`  - http://localhost:${PORT}/api/users`);
  console.log(`  - http://localhost:${PORT}/api/products`);
  console.log(`  - http://localhost:${PORT}/api/large/data`);
  console.log(`  - http://localhost:${PORT}/health`);
});