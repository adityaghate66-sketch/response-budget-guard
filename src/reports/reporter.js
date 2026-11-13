/**
 * Reporter module for generating and managing response budget reports.
 */

const fs = require('fs');
const path = require('path');

/**
 * Formats bytes into human-readable string.
 * @param {number} bytes - Size in bytes
 * @returns {string} Human-readable size (e.g., "42 KB")
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const unit = units[unitIndex] || 'GB';
  const value = bytes / Math.pow(1024, unitIndex);
  return `${value.toFixed(2)} ${unit}`;
}

/**
 * Generates a formatted table row.
 * @param {string} name - Column name
 * @param {string} value - Column value
 * @param {number} width - Column width
 * @returns {string} Formatted row string
 */
function formatRow(name, value, width) {
  const paddedName = name.padEnd(width);
  const paddedValue = value.padEnd(width);
  return `  ${paddedName} | ${paddedValue}`;
}

/**
 * Generates a report table from budget check results.
 * @param {Array<Object>} results - Array of budget check results
 * @returns {string} Formatted table string
 */
function generateTableReport(results) {
  if (!results || results.length === 0) {
    return '  No budget check results available.';
  }

  const lines = [];
  lines.push('  BudgetGuard Report');
  lines.push('  ' + '-'.repeat(50));

  const width = 20;

  for (const result of results) {
    const status = result.exceeded ? 'EXCEEDED' : 'PASS';
    const statusColor = result.exceeded ? '❌' : '✅';

    lines.push('');
    lines.push(formatRow('Endpoint', result.path, width));
    lines.push(formatRow('Response Size', formatBytes(result.size), width));
    lines.push(formatRow('Budget', formatBytes(result.limit), width));
    lines.push(formatRow('Utilization', `${result.utilization}%`, width));
    lines.push(formatRow('Status', `${statusColor} ${status}`, width));
  }

  lines.push('');
  lines.push('  ' + '-'.repeat(50));

  const passed = results.filter(r => !r.exceeded).length;
  const failed = results.filter(r => r.exceeded).length;

  lines.push(formatRow('Summary', `Passed: ${passed} | Failed: ${failed}`, 52));

  return lines.join('\n');
}

/**
 * Generates a JSON representation of budget check results.
 * @param {Array<Object>} results - Array of budget check results
 * @returns {string} JSON string
 */
function generateJsonReport(results) {
  const summary = {
    total: results.length,
    passed: results.filter(r => !r.exceeded).length,
    failed: results.filter(r => r.exceeded).length,
    results: results,
    generatedAt: new Date().toISOString()
  };
  return JSON.stringify(summary, null, 2);
}

/**
 * Reporter class for managing response budget reports.
 * Tracks reports persistently and provides summary statistics.
 */
class Reporter {
  /**
   * Create a Reporter instance.
   * @param {string} storagePath - Directory path for storing reports
   */
  constructor(storagePath) {
    this.storagePath = storagePath;
    this.reports = []; // In-memory cache
    this.initializeStorage();
  }

