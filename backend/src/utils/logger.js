/**
 * Structured Logger with Automated Secret Redaction & Metadata Enrichment
 */

const SENSITIVE_KEYS = new Set([
  'privatekey',
  'private_key',
  'testnet_execution_private_key',
  'seedphrase',
  'seed_phrase',
  'mnemonic',
  'password',
  'jwt_access_secret',
  'jwt_refresh_secret',
  'cookie_secret',
  'secret',
  'token',
  'refreshtoken',
  'accesstoken',
  'authorization',
  'cookie',
  'key'
]);

/**
 * Recursively deep-redacts sensitive fields in any object or array
 */
const sanitizeData = (data, depth = 0) => {
  if (depth > 6 || data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Redact 64-char hex strings (potential private keys) if detected in isolation
    if (/^(0x)?[0-9a-fA-F]{64}$/.test(data.trim())) {
      return '[REDACTED_HEX_SECRET]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('password') || lowerKey.includes('privatekey')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value, depth + 1);
      }
    }
    return sanitized;
  }

  return data;
};

const formatTimestamp = () => new Date().toISOString();

const log = (level, message, meta = null) => {
  const timestamp = formatTimestamp();
  const entry = {
    timestamp,
    level: level.toUpperCase(),
    message
  };

  if (meta && typeof meta === 'object') {
    entry.meta = sanitizeData(meta);
  }

  const output = `[${timestamp}] [${entry.level}] ${message} ${entry.meta ? JSON.stringify(entry.meta) : ''}`.trim();

  switch (level.toLowerCase()) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(output);
      }
      break;
    default:
      console.log(output);
  }
};

const logger = {
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
  sanitize: (data) => sanitizeData(data)
};

module.exports = logger;
