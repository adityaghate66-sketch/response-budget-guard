/**
 * BudgetGuard Configuration Utility
 */

const SIZE_UNITS = {
  B: 1,
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024
};

/**
 * Parses a human-readable size string into bytes.
 * @param {string|number} size - The size to parse (e.g., "100kb", "1mb", 500)
 * @returns {number} The size in bytes
 * @throws {Error} If the size format is invalid
 */
function parseSize(size) {
  if (typeof size === 'number') return size;
  if (typeof size !== 'string') {
    throw new Error(`Invalid size type: ${typeof size}. Expected string or number.`);
  }

  const match = size.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?$/);
  if (!match) {
    throw new Error(`Invalid size format: "${size}". Example formats: "100kb", "1.5mb", "500b".`);
  }

  const value = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();

  if (!SIZE_UNITS[unit]) {
    throw new Error(`Unsupported size unit: "${unit}". Supported: B, KB, MB, GB.`);
  }

  return Math.floor(value * SIZE_UNITS[unit]);
}

/**
 * Validates the BudgetGuard configuration object.
 * @param {Object} config - The user-provided configuration
 * @returns {Object} Normalized configuration
 */
function validateConfig(config = {}) {
  const normalized = {
    defaultLimit: parseSize(config.defaultLimit || '1mb'),
    routes: {},
    onExceeded: typeof config.onExceeded === 'function' ? config.onExceeded : null,
    storage: config.storage || { type: 'json', path: './reports' }
  };

  if (config.routes && typeof config.routes === 'object') {
    for (const [route, limit] of Object.entries(config.routes)) {
      normalized.routes[route] = parseSize(limit);
    }
  }

  return normalized;
}

module.exports = {
  parseSize,
  validateConfig,
  SIZE_UNITS
};