  /**
   * Initializes the storage directory.
   */
  initializeStorage() {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Saves a report entry.
   * @param {Object} report - Report entry { path, size, limit, exceeded }
   */
  saveReport(report) {
    const entry = {
      path: report.path,
      size: report.size,
      limit: report.limit || 1024 * 1024,
      exceeded: report.exceeded || false,
      utilization: report.exceeded
        ? parseFloat(((report.size / report.limit) * 100).toFixed(2))
        : report.utilization || 0,
      lastSize: report.size,
      violations: report.exceeded ? 1 : 0,
      timestamp: new Date().toISOString()
    };

    // Check if path already exists
    const existingIndex = this.reports.findIndex(r => r.path === report.path);

    if (existingIndex >= 0) {
      // Merge with existing report
      const existing = this.reports[existingIndex];
      existing.lastSize = report.size;
      existing.totalSize = existing.totalSize || existing.lastSize;
      existing.count = (existing.count || 1) + 1;
      existing.violations = (existing.violations || 0) + (report.exceeded ? 1 : 0);
      existing.exceeded = existing.violations > 0;
      existing.utilization = parseFloat(((existing.lastSize / existing.limit) * 100).toFixed(2));
      existing.updatedAt = new Date().toISOString();
    } else {
      this.reports.push(entry);
    }

    this.writeReportToFile(report.path, entry);
  }

  /**
   * Writes a report to a file.
   * @param {string} routePath - Route path (used as filename)
   * @param {Object} entry - Report entry
   */
  writeReportToFile(routePath, entry) {
    // Sanitize path for filename
    const safeFilename = routePath.replace(/^\/|\/$/g, '').replace(/[^a-zA-Z0-9/]/g, '_') + '.json';
    const fullPath = path.join(this.storagePath, safeFilename);

    // Ensure parent directory exists
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(fullPath, JSON.stringify(entry, null, 2), 'utf8');
  }

  /**
   * Gets the summary of all reports.
   * @returns {Array<Object>} Summary array with aggregated stats
   */
  getSummary() {
    return this.reports;
  }

  /**
   * Recursively clears a directory.
   * @param {string} dirPath - Directory to clear
   */
  clearDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        this.clearDirectory(fullPath);
        fs.rmdirSync(fullPath);
      } else {
        fs.unlinkSync(fullPath);
      }
    }
  }

  /**
   * Clears all reports.
   */
  clear() {
    this.reports = [];
    this.clearDirectory(this.storagePath);
  }
}

/**
 * Saves results to a report file.
 * @param {Array<Object>} results - Budget check results
 * @param {Object} options - Save options
 * @param {string} options.path - Directory path for reports (default: ./reports)
 * @param {string} options.filename - Output filename (default: report.json)
 */
function saveReport(results, options = {}) {
  const reportPath = options.path || './reports';
  const filename = options.filename || 'report.json';

  // Ensure directory exists
  const fullPath = path.resolve(reportPath);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }

  const filePath = path.join(fullPath, filename);
  const content = generateJsonReport(results);
  fs.writeFileSync(filePath, content, 'utf8');

  return filePath;
}

/**
 * Loads a report from a file.
 * @param {string} filePath - Path to report file
 * @returns {Object|null} Parsed report or null if not found
 */
function loadReport(filePath) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading report: ${error.message}`);
    return null;
  }
}

/**
 * Generates a comparison report between historical and current results.
 * @param {Array<Object>} current - Current budget check results
 * @param {Array<Object>} historical - Historical budget check results
 * @returns {Object} Comparison summary
 */
function generateComparisonReport(current, historical) {
  const comparison = [];

  for (const curr of current) {
    const hist = historical.find(h => h.path === curr.path);

    if (!hist) {
      // New endpoint
      comparison.push({
        path: curr.path,
        currentSize: curr.size,
        previousSize: 0,
        sizeChange: 'new',
        sizeChangePercent: 100,
        status: 'new_endpoint'
      });
    } else {
      const change = ((curr.size - hist.size) / hist.size) * 100;
      const trend = change > 0 ? 'increased' : change < 0 ? 'decreased' : 'unchanged';

      comparison.push({
        path: curr.path,
        currentSize: curr.size,
        previousSize: hist.size,
        sizeChange: trend,
        sizeChangePercent: Math.abs(change).toFixed(2),
        exceeded: curr.exceeded,
        previousExceeded: hist.exceeded,
        status: curr.exceeded ? 'exceeded' : hist.exceeded ? 'recovered' : 'stable'
      });
    }
  }

  return {
    comparison,
    summary: {
      totalEndpoints: current.length,
      newEndpoints: comparison.filter(c => c.sizeChange === 'new').length,
      increased: comparison.filter(c => c.sizeChange === 'increased' && c.sizeChangePercent > 5).length,
      decreased: comparison.filter(c => c.sizeChange === 'decreased').length,
      currentlyExceeded: comparison.filter(c => c.exceeded).length,
      previouslyExceeded: comparison.filter(c => c.previousExceeded).length
    }
  };
}

module.exports = {
  Reporter,
  generateTableReport,
  generateJsonReport,
  generateComparisonReport,
  saveReport,
  loadReport,
  formatBytes
};