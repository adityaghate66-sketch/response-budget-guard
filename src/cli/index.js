#!/usr/bin/env node

/**
 * BudgetGuard CLI Entry Point
 * Provides commands for response budget monitoring and reporting
 */

const { Command } = require('commander');
const { generateTableReport, generateJsonReport, loadReport, saveReport } = require('../reports/reporter.js');

const program = new Command();

program
  .name('budgetguard')
  .description('CLI tool for BudgetGuard - Response size budget monitoring')
  .version('1.0.0');

program
  .command('report', { isDefault: true })
  .description('Display response budget report')
  .option('-f, --format <format>', 'Output format (json|table)', 'table')
  .option('-o, --output <path>', 'Output file path for JSON report', './reports/report.json')
  .action(async (options) => {
    // Try to load existing report
    const existingReport = loadReport(options.output);

    if (!existingReport) {
      console.log('No report found. Run your application with BudgetGuard middleware to generate one.');
      console.log(`Expected location: ${options.output}`);
      process.exit(0);
    }

    const results = existingReport.results || [];

    if (options.format === 'json') {
      console.log(generateJsonReport(results));
    } else {
      console.log(generateTableReport(results));

      // Offer to save JSON version
      if (!existingReport) {
        saveReport(results, { path: options.output });
      }
    }
  });

program
  .command('compare')
  .description('Compare current responses against historical data')
  .option('-c, --current <path>', 'Path to current report', './reports/report.json')
  .option('-p, --previous <path>', 'Path to previous report', './reports/historical.json')
  .option('-f, --format <format>', 'Output format (json|table)', 'table')
  .action((options) => {
    const currentReport = loadReport(options.current);
    const previousReport = loadReport(options.previous);

    if (!currentReport || !previousReport) {
      console.error('Both current and previous reports are required for comparison.');
      console.error(`Current: ${options.current}`);
      console.error(`Previous: ${options.previous}`);
      process.exit(1);
    }

    const current = currentReport.results || [];
    const previous = previousReport.results || [];

    const comparison = current.map(curr => {
      const prev = previous.find(p => p.path === curr.path);
      if (!prev) {
        return { ...curr, previousSize: 0, sizeChange: 'new', sizeChangePercent: 100 };
      }
      const change = ((curr.size - prev.size) / prev.size) * 100;
      return {
        path: curr.path,
        currentSize: curr.size,
        previousSize: prev.size,
        sizeChange: change >= 0 ? 'increased' : 'decreased',
        sizeChangePercent: Math.abs(change).toFixed(2)
      };
    });

    if (options.format === 'json') {
      console.log(JSON.stringify({ comparison }, null, 2));
    } else {
      console.log('Response Size Comparison:');
      console.log('  ' + '-'.repeat(60));
      for (const c of comparison) {
        const changeStr = c.sizeChange === 'new'
          ? `+${(c.currentSize / 1024).toFixed(2)} KB (new endpoint)`
          : `${c.sizeChange} by ${c.sizeChangePercent}% (${(c.previousSize/1024).toFixed(2)} → ${(c.currentSize/1024).toFixed(2)} KB)`;
        console.log(`  ${c.path.padEnd(30)} | ${changeStr}`);
      }
    }
  });

program
  .command('check')
  .description('Check budgets and exit with error code if exceeded')
  .option('-f, --file <path>', 'Path to report file', './reports/report.json')
  .action((options) => {
    const report = loadReport(options.file);

    if (!report) {
      console.error(`Report not found: ${options.file}`);
      process.exit(2);
    }

    const results = report.results || [];
    const exceeded = results.filter(r => r.exceeded);

    if (exceeded.length === 0) {
      console.log('All response budgets passed ✅');
      process.exit(0);
    }

    console.error('Some response budgets exceeded ❌');
    for (const r of exceeded) {
      console.error(`  ${r.path}: ${r.utilization}% of budget`);
    }

    process.exit(1);
  });

program.parse();