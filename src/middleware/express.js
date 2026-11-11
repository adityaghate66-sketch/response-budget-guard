const { validateConfig } = require('../core/config.js');
const { SizeTracker } = require('../core/size-tracker.js');
const { BudgetEngine } = require('../core/budget-engine.js');

/**
 * Express middleware for response budget monitoring.
 * @param {Object} options - Configuration options
 * @returns {Function} Express middleware function
 */
function budgetGuard(options = {}) {
  const config = validateConfig(options);
  const engine = new BudgetEngine(config);

  return function (req, res, next) {
    const tracker = new SizeTracker();
    tracker.start(res);

    // Listen for response completion or abort
    const onFinish = () => {
      cleanup();
      const report = engine.check(req.path || req.url, tracker.bytes);

      if (report.exceeded && typeof config.onExceeded === 'function') {
        config.onExceeded(report);
      }
    };

    const onClose = () => {
      cleanup();
    };

    function cleanup() {
      res.removeListener('finish', onFinish);
      res.removeListener('close', onClose);
      tracker.cleanup();
    }

    res.once('finish', onFinish);
    res.once('close', onClose);

    next();
  };
}

module.exports = { budgetGuard };
