const userRepository = require('../repositories/userRepository');
const ApiError = require('../utils/apiError');

class UserService {
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user.toSafeObject();
  }

  async updateProfile(userId, { displayName, theme, currency }) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (displayName) {
      user.profile.displayName = displayName.trim();
    }
    if (theme && ['dark', 'light'].includes(theme)) {
      user.preferences.theme = theme;
    }
    if (currency) {
      user.preferences.currency = currency.toUpperCase();
    }

    await user.save();
    return user.toSafeObject();
  }
}

module.exports = new UserService();
