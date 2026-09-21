const TokenSecurity = require('../security/tokenSecurity');
const userRepository = require('../repositories/userRepository');
const ApiError = require('../utils/apiError');
const { USER_STATUS } = require('../config/constants');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication token required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw ApiError.unauthorized('Invalid authorization header format');
    }

    let decoded;
    try {
      decoded = TokenSecurity.verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Access token has expired', 'TOKEN_EXPIRED');
      }
      throw ApiError.unauthorized('Invalid access token', 'INVALID_TOKEN');
    }

    // Hydrate user from DB
    const user = await userRepository.findById(decoded.sub);
    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists');
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw ApiError.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    req.user = user.toSafeObject();
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authenticate;
