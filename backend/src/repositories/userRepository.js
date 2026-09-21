const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { getDBStatus } = require('../config/database');

class UserRepository {
  /**
   * Asserts DB connection before executing queries
   */
  static checkConnection() {
    const dbStatus = getDBStatus();
    if (dbStatus.status !== 'healthy') {
      throw ApiError.databaseUnavailable(
        'Database connection is not active. Please ensure MongoDB is running and reachable.'
      );
    }
  }

  /**
   * Finds a user by email (includes password hash for auth)
   * @param {string} email 
   * @returns {Promise<User|null>}
   */
  async findByEmail(email) {
    UserRepository.checkConnection();
    return await User.findOne({ email: email.toLowerCase() });
  }

  /**
   * Finds a user by ID
   * @param {string} id 
   * @returns {Promise<User|null>}
   */
  async findById(id) {
    UserRepository.checkConnection();
    return await User.findById(id);
  }

  /**
   * Creates a new user record
   * @param {Object} userData 
   * @returns {Promise<User>}
   */
  async create(userData) {
    UserRepository.checkConnection();
    const user = new User(userData);
    return await user.save();
  }

  /**
   * Adds a hashed refresh token to user session list
   * @param {string} userId 
   * @param {Object} tokenRecord 
   */
  async addRefreshToken(userId, tokenRecord) {
    UserRepository.checkConnection();
    return await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          refreshTokens: {
            $each: [tokenRecord],
            $slice: -10 // Keep at most 10 active sessions
          }
        },
        $set: { lastLoginAt: new Date() }
      },
      { new: true }
    );
  }

  /**
   * Finds user having a specific refresh token hash
   * @param {string} tokenHash 
   * @returns {Promise<User|null>}
   */
  async findByRefreshTokenHash(tokenHash) {
    UserRepository.checkConnection();
    return await User.findOne({
      'refreshTokens.tokenHash': tokenHash,
      'refreshTokens.expiresAt': { $gt: new Date() }
    });
  }

  /**
   * Replaces an old refresh token hash with a new one (Token rotation)
   * @param {string} userId 
   * @param {string} oldTokenHash 
   * @param {Object} newTokenRecord 
   */
  async rotateRefreshToken(userId, oldTokenHash, newTokenRecord) {
    UserRepository.checkConnection();
    // Remove old token and push new token
    return await User.findOneAndUpdate(
      { _id: userId },
      {
        $pull: { refreshTokens: { tokenHash: oldTokenHash } }
      }
    ).then(async () => {
      return await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            refreshTokens: {
              $each: [newTokenRecord],
              $slice: -10
            }
          }
        },
        { new: true }
      );
    });
  }

  /**
   * Removes a specific refresh token (Logout single session)
   * @param {string} userId 
   * @param {string} tokenHash 
   */
  async removeRefreshToken(userId, tokenHash) {
    UserRepository.checkConnection();
    return await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { tokenHash } }
    });
  }

  /**
   * Removes all refresh tokens for a user (Logout all devices)
   * @param {string} userId 
   */
  async clearAllRefreshTokens(userId) {
    UserRepository.checkConnection();
    return await User.findByIdAndUpdate(userId, {
      $set: { refreshTokens: [] }
    });
  }

  /**
   * Counts users (e.g. for admin or setup check)
   */
  async count() {
    UserRepository.checkConnection();
    return await User.countDocuments();
  }
}

module.exports = new UserRepository();
