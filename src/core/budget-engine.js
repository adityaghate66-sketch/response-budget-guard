/**
 * BudgetEngine evaluates response sizes against configured limits.
 */
class BudgetEngine {
  /**
   * @param {Object} config - Normalized configuration object
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Finds the applicable limit for a given path.
   * @param {string} path - The request URL path
   * @returns {number} The limit in bytes
   */
  getLimitForPath(path) {
    // Check for exact route match
    if (this.config.routes && this.config.routes[path] !== undefined) {
      return this.config.routes[path];
    }

    // Optional: Add pattern matching logic here in the future

    return this.config.defaultLimit;
  }

  /**
   * Evaluates the size and returns a report.
   * @param {string} path - Request path
   * @param {number} size - Measured size in bytes
   * @returns {Object} Result report
   */
  check(path, size) {
    const limit = this.getLimitForPath(path);
    const exceeded = size > limit;
    const utilization = limit > 0 ? (size / limit) * 100 : 0;

    return {
      path,
      size,
      limit,
      exceeded,
      utilization: parseFloat(utilization.toFixed(2)),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { BudgetEngine };
