const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

class TokenSecurity {
  /**
   * Generates a short-lived access JWT
   * @param {Object} payload 
   * @returns {string}
   */
  static generateAccessToken(payload) {
    return jwt.sign(
      {
        sub: payload.userId,
        email: payload.email,
        role: payload.role || 'USER'
      },
      env.JWT_ACCESS_SECRET,
      {
        expiresIn: env.JWT_ACCESS_EXPIRES_IN,
        issuer: 'crypto-copy-trading-platform',
        audience: 'crypto-copy-trading-app'
      }
    );
  }

  /**
   * Generates a cryptographically strong refresh token string
   * @returns {string}
   */
  static generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  /**
   * Hashes a refresh token using SHA-256 for secure DB persistence
   * @param {string} token 
   * @returns {string}
   */
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Verifies an access token
   * @param {string} token 
   * @returns {Object}
   */
  static verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: 'crypto-copy-trading-platform',
      audience: 'crypto-copy-trading-app'
    });
  }

  /**
   * Returns secure cookie options for refresh token
   * @returns {Object}
   */
  static getRefreshTokenCookieOptions() {
    return {
      httpOnly: true,
      secure: env.SECURE_COOKIES,
      sameSite: env.isProduction() ? 'strict' : 'lax',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
  }

  /**
   * Returns options to clear cookie
   */
  static getClearCookieOptions() {
    return {
      httpOnly: true,
      secure: env.SECURE_COOKIES,
      sameSite: env.isProduction() ? 'strict' : 'lax',
      path: '/api/v1/auth'
    };
  }
}

module.exports = TokenSecurity;
