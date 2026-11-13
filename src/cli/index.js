#!/usr/bin/env node

/**
 * BudgetGuard CLI Entry Point
 * Provides commands for response budget monitoring and reporting
 */

const { Command } = require('commander');
const {
  generateTableReport,
  generateJsonReport,
  generateComparisonReport,
  loadReport,
  saveReport,
  formatBytes
} = require('../reports/reporter.js');

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
  .action((options) => {
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

    const comparison = generateComparisonReport(current, previous);

    if (options.format === 'json') {
      console.log(JSON.stringify(comparison, null, 2));
    } else {
      console.log('Response Size Comparison');
      console.log('  ' + '-'.repeat(70));

      const summary = comparison.summary;
      console.log(`  Endpoints: ${summary.totalEndpoints} | New: ${summary.newEndpoints} | Increased: ${summary.increased} | Decreased: ${summary.decreased}`);
      console.log('  ' + '-'.repeat(70));

      for (const c of comparison.comparison) {
        let line = '';

        if (c.sizeChange === 'new') {
          line = `NEW  | ${c.path}`;
        } else {
          const arrow = c.sizeChange === 'increased' ? '↗' : '↘';
          line = `${arrow} ${c.sizeChangePercent}% | ${c.path}`;
        }

        const currentKb = (c.currentSize / 1024).toFixed(2);
        const prevKb = c.previousSize > 0 ? (c.previousSize / 1024).toFixed(2) : '-';
        const budgetStatus = c.exceeded ? '❌' : '✅';

        console.log(`  ${line.padEnd(40)} | ${prevKb.padStart(8)} → ${currentKb.padEnd(8)} KB ${budgetStatus}`);
      }
    }
  });

program
  .command('check')
  .description('Check budgets and exit with error code if exceeded')
  .option('-f, --file <path>', 'Path to report file', './reports/report.json')
  .option('-t, --threshold <percent>', 'Warning threshold percentage', '80')
  .action((options) => {
    const report = loadReport(options.file);

    if (!report) {
      console.error(`Report not found: ${options.file}`);
      process.exit(2);
    }

    const results = report.results || [];
    const exceeded = results.filter(r => r.exceeded);
    const warnings = results.filter(r => !r.exceeded && r.utilization >= parseFloat(options.threshold));

    if (exceeded.length === 0 && warnings.length === 0) {
      console.log('All response budgets passed ✅');
      process.exit(0);
    }

    if (warnings.length > 0) {
      console.log('⚠️  Warnings (approaching budget):');
      for (const w of warnings) {
        console.log(`  ${w.path}: ${w.utilization}% of budget`);
      }
    }

    if (exceeded.length > 0) {
      console.error('\n❌ Budget violations:');
      for (const r of exceeded) {
        console.error(`  ${r.path}: ${r.utilization}% of budget`);
      }

      process.exit(1);
    }
  });

program.parse();