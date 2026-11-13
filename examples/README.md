# BudgetGuard Examples

## Running the Example

```bash
cd examples
node app.js
```

Then open your browser or use curl:

```bash
# View users (should be under 50KB limit)
curl http://localhost:3000/api/users

# View products (may approach limit)
curl http://localhost:3000/api/products

# View large data (likely to exceed 10KB budget)
curl http://localhost:3000/api/large/data

# Health check
curl http://localhost:3000/health
```

## Available Endpoints

| Endpoint | Route Limit | Expected Behavior |
|----------|-------------|-------------------|
| `/api/users` | 50KB | ✅ Should pass |
| `/api/products` | 50KB | ✅ Should pass |
| `/api/large/data` | 10KB | ❌ Will exceed |
| `/api/health` | 1KB | ✅ Should pass |
| `/health` | None | No budget tracking |
| `/api/error` | 50KB | ✅ Error handled |

## Console Output

When you access `/api/large/data`, you should see:

```
[WARN] Budget exceeded: /api/large/data
  Size: 25000 bytes
  Limit: 10240 bytes
  Utilization: 244.14%
```

## CI Integration Example

The example app demonstrates how to use BudgetGuard in a real Express application. For CI/CD, you would typically:

1. Run your tests with BudgetGuard enabled
2. Use `budgetguard check` in your CI pipeline
3. Fail the build if budgets are exceeded