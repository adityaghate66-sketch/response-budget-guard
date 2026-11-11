/**
 * Reporter manages the persistence and analysis of budget reports.
 */

const fs = require('node:fs');
const path = require('node:path');

class Reporter {
  constructor(storagePath = './reports/storage') {
    this.storagePath = path.resolve(storagePath);
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Persists a report to a JSON file.
   * @param {Object} report
   */
  saveReport(report) {
    const filename = `${report.path.replace(/[^a-z0-9]/gi, '_')}.json`;
    const filePath = path.join(this.storagePath, filename);

    let historicalData = [];
    if (fs.existsSync(filePath)) {
      historicalData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    historicalData.push(report);
    fs.writeFileSync(filePath, JSON.stringify(historicalData, null, 2));
  }

  /**
   * Reads all stored reports and returns a summary.
   * @returns {Array} List of endpoint summaries
   */
  getSummary() {
    const files = fs.readdirSync(this.storagePath);
    return files.map(file => {
      const data = JSON.parse(fs.readFileSync(path.join(this.storagePath, file), 'utf8'));
      const lastReport = data[data.length - 1];
      const violations = data.filter(r => r.exceeded).length;

      return {
        path: lastReport.path,
        lastSize: lastReport.size,
        violations,
        avgSize: Math.floor(data.reduce((acc, r) => acc + r.size, 0) / data.length)
      };
    });
  }
}

module.exports = { Reporter };
