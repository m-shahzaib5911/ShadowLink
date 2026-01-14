const fs = require('fs').promises;
const path = require('path');

/**
 * Simple logging utility for ShadowLink
 * Logs to console and optionally to file
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const LOG_LEVEL_NAMES = {
  0: 'DEBUG',
  1: 'INFO',
  2: 'WARN',
  3: 'ERROR'
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] || LOG_LEVELS.INFO;
const logFile = process.env.LOG_FILE || path.join(__dirname, '..', 'logs', 'server.log');

/**
 * Format log message
 */
function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const levelName = LOG_LEVEL_NAMES[level];
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] ${levelName}: ${message}${metaStr}`;
}

/**
 * Write to log file
 */
async function writeToFile(message) {
  try {
    await fs.appendFile(logFile, message + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error.message);
  }
}

/**
 * Log at DEBUG level
 */
function debug(message, meta = {}) {
  if (currentLogLevel <= LOG_LEVELS.DEBUG) {
    const formatted = formatMessage(LOG_LEVELS.DEBUG, message, meta);
    console.debug(formatted);
    if (process.env.LOG_TO_FILE === 'true') {
      writeToFile(formatted);
    }
  }
}

/**
 * Log at INFO level
 */
function info(message, meta = {}) {
  if (currentLogLevel <= LOG_LEVELS.INFO) {
    const formatted = formatMessage(LOG_LEVELS.INFO, message, meta);
    console.log(formatted);
    if (process.env.LOG_TO_FILE !== 'false') {
      writeToFile(formatted);
    }
  }
}

/**
 * Log at WARN level
 */
function warn(message, meta = {}) {
  if (currentLogLevel <= LOG_LEVELS.WARN) {
    const formatted = formatMessage(LOG_LEVELS.WARN, message, meta);
    console.warn(formatted);
    writeToFile(formatted);
  }
}

/**
 * Log at ERROR level
 */
function error(message, meta = {}) {
  if (currentLogLevel <= LOG_LEVELS.ERROR) {
    const formatted = formatMessage(LOG_LEVELS.ERROR, message, meta);
    console.error(formatted);
    writeToFile(formatted);
  }
}

module.exports = { debug, info, warn, error };