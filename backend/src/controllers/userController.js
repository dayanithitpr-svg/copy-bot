const userService = require('../services/userService');
const ApiResponse = require('../utils/apiResponse');

class UserController {
  async getProfile(req, res, next) {
    try {
      const profile = await userService.getProfile(req.user.id);
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Profile retrieved successfully',
        data: { profile }
      });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { displayName, theme, currency } = req.body;
      const updated = await userService.updateProfile(req.user.id, { displayName, theme, currency });
      return ApiResponse.success(res, {
        statusCode: 200,
        message: 'Profile updated successfully',
        data: { profile: updated }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();
