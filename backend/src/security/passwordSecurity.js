const argon2 = require('argon2');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

let useArgon2 = true;

/**
 * Argon2id Configuration according to OWASP guidelines:
 * - type: argon2id
 * - memoryCost: 65536 (64MB) or 32768 (32MB) for responsive auth
 * - timeCost: 3
 * - parallelism: 1
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 32768, // 32MB
  timeCost: 3,
  parallelism: 1
};

class PasswordSecurity {
  /**
   * Hashes a password using Argon2id (preferred) with bcrypt fallback
   * @param {string} plainPassword 
   * @returns {Promise<string>}
   */
  static async hash(plainPassword) {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Password must be a non-empty string');
    }

    if (useArgon2) {
      try {
        return await argon2.hash(plainPassword, ARGON2_OPTIONS);
      } catch (err) {
        logger.warn(`Argon2 hashing failed (${err.message}). Falling back to bcrypt.`);
        useArgon2 = false;
      }
    }

    // Bcrypt fallback with 12 salt rounds
    const salt = await bcrypt.genSalt(12);
    return await bcrypt.hash(plainPassword, salt);
  }

  /**
   * Verifies password against stored hash (auto-detects Argon2 vs bcrypt format)
   * @param {string} plainPassword 
   * @param {string} hash 
   * @returns {Promise<boolean>}
   */
  static async verify(plainPassword, hash) {
    if (!plainPassword || !hash) {
      return false;
    }

    try {
      // Argon2 hashes start with $argon2
      if (hash.startsWith('$argon2')) {
        return await argon2.verify(hash, plainPassword);
      }
      
      // Otherwise bcrypt ($2a$, $2b$, $2y$)
      return await bcrypt.compare(plainPassword, hash);
    } catch (err) {
      logger.error('Password verification error:', err.message);
      return false;
    }
  }

  /**
   * Checks if hash was generated with Argon2
   * @param {string} hash 
   * @returns {boolean}
   */
  static isArgon2(hash) {
    return typeof hash === 'string' && hash.startsWith('$argon2');
  }
}

module.exports = PasswordSecurity;
