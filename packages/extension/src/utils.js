/**
 * Firefox Command - Shared Utilities
 */

/**
 * Generate a unique request ID
 * @returns {string}
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create an error object with code
 * @param {string} code
 * @param {string} message
 * @returns {Error}
 */
export function createError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * Error codes
 */
export const ErrorCodes = {
  UNKNOWN_METHOD: 'UNKNOWN_METHOD',
  UNKNOWN_ACTION: 'UNKNOWN_ACTION',
  NO_ACTIVE_TAB: 'NO_ACTIVE_TAB',
  ELEMENT_NOT_FOUND: 'ELEMENT_NOT_FOUND',
  TIMEOUT: 'TIMEOUT',
  EVAL_ERROR: 'EVAL_ERROR',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  AUTH_FAILED: 'AUTH_FAILED',
  PARSE_ERROR: 'PARSE_ERROR',
  EXTENSION_ERROR: 'EXTENSION_ERROR',
  CONNECTION_CLOSED: 'CONNECTION_CLOSED',
};

/**
 * Sleep for a given duration
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
