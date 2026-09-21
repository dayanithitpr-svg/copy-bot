const userRepository = require('../repositories/userRepository');
const PasswordSecurity = require('../security/passwordSecurity');
const TokenSecurity = require('../security/tokenSecurity');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');
const { USER_STATUS } = require('../config/constants');

class AuthService {
  /**
   * Registers a new user
   * @param {Object} payload 
   * @param {Object} clientInfo 
   */
  async register({ email, password, displayName }, clientInfo = {}) {
    // 1. Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    // 2. Hash password with Argon2id (or bcrypt fallback)
    const passwordHash = await PasswordSecurity.hash(password);

    // 3. Create user in database
    const count = await userRepository.count();
    // First user is granted ADMIN role for platform bootstrapping if needed
    const role = count === 0 ? 'ADMIN' : 'USER';

    const newUser = await userRepository.create({
      email,
      password: passwordHash,
      role,
      status: USER_STATUS.ACTIVE,
      profile: {
        displayName: displayName || email.split('@')[0]
      }
    });

    // 4. Generate Tokens
    const accessToken = TokenSecurity.generateAccessToken({
      userId: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role
    });

    const rawRefreshToken = TokenSecurity.generateRefreshToken();
    const tokenHash = TokenSecurity.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await userRepository.addRefreshToken(newUser._id, {
      tokenHash,
      expiresAt,
      userAgent: clientInfo.userAgent || 'Unknown',
      ipAddress: clientInfo.ipAddress || 'Unknown'
    });

    logger.info(`New user registered successfully: ${newUser.email} (${newUser.role})`);

    return {
      user: newUser.toSafeObject(),
      accessToken,
      refreshToken: rawRefreshToken
    };
  }

  /**
   * Authenticates user with credentials
   * @param {Object} credentials 
   * @param {Object} clientInfo 
   */
  async login({ email, password }, clientInfo = {}) {
    // 1. Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // 2. Check account status
    if (user.status !== USER_STATUS.ACTIVE) {
      throw ApiError.forbidden(`Account is ${user.status.toLowerCase()}. Please contact support.`);
    }

    // 3. Verify password
    const isPasswordValid = await PasswordSecurity.verify(password, user.password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // 4. Generate Tokens
    const accessToken = TokenSecurity.generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    });

    const rawRefreshToken = TokenSecurity.generateRefreshToken();
    const tokenHash = TokenSecurity.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await userRepository.addRefreshToken(user._id, {
      tokenHash,
      expiresAt,
      userAgent: clientInfo.userAgent || 'Unknown',
      ipAddress: clientInfo.ipAddress || 'Unknown'
    });

    logger.info(`User logged in: ${user.email}`);

    return {
      user: user.toSafeObject(),
      accessToken,
      refreshToken: rawRefreshToken
    };
  }

  /**
   * Rotates refresh token and issues new access token
   * @param {string} rawRefreshToken 
   * @param {Object} clientInfo 
   */
  async refresh(rawRefreshToken, clientInfo = {}) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw ApiError.unauthorized('Refresh token is required');
    }

    const tokenHash = TokenSecurity.hashToken(rawRefreshToken);
    const user = await userRepository.findByRefreshTokenHash(tokenHash);

    if (!user) {
      logger.warn('Refresh token reuse or invalid token detected.');
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw ApiError.forbidden('Account is not active');
    }

    // Issue new pair
    const newAccessToken = TokenSecurity.generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    });

    const newRawRefreshToken = TokenSecurity.generateRefreshToken();
    const newTokenHash = TokenSecurity.hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await userRepository.rotateRefreshToken(user._id, tokenHash, {
      tokenHash: newTokenHash,
      expiresAt,
      userAgent: clientInfo.userAgent || 'Unknown',
      ipAddress: clientInfo.ipAddress || 'Unknown'
    });

    logger.debug(`Tokens rotated successfully for user: ${user.email}`);

    return {
      user: user.toSafeObject(),
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken
    };
  }

  /**
   * Logs out user by invalidating the refresh token
   * @param {string} rawRefreshToken 
   */
  async logout(rawRefreshToken) {
    if (!rawRefreshToken) {
      return true;
    }

    const tokenHash = TokenSecurity.hashToken(rawRefreshToken);
    const user = await userRepository.findByRefreshTokenHash(tokenHash);
    if (user) {
      await userRepository.removeRefreshToken(user._id, tokenHash);
      logger.info(`User logged out: ${user.email}`);
    }
    return true;
  }

  /**
   * Revokes all active sessions for a user
   * @param {string} userId 
   */
  async logoutAll(userId) {
    await userRepository.clearAllRefreshTokens(userId);
    logger.info(`All sessions revoked for user ID: ${userId}`);
    return true;
  }
}

module.exports = new AuthService();
