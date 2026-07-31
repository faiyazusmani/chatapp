/**
 * Centralized logger.
 * - Development: pretty, verbose logs
 * - Production: only warnings/errors (no console.log noise), ISO timestamps
 */
const isProduction = process.env.NODE_ENV === 'production';

const ts = () => new Date().toISOString();

const logger = {
  info: (...args) => {
    if (!isProduction) console.log(`[${ts()}]`, ...args);
  },
  warn: (...args) => {
    console.warn(`[${ts()}]`, ...args);
  },
  error: (...args) => {
    console.error(`[${ts()}]`, ...args);
  },
  // Used for sensitive/dev-only debugging — stripped entirely in production
  debug: (...args) => {
    if (!isProduction) console.log(`[${ts()}] [DEBUG]`, ...args);
  },
  // Socket-level connection logs (noisy) — dev only
  socket: (...args) => {
    if (!isProduction) console.log(`[${ts()}] [Socket]`, ...args);
  }
};

module.exports = logger;
